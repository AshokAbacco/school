// server/src/payroll/controllers/attendanceConfig.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE CONFIG CONTROLLER
//
// School timings (start/end time, required hours) come from the EXISTING
// TimetableConfig → PeriodDefinition schema. No new table needed.
//
// Grace periods & half-day threshold are stored in SchoolPayrollConfig,
// a lightweight table with only 3 fields (no timing duplication).
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";
import { DEFAULT_GRACE } from "../../services/attendanceCalculation.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: derive school timing from TimetableConfig
// ─────────────────────────────────────────────────────────────────────────────
async function readTimingFromTimetable(schoolId) {
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId, isActive: true },
    select: { id: true, name: true },
  });
  if (!activeYear) return null;

  const config = await prisma.timetableConfig.findUnique({
    where: { schoolId_academicYearId: { schoolId, academicYearId: activeYear.id } },
    include: {
      periodDefinitions: {
        where: { slotType: "PERIOD", dayType: "WEEKDAY" },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!config || config.periodDefinitions.length === 0) return null;

  const periods     = config.periodDefinitions;
  const firstPeriod = periods[0];
  const lastPeriod  = periods[periods.length - 1];

  const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

  const startMinutes = toMins(firstPeriod.startTime);
  const endMinutes   = toMins(lastPeriod.endTime);

  return {
    academicYear:    activeYear.name,
    startTime:       firstPeriod.startTime,          // "09:00"
    endTime:         lastPeriod.endTime,              // "16:30"
    totalMinutes:    endMinutes - startMinutes,       // gross school hours
    totalPeriods:    config.weekdayTotalPeriods,
    note: "Timings are read from your Timetable Configuration and cannot be changed here.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/config/:schoolId
// Returns timetable-derived timing + grace period settings
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendanceConfig = async (req, res) => {
  try {
    const { schoolId } = req.params;

    // 1. Timing from existing TimetableConfig
    const timing = await readTimingFromTimetable(schoolId);

    // 2. Grace settings from SchoolPayrollConfig (if exists), else defaults
    const graceConfig = await prisma.schoolPayrollConfig.findUnique({
      where: { schoolId },
    });

    return res.json({
      success: true,
      data: {
        // Read-only — sourced from TimetableConfig
        timing: timing || { note: "No timetable configured for this school yet." },
        // Editable — grace and threshold settings only
        grace: {
          lateGraceMinutes:      graceConfig?.lateGraceMinutes      ?? DEFAULT_GRACE.lateGraceMinutes,
          earlyExitGraceMinutes: graceConfig?.earlyExitGraceMinutes ?? DEFAULT_GRACE.earlyExitGraceMinutes,
          halfDayThresholdPct:   graceConfig?.halfDayThresholdPct   ?? DEFAULT_GRACE.halfDayThresholdPct,
          absentThresholdPct:    graceConfig?.absentThresholdPct    ?? DEFAULT_GRACE.absentThresholdPct,
          updatedAt:             graceConfig?.updatedAt ?? null,
          updatedBy:             graceConfig?.updatedByName ?? null,
        },
      },
    });
  } catch (err) {
    console.error("[getAttendanceConfig]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/payroll/config/:schoolId
// Only saves grace/threshold settings — timing comes from timetable, not here
// Body: { lateGraceMinutes, earlyExitGraceMinutes, halfDayThresholdPct, absentThresholdPct }
// ─────────────────────────────────────────────────────────────────────────────
export const upsertAttendanceConfig = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userId = req.user?.id;
    const userName = req.user?.name || "Admin";

    const {
      lateGraceMinutes      = DEFAULT_GRACE.lateGraceMinutes,
      earlyExitGraceMinutes = DEFAULT_GRACE.earlyExitGraceMinutes,
      halfDayThresholdPct   = DEFAULT_GRACE.halfDayThresholdPct,
      absentThresholdPct    = DEFAULT_GRACE.absentThresholdPct,
    } = req.body;

    const config = await prisma.schoolPayrollConfig.upsert({
      where: { schoolId },
      create: {
        schoolId,
        lateGraceMinutes:      parseInt(lateGraceMinutes),
        earlyExitGraceMinutes: parseInt(earlyExitGraceMinutes),
        halfDayThresholdPct:   parseFloat(halfDayThresholdPct),
        absentThresholdPct:    parseFloat(absentThresholdPct),
        updatedById:           userId,
        updatedByName:         userName,
      },
      update: {
        lateGraceMinutes:      parseInt(lateGraceMinutes),
        earlyExitGraceMinutes: parseInt(earlyExitGraceMinutes),
        halfDayThresholdPct:   parseFloat(halfDayThresholdPct),
        absentThresholdPct:    parseFloat(absentThresholdPct),
        updatedById:           userId,
        updatedByName:         userName,
      },
    });

    return res.json({ success: true, data: config, message: "Grace period settings saved." });
  } catch (err) {
    console.error("[upsertAttendanceConfig]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};