// server/src/modules/auth/auth.routes.js
import { Router } from "express";
import {
  registerSuperAdmin,
  loginSuperAdmin,
  loginStaff,
  loginStudent,
  loginParent,
  loginFinance,
} from "./auth.controller.js";
import { authLimiter } from "../../middlewares/rateLimiter.js";


const router = Router();

// ── Super Admin ────────────────────────────────────────────────
// POST /api/auth/super-admin/register  ← NEW (register university + super admin)
// ── Super Admin ────────────────────────────────────────────────
router.post("/super-admin/register", registerSuperAdmin);

// 🔐 Apply limiter
router.post("/super-admin/login", authLimiter, loginSuperAdmin);

// ── Staff ──────────────────────────────────────────────────────
router.post("/staff/login", authLimiter, loginStaff);

// ── Student ────────────────────────────────────────────────────
router.post("/student/login", authLimiter, loginStudent);

// ── Parent ─────────────────────────────────────────────────────
router.post("/parent/login", authLimiter, loginParent);

// ── Finance ────────────────────────────────────────────────────
router.post("/finance/login", authLimiter, loginFinance);

router.post(
  "/login",
  authLimiter,
  (req, res) => {
    res.json({
      message: `Login API`,
      remainingAttempts: req.rateLimit?.remaining,
    });
  }
);

export default router;
