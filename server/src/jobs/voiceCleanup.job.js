// src/jobs/voiceCleanup.job.js

import cron from "node-cron";
import { cleanupExpiredAnnouncements } from "../voiceAnnouncements/voice.service.js";

const GRACE_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────────────
// Runs the cleanup once. Exported separately so it can also be invoked
// manually (e.g. from a one-off script or an admin "run cleanup now" button)
// without needing the cron scheduler.
// ─────────────────────────────────────────────────────────────────────────────
export const runVoiceCleanup = async () => {
  console.log(`[voiceCleanup] Starting cleanup for announcements expired > ${GRACE_DAYS} days ago...`);
  try {
    const result = await cleanupExpiredAnnouncements(GRACE_DAYS);
    console.log(
      `[voiceCleanup] Done. Found: ${result.totalFound}, deleted: ${result.deleted}, failed: ${result.failed}`
    );
    return result;
  } catch (error) {
    console.error("[voiceCleanup] Unexpected failure:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Registers the daily cron schedule. Call this once at server startup,
// e.g. in your main app.js / server.js:
//
//   import { setupVoiceCleanupJob } from "./jobs/voiceCleanup.job.js";
//   setupVoiceCleanupJob();
//
// Schedule below runs at 02:30 server time every day — adjust the cron
// expression / timezone option if your server isn't already in IST.
// ─────────────────────────────────────────────────────────────────────────────
export const setupVoiceCleanupJob = () => {
  cron.schedule(
    "30 2 * * *",
    () => {
      runVoiceCleanup().catch((error) => {
        console.error("[voiceCleanup] Scheduled run failed:", error);
      });
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log("[voiceCleanup] Daily cleanup job scheduled (02:30 IST)");
};