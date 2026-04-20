// server/src/student/routes/homework.routes.js

import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { getHomework, getHomeworkById } from "../controllers/homework.controller.js";

const router = Router();

// All homework routes require a logged-in student (JWT)
router.use(authMiddleware);

// GET /api/student/homework          → list all published assignments for the student's class
router.get("/",      getHomework);

// GET /api/student/homework/:id      → single assignment detail
router.get("/:id",   getHomeworkById);

export default router;