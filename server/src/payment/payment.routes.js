import express from "express";
import {
  createOrder,
  verifyPayment,
  razorpayWebhook,
  getLatestPayment,
} from "./payment.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ✅ No auth needed — user fills form BEFORE registering/logging in
router.post("/create-order",   createOrder);
router.post("/verify-payment", verifyPayment);

// ✅ Auth required — only logged-in users can fetch their payment history
router.get("/latest", requireAuth, getLatestPayment);

// ✅ Webhook — NO auth (Razorpay calls this directly)
router.post("/webhook", razorpayWebhook);

export default router;