import cron from "node-cron";
import { cleanupOldBackups } from "./cleanupCloud.js";

// run daily at 2 AM
cron.schedule("0 2 * * *", async () => {
  console.log("Running cleanup job...");
  await cleanupOldBackups();
});