// server/src/parent/routes/reEvaluationRoutes.js
import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js"; // ✅ swap
import {
  getReEvaluationSubjects,
  createReEvaluationRequest,
  getMyReEvaluationRequests,
} from "../controllers/reEvaluationController.js";

const router = express.Router();
router.use(requireAuth); // ✅ was: authMiddleware

router.get("/subjects", getReEvaluationSubjects);
router.post("/request", createReEvaluationRequest);
router.get("/my-requests", getMyReEvaluationRequests);

export default router;