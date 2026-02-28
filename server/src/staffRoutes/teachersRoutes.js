// server/src/staffRoutes/teachersRoutes.js
import express from "express";
import multer from "multer"; // ← add this
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  addAssignment,
  removeAssignment,
  uploadProfileImage, // ← new
  getProfileImage, // ← new
} from "../staffControlls/teacherController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // ← add this

// ✅ authMiddleware on ALL routes so req.user.schoolId is always available
router.get("/", authMiddleware, getTeachers);
router.get("/:id", authMiddleware, getTeacherById);
router.post("/", authMiddleware, createTeacher);
router.patch("/:id", authMiddleware, updateTeacher);
router.delete("/:id", authMiddleware, deleteTeacher);
router.post("/:id/assignments", authMiddleware, addAssignment);
router.delete("/:id/assignments/:aId", authMiddleware, removeAssignment);

// ── Profile image ──────────────────────────────────────────────
router.post(
  "/:id/profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadProfileImage,
);
router.get("/:id/profile-image", authMiddleware, getProfileImage);

export default router;
