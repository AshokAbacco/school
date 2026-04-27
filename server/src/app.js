//server\src\app.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import errorHandler from "./middlewares/errorMiddleware.js";

import { startBackupScheduler } from "./backup/scheduler.js";
import { cleanCloud } from "./backup/cleanupCloud.js";
import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import parent from "./parent.js";

const app = express();

// middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CLIENT_ORIGIN.split(",");

      // allow requests without origin (mobile apps, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  }),
);
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api", logoRoutes(requireAuth));
app.use(globalLimiter);
app.use(errorHandler);
app.use("/api/parent", parent);
startBackupScheduler();
setInterval(cleanCloud, 24 * 60 * 60 * 1000);

export default app;
