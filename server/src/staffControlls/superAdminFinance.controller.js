// server/src/controllers/superAdminFinance.controller.js
//
// READ-ONLY finance aggregation for SuperAdmin.
// Fetches data across ALL schools under the logged-in university.
//
// req.user.universityId is set by authMiddleware by normalising:
//   decoded.universityId  (new flat JWT)
//   decoded.university?.id (old nested JWT)
//
// NO writes — pure SELECT queries only.

import { prisma } from "../config/db.js";

// ─── tiny helper ─────────────────────────────────────────────────────────────
const toNum = (v) => Number(v || 0);

// ─────────────────────────────────────────────────────────────────────────────
// 1. STUDENT FINANCE
//    GET /api/superadmin-finance/student-finance
//
//    StudentFinance → school → university
//    Note: paidAmount / paymentDate / paymentMode may not exist in your current
//    schema.  We return them as-is (null/undefined) and the frontend handles
//    them gracefully with `|| 0` / `|| "—"` guards.
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

  const normalized = data.map((s) => ({
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
    paidAmount: Number(s.paidAmount || 0),
    dueAmount: Number(s.fees || 0) - Number(s.paidAmount || 0),

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
  }));

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
    // TeacherMonthlySalary rows carry a teacherId FK to TeacherProfile.
    // We collect all unique teacherIds, fetch gender in one query, then
    // build a lookup map so the normalize loop below is O(1) per row.
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
      // gender from snapshot field first, fallback to live TeacherProfile
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
      gender:      null,  // AdminMonthlySalary has no gender source
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
      gender:      null,  // FinanceMonthlySalary has no gender source
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
      gender:      null,  // GroupBStaffSalary has no gender source
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
      gender:      null,  // GroupCStaffSalary has no gender source
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
      gender:         null,  // GroupDStaffSalary has no gender source
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
//
//    Expense → school → university
//    Expense → ExpenseCategoryMap → ExpenseCategory
//
//    The existing school-level expenseController returns data grouped by
//    category.  The SuperAdmin finance page (ExpensesTab) expects a FLAT array:
//    [{ id, label, amount, createdAt, category, categoryColor }]
//
//    We fetch all non-deleted expenses with their category relation and flatten
//    them here so normalizeExpenses() on the frontend can work correctly.
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
        deletedAt: null,           // exclude soft-deleted
        school: { universityId },  // scope to this university
      },
      include: {
        school: {
          select: { id: true, name: true },
        },
        // ExpenseCategoryMap → ExpenseCategory
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

    // ── Flatten for the frontend ──────────────────────────────────────────
    // The frontend normalizeExpenses() already handles the nested shape, but
    // we do a light server-side flatten too so the payload is clean:
    //   category  → string name of the first category (or "Uncategorized")
    //   categoryColor → color from ExpenseCategory
    //
    // The raw `categories` array is also included so normalizeExpenses() can
    // re-derive it if needed.

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
        // Flattened category info — matches what normalizeExpenses() expects
        category:      firstCat?.name  || "Uncategorized",
        categoryColor: firstCat?.color || null,
        // Raw nested relation kept so the frontend normalizer can also use it
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
// ADD THESE TWO HANDLERS to superAdminFinance.controller.js
// ─────────────────────────────────────────────────────────────────────────────

// ── 4. UPDATE STUDENT LIST RECORD ────────────────────────────────────────────
// PATCH /api/superadmin-finance/student-finance/:id
export const updateStudentFinance = async (req, res) => {
  try {
    const { id } = req.params;
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    // Verify this student belongs to the university before updating
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
      fees, paidAmount, paymentMode, paymentDate,
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
        ...(fees        !== undefined && { fees:       Number(fees) }),
        ...(paidAmount  !== undefined && { paidAmount: Number(paidAmount) }),
        ...(paymentMode !== undefined && { paymentMode }),
        ...(paymentDate !== undefined && paymentDate && { paymentDate: new Date(paymentDate) }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[superAdminFinance] updateStudentFinance:", error);
    return res.status(500).json({ success: false, message: "Failed to update student", error: error.message });
  }
};

// ── 5. RECORD A PAYMENT ───────────────────────────────────────────────────────
// POST /api/superadmin-finance/student-finance/:id/payment
//
// Body: { amount: number, paymentMode: string, category: string }
// category examples: "FULL" | "SCHOOL" | "TUITION" | "EXAM" | "TRANSPORT" | "BOOKS" | "LAB" | "MISC"
//
// Increments paidAmount + the matching category column, then logs to StudentFeePayment.
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

    const { amount, paymentMode = "CASH", category = "FULL" } = req.body;
    const amt = Number(amount || 0);

    if (amt <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    // Map category string → prisma column name
    const categoryColumnMap = {
      SCHOOL:    "schoolFeePaid",
      TUITION:   "tuitionFeePaid",
      EXAM:      "examFeePaid",
      TRANSPORT: "transportFeePaid",
      BOOKS:     "booksFeePaid",
      LAB:       "labFeePaid",
      MISC:      "miscFeePaid",
    };
    const catCol = categoryColumnMap[category.toUpperCase()] || null;

    const newPaidAmount = Number(existing.paidAmount || 0) + amt;

    const updated = await prisma.studentList.update({
      where: { id: Number(id) },
      data: {
        paidAmount:   newPaidAmount,
        paymentMode,
        paymentDate:  new Date(),
        paymentStatus: newPaidAmount >= Number(existing.fees || 0) ? "PAID" : "PARTIAL",
        ...(catCol ? { [catCol]: { increment: amt } } : {}),
      },
    });

    // Log to StudentFeePayment table
    await prisma.studentFeePayment.create({
      data: {
        studentListId: Number(id),
        amount:        amt,
        category:      category.toUpperCase(),
        paymentMode,
      },
    });

    return res.json({ success: true, data: updated, recorded: amt });
  } catch (error) {
    console.error("[superAdminFinance] recordStudentPayment:", error);
    return res.status(500).json({ success: false, message: "Failed to record payment", error: error.message });
  }
};