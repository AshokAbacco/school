// server/src/student/routes/profile.routes.js

import { Router } from "express";
import { getMyProfile, getMyDocuments } from "../controllers/profile.controller.js";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

// All routes require a valid student JWT
router.use(authMiddleware);

/**
 * GET /profile/me
 * Returns full student profile: personal info, enrollment, parents, signed profile image URL
 */
router.get("/me", getMyProfile);

/**
 * GET /profile/documents
 * Returns student's uploaded documents with 1-hour signed R2 download URLs
 */
router.get("/documents", getMyDocuments);

export default router;