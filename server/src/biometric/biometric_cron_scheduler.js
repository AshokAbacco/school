// server/src/biometric/biometric_cron_scheduler.js
//
// BIOMETRIC CRON SCHEDULER
// ─────────────────────────────────────────────────────────────────────────────
// Dynamically schedules two one-time jobs per school per day:
//
//   Job 1 → school start + 1 hr  → processPresent(schoolId)
//   Job 2 → school start + 3 hrs → processAbsent(schoolId)
//
// School start time = first period's startTime from PeriodDefinition,
// picked based on today's day type (WEEKDAY or SATURDAY).
//
// Skips:
//   - Sundays
//   - Schools with no active biometric device
//   - Schools with no TimetableConfig / PeriodDefinition
//   - Schools marked as SchoolHoliday for today
//
// Call initBiometricScheduler() once at server startup.
// It schedules today's jobs immediately, then reschedules at midnight every day.
//
// Dependencies: node-cron, node-schedule
//   npm install node-cron node-schedule
// ─────────────────────────────────────────────────────────────────────────────

import cron     from "node-cron";
import schedule from "node-schedule";
import { prisma }          from "../config/db.js";
import { processPresent, processAbsent } from "./biometric_attendance_service.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns current IST date info.
 */
function getISTNow() {
  const nowUtc  = new Date();
  const istMs   = nowUtc.getTime() + 5.5 * 60 * 60 * 1000;
  const istNow  = new Date(istMs);
  const dateStr = istNow.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const dayOfWeek = istNow.getDay(); // 0=Sun, 1=Mon … 6=Sat
  return { istNow, dateStr, dayOfWeek };
}

/**
 * Parse "HH:MM" string → { hours, minutes }
 */
function parseTime(timeStr) {
  const [h, m] = (timeStr || "").split(":").map(Number);
  return { hours: isNaN(h) ? 8 : h, minutes: isNaN(m) ? 0 : m };
}

/**
 * Given a date string "YYYY-MM-DD" and a time "HH:MM" in IST,
 * plus an offset in minutes, returns a JS Date (UTC) for scheduling.
 */
