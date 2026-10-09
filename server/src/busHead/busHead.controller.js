// server\src\busHead\busHead.controller.js  (UPDATED: scoped live data, SSE stream, ETA, schools list)
import {
  createBusHeadService,
  listBusHeadsService,
  setBusHeadStatusService,
  sendBusHeadLoginOtpService,
  verifyBusHeadLoginOtpService,
  getBusHeadLiveVehiclesService,
  getBusHeadSchoolsService,
  getBusHeadVehiclesEtaService,
  openBusHeadStreamService,
  getBusHeadRouteGeometryService,
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
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// GET /api/bus-heads
export const listBusHeads = async (req, res) => {
  try {
    const result = await listBusHeadsService({
      universityId: req.user.universityId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[listBusHeads]", err);
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// PATCH /api/bus-heads/:id/status  { isActive: true|false }
export const setBusHeadStatus = async (req, res) => {
  try {
    const result = await setBusHeadStatusService(
      req.params.id,
      req.body.isActive,
      {
        universityId: req.user.universityId,
      },
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[setBusHeadStatus]", err);
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
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
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// POST /api/auth/bus-head/verify-otp (public) — STEP 2: verify OTP, return token
export const verifyBusHeadLoginOtp = async (req, res) => {
  try {
    const result = await verifyBusHeadLoginOtpService(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[verifyBusHeadLoginOtp]", err);
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

const fail = (res, tag, err) => {
  if (!err.status) console.error(tag, err);
  if (res.headersSent) return;
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Server error" });
};

// GET /api/bus-head/schools  — schools in this Bus Head's scope
export const getBusHeadSchools = async (req, res) => {
  try {
    const result = await getBusHeadSchoolsService({
      busHeadId: req.user.id,
      universityId: req.user.universityId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    fail(res, "[getBusHeadSchools]", err);
  }
};

// GET /api/bus-head/vehicles/live-all?schoolId=&trail=1
export const getBusHeadLiveVehicles = async (req, res) => {
  try {
    const result = await getBusHeadLiveVehiclesService(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    fail(res, "[getBusHeadLiveVehicles]", err);
  }
};

// GET /api/bus-head/vehicles/eta?schoolId=
export const getBusHeadVehiclesEta = async (req, res) => {
  try {
    const result = await getBusHeadVehiclesEtaService(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    fail(res, "[getBusHeadVehiclesEta]", err);
  }
};

// GET /api/bus-head/vehicles/live-stream?schoolId=   (Server-Sent Events)
export const streamBusHeadVehicles = async (req, res) => {
  try {
    await openBusHeadStreamService(req, res, req.query);
  } catch (err) {
    fail(res, "[streamBusHeadVehicles]", err);
  }
};

// GET /api/bus-head/vehicles/:id/route-geometry
export const getBusHeadRouteGeometry = async (req, res) => {
  try {
    const result = await getBusHeadRouteGeometryService(
      req.user,
      req.params.id,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    fail(res, "[getBusHeadRouteGeometry]", err);
  }
};
