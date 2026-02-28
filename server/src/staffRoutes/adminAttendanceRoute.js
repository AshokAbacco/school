//server\src\staffRoutes\adminAttendanceRoute.js
import express from "express";
import { getAttendance } from "../staffControlls/adminAttendanceController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAttendance);

export default router;
