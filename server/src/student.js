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
import studentAssignmentRoute from "./student/routes/studentAssignmentRoute.js";
import assignmentQuestionRoute from "./staffRoutes/assignmentQuestionRoute.js";
import assignmentDraftRoute from "./student/routes/assignmentDraftRoute.js";

import notificationsRouter from "./student/routes/notifications.routes.js";
import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";

// ── NEW: shared read-only holiday route ───────────────────────────────────────
import makeHolidayRouter from "./sharedRoutes/holidayRoute.js";
// ─────────────────────────────────────────────────────────────────────────────

dotenv.config();

const student = express();

// student.use(
//   cors({
//     origin: process.env.CLIENT_ORIGIN,
//     credentials: true,
//   })
// );
student.use(
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
// student.use(express.json());
student.use(express.json({
  limit: "50mb",
}));

student.use(express.urlencoded({
  extended: true,
  limit: "50mb",
}));

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
student.use("/api/student/assignments", studentAssignmentRoute);
student.use("/api/assignments", assignmentQuestionRoute);
student.use("/api/assignments", assignmentDraftRoute);



// ── Student read-only holidays  (GET / and GET /check) ───────────────────────
student.use("/holidays", makeHolidayRouter(requireAuth));
// ─────────────────────────────────────────────────────────────────────────────

student.use("/api", logoRoutes(requireAuth));

export default student;