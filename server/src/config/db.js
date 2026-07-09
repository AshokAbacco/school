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
  // NOTE: everything below this point (extra lookups + the cloud
  // backup upload) is fired WITHOUT awaiting it here. If this write
  // is happening inside an interactive prisma.$transaction(...), the
  // transaction has already gotten its `result` and can commit/move on
  // immediately — it no longer waits on backup/network latency.
  // Any error inside the background task is caught and logged there,
  // never bubbling up to the caller of the actual write.

  if (
    ["create", "update", "delete"].includes(
      params.action
    )
  ) {

    // Snapshot the params/data we need now, synchronously, before we
    // return — params/result/beforeData are safe to reuse below since
    // nothing mutates them after this point.
    const modelForBackup = params.model;
    const actionForBackup = params.action;
    const argsForBackup = params.args;
    const resultForBackup = result;
    const beforeDataForBackup = beforeData;

    (async () => {

      try {

        let fullData =
          actionForBackup === "delete"
            ? beforeDataForBackup
            : resultForBackup;

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
          ].includes(modelForBackup)
        ) {

          const studentId =
            resultForBackup?.id ||
            resultForBackup?.studentId ||
            beforeDataForBackup?.id ||
            beforeDataForBackup?.studentId;

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
              modelForBackup,
              fullData.id
            );

          if (fetched) {
            fullData = fetched;
          }

        }

        // ============================================
        // NORMALIZE MODEL NAME
        // ============================================

        let modelName = modelForBackup;

        if (
          [
            "StudentPersonalInfo",
            "StudentEnrollment",
            "StudentDocumentInfo",
            "StudentParent",
          ].includes(modelForBackup)
        ) {

          modelName = "Student";

        }

        // ============================================
        // RECORD ID
        // ============================================

        let refId =
          resultForBackup?.id ||
          resultForBackup?.studentId ||
          beforeDataForBackup?.id ||
          beforeDataForBackup?.studentId ||
          argsForBackup?.where?.id ||
          "unknown";

        if (
          [
            "StudentPersonalInfo",
            "StudentEnrollment",
            "StudentDocumentInfo",
            "StudentParent",
          ].includes(modelForBackup)
        ) {

          refId =
            resultForBackup?.studentId ||
            beforeDataForBackup?.studentId;

        }

        // ============================================
        // ENSURE SCHOOL ID
        // ============================================

        if (
          fullData &&
          !fullData.schoolId &&
          resultForBackup?.schoolId
        ) {

          fullData.schoolId =
            resultForBackup.schoolId;

        }

        // ============================================
        // SOFT DELETE DETECTION
        // ============================================

        const isSoftDelete =
          actionForBackup === "update" &&
          (
            argsForBackup?.data?.deletedAt ||
            argsForBackup?.data?.isDeleted === true ||
            argsForBackup?.data?.isArchived === true
          );

        // ============================================
        // RESTORE DETECTION
        // ============================================

        const isRestore =
          actionForBackup === "update" &&
          (
            argsForBackup?.data?.deletedAt === null ||
            argsForBackup?.data?.isDeleted === false ||
            argsForBackup?.data?.isArchived === false
          );

        // ============================================
        // SAVE CLOUD BACKUP
        // ============================================

        if (fullData) {

          await saveSchoolBackup({

            schoolId:
              fullData?.schoolId ||
              resultForBackup?.schoolId,

            module: modelName,

            recordId: refId,

            action:
              isRestore
                ? "restore"
                : isSoftDelete
                ? "softDelete"
                : actionForBackup,

            data: fullData,

          });

        }

      } catch (err) {

        console.error(
          "Backup middleware error:",
          err.message
        );

      }

    })();

  }

  return result;

});