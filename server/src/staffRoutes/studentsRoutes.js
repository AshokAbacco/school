// studentRoutes.js
// Mount at:  app.use("/api/students", studentRoutes)

import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js"; // your existing JWT guard

import {
  // Auth
  registerStudent,
  loginStudent,

  // Students
  getAllStudents,
  getStudentById,
  deleteStudent,

  // Personal Info
  createPersonalInfo,
  updatePersonalInfo,
  getPersonalInfo,

  // Documents
  uploadDocument,
  uploadDocumentsBulk,
  getDocuments,
  getSignedDocumentUrl,
  verifyDocument,
  deleteDocument,
} from "../controllers/studentController.js";

const router = express.Router();

// ─── Multer (memory storage — buffer sent straight to Cloudflare R2) ──────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: JPG, PNG, PDF, DOC, DOCX"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
});

// ─── Multer error handler ─────────────────────────────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.startsWith("Unsupported")) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

// ═════════════════════════════════════════════════════════════════════════════
//  AUTH  (public)
// ═════════════════════════════════════════════════════════════════════════════

// POST   /api/students/register
router.post("/register", registerStudent);

// POST   /api/students/login
router.post("/login", loginStudent);

// ═════════════════════════════════════════════════════════════════════════════
//  STUDENTS  (protected)
// ═════════════════════════════════════════════════════════════════════════════

// GET    /api/students               — list with search/filter/pagination
// query params: search, grade, status, page, limit
router.get("/", protect, getAllStudents);

// GET    /api/students/:id           — full profile + documents
router.get("/:id", protect, getStudentById);

// DELETE /api/students/:id           — delete student + R2 files
router.delete("/:id", protect, deleteStudent);

// ═════════════════════════════════════════════════════════════════════════════
//  PERSONAL INFO  (protected)
// ═════════════════════════════════════════════════════════════════════════════

// GET    /api/students/:id/personal-info
router.get("/:id/personal-info", protect, getPersonalInfo);

// POST   /api/students/:id/personal-info   — create (first time)
// multipart/form-data  optional field: profileImage (image file)
router.post(
  "/:id/personal-info",
  protect,
  upload.single("profileImage"),
  handleMulterError,
  createPersonalInfo
);

// PUT    /api/students/:id/personal-info   — update
// multipart/form-data  optional field: profileImage (image file)
router.put(
  "/:id/personal-info",
  protect,
  upload.single("profileImage"),
  handleMulterError,
  updatePersonalInfo
);

// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENTS  (protected)
// ═════════════════════════════════════════════════════════════════════════════

// GET    /api/students/:id/documents         — all documents for a student
router.get("/:id/documents", protect, getDocuments);

// POST   /api/students/:id/documents         — single document upload
// multipart/form-data  fields: documentName, customLabel (if CUSTOM), file
router.post(
  "/:id/documents",
  protect,
  upload.single("file"),
  handleMulterError,
  uploadDocument
);

// POST   /api/students/:id/documents/bulk    — upload multiple docs at once
// multipart/form-data  fields: files[] (array), metadata (JSON string)
router.post(
  "/:id/documents/bulk",
  protect,
  upload.array("files", 10),   // max 10 files per request
  handleMulterError,
  uploadDocumentsBulk
);

// GET    /api/students/:id/documents/:docId/signed-url  — pre-signed R2 URL
router.get("/:id/documents/:docId/signed-url", protect, getSignedDocumentUrl);

// PATCH  /api/students/:id/documents/:docId/verify      — mark verified
router.patch("/:id/documents/:docId/verify", protect, verifyDocument);

// DELETE /api/students/:id/documents/:docId             — delete doc + R2 file
router.delete("/:id/documents/:docId", protect, deleteDocument);

export default router;