function buildScheduleDate(dateStr, timeStr, offsetMinutes) {
  const { hours, minutes } = parseTime(timeStr);
  const base = new Date(`${dateStr}T${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:00+05:30`);
  return new Date(base.getTime() + offsetMinutes * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Schedule jobs for all eligible schools for today
// ─────────────────────────────────────────────────────────────────────────────

async function scheduleAllSchools() {
  const { istNow, dateStr, dayOfWeek } = getISTNow();

  // ── Skip Sundays ────────────────────────────────────────────────────────────
  if (dayOfWeek === 0) {
    console.log("[BiometricScheduler] Sunday — skipping all schools.");
    return;
  }

  const dayType = dayOfWeek === 6 ? "SATURDAY" : "WEEKDAY";
  console.log(`[BiometricScheduler] Scheduling for ${dateStr} (${dayType})...`);

  // ── Fetch all active schools that have at least one active biometric device ─
  const schools = await prisma.school.findMany({
    where: {
      isActive:      true,
      isDeactivated: false,
      deletedAt:     null,
      biometricDevices: {
        some: { isActive: true },
      },
    },
    select: { id: true, name: true },
  });

  if (!schools.length) {
    console.log("[BiometricScheduler] No schools with active biometric devices.");
    return;
  }

  console.log(`[BiometricScheduler] Found ${schools.length} biometric school(s).`);

  for (const school of schools) {
    try {
      await scheduleForSchool({ school, dateStr, dayType, istNow });
    } catch (err) {
      console.error(`[BiometricScheduler] Failed to schedule for school ${school.name}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule jobs for a single school
// ─────────────────────────────────────────────────────────────────────────────

async function scheduleForSchool({ school, dateStr, dayType, istNow }) {
  const label = `[BiometricScheduler][${school.name}]`;

  // ── 1. Check if today is a school holiday ──────────────────────────────────
  // SchoolHoliday has two types:
  //   GOVERNMENT → month + day (repeats every year, no date range)
  //   SCHOOL     → startDate + endDate (academic year specific)
  const todayStart = new Date(dateStr + "T00:00:00+05:30");
  const todayEnd   = new Date(dateStr + "T23:59:59+05:30");

  // Parse today's IST month (1-12) and day (1-31) for GOVERNMENT holiday check
  const istParts  = dateStr.split("-").map(Number); // [YYYY, MM, DD]
  const todayMonth = istParts[1]; // 1-12
  const todayDay   = istParts[2]; // 1-31

  const holiday = await prisma.schoolHoliday.findFirst({
    where: {
      schoolId:  school.id,
      deletedAt: null,
      OR: [
        // SCHOOL holiday — falls within startDate..endDate range
        {
          type:      "SCHOOL",
          startDate: { lte: todayEnd },
          endDate:   { gte: todayStart },
        },
        // GOVERNMENT holiday — matches today's month and day (repeats yearly)
        {
          type:  "GOVERNMENT",
          month: todayMonth,
          day:   todayDay,
        },
      ],
    },
    select: { id: true, title: true, type: true },
  });

  if (holiday) {
    console.log(`${label} Holiday today (${holiday.title} / ${holiday.type}) — skipping.`);
    return;
  }

  // ── 2. Get active academic year ────────────────────────────────────────────
  const academicYear = await prisma.academicYear.findFirst({
    where:  { schoolId: school.id, isActive: true },
    select: { id: true },
  });

  if (!academicYear) {
    console.log(`${label} No active academic year — skipping.`);
    return;
  }

  // ── 3. Get TimetableConfig for this school + active year ───────────────────
  const timetableConfig = await prisma.timetableConfig.findUnique({
    where: {
      schoolId_academicYearId: {
        schoolId:      school.id,
        academicYearId: academicYear.id,
      },
    },
    select: { id: true },
  });

  if (!timetableConfig) {
    console.log(`${label} No TimetableConfig found — skipping.`);
    return;
  }

  // ── 4. Get first period for today's day type (lowest order) ───────────────
  const firstPeriod = await prisma.periodDefinition.findFirst({
    where: {
      configId: timetableConfig.id,
      dayType,
    },
    orderBy: { order: "asc" },
    select:  { startTime: true, order: true },
  });

  if (!firstPeriod) {
    console.log(`${label} No period definitions for ${dayType} — skipping.`);
    return;
  }

  const schoolStartTime = firstPeriod.startTime; // e.g. "08:30"
  console.log(`${label} School starts at ${schoolStartTime} (${dayType}).`);

  // ── 5. Compute schedule times ──────────────────────────────────────────────
  const presentJobTime = buildScheduleDate(dateStr, schoolStartTime, 60);  // +1 hr
  const absentJobTime  = buildScheduleDate(dateStr, schoolStartTime, 180); // +3 hrs

  const nowMs = istNow.getTime();

  // ── 6. Schedule Job 1 — PRESENT (start + 1 hr) ────────────────────────────
  if (presentJobTime.getTime() > nowMs) {
    schedule.scheduleJob(
      `present_${school.id}_${dateStr}`,
      presentJobTime,
      async () => {
        console.log(`[BiometricScheduler] Firing PRESENT job for ${school.name}`);
        await processPresent(school.id);
      }
    );
    console.log(`${label} PRESENT job scheduled at ${presentJobTime.toISOString()} (IST: +1hr from ${schoolStartTime})`);
  } else {
    // If server restarted after the scheduled time, run immediately
    console.log(`${label} PRESENT job time already passed — running now.`);
    processPresent(school.id).catch(console.error);
  }

  // ── 7. Schedule Job 2 — ABSENT (start + 3 hrs) ────────────────────────────
  if (absentJobTime.getTime() > nowMs) {
    schedule.scheduleJob(
      `absent_${school.id}_${dateStr}`,
      absentJobTime,
      async () => {
        console.log(`[BiometricScheduler] Firing ABSENT job for ${school.name}`);
        await processAbsent(school.id);
      }
    );
    console.log(`${label} ABSENT job scheduled at ${absentJobTime.toISOString()} (IST: +3hrs from ${schoolStartTime})`);
  } else {
    console.log(`${label} ABSENT job time already passed — running now.`);
    processAbsent(school.id).catch(console.error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT — call once at server startup
// ─────────────────────────────────────────────────────────────────────────────

export function initBiometricScheduler() {
  console.log("[BiometricScheduler] Initialising...");

  // Schedule today's jobs immediately on startup
  scheduleAllSchools().catch(console.error);

  // Reschedule every day at midnight IST (18:30 UTC)
  // This runs once per day and queues the next day's jobs
  cron.schedule(
    "30 18 * * *",   // 18:30 UTC = 00:00 IST
    () => {
      console.log("[BiometricScheduler] Midnight IST — rescheduling for new day...");
      scheduleAllSchools().catch(console.error);
    },
    { timezone: "UTC" }
  );

  console.log("[BiometricScheduler] Ready. Midnight rescheduler active.");
}