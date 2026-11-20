// server/src/biometric/biometric_settings_service.js
//
// BIOMETRIC ATTENDANCE SETTINGS + TODAY'S PRESENT/ABSENT CALCULATION
// ─────────────────────────────────────────────────────────────────────────────
// Shared by:
//   - biometric.controller.js     → GET/PUT /settings, GET /stats (Today's Absent)
//   - biometric_cron_scheduler.js → when to fire the daily ABSENT job
//
// Absent time ("cut-off") resolution, per school:
//   1. BiometricAttendanceSetting.absentTime  (configured by the school, "HH:MM" IST)
//   2. Fallback: first period start + 3 hrs   (previous built-in behaviour)
//   3. Neither available → NOT_CONFIGURED (nobody is marked absent)
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "../config/db.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const DEFAULT_ABSENT_OFFSET_MINUTES = 180; // legacy: school start + 3 hrs

// ── Time helpers ─────────────────────────────────────────────────────────────

export function getISTNow() {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return {
    now: new Date(),
    dateStr: istNow.toISOString().slice(0, 10), // "YYYY-MM-DD"
    dayOfWeek: istNow.getUTCDay(), // 0=Sun … 6=Sat
  };
}

/** "HH:MM" (24h) validation — 00:00 … 23:59 */
export function isValidTime(t) {
  return typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.trim());
}

/** "HH:MM" + minutes → "HH:MM" (clamped to 23:59) */
export function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** IST date "YYYY-MM-DD" + IST time "HH:MM" → JS Date */
export function istDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00+05:30`);
}

// ── School calendar helpers ──────────────────────────────────────────────────

/**
 * Returns a reason string if the school is closed on dateStr (Sunday / holiday),
 * otherwise null.
 */
export async function getNonWorkingReason(schoolId, dateStr) {
  const dayOfWeek = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  if (dayOfWeek === 0) return "Sunday";

  const [, month, day] = dateStr.split("-").map(Number);
  const holiday = await prisma.schoolHoliday.findFirst({
    where: {
      schoolId,
      deletedAt: null,
      OR: [
        {
          type: "SCHOOL",
          startDate: { lte: new Date(dateStr + "T23:59:59+05:30") },
          endDate: { gte: new Date(dateStr + "T00:00:00+05:30") },
        },
        { type: "GOVERNMENT", month, day },
      ],
    },
    select: { title: true },
  });
  return holiday ? holiday.title || "Holiday" : null;
}

/** First period start time ("HH:MM") for the school on dateStr, or null. */
export async function getSchoolStartTime(schoolId, dateStr) {
  const dayOfWeek = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  const dayType = dayOfWeek === 6 ? "SATURDAY" : "WEEKDAY";

  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, isActive: true },
    select: { id: true },
  });
  if (!academicYear) return null;

  const config = await prisma.timetableConfig.findUnique({
    where: {
      schoolId_academicYearId: { schoolId, academicYearId: academicYear.id },
    },
    select: { id: true },
  });
  if (!config) return null;

  const firstPeriod = await prisma.periodDefinition.findFirst({
    where: { configId: config.id, dayType },
    orderBy: { order: "asc" },
    select: { startTime: true },
  });
  return firstPeriod?.startTime || null;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting(schoolId) {
  return prisma.biometricAttendanceSetting.findUnique({ where: { schoolId } });
}

/**
 * Effective absent time for a school on a given day.
 * @returns {{ absentTime: string|null, source: "CONFIGURED"|"DEFAULT"|null, schoolStartTime: string|null }}
 */
export async function resolveAbsentTime(schoolId, dateStr) {
  const [setting, schoolStartTime] = await Promise.all([
    getSetting(schoolId),
    getSchoolStartTime(schoolId, dateStr),
  ]);

  if (setting?.absentTime) {
    return { absentTime: setting.absentTime, source: "CONFIGURED", schoolStartTime };
  }
  if (schoolStartTime) {
    return {
      absentTime: addMinutes(schoolStartTime, DEFAULT_ABSENT_OFFSET_MINUTES),
      source: "DEFAULT",
      schoolStartTime,
    };
  }
  return { absentTime: null, source: null, schoolStartTime: null };
}

// ── Today's Present / Absent for one school ─────────────────────────────────

const personKey = (m) =>
  m.studentId ? `S:${m.studentId}`
  : m.teacherId ? `T:${m.teacherId}`
  : m.staffId ? `F:${m.staffId}`
  : m.userId ? `U:${m.userId}`
  : `M:${m.id}`;

/**
 * Counts today's present/absent for ALL biometric-mapped users of a school
 * (students, teachers, staff, admin, finance).
 *
 *  mapped  = distinct persons with an active card mapping in this school
 *  present = mapped persons with at least one punch today (IST)
 *  absent  = mapped − present, but ONLY once the absent time has passed.
 *            Before that, absent = null (status "PENDING").
 *  byType  = same numbers split by personType (STUDENT, TEACHER, …)
 *
 * status: "ACTIVE" | "PENDING" | "HOLIDAY" | "NOT_CONFIGURED"
 */
export async function computeTodayStudentAttendance(schoolId) {
  const { now, dateStr } = getISTNow();

  const [nonWorking, resolved, mappings] = await Promise.all([
    getNonWorkingReason(schoolId, dateStr),
    resolveAbsentTime(schoolId, dateStr),
    prisma.biometricUserMapping.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true, personType: true,
        studentId: true, teacherId: true, staffId: true, userId: true,
      },
    }),
  ]);

  // Distinct persons (a person may hold more than one active card)
  const mappingToPerson = new Map(); // mappingId → personKey
  const personType = new Map();      // personKey → personType
  for (const m of mappings) {
    const key = personKey(m);
    mappingToPerson.set(m.id, key);
    personType.set(key, m.personType || "OTHER");
  }

  // Persons who punched today (via any of their active mappings)
  const presentSet = new Set();
  if (mappings.length) {
    const punched = await prisma.biometricLog.findMany({
      where: {
        schoolId,
        biometricUserMappingId: { in: mappings.map((m) => m.id) },
        punchDateTime: {
          gte: new Date(dateStr + "T00:00:00+05:30"),
          lte: new Date(dateStr + "T23:59:59.999+05:30"),
        },
      },
      select: { biometricUserMappingId: true },
      distinct: ["biometricUserMappingId"],
    });
    for (const l of punched) {
      const key = mappingToPerson.get(l.biometricUserMappingId);
      if (key) presentSet.add(key);
    }
  }

  const status = nonWorking
    ? "HOLIDAY"
    : !resolved.absentTime
      ? "NOT_CONFIGURED"
      : now < istDateTime(dateStr, resolved.absentTime)
        ? "PENDING"
        : "ACTIVE";
  const countAbsent = status === "ACTIVE";

  const byType = {};
  for (const [key, type] of personType) {
    byType[type] ||= { mapped: 0, present: 0, absent: countAbsent ? 0 : null };
    byType[type].mapped++;
    if (presentSet.has(key)) byType[type].present++;
    else if (countAbsent) byType[type].absent++;
  }

  const mapped = personType.size;
  const present = presentSet.size;

  return {
    schoolId,
    date: dateStr,
    absentTime: resolved.absentTime,
    absentTimeSource: resolved.source,
    schoolStartTime: resolved.schoolStartTime,
    mappedStudents: mapped, // kept name for compatibility: = all mapped users
    mappedUsers: mapped,
    present,
    absent: status === "HOLIDAY" ? 0 : countAbsent ? Math.max(mapped - present, 0) : null,
    byType,
    status,
    reason: nonWorking || null,
  };
}