// server/src/student/routes/activities.routes.js

import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import {
  getActivities,
  enrollActivity,
  withdrawActivity,
  getMyEvents,
  getAchievements,
  getSummary,
} from "../controllers/activities.controller.js";

const router = Router();
router.use(authMiddleware);

// Summary (dashboard counts)
router.get("/summary",                      getSummary);

// All available activities + enrollment status
router.get("/",                             getActivities);

// Self-enroll / withdraw
router.post("/:activityId/enroll",          enrollActivity);
router.delete("/:activityId/enroll",        withdrawActivity);

// Events the student is in
router.get("/events",                       getMyEvents);

// Achievements / results
router.get("/achievements",                 getAchievements);

export default router;

// ── Register in student.js ────────────────────────────────────
// import activitiesRoute from "./routes/activities.routes.js";
// app.use("/activities", activitiesRoute);   // or under /student prefix