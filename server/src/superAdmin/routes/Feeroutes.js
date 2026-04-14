// server/src/staffRoutes/feeRoutes.js

import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

import {
  getFees,
  getFeeById,
  createFee,
  updateFee,
  deleteFee,
  getFeeStats,
  getClassesForFee,
  getAcademicYearsForFee,
} from "../controllers/Feecontroller.js";

const router = express.Router();

// ─────────────────────────────────────────────
// SUPPORT DATA
// ─────────────────────────────────────────────

// GET /api/fees/classes
router.get(
  "/classes",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getClassesForFee
);

// GET /api/fees/academic-years
router.get(
  "/academic-years",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getAcademicYearsForFee
);

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────

// GET /api/fees/stats
router.get(
  "/stats",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getFeeStats
);

// ─────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────

// GET /api/fees
router.get(
  "/",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getFees
);

// POST /api/fees
router.post(
  "/",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  createFee
);

// GET /api/fees/:id
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getFeeById
);

// PUT /api/fees/:id
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  updateFee
);

// DELETE /api/fees/:id
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  deleteFee
);

export default router;