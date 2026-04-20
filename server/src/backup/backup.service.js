import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";

const BACKUP_DIR = path.join(process.cwd(), "backups");

export const createBackup = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  await fs.ensureDir(BACKUP_DIR);

  console.log("Saving backup to:", filePath);

  return new Promise((resolve, reject) => {
    const dbUrl = process.env.DATABASE_URL.split("?")[0];

   const command = `pg_dump --clean --if-exists "${dbUrl}" -f "${filePath}"`;

    exec(command, (error) => {
      if (error) return reject(error);
      resolve(fileName); // return only filename ✅
    });
  });
};
export const restoreBackup = (file) => {
  return new Promise((resolve, reject) => {
    const dbUrl = process.env.DATABASE_URL.split("?")[0];
    const fullPath = path.join(process.cwd(), "backups", file);

    if (!fs.existsSync(fullPath)) {
      return reject(new Error("File not found"));
    }

    const command = `psql "${dbUrl}" -c "DROP SCHEMA public CASCADE;" && psql "${dbUrl}" -c "CREATE SCHEMA public;" && psql "${dbUrl}" -f "${fullPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        return reject(error);
      }

      console.log("✅ FULL RESTORE DONE");
      resolve("Restore completed");
    });
  });
};
export const cleanOldBackups = async () => {
  const files = await fs.readdir("backups");

  const now = Date.now();

  for (const file of files) {
    const filePath = path.join("backups", file);
    const stats = await fs.stat(filePath);

    const age = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (age > 7) {
      await fs.remove(filePath);
      console.log("Deleted old backup:", file);
    }
  }
};