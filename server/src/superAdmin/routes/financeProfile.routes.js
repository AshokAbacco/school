import express from "express";
import {
  createFinanceProfile,
  getFinanceProfiles,
  getFinanceProfile,
  updateFinanceProfile,
  deleteFinanceProfile
} from "../controllers/financeProfile.controller.js";

import authMiddleware from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * Only SUPER_ADMIN and ADMIN can create
 */
router.post(
  "/",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  createFinanceProfile
);

/**
 * Get all
 */
router.get(
  "/",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getFinanceProfiles
);

/**
 * Get single
 */
router.get(
  "/:id",
  authMiddleware,
  getFinanceProfile
);

/**
 * Update
 */
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  updateFinanceProfile
);

/**
 * Delete
 */
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN"),
  deleteFinanceProfile
);

export default router;