// server/src/staffRoutes/adminActivityRoute.js

import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  // Activities
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  // Events
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  // Helpers
  getAcademicYears,
  getClassSections,
} from "../staffControlls/adminActivityController.js";

const router = Router();
router.use(authMiddleware);

// ── Helper dropdowns ─────────────────────────────────────────────────────────
router.get("/academic-years",  getAcademicYears);
router.get("/class-sections",  getClassSections);

// ── Events  (must be before /:id so /events doesn't match as an id) ──────────
router.get("/events",          getEvents);
router.get("/events/:id",      getEventById);
router.post("/events",         createEvent);
router.put("/events/:id",      updateEvent);
router.delete("/events/:id",   deleteEvent);

// ── Activities ────────────────────────────────────────────────────────────────
router.get("/",                getActivities);
router.get("/:id",             getActivityById);
router.post("/",               createActivity);
router.put("/:id",             updateActivity);
router.delete("/:id",          deleteActivity);

export default router;

// ── Register in staff.js ─────────────────────────────────────────────────────
// import adminActivityRoute from "./staffRoutes/adminActivityRoute.js";
// app.use("/api/admin/activities", adminActivityRoute);