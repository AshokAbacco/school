// server/src/staffRoutes/teacherCertificateRoutes.js
//
// Mount in staff.js:
//   import teacherCertificateRoutes from "./staffRoutes/teacherCertificateRoutes.js";
//   staff.use("/api/teacher/certificates", teacherCertificateRoutes);

import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  listCertificates,
  searchStudents,
  uploadCertificate,
  deleteCertificate,
  upload,
} from "../staffControlls/teacherCertificateController.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ── Search students (for dropdown in upload form) ─────────────────
// GET /api/teacher/certificates/students?search=john
router.get("/students", searchStudents);

// ── List all uploaded certificates for this school ────────────────
// GET /api/teacher/certificates
router.get("/", listCertificates);

// ── Upload a certificate (multipart/form-data) ────────────────────
// POST /api/teacher/certificates/upload
// Body fields: studentId, title, category, issuedDate, description
// File field:  file (PDF / JPG / PNG / WebP, max 10MB)
router.post(
  "/upload",
  upload.single("file"),
  uploadCertificate
);

// ── Delete a certificate ──────────────────────────────────────────
// DELETE /api/teacher/certificates/:id
router.delete("/:id", deleteCertificate);

export default router;