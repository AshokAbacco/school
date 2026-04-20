// server/src/staffControlls/teacherTimetableController.js

import { prisma } from "../config/db.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });

const JS_DAY_TO_WEEKDAY = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

// "08:30" → total minutes (for sorting)
const toMinutes = (t = "00:00") => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

// ── Shared helper: fetch regular periods + extra classes for one day ──────────
async function buildDaySchedule(teacherId, activeYear, schoolId, weekday, specificDate) {
  // 1. Regular timetable periods
  const entries = await prisma.timetableEntry.findMany({
    where: {
      teacherId,
      academicYearId: activeYear.id,
      day:            weekday,
      periodDefinition: { slotType: "PERIOD" },
    },
    include: {
      subject:          { select: { id: true, name: true, code: true } },
      classSection:     { select: { id: true, name: true, grade: true, section: true } },
      periodDefinition: {
        select: {
          id: true, label: true, periodNumber: true,
          startTime: true, endTime: true, order: true, slotType: true,
        },
      },
    },
  });

  // 2. Extra classes — recurring on this weekday OR specific date = today
  const extraWhere = {
    teacherId,
    academicYearId: activeYear.id,
    schoolId,
    isActive: true,
    OR: [
      { recurringDay: weekday },
      ...(specificDate ? [{ specificDate: { gte: specificDate.start, lte: specificDate.end } }] : []),
    ],
  };

  const extraClasses = await prisma.extraClass.findMany({
    where: extraWhere,
    include: {
      subject:      { select: { id: true, name: true, code: true } },
      classSection: { select: { id: true, name: true, grade: true, section: true } },
    },
  });

  // 3. Normalise regular entries
  const normalised = entries.map((e) => ({
    id:           e.id,
    type:         "REGULAR",
    startTime:    e.periodDefinition.startTime,
    endTime:      e.periodDefinition.endTime,
    subject:      e.subject,
    classSection: e.classSection,
    periodDefinition: e.periodDefinition,
  }));

  // 4. Normalise extra classes into the same shape
  const normalisedExtra = extraClasses.map((ec) => ({
    id:           ec.id,
    type:         "EXTRA",
    startTime:    ec.startTime,
    endTime:      ec.endTime,
    subject:      ec.subject,
    classSection: ec.classSection,
    extraClassType: ec.type,          // HOLIDAY | WEEKEND | BEFORE_HOURS | etc.
    reason:       ec.reason,
    recurringDay: ec.recurringDay,
    specificDate: ec.specificDate,
    periodDefinition: {               // fake pd so frontend shape is identical
      id:           ec.id,
      label:        ec.reason ?? ec.type ?? "Extra",
      periodNumber: null,
      startTime:    ec.startTime,
      endTime:      ec.endTime,
      order:        9999,
      slotType:     "PERIOD",
    },
  }));

  // 5. Merge and sort by start time
  const merged = [...normalised, ...normalisedExtra].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
  );

  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/teacher/timetable/today
 */
export async function getTodaySchedule(req, res) {
  try {
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });

    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!activeYear) return err(res, "No active academic year", 404);

    const todayWeekDay = JS_DAY_TO_WEEKDAY[new Date().getDay()];

    // Build date range for today (midnight → midnight)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const entries = await buildDaySchedule(
      teacher.id, activeYear, schoolId,
      todayWeekDay,
      { start: todayStart, end: todayEnd },
    );

    return ok(res, {
      data: {
        day:          todayWeekDay,
        academicYear: { id: activeYear.id, name: activeYear.name },
        totalPeriods: entries.length,
        entries,
      },
    });
  } catch (e) {
    console.error("[getTodaySchedule]", e);
    return err(res, e.message, 500);
  }
}

/**
 * GET /api/teacher/timetable/day/:weekday
 */
export async function getDaySchedule(req, res) {
  try {
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const VALID_DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]; // includes SUNDAY for extra classes
    const weekday = req.params.weekday?.toUpperCase();
    if (!VALID_DAYS.includes(weekday)) return err(res, "Invalid weekday", 400);

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!activeYear) return err(res, "No active academic year", 404);

    // For a specific weekday view we only match recurring extra classes
    // (no specificDate filter since we don't know which actual date the user is browsing)
    const entries = await buildDaySchedule(teacher.id, activeYear, schoolId, weekday, null);

    return ok(res, {
      data: {
        day:          weekday,
        academicYear: { id: activeYear.id, name: activeYear.name },
        totalPeriods: entries.length,
        entries,
      },
    });
  } catch (e) {
    console.error("[getDaySchedule]", e);
    return err(res, e.message, 500);
  }
}

/**
 * GET /api/teacher/timetable/week
 */
export async function getWeekSchedule(req, res) {
  try {
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!activeYear) return err(res, "No active academic year", 404);

    const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
    const grouped = {};
    for (const day of DAYS) {
      grouped[day] = await buildDaySchedule(teacher.id, activeYear, schoolId, day, null);
    }

    return ok(res, {
      data: {
        academicYear: { id: activeYear.id, name: activeYear.name },
        week:         grouped,
      },
    });
  } catch (e) {
    console.error("[getWeekSchedule]", e);
    return err(res, e.message, 500);
  }
}