// server/src/student/routes/dashboard.routes.js

import { Router }       from "express";
import authMiddleware   from "../../middlewares/authMiddleware.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(authMiddleware);

// GET /dashboard  →  single aggregated payload for the student dashboard
router.get("/", getDashboard);

export default router;

// ── Register in server/src/student.js ────────────────────────────────────────
// import dashboardRouter from "./student/routes/dashboard.routes.js";
// student.use("/dashboard", dashboardRouter);