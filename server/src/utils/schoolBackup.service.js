import { uploadToCloud } from "./cloud.service.js";


export async function saveSchoolBackup({
  schoolId,
  module,
  recordId,
  action,
  data,
}) {

  try {

    const timestamp = Date.now();

    // safe file name
    const safeModule = module.toLowerCase();

  const schoolName =
  data?.school?.name ||
  data?.schoolName ||
  "school";

const safeSchoolName = schoolName
  .replace(/[^a-zA-Z0-9]/g, "_");

const key =
  `record-backups/${schoolId}/` +
  `${safeModule}/` +
  `${recordId}/` +
  `${action}-${timestamp}.json`;

    // upload json
    await uploadToCloud(
      {
        buffer: Buffer.from(
          JSON.stringify(data, null, 2)
        ),
        mimetype: "application/json",
      },
      key
    );

    // optional DB tracking
  

    console.log("✅ Backup saved:", key);

  } catch (err) {

    console.error(
      "❌ School backup failed:",
      err.message
    );

  }

}