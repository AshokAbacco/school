// server/src/staff.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import studentsRoutes from "./staffRoutes/studentsRoutes.js";
import teachersRoutes from "./staffRoutes/teachersRoutes.js";
import classSectionRoutes from "./staffRoutes/classSectionRoutes.js";
import academicYearRoutes from "./staffRoutes/academicYearRoutes.js";
import subjectRoutes from "./staffRoutes/subjectRoutes.js";
dotenv.config();

const staff = express();

// Middlewares
staff.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

staff.use(express.json());

// Routes
// NOTE: All /api/class-sections/* routes (including timetable config + entries)
// are handled inside classSectionRoutes. Static routes (/timetable/config) are
// registered BEFORE dynamic routes (/:id) to prevent "timetable" being captured
// as an :id param - which was causing timetable data to vanish on page refresh.
staff.use("/api/students", studentsRoutes);
staff.use("/api/teachers", teachersRoutes);
staff.use("/api/class-sections", classSectionRoutes);
staff.use("/api/academic-years", academicYearRoutes);
staff.use("/api/subjects", subjectRoutes);

export default staff;
