import { uploadToCloud } from "./cloud.service.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function saveBackup({ model, refId, data, action = "create" }) {
  try {
    const key = `${model}/${refId}/${action}-${Date.now()}.json`;

    const buffer = Buffer.from(JSON.stringify(data, null, 2));

    // ☁️ Upload to R2
    await uploadToCloud(
      { buffer, mimetype: "application/json" },
      key
    );

    // 🔥 SMART EXTRACTION
    const schoolId =
      data?.schoolId ||
      data?.school?.id ||
      data?.student?.schoolId ||
      data?.teacher?.schoolId ||
      null;

    const name =
      data?.name ||
      data?.studentName ||
      data?.teacherName ||
      data?.label ||
      data?.title ||
      (data?.firstName && data?.lastName
        ? `${data.firstName} ${data.lastName}`
        : null) ||
      null;

    // 🔥 DELETE TRACKING
    const deletedAt = action === "delete" ? new Date() : null;

    // 🗄️ Save in DB (ONLY ONCE)
    await prisma.cloudBackup.create({
      data: {
        model,
        refId: String(refId),
        schoolId,
        name,
        fileKey: key,
        fileType: "application/json",
        deletedAt,
      },
    });

  } catch (error) {
    console.error("❌ Backup failed:", error.message);
  }
}