// server/src/staffRoutes/ExamsRoutes.js

import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  createTerm,
  getTerms,
  updateTerm,
  deleteTerm,
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  publishGroup,
  lockGroup,
  createSchedule,
  getSchedules,
  getSchedulesAdmin,   // ✅ NEW: Admin route (no classSectionId filter)
  deleteSchedule,
  bulkMarksEntry,
  getMarksBySchedule,
  calculateResults,
  getStudentResult,
} from "../staffControlls/ExamsControllers.js";

const router = express.Router();

/* TERM */
router.post("/terms",                 authMiddleware, createTerm);
router.get("/terms/:academicYearId",  authMiddleware, getTerms);
router.put("/terms/:id",              authMiddleware, updateTerm);
router.delete("/terms/:id",           authMiddleware, deleteTerm);

/* GROUP */
router.post("/groups",                authMiddleware, createGroup);
router.get("/groups/:academicYearId", authMiddleware, getGroups);
router.put("/groups/:id",             authMiddleware, updateGroup);
router.delete("/groups/:id",          authMiddleware, deleteGroup);
router.patch("/groups/:id/publish",   authMiddleware, publishGroup);
router.patch("/groups/:id/lock",      authMiddleware, lockGroup);

/* SCHEDULE */
router.post("/schedules",                       authMiddleware, createSchedule);
// ✅ NEW: Admin route — fetches all schedules for a group (no section filter)
router.get("/schedules/admin/:groupId",         authMiddleware, getSchedulesAdmin);
// Student route — filters by classSectionId in JWT
router.get("/schedules/:groupId",               authMiddleware, getSchedules);
router.delete("/schedules/:id",                 authMiddleware, deleteSchedule);

/* MARKS */
router.post("/marks/bulk",            authMiddleware, bulkMarksEntry);
router.get("/marks/:scheduleId",      authMiddleware, getMarksBySchedule);

/* RESULTS */
router.post("/results/calculate/:groupId",                    authMiddleware, calculateResults);
router.get("/results/student/:studentId/:academicYearId",     authMiddleware, getStudentResult);

export default router;