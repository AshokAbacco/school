// server/src/biometric/biometric_cron_scheduler.js
//
// BIOMETRIC CRON SCHEDULER
// ─────────────────────────────────────────────────────────────────────────────
// Dynamically schedules two one-time jobs per school per day:
//
//   Job 1 → school start + 1 hr  → processPresent(schoolId)
//   Job 2 → school's configured absent time (BiometricAttendanceSetting)
//           → processPresent(onlyUnmarked) + processAbsent(schoolId)
//           Fallback when not configured: school start + 3 hrs
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
import { getNonWorkingReason, resolveAbsentTime } from "./biometric_settings_service.js";

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
      await scheduleForSchool({ school, dateStr });
    } catch (err) {
      console.error(`[BiometricScheduler] Failed to schedule for school ${school.name}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule jobs for a single school
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ABSENT job body. First marks PRESENT any punched student who still has no
 * record (e.g. punched after the PRESENT job but before the cut-off), then
 * marks the remaining mapped students ABSENT.
 */
async function runAbsentJob(school) {
  console.log(`[BiometricScheduler] Firing ABSENT job for ${school.name}`);
  await processPresent(school.id, { onlyUnmarked: true });
  await processAbsent(school.id);
}

const absentJobName = (schoolId, dateStr) => `absent_${schoolId}_${dateStr}`;

/**
 * Schedules (or runs immediately, if the time has passed) today's ABSENT job
 * for a school, at its configured absent time (fallback: start + 3 hrs).
 * Returns the Date the job was scheduled for, or null.
 */
function scheduleAbsentJob({ school, dateStr, absentTime, label }) {
  const name = absentJobName(school.id, dateStr);
  schedule.scheduledJobs[name]?.cancel();

  const absentJobTime = buildScheduleDate(dateStr, absentTime, 0);
  if (absentJobTime.getTime() > Date.now()) {
    schedule.scheduleJob(name, absentJobTime, () => runAbsentJob(school).catch(console.error));
    console.log(`${label} ABSENT job scheduled at ${absentJobTime.toISOString()} (IST ${absentTime})`);
  } else {
    console.log(`${label} ABSENT job time (IST ${absentTime}) already passed — running now.`);
    runAbsentJob(school).catch(console.error);
  }
  return absentJobTime;
}

async function scheduleForSchool({ school, dateStr }) {
  const label = `[BiometricScheduler][${school.name}]`;

  // ── 1. Sunday / school holiday ─────────────────────────────────────────────
  const closed = await getNonWorkingReason(school.id, dateStr);
  if (closed) {
    console.log(`${label} Closed today (${closed}) — skipping.`);
    return;
  }

  // ── 2. Resolve school start time + absent time ─────────────────────────────
  //   absentTime = school's configured value, else first period + 3 hrs
  const { absentTime, source, schoolStartTime } = await resolveAbsentTime(school.id, dateStr);
  if (!absentTime) {
    console.log(`${label} No absent time configured and no timetable — skipping.`);
    return;
  }
  console.log(`${label} Start: ${schoolStartTime || "n/a"}, absent time: ${absentTime} (${source}).`);

  const absentJobTime = buildScheduleDate(dateStr, absentTime, 0);

  // ── 3. PRESENT job — start + 1 hr (only if it falls before the absent job;
  //       otherwise the ABSENT job marks punched students PRESENT itself) ─────
  if (schoolStartTime) {
    const presentJobTime = buildScheduleDate(dateStr, schoolStartTime, 60);
    if (presentJobTime < absentJobTime) {
      if (presentJobTime.getTime() > Date.now()) {
        schedule.scheduleJob(`present_${school.id}_${dateStr}`, presentJobTime, async () => {
          console.log(`[BiometricScheduler] Firing PRESENT job for ${school.name}`);
          await processPresent(school.id);
        });
        console.log(`${label} PRESENT job scheduled at ${presentJobTime.toISOString()} (IST: +1hr from ${schoolStartTime})`);
      } else {
        // If server restarted after the scheduled time, run immediately
        console.log(`${label} PRESENT job time already passed — running now.`);
        processPresent(school.id).catch(console.error);
      }
    }
  }

  // ── 4. ABSENT job — configured absent time ────────────────────────────────
  scheduleAbsentJob({ school, dateStr, absentTime, label });
}

/**
 * Called after a school's absent time is changed — re-creates today's ABSENT
 * job at the new time. Does NOT touch the PRESENT job (avoids re-notifying).
 */
export async function rescheduleAbsentJobForSchool(schoolId) {
  const { dateStr } = getISTNow();
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      biometricDevices: { where: { isActive: true }, select: { id: true }, take: 1 },
    },
  });
  if (!school || !school.biometricDevices.length) return null;

  const label = `[BiometricScheduler][${school.name}]`;
  schedule.scheduledJobs[absentJobName(schoolId, dateStr)]?.cancel();

  if (await getNonWorkingReason(schoolId, dateStr)) return null;
  const { absentTime } = await resolveAbsentTime(schoolId, dateStr);
  if (!absentTime) return null;

  return scheduleAbsentJob({ school, dateStr, absentTime, label });
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