// server/src/staff.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import studentsRoutes from "./staffRoutes/studentsRoutes.js";
import teachersRoutes from "./staffRoutes/teachersRoutes.js";

dotenv.config();

const staff = express(); // rename app → staff (better clarity)

// Middlewares
staff.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

staff.use(express.json());

// Routes
staff.use("/api/students", studentsRoutes);
staff.use("/api/teachers", teachersRoutes);

export default staff;
