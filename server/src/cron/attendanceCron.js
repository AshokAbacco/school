// server/src/cron/attendanceCron.js
// ═══════════════════════════════════════════════════════════════════════════════
// DAILY ATTENDANCE CRON JOB
// Runs every night at 11:00 PM IST
// Processes today's biometric punches for ALL active schools & teachers
// Skips records that have been manually corrected by admin (correctedAt is set)
//
// HOW TO START:
//   Import and call startAttendanceCron() in your server entry point (e.g. app.js)
//   import { startAttendanceCron } from "./cron/attendanceCron.js";
//   startAttendanceCron();
// ═══════════════════════════════════════════════════════════════════════════════

import cron from "node-cron";
import { prisma } from "../config/db.js";
import { processTeacherDayAttendance } from "../services/attendanceCalculation.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function logInfo(msg)  { console.log(`[AttendanceCron] ${new Date().toISOString()} ℹ️  ${msg}`); }
function logOk(msg)    { console.log(`[AttendanceCron] ${new Date().toISOString()} ✅  ${msg}`); }
function logError(msg) { console.error(`[AttendanceCron] ${new Date().toISOString()} ❌  ${msg}`); }

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS ONE SCHOOL FOR TODAY
// ─────────────────────────────────────────────────────────────────────────────
async function processSchoolToday(schoolId, dateStr) {
  const teachers = await prisma.teacherProfile.findMany({
    where: { schoolId, status: "ACTIVE", deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });

  logInfo(`School ${schoolId} — processing ${teachers.length} teachers for ${dateStr}`);

  let processed = 0;
  let skipped   = 0;
  let errors    = 0;

  // Process in batches of 10 for better performance
  const BATCH_SIZE = 10;
  for (let i = 0; i < teachers.length; i += BATCH_SIZE) {
    const batch = teachers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (teacher) => {
        try {
          // Check if already manually corrected today — SKIP if so
          const dayStart = new Date(dateStr + "T00:00:00+05:30");
          const dayEnd   = new Date(dateStr + "T23:59:59+05:30");

          const existing = await prisma.teacherDailyAttendance.findFirst({
            where: {
              teacherId: teacher.id,
              date: { gte: dayStart, lte: dayEnd },
              correctedAt: { not: null }, // manually corrected — do NOT overwrite
            },
          });

          if (existing) {
            skipped++;
            return;
          }

          // force=false so it won't overwrite correctedAt records (double safety)
          await processTeacherDayAttendance(schoolId, teacher.id, dateStr, null, {}, false);
          processed++;
        } catch (err) {
          errors++;
          logError(`Teacher ${teacher.id} (${teacher.firstName} ${teacher.lastName}): ${err.message}`);
        }
      })
    );
  }

  return { processed, skipped, errors, total: teachers.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN FULL CRON JOB — all active schools
// ─────────────────────────────────────────────────────────────────────────────
export async function runDailyAttendanceCron() {
  const dateStr = todayIST();
  logInfo(`===== Daily Attendance Cron Starting for ${dateStr} =====`);

  const schools = await prisma.school.findMany({
    where: { isActive: true, isDeactivated: false, deletedAt: null },
    select: { id: true, name: true },
  });

  logInfo(`Found ${schools.length} active schools`);

  let totalProcessed = 0;
  let totalSkipped   = 0;
  let totalErrors    = 0;

  for (const school of schools) {
    try {
      logInfo(`Processing school: ${school.name} (${school.id})`);
      const result = await processSchoolToday(school.id, dateStr);
      totalProcessed += result.processed;
      totalSkipped   += result.skipped;
      totalErrors    += result.errors;
      logOk(`${school.name} done — processed: ${result.processed}, skipped (corrected): ${result.skipped}, errors: ${result.errors}`);
    } catch (err) {
      totalErrors++;
      logError(`School ${school.name} (${school.id}) failed: ${err.message}`);
    }
  }

  logOk(`===== Cron Complete =====`);
  logOk(`Schools: ${schools.length} | Processed: ${totalProcessed} | Skipped: ${totalSkipped} | Errors: ${totalErrors}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// START CRON SCHEDULE
// Runs at 23:00 IST every day
// node-cron uses server local time — if server is UTC, use "30 17 * * *" (17:30 UTC = 23:00 IST)
// If server is already IST, use "0 23 * * *"
// ─────────────────────────────────────────────────────────────────────────────
export function startAttendanceCron() {
  // 17:30 UTC = 23:00 IST
  const cronExpression = "30 17 * * *";

  logInfo(`Scheduling daily attendance cron at UTC 17:30 (IST 23:00) — expression: ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    try {
      await runDailyAttendanceCron();
    } catch (err) {
      logError(`Unhandled error in cron: ${err.message}`);
    }
  });

  logOk("Attendance cron scheduled successfully.");
}