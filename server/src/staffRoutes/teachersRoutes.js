// server/src/staffRoutes/teachersRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  addAssignment,
  removeAssignment,
} from "../staffControlls/teacherController.js";

const router = express.Router();

// ✅ authMiddleware on ALL routes so req.user.schoolId is always available
router.get("/", authMiddleware, getTeachers);
router.get("/:id", authMiddleware, getTeacherById);
router.post("/", authMiddleware, createTeacher);
router.patch("/:id", authMiddleware, updateTeacher);
router.delete("/:id", authMiddleware, deleteTeacher);
router.post("/:id/assignments", authMiddleware, addAssignment);
router.delete("/:id/assignments/:aId", authMiddleware, removeAssignment);

export default router;
