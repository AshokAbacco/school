// server/src/tracking/tracking.routes.js  (UPDATED)
// SECURITY FIX: these routes had NO authentication. /all returned the live
// position of every GPS device – and Device can be linked to a Student – to
// anyone on the internet. Both routes now require login.

import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getLatestDeviceLocation,
  getAllDeviceLocations,
} from "./tracking.controller.js";

const router = express.Router();

router.use(requireAuth);

// GET all latest devices
router.get("/all", getAllDeviceLocations);

// GET latest single device
router.get("/latest/:deviceId", getLatestDeviceLocation);

export default router;
