import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  uploadMiddleware,
  getQuestions,
  upsertQuestions,
  deleteQuestion,
  getSubmissions,
  gradeSubmission,
  getAssignmentForStudent,
  submitAssignment,
} from "../staffControlls/assignmentQuestionController.js";

const router = Router();
router.use(authMiddleware);

// ── Teacher routes ──────────────────────────────────────────────
router.get("/:assignmentId/questions",               getQuestions);
router.put("/:assignmentId/questions",               upsertQuestions);   // full replace
router.delete("/:assignmentId/questions/:questionId", deleteQuestion);
router.get("/:assignmentId/submissions",             getSubmissions);
router.patch(
  "/:assignmentId/submissions/:submissionId/grade",
  gradeSubmission,
);

// ── Student routes ──────────────────────────────────────────────
// (use a separate student auth middleware in your app if needed)
router.get("/:assignmentId/student",                 getAssignmentForStudent);
router.post(
  "/:assignmentId/submit",
  uploadMiddleware.any(),   // files fieldname = questionId
  submitAssignment,
);

export default router;

// ── Register in your main router ─────────────────────────────
// import questionRoute from "./staffRoutes/assignmentQuestionRoute.js";
// app.use("/api/assignments", questionRoute);