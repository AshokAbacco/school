// server/src/services/attendanceCalculation.service.js
// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE CALCULATION SERVICE
//
// PUNCH LOGIC:
//   - firstPunch = earliest punch of the day (regardless of IN/OUT mode)
//   - lastPunch  = latest punch of the day (regardless of IN/OUT mode)
//   - workedMinutes = lastPunch - firstPunch
//   - 1 punch only = MISSING_PUNCH (no checkout)
//   - 0 punches = ABSENT (or PENDING if school still open today)
//
// TIMEZONE:
//   Device sends IST "2026-06-13 15:11:46" → receivePunch stores as UTC "2026-06-13 09:41:46"
//   To get IST minutes: stored_UTC + 5.5h
//   Day boundaries: "2026-06-13T00:00:00+05:30" correctly = "2026-06-12T18:30:00Z"
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function istMidnight(dateStr) {
  // "2026-06-13" → Date representing 2026-06-13 00:00:00 IST = 2026-06-12T18:30:00Z
  return new Date(dateStr + "T00:00:00+05:30");
}

function timeStrToMins(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Convert UTC-stored punch timestamp to IST minutes-from-midnight
// Stored "09:41 UTC" + 5:30 = "15:11 IST" = 911 minutes
function utcToISTMins(utcDate) {
  const istMs = utcDate.getTime() + 5.5 * 60 * 60 * 1000;
  const d = new Date(istMs);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT GRACE
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_GRACE = {
  lateGraceMinutes:      15,
  earlyExitGraceMinutes: 15,
  halfDayThresholdPct:   0.5,
  absentThresholdPct:    0.25,
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL TIMING from TimetableConfig (existing table — no new table needed)
// ─────────────────────────────────────────────────────────────────────────────
async function getSchoolTiming(schoolId, dateStr) {
  const jsDay = new Date(dateStr + "T12:00:00+05:30").getDay();
  const dayType = jsDay === 6 ? "SATURDAY" : "WEEKDAY";

  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId, isActive: true },
    select: { id: true },
  });
  if (!activeYear) return null;

  const config = await prisma.timetableConfig.findUnique({
    where: { schoolId_academicYearId: { schoolId, academicYearId: activeYear.id } },
    include: {
      periodDefinitions: {
        where: { slotType: "PERIOD", dayType },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!config || !config.periodDefinitions.length) return null;

  const first = config.periodDefinitions[0];
  const last  = config.periodDefinitions[config.periodDefinitions.length - 1];
  const startMins = timeStrToMins(first.startTime);
  const endMins   = timeStrToMins(last.endTime);

  return { startMins, endMins, totalMins: endMins - startMins };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOLIDAY CHECK
// ─────────────────────────────────────────────────────────────────────────────
async function isHoliday(schoolId, dateStr) {
  if (new Date(dateStr + "T12:00:00+05:30").getDay() === 0) return true;

  const dayStart = new Date(dateStr + "T00:00:00+05:30");
  const dayEnd   = new Date(dateStr + "T23:59:59+05:30");
  const istDate  = new Date(dateStr + "T12:00:00+05:30");

  const gov = await prisma.schoolHoliday.findFirst({
    where: {
      schoolId, type: "GOVERNMENT", deletedAt: null,
      month: istDate.getMonth() + 1,
      day:   istDate.getDate(),
    },
  });
  if (gov) return true;

  const school = await prisma.schoolHoliday.findFirst({
    where: {
      schoolId, type: "SCHOOL", deletedAt: null,
      startDate: { lte: dayEnd },
      endDate:   { gte: dayStart },
    },
  });
  return !!school;
}

// ─────────────────────────────────────────────────────────────────────────────
// IS SCHOOL STILL OPEN? (for today's PENDING status)
// ─────────────────────────────────────────────────────────────────────────────
function isSchoolStillOpen(timing) {
  if (!timing) return false;
  const nowISTMins = utcToISTMins(new Date());
  return nowISTMins < (timing.endMins + 60);
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ALL PUNCHES FOR A TEACHER ON A DATE
//
// We query BOTH by teacherId AND by biometricUserMappingId and merge.
// Reason: some BiometricLog rows have biometricUserMappingId=null but teacherId set,
// others have both. Always merge to get ALL punches.
//
// firstPunch = MIN(punchDateTime) for the day  [earliest arrival]
// lastPunch  = MAX(punchDateTime) for the day  [latest punch - IN or OUT]
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPunches(teacherId, schoolId, dateStr) {
  const dayStart = new Date(dateStr + "T00:00:00+05:30");
  const dayEnd   = new Date(dateStr + "T23:59:59+05:30");
  const timeRange = { punchDateTime: { gte: dayStart, lte: dayEnd } };

  console.log(`[fetchPunches] teacherId=${teacherId} date=${dateStr} dayStart=${dayStart.toISOString()} dayEnd=${dayEnd.toISOString()}`);

  // Query 1: by teacherId directly
  const byTeacher = await prisma.biometricLog.findMany({
    where: { teacherId, schoolId, ...timeRange },
    orderBy: { punchDateTime: "asc" },
    select: { id: true, punchDateTime: true, punchMode: true },
  });
  console.log(`[fetchPunches] byTeacher=${byTeacher.length}`, byTeacher.map(p => `${p.punchMode}@${p.punchDateTime?.toISOString()}`));

  // Query 2: by mapping
  const mapping = await prisma.biometricUserMapping.findFirst({
    where: { teacherId, schoolId, isActive: true },
    select: { id: true },
  });

  let byMapping = [];
  if (mapping) {
    byMapping = await prisma.biometricLog.findMany({
      where: { biometricUserMappingId: mapping.id, ...timeRange },
      orderBy: { punchDateTime: "asc" },
      select: { id: true, punchDateTime: true, punchMode: true },
    });
    console.log(`[fetchPunches] byMapping=${byMapping.length}`);
  }

  // Merge + deduplicate by id
  const seen = new Set();
  const all = [...byTeacher, ...byMapping].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  all.sort((a, b) => new Date(a.punchDateTime) - new Date(b.punchDateTime));

  console.log(`[fetchPunches] FINAL total=${all.length}`, all.map(p => `${p.punchMode}@${p.punchDateTime?.toISOString()}`));
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINE STATUS
// ─────────────────────────────────────────────────────────────────────────────
function determineStatus(punches, timing, grace, isToday) {
  const g = { ...DEFAULT_GRACE, ...grace };

  console.log(`[determineStatus] punchCount=${punches.length} isToday=${isToday}`);

  // No punches
  if (punches.length === 0) {
    if (isToday && isSchoolStillOpen(timing)) {
      return { status: "PENDING", isLate: false, lateMinutes: 0, workedMinutes: null, firstPunch: null, lastPunch: null };
    }
    return { status: "ABSENT", isLate: false, lateMinutes: 0, workedMinutes: null, firstPunch: null, lastPunch: null };
  }

  // firstPunch = MIN(all punches), lastPunch = MAX(all punches)
  const firstPunch = punches[0].punchDateTime;
  const lastPunch  = punches[punches.length - 1].punchDateTime;

  console.log(`[determineStatus] firstPunch=${firstPunch?.toISOString()} lastPunch=${lastPunch?.toISOString()}`);

  // Only 1 punch OR all punches at same timestamp = MISSING_PUNCH
  if (punches.length === 1 || firstPunch.getTime() === lastPunch.getTime()) {
    const arrMins  = utcToISTMins(firstPunch);
    const lateMins = Math.max(0, arrMins - (timing?.startMins ?? 540) - g.lateGraceMinutes);
    return {
      status: "MISSING_PUNCH",
      isLate: lateMins > 0,
      lateMinutes: lateMins,
      workedMinutes: null,
      firstPunch,
      lastPunch: null,
    };
  }

  // Multiple distinct punches → calculate worked time
  const workedMinutes = Math.floor((lastPunch.getTime() - firstPunch.getTime()) / 60000);
  const totalMins     = timing?.totalMins ?? 450;
  const startMins     = timing?.startMins ?? 540;

  const arrMins     = utcToISTMins(firstPunch);
  const isLate      = arrMins > (startMins + g.lateGraceMinutes);
  const lateMinutes = isLate ? arrMins - startMins - g.lateGraceMinutes : 0;

  const halfDayThresh = Math.floor(totalMins * g.halfDayThresholdPct);
  const absentThresh  = Math.floor(totalMins * g.absentThresholdPct);

  let status;
  if (workedMinutes < absentThresh) {
    status = "ABSENT";
  } else if (workedMinutes < halfDayThresh) {
    status = "HALF_DAY";
  } else {
    status = "PRESENT";
  }

  console.log(`[determineStatus] workedMinutes=${workedMinutes} totalMins=${totalMins} halfDayThresh=${halfDayThresh} absentThresh=${absentThresh} status=${status}`);

  return { status, isLate, lateMinutes, workedMinutes, firstPunch, lastPunch };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIND EXISTING ATTENDANCE RECORD (handles both UTC and IST midnight date formats)
// ─────────────────────────────────────────────────────────────────────────────
async function findExistingAttendance(teacherId, dateStr) {
  const dayStart = new Date(dateStr + "T00:00:00+05:30");
  const dayEnd   = new Date(dateStr + "T23:59:59+05:30");

  return prisma.teacherDailyAttendance.findFirst({
    where: {
      teacherId,
      date: { gte: dayStart, lte: dayEnd },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UPSERT TeacherDailyAttendance
// force=true → always recalculate even if manually corrected (used by Process button)
// ─────────────────────────────────────────────────────────────────────────────
async function upsertAttendance({ schoolId, teacherId, dateStr, result, performedById, action, reason, force = false }) {
  const canonicalDate = istMidnight(dateStr);
  const existing = await findExistingAttendance(teacherId, dateStr);

  console.log(`[upsertAttendance] teacherId=${teacherId} date=${dateStr} newStatus=${result.status} force=${force} existingId=${existing?.id ?? "NONE"} existingCorrectedAt=${existing?.correctedAt ?? "none"}`);

  // Skip if manually corrected UNLESS force=true
  if (existing?.correctedAt && action === "SYSTEM_CALCULATED" && !force) {
    console.log(`[upsertAttendance] SKIPPED — correctedAt exists and force=false`);
    return existing;
  }

  const data = {
    firstPunch:    result.firstPunch    ?? null,
    lastPunch:     result.lastPunch     ?? null,
    workedMinutes: result.workedMinutes ?? null,
    status:        result.status,
    isLate:        result.isLate,
    lateMinutes:   result.lateMinutes,
  };

  if (existing) {
    // If date format is wrong (old UTC midnight), delete and recreate
    const existingDateUTC = existing.date.toISOString();
    const canonicalDateUTC = canonicalDate.toISOString();
    if (existingDateUTC !== canonicalDateUTC) {
      console.log(`[upsertAttendance] Date mismatch: existing=${existingDateUTC} canonical=${canonicalDateUTC} → delete+recreate`);
      await prisma.teacherDailyAttendance.delete({ where: { id: existing.id } });
      return prisma.teacherDailyAttendance.create({
        data: { schoolId, teacherId, date: canonicalDate, ...data },
      });
    }

    return prisma.teacherDailyAttendance.update({
      where: { id: existing.id },
      data: {
        ...data,
        originalStatus: action !== "SYSTEM_CALCULATED" ? existing.status : existing.originalStatus,
        correctedAt:    action !== "SYSTEM_CALCULATED" ? new Date() : (force ? null : existing.correctedAt),
        correctedById:  null,
        updatedAt:      new Date(),
      },
    });
  }

  return prisma.teacherDailyAttendance.create({
    data: { schoolId, teacherId, date: canonicalDate, ...data },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS ONE TEACHER FOR ONE DAY
// ─────────────────────────────────────────────────────────────────────────────
export async function processTeacherDayAttendance(schoolId, teacherId, dateStr, performedById = null, grace = DEFAULT_GRACE, force = false) {
  const today = todayIST();
  if (dateStr > today) return null; // never process future dates

  console.log(`\n[processTeacherDay] schoolId=${schoolId} teacherId=${teacherId} dateStr=${dateStr} force=${force}`);

  if (await isHoliday(schoolId, dateStr)) {
    console.log(`[processTeacherDay] → HOLIDAY`);
    return upsertAttendance({
      schoolId, teacherId, dateStr, force,
      result: { status: "HOLIDAY", isLate: false, lateMinutes: 0, workedMinutes: null, firstPunch: null, lastPunch: null },
      performedById, action: "SYSTEM_CALCULATED",
    });
  }

  // Get school timing (fallback to standard hours if no timetable)
  const timing = await getSchoolTiming(schoolId, dateStr)
    ?? { startMins: 540, endMins: 990, totalMins: 450 };

  const punches = await fetchPunches(teacherId, schoolId, dateStr);
  const result  = determineStatus(punches, timing, grace, dateStr === today);

  return upsertAttendance({ schoolId, teacherId, dateStr, result, performedById, action: "SYSTEM_CALCULATED", force });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS ENTIRE MONTH (always force=true so button always recalculates fresh)
// ─────────────────────────────────────────────────────────────────────────────
export async function processMonthAttendance(schoolId, year, month, grace = DEFAULT_GRACE) {
  const teachers = await prisma.teacherProfile.findMany({
    where: { schoolId, status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = todayIST();
  let processed = 0;
  const errors = [];

  for (const teacher of teachers) {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (dateStr > today) continue;

      try {
        const r = await processTeacherDayAttendance(schoolId, teacher.id, dateStr, null, grace, true);
        if (r) processed++;
      } catch (err) {
        errors.push({ teacherId: teacher.id, date: dateStr, error: err.message });
        console.error(`[processMonth] Error ${teacher.id} ${dateStr}:`, err.message);
      }
    }
  }

  return { processed, teachers: teachers.length, days: daysInMonth, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET MONTHLY SUMMARY (used by payroll generation)
// ─────────────────────────────────────────────────────────────────────────────
export async function getMonthAttendanceSummary(teacherId, year, month) {
  const monthStart = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`);
  const monthEnd   = new Date(year, month, 1);

  const records = await prisma.teacherDailyAttendance.findMany({
    where: { teacherId, date: { gte: monthStart, lt: monthEnd } },
  });

  const summary = {
    presentDays:     0,
    lateDays:        0,
    halfDays:        0,
    absentDays:      0,
    holidayDays:     0,
    missingPunchDays: 0,
    paidLeaveDays:   0,   // ON_LEAVE where isLeaveDeducted = false (no salary cut)
    unpaidLeaveDays: 0,   // ON_LEAVE where isLeaveDeducted = true  (salary cut)
  };

  for (const r of records) {
    switch (r.status) {
      case "PRESENT":       summary.presentDays++;       break;
      case "HALF_DAY":      summary.halfDays++;           break;
      case "ABSENT":        summary.absentDays++;         break;
      case "HOLIDAY":       summary.holidayDays++;        break;
      case "MISSING_PUNCH": summary.missingPunchDays++;   break;
      case "ON_LEAVE":
        if (r.isLeaveDeducted) summary.unpaidLeaveDays++;
        else                   summary.paidLeaveDays++;
        break;
      // PENDING = school still open, not counted in payroll
    }
    if (r.isLate && !r.isLateExcused) summary.lateDays++;
  }
  return summary;
}