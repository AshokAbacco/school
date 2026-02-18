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
} from "../staffControlls/StudentsControlls.js";

const router = express.Router();

// ── Multer config ──────────────────────────────────────────────────────────
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
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
router.post("/register", registerStudent);

router.post(
  "/:id/personal-info",
  authMiddleware,
  upload.single("profileImage"),
  savePersonalInfo,
);

router.post(
  "/:id/documents/bulk",
  authMiddleware,
  upload.array("files", 20),
  uploadDocumentsBulk,
);

router.get("/", authMiddleware, listStudents);

router.get("/:id", authMiddleware, getStudent);
router.get("/documents/:documentId/view", authMiddleware, viewStudentDocument);

router.delete("/:id", authMiddleware, deleteStudent);

export default router;
