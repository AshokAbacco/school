// server/src/staffRoutes/staffRoutes.js
import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  deleteStaffProfileImage,
} from "../staffControlls/staffController.js";

const router = express.Router();

/* ── Profile photo upload: memory only, never written to server disk ── */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "profileImage"));
  },
});

// Wrap multer so its errors come back as clean 400 JSON instead of a 500.
// JSON (non-multipart) requests pass straight through untouched, so
// Bulk Import and any other JSON callers keep working exactly as before.
const photoUpload = (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ error: "Profile photo must be 5 MB or smaller" });
      return res.status(400).json({ error: "Profile photo must be a JPG, PNG or WEBP image" });
    }
    return next(err);
  });
};

router.get("/",     authMiddleware, getStaff);
router.get("/:id",  authMiddleware, getStaffById);
router.post("/",    authMiddleware, photoUpload, createStaff);
router.patch("/:id", authMiddleware, photoUpload, updateStaff);
router.delete("/:id/profile-image", authMiddleware, deleteStaffProfileImage);
router.delete("/:id", authMiddleware, deleteStaff);

export default router;