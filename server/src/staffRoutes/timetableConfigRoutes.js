// server/src/staffRoutes/timetableConfigRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getTimetableConfig,
  saveTimetableConfig,
} from "../staffControlls/timetableConfigController.js";

const router = express.Router();
router.get("/", authMiddleware, getTimetableConfig);
router.post("/", authMiddleware, saveTimetableConfig);
export default router;
