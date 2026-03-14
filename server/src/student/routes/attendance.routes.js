// server/src/student/routes/attendance.routes.js

import { Router } from "express";
import { getAttendance } from "../controllers/attendance.controller.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
const router = Router();

// All routes require a valid student JWT / session.
router.use(authMiddleware);

/**
 * GET /student/attendance
 *
 * Query params:
 *   year  – e.g. 2026        (optional, defaults to current year)
 *   month – e.g. 2  (1-based) (optional, defaults to current month)
 *
 * Response shape  →  see attendance.controller.js (section 8)
 */
router.get("/", getAttendance);

export default router;