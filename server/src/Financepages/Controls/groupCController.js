import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helper ───────────────────────────────────────────────────────────────────
const calcLeaveDeduction = (monthlySalary, leaveDays) => {
  const daily = (Number(monthlySalary) * 12) / 365;
  return Math.round(daily * Number(leaveDays) * 100) / 100;
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET GROUP C STAFF  (from StaffProfile where groupType = "Group C")
//  GET /api/groupc/staff/:schoolId
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupCStaff = async (req, res) => {
  try {
    const { schoolId } = req.params;
    if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const staff = await prisma.staffProfile.findMany({
      where: {
        schoolId,
        groupType: "Group C",
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
    console.error("[getGroupCStaff]", err);
    res.status(500).json({ message: "Failed to fetch Group C staff", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE MONTHLY SALARY
//  POST /api/groupc/salary/create
// ─────────────────────────────────────────────────────────────────────────────
export const createGroupCSalary = async (req, res) => {
  try {
    const {
      staffId,
      month,
      year,
      bonus = 0,
      deductions = 0,
      leaveDays = 0,
    } = req.body;

    const staff = await prisma.staffProfile.findUnique({ where: { id: staffId } });
    if (!staff) return res.status(404).json({ message: "Staff not found" });
    if (!staff.basicSalary)
      return res.status(400).json({ message: "Staff salary not defined. Please set basic salary first." });

    const existing = await prisma.groupCStaffSalary.findFirst({
      where: { staffId, month: Number(month), year: Number(year) },
    });
    if (existing)
      return res.status(400).json({ message: "Salary already generated for this month" });

    const leaveDeduction = calcLeaveDeduction(staff.basicSalary, leaveDays);
    const totalDeductions = Number(deductions) + leaveDeduction;
    const netSalary = Number(staff.basicSalary) + Number(bonus) - totalDeductions;

    const salary = await prisma.groupCStaffSalary.create({
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
    console.error("[createGroupCSalary]", err);
    res.status(500).json({ message: "Create failed", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET CURRENT MONTH SALARY LIST
//  GET /api/groupc/salary/list/:schoolId
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupCSalaryList = async (req, res) => {
  try {
    const { schoolId } = req.params;
     if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const month = new Date().getMonth() + 1;
    const year  = new Date().getFullYear();

    const records = await prisma.groupCStaffSalary.findMany({
      where: { schoolId, month, year },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
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
    console.error("[getGroupCSalaryList]", err);
    res.status(500).json({ message: "Failed to fetch salary list", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL HISTORY BY SCHOOL
//  GET /api/groupc/salary/history-by-school/:schoolId
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupCSalaryHistoryBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const history = await prisma.groupCStaffSalary.findMany({
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
    console.error("[getGroupCSalaryHistoryBySchool]", err);
    res.status(500).json({ message: "Failed to fetch history", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET SINGLE STAFF SALARY HISTORY
//  GET /api/groupc/salary/history/:staffId
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupCStaffHistory = async (req, res) => {
  try {
    const { staffId } = req.params;

    const history = await prisma.groupCStaffSalary.findMany({
      where: { staffId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    res.json(history);
  } catch (err) {
    console.error("[getGroupCStaffHistory]", err);
    res.status(500).json({ message: "Failed to fetch staff history", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE SALARY
//  PUT /api/groupc/salary/update/:salaryId
// ─────────────────────────────────────────────────────────────────────────────
export const updateGroupCSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const { bonus = 0, deductions = 0, leaveDays = 0 } = req.body;

    const existing = await prisma.groupCStaffSalary.findUnique({
      where: { id: salaryId },
      include: { staff: { select: { basicSalary: true } } },
    });
    if (!existing) return res.status(404).json({ message: "Salary record not found" });

    const leaveDeduction = calcLeaveDeduction(existing.staff.basicSalary, leaveDays);
    const totalDeductions = Number(deductions) + leaveDeduction;
    const netSalary =
      Number(existing.staff.basicSalary) + Number(bonus) - totalDeductions;

    const updated = await prisma.groupCStaffSalary.update({
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
    console.error("[updateGroupCSalary]", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PAY SALARY
//  PATCH /api/groupc/salary/pay/:salaryId
// ─────────────────────────────────────────────────────────────────────────────
export const payGroupCSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const existing = await prisma.groupCStaffSalary.findUnique({ where: { id: salaryId } });
    if (!existing) return res.status(404).json({ message: "Salary record not found" });

    const salary = await prisma.groupCStaffSalary.update({
      where: { id: salaryId },
      data: { status: "PAID", paymentDate: new Date() },
    });
    res.json(salary);
  } catch (err) {
    console.error("[payGroupCSalary]", err);
    res.status(500).json({ message: "Payment failed", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  HOLD SALARY
//  PATCH /api/groupc/salary/hold/:salaryId
// ─────────────────────────────────────────────────────────────────────────────
export const holdGroupCSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const existing = await prisma.groupCStaffSalary.findUnique({ where: { id: salaryId } });
    if (!existing) return res.status(404).json({ message: "Salary record not found" });

    const salary = await prisma.groupCStaffSalary.update({
      where: { id: salaryId },
      data: { status: "HOLD" },
    });
    res.json(salary);
  } catch (err) {
    console.error("[holdGroupCSalary]", err);
    res.status(500).json({ message: "Hold failed", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE SALARY
//  DELETE /api/groupc/salary/delete/:salaryId
// ─────────────────────────────────────────────────────────────────────────────
export const deleteGroupCSalary = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const existing = await prisma.groupCStaffSalary.findUnique({ where: { id: salaryId } });
    if (!existing) return res.status(404).json({ message: "Salary record not found" });

    await prisma.groupCStaffSalary.delete({ where: { id: salaryId } });
    res.json({ message: "Salary record deleted successfully" });
  } catch (err) {
    console.error("[deleteGroupCSalary]", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
};