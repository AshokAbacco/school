import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { getStaffBirthdayNotifications } from "../staffControlls/teacherBirthdayNotification.controller.js";

const router = Router();
router.use(authMiddleware);

router.get("/birthdays", getStaffBirthdayNotifications);

export default router;