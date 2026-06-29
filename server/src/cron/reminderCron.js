// src/cron/reminderCron.js
// ─────────────────────────────────────────────────────────────────────────────
// Cron: fires scheduled bulk fee reminders every minute.
// Import and call startReminderCron() in your server.js / app.js entry point.
//
// In server.js add:
//   import { startReminderCron } from "./cron/reminderCron.js";
//   startReminderCron();
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient }         from "@prisma/client";
import { sendFeePendingWhatsApp } from "../whatsapp/Fees/sendFeePendingWhatsApp.js";
import { sendFeeVoiceReminder }   from "../voice/services/voice.service.js";

const prisma = new PrismaClient();

// ── Pending-amount calculator (mirrors the one in bulkReminder_routes.js) ────
function getPendingAmount(student, feeCategory) {
  let bd = {};
  try { bd = JSON.parse(student.feeBreakdown || "{}"); } catch {}

  const getTotal = (key) => {
    const e = bd[key];
    return e ? Number(typeof e === "object" ? (e.total ?? e.amount ?? 0) : e) : 0;
  };

  if (feeCategory === "ALL")       return Math.max(0, Number(student.fees || 0)     - Number(student.paidAmount    || 0));
  if (feeCategory === "SCHOOL")    return Math.max(0, getTotal("collegeFee")         - Number(student.schoolFeePaid    || 0));
  if (feeCategory === "TUITION")   return Math.max(0, getTotal("tuitionFee")         - Number(student.tuitionFeePaid   || 0));
  if (feeCategory === "EXAM")      return Math.max(0, getTotal("examFee")            - Number(student.examFeePaid      || 0));
  if (feeCategory === "TRANSPORT") return Math.max(0, getTotal("transportFee")       - Number(student.transportFeePaid || 0));
  if (feeCategory === "BOOKS")     return Math.max(0, getTotal("booksFee")           - Number(student.booksFeePaid     || 0));
  if (feeCategory === "LAB")       return Math.max(0, getTotal("labFee")             - Number(student.labFeePaid       || 0));
  if (feeCategory === "MISC")      return Math.max(0, getTotal("miscFee")            - Number(student.miscFeePaid      || 0));

  if (feeCategory.startsWith("CUSTOM__")) {
    const label   = feeCategory.replace("CUSTOM__", "");
    const customs = Array.isArray(bd.customFees) ? bd.customFees : [];
    const match   = customs.find(c => (c.label || c.name || "") === label);
    return Math.max(0, Number(match?.amount || match?.total || 0));
  }

  return 0;
}

// ── Fire all reminders for a single scheduled job ────────────────────────────
async function processJob(job) {
  console.log(`[reminderCron] ▶ Processing job #${job.id} | cat=${job.feeCategory} ch=${job.channel} school=${job.schoolId}`);

  // Mark as processing to prevent double-fire
  await prisma.scheduledReminder.update({
    where: { id: job.id },
    data:  { status: "PROCESSING" },
  });

  try {
    const school     = await prisma.school.findUnique({ where: { id: job.schoolId } });
    const schoolName = school?.name || "School";

    const students = await prisma.studentList.findMany({
      where:   { schoolId: job.schoolId, deletedAt: null },
      orderBy: { name: "asc" },
    });

    let sent = 0, skipped = 0, failed = 0;

    for (const student of students) {
      const pendingAmount = getPendingAmount(student, job.feeCategory);
      if (pendingAmount <= 0) { skipped++; continue; }

      // Resolve phone
      let phones = [];
      if (student.studentId) {
        try {
          const realStudent = await prisma.student.findFirst({
            where:   { id: student.studentId },
            include: { parentLinks: { include: { parent: true } } },
          });
          if (realStudent?.parentLinks?.length) {
            phones = realStudent.parentLinks.map(l => l.parent?.phone).filter(Boolean);
          }
        } catch {}
      }
      if (phones.length === 0 && student.phone) phones = [student.phone];
      if (phones.length === 0)                  { skipped++; continue; }

      for (const phone of phones) {
        try {
          if (job.channel === "whatsapp") {
            await sendFeePendingWhatsApp({ phone, pendingAmount, studentName: student.name, schoolName });
          } else if (job.channel === "voice") {
            await sendFeeVoiceReminder({ phone, pendingAmount, studentName: student.name, schoolName });
          }
          sent++;
        } catch (err) {
          console.error(`[reminderCron] ✗ ${student.name} (${phone}):`, err.message);
          failed++;
        }
      }
    }

    await prisma.scheduledReminder.update({
      where: { id: job.id },
      data:  { status: "SENT", sentCount: sent, skippedCount: skipped, failedCount: failed, updatedAt: new Date() },
    });

    console.log(`[reminderCron] ✅ Job #${job.id} done — sent=${sent} skipped=${skipped} failed=${failed}`);
  } catch (err) {
    console.error(`[reminderCron] ❌ Job #${job.id} fatal error:`, err.message);
    await prisma.scheduledReminder.update({
      where: { id: job.id },
      data:  { status: "FAILED", errorMessage: err.message, updatedAt: new Date() },
    });
  }
}

// ── Main cron tick ────────────────────────────────────────────────────────────
async function runCronTick() {
  try {
    const now  = new Date();
    const jobs = await prisma.scheduledReminder.findMany({
      where: {
        status:      "PENDING",
        scheduledAt: { lte: now },
      },
    });

    if (jobs.length === 0) return; // nothing due

    console.log(`[reminderCron] ⏰ ${now.toISOString()} — ${jobs.length} job(s) due`);

    // Process sequentially to avoid race conditions / rate-limit spikes
    for (const job of jobs) {
      await processJob(job);
    }
  } catch (err) {
    console.error("[reminderCron] tick error:", err.message);
  }
}

// ── Start the cron (call once from server.js) ─────────────────────────────────
export function startReminderCron() {
  console.log("[reminderCron] 🚀 Started — checking every 60 seconds");
  runCronTick(); // run immediately on startup (catches any missed jobs)
  setInterval(runCronTick, 60_000); // then every minute
}