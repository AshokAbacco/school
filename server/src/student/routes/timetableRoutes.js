// server/src/student/routes/timetableRoutes.js
// ═══════════════════════════════════════════════════════════════
//  Student Timetable Routes
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { getTimetable, getTodayTimetable } from "../controllers/timetableController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();
router.use(authMiddleware);

// GET /timetable         — full weekly timetable
router.get("/", getTimetable);

// GET /timetable/today   — only today's periods (dashboard widget)
router.get("/today", getTodayTimetable);

export default router;