// src/voiceAnnouncements/voice.routes.js

import express from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { ALLOWED_AUDIO_MIME_TYPES } from "./utils/uploadVoiceToR2.js";
import {
  uploadVoice,
  createAnnouncement,
  getAnnouncements,
  getParentAnnouncements,
  markAsListened,
} from "./voice.controller.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Multer config — memoryStorage so the buffer can be streamed straight to R2
// without ever touching local disk.
// ─────────────────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB cap per audio file
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_AUDIO_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Unsupported audio type "${file.mimetype}". Allowed: ${ALLOWED_AUDIO_MIME_TYPES.join(", ")}`));
    }
    cb(null, true);
  },
});

// ── All voice-announcement routes require a valid JWT ────────────────────────
router.use(requireAuth);

// ── Admin / Super Admin ───────────────────────────────────────────────────────
router.post("/upload", upload.single("audio"), uploadVoice);
router.post("/announcement", createAnnouncement);
router.get("/announcements", getAnnouncements); // ?schoolId=&page=&limit=

// ── Parent portal ─────────────────────────────────────────────────────────────
router.get("/parent/announcements", getParentAnnouncements);
router.post("/:announcementId/listen", markAsListened);

// ── Multer error normalization (keeps response shape consistent) ────────────
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || err?.message?.startsWith("Unsupported audio type")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

export default router;