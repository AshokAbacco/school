// server/src/services/payrollGeneration.service.js
// ═══════════════════════════════════════════════════════════════════════════════
// PAYROLL GENERATION SERVICE
// Rule: Always generate from finalized TeacherDailyAttendance — never raw punches
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";
import { getMonthAttendanceSummary } from "./attendanceCalculation.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// COUNT SUNDAYS IN A MONTH
// ─────────────────────────────────────────────────────────────────────────────
function countSundays(year, month) {
  let count = 0;
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) count++;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNT SCHOOL HOLIDAYS IN A MONTH (excluding Sundays, already counted)
// SchoolHoliday schema has NO single "date" field:
//   GOVERNMENT type → month + day fields (repeats every year)
//   SCHOOL type     → startDate + endDate range
// ─────────────────────────────────────────────────────────────────────────────
async function countSchoolHolidays(schoolId, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart  = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`);
  const monthEnd    = new Date(year, month, 1); // first day of next month

  // Use a Set so overlapping ranges don't double-count days
  const holidayDates = new Set();

  // 1. GOVERNMENT holidays — match by month+day, no year filter needed
  const govHolidays = await prisma.schoolHoliday.findMany({
    where: { schoolId, type: "GOVERNMENT", month, deletedAt: null },
    select: { day: true },
  });
  for (const h of govHolidays) {
    if (h.day && h.day >= 1 && h.day <= daysInMonth) {
      if (new Date(year, month - 1, h.day).getDay() !== 0) {
        holidayDates.add(h.day);
      }
    }
  }

  // 2. SCHOOL holidays — stored as startDate/endDate range
  const schoolHolidays = await prisma.schoolHoliday.findMany({
    where: {
      schoolId, type: "SCHOOL", deletedAt: null,
      startDate: { lte: monthEnd },
      endDate:   { gte: monthStart },
    },
    select: { startDate: true, endDate: true },
  });

  for (const h of schoolHolidays) {
    const cursor = new Date(Math.max(new Date(h.startDate).getTime(), monthStart.getTime()));
    const end    = new Date(Math.min(new Date(h.endDate).getTime(),   monthEnd.getTime() - 1));
    while (cursor <= end) {
      const dayOfWeek = cursor.getDay();
      const dayNum    = cursor.getDate();
      if (dayOfWeek !== 0) holidayDates.add(dayNum);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return holidayDates.size;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE PAYROLL FOR ONE TEACHER
// Returns payroll record (upserted)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateTeacherPayroll(schoolId, teacherId, year, month, generatedById) {
  // Check if payroll is already locked
  const existing = await prisma.teacherMonthlyPayroll.findUnique({
    where: { teacherId_month_year: { teacherId, month, year } },
  });
  if (existing?.isLocked) {
    throw new Error("Payroll is locked and cannot be regenerated.");
  }

  // ── Step 1–4: Calendar Math ──────────────────────────────────────────────
  const totalDays   = new Date(year, month, 0).getDate();
  const sundayCount = countSundays(year, month);
  const holidayCount = await countSchoolHolidays(schoolId, year, month);
  const workingDays = totalDays - sundayCount - holidayCount;
  const safeWorkingDays = Math.max(workingDays, 1);

  // ── Step 5: Attendance Summary ───────────────────────────────────────────
  const summary = await getMonthAttendanceSummary(teacherId, year, month);

  // ── Step 6: Daily Salary ─────────────────────────────────────────────────
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { salary: true, firstName: true, lastName: true },
  });
  if (!teacher) throw new Error("Teacher not found");

  const monthlySalary     = teacher.salary ? Number(teacher.salary) : 0;
  const noSalaryConfigured = !teacher.salary;
  const dailySalary       = monthlySalary / safeWorkingDays;

  // ── Step 7: Deductions ───────────────────────────────────────────────────
  const absentDeduction  = noSalaryConfigured ? 0 : summary.absentDays  * dailySalary;
  const halfDayDeduction = noSalaryConfigured ? 0 : summary.halfDays     * (dailySalary / 2);
  const lateDeduction    = 0;
  // Unpaid leave days (isLeaveDeducted = true) are deducted at daily salary rate
  const leaveDeduction   = noSalaryConfigured ? 0 : summary.unpaidLeaveDays * dailySalary;
  const totalDeduction   = absentDeduction + halfDayDeduction + lateDeduction + leaveDeduction;

  // ── Step 8: Net Salary ───────────────────────────────────────────────────
  const netSalary = Math.max(0, monthlySalary - totalDeduction);

  // ── Validate generatedById against users table ──
  let validGeneratedById = null;
  if (generatedById) {
    const userExists = await prisma.user.findUnique({
      where: { id: generatedById },
      select: { id: true },
    });
    if (userExists) validGeneratedById = generatedById;
  }

  // ── Upsert Payroll Record ────────────────────────────────────────────────
  const payroll = await prisma.teacherMonthlyPayroll.upsert({
    where: { teacherId_month_year: { teacherId, month, year } },
    create: {
      schoolId, teacherId, month, year,
      totalDays, sundayCount, holidayCount,
      workingDays:      workingDays > 0 ? workingDays : 0,
      presentDays:      summary.presentDays,
      lateDays:         summary.lateDays,
      halfDays:         summary.halfDays,
      absentDays:       summary.absentDays,
      holidayDays:      summary.holidayDays,
      missingPunchDays: summary.missingPunchDays,
      paidLeaveDays:    summary.paidLeaveDays,
      unpaidLeaveDays:  summary.unpaidLeaveDays,
      monthlySalary,
      dailySalary:      parseFloat(dailySalary.toFixed(2)),
      absentDeduction:  parseFloat(absentDeduction.toFixed(2)),
      halfDayDeduction: parseFloat(halfDayDeduction.toFixed(2)),
      lateDeduction:    0,
      leaveDeduction:   parseFloat(leaveDeduction.toFixed(2)),
      totalDeduction:   parseFloat(totalDeduction.toFixed(2)),
      netSalary:        parseFloat(netSalary.toFixed(2)),
      generatedById:    validGeneratedById,
    },
    update: {
      totalDays, sundayCount, holidayCount,
      workingDays:      workingDays > 0 ? workingDays : 0,
      presentDays:      summary.presentDays,
      lateDays:         summary.lateDays,
      halfDays:         summary.halfDays,
      absentDays:       summary.absentDays,
      holidayDays:      summary.holidayDays,
      missingPunchDays: summary.missingPunchDays,
      paidLeaveDays:    summary.paidLeaveDays,
      unpaidLeaveDays:  summary.unpaidLeaveDays,
      monthlySalary,
      dailySalary:      parseFloat(dailySalary.toFixed(2)),
      absentDeduction:  parseFloat(absentDeduction.toFixed(2)),
      halfDayDeduction: parseFloat(halfDayDeduction.toFixed(2)),
      leaveDeduction:   parseFloat(leaveDeduction.toFixed(2)),
      totalDeduction:   parseFloat(totalDeduction.toFixed(2)),
      netSalary:        parseFloat(netSalary.toFixed(2)),
      generatedById:    validGeneratedById,
      updatedAt:        new Date(),
    },
  });

  return payroll;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE PAYROLL FOR ALL TEACHERS IN A SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
export async function generateSchoolPayroll(schoolId, year, month, generatedById) {
  // Include ALL active teachers — those without salary get a ₹0 record
  // so Super Admin can see them in the table and configure salary.
  const teachers = await prisma.teacherProfile.findMany({
    where: { schoolId, status: "ACTIVE", deletedAt: null },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  });

  const results = [];
  const errors  = [];

  for (const teacher of teachers) {
    try {
      const payroll = await generateTeacherPayroll(schoolId, teacher.id, year, month, generatedById);
      results.push({ teacherId: teacher.id, name: `${teacher.firstName} ${teacher.lastName}`, payroll });
    } catch (err) {
      errors.push({ teacherId: teacher.id, name: `${teacher.firstName} ${teacher.lastName}`, error: err.message });
    }
  }

  return { generated: results.length, errors, results };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCK PAYROLL — prevents further changes
// ─────────────────────────────────────────────────────────────────────────────
export async function lockPayroll(payrollId, lockedById) {
  const payroll = await prisma.teacherMonthlyPayroll.findUnique({ where: { id: payrollId } });
  if (!payroll) throw new Error("Payroll not found");
  if (payroll.isLocked) throw new Error("Payroll is already locked");

  return prisma.teacherMonthlyPayroll.update({
    where: { id: payrollId },
    data: { isLocked: true, lockedAt: new Date(), lockedById },
  });
}