// server/src/vehicle/vehicle.routes.js

import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getVehicles,
  addVehicle,
  updateVehicle,
  toggleVehicle,
  getVehicleLiveLocation,
  getVehicleHistory,
  getAllVehiclesLive,
  streamSchoolVehicles,
} from "./vehicle.controller.js";

const router = express.Router();

router.use(requireAuth);

// ── Live (static paths first so they never collide with /:id) ────────────────
router.get("/live-all", getAllVehiclesLive); // ?schoolId=&trail=1  snapshot
router.get("/live-stream", streamSchoolVehicles); // ?schoolId=          SSE live push

// ── Vehicle management ───────────────────────────────────────────────────────
router.get("/", getVehicles); // ?schoolId=&includeInactive=
router.post("/", addVehicle);
router.patch("/:id/toggle", toggleVehicle);
router.patch("/:id", updateVehicle); // set vehicleName / vehicleType / deviceId (IMEI)

// ── Per-vehicle location ─────────────────────────────────────────────────────
router.get("/:id/live", getVehicleLiveLocation);
router.get("/:id/history", getVehicleHistory); // ?from=&to=&limit=

export default router;
