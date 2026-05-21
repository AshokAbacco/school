import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getDeletedRecords,
  restoreRecord,
  getSchoolsBackups,
  restoreSchoolBackup,
  getSchoolBackupDetails,
} from "./backup.controller.js";
import {
  createFullSchoolBackup,
} from "./backup.service.js";
const router = express.Router();
import { prisma } from "../../config/db.js";
// ADMIN



router.get(
  "/deleted",
  requireAuth,
  getDeletedRecords
);

router.post(
  "/restore/:model/:recordId",
  requireAuth,
  restoreRecord
);

// SUPER ADMIN
router.get(
  "/schools",
  requireAuth,
  getSchoolsBackups
);

router.post(
  "/schools/:schoolId/restore",
  requireAuth,
  restoreSchoolBackup
);
router.post(
  "/schools/:schoolId/create-backup",
  requireAuth,
  async (req, res) => {

    try {

      const result =
        await createFullSchoolBackup(
          req.params.schoolId
        );

      res.json({
        success: true,
        ...result,
      });

    } catch (err) {

      res.status(500).json({
        success: false,
        message: err.message,
      });

    }

  }
);
router.get(
  "/test-create-backups",
  async (req, res) => {

    try {

      const schools =
        await prisma.school.findMany({
          select: {
            id: true,
          },
        });

      for (const school of schools) {

        await createFullSchoolBackup(
          school.id
        );

      }

      res.json({
        success: true,
        message:
          "All school backups created",
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });

    }

  }
);
router.get(
  "/schools/:schoolId/details",
  requireAuth,
  getSchoolBackupDetails
);
export default router;