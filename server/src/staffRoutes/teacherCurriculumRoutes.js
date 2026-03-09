// server/src/staffRoutes/teacherCurriculumRoutes.js

import express from "express";
import {
  getTeacherCurriculumAssignments,
  setSubjectSyllabus,
  updateSubjectSyllabus,
  updateSectionProgress,
} from "../staffControlls/teacherCurriculumController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
// use your existing auth middleware

const router = express.Router();

// All routes require teacher authentication
router.use(authMiddleware);

// GET  — fetch all assigned subjects + sections with syllabus & progress
router.get("/assignments", getTeacherCurriculumAssignments);

// POST — set total chapters for a subject+grade (first time)
router.post("/syllabus", setSubjectSyllabus);

// PUT  — edit total chapters
router.put("/syllabus", updateSubjectSyllabus);

// PUT  — update completed chapters for a section
router.put("/progress", updateSectionProgress);

export default router;
