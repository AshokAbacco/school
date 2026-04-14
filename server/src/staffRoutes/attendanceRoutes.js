import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";

import {
  getTeacherClasses,
  getClassStudentsForAttendance,
  markAttendance,
  exportAttendanceExcel,
} from "../staffControlls/attendance.controller.js";

const router = express.Router();

/* ─────────────────────────────────────────────
   Teacher Attendance Routes
───────────────────────────────────────────── */

// Get teacher assigned classes
router.get("/teacher/classes", authMiddleware, getTeacherClasses);

// Get students for marking attendance
router.get(
  "/teacher/class-students",
  authMiddleware,
  getClassStudentsForAttendance,
);

// Mark attendance (bulk)
router.post("/teacher/mark", authMiddleware, markAttendance);
router.get("/export/excel", authMiddleware, exportAttendanceExcel);
export default router;
