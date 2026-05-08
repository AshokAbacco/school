// server.js
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
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
import contactRoutes from "./src/contactUs/contact.route.js";
import subscriptionRoutes from "./src/payment/Upgrade.routes.js";
import examTimetableRoutes from "./src/whatsapp/Exams/examTimetable.routes.js";

import dotenv from "dotenv";
dotenv.config();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://eduabaccotech.com",
  "https://www.eduabaccotech.com",
  "https://school-crm.onrender.com",
  "https://cqw6v494-5173.inc1.devtunnels.ms",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // mobile/postman

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed: " + origin));
    },
    credentials: true,
  })
);

// CORS
// app.use(cors({
//   origin: allowedOrigins,
//   credentials: true

// }));

// app.use(cors({
//   origin: (origin, callback) => {
//     // allow mobile apps / postman (no origin)
//     if (!origin) return callback(null, true);

//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }

//     // 🔥 TEMP: allow all (for debugging / mobile)
//     return callback(null, true);
//   },
//   credentials: true
// }));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      callback(null, origin);
    },
    credentials: true,
  }),
);

app.get("/api/image-proxy", async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) return res.status(400).send("Missing URL");

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).send("Failed to fetch image");
    }

    const buffer = await response.arrayBuffer();

    res.set("Access-Control-Allow-Origin", "*"); // 🔥 important
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

// Routes
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
const server = createServer(app);

// Socket
// const io = new Server(server, {
//   cors: {
//     origin: allowedOrigins,
//     credentials: true
//   }
// });
const io = new Server(server, {
  cors: {
    origin: "*", // 🔥 important for mobile
    credentials: true,
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

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
