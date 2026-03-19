import express from "express";
import { getStudentAttendance } from "../controllers/attendance.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getStudentAttendance);

export default router;


