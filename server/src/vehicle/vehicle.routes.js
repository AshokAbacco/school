// server/src/vehicle/vehicle.routes.js  (UPDATED: + /eta, /:id/eta, /:id/route-geometry, /routes, PUT /routes/:routeId/stops)

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
  getSchoolVehiclesEta,
  getVehicleEta,
  getVehicleRouteGeometry,
  getRoutesForStopPriority,
  saveRouteStopPriority,
} from "./vehicle.controller.js";

const router = express.Router();

router.use(requireAuth);

// ── Live (static paths first so they never collide with /:id) ────────────────
router.get("/live-all", getAllVehiclesLive); // ?schoolId=&trail=1  snapshot
router.get("/live-stream", streamSchoolVehicles); // ?schoolId=          SSE live push
router.get("/eta", getSchoolVehiclesEta); // ?schoolId=          stop-by-stop ETA (all buses)

// ── Route stop priority (order / times / on-off) ───────────────────────────
router.get("/routes", getRoutesForStopPriority); //        ?schoolId=
router.put("/routes/:routeId/stops", saveRouteStopPriority); // { stops: [...] } in priority order

// ── Vehicle management ───────────────────────────────────────────────────────
router.get("/", getVehicles); // ?schoolId=&includeInactive=
router.post("/", addVehicle);
router.patch("/:id/toggle", toggleVehicle);
router.patch("/:id", updateVehicle); // set vehicleName / vehicleType / deviceId (IMEI)

// ── Per-vehicle location ─────────────────────────────────────────────────────
router.get("/:id/live", getVehicleLiveLocation);
router.get("/:id/history", getVehicleHistory); // ?from=&to=&limit=
router.get("/:id/eta", getVehicleEta); // stop-by-stop ETA (one bus)
router.get("/:id/route-geometry", getVehicleRouteGeometry); // road line + stops for the map

export default router;
