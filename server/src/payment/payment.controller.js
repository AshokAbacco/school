import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../config/db.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

// ✅ Create Order
export const createOrder = async (req, res) => {
  try {
    const {
      fullName,
      schoolName,
      email,
      phone,
      address,
      planId,
      userCount,
      amount,
    } = req.body;

    // ✅ Validation
    if (!fullName || !schoolName || !email || !phone || !address) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // ✅ Create Razorpay Order
    // ✅ Create Razorpay Order
    const order = await Promise.race([
      razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Razorpay timeout")), 10000)
      ),
    ]);

    // ✅ Save in DB
    const userId = req.user?.id;
    const payment = await prisma.payment.create({
      data: {
        fullName,
        schoolName,
        email,
        phone,
        address,
        planId,
        userCount,
        amount,
        razorpayOrderId: order.id,
        userId,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      paymentId: payment.id,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

// ✅ Verify Payment
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId,
      phone,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED" },
      });

      return res.status(400).json({ status: "FAILED" });
    }

    // ✅ Update DB
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "SUCCESS",
        phone,
      },
    });

    res.json({ status: "verified" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
};

export const getLatestPayment = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Try to get last payment
    const payment = await prisma.payment.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (payment) {
      return res.json(payment);
    }

    // 2️⃣ Fallback → Super Admin data
    const user = await prisma.superAdmin.findUnique({
      where: { id: userId },
    });

    return res.json({
      fullName: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      schoolName: "",
      address: "",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch details" });
  }
};
export const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== req.headers["x-razorpay-signature"]) {
    return res.status(400).json({ error: "Invalid webhook" });
  }

  const event = req.body.event;

  if (event === "payment.captured") {
    const payment = req.body.payload.payment.entity;

    await prisma.payment.updateMany({
      where: { razorpayOrderId: payment.order_id },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: payment.id,
      },
    });
  }

  res.json({ status: "ok" });
};