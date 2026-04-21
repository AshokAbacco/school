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







const app = express();


// middlewares
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use(globalLimiter);
app.use(errorHandler);

startBackupScheduler();
setInterval(cleanCloud, 24 * 60 * 60 * 1000);


export default app;
