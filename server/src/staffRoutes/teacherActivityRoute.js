// server/src/staffRoutes/teacherActivityRoute.js

import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getActivities,
  getEnrollments,
  enrollStudents,
  removeEnrollment,
  ensureDefaultEvent,
  getEvents,
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  setTeamResult,
  getParticipants,
  addParticipants,
  updateParticipant,
  removeParticipant,
  getResults,
  addResult,
  deleteResult,
  getStudentsForActivity,
  getClassSections,
  getAcademicYears,
} from "../staffControlls/teacherActivityController.js";

const router = Router();
router.use(authMiddleware);

// ── Helpers ────────────────────────────────────────────────────
router.get("/academic-years", getAcademicYears);
router.get("/class-sections", getClassSections);
router.get("/students",       getStudentsForActivity);

// ── Activities ─────────────────────────────────────────────────
router.get("/", getActivities);

// ── Events (MUST be before /:activityId routes) ────────────────
router.get("/events", getEvents);

// ── Teams ──────────────────────────────────────────────────────
router.get("/events/:eventId/teams",                               getTeams);
router.post("/events/:eventId/teams",                              createTeam);
router.put("/events/:eventId/teams/:teamId",                       updateTeam);
router.delete("/events/:eventId/teams/:teamId",                    deleteTeam);
router.post("/events/:eventId/teams/:teamId/members",              addTeamMember);
router.delete("/events/:eventId/teams/:teamId/members/:studentId", removeTeamMember);

// ── Team result shortcut (WINNER / RUNNER_UP / THIRD_PLACE) ────
router.put("/events/:eventId/teams/:teamId/result", setTeamResult);

// ── Event Participants ─────────────────────────────────────────
router.get("/events/:eventId/participants",               getParticipants);
router.post("/events/:eventId/participants",              addParticipants);
router.patch("/events/:eventId/participants/:studentId",  updateParticipant);
router.delete("/events/:eventId/participants/:studentId", removeParticipant);

// ── Event Results ──────────────────────────────────────────────
router.get("/events/:eventId/results",        getResults);
router.post("/events/:eventId/results",       addResult);
router.delete("/events/:eventId/results/:id", deleteResult);

// ── Enrollments (AFTER /events to avoid route conflict) ────────
router.get("/:activityId/enrollments",               getEnrollments);
router.post("/:activityId/enrollments",              enrollStudents);
router.delete("/:activityId/enrollments/:studentId", removeEnrollment);

// ── Auto-create default event ──────────────────────────────────
router.post("/:activityId/ensure-event", ensureDefaultEvent);

export default router;

// ── Register in staff.js ───────────────────────────────────────
// import teacherActivityRoute from "./staffRoutes/teacherActivityRoute.js";
// app.use("/api/teacher/activities", teacherActivityRoute);