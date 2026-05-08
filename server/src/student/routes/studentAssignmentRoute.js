// server/src/student/routes/studentAssignmentRoute.js

import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getStudentAssignments, getSingleAssignmentForStudent  } from "../controllers/studentAssignmentController.js";

const router = Router();
router.use(requireAuth);

router.get("/", getStudentAssignments);
router.get("/:id/student", getSingleAssignmentForStudent);

export default router;