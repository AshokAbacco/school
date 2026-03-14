// server/src/staffRoutes/adminHolidayRoute.js
import express from "express";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  checkHoliday,
} from "../staffControlls/adminHolidayController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/check", authMiddleware, checkHoliday);
router.get("/", authMiddleware, getHolidays);
router.post("/", authMiddleware, createHoliday);
router.put("/:id", authMiddleware, updateHoliday);
router.delete("/:id", authMiddleware, deleteHoliday);

export default router;