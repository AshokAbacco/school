// server/src/payroll/controllers/payroll.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// PAYROLL CONTROLLER
// Generate, list, lock payroll; get attendance breakdowns
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";
import { generateSchoolPayroll, generateTeacherPayroll, lockPayroll } from "../../services/payrollGeneration.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll?schoolId=&month=&year=&page=&limit=
// List payroll records
// ─────────────────────────────────────────────────────────────────────────────
export const getPayrollList = async (req, res) => {
  try {
    const { schoolId, month, year, page = "1", limit = "50" } = req.query;
    if (!schoolId || !month || !year) {
      return res.status(400).json({ success: false, message: "schoolId, month, and year are required" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      schoolId,
      month: parseInt(month),
      year: parseInt(year),
    };

    const [total, payrolls] = await Promise.all([
      prisma.teacherMonthlyPayroll.count({ where }),
      prisma.teacherMonthlyPayroll.findMany({
        where, skip, take,
        orderBy: { teacher: { firstName: "asc" } },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, department: true },
          },
          generatedBy: { select: { id: true, name: true } },
          lockedBy:    { select: { id: true, name: true } },
        },
      }),
    ]);

    const data = payrolls.map((p) => ({
      id: p.id,
      teacherId: p.teacherId,
      teacherName: `${p.teacher.firstName} ${p.teacher.lastName}`,
      employeeCode: p.teacher.employeeCode,
      designation: p.teacher.designation,
      department: p.teacher.department,
      month: p.month,
      year: p.year,
      workingDays: p.workingDays,
      presentDays: p.presentDays,
      lateDays: p.lateDays,
      halfDays: p.halfDays,
      absentDays: p.absentDays,
      holidayDays: p.holidayDays,
      missingPunchDays: p.missingPunchDays,
      paidLeaveDays:   p.paidLeaveDays   ?? 0,
      unpaidLeaveDays: p.unpaidLeaveDays ?? 0,
      monthlySalary: Number(p.monthlySalary),
      dailySalary: Number(p.dailySalary),
      absentDeduction: Number(p.absentDeduction),
      halfDayDeduction: Number(p.halfDayDeduction),
      lateDeduction: Number(p.lateDeduction),
      leaveDeduction:  Number(p.leaveDeduction  ?? 0),
      totalDeduction: Number(p.totalDeduction),
      netSalary: Number(p.netSalary),
      isLocked: p.isLocked,
      lockedAt: p.lockedAt,
      lockedBy: p.lockedBy?.name || null,
      generatedAt: p.generatedAt,
      generatedBy: p.generatedBy?.name || null,
    }));

    // Aggregate totals
    const totals = data.reduce((acc, p) => ({
      totalMonthlySalary: acc.totalMonthlySalary + p.monthlySalary,
      totalDeduction:     acc.totalDeduction     + p.totalDeduction,
      totalNetSalary:     acc.totalNetSalary     + p.netSalary,
    }), { totalMonthlySalary: 0, totalDeduction: 0, totalNetSalary: 0 });

    return res.json({
      success: true, data, totals,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error("[getPayrollList]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payroll/generate
// Body: { schoolId, year, month }
// Generates payroll for all teachers in the school
// ─────────────────────────────────────────────────────────────────────────────
export const generatePayroll = async (req, res) => {
  try {
    const { schoolId, year, month } = req.body;
    const generatedById = req.user?.id;

    if (!schoolId || !year || !month) {
      return res.status(400).json({ success: false, message: "schoolId, year, month are required" });
    }

    const result = await generateSchoolPayroll(schoolId, parseInt(year), parseInt(month), generatedById);

    return res.json({
      success: true,
      data: result,
      message: `Payroll generated for ${result.generated} teachers. ${result.errors.length} errors.`,
    });
  } catch (err) {
    console.error("[generatePayroll]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payroll/:id/lock
// Lock a single payroll record
// ─────────────────────────────────────────────────────────────────────────────
export const lockPayrollRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const lockedById = req.user?.id;
    const payroll = await lockPayroll(id, lockedById);
    return res.json({ success: true, data: payroll, message: "Payroll locked successfully." });
  } catch (err) {
    console.error("[lockPayrollRecord]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/:id/attendance-breakdown
// Detailed attendance for a payroll record
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendanceBreakdown = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.teacherMonthlyPayroll.findUnique({
      where: { id },
      include: { teacher: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

    const monthStart = new Date(`${payroll.year}-${String(payroll.month).padStart(2, "0")}-01T00:00:00+05:30`);
    const monthEnd   = new Date(payroll.year, payroll.month, 1);

    const attendanceRecords = await prisma.teacherDailyAttendance.findMany({
      where: {
        teacherId: payroll.teacherId,
        date: { gte: monthStart, lt: monthEnd },
      },
      orderBy: { date: "asc" },
      include: {
        auditLogs: {
          take: 1,
          orderBy: { performedAt: "desc" },
          include: { performedBy: { select: { name: true } } },
        },
      },
    });

    return res.json({
      success: true,
      data: {
        payroll: {
          id: payroll.id,
          teacherName: `${payroll.teacher.firstName} ${payroll.teacher.lastName}`,
          month: payroll.month,
          year: payroll.year,
        },
        attendance: attendanceRecords.map((r) => ({
          id: r.id,
          date: r.date,
          status: r.status,
          firstPunch: r.firstPunch,
          lastPunch: r.lastPunch,
          workedMinutes: r.workedMinutes,
          isLate: r.isLate,
          lateMinutes: r.lateMinutes,
          isLateExcused: r.isLateExcused,
          isMissingPunchReviewed: r.isMissingPunchReviewed,
          wasManuallyCorrect: !!r.correctedAt,
          lastEdit: r.auditLogs[0] || null,
        })),
      },
    });
  } catch (err) {
    console.error("[getAttendanceBreakdown]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/:id/correction-history
// All audit logs for all attendance records of a payroll
// ─────────────────────────────────────────────────────────────────────────────
export const getPayrollCorrectionHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.teacherMonthlyPayroll.findUnique({ where: { id } });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

    const monthStart = new Date(`${payroll.year}-${String(payroll.month).padStart(2, "0")}-01T00:00:00+05:30`);
    const monthEnd   = new Date(payroll.year, payroll.month, 1);

    const attendanceIds = await prisma.teacherDailyAttendance.findMany({
      where: { teacherId: payroll.teacherId, date: { gte: monthStart, lt: monthEnd } },
      select: { id: true },
    });

    const logs = await prisma.attendanceAuditLog.findMany({
      where: { attendanceId: { in: attendanceIds.map((a) => a.id) } },
      orderBy: { performedAt: "desc" },
      include: {
        attendance: { select: { date: true } },
        performedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error("[getPayrollCorrectionHistory]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/export?schoolId=&month=&year=&format=json
// Export payroll data (JSON; frontend handles PDF/Excel rendering)
// ─────────────────────────────────────────────────────────────────────────────
export const exportPayroll = async (req, res) => {
  try {
    const { schoolId, month, year } = req.query;
    if (!schoolId || !month || !year) {
      return res.status(400).json({ success: false, message: "schoolId, month, and year are required" });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, code: true },
    });

    const payrolls = await prisma.teacherMonthlyPayroll.findMany({
      where: { schoolId, month: parseInt(month), year: parseInt(year) },
      include: {
        teacher: { select: { firstName: true, lastName: true, employeeCode: true, designation: true, department: true } },
      },
      orderBy: { teacher: { firstName: "asc" } },
    });

    const exportData = {
      school: school?.name || "Unknown School",
      month: parseInt(month),
      year: parseInt(year),
      generatedAt: new Date().toISOString(),
      rows: payrolls.map((p, i) => ({
        sno: i + 1,
        employeeCode: p.teacher.employeeCode,
        teacherName: `${p.teacher.firstName} ${p.teacher.lastName}`,
        designation: p.teacher.designation || "—",
        department: p.teacher.department || "—",
        workingDays: p.workingDays,
        present: p.presentDays,
        late: p.lateDays,
        halfDay: p.halfDays,
        absent: p.absentDays,
        holiday: p.holidayDays,
        paidLeave:   p.paidLeaveDays   ?? 0,
        unpaidLeave: p.unpaidLeaveDays ?? 0,
        monthlySalary: Number(p.monthlySalary),
        deduction: Number(p.totalDeduction),
        netSalary: Number(p.netSalary),
        isLocked: p.isLocked,
      })),
    };

    return res.json({ success: true, data: exportData });
  } catch (err) {
    console.error("[exportPayroll]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};