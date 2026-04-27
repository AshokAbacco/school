import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

// ─── Helper: leave deduction (monthly salary × 12 / 365 × days) ───────────────
const calcLeaveDeduction = (monthlySalary, leaveDays) => {
  const daily = (Number(monthlySalary) * 12) / 365;
  return Math.round(daily * Number(leaveDays) * 100) / 100;
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET GROUP B STAFF  (from StaffProfile where groupType = "Group B")
//  GET /api/groupb/staff/:schoolId
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupBStaff = async (req, res) => {
  try {
    const { schoolId } = req.params;
    if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const staff = await prisma.staffProfile.findMany({
      where: {
        schoolId,
        groupType: "Group B",
        NOT: { status: "RESIGNED" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        groupType: true,
        basicSalary: true,
        phone: true,
        email: true,
        joiningDate: true,
        bankAccountNo: true,
        bankName: true,
        ifscCode: true,
        status: true,
      },
    });

    res.json(staff);
  } catch (err) {
    console.error("[getGroupBStaff]", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE MONTHLY SALARY  (links to StaffProfile via staffId)
//  POST /api/groupb/salary/create
// ─────────────────────────────────────────────────────────────────────────────
export const createGroupBSalary = async (req, res) => {
  try {
    const {
      staffId,
      month,
      year,
      bonus = 0,
      deductions = 0,
      leaveDays = 0,
    } = req.body;

    // Fetch the staff member from StaffProfile
    const staff = await prisma.staffProfile.findUnique({
      where: { id: staffId },
    });

    if (!staff) return res.status(404).json({ message: "Staff not found" });
    if (!staff.basicSalary)
      return res.status(400).json({ message: "Staff salary not defined. Please set basic salary first." });

    // Prevent duplicate salary for same month+year
    const existing = await prisma.groupBStaffSalary.findFirst({
      where: { staffId, month: Number(month), year: Number(year) },
    });
    if (existing)
      return res.status(400).json({ message: "Salary already generated for this month" });

    const leaveDeduction = calcLeaveDeduction(staff.basicSalary, leaveDays);
    const totalDeductions = Number(deductions) + leaveDeduction;
    const netSalary = Number(staff.basicSalary) + Number(bonus) - totalDeductions;

    const salary = await prisma.groupBStaffSalary.create({
      data: {
        staffId,
        schoolId: staff.schoolId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        staffEmail: staff.email || "",
        staffRole: staff.role,
        month: Number(month),
        year: Number(year),
        basicSalary: staff.basicSalary,
        bonus: Number(bonus),
        deductions: totalDeductions,
        netSalary,
        leaveDays: Number(leaveDays),
        leaveDeduction,
      },
    });

    res.json(salary);
  } catch (err) {
    console.error("[createGroupBSalary]", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET CURRENT MONTH SALARY LIST
//  GET /api/groupb/salary/list/:schoolId
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupBSalaryList = async (req, res) => {
  try {
    const { schoolId } = req.params;
     if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const month = new Date().getMonth() + 1;
    const year  = new Date().getFullYear();

    const records = await prisma.groupBStaffSalary.findMany({
      where: { schoolId, month, year },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            groupType: true,
            email: true,
            basicSalary: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      records.map((r) => ({
        id: r.id,
        salaryId: r.id,
        staffId: r.staffId,
        staff: r.staff,
        staffName: r.staffName,
        staffEmail: r.staffEmail,
        staffRole: r.staffRole,
        month: r.month,
        year: r.year,
        basicSalary: Number(r.basicSalary),
        bonus: Number(r.bonus),
        deductions: Number(r.deductions),
        leaveDays: r.leaveDays ?? 0,
        leaveDeduction: Number(r.leaveDeduction),
        netSalary: Number(r.netSalary),
        status: r.status,
        paymentDate: r.paymentDate,
      }))
    );
  } catch (err) {
    console.error("[getGroupBSalaryList]", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL HISTORY BY SCHOOL
//  GET /api/groupb/salary/history-by-school/:schoolId
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupBSalaryHistoryBySchool = async (req, res) => {
  try {
   const { schoolId } = req.params;
    if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const history = await prisma.groupBStaffSalary.findMany({
      where: { schoolId },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            email: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    res.json(
      history.map((r) => ({
        id: r.id,
        staffId: r.staffId,
        staff: r.staff,
        staffName: r.staffName,
        staffEmail: r.staffEmail,
        staffRole: r.staffRole,
        month: r.month,
        year: r.year,
        basicSalary: Number(r.basicSalary),
        bonus: Number(r.bonus),
        deductions: Number(r.deductions),
        leaveDays: r.leaveDays ?? 0,
        leaveDeduction: Number(r.leaveDeduction),
        netSalary: Number(r.netSalary),
        status: r.status,
        paymentDate: r.paymentDate,
      }))
    );
  } catch (err) {
    console.error("[getGroupBSalaryHistoryBySchool]", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET SINGLE STAFF SALARY HISTORY
//  GET /api/groupb/salary/history/:staffId
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupBStaffHistory = async (req, res) => {
  try {
    const { staffId } = req.params;

    const history = await prisma.groupBStaffSalary.findMany({
      where: { staffId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    res.json(history);
  } catch (err) {
    console.error("[getGroupBStaffHistory]", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE SALARY
//  PUT /api/groupb/salary/update/:salaryId
// ─────────────────────────────────────────────────────────────────────────────
export const updateGroupBSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const { bonus = 0, deductions = 0, leaveDays = 0 } = req.body;

    const existing = await prisma.groupBStaffSalary.findUnique({
      where: { id: salaryId },
      include: { staff: { select: { basicSalary: true } } },
    });
    if (!existing)
      return res.status(404).json({ message: "Salary record not found" });

    const leaveDeduction = calcLeaveDeduction(existing.staff.basicSalary, leaveDays);
    const totalDeductions = Number(deductions) + leaveDeduction;
    const netSalary =
      Number(existing.staff.basicSalary) + Number(bonus) - totalDeductions;

    const updated = await prisma.groupBStaffSalary.update({
      where: { id: salaryId },
      data: {
        bonus: Number(bonus),
        deductions: totalDeductions,
        leaveDays: Number(leaveDays),
        leaveDeduction,
        netSalary,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("[updateGroupBSalary]", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PAY SALARY
//  PATCH /api/groupb/salary/pay/:salaryId
// ─────────────────────────────────────────────────────────────────────────────
export const payGroupBSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const existing = await prisma.groupBStaffSalary.findUnique({ where: { id: salaryId } });
    if (!existing) return res.status(404).json({ message: "Salary record not found" });

    const salary = await prisma.groupBStaffSalary.update({
      where: { id: salaryId },
      data: { status: "PAID", paymentDate: new Date() },
    });
    res.json(salary);
  } catch (err) {
    console.error("[payGroupBSalary]", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  HOLD SALARY
//  PATCH /api/groupb/salary/hold/:salaryId
// ─────────────────────────────────────────────────────────────────────────────
export const holdGroupBSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const existing = await prisma.groupBStaffSalary.findUnique({ where: { id: salaryId } });
    if (!existing) return res.status(404).json({ message: "Salary record not found" });

    const salary = await prisma.groupBStaffSalary.update({
      where: { id: salaryId },
      data: { status: "HOLD" },
    });
    res.json(salary);
  } catch (err) {
    console.error("[holdGroupBSalary]", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE SALARY
//  DELETE /api/groupb/salary/delete/:salaryId
// ─────────────────────────────────────────────────────────────────────────────
export const deleteGroupBSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const existing = await prisma.groupBStaffSalary.findUnique({ where: { id: salaryId } });
    if (!existing) return res.status(404).json({ message: "Salary record not found" });

    await prisma.groupBStaffSalary.delete({ where: { id: salaryId } });
    res.json({ message: "Salary record deleted successfully" });
  } catch (err) {
    console.error("[deleteGroupBSalary]", err);
    res.status(500).json({ error: err.message });
  }
};