// server/src/staffRoutes/superAdminExams.routes.js

import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getSuperAdminAcademicYears,
  getSuperAdminClassSections,
  getSuperAdminGroups,
  getSuperAdminResultsDetail,
  getSuperAdminResultsExport,
} from "../staffControlls/superAdminExams.controller.js";

const router = express.Router();

router.use(authMiddleware);

// Academic Years across all schools
router.get("/academic-years", getSuperAdminAcademicYears);

// Class Sections across all schools
router.get("/class-sections", getSuperAdminClassSections);

// Assessment Groups (exams)
// GET /api/superadmin-exams/groups?academicYearId=xxx
router.get("/groups", getSuperAdminGroups);

// Results — paginated, filtered detail view
// GET /api/superadmin-exams/results/detail?assessmentGroupId=xxx&...filters
router.get("/results/detail", getSuperAdminResultsDetail);

// Results — full data for Excel export (no pagination)
// GET /api/superadmin-exams/results/export?assessmentGroupId=xxx&...filters
router.get("/results/export", getSuperAdminResultsExport);

export default router;