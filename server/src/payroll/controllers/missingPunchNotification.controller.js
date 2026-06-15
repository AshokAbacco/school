// server/src/payroll/controllers/missingPunchNotification.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// MISSING PUNCH NOTIFICATION
// Checks if teacher has punched IN but no OUT after 1 hour
// Called by: cron job or on-demand from teacher dashboard
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/missing-punch-check?teacherId=
// Returns notification message if teacher has IN but no OUT for today
// ─────────────────────────────────────────────────────────────────────────────
export const checkMissingPunch = async (req, res) => {
  try {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ success: false, message: "teacherId is required" });

    const now = new Date();
    // IST today range
    const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const dateStr = todayIST.toISOString().slice(0, 10);

    const dayStart = new Date(dateStr + "T00:00:00+05:30");
    const dayEnd   = new Date(dateStr + "T23:59:59+05:30");

    const mapping = await prisma.biometricUserMapping.findFirst({
      where: { teacherId, isActive: true },
    });

    if (!mapping) {
      return res.json({ success: true, hasNotification: false });
    }

    const punches = await prisma.biometricLog.findMany({
      where: {
        biometricUserMappingId: mapping.id,
        punchDateTime: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { punchDateTime: "asc" },
    });

    if (punches.length === 0) {
      // No punches at all today — no notification needed (will be marked absent by batch)
      return res.json({ success: true, hasNotification: false });
    }

    const firstPunch = punches[0].punchDateTime;
    const lastPunch  = punches[punches.length - 1].punchDateTime;

    // If first == last, only one punch exists (IN, no OUT yet)
    if (firstPunch.getTime() === lastPunch.getTime()) {
      const minutesSinceFirstPunch = (now - firstPunch) / 60000;

      if (minutesSinceFirstPunch >= 60) {
        return res.json({
          success: true,
          hasNotification: true,
          notification: {
            type: "MISSING_PUNCH_REMINDER",
            title: "Attendance Reminder",
            message: "You have punched IN but no OUT punch has been recorded. Please remember to punch OUT.",
            firstPunch: firstPunch,
            minutesSinceFirstPunch: Math.round(minutesSinceFirstPunch),
          },
        });
      }
    }

    return res.json({ success: true, hasNotification: false });
  } catch (err) {
    console.error("[checkMissingPunch]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/missing-punches?schoolId=&date=
// Super Admin: list all teachers with missing punches on a given date
// ─────────────────────────────────────────────────────────────────────────────
export const getMissingPunches = async (req, res) => {
  try {
    const { schoolId, date } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, message: "schoolId is required" });

    const dateStr = date || new Date().toISOString().slice(0, 10);

    const records = await prisma.teacherDailyAttendance.findMany({
      where: {
        schoolId,
        status: "MISSING_PUNCH",
        isMissingPunchReviewed: false,
        date: {
          gte: new Date(dateStr + "T00:00:00+05:30"),
          lt:  new Date(dateStr + "T23:59:59+05:30"),
        },
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });

    return res.json({
      success: true,
      data: records.map((r) => ({
        id: r.id,
        teacherName: `${r.teacher.firstName} ${r.teacher.lastName}`,
        employeeCode: r.teacher.employeeCode,
        date: r.date,
        firstPunch: r.firstPunch,
        lastPunch: r.lastPunch,
        status: r.status,
      })),
    });
  } catch (err) {
    console.error("[getMissingPunches]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};