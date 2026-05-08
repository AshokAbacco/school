import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { sendInvoiceEmail } from "../utils/invoiceMailer.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

//
// ✅ CREATE ORDER
//
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

    // 🔥 Generate tempUserId (important)
    const tempUserId = crypto.randomUUID();

    // ✅ Save in DB
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
        tempUserId, // 🔥 IMPORTANT
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      paymentId: payment.id,
      tempUserId, // 🔥 send to frontend
    });

  } catch (err) {
    console.error("❌ createOrder error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};


//
// ✅ VERIFY PAYMENT
//
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

    // ✅ Update DB (NO superAdminId here ❗)
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "SUCCESS",
        phone,
      },
    });

    // ✅ Send invoice email
    sendInvoiceEmail({
      email:              updatedPayment.email,
      fullName:           updatedPayment.fullName,
      schoolName:         updatedPayment.schoolName,
      phone:              updatedPayment.phone,
      address:            updatedPayment.address,
      planId:             updatedPayment.planId,
      userCount:          updatedPayment.userCount,
      amount:             updatedPayment.amount,
      razorpayPaymentId:  razorpay_payment_id,
      razorpayOrderId:    razorpay_order_id,
    }).catch((err) => console.error("❌ Invoice email failed:", err));

    res.json({ status: "verified" });

  } catch (err) {
    console.error("❌ verifyPayment error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
};


//
// ✅ GET LATEST PAYMENT
//
export const getLatestPayment = async (req, res) => {
  try {
    const userId = req.user.id;

    const payment = await prisma.payment.findFirst({
      where: { superAdminId: userId }, // ✅ FIXED
      orderBy: { createdAt: "desc" },
    });

    if (payment) {
      return res.json(payment);
    }

    const user = await prisma.superAdmin.findUnique({
      where: { id: userId },
    });

    return res.json({
      fullName:   user?.name  || "",
      email:      user?.email || "",
      phone:      user?.phone || "",
      schoolName: "",
      address:    "",
    });

  } catch (err) {
    console.error("❌ getLatestPayment error:", err);
    res.status(500).json({ error: "Failed to fetch details" });
  }
};


//
// ✅ RAZORPAY WEBHOOK
//
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
      return res.status(400).json({ error: "Invalid webhook" });
    }

    const event = req.body.event;

    if (event === "payment.captured") {
      const razorpayPayment = req.body.payload.payment.entity;

      const updated = await prisma.payment.updateMany({
        where: {
          razorpayOrderId: razorpayPayment.order_id,
          status: { not: "SUCCESS" }, // ✅ prevent duplicate
        },
        data: {
          status: "SUCCESS",
          razorpayPaymentId: razorpayPayment.id,
        },
      });

      if (updated.count > 0) {
        const payment = await prisma.payment.findFirst({
          where: { razorpayOrderId: razorpayPayment.order_id },
        });

        if (payment && payment.status === "SUCCESS") {
          sendInvoiceEmail({
            email:             payment.email,
            fullName:          payment.fullName,
            schoolName:        payment.schoolName,
            phone:             payment.phone,
            address:           payment.address,
            planId:            payment.planId,
            userCount:         payment.userCount,
            amount:            payment.amount,
            razorpayPaymentId: razorpayPayment.id,
            razorpayOrderId:   razorpayPayment.order_id,
          }).catch((err) =>
            console.error("❌ Webhook invoice email failed:", err)
          );
        }
      }
    }

    res.json({ status: "ok" });

  } catch (err) {
    console.error("❌ webhook error:", err);
    res.status(500).json({ error: "Webhook failed" });
  }
};