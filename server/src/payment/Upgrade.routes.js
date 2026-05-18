import express from "express";
import {
  createSubscription,
  getMySubscription,
  getSubscriptionTimeline,
} from "./Upgrade.controller.js";

import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/me", requireAuth, getMySubscription);

router.get(
  "/timeline",
  requireAuth,
  getSubscriptionTimeline
);

router.post(
  "/subscribe",
  requireAuth,
  createSubscription
);

export default router;