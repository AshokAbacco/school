import express from "express";
const router = express.Router();

import { handleLocation } from "./gps.controller.js";
import { validateToken } from "./gps.middleware.js";

/**
 * 📍 GPS Location Ingestion (Single payload)
 * POST /api/gps/v1/location
 */
router.post("/location", validateToken, handleLocation);

/**
 * 🩺 Health check (useful for device testing)
 */
router.get("/health", (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "GPS service is running",
    timestamp: new Date(),
  });
});

export default router;
