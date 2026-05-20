 
import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";

import {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  getSchoolUsage,
} from "../controllers/school.controller.js";

const router = express.Router();

// Usage stats
router.get(
  "/usage",
  authMiddleware,
  getSchoolUsage
);

// Create
router.post(
  "/",
  authMiddleware,
  createSchool
);

// Get all
router.get(
  "/",
  authMiddleware,
  getAllSchools
);

// Get single
router.get(
  "/:id",
  authMiddleware,
  getSchoolById
);

// Update
router.put(
  "/:id",
  authMiddleware,
  updateSchool
);

// Activate / Deactivate
router.patch(
  "/:id",
  authMiddleware,
  updateSchool
);

export default router;
 