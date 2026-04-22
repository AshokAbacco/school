// server/src/parent.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";


//imports

import attendanceRoutes from "./parent/routes/attendance.routes.js";
import studentsRoutes from "./parent/routes/students.routes.js";
import marksRoutes    from "./parent/routes/marksRoutes.js";
import timetableRoutes  from "./parent/routes/timetableRoutes.js";
import activitiesRoutes from "./parent/routes/activities.routes.js";
import dashboardRoutes  from "./parent/routes/Dashboardroutes.js";
import profileRoutes    from "./parent/routes/Profileroutes.js";
import certificatesRoutes  from "./parent/routes/Certificatesroutes.js";
import syllabusProgressRoutes from "./parent/routes/SyllabusProgressRoutes.js";
import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js"; 


dotenv.config();           

const parent = express();

parent.use(  
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

parent.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

parent.use("/attendance", attendanceRoutes);
parent.use("/students", studentsRoutes);
parent.use("/marks",      marksRoutes);
parent.use("/timetable",  timetableRoutes);
parent.use("/activities", activitiesRoutes);
parent.use("/dashboard",   dashboardRoutes);
parent.use("/profile",     profileRoutes);
parent.use("/certificates", certificatesRoutes);
parent.use("/syllabus-progress", syllabusProgressRoutes);
parent.use("/api", logoRoutes(requireAuth));



export default parent;