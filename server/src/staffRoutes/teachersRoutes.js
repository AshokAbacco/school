// server/src/staffRoutes/teachersRoutes.js
import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  addAssignment,
  removeAssignment,
  uploadProfileImage,
  getProfileImage,
  uploadTeacherDocument, // ← NEW
  getTeacherDocumentUrl,
} from "../staffControlls/teacherController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// ── Documents ─────────────────────────────────────────────────
router.post(
  "/:id/documents",
  authMiddleware,
  upload.single("file"),
  uploadTeacherDocument,
);
router.get("/:id/documents/:docId/view", authMiddleware, getTeacherDocumentUrl);
export default router;
