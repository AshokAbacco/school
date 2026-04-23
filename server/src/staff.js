// server/src/staff.js  (UPDATED — added shared holiday route for teacher/staff logins)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import studentsRoutes from "./staffRoutes/studentsRoutes.js";
import teachersRoutes from "./staffRoutes/teachersRoutes.js";
import admindashboardRoutes from "./staffRoutes/admindashboardRoutes.js";
import schoolRoutes from "./superAdmin/routes/school.Routes.js";
import schoolAdminRoutes from "./superAdmin/routes/schoolAdmin.Routes.js";
import userRoutes from "./superAdmin/routes/users.Routes.js";
import analyticsRouter from "./superAdmin/routes/analytics.Routes.js";
import financeProfileRoutes from "./superAdmin/routes/financeProfile.routes.js";
import teacherCertificateRoutes from "./staffRoutes/teacherCertificateRoutes.js";
import adminTransportRoute from "./staffRoutes/adminTransportRoute.js";
import feeRoutes from "./superAdmin/routes/Feeroutes.js";
import superAdminProfileRoutes from "./staffRoutes/superAdminProfile.Routes.js";
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
import examsRoutes from "./staffRoutes/ExamsRoutes.js";
import teacherCurriculumRoutes from "./staffRoutes/teacherCurriculumRoutes.js";
import adminCurriculumRoutes from "./staffRoutes/adminCurriculumRoutes.js";
import galleryRoutes from "./staffRoutes/gallery.routes.js";
import adminHolidayRoute from "./staffRoutes/adminHolidayRoute.js";
import adminActivityRoute from "./staffRoutes/adminActivityRoute.js";
import teacherActivityRoute from "./staffRoutes/teacherActivityRoute.js";
import awardRoutes from "./staffRoutes/Awardroutes.js";
import adminAwardRoutes from "./staffRoutes/Adminawardroutes.js";
import teacherLiveClassRoute from "./staffRoutes/teacherLiveClassRoute.js";
import teacherTimetableRoute from "./staffRoutes/teacherTimetableRoute.js";
import staffRoutes from "./staffRoutes/staffRoutes.js";
import resultRoutes from "./staffRoutes/resultRoutes.js";
import teacherAssignmentRoute from "./staffRoutes/teacherAssignmentRoute.js";
import chatRoutes from "../src/chatbox/chat.routes.js";
import staffNotificationRoutes from "./staffRoutes/staffNotificationRoutes.js";
import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";

// ── NEW: shared read-only holiday route for teacher/staff logins ──────────────
import makeHolidayRouter from "./sharedRoutes/holidayRoute.js";
import authMiddleware from "./middlewares/authMiddleware.js";
// ─────────────────────────────────────────────────────────────────────────────

dotenv.config();

const staff = express();

staff.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

staff.use(express.json());

// super admin
staff.use("/api/schools", schoolRoutes);
staff.use("/api/school-admins", schoolAdminRoutes);
staff.use("/api/users", userRoutes);
staff.use("/api/superadmin/analytics", analyticsRouter);
staff.use("/api/finance-profiles", financeProfileRoutes);
staff.use("/api/fees", feeRoutes);

// staff / teacher routes
staff.use("/api/students", studentsRoutes);
staff.use("/api/teachers", teachersRoutes);
staff.use("/api/admindashboard", admindashboardRoutes);
staff.use("/api/class-sections", classSectionRoutes);
staff.use("/api/academic-years", academicYearRoutes);
staff.use("/api/subjects", subjectRoutes);
staff.use("/api/meetings", meetingRoutes);
staff.use("/api/attendance", attendanceRoutes);
staff.use("/api/admin/attendance", adminAttendanceRoute);
staff.use("/api/streams", streamsRouter);
staff.use("/api/courses", coursesRouter);
staff.use("/api/promotion", promotionRouter);
staff.use("/api/exams", examsRoutes);
staff.use("/api/teacher/curriculum", teacherCurriculumRoutes);
staff.use("/api/admin/curriculum", adminCurriculumRoutes);
staff.use("/api/gallery", galleryRoutes);

// Admin full CRUD holidays (admin login uses this)
staff.use("/api/admin/holidays", adminHolidayRoute);

// ── Teacher / staff read-only holidays  (GET / and GET /check only) ──────────
staff.use("/api/holidays", makeHolidayRouter(authMiddleware));
// ─────────────────────────────────────────────────────────────────────────────

staff.use("/api/admin/activities", adminActivityRoute);
staff.use("/api/teacher/activities", teacherActivityRoute);
staff.use("/api/staff/awards", awardRoutes);
staff.use("/api/admin/awards", adminAwardRoutes);
staff.use("/api/teacher/live-classes", teacherLiveClassRoute);
staff.use("/api/teacher/timetable", teacherTimetableRoute);
staff.use("/api/staff/profiles", staffRoutes);
staff.use("/api/results", resultRoutes);
staff.use("/api/teacher/certificates", teacherCertificateRoutes);
staff.use("/api/teacher/assignments", teacherAssignmentRoute);
staff.use("/api/admin/transport", adminTransportRoute);
staff.use("/api/superadmin/profile", superAdminProfileRoutes);
staff.use("/api/notifications", staffNotificationRoutes);
staff.use("/api/chat", chatRoutes);
staff.use("/api", logoRoutes(requireAuth));

export default staff;