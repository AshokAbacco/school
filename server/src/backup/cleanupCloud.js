import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
import { deleteFromCloud } from "../utils/cloud.service.js";

export const cleanCloud = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const files = await prisma.studentDocumentInfo.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoff,
        },
      },
    });

    for (const file of files) {
      await deleteFromCloud(file.fileKey);

      await prisma.studentDocumentInfo.delete({
        where: { id: file.id },
      });

      console.log("Deleted from cloud:", file.fileKey);
    }

  } catch (err) {
    console.error("Cleanup error:", err);
  }
};