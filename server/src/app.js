//server\src\app.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import biometricRoutes from "./biometric/biometric.routes.js";
import vehicleRoutes from "./vehicle/vehicle.routes.js";           // ← ADD
import voiceRoutes from "./voiceAnnouncements/voice.routes.js";     // ← ADD
import { globalLimiter } from "./middlewares/rateLimiter.js";
import errorHandler from "./middlewares/errorMiddleware.js";

import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import parent from "./parent.js";
import backupRoutes from "./modules/backup/backup.routes.js";
import { startVehicleTrackingCron } from "./cron/vehicleTracking.cron.js"; // ← ADD
import { setupVoiceCleanupJob } from "./jobs/voiceCleanup.job.js";          // ← ADD

const app = express();

app.set("trust proxy", 1);

// middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CLIENT_ORIGIN.split(",");
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// routes
app.use("/api/auth",      authRoutes);
app.use("/api",           logoRoutes(requireAuth));
app.use("/api/biometric", biometricRoutes);
app.use("/api/vehicles",  vehicleRoutes);   // ← ADD
app.use("/api/voice",     voiceRoutes);     // ← ADD
app.use(globalLimiter);
app.use(errorHandler);
app.use("/api/parent",    parent);
app.use("/api/backups",   backupRoutes);

// ── Start GPS vehicle tracking cron (every 30 seconds) ───────────────────────
startVehicleTrackingCron(); // ← ADD

// ── Start voice announcement cleanup cron (daily, 02:30 IST) ────────────────
setupVoiceCleanupJob(); // ← ADD

export default app;