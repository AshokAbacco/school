// server/src/staffRoutes/teachersRoutes.js
import express from "express";
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  addAssignment,
  removeAssignment,
} from "../staffControlls/teacherController.js";//server\src\staffControlls\teacherController.js

const router = express.Router();

router.get("/", getTeachers);
router.get("/:id", getTeacherById);
router.post("/", createTeacher);
router.patch("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);
router.post("/:id/assignments", addAssignment);
router.delete("/:id/assignments/:aId", removeAssignment);

export default router;
