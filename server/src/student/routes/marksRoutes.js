// server/src/student/routes/marksRoutes.js
// ═══════════════════════════════════════════════════════════════
//  Student Marks & Report Card Routes
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import {
  getExamGroups,
  getReportCard,
  getTermSummary,
} from "../controllers/marksController.js";

const router = Router();
router.use(authMiddleware);
// All routes below require the student auth middleware (req.student set by parent router)

// GET /marks/exam-groups
// List all published exam groups available for the current enrollment
router.get("/exam-groups", getExamGroups);

// GET /marks/report/:assessmentGroupId
// Full report card for a specific exam group
router.get("/report/:assessmentGroupId", getReportCard);

// GET /marks/term-summary/:termId
// Aggregated weighted result across all exam groups in a term
router.get("/term-summary/:termId", getTermSummary);

export default router;