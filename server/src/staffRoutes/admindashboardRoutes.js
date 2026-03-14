// server/src/staffRoutes/dashboardRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { getDashboardSummary } from "../staffControlls/admindashboardController.js";

const router = express.Router();

// GET /api/dashboard/summary
router.get("/summary", authMiddleware, getDashboardSummary);

export default router;
