// server/src/staffRoutes/adminTransportRoute.js
import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  // Routes
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  // Stops (global)
  getStops,
  createStop,
  updateStop,
  deleteStop,
  // Route-Stop management
  getRouteStops,
  addStopToRoute,
  updateRouteStop,
  removeStopFromRoute,
  reorderRouteStops,
  // Fee Plans
  getFeePlans,
  createFeePlan,
  updateFeePlan,
  // Student Transport
  getStudentTransports,
  assignStudentTransport,
  updateStudentTransport,
  removeStudentTransport,
  // Fee Entries
  getFeeEntries,
  recordFeePayment,
  // Stats / Helpers
  getTransportStats,
  getAcademicYears,
} from "../staffControlls/adminTransportController.js";

const router = Router();
router.use(authMiddleware);

// ── Stats & helpers ───────────────────────────────────────────────────────────
router.get("/stats",          getTransportStats);
router.get("/academic-years", getAcademicYears);

// ── Global stops ──────────────────────────────────────────────────────────────
router.get   ("/stops",        getStops);
router.post  ("/stops",        createStop);
router.put   ("/stops/:id",    updateStop);
router.delete("/stops/:id",    deleteStop);

// ── Fee Plans ─────────────────────────────────────────────────────────────────
router.get  ("/fee-plans",      getFeePlans);
router.post ("/fee-plans",      createFeePlan);
router.put  ("/fee-plans/:id",  updateFeePlan);

// ── Student Assignments ───────────────────────────────────────────────────────
router.get   ("/students",      getStudentTransports);
router.post  ("/students",      assignStudentTransport);
router.put   ("/students/:id",  updateStudentTransport);
router.delete("/students/:id",  removeStudentTransport);

// ── Fee Entries ───────────────────────────────────────────────────────────────
router.get ("/fee-entries",          getFeeEntries);
router.post("/fee-entries/:id/pay",  recordFeePayment);

// ── Routes (must be declared after all /stops, /fee-plans, /students paths) ──
router.get   ("/",     getRoutes);
router.post  ("/",     createRoute);
router.get   ("/:id",  getRouteById);
router.put   ("/:id",  updateRoute);
router.delete("/:id",  deleteRoute);

// ── Route-Stop management ─────────────────────────────────────────────────────
// IMPORTANT: /reorder must come before /:routeStopId to avoid param clash
router.get   ("/:routeId/stops",                  getRouteStops);
router.post  ("/:routeId/stops",                  addStopToRoute);
router.put   ("/:routeId/stops/reorder",          reorderRouteStops);      // ← NEW
router.put   ("/:routeId/stops/:routeStopId",     updateRouteStop);        // ← NEW
router.delete("/:routeId/stops/:routeStopId",     removeStopFromRoute);

export default router;