// server\src\busHead\busHead.routes.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import {
  createBusHead,
  listBusHeads,
  setBusHeadStatus,
  sendBusHeadLoginOtp,
  verifyBusHeadLoginOtp,
  getBusHeadLiveVehicles,
} from "./busHead.controller.js";

// ── Local role guards (adjust if you already have shared role middleware) ──
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "SUPER_ADMIN" && req.user?.userType !== "superAdmin") {
    return res.status(403).json({ success: false, message: "Super Admin access required" });
  }
  next();
};

const requireBusHead = (req, res, next) => {
  if (req.user?.userType !== "busHead") {
    return res.status(403).json({ success: false, message: "Bus Head access required" });
  }
  next();
};

const router = Router();

// ═══════════════════ SuperAdmin — manage Bus Heads ═══════════════════════
// Mounted at /api/bus-heads
router.post("/", requireAuth, requireSuperAdmin, createBusHead);
router.get("/", requireAuth, requireSuperAdmin, listBusHeads);
router.patch("/:id/status", requireAuth, requireSuperAdmin, setBusHeadStatus);

export default router;

// ═══════════════════ Bus Head — own portal ════════════════════════════════
// Exported separately so app.js can mount these under different base paths
export const busHeadAuthRouter = Router();
busHeadAuthRouter.post("/login", authLimiter, sendBusHeadLoginOtp);       // POST /api/auth/bus-head/login
busHeadAuthRouter.post("/verify-otp", authLimiter, verifyBusHeadLoginOtp); // POST /api/auth/bus-head/verify-otp

export const busHeadPortalRouter = Router();
busHeadPortalRouter.get(
  "/vehicles/live-all",
  requireAuth,
  requireBusHead,
  getBusHeadLiveVehicles
); // GET /api/bus-head/vehicles/live-all