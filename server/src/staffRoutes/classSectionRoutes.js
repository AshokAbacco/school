// server/src/staffRoutes/classSectionRoutes.js
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

const router = express.Router();

// ── TIMETABLE CONFIG  (must be before /:id to avoid "timetable" matching as :id)
router.get("/timetable/config", authMiddleware, getTimetableConfig);
router.post("/timetable/config", authMiddleware, saveTimetableConfig);

// ── CLASS SECTION CRUD
router.get("/", authMiddleware, getClassSections);
router.post("/", authMiddleware, createClassSection);
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

// ── TIMETABLE ENTRIES  (after /:id routes, uses mergeParams via nested approach)
router.get("/:id/timetable", authMiddleware, getTimetableEntries);
router.post("/:id/timetable", authMiddleware, saveTimetableEntries);
router.delete(
  "/:id/timetable/entry/:entryId",
  authMiddleware,
  deleteTimetableEntry,
);

export default router;
