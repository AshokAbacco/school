// server/src/student/routes/assignmentDraftRoute.js
// Mount in student.js:
//   import assignmentDraftRoute from "./student/routes/assignmentDraftRoute.js";
//   student.use("/api/assignments", assignmentDraftRoute);

import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  saveDraft,
  getDraft,
  startAssignment,
} from "../controllers/assignmentDraftController.js";

const router = Router();
router.use(requireAuth);

// Called when student first opens assignment — records startedAt, returns existing draft
router.post("/:id/start",      startAssignment);

// Upsert partial answers (called on every answer change)
router.put("/:id/draft",       saveDraft);

// Return existing draft (used on reload)
router.get("/:id/draft",       getDraft);

export default router;