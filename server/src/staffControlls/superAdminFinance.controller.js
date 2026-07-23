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
      // ── Derive the true paid amount from category columns ─────────────
      const categoryPaid = sumCategoryPaid(s);
      const legacyPaidAmount = Number(s.paidAmount || 0);

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

        // paidAmount is now ALWAYS the sum of the category columns — this is
        // what the frontend KPI cards / progress ring read, and it will now
        // always match the "Fee Category Breakdown" / "Category-wise Fee
        // Details" tables (which are also computed from these same columns).
        paidAmount: categoryPaid,
        dueAmount: Number(s.fees || 0) - categoryPaid,

        // Diagnostic-only field: non-zero means the raw DB column had drifted
        // from the true category sum before this response recalculated it.
        // Safe to ignore on the frontend; useful for spotting bad legacy rows.
        _paidAmountDrift: legacyPaidAmount - categoryPaid,

        paymentMode: s.paymentMode || null,
        paymentDate: s.paymentDate || null,
        paymentStatus: s.paymentStatus || null,

        // ── Per-category paid amounts ──────────────────────
        schoolFeePaid:    Number(s.schoolFeePaid    || 0),
        tuitionFeePaid:   Number(s.tuitionFeePaid   || 0),
        examFeePaid:      Number(s.examFeePaid      || 0),
        transportFeePaid: Number(s.transportFeePaid || 0),
        booksFeePaid:     Number(s.booksFeePaid     || 0),
        labFeePaid:       Number(s.labFeePaid       || 0),
        miscFeePaid:      Number(s.miscFeePaid      || 0),

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
//    Increments the matching category column, recomputes paidAmount as the
//    fresh sum of all category columns, then logs to StudentFeePayment.
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

    // 1) Increment the category column + payment metadata
    const afterCategoryUpdate = await prisma.studentList.update({
      where: { id: Number(id) },
      data: {
        [catCol]: { increment: amt },
        paymentMode,
        paymentDate: new Date(),
      },
    });

    // 2) Recompute paidAmount + status from the fresh category sum, so
    //    paidAmount is ALWAYS derived — never independently set.
    const categoryPaid = sumCategoryPaid(afterCategoryUpdate);
    const paymentStatus = categoryPaid >= Number(afterCategoryUpdate.fees || 0) ? "PAID" : "PARTIAL";

    const final = await prisma.studentList.update({
      where: { id: Number(id) },
      data: {
        paidAmount: categoryPaid,
        paymentStatus,
      },
    });

    // 3) Log the payment for history/audit
    await prisma.studentFeePayment.create({
      data: {
        studentListId: Number(id),
        amount:        amt,
        category:      category.toUpperCase(),
        paymentMode,
      },
    });

    return res.json({ success: true, data: final, recorded: amt });
  } catch (error) {
    console.error("[superAdminFinance] recordStudentPayment:", error);
    return res.status(500).json({ success: false, message: "Failed to record payment", error: error.message });
  }
};