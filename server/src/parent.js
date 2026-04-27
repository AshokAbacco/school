// server/src/parent.js  (UPDATED — added shared read-only holiday route)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import attendanceRoutes from "./parent/routes/attendance.routes.js";
import studentsRoutes from "./parent/routes/students.routes.js";
import marksRoutes from "./parent/routes/marksRoutes.js";
import timetableRoutes from "./parent/routes/timetableRoutes.js";
import activitiesRoutes from "./parent/routes/activities.routes.js";
import dashboardRoutes from "./parent/routes/Dashboardroutes.js";
import profileRoutes from "./parent/routes/Profileroutes.js";
import certificatesRoutes from "./parent/routes/Certificatesroutes.js";
import syllabusProgressRoutes from "./parent/routes/SyllabusProgressRoutes.js";
import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";

// ── NEW: shared read-only holiday route ───────────────────────────────────────
import makeHolidayRouter from "./sharedRoutes/holidayRoute.js";
// ─────────────────────────────────────────────────────────────────────────────
import feesRoutes from "./parent/routes/fees.routes.js";


dotenv.config();

const parent = express();

parent.use(
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

parent.use(express.json());

// existing routes
parent.use("/attendance", attendanceRoutes);
parent.use("/students", studentsRoutes);
parent.use("/marks", marksRoutes);
parent.use("/timetable", timetableRoutes);
parent.use("/activities", activitiesRoutes);
parent.use("/dashboard", dashboardRoutes);
parent.use("/profile", profileRoutes);
parent.use("/certificates", certificatesRoutes);
parent.use("/syllabus-progress", syllabusProgressRoutes);

// ── Parent read-only holidays  (GET / and GET /check) ────────────────────────
// NOTE: parent server uses no /api prefix on most routes — keeping consistent
parent.use("/holidays", makeHolidayRouter(requireAuth));
// ─────────────────────────────────────────────────────────────────────────────

parent.use("/api", logoRoutes(requireAuth));
parent.use("/fees", feesRoutes);
export default parent;