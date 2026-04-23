import express from "express";
import { createOrder, verifyPayment, razorpayWebhook, getLatestPayment } from "./payment.controller.js";

import { requireAuth } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);

router.post("/create-order", requireAuth, createOrder);
router.post("/webhook", razorpayWebhook);
export default router;