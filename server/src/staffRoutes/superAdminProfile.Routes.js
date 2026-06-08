import { Router } from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMemory.js";

import {
  getProfile,
  updateProfile,
  changePassword,
  updateSchoolLogo,
  getSchoolLogo,
} from "../staffControlls/superAdminProfile.controller.js";

const router = Router();

router.use(authMiddleware);

// Profile
router.get("/", getProfile);
router.put("/", updateProfile);
router.put("/change-password", changePassword);

// Logo Upload
router.put("/upload-logo", (req, res, next) => {
  upload.single("logo")(req, res, (err) => {
    if (err) {
      console.error("UPLOAD ERROR:", err);

      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          message: err.message,
          code: err.code,
        });
      }

      return res.status(400).json({
        message: err.message || "Upload failed",
      });
    }

    next();
  });
}, updateSchoolLogo);

router.get("/logo", getSchoolLogo);

export default router;


// import { Router } from "express";
// import authMiddleware from "../middlewares/authMiddleware.js";
// import { upload } from "../middlewares/uploadMemory.js";

// import {
//   getProfile,
//   updateProfile,
//   changePassword,
//   updateSchoolLogo,
//   getSchoolLogo, // ✅ ADD THIS
// } from "../staffControlls/superAdminProfile.controller.js";

// const router = Router();

// // 🔐 Auth middleware
// router.use(authMiddleware);


// // ─────────────────────────────────────────
// // 👤 PROFILE
// // ─────────────────────────────────────────

// // Get profile
// router.get("/", getProfile);

// // Update profile
// router.put("/", updateProfile);

// // Change password
// router.put("/change-password", changePassword);

// // ─────────────────────────────────────────
// // 🖼️ SCHOOL LOGO (PRIVATE R2)
// // ─────────────────────────────────────────

// // Upload logo
// router.put(
//   "/upload-logo",
//   upload.single("logo"),
//   updateSchoolLogo
// );

// // Get logo (signed URL)
// router.get(
//   "/logo",
//   getSchoolLogo
// );

// export default router;
