// server/src/staffRoutes/classSectionRoutes.js — UPDATED
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getClassSections,
  getClassSectionById,
  createClassSection,
  activateClassForYear,
  deleteClassSection,
  assignSubjectToClass,
  removeSubjectFromClass,
  assignTeacherToSubject,
  removeTeacherAssignment,
} from "../staffControlls/classSectionController.js";
import {
  getTimetableConfig,
  saveTimetableConfig,
} from "../staffControlls/timetableConfigController.js";
import {
  getTimetableEntries,
  saveTimetableEntries,
  deleteTimetableEntry,
} from "../staffControlls/timetableEntryController.js";
import {
  getExtraClasses,
  getAllExtraClassesOverview,
  createExtraClass,
  updateExtraClass,
  deleteExtraClass,
} from "../staffControlls/extraClassController.js";
import { getTeachersByClassSection } from "../staffControlls/meetingController.js";

import {
  getStreams,
  createStream,
  updateStream,
  deleteStream,
  createCombination, // ← NEW
  updateCombination, // ← NEW
  deleteCombination, // ← NEW
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../staffControlls/streamCourseController.js";
import {
  getPromotionConfig,
  getPromotionPreview,
  runPromotion,
  getPendingReadmission,
  readmitStudent,
  getPromotionLogs,
} from "../staffControlls/promotionController.js";

const router = express.Router();

// ── TIMETABLE CONFIG  (must be before /:id)
router.get("/timetable/config", authMiddleware, getTimetableConfig);
router.post("/timetable/config", authMiddleware, saveTimetableConfig);

// ── EXTRA CLASSES OVERVIEW  (must be before /:id)
router.get(
  "/extra-classes/overview",
  authMiddleware,
  getAllExtraClassesOverview,
);

// ── CLASS SECTION CRUD
router.get("/", authMiddleware, getClassSections);
router.post("/", authMiddleware, createClassSection);
router.get(
  "/:classSectionId/teachers",
  authMiddleware,
  getTeachersByClassSection,
);
router.get("/:id", authMiddleware, getClassSectionById);
router.delete("/:id", authMiddleware, deleteClassSection);
router.post("/:id/activate", authMiddleware, activateClassForYear);
router.post("/:id/class-subjects", authMiddleware, assignSubjectToClass);
router.delete(
  "/:id/class-subjects/:classSubjectId",
  authMiddleware,
  removeSubjectFromClass,
);
router.post("/:id/teacher-assignments", authMiddleware, assignTeacherToSubject);
router.delete(
  "/:id/teacher-assignments/:assignmentId",
  authMiddleware,
  removeTeacherAssignment,
);

// ── TIMETABLE ENTRIES
router.get("/:id/timetable", authMiddleware, getTimetableEntries);
router.post("/:id/timetable", authMiddleware, saveTimetableEntries);
router.delete(
  "/:id/timetable/entry/:entryId",
  authMiddleware,
  deleteTimetableEntry,
);

// ── EXTRA CLASSES (per section)
router.get("/:id/extra-classes", authMiddleware, getExtraClasses);
router.post("/:id/extra-classes", authMiddleware, createExtraClass);
router.put(
  "/:id/extra-classes/:extraClassId",
  authMiddleware,
  updateExtraClass,
);
router.delete(
  "/:id/extra-classes/:extraClassId",
  authMiddleware,
  deleteExtraClass,
);

export default router;

// ─────────────────────────────────────────────────────────────────────────────
//  STREAMS ROUTER
// ─────────────────────────────────────────────────────────────────────────────
export const streamsRouter = express.Router();
streamsRouter.get("/", authMiddleware, getStreams);
streamsRouter.post("/", authMiddleware, createStream);
streamsRouter.put("/:id", authMiddleware, updateStream);
streamsRouter.delete("/:id", authMiddleware, deleteStream);

// ── Stream Combinations (PCMB, PCMC etc.) ── NEW
streamsRouter.post(
  "/:streamId/combinations",
  authMiddleware,
  createCombination,
);
streamsRouter.put(
  "/:streamId/combinations/:combinationId",
  authMiddleware,
  updateCombination,
);
streamsRouter.delete(
  "/:streamId/combinations/:combinationId",
  authMiddleware,
  deleteCombination,
);

// ─────────────────────────────────────────────────────────────────────────────
//  COURSES ROUTER
// ─────────────────────────────────────────────────────────────────────────────
export const coursesRouter = express.Router();
coursesRouter.get("/", authMiddleware, getCourses);
coursesRouter.post("/", authMiddleware, createCourse);
coursesRouter.put("/:id", authMiddleware, updateCourse);
coursesRouter.delete("/:id", authMiddleware, deleteCourse);
coursesRouter.post("/:courseId/branches", authMiddleware, createBranch);
coursesRouter.put(
  "/:courseId/branches/:branchId",
  authMiddleware,
  updateBranch,
);
coursesRouter.delete(
  "/:courseId/branches/:branchId",
  authMiddleware,
  deleteBranch,
);

// ─────────────────────────────────────────────────────────────────────────────
//  PROMOTION ROUTER
// ─────────────────────────────────────────────────────────────────────────────
export const promotionRouter = express.Router();
promotionRouter.get("/config", authMiddleware, getPromotionConfig);
promotionRouter.post("/preview", authMiddleware, getPromotionPreview);
promotionRouter.post("/run", authMiddleware, runPromotion);
promotionRouter.get(
  "/pending-readmission",
  authMiddleware,
  getPendingReadmission,
);
promotionRouter.post("/readmit/:studentId", authMiddleware, readmitStudent);
promotionRouter.get("/logs", authMiddleware, getPromotionLogs);
