import { prisma } from "../config/db.js";
import { deleteFromCloud } from "./cloud.service.js";

export async function cleanupOldBackups() {
  try {
    const THIRTY_DAYS_AGO = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    const oldBackups = await prisma.cloudBackup.findMany({
      where: {
        createdAt: {
          lt: THIRTY_DAYS_AGO,
        },
      },
    });

    for (const backup of oldBackups) {
      try {
        // delete from R2
        await deleteFromCloud(backup.fileKey);

        // delete from DB
        await prisma.cloudBackup.delete({
          where: { id: backup.id },
        });

      } catch (err) {
        console.error("Delete failed:", err.message);
      }
    }

    console.log(`🧹 Cleaned ${oldBackups.length} old backups`);

  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
}