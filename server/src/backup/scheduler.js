import cron from "node-cron";
import { cleanCloud } from "./cleanupCloud.js";

export function startBackupScheduler() {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running cloud cleanup...");
    await cleanCloud();
  });
}