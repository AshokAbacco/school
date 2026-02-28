//server\src\app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes.js";


dotenv.config();

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

export default app;
