import express from "express";
import {
  getResultsMeta,
  getTeacherClasses,
  getTeacherSubjectsForClass,
  getResultExamGroups,
  getSchedulesByAssessmentGroup,
  getStudentsForSchedule,
  saveMarksForSchedule,
  getResultsList,
  getResultsSummary,
  getAdminUploadOverview,
  deleteMarkEntry,
  exportResultsExcel,
  getStudentReportCard,
  getSubExamGroups,
  updateSchedule,
} from "../staffControlls/resultController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/meta", getResultsMeta);
router.get("/teacher/classes", getTeacherClasses);
router.get(
  "/teacher/classes/:classSectionId/subjects",
  getTeacherSubjectsForClass,
);
router.get("/exams", getResultExamGroups);
router.get(
  "/exams/:assessmentGroupId/schedules",
  getSchedulesByAssessmentGroup,
);
router.get("/schedule/:scheduleId/students", getStudentsForSchedule);
router.post("/schedule/:scheduleId/marks", saveMarksForSchedule);
// Edit Exam: update a schedule in place so its saved marks stay attached
router.put("/schedule/:scheduleId", updateSchedule);
router.get("/list", getResultsList);
router.get("/summary", getResultsSummary);
router.get("/admin/overview", getAdminUploadOverview);
router.delete("/marks/:id", deleteMarkEntry);
router.get("/export/excel", exportResultsExcel);
router.get("/report/:studentId/:assessmentGroupId", getStudentReportCard);
router.get("/sub-exams", getSubExamGroups);
export default router;
