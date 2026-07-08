// server\src\busHead\busHead.controller.js
import {
  createBusHeadService,
  listBusHeadsService,
  setBusHeadStatusService,
  sendBusHeadLoginOtpService,
  verifyBusHeadLoginOtpService,
  getBusHeadLiveVehiclesService,
} from "./busHead.service.js";

// ── SuperAdmin actions (req.user = SuperAdmin, from requireAuth) ──────────
// POST /api/bus-heads
export const createBusHead = async (req, res) => {
  try {
    const result = await createBusHeadService(req.body, {
      superAdminId: req.user.id,
      universityId: req.user.universityId,
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error("[createBusHead]", err);
    res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
};

// GET /api/bus-heads
export const listBusHeads = async (req, res) => {
  try {
    const result = await listBusHeadsService({ universityId: req.user.universityId });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[listBusHeads]", err);
    res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
};

// PATCH /api/bus-heads/:id/status  { isActive: true|false }
export const setBusHeadStatus = async (req, res) => {
  try {
    const result = await setBusHeadStatusService(req.params.id, req.body.isActive, {
      universityId: req.user.universityId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[setBusHeadStatus]", err);
    res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
};

// ── BusHead-facing actions ─────────────────────────────────────────────────
// POST /api/auth/bus-head/login (public) — STEP 1: verify creds, send OTP
export const sendBusHeadLoginOtp = async (req, res) => {
  try {
    const result = await sendBusHeadLoginOtpService(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[sendBusHeadLoginOtp]", err);
    res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
};

// POST /api/auth/bus-head/verify-otp (public) — STEP 2: verify OTP, return token
export const verifyBusHeadLoginOtp = async (req, res) => {
  try {
    const result = await verifyBusHeadLoginOtpService(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[verifyBusHeadLoginOtp]", err);
    res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
};

// GET /api/bus-head/vehicles/live-all (protected — busHead token only)
export const getBusHeadLiveVehicles = async (req, res) => {
  try {
    const result = await getBusHeadLiveVehiclesService({
      schoolId: req.user.schoolId,
      universityId: req.user.universityId,
      accessType: req.user.accessType,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[getBusHeadLiveVehicles]", err);
    res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
  }
};