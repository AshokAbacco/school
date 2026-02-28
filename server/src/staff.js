// server/src/staff.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import studentsRoutes from "./staffRoutes/studentsRoutes.js";
import teachersRoutes from "./staffRoutes/teachersRoutes.js";
import schoolRoutes from "./superAdmin/routes/school.Routes.js";
import schoolAdminRoutes from "./superAdmin/routes/schoolAdmin.Routes.js";
import userRoutes from "./superAdmin/routes/users.Routes.js"; // ← ADD
import analyticsRouter from "./superAdmin/routes/analytics.Routes.js";
import classSectionRoutes, {
  streamsRouter,
  coursesRouter,
  promotionRouter,
} from "./staffRoutes/classSectionRoutes.js";
import academicYearRoutes from "./staffRoutes/academicYearRoutes.js";
import subjectRoutes from "./staffRoutes/subjectRoutes.js";
import meetingRoutes from "./staffRoutes/meetingRoutes.js";

import attendanceRoutes from "./staffRoutes/attendanceRoutes.js";
import adminAttendanceRoute from "./staffRoutes/adminAttendanceRoute.js";
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
//super admin
staff.use("/api/schools", schoolRoutes);
staff.use("/api/school-admins", schoolAdminRoutes);
staff.use("/api/users", userRoutes); // ← ADD
staff.use("/api/superadmin/analytics", analyticsRouter);

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
staff.use("/api/meetings", meetingRoutes);
staff.use("/api/attendance", attendanceRoutes); //for teacher
staff.use("/api/admin/attendance", adminAttendanceRoute); //for admin
staff.use("/api/streams", streamsRouter);
staff.use("/api/courses", coursesRouter);
staff.use("/api/promotion", promotionRouter);

export default staff;
