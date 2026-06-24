// src/biometric/biometric.routes.js

import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  receivePunch,
  getSchools,
  getClasses,
  getDevicesFull,
  addDevice,
  toggleDevice,
  searchPersons,
  getMappings,
  assignMapping,
  deactivateMapping,
  getStats,
  getLogs,
  getAttendanceLogs,
   triggerBiometricAttendance, 
} from "./biometric.controller.js";

const router = express.Router();

// ── PUBLIC routes (called by biometric hardware — no JWT) ─────────────────────
router.get ("/test",  (_req, res) => res.json({ success: true, message: "Biometric API Working" }));
router.post("/punch", receivePunch);

// ── All routes below require a valid JWT (requireAuth sets req.user) ──────────
router.use(requireAuth);
router.post("/trigger-attendance", triggerBiometricAttendance);
// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get("/stats", getStats);

// ── Schools & Classes ─────────────────────────────────────────────────────────
router.get("/schools", getSchools);   // scoped to req.user.universityId
router.get("/classes", getClasses);   // ?schoolId=

// ── Devices ───────────────────────────────────────────────────────────────────
router.get   ("/devices",            getDevicesFull);   // ?schoolId=&includeInactive=true
router.post  ("/devices",            addDevice);
router.patch ("/devices/:id/toggle", toggleDevice);

// ── Person search ─────────────────────────────────────────────────────────────
router.get("/persons", searchPersons);   // ?schoolId=&personType=&q=&classSectionId=

// ── Enrollment mappings ───────────────────────────────────────────────────────
router.get  ("/mappings",                getMappings);       // ?schoolId=&personType=&isActive=
router.post ("/mappings",                assignMapping);
router.patch("/mappings/:id/deactivate", deactivateMapping);

// ── Punch logs ────────────────────────────────────────────────────────────────
router.get("/logs",             getLogs);             // raw individual punches
router.get("/attendance-logs",  getAttendanceLogs);   // grouped: firstPunch + lastPunch per person per day

export default router;