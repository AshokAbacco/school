
// server/src/app.js

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import biometricRoutes from "./biometric/biometric.routes.js";
import vehicleRoutes from "./vehicle/vehicle.routes.js";
import voiceRoutes from "./voiceAnnouncements/voice.routes.js";
import idCardRoutes from "./idcard/idCardRoutes.js";

import busHeadRoutes, {
  busHeadAuthRouter,
  busHeadPortalRouter,
} from "./busHead/busHead.routes.js";

import noAuthRoutes from "./no_auth_endpoints/noAuthRoutes.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import errorHandler from "./middlewares/errorMiddleware.js";

import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import parent from "./parent.js";
import backupRoutes from "./modules/backup/backup.routes.js";

import { startVehicleTrackingCron } from "./cron/vehicleTracking.cron.js";
import { setupVoiceCleanupJob } from "./jobs/voiceCleanup.job.js";

const app = express();

app.set("trust proxy", 1);

// ============================================================
// CORS CONFIGURATION
// ============================================================

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean)
  : [];

console.log("========================================");
console.log("CORS CONFIGURATION");
console.log("Allowed Origins:", allowedOrigins);
console.log("========================================");

// ============================================================
// CORS OPTIONS
// ============================================================

const corsOptions = {
  origin: (origin, callback) => {
    // Native Capacitor / Postman / curl / server-to-server
    // requests may not contain an Origin header.
    if (!origin) {
      console.log("[CORS] NO ORIGIN - ALLOWED");
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      console.log("[CORS] ALLOWED:", normalizedOrigin);
      return callback(null, true);
    }

    console.log("[CORS] BLOCKED ORIGIN:", normalizedOrigin);
    console.log("[CORS] Allowed origins:", allowedOrigins);

    return callback(null, false);
  },

  // Required if your frontend sends cookies/auth credentials.
  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  // ==========================================================
  // IMPORTANT
  // ==========================================================
  //
  // Your Capacitor build is sending:
  //
  //   Cache-Control
  //
  // Therefore it MUST be allowed during preflight.
  //
  // ==========================================================

  allowedHeaders: [
    "Accept",
    "Accept-Language",
    "Content-Language",
    "Content-Type",

    "Authorization",
    "Origin",
    "X-Requested-With",

    // Cache
    "Cache-Control",
    "Pragma",

    // Common application/device headers
    "X-Device-Type",
    "X-Device-ID",
    "X-Device-Id",
    "X-Platform",
    "X-App-Version",
    "X-Client-Version",
    "X-Client-Type",

    // Ngrok
    "ngrok-skip-browser-warning",
  ],

  exposedHeaders: [
    "Content-Length",
    "Content-Type",
  ],

  maxAge: 86400,

  optionsSuccessStatus: 204,
};

// ============================================================
// CORS
// ============================================================
//
// MUST come before all API routes.
//
// ============================================================

app.use(cors(corsOptions));

// ============================================================
// EXPRESS 5 PREFLIGHT
// ============================================================
//
// Do NOT use:
//
// app.options("*", ...)
//
// Express 5 does not support that form.
//
// ============================================================

app.options(/.*/, cors(corsOptions));

// ============================================================
// API REQUEST DEBUGGING
// ============================================================

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.log("========================================");
    console.log(`[API] ${req.method} ${req.originalUrl}`);

    console.log(
      "[API] Origin:",
      req.headers.origin || "NONE",
    );

    console.log(
      "[API] Authorization:",
      req.headers.authorization
        ? "PRESENT"
        : "MISSING",
    );

    console.log(
      "[API] Cache-Control:",
      req.headers["cache-control"] || "MISSING",
    );

    console.log(
      "[API] Ngrok bypass:",
      req.headers["ngrok-skip-browser-warning"]
        ? "PRESENT"
        : "MISSING",
    );

    console.log("========================================");
  }

  next();
});

// ============================================================
// BODY PARSERS
// ============================================================

app.use(
  express.json({
    limit: "50mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  }),
);

// ============================================================
// ROUTES
// ============================================================

app.use("/api/auth", authRoutes);

app.use("/api", logoRoutes(requireAuth));

app.use("/api/biometric", biometricRoutes);

app.use("/api/vehicles", vehicleRoutes);

app.use("/api/voice", voiceRoutes);

app.use("/api/id-cards", noAuthRoutes);

app.use("/api/id-cards", idCardRoutes);

app.use("/api/bus-heads", busHeadRoutes);

app.use("/api/auth/bus-head", busHeadAuthRouter);

app.use("/api/bus-head", busHeadPortalRouter);

// ============================================================
// RATE LIMITER
// ============================================================

app.use(globalLimiter);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(errorHandler);

// ============================================================
// PARENT
// ============================================================

app.use("/api/parent", parent);

// ============================================================
// BACKUPS
// ============================================================

app.use("/api/backups", backupRoutes);

// ============================================================
// CRONS
// ============================================================

startVehicleTrackingCron();

setupVoiceCleanupJob();

// ============================================================
// EXPORT
// ============================================================

export default app;

