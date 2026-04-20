// server/src/config/db.js

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { saveBackup } from "../utils/cloudBackup.js";
import { getFullData } from "../utils/getFullData.js";

export const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  const result = await next(params);

  // 🔥 only for write operations
  if (["create", "update", "delete"].includes(params.action)) {
    try {
      let fullData = result;

      // ==============================
      // 🔥 HANDLE STUDENT FULL DATA
      // ==============================
      if (
        [
          "Student",
          "StudentPersonalInfo",
          "StudentEnrollment",
          "StudentDocumentInfo",
          "StudentParent",
        ].includes(params.model)
      ) {
        const studentId = result?.id || result?.studentId;

        if (studentId) {
          fullData = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
              personalInfo: true,
              documents: true,
              enrollments: {
                include: {
                  classSection: true,
                  academicYear: true,
                },
              },
              parentLinks: {
                include: { parent: true },
              },
            },
          });
        }
      }

      // ==============================
      // 🔥 OTHER MODELS (GENERIC)
      // ==============================
      else if (result?.id) {
        const fetched = await getFullData(params.model, result.id);
        if (fetched) fullData = fetched;
      }

      // ==============================
      // 🔥 NORMALIZE MODEL NAME
      // ==============================
      let modelName = params.model;

      if (
        [
          "StudentPersonalInfo",
          "StudentEnrollment",
          "StudentDocumentInfo",
          "StudentParent",
        ].includes(params.model)
      ) {
        modelName = "Student";
      }

      // ==============================
      // 🔥 FIX refId
      // ==============================
      let refId =
        result?.id || result?.studentId || "bulk";

      if (
        [
          "StudentPersonalInfo",
          "StudentEnrollment",
          "StudentDocumentInfo",
          "StudentParent",
        ].includes(params.model)
      ) {
        refId = result?.studentId;
      }

      // ==============================
      // 🔥 ENSURE schoolId EXISTS
      // ==============================
      if (fullData && !fullData.schoolId && result?.schoolId) {
        fullData.schoolId = result.schoolId;
      }

      // ==============================
      // 🔥 NON-BLOCKING CLOUD BACKUP
      // ==============================
      saveBackup({
        model: modelName,
        refId: String(refId),
        data: fullData,
        action: params.action,
      }).catch((err) => {
        console.error("Backup async error:", err.message);
      });

    } catch (err) {
      console.error("Backup error:", err.message);
    }
  }

  return result;
});