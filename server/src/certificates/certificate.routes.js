// server/src/certificates/certificate.routes.js
import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getCertificateTypes,
  getStudentsForCertificates,
  getStudentInfo,
  generateCertificate,
  getCertificateHistory,
  getCertificate,
  downloadCertificate,
  printCertificate,
  regenerateCertificate,
  deleteCertificate,
  getSchoolSettings,
  updateSchoolSettings,
} from "./certificate.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

router.use(authMiddleware);

/* ── Static routes first (before /:id) ──────────────────────────────────── */
router.get("/types", getCertificateTypes);
router.get("/students", getStudentsForCertificates);
router.get("/student/:id", getStudentInfo);
router.post("/generate", generateCertificate);
router.get("/history", getCertificateHistory);
router.get("/download/:id", downloadCertificate);
router.get("/print/:id", printCertificate);

router.get("/school-settings", getSchoolSettings);
router.put(
  "/school-settings",
  upload.fields([
    { name: "principalSignature", maxCount: 1 },
    { name: "schoolSeal", maxCount: 1 },
  ]),
  updateSchoolSettings,
);

/* ── Param routes last ──────────────────────────────────────────────────── */
router.get("/:id", getCertificate);
router.post("/:id/regenerate", regenerateCertificate);
router.delete("/:id", deleteCertificate);

export default router;