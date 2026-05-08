//server\src\staffRoutes\tutorialRoutes.js
import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";

import {
  getTutorialTeachers,
  getTutorialTeacherById,
  createTutorialTeacher,
  updateTutorialTeacher,
  deleteTutorialTeacher,
  getTeacherDropdown,
  getSubjects,
  getGrades,
} from "../staffControlls/tutorialController.js";

const router = Router();

// 🔐 Apply auth
router.use(authMiddleware);

// ── DROPDOWNS ──
router.get("/teachers/dropdown", getTeacherDropdown);
router.get("/subjects/dropdown", getSubjects);
router.get("/grades/dropdown", getGrades);

// ── CRUD ──
router.get("/", getTutorialTeachers);
router.get("/:id", getTutorialTeacherById);
router.post("/", createTutorialTeacher);
router.put("/:id", updateTutorialTeacher);
router.delete("/:id", deleteTutorialTeacher);

export default router;