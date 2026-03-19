// server/src/parent/routes/timetableRoutes.js
// ═══════════════════════════════════════════════════════════════
//  Parent Timetable Routes
//  Requires: authMiddleware (sets req.user)
//            ?studentId=<uuid> query param on every request
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { getTimetable } from "../controllers/Timetablecontroller.js";

const router = Router();
router.use(authMiddleware);

// GET /api/parent/timetable?studentId=<uuid>
router.get("/", getTimetable);

export default router;