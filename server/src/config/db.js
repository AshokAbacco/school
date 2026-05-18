// server/src/config/db.js

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { saveSchoolBackup } from "../utils/schoolBackup.service.js";
import { getFullData } from "../utils/getFullData.js";

export const prisma = new PrismaClient();

// ============================================
// USE SAME INSTANCE
// ============================================

const rawPrisma = prisma;

// ============================================
// PRISMA MIDDLEWARE
// ============================================

prisma.$use(async (params, next) => {

  let beforeData = null;

  // ============================================
  // PRE FETCH BEFORE DELETE / UPDATE
  // ============================================

  if (
    ["delete", "update"].includes(params.action) &&
    params.args?.where &&
    rawPrisma[params.model]
  ) {

    try {

      beforeData =
        await rawPrisma[params.model].findUnique({
          where: params.args.where,
        });

    } catch (e) {

      console.warn(
        "Pre-fetch failed:",
        e.message
      );

    }

  }

  // ============================================
  // EXECUTE QUERY
  // ============================================

  const result = await next(params);

  // ============================================
  // ONLY TRACK WRITE OPERATIONS
  // ============================================

  if (
    ["create", "update", "delete"].includes(
      params.action
    )
  ) {

    try {

      let fullData =
        params.action === "delete"
          ? beforeData
          : result;

      // ============================================
      // HANDLE STUDENT COMPLETE DATA
      // ============================================

      if (
        [
          "Student",
          "StudentPersonalInfo",
          "StudentEnrollment",
          "StudentDocumentInfo",
          "StudentParent",
        ].includes(params.model)
      ) {

        const studentId =
          result?.id ||
          result?.studentId ||
          beforeData?.id ||
          beforeData?.studentId;

        if (studentId) {

          fullData =
            await rawPrisma.student.findUnique({
              where: {
                id: studentId,
              },

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
                  include: {
                    parent: true,
                  },
                },
              },
            });

        }

      }

      // ============================================
      // GENERIC MODELS
      // ============================================

      else if (fullData?.id) {

        const fetched =
          await getFullData(
            params.model,
            fullData.id
          );

        if (fetched) {
          fullData = fetched;
        }

      }

      // ============================================
      // NORMALIZE MODEL NAME
      // ============================================

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

      // ============================================
      // RECORD ID
      // ============================================

      let refId =
        result?.id ||
        result?.studentId ||
        beforeData?.id ||
        beforeData?.studentId ||
        params.args?.where?.id ||
        "unknown";

      if (
        [
          "StudentPersonalInfo",
          "StudentEnrollment",
          "StudentDocumentInfo",
          "StudentParent",
        ].includes(params.model)
      ) {

        refId =
          result?.studentId ||
          beforeData?.studentId;

      }

      // ============================================
      // ENSURE SCHOOL ID
      // ============================================

      if (
        fullData &&
        !fullData.schoolId &&
        result?.schoolId
      ) {

        fullData.schoolId =
          result.schoolId;

      }

      // ============================================
      // SOFT DELETE DETECTION
      // ============================================

      const isSoftDelete =
        params.action === "update" &&
        (
          params.args?.data?.deletedAt ||
          params.args?.data?.isDeleted === true ||
          params.args?.data?.isArchived === true
        );

      // ============================================
      // RESTORE DETECTION
      // ============================================

      const isRestore =
        params.action === "update" &&
        (
          params.args?.data?.deletedAt === null ||
          params.args?.data?.isDeleted === false ||
          params.args?.data?.isArchived === false
        );

      // ============================================
      // SAVE CLOUD BACKUP
      // ============================================

      if (fullData) {

        await saveSchoolBackup({

          schoolId:
            fullData?.schoolId ||
            result?.schoolId,

          module: modelName,

          recordId: refId,

          action:
            isRestore
              ? "restore"
              : isSoftDelete
              ? "softDelete"
              : params.action,

          data: fullData,

        });

      }

    } catch (err) {

      console.error(
        "Backup middleware error:",
        err.message
      );

    }

  }

  return result;

});