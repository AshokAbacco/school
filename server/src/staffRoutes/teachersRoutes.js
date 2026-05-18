// server/src/staffRoutes/teachersRoutes.js

import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";

import {
  getTeachers,
  getTeacherById,
  getMyTeacherProfile,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  addAssignment,
  removeAssignment,
  uploadProfileImage,
  getProfileImage,
  uploadTeacherDocument,
  getTeacherDocumentUrl,
  bulkImportTeachers,
  getTeacherLimitStatus,
} from "../staffControlls/teacherController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

/* =========================================================
   STATIC ROUTES FIRST
   ========================================================= */

// Live teacher limit status (used / max per plan)
router.get(
  "/limit-status",
  authMiddleware,
  getTeacherLimitStatus
);

// Bulk Import
router.post(
  "/bulk-import",
  authMiddleware,
  bulkImportTeachers
);

// Logged-in Teacher Own Profile
router.get(
  "/me",
  authMiddleware,
  getMyTeacherProfile
);

// Teachers List
router.get(
  "/",
  authMiddleware,
  getTeachers
);

// Create Teacher
router.post(
  "/",
  authMiddleware,
  createTeacher
);

/* =========================================================
   DYNAMIC ROUTES AFTER STATIC
   ========================================================= */

// Get Teacher By ID
router.get(
  "/:id",
  authMiddleware,
  getTeacherById
);

// Update Teacher
router.patch(
  "/:id",
  authMiddleware,
  updateTeacher
);

// Delete Teacher
router.delete(
  "/:id",
  authMiddleware,
  deleteTeacher
);

/* =========================================================
   ASSIGNMENTS
   ========================================================= */

// Add Assignment
router.post(
  "/:id/assignments",
  authMiddleware,
  addAssignment
);

// Remove Assignment
router.delete(
  "/:id/assignments/:aId",
  authMiddleware,
  removeAssignment
);

/* =========================================================
   PROFILE IMAGE
   ========================================================= */

// Upload Profile Image
router.post(
  "/:id/profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadProfileImage
);

// Get Profile Image
router.get(
  "/:id/profile-image",
  authMiddleware,
  getProfileImage
);

/* =========================================================
   DOCUMENTS
   ========================================================= */

// Upload Teacher Document
router.post(
  "/:id/documents",
  authMiddleware,
  upload.single("file"),
  uploadTeacherDocument
);

// View Teacher Document
router.get(
  "/:id/documents/:docId/view",
  authMiddleware,
  getTeacherDocumentUrl
);

export default router;