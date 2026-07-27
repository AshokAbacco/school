// server/src/staffControlls/superAdminFinance.controller.js
//
// READ-ONLY finance aggregation for SuperAdmin, PLUS student edit/payment
// endpoints.  Fetches data across ALL schools under the logged-in university.
//
// req.user.universityId is set by authMiddleware by normalising:
//   decoded.universityId  (new flat JWT)
//   decoded.university?.id (old nested JWT)
//
// ── IMPORTANT: paidAmount reconciliation fix ────────────────────────────────
// `paidAmount` on StudentList used to be an independently-editable column
// that could drift away from the sum of the per-category *FeePaid columns
// (schoolFeePaid, tuitionFeePaid, examFeePaid, transportFeePaid, booksFeePaid,
// labFeePaid, miscFeePaid). That caused the KPI cards / progress ring
// (which read `paidAmount`) to disagree with the "Fee Category Breakdown"
// and "Category-wise Fee Details" tables (which sum the category columns).
//
// Fix:
//   1. getUniversityStudentFinance now ALWAYS derives paidAmount as the sum
//      of the category columns before sending it to the frontend.
//   2. recordStudentPayment now REQUIRES a valid category (no more silent
//      "FULL" fallback that bumped paidAmount without touching a category
//      column) and recomputes paidAmount from the category sum afterwards.
//   3. updateStudentFinance no longer accepts paidAmount from the client at
//      all — it can only change via recordStudentPayment.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "../config/db.js";

// ─── tiny helpers ────────────────────────────────────────────────────────────
const toNum = (v) => Number(v || 0);

const CATEGORY_FIELDS = [
  "schoolFeePaid",
  "tuitionFeePaid",
  "examFeePaid",
  "transportFeePaid",
  "booksFeePaid",
  "labFeePaid",
  "miscFeePaid",
];

const sumCategoryPaid = (s) =>
  CATEGORY_FIELDS.reduce((sum, k) => sum + Number(s[k] || 0), 0);

// Zero-initialised accumulator object for summing category fields across
// payment logs, e.g. { schoolFeePaid: 0, tuitionFeePaid: 0, ... }
const ZERO_FLAT_PAID = CATEGORY_FIELDS.reduce(
  (acc, k) => ({ ...acc, [k]: 0 }),
  {}
);

