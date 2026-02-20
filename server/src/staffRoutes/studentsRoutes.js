// routes/studentRoutes.js
import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  registerStudent,
  savePersonalInfo,
  uploadDocumentsBulk,
  getStudent,
  listStudents,
  deleteStudent,
  viewStudentDocument,
  getMyStudent,
  getMyParentStudents, // ← NEW
  createParentLogin,
  getProfileImage,
} from "../staffControlls/StudentsControlls.js";

const router = express.Router();

/* ─────────────────────────────────────────────────────────────
   Multer Config
───────────────────────────────────────────────────────────── */

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

// ── Routes ─────────────────────────────────────────────────────────────────

// ⚠️  Static routes MUST come before /:id to avoid conflicts
router.get("/me", authMiddleware, getMyStudent);                        // Student self-profile
router.get("/my-students", authMiddleware, getMyParentStudents);        // Parent's linked students ← NEW

/* ─────────────────────────────────────────────────────────────
   Routes
───────────────────────────────────────────────────────────── */

// Register student (ADMIN / STAFF only)
router.post("/register", authMiddleware, registerStudent);

// Create parent login for student
router.post("/:id/parent-login", authMiddleware, createParentLogin);

// Save or update personal info
router.post(
  "/:id/personal-info",
  authMiddleware,
  upload.single("profileImage"),
  savePersonalInfo,
);

// Upload bulk documents
router.post(
  "/:id/documents/bulk",
  authMiddleware,
  upload.array("files", 20),
  uploadDocumentsBulk,
);

// List students (with filters)
router.get("/", authMiddleware, listStudents);

// Get single student
router.get("/:id", authMiddleware, getStudent);

// View signed document URL
router.get("/documents/:documentId/view", authMiddleware, viewStudentDocument);
router.get("/:id/profile-image", authMiddleware, getProfileImage);

// Delete student
router.delete("/:id", authMiddleware, deleteStudent);

export default router;