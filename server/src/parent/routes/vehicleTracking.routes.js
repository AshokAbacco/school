// server/src/parent/routes/vehicleTracking.routes.js

import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  getChildBusLocation,
  getTrackableChildren,
  streamChildBusLocation,
} from "../controllers/vehicleTracking.controller.js";

const router = express.Router();

// GET /api/parent/vehicle-tracking/children
router.get("/children", requireAuth, getTrackableChildren);

// GET /api/parent/vehicle-tracking/stream?studentId=   (Server-Sent Events, live)
router.get("/stream", requireAuth, streamChildBusLocation);

// GET /api/parent/vehicle-tracking?studentId=          (snapshot + trail)
router.get("/", requireAuth, getChildBusLocation);

export default router;
