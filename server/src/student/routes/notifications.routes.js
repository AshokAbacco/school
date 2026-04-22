// server/src/student/routes/notifications.routes.js

import { Router } from "express";
import { getBirthdayNotifications } from "../controllers/notifications.controller.js";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

/**
 * GET /notifications/birthday
 * Returns today's birthday students + a random wish.
 */
router.get("/birthday", getBirthdayNotifications);

export default router;