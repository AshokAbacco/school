import express from "express";

import {
  createFinanceProfile,
  getFinanceProfiles,
  getFinanceProfile,
  updateFinanceProfile,
} from "../controllers/financeProfile.controller.js";

import authMiddleware from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * CREATE
 */
router.post(
  "/",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  createFinanceProfile
);

/**
 * GET ALL
 */
router.get(
  "/",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getFinanceProfiles
);

/**
 * GET SINGLE
 */
router.get(
  "/:id",
  authMiddleware,
  getFinanceProfile
);

/**
 * UPDATE
 */
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  updateFinanceProfile
);

/**
 * ACTIVATE / DEACTIVATE
 */
router.patch(
  "/:id",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  updateFinanceProfile
);

export default router;