const CATEGORY_COLUMN_MAP = {
  SCHOOL:    "schoolFeePaid",
  TUITION:   "tuitionFeePaid",
  EXAM:      "examFeePaid",
  TRANSPORT: "transportFeePaid",
  BOOKS:     "booksFeePaid",
  LAB:       "labFeePaid",
  MISC:      "miscFeePaid",
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. STUDENT FINANCE
//    GET /api/superadmin-finance/student-finance
// ─────────────────────────────────────────────────────────────────────────────
export const getUniversityStudentFinance = async (req, res) => {
  try {
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res.status(400).json({
        success: false,
        message: "universityId missing in token",
      });
    }

    const data = await prisma.studentList.findMany({
      where: {
        deletedAt: null,
        school: { universityId },
      },
      include: {
        school: {
          select: { id: true, name: true, code: true },
        },
        // ── NEW: needed to see CUSTOM fee-category payments ────────────
        // Custom fees (added per-school, e.g. "Uniform", "Fees") are never
        // recorded on the 7 flat *FeePaid columns — they only ever land
        // in StudentPaymentLog.customFeeBreakdown. Without this include,
        // superadmin has no way to know a custom fee was ever paid.
        paymentLogs: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Collect all studentIds that don't already have gender on studentList
    const missingGenderIds = data
      .filter((s) => !s.gender && s.studentId)
      .map((s) => s.studentId);

    // Fetch personalInfo gender for those students in one query
    const personalInfos =
      missingGenderIds.length > 0
        ? await prisma.studentPersonalInfo.findMany({
            where: { studentId: { in: missingGenderIds } },
            select: { studentId: true, gender: true },
          })
        : [];

    const genderMap = Object.fromEntries(
      personalInfos.map((p) => [p.studentId, p.gender])
    );

    const normalized = data.map((s) => {
      const logs = s.paymentLogs || [];
      const legacyPaidAmount = Number(s.paidAmount || 0);

      // ── Aggregate paid amounts from StudentPaymentLog ──────────────────
      // IMPORTANT: recordSimplePayment (the route Finance login's "Add
      // Payment" flow uses) ONLY ever writes a StudentPaymentLog row — it
      // never increments StudentList.schoolFeePaid / examFeePaid / etc.
      // Those raw columns are therefore stale leftovers, NOT a running
      // total, for any student paid through that flow. Trusting them (as
      // sumCategoryPaid(s) used to) meant only whichever single old value
      // happened to be sitting in the column showed up — e.g. only the
      // FIRST payment's amount, with every payment after it silently
      // dropped from the total.
      //
      // Fix: sum every category (default AND custom) across ALL payment
      // logs, exactly like Financepages/Routes/studentFinance.routes.js's
      // own getStudentFinance route does. Only fall back to the raw
      // StudentList columns for students who have zero log rows at all
      // (i.e. genuinely legacy records predating StudentPaymentLog).
      let categoryPaid;
      let flatPaid;
      const customPaidMap = {};
      let customPaidTotal = 0;

      if (logs.length > 0) {
        flatPaid = { ...ZERO_FLAT_PAID };
        logs.forEach((log) => {
          CATEGORY_FIELDS.forEach((f) => {
            flatPaid[f] += Number(log[f] || 0);
          });
          const custom = log.customFeeBreakdown || {};
          Object.entries(custom).forEach(([name, amount]) => {
            const key = String(name).toLowerCase().trim();
            const amt = Number(amount || 0);
            customPaidMap[key] = (customPaidMap[key] || 0) + amt;
            customPaidTotal += amt;
          });
        });
        categoryPaid = CATEGORY_FIELDS.reduce((sum, f) => sum + flatPaid[f], 0);
      } else {
        // Legacy fallback: no StudentPaymentLog rows exist for this student
        // at all (payments predate logging, or came only through the old
        // recordCategoryPayment/recordStudentPayment flows). Trust the raw
        // StudentList columns in that case — same as Finance login's own
        // "Path B" legacy fallback for payment history.
        flatPaid = CATEGORY_FIELDS.reduce(
          (acc, f) => ({ ...acc, [f]: Number(s[f] || 0) }),
          {}
        );
        categoryPaid = sumCategoryPaid(s);
      }

      const totalPaid = categoryPaid + customPaidTotal;

      return {
        id: String(s.id),
        studentId: s.studentId || null,

        name: s.name,
        email: s.email,
        phone: s.phone,

        gender: s.gender || genderMap[s.studentId] || null,

        course: s.course || null,
        address: s.address || null,
        feeDate: s.feeDate || null,
        feeBreakdown: s.feeBreakdown || null,

        fees: Number(s.fees || 0),

        // paidAmount is now ALWAYS the sum of every transaction across
        // BOTH default and custom fee categories — this is what the
        // frontend KPI cards / progress ring read, and it will now always
        // match the "Category-wise Fee Details" and "Payment History"
        // tables (all computed from the same payment-log data).
        paidAmount: totalPaid,
        dueAmount: Number(s.fees || 0) - totalPaid,

        // Per-custom-fee paid amounts, keyed by lowercased/trimmed label
        // (e.g. { "uniform": 500, "admission": 550 }) — the frontend uses
        // this to fill in the "Paid" column for custom fee-category rows.
        customPaidMap,

        // Diagnostic-only field: non-zero means the raw StudentList column
        // had drifted from the true log-summed total. Safe to ignore on the
        // frontend; useful for spotting bad legacy rows.
        _paidAmountDrift: legacyPaidAmount - categoryPaid,

        paymentMode: s.paymentMode || null,
        paymentDate: s.paymentDate || null,
        paymentStatus: s.paymentStatus || null,

        // ── Per-category paid amounts (summed from payment logs, with
        //    legacy fallback — see above) ──────────────────────
        schoolFeePaid:    flatPaid.schoolFeePaid,
        tuitionFeePaid:   flatPaid.tuitionFeePaid,
        examFeePaid:      flatPaid.examFeePaid,
        transportFeePaid: flatPaid.transportFeePaid,
        booksFeePaid:     flatPaid.booksFeePaid,
        labFeePaid:       flatPaid.labFeePaid,
        miscFeePaid:      flatPaid.miscFeePaid,

        school: {
          id: s.school?.id,
          name: s.school?.name,
          code: s.school?.code,
        },

        createdAt: s.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: normalized.length,
      data: normalized,
    });

  } catch (error) {
    console.error("[superAdminFinance] getUniversityStudentFinance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student finance",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. STAFF SALARY  (all 6 salary tables merged)
//    GET /api/superadmin-finance/staff-salary
//
//    Returns:
//    {
//      teacherSalary:  [...],
//      adminSalary:    [...],
//      financeSalary:  [...],
//      groupBSalary:   [...],
//      groupCSalary:   [...],
//      groupDSalary:   [...],
//    }
//
//    Each array item is normalised so the frontend normalizeStaffRecords()
//    helper can map it with _name / _email / _group / _date fields.
//
//    Soft-deleted records (deletedAt != null) are excluded everywhere.
// ─────────────────────────────────────────────────────────────────────────────
export const getUniversityStaffSalary = async (req, res) => {
  try {
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res.status(400).json({
        success: false,
        message: "universityId missing in token — check authMiddleware",
      });
    }

    // ── Resolve school IDs for this university once ───────────────────────
    const schools = await prisma.school.findMany({
      where: { universityId },
      select: { id: true },
    });
    const schoolIds = schools.map((s) => s.id);

    if (schoolIds.length === 0) {
      return res.json({
        success: true,
        data: {
          teacherSalary: [],
          adminSalary:   [],
          financeSalary: [],
          groupBSalary:  [],
          groupCSalary:  [],
          groupDSalary:  [],
        },
      });
    }

    // ── Run all 6 queries in parallel ────────────────────────────────────
    const [
      teacherSalary,
      adminSalary,
      financeSalary,
      groupBSalary,
      groupCSalary,
      groupDSalary,
    ] = await Promise.all([

      prisma.teacherMonthlySalary.findMany({
        where: {
          schoolId: { in: schoolIds },
          deletedAt: null,
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),

      prisma.adminMonthlySalary.findMany({
        where: {
          schoolId: { in: schoolIds },
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),

      prisma.financeMonthlySalary.findMany({
        where: {
          finance: {
            school: { universityId },
          },
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),

      prisma.groupBStaffSalary.findMany({
        where: {
          schoolId: { in: schoolIds },
          deletedAt: null,
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),

      prisma.groupCStaffSalary.findMany({
        where: {
          schoolId: { in: schoolIds },
          deletedAt: null,
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),

      prisma.groupDStaffSalary.findMany({
        where: {
          schoolId: { in: schoolIds },
          deletedAt: null,
        },
        orderBy: [{ id: "desc" }],
      }),
    ]);

    // ── Batch-fetch teacher genders from TeacherProfile ───────────────────
    const teacherIds = [
      ...new Set(
        teacherSalary
          .filter((r) => r.teacherId)
          .map((r) => r.teacherId)
      ),
    ];

    const teacherProfiles =
      teacherIds.length > 0
        ? await prisma.teacherProfile.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, gender: true },
          })
        : [];

    const teacherGenderMap = Object.fromEntries(
      teacherProfiles.map((t) => [t.id, t.gender])
    );

    // ── Normalise ─────────────────────────────────────────────────────────

    const normTeacher = teacherSalary.map((r) => ({
      ...r,
      basicSalary: toNum(r.basicSalary),
      bonus:       toNum(r.bonus),
      deductions:  toNum(r.deductions),
      netSalary:   toNum(r.netSalary),
      _name:       r.teacherName  || "—",
      _email:      r.teacherEmail || "—",
      _group:      "Teacher",
      _date:       r.paymentDate  || r.createdAt,
      gender:      r.gender || teacherGenderMap[r.teacherId] || null,
    }));

    const normAdmin = adminSalary.map((r) => ({
      ...r,
      basicSalary: toNum(r.basicSalary),
      bonus:       toNum(r.bonus),
      deductions:  toNum(r.deductions),
      netSalary:   toNum(r.netSalary),
      _name:       r.adminName  || "—",
      _email:      r.adminEmail || "—",
      _group:      "Admin",
      _date:       r.paymentDate || r.createdAt,
      gender:      null,
    }));

    const normFinance = financeSalary.map((r) => ({
      ...r,
      basicSalary: toNum(r.basicSalary),
      bonus:       toNum(r.bonus),
      deductions:  toNum(r.deductions),
      netSalary:   toNum(r.netSalary),
      _name:       r.financeName  || "—",
      _email:      r.financeEmail || "—",
      _group:      "Finance",
      _date:       r.paymentDate  || r.createdAt,
      gender:      null,
    }));

    const normGroupB = groupBSalary.map((r) => ({
      ...r,
      basicSalary: toNum(r.basicSalary),
      bonus:       toNum(r.bonus),
      deductions:  toNum(r.deductions),
      netSalary:   toNum(r.netSalary),
      _name:       r.staffName  || "—",
      _email:      r.staffEmail || "—",
      _group:      "Group B",
      _date:       r.paymentDate || r.createdAt,
      gender:      null,
    }));

    const normGroupC = groupCSalary.map((r) => ({
      ...r,
      basicSalary: toNum(r.basicSalary),
      bonus:       toNum(r.bonus),
      deductions:  toNum(r.deductions),
      netSalary:   toNum(r.netSalary),
      _name:       r.staffName  || "—",
      _email:      r.staffEmail || "—",
      _group:      "Group C",
      _date:       r.paymentDate || r.createdAt,
      gender:      null,
    }));

    const normGroupD = groupDSalary.map((r) => ({
      id:             r.id,
      schoolId:       r.schoolId,
      createdAt:      r.createdAt,
      month:          null,
      year:           null,
      leaveDays:      0,
      leaveDeduction: 0,
      paymentDate:    null,
      basicSalary:    toNum(r.basicSalary),
      bonus:          toNum(r.allowances),
      deductions:     0,
      netSalary:      toNum(r.basicSalary) + toNum(r.allowances),
      status:         r.salaryPaid ? "PAID" : "PENDING",
      _name:          r.name || r.designation || "—",
      _email:         "—",
      _group:         "Group D",
      _date:          r.createdAt,
      gender:         null,
    }));

    return res.json({
      success: true,
      data: {
        teacherSalary: normTeacher,
        adminSalary:   normAdmin,
        financeSalary: normFinance,
        groupBSalary:  normGroupB,
        groupCSalary:  normGroupC,
        groupDSalary:  normGroupD,
      },
    });

  } catch (error) {
    console.error("[superAdminFinance] getUniversityStaffSalary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch salary data",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXPENSES
//    GET /api/superadmin-finance/expenses
// ─────────────────────────────────────────────────────────────────────────────
export const getUniversityExpenses = async (req, res) => {
  try {
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res.status(400).json({
        success: false,
        message: "universityId missing in token — check authMiddleware",
      });
    }

    const expenses = await prisma.expense.findMany({
      where: {
        deletedAt: null,
        school: { universityId },
      },
      include: {
        school: {
          select: { id: true, name: true },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, color: true, icon: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const flat = expenses.map((exp) => {
      const firstCat = exp.categories?.[0]?.category;
      return {
        id:            exp.id,
        label:         exp.label,
        amount:        Number(exp.amount || 0),
        icon:          exp.icon,
        createdAt:     exp.createdAt,
        schoolId:      exp.schoolId,
        school:        exp.school,
        category:      firstCat?.name  || "Uncategorized",
        categoryColor: firstCat?.color || null,
        categories:    exp.categories,
      };
    });

    return res.json({
      success: true,
      count: flat.length,
      data: flat,
    });
  } catch (error) {
    console.error("[superAdminFinance] getUniversityExpenses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
    });
  }
};

// TEMPORARY DEBUG — delete after confirming
export const debugUniversityChain = async (req, res) => {
  try {
    const universityId = req.user?.universityId;

    const tokenShape = {
      universityId:     req.user?.universityId   ?? "MISSING",
      "university?.id": req.user?.university?.id ?? "MISSING",
      role:             req.user?.role            ?? "MISSING",
    };

    if (!universityId) {
      return res.json({ problem: "universityId missing from token", tokenShape });
    }

    const university = await prisma.university.findUnique({
      where: { id: universityId },
      select: { id: true, name: true },
    });

    const schools = await prisma.school.findMany({
      where: { universityId },
      select: { id: true, name: true },
    });
    const schoolIds = schools.map((s) => s.id);

    const [tc, ac, bc, cc, dc, sc] = await Promise.all([
      prisma.teacherMonthlySalary.count({ where: { schoolId: { in: schoolIds } } }),
      prisma.adminMonthlySalary.count({   where: { schoolId: { in: schoolIds } } }),
      prisma.groupBStaffSalary.count({    where: { schoolId: { in: schoolIds } } }),
      prisma.groupCStaffSalary.count({    where: { schoolId: { in: schoolIds } } }),
      prisma.groupDStaffSalary.count({    where: { schoolId: { in: schoolIds } } }),
      prisma.studentList.count({ where: { schoolId: { in: schoolIds }, deletedAt: null } }),
    ]);

    const anyStudentFinance = await prisma.studentFinance.findFirst({
      include: { school: { select: { universityId: true, name: true } } },
    });

    const anyTeacherSalary = await prisma.teacherMonthlySalary.findFirst({
      select: { id: true, schoolId: true },
    });

    return res.json({
      tokenShape,
      university,
      schools,
      rowCounts: {
        teacherSalary:  tc,
        adminSalary:    ac,
        groupBSalary:   bc,
        groupCSalary:   cc,
        groupDSalary:   dc,
        studentFinance: sc,
      },
      crossCheck: {
        firstStudentFinanceInDB: anyStudentFinance ?? "no rows",
        firstTeacherSalaryInDB:  anyTeacherSalary  ?? "no rows",
        yourSchoolIds:           schoolIds,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3b. STUDENT PAYMENT HISTORY (date-wise transactions)
//    GET /api/superadmin-finance/student-finance/:id/payment-history
//
//    SuperAdmin previously had NO route for this at all — the Finance
//    Details page could only ever show current cumulative totals from
//    StudentList, never the individual date-wise transactions.
//
//    This mirrors Financepages/Routes/studentFinance.routes.js's
//    GET /paymentHistory/:studentListId (the StudentPaymentLog-based path),
//    scoped to the logged-in university, so SuperAdmin sees exactly the same
//    per-transaction, date-wise breakdown Finance login sees — e.g. three
//    separate ₹500 rows with their own dates, instead of one ₹1,500 total.
// ─────────────────────────────────────────────────────────────────────────────
export const getStudentPaymentHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    const studentListId = Number(id);

    // Confirm this student belongs to a school under this university before
    // showing any of their payment history.
    const student = await prisma.studentList.findFirst({
      where: { id: studentListId, deletedAt: null, school: { universityId } },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found or access denied" });
    }

    const logs = await prisma.studentPaymentLog.findMany({
      where: { studentListId },
      orderBy: { paidAt: "desc" },
    });

    if (logs.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    let bd = {};
    try {
      bd = student.feeBreakdown ? JSON.parse(student.feeBreakdown) : {};
    } catch {}

    const getTotal = (key) => {
      const e = bd[key];
      return e ? Number(typeof e === "object" ? (e.total ?? e.amount ?? 0) : e) : 0;
    };

    // Build cumulative running totals oldest → newest (same as Finance login)
    const orderedLogs = [...logs].reverse();
    const runningTotals = {
      schoolFee: 0, tuitionFee: 0, examFee: 0, transportFee: 0,
      booksFee: 0, labFee: 0, miscFee: 0,
    };

    const enriched = orderedLogs.map((log) => {
      runningTotals.schoolFee    += Number(log.schoolFeePaid    || 0);
      runningTotals.tuitionFee   += Number(log.tuitionFeePaid   || 0);
      runningTotals.examFee      += Number(log.examFeePaid      || 0);
      runningTotals.transportFee += Number(log.transportFeePaid || 0);
      runningTotals.booksFee     += Number(log.booksFeePaid     || 0);
      runningTotals.labFee       += Number(log.labFeePaid       || 0);
      runningTotals.miscFee      += Number(log.miscFeePaid      || 0);
      return {
        ...log,
        cumulativeSchoolFee:    runningTotals.schoolFee,
        cumulativeTuitionFee:   runningTotals.tuitionFee,
        cumulativeExamFee:      runningTotals.examFee,
        cumulativeTransportFee: runningTotals.transportFee,
        cumulativeBooksFee:     runningTotals.booksFee,
        cumulativeLabFee:       runningTotals.labFee,
        cumulativeMiscFee:      runningTotals.miscFee,
      };
    });
    enriched.reverse(); // newest-first for display

    const result = enriched.map((log) => {
      const date = new Date(log.paidAt);
      const dateKey = date.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
      });

      const pairs = [
        { catName: "School Fee",    paid: Number(log.schoolFeePaid    || 0), cumPaid: log.cumulativeSchoolFee,    totalKey: "collegeFee" },
        { catName: "Tuition Fee",   paid: Number(log.tuitionFeePaid   || 0), cumPaid: log.cumulativeTuitionFee,   totalKey: "tuitionFee" },
        { catName: "Exam Fee",      paid: Number(log.examFeePaid      || 0), cumPaid: log.cumulativeExamFee,      totalKey: "examFee" },
        { catName: "Transport Fee", paid: Number(log.transportFeePaid || 0), cumPaid: log.cumulativeTransportFee, totalKey: "transportFee" },
        { catName: "Books Fee",     paid: Number(log.booksFeePaid     || 0), cumPaid: log.cumulativeBooksFee,     totalKey: "booksFee" },
        { catName: "Lab Fee",       paid: Number(log.labFeePaid       || 0), cumPaid: log.cumulativeLabFee,       totalKey: "labFee" },
        { catName: "Miscellaneous", paid: Number(log.miscFeePaid      || 0), cumPaid: log.cumulativeMiscFee,      totalKey: "miscFee" },
      ];

      const items = [];
      for (const p of pairs) {
        const total = getTotal(p.totalKey);
        if (total <= 0) continue; // skip categories this student doesn't have
        items.push({
          categoryName:   p.catName,
          amount:         p.paid, // 0 if not paid in this transaction
          cumulativePaid: p.cumPaid,
          totalAmount:    total,
          pending:        Math.max(0, total - p.cumPaid),
          paymentMode:    log.paymentMode,
        });
      }

      // Custom fee categories (e.g. Uniform, Fees) — same source as the
      // Category-wise Fee Details table's customPaidMap, just per-transaction.
      const customFees = log.customFeeBreakdown || {};
      const allCustom = Array.isArray(bd.customFees) ? bd.customFees : [];
      for (const cf of allCustom) {
        const label = cf.label;
        const total = Number(cf.total ?? cf.amount ?? 0);
        if (!label || total <= 0) continue;
        const paid = Number(customFees[label] || 0);
        items.push({
          categoryName:   label,
          amount:         paid,
          cumulativePaid: paid,
          totalAmount:    total,
          pending:        Math.max(0, total - paid),
          paymentMode:    log.paymentMode,
        });
      }

      // Fallback: no category breakdown available — show one total row
      if (items.length === 0) {
        items.push({
          categoryName:   "Total Fees",
          amount:         Number(log.amount || 0),
          cumulativePaid: Number(log.amount || 0),
          totalAmount:    Number(student.fees || 0),
          pending:        0,
          paymentMode:    log.paymentMode,
        });
      }

      return {
        id:             `log_${log.id}`,
        label:          dateKey,
        date:           date.toISOString(),
        receiptNo:      log.id,
        invoiceNumber:  log.invoiceNumber || null,
        amount:         Number(log.amount || 0),
        paymentMode:    log.paymentMode,
        items,
      };
    });

    // Deduplicate labels for same-day payments (append receipt #)
    const dateCounts = {};
    result.forEach((r) => { dateCounts[r.label] = (dateCounts[r.label] || 0) + 1; });
    result.forEach((r) => {
      if (dateCounts[r.label] > 1) r.label = `${r.label} • Receipt #${r.receiptNo}`;
    });

    return res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error("[superAdminFinance] getStudentPaymentHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. UPDATE STUDENT LIST RECORD
//    PATCH /api/superadmin-finance/student-finance/:id
//
//    NOTE: paidAmount is intentionally NOT accepted here anymore. It can only
//    change via recordStudentPayment (below), so it can never desync from
//    the per-category *FeePaid columns again.
// ─────────────────────────────────────────────────────────────────────────────
export const updateStudentFinance = async (req, res) => {
  try {
    const { id } = req.params;
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    const existing = await prisma.studentList.findFirst({
      where: {
        id:        Number(id),
        deletedAt: null,
        school:    { universityId },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Student record not found or access denied" });
    }

    const {
      name, email, phone, course, address, gender,
      fees, paymentMode, paymentDate,
      // paidAmount deliberately not destructured/accepted — see note above.
    } = req.body;

    const updated = await prisma.studentList.update({
      where: { id: Number(id) },
      data: {
        ...(name        !== undefined && { name }),
        ...(email       !== undefined && { email }),
        ...(phone       !== undefined && { phone }),
        ...(course      !== undefined && { course }),
        ...(address     !== undefined && { address }),
        ...(gender      !== undefined && { gender }),
        ...(fees        !== undefined && { fees: Number(fees) }),
        ...(paymentMode !== undefined && { paymentMode }),
        ...(paymentDate !== undefined && paymentDate && { paymentDate: new Date(paymentDate) }),
      },
    });

    return res.json({
      success: true,
      data: { ...updated, paidAmount: sumCategoryPaid(updated) },
    });
  } catch (error) {
    console.error("[superAdminFinance] updateStudentFinance:", error);
    return res.status(500).json({ success: false, message: "Failed to update student", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. RECORD A PAYMENT
//    POST /api/superadmin-finance/student-finance/:id/payment
//
//    Body: { amount: number, paymentMode: string, category: string }
//    category MUST be one of: SCHOOL | TUITION | EXAM | TRANSPORT | BOOKS | LAB | MISC
//    (the old "FULL" default is removed — every payment must land in a real
//    category column, otherwise paidAmount and the category breakdown drift
//    apart, which was the original bug).
//
//    IMPORTANT: This now ALSO writes a StudentPaymentLog row (the same table
//    Finance login's recordSimplePayment writes to). Previously this route
//    only incremented the raw StudentList column, which worked fine in
//    isolation — but getUniversityStudentFinance now sums paid amounts from
//    StudentPaymentLog whenever any log rows exist for a student (because
//    Finance login's own payments never touch the raw columns at all). If a
//    student already had log rows from Finance login and a superadmin
//    payment only incremented the raw column, that payment would be
//    invisible everywhere — this write keeps both paths consistent.
// ─────────────────────────────────────────────────────────────────────────────
export const recordStudentPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    const existing = await prisma.studentList.findFirst({
      where: { id: Number(id), deletedAt: null, school: { universityId } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Student record not found or access denied" });
    }

    const { amount, paymentMode = "CASH", category } = req.body;
    const amt = Number(amount || 0);

    if (amt <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    const catCol = CATEGORY_COLUMN_MAP[category?.toUpperCase()];

    if (!catCol) {
      return res.status(400).json({
        success: false,
        message: `A valid fee category is required. Expected one of: ${Object.keys(CATEGORY_COLUMN_MAP).join(", ")}`,
      });
    }

    // 1) Increment the raw category column + payment metadata. Kept for
    //    backward compatibility with any other report that still reads the
    //    raw StudentList columns directly, but note this value is IGNORED
    //    by getUniversityStudentFinance once any log rows exist (see above).
    const afterCategoryUpdate = await prisma.studentList.update({
      where: { id: Number(id) },
      data: {
        [catCol]: { increment: amt },
        paymentMode,
        paymentDate: new Date(),
      },
    });

    // 2) Write a StudentPaymentLog row — this is what makes the payment
    //    actually count in the log-summed totals and show up date-wise in
    //    Payment History, consistent with Finance login's own payments.
    await prisma.studentPaymentLog.create({
      data: {
        studentListId: Number(id),
        amount: amt,
        paymentMode,
        paidAt: new Date(),
        [catCol]: amt,
        customFeeBreakdown: {},
        createdBy: req.user?.id ? String(req.user.id) : null,
      },
    });

    // 3) Recompute paidAmount from the full set of logs (default + custom),
    //    so paidAmount is ALWAYS derived — never independently set — and
    //    always matches what getUniversityStudentFinance will report.
    const withLogs = await prisma.studentList.findUnique({
      where: { id: Number(id) },
      include: { paymentLogs: true },
    });

    let categoryPaid = 0;
    let customPaidTotal = 0;
    (withLogs.paymentLogs || []).forEach((log) => {
      categoryPaid += CATEGORY_FIELDS.reduce((sum, f) => sum + Number(log[f] || 0), 0);
      const custom = log.customFeeBreakdown || {};
      customPaidTotal += Object.values(custom).reduce((s, v) => s + Number(v || 0), 0);
    });
    const totalPaid = categoryPaid + customPaidTotal;
    const paymentStatus = totalPaid >= Number(afterCategoryUpdate.fees || 0) ? "PAID" : "PARTIAL";

    const final = await prisma.studentList.update({
      where: { id: Number(id) },
      data: {
        paidAmount: totalPaid,
        paymentStatus,
      },
    });

    // 4) Also log to StudentFeePayment for whatever audit trail already
    //    reads from it.
    await prisma.studentFeePayment.create({
      data: {
        studentListId: Number(id),
        amount:        amt,
        category:      category.toUpperCase(),
        paymentMode,
      },
    });

    return res.json({
      success: true,
      data: { ...final, paidAmount: totalPaid },
      recorded: amt,
    });
  } catch (error) {
    console.error("[superAdminFinance] recordStudentPayment:", error);
    return res.status(500).json({ success: false, message: "Failed to record payment", error: error.message });
  }
};