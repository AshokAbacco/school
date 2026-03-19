// server/src/parent/routes/dashboardRoutes.js
import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { getDashboard } from "../controllers/Dashboardcontroller.js";

const router = Router();
router.use(authMiddleware);

// GET /api/parent/dashboard?studentId=<uuid>
router.get("/", getDashboard);

export default router;