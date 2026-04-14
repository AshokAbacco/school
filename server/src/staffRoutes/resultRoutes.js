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
  getResultsSummary,   // ← NEW
  deleteMarkEntry,
  exportResultsExcel 
} from "../staffControlls/resultController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/meta",                                       getResultsMeta);
router.get("/teacher/classes",                            getTeacherClasses);
router.get("/teacher/classes/:classSectionId/subjects",   getTeacherSubjectsForClass);
router.get("/exams",                                      getResultExamGroups);
router.get("/exams/:assessmentGroupId/schedules",         getSchedulesByAssessmentGroup);
router.get("/schedule/:scheduleId/students",              getStudentsForSchedule);
router.post("/schedule/:scheduleId/marks",                saveMarksForSchedule);
router.get("/list",                                       getResultsList);
router.get("/summary",                                    getResultsSummary);  // ← NEW
router.delete("/marks/:id",                               deleteMarkEntry);
router.get("/export/excel",                               exportResultsExcel);
export default router;