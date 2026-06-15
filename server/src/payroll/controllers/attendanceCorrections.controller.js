// server/src/payroll/controllers/attendanceCorrections.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE CORRECTIONS CONTROLLER
// Super Admin reviews and corrects attendance records
// Every change is audit-logged
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";
import { processTeacherDayAttendance } from "../../services/attendanceCalculation.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/corrections?schoolId=&month=&year=&status=&page=&limit=
// List attendance records needing review
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendanceCorrections = async (req, res) => {
  try {
    const { schoolId, month, year, status, teacherId, page = "1", limit = "20" } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, message: "schoolId is required" });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { schoolId };
    if (teacherId) where.teacherId = teacherId;
    if (status && status !== "ALL") where.status = status;

    let isCurrentMonth = false;
    let todayDateOnly = null;

    if (month && year) {
      const y = parseInt(year);
      const m = parseInt(month);

      where.date = {
        gte: new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+05:30`),
        lt: new Date(y, m, 1),
      };

      // Determine "today" in IST
      const now = new Date();
      const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const dateStr = istNow.toISOString().slice(0, 10);
      todayDateOnly = new Date(dateStr + "T00:00:00+05:30");

      if (y === todayDateOnly.getFullYear() && m === todayDateOnly.getMonth() + 1) {
        isCurrentMonth = true;
        where.date.lte = todayDateOnly;
      }
    }

    const [total, records] = await Promise.all([
      prisma.teacherDailyAttendance.count({ where }),
      prisma.teacherDailyAttendance.findMany({
        where, skip, take,
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true } },
          correctedBy: { select: { id: true, name: true } },
          auditLogs: {
            orderBy: { performedAt: "desc" },
            take: 3,
            include: { performedBy: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    let data = records.map((r) => ({
      id: r.id,
      teacherId: r.teacherId,
      teacherName: `${r.teacher.firstName} ${r.teacher.lastName}`,
      employeeCode: r.teacher.employeeCode,
      designation: r.teacher.designation,
      date: r.date,
      firstPunch: r.firstPunch,
      lastPunch: r.lastPunch,
      workedMinutes: r.workedMinutes,
      status: r.status,
      isLate: r.isLate,
      lateMinutes: r.lateMinutes,
      isLateExcused: r.isLateExcused,
      isMissingPunchReviewed: r.isMissingPunchReviewed,
      leaveType:       r.leaveType       || null,
      leaveReason:     r.leaveReason     || null,
      isLeaveDeducted: r.isLeaveDeducted ?? true,
      originalStatus: r.originalStatus,
      correctedAt: r.correctedAt,
      correctedBy: r.correctedBy?.name || null,
      recentAudit: r.auditLogs,
    }));

    // ── If today's date has no row yet for some teachers, synthesize pending rows ──
    if (isCurrentMonth && (!status || status === "ALL" || status === "ABSENT")) {
      const todayHasRecord = records.some(
        (r) => new Date(r.date).toISOString().slice(0, 10) === todayDateOnly.toISOString().slice(0, 10)
      );

      if (!todayHasRecord) {
        const teachers = await prisma.teacherProfile.findMany({
          where: { schoolId, deletedAt: null, status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true },
        });

        const placeholderRows = teachers
          .filter((t) => !teacherId || t.id === teacherId)
          .map((t) => ({
            id: `pending-${t.id}-${todayDateOnly.toISOString().slice(0, 10)}`,
            teacherId: t.id,
            teacherName: `${t.firstName} ${t.lastName}`,
            employeeCode: t.employeeCode,
            designation: t.designation,
            date: todayDateOnly,
            firstPunch: null,
            lastPunch: null,
            workedMinutes: null,
            status: "ABSENT",
            isLate: false,
            lateMinutes: null,
            isLateExcused: false,
            isMissingPunchReviewed: false,
            originalStatus: null,
            correctedAt: null,
            correctedBy: null,
            recentAudit: [],
            isPending: true, // flag so frontend can show "Not processed yet" instead of Correct button
          }));

        data = [...placeholderRows, ...data];
      }
    }

    return res.json({
      success: true, data,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error("[getAttendanceCorrections]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payroll/corrections/:id
// Body: { action, reason, newStatus, newFirstPunch, newLastPunch }
// Actions: APPROVE_PRESENT | MARK_LATE | MARK_HALF_DAY | MARK_ABSENT |
//          EXCUSE_LATE | UPDATE_IN_TIME | UPDATE_OUT_TIME | UPDATE_STATUS |
//          MISSING_PUNCH_REVIEWED
// ─────────────────────────────────────────────────────────────────────────────
export const applyCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, newStatus, newFirstPunch, newLastPunch, leaveType, leaveReason, isLeaveDeducted } = req.body;
    const performedById = req.user?.id;

    if (!action) return res.status(400).json({ success: false, message: "action is required" });
    if (!performedById) return res.status(401).json({ success: false, message: "Unauthorized" });

    const attendance = await prisma.teacherDailyAttendance.findUnique({ where: { id } });
    if (!attendance) return res.status(404).json({ success: false, message: "Attendance record not found" });

    // correctedById and performedById reference the User table.
    // Super Admin is in the SuperAdmin table (separate), not User table.
    // Check if this id exists in User table; if not, store null to avoid FK violation.
    let validUserId = null;
    if (performedById) {
      const userExists = await prisma.user.findUnique({
        where: { id: performedById },
        select: { id: true },
      });
      validUserId = userExists ? performedById : null;
    }

    const updateData = {
      originalStatus: attendance.originalStatus || attendance.status,
      correctedAt: new Date(),
      correctedById: validUserId, // null if Super Admin (SuperAdmin table, not User)
    };

    // Get performer name for audit trail (works even if not in User table)
    let performerName = "Super Admin";
    if (validUserId) {
      const u = await prisma.user.findUnique({ where: { id: validUserId }, select: { name: true } });
      performerName = u?.name || "Admin";
    }

    let auditData = {
      attendanceId: id,
      action,
      previousStatus: attendance.status,
      previousFirstPunch: attendance.firstPunch,
      previousLastPunch: attendance.lastPunch,
      reason: reason || null,
      performedById: validUserId,       // null if Super Admin (SuperAdmin table)
      performedByName: performerName,   // always stored for audit trail
    };

    switch (action) {
      case "APPROVE_PRESENT":
        updateData.status = "PRESENT";
        auditData.newStatus = "PRESENT";
        break;

      case "MARK_LATE":
        updateData.status = "PRESENT";
        updateData.isLate = true;
        auditData.newStatus = "PRESENT";
        break;

      case "MARK_HALF_DAY":
        updateData.status = "HALF_DAY";
        auditData.newStatus = "HALF_DAY";
        break;

      case "MARK_ABSENT":
        updateData.status = "ABSENT";
        auditData.newStatus = "ABSENT";
        break;

      case "EXCUSE_LATE":
        updateData.isLateExcused = true;
        // Status stays PRESENT or LATE, but late is excused (no deduction)
        auditData.newStatus = attendance.status;
        break;

      case "UPDATE_IN_TIME":
        if (!newFirstPunch) return res.status(400).json({ success: false, message: "newFirstPunch is required" });
        updateData.firstPunch = new Date(newFirstPunch);
        auditData.newFirstPunch = new Date(newFirstPunch);
        auditData.newStatus = attendance.status;
        break;

      case "UPDATE_OUT_TIME":
        if (!newLastPunch) return res.status(400).json({ success: false, message: "newLastPunch is required" });
        updateData.lastPunch = new Date(newLastPunch);
        auditData.newLastPunch = new Date(newLastPunch);
        auditData.newStatus = attendance.status;
        break;

      case "UPDATE_STATUS":
        if (!newStatus) return res.status(400).json({ success: false, message: "newStatus is required" });
        updateData.status = newStatus;
        auditData.newStatus = newStatus;
        break;

      case "MISSING_PUNCH_REVIEWED":
        updateData.isMissingPunchReviewed = true;
        if (newStatus) updateData.status = newStatus;
        auditData.newStatus = newStatus || attendance.status;
        break;

      case "MARK_ON_LEAVE":
        updateData.status = "ON_LEAVE";
        updateData.leaveType = leaveType || "OTHER";
        updateData.leaveReason = leaveReason || reason || null;
        // isLeaveDeducted: explicit boolean from body, default true (unpaid)
        updateData.isLeaveDeducted = isLeaveDeducted !== false;
        auditData.newStatus = "ON_LEAVE";
        break;

      default:
        return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
    }

    // If punch times were updated, recalculate workedMinutes
    const fp = updateData.firstPunch || attendance.firstPunch;
    const lp = updateData.lastPunch  || attendance.lastPunch;
    if (fp && lp && fp !== lp) {
      updateData.workedMinutes = Math.floor((new Date(lp) - new Date(fp)) / 60000);
    }

    const [updated] = await prisma.$transaction([
      prisma.teacherDailyAttendance.update({ where: { id }, data: updateData }),
      prisma.attendanceAuditLog.create({ data: auditData }),
    ]);

    return res.json({ success: true, data: updated, message: "Attendance correction applied." });
  } catch (err) {
    console.error("[applyCorrection]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/corrections/:id/history
// Full audit trail for a single attendance record
// ─────────────────────────────────────────────────────────────────────────────
export const getCorrectionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await prisma.attendanceAuditLog.findMany({
      where: { attendanceId: id },
      orderBy: { performedAt: "desc" },
      include: { performedBy: { select: { id: true, name: true, role: true } } },
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error("[getCorrectionHistory]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payroll/corrections/process
// Trigger attendance processing for a school/month
// Body: { schoolId, year, month }
// ─────────────────────────────────────────────────────────────────────────────
export const triggerAttendanceProcessing = async (req, res) => {
  try {
    const { schoolId, year, month } = req.body;
    if (!schoolId || !year || !month) {
      return res.status(400).json({ success: false, message: "schoolId, year, month are required" });
    }

    const { processMonthAttendance } = await import("../../services/attendanceCalculation.service.js");
    const result = await processMonthAttendance(schoolId, parseInt(year), parseInt(month));

    return res.json({ success: true, data: result, message: "Attendance processing complete." });
  } catch (err) {
    console.error("[triggerAttendanceProcessing]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payroll/corrections/reprocess-single
// Hard-deletes existing row then recalculates fresh from BiometricLog
// Body: { schoolId, teacherId, dateStr }  e.g. "2026-06-13"
// ─────────────────────────────────────────────────────────────────────────────
export const reprocessSingle = async (req, res) => {
  try {
    const { schoolId, teacherId, dateStr } = req.body;
    if (!schoolId || !teacherId || !dateStr) {
      return res.status(400).json({ success: false, message: "schoolId, teacherId, dateStr required" });
    }

    // Delete by date RANGE to catch rows stored with either UTC or IST midnight
    const dayStart = new Date(dateStr + "T00:00:00+05:30");
    const dayEnd   = new Date(dateStr + "T23:59:59+05:30");

    const deleted = await prisma.teacherDailyAttendance.deleteMany({
      where: { teacherId, date: { gte: dayStart, lte: dayEnd } },
    });
    console.log(`[reprocessSingle] Deleted ${deleted.count} row(s) for teacherId=${teacherId} date=${dateStr}`);

    // Recalculate with force=true (no correctedAt to block since we deleted the row)
    const { processTeacherDayAttendance } = await import("../../services/attendanceCalculation.service.js");
    const result = await processTeacherDayAttendance(schoolId, teacherId, dateStr, null, {}, true);

    console.log(`[reprocessSingle] Result: status=${result?.status} firstPunch=${result?.firstPunch} lastPunch=${result?.lastPunch} worked=${result?.workedMinutes}`);

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("[reprocessSingle]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payroll/corrections/mark-school-holiday
// Mark an entire date as HOLIDAY for ALL teachers in a school
// Body: { schoolId, dateStr, reason }
// ─────────────────────────────────────────────────────────────────────────────
export const markSchoolHoliday = async (req, res) => {
  try {
    const { schoolId, dateStr, reason } = req.body;
    if (!schoolId || !dateStr) {
      return res.status(400).json({ success: false, message: "schoolId and dateStr are required" });
    }

    const dayStart = new Date(dateStr + "T00:00:00+05:30");
    const dayEnd   = new Date(dateStr + "T23:59:59+05:30");

    const teachers = await prisma.teacherProfile.findMany({
      where: { schoolId, status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });

    let updated = 0;
    let created = 0;

    for (const teacher of teachers) {
      const existing = await prisma.teacherDailyAttendance.findFirst({
        where: { teacherId: teacher.id, date: { gte: dayStart, lte: dayEnd } },
      });

      if (existing) {
        await prisma.$transaction([
          prisma.teacherDailyAttendance.update({
            where: { id: existing.id },
            data: {
              status: "HOLIDAY",
              leaveType: null,
              leaveReason: null,
              isLeaveDeducted: false,
              correctedAt: new Date(),
              originalStatus: existing.originalStatus || existing.status,
            },
          }),
          prisma.attendanceAuditLog.create({
            data: {
              attendanceId: existing.id,
              action: "MARK_SCHOOL_HOLIDAY",
              previousStatus: existing.status,
              newStatus: "HOLIDAY",
              reason: reason || "Marked as school holiday by admin",
              performedByName: "Super Admin",
            },
          }),
        ]);
        updated++;
      } else {
        const canonicalDate = new Date(dateStr + "T00:00:00+05:30");
        const newRecord = await prisma.teacherDailyAttendance.create({
          data: {
            schoolId,
            teacherId: teacher.id,
            date: canonicalDate,
            status: "HOLIDAY",
            isLate: false,
            lateMinutes: 0,
            isLeaveDeducted: false,
            correctedAt: new Date(),
          },
        });
        await prisma.attendanceAuditLog.create({
          data: {
            attendanceId: newRecord.id,
            action: "MARK_SCHOOL_HOLIDAY",
            previousStatus: null,
            newStatus: "HOLIDAY",
            reason: reason || "Marked as school holiday by admin",
            performedByName: "Super Admin",
          },
        });
        created++;
      }
    }

    return res.json({
      success: true,
      message: `Holiday marked for ${teachers.length} teachers on ${dateStr}. Updated: ${updated}, Created: ${created}.`,
      data: { total: teachers.length, updated, created, dateStr },
    });
  } catch (err) {
    console.error("[markSchoolHoliday]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/cron-status?schoolId=&month=&year=
// Returns processing coverage and pending issues for the month
// ─────────────────────────────────────────────────────────────────────────────
export const getCronStatus = async (req, res) => {
  try {
    const { schoolId, month, year } = req.query;
    if (!schoolId || !month || !year) {
      return res.status(400).json({ success: false, message: "schoolId, month, year required" });
    }

    const now    = new Date();
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const todayStr = istNow.toISOString().slice(0, 10);

    const y = parseInt(year);
    const m = parseInt(month);
    const daysInMonth = new Date(y, m, 0).getDate();

    const monthStart = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+05:30`);
    const monthEnd   = new Date(y, m, 1);

    const processedDates = await prisma.teacherDailyAttendance.findMany({
      where: { schoolId, date: { gte: monthStart, lt: monthEnd } },
      select: { date: true },
      distinct: ["date"],
    });

    let workingDaysPassed = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (dateStr > todayStr) break;
      const dow = new Date(dateStr + "T12:00:00+05:30").getDay();
      if (dow !== 0) workingDaysPassed++;
    }

    const pendingIssues = await prisma.teacherDailyAttendance.count({
      where: {
        schoolId,
        date: { gte: monthStart, lt: monthEnd },
        OR: [
          { status: "MISSING_PUNCH", isMissingPunchReviewed: false },
          { status: "ABSENT" },
        ],
      },
    });

    const lastRecord = await prisma.teacherDailyAttendance.findFirst({
      where: { schoolId, date: { gte: monthStart, lt: monthEnd } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    return res.json({
      success: true,
      data: {
        daysProcessed: processedDates.length,
        workingDaysPassed,
        pendingIssues,
        lastProcessedAt: lastRecord?.updatedAt || null,
        todayStr,
      },
    });
  } catch (err) {
    console.error("[getCronStatus]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};