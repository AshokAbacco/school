// server/src/staffRoutes/adminCurriculumRoutes.js

import express from "express";
import { getAdminCurriculumOverview } from "../staffControlls/adminCurriculumController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// GET — admin sees all subjects, sections, syllabus, progress
router.get("/overview", getAdminCurriculumOverview);

export default router;
