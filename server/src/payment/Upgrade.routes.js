import express from "express";
import {
  createPlan,
  getPlans,
  createSubscription,
  getSubscription,
} from "./upgrade.controller.js";

const router = express.Router();

// 🔐 Super Admin
router.post("/plan", createPlan);

// 🌐 Public
router.get("/plans", getPlans);

// 💳 After payment
router.post("/subscribe", createSubscription);

// 📊 School subscription
router.get("/subscription/:schoolId", getSubscription);

export default router;