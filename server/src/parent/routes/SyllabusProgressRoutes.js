import express from "express";
import { getSyllabusProgress } from "../controllers/SyllabusProgressController.js";
import authMiddleware from "../../middlewares/authMiddleware.js"; // adjust path if needed

const router = express.Router();

// GET /parent/syllabus-progress
router.get("/", authMiddleware, getSyllabusProgress);

export default router;