// server/src/student.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import dashboardRouter   from "./student/routes/dashboard.routes.js";   // ← ADD
import attendanceRouter from "./student/routes/attendance.routes.js";
import profileRouter    from "./student/routes/profile.routes.js";
import marksRoutes    from "./student/routes/marksRoutes.js";
import timetableRoutes   from "./student/routes/timetableRoutes.js";
import activitiesRoute from "./student/routes/activities.routes.js";
import certificateRoutes from "./student/routes/certificateRoutes.js";
import onlineClassesRouter from "./student/routes/onlineClasses.routes.js";
import studentCertificateRoutes from "./student/routes/studentCertificateRoutes.js";
import homeworkRoutes from "./student/routes/homework.routes.js";





dotenv.config();

const student = express();

// ── Middlewares ───────────────────────────────────────────────────────────────
student.use(  
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);
student.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
student.use("/dashboard",    dashboardRouter);   // ← ADD
student.use("/attendance", attendanceRouter);
student.use("/profile",    profileRouter);
student.use("/marks",      marksRoutes); 
student.use("/timetable",  timetableRoutes);
student.use("/activities", activitiesRoute);
student.use("/certificates", certificateRoutes);
student.use("/online-classes", onlineClassesRouter);
student.use("/api/student/certificates", studentCertificateRoutes);
student.use("/api/student/homework", homeworkRoutes)


export default student;