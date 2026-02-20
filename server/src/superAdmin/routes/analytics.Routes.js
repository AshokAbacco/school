// server/src/superAdmin/routes/analytics.Routes.js
import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { getAnalytics  } from "../controllers/analytics.controller.js";

const router = express.Router();

// GET /api/superadmin/analytics?range=30d
router.get("/", authMiddleware, getAnalytics);
// router.get("/schools/:schoolId/details", authMiddleware, getSchoolDetails);

export default router;