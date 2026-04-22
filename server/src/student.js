// server/src/student.js  (UPDATED — added shared read-only holiday route)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dashboardRouter from "./student/routes/dashboard.routes.js";
import attendanceRouter from "./student/routes/attendance.routes.js";
import profileRouter from "./student/routes/profile.routes.js";
import marksRoutes from "./student/routes/marksRoutes.js";
import timetableRoutes from "./student/routes/timetableRoutes.js";
import activitiesRoute from "./student/routes/activities.routes.js";
import certificateRoutes from "./student/routes/certificateRoutes.js";
import onlineClassesRouter from "./student/routes/onlineClasses.routes.js";
import studentCertificateRoutes from "./student/routes/studentCertificateRoutes.js";
import homeworkRoutes from "./student/routes/homework.routes.js";
import notificationsRouter from "./student/routes/notifications.routes.js";
import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";

// ── NEW: shared read-only holiday route ───────────────────────────────────────
import makeHolidayRouter from "./sharedRoutes/holidayRoute.js";
// ─────────────────────────────────────────────────────────────────────────────

dotenv.config();

const student = express();

student.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);
student.use(express.json());

// existing routes
student.use("/dashboard", dashboardRouter);
student.use("/attendance", attendanceRouter);
student.use("/profile", profileRouter);
student.use("/marks", marksRoutes);
student.use("/timetable", timetableRoutes);
student.use("/activities", activitiesRoute);
student.use("/certificates", certificateRoutes);
student.use("/online-classes", onlineClassesRouter);
student.use("/api/student/certificates", studentCertificateRoutes);
student.use("/notifications", notificationsRouter);
student.use("/api/student/homework", homeworkRoutes);

// ── Student read-only holidays  (GET / and GET /check) ───────────────────────
student.use("/holidays", makeHolidayRouter(requireAuth));
// ─────────────────────────────────────────────────────────────────────────────

student.use("/api", logoRoutes(requireAuth));

export default student;