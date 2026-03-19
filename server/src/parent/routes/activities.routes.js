// server/src/parent/routes/activitiesRoutes.js
import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import {
  getActivities,
  getEvents,
  getAchievements,
  getSummary,
} from "../controllers/Activitiescontroller.js";

const router = Router();
router.use(authMiddleware);

// GET /api/parent/activities?studentId=
router.get("/",             getActivities);
// GET /api/parent/activities/events?studentId=
router.get("/events",       getEvents);
// GET /api/parent/activities/achievements?studentId=
router.get("/achievements", getAchievements);
// GET /api/parent/activities/summary?studentId=
router.get("/summary",      getSummary);

export default router;