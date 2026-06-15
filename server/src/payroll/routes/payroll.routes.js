// server/src/payroll/routes/payroll.routes.js
// ═══════════════════════════════════════════════════════════════════════════════
// PAYROLL ROUTES
// Mount at: /api/payroll  (in staff.js)
// ═══════════════════════════════════════════════════════════════════════════════

import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";

import { getAttendanceConfig, upsertAttendanceConfig } from "../controllers/attendanceConfig.controller.js";
import {
  getAttendanceCorrections,
  applyCorrection,
  getCorrectionHistory,
  triggerAttendanceProcessing,
  reprocessSingle,
  markSchoolHoliday,
  getCronStatus,
} from "../controllers/attendanceCorrections.controller.js";
import {
  getPayrollList,
  generatePayroll,
  lockPayrollRecord,
  getAttendanceBreakdown,
  getPayrollCorrectionHistory,
  exportPayroll,
} from "../controllers/payroll.controller.js";
import {
  checkMissingPunch,
  getMissingPunches,
} from "../controllers/missingPunchNotification.controller.js";

const router = express.Router();

// ── All routes require authentication ────────────────────────────────────────
router.use(authMiddleware);

// ── Attendance Config (School Admin) ─────────────────────────────────────────
router.get  ("/config/:schoolId",  getAttendanceConfig);
router.put  ("/config/:schoolId",  upsertAttendanceConfig);

// ── Attendance Processing (Super Admin / cron) ────────────────────────────────
router.post ("/process-attendance", triggerAttendanceProcessing);
router.post ("/corrections/reprocess-single", reprocessSingle);
router.post ("/corrections/mark-school-holiday", markSchoolHoliday);
router.get  ("/cron-status", getCronStatus);

// ── Attendance Corrections (Super Admin) ─────────────────────────────────────
router.get  ("/corrections",         getAttendanceCorrections);
router.patch("/corrections/:id",     applyCorrection);
router.get  ("/corrections/:id/history", getCorrectionHistory);

// ── Missing Punch ─────────────────────────────────────────────────────────────
router.get  ("/missing-punch-check", checkMissingPunch);   // Teacher dashboard
router.get  ("/missing-punches",     getMissingPunches);   // Super Admin list

// ── Payroll ───────────────────────────────────────────────────────────────────
router.get  ("/",                          getPayrollList);
router.post ("/generate",                  generatePayroll);
router.post ("/:id/lock",                  lockPayrollRecord);
router.get  ("/:id/attendance-breakdown",  getAttendanceBreakdown);
router.get  ("/:id/correction-history",    getPayrollCorrectionHistory);
router.get  ("/export",                    exportPayroll);

export default router;

// ─────────────────────────────────────────────────────────────────────────────
// ADD TO server/src/staff.js:
//
// import payrollRoutes from "./payroll/routes/payroll.routes.js";
// staff.use("/api/payroll", payrollRoutes);
// ─────────────────────────────────────────────────────────────────────────────