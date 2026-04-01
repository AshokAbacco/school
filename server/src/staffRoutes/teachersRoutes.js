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
  uploadTeacherDocument,
  getTeacherDocumentUrl,
  bulkImportTeachers,   // ← ADD THIS IMPORT
} from "../staffControlls/teacherController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── IMPORTANT: Static routes MUST come before /:id ────────────────────────────
// If bulk-import is placed after router.get("/:id"), Express will treat
// "bulk-import" as an :id value and call getTeacherById instead.

router.post("/bulk-import", authMiddleware, bulkImportTeachers); // ← BEFORE /:id

// ── List & Create ─────────────────────────────────────────────────────────────
router.get("/", authMiddleware, getTeachers);
router.post("/", authMiddleware, createTeacher);

// ── Single teacher (dynamic :id — must come AFTER static routes) ──────────────
router.get("/:id", authMiddleware, getTeacherById);
router.patch("/:id", authMiddleware, updateTeacher);
router.delete("/:id", authMiddleware, deleteTeacher);

// ── Assignments ───────────────────────────────────────────────────────────────
router.post("/:id/assignments", authMiddleware, addAssignment);
router.delete("/:id/assignments/:aId", authMiddleware, removeAssignment);

// ── Profile image ─────────────────────────────────────────────────────────────
router.post(
  "/:id/profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadProfileImage,
);
router.get("/:id/profile-image", authMiddleware, getProfileImage);

// ── Documents ─────────────────────────────────────────────────────────────────
router.post(
  "/:id/documents",
  authMiddleware,
  upload.single("file"),
  uploadTeacherDocument,
);
router.get("/:id/documents/:docId/view", authMiddleware, getTeacherDocumentUrl);

export default router;