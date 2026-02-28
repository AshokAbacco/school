// server/src/staffRoutes/meetingRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getMeetings,
  getMeetingStats,
  getMeetingById,
  createMeeting,
  updateMeeting,
  updateMeetingStatus,
  deleteMeeting,
  sendMeetingReminder,
  markParticipantAttendance,
  markStudentAttendance,
  updateMeetingNotes,
  getTeachersByClassSection,
} from "../staffControlls/meetingController.js";

const router = express.Router();

/* ─────────────────────────────────────────────────────────────
   Routes
───────────────────────────────────────────────────────────── */

// Stats — must be before /:id so "stats" isn't caught as an id param
router.get("/stats", authMiddleware, getMeetingStats);

// Teachers for a class section (used in meeting form dropdown)
// GET /api/meetings/class-sections/:classSectionId/teachers?academicYearId=
router.get(
  "/class-sections/:classSectionId/teachers",
  authMiddleware,
  getTeachersByClassSection,
);

// List meetings (with filters + pagination)
router.get("/", authMiddleware, getMeetings);

// Create meeting
router.post("/", authMiddleware, createMeeting);

// Get single meeting
router.get("/:id", authMiddleware, getMeetingById);

// Update meeting
router.put("/:id", authMiddleware, updateMeeting);

// Delete meeting
router.delete("/:id", authMiddleware, deleteMeeting);

// Change status (SCHEDULED / COMPLETED / CANCELLED / POSTPONED)
router.patch("/:id/status", authMiddleware, updateMeetingStatus);

// Update meeting notes / minutes (usually after COMPLETED)
router.patch("/:id/notes", authMiddleware, updateMeetingNotes);

// Mark reminder as sent
router.patch("/:id/reminder", authMiddleware, sendMeetingReminder);

// Toggle attendance — staff / parent participant
router.patch(
  "/:id/participants/:participantId/attendance",
  authMiddleware,
  markParticipantAttendance,
);

// Toggle attendance — student
router.patch(
  "/:id/students/:studentId/attendance",
  authMiddleware,
  markStudentAttendance,
);

export default router;
