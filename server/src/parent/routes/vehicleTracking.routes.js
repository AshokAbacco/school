// server/src/parent/routes/vehicleTracking.routes.js

import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getChildBusLocation } from "../controllers/vehicleTracking.controller.js";

const router = express.Router();

// GET /api/parent/vehicle-tracking?studentId=
router.get("/", requireAuth, getChildBusLocation);

export default router;