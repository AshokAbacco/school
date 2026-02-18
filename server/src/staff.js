// server/src/staff.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import studentsRoutes from "./staffRoutes/studentsRoutes.js";

dotenv.config();

const staff = express();

// Middlewares
staff.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);
staff.use(express.json());

// Routes
staff.use("/api/students", studentsRoutes);

export default staff;