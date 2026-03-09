// server/src/staffRoutes/adminAttendanceRoute.js
import express from "express";
import {
  getAttendance,
  getAttendanceSummary,
} from "../staffControlls/adminAttendanceController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ /summary MUST be before "/" to avoid Express treating "summary" as a param
router.get("/summary", authMiddleware, getAttendanceSummary);
router.get("/", authMiddleware, getAttendance);

export default router;
