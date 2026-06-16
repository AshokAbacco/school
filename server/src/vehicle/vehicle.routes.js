// server/src/vehicle/vehicle.routes.js

import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getVehicles,
  addVehicle,
  toggleVehicle,
  getVehicleLiveLocation,
  getVehicleHistory,
  getAllVehiclesLive,
} from "./vehicle.controller.js";

const router = express.Router();

router.use(requireAuth);

// ── Vehicle management ────────────────────────────────────────────────────────
router.get  ("/",              getVehicles);          // ?schoolId=&includeInactive=
router.post ("/",              addVehicle);
router.patch("/:id/toggle",   toggleVehicle);

// ── Live location ─────────────────────────────────────────────────────────────
router.get("/live-all",        getAllVehiclesLive);    // ?schoolId= — all vehicles latest location
router.get("/:id/live",        getVehicleLiveLocation); // one vehicle latest location
router.get("/:id/history",     getVehicleHistory);    // ?from=&to=&limit=

export default router;