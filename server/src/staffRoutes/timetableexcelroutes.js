// server/src/routes/timetableExcelRoutes.js

import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  downloadAllTimetableTemplate,
  downloadSingleTimetableTemplate,
  uploadAllTimetableTemplate,
  uploadSingleTimetableTemplate,
} from "../staffControlls/Timetableexcelcontroller.js";

const router = express.Router();

// multer: store file in memory as a Buffer (req.file.buffer)
// This matches what the controller expects: XLSX.read(req.file.buffer, { type: "buffer" })
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx / .xls files are allowed"));
    }
  },
});

// ── Download routes (GET — no file upload) ────────────────────────────────
router.get(
  "/download-all",
  authMiddleware,
  downloadAllTimetableTemplate
);

router.get(
  "/download-single/:classSectionId",
  authMiddleware,
  downloadSingleTimetableTemplate
);

// ── Upload routes (POST — multipart/form-data with "file" field) ──────────
router.post(
  "/upload-all",
  authMiddleware,
  upload.single("file"),   // field name must match FormData.append("file", ...)
  uploadAllTimetableTemplate
);

router.post(
  "/upload-single/:classSectionId",
  authMiddleware,
  upload.single("file"),   // field name must match FormData.append("file", ...)
  uploadSingleTimetableTemplate
);

// ── Multer error handler ──────────────────────────────────────────────────
// Catches multer-specific errors (wrong file type, size limit) and returns
// proper JSON instead of letting Express return its default HTML error.
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes("Only .xlsx")) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

export default router;