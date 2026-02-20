// server/src/modules/finance/finance.routes.js

import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";
import {
  getFinanceDashboard,
  createFee,
  getAllFees,
  collectPayment,
} from "./finance.controller.js";

const router = Router();

/*
============================================================
FINANCE ROUTES
Access: FINANCE role only
============================================================
*/

// Finance Dashboard
router.get(
  "/dashboard",
  authMiddleware,
  authorizeRoles("FINANCE"),
  getFinanceDashboard
);

// Create Fee Structure
router.post(
  "/fees",
  authMiddleware,
  authorizeRoles("FINANCE"),
  createFee
);

// Get All Fees
router.get(
  "/fees",
  authMiddleware,
  authorizeRoles("FINANCE"),
  getAllFees
);

// Collect Student Payment
router.post(
  "/payments",
  authMiddleware,
  authorizeRoles("FINANCE"),
  collectPayment
);

export default router;
