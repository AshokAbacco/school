// server/src/modules/auth/auth.routes.js
import { Router } from "express";
import {
  registerSuperAdmin,
  loginSuperAdmin,
  loginStaff,
  loginStudent,
  loginParent,
} from "./auth.controller.js";

const router = Router();

// ── Super Admin ────────────────────────────────────────────────
// POST /api/auth/super-admin/register  ← NEW (register university + super admin)
router.post("/super-admin/register", registerSuperAdmin);
// POST /api/auth/super-admin/login
router.post("/super-admin/login", loginSuperAdmin);

// ── Staff (Admin / Teacher) ────────────────────────────────────
// POST /api/auth/staff/login
router.post("/staff/login", loginStaff);

// ── Student ────────────────────────────────────────────────────
// POST /api/auth/student/login
router.post("/student/login", loginStudent);

// ── Parent ─────────────────────────────────────────────────────
// POST /api/auth/parent/login
router.post("/parent/login", loginParent);

export default router;
