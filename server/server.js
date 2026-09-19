// server.js
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import "./src/utils/redis.js";

import app from "./src/app.js";
import staff from "./src/staff.js";
import finance from "./src/finance.js";
import student from "./src/student.js";
import parent from "./src/parent.js";

import gpsRoutes from "./src/gps-ingestion/gps.routes.js";
import trackingRoutes from "./src/gpsTracking/tracking.routes.js";
import paymentRoutes from "./src/payment/payment.routes.js";

import whatsappRoutes from "./src/whatsapp/whatsapp.routes.js";
import "./src/whatsapp/birthdayCron.js";
import "./src/whatsapp/meetingReminderCron.js";
import "./src/whatsapp/anniversaryCron.js";
import { startReminderCron } from "./src/cron/reminderCron.js";

import contactRoutes from "./src/contactUs/contact.route.js";
import subscriptionRoutes from "./src/payment/Upgrade.routes.js";
import examTimetableRoutes from "./src/whatsapp/Exams/examTimetable.routes.js";
import voiceRoutes from "./src/voice/routes/voice.routes.js";

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5001;

// ==================== CORS ====================
// REST API CORS is handled in src/app.js.
// Here we only prepare the allowed origins for Socket.IO.

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

console.log("Allowed Origins for Socket.IO:", allowedOrigins);

// ==================== API REQUEST LOGGING ====================

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.log("API REQUEST:", req.method, req.path);
    console.log("Origin:", req.headers.origin);
    console.log(
      "Authorization:",
      req.headers.authorization ? "PRESENT" : "MISSING",
    );
  }

  next();
});

// ==================== IMAGE PROXY ====================

app.get("/api/image-proxy", async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) return res.status(400).send("Missing URL");

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(400).send("Failed to fetch image");
    }

    const buffer = await response.arrayBuffer();

    res.set(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg",
    );

    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed");
  }
});

app.use("/uploads", express.static("uploads"));

// ==================== Routes ====================

app.use(staff);
app.use(student);
app.use(finance);

app.use("/api/parent", parent);
app.use("/api/device", gpsRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/exam-timetable-whatsapp", examTimetableRoutes);
app.use("/api/contact", contactRoutes);

app.use("/api/voice", voiceRoutes);

startReminderCron();

// ==================== HTTP SERVER ====================

const server = createServer(app);

// ==================== SOCKET.IO ====================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

global.io = io;

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;

  if (userId) {
    socket.join(String(userId));
  }

  console.log("Socket connected:", userId);
});

// ==================== START SERVER ====================

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
