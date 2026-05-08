import express from "express";

import {
  getLatestDeviceLocation,
  getAllDeviceLocations,
} from "./tracking.controller.js";

const router = express.Router();

/*
   GET all latest devices
*/

router.get(
  "/all",
  getAllDeviceLocations,
);

/*
   GET latest single device
*/

router.get(
  "/latest/:deviceId",
  getLatestDeviceLocation,
);

export default router;