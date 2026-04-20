// server/src/staffRoutes/teacherAssignmentRoute.js

import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  upload,
  getDropdownSubjects,
  getDropdownAcademicYears,
  getDropdownClassSections,
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  togglePublish,
} from "../staffControlls/teacherAssignmentController.js";

const router = Router();
router.use(authMiddleware);

// ── Dropdown helpers ──────────────────────────────────────────
router.get("/dropdowns/subjects",       getDropdownSubjects);
router.get("/dropdowns/academic-years", getDropdownAcademicYears);
router.get("/dropdowns/class-sections", getDropdownClassSections);

// ── CRUD ──────────────────────────────────────────────────────
router.get("/",    getAssignments);
router.get("/:id", getAssignmentById);

// multer: accept up to 10 files in the "files" field
router.post(
  "/",
  upload.array("files", 10),
  createAssignment,
);

router.put(
  "/:id",
  upload.array("files", 10),
  updateAssignment,
);

router.delete("/:id",         deleteAssignment);
router.patch("/:id/publish",  togglePublish);

export default router;

// ── Register in staff.js ──────────────────────────────────────
// import teacherAssignmentRoute from "./staffRoutes/teacherAssignmentRoute.js";
// staff.use("/api/teacher/assignments", teacherAssignmentRoute);