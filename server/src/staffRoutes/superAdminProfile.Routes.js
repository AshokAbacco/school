import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMemory.js";

import {
  getProfile,
  updateProfile,
  changePassword,
  updateSchoolLogo,
  getSchoolLogo, // ✅ ADD THIS
} from "../staffControlls/superAdminProfile.controller.js";

const router = Router();

// 🔐 Auth middleware
router.use(authMiddleware);


// ─────────────────────────────────────────
// 👤 PROFILE
// ─────────────────────────────────────────

// Get profile
router.get("/", getProfile);

// Update profile
router.put("/", updateProfile);

// Change password
router.put("/change-password", changePassword);

// ─────────────────────────────────────────
// 🖼️ SCHOOL LOGO (PRIVATE R2)
// ─────────────────────────────────────────

// Upload logo
router.put(
  "/upload-logo",
  upload.single("logo"),
  updateSchoolLogo
);

// Get logo (signed URL)
router.get(
  "/logo",
  getSchoolLogo
);

export default router;