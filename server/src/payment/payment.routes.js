import express from "express";
import {
  createOrder,
  verifyPayment,
  razorpayWebhook,
  getLatestPayment,
  getReferredUsers,
} from "./payment.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { verifyApiKey } from "../middlewares/apiKey.middleware.js";

const router = express.Router();

// ✅ No auth needed — user fills form BEFORE registering/logging in
router.post("/create-order",   createOrder);
router.post("/verify-payment", verifyPayment);

// ✅ Auth required — only logged-in users can fetch their payment history
router.get("/latest", requireAuth, getLatestPayment);

// ✅ Webhook — NO auth (Razorpay calls this directly)
router.post("/webhook", razorpayWebhook);

// 🆕 Server-to-server pull endpoint for Abacco Tech's referral sync.
// Protected by a shared x-api-key instead of user auth, since the caller
// is another backend, not a logged-in user.
router.get("/referrals", verifyApiKey, getReferredUsers);

export default router;