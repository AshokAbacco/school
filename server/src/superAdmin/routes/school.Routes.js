// src/superAdmin/routes/school.Routes.js
import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";

import {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  deleteSchool,
  getSchoolUsage,   // ✅ new
} from "../controllers/school.controller.js";

const router = express.Router();

// ⚠️ Static routes MUST come before /:id — otherwise Express
// matches "usage" as the :id param and hits the wrong handler.
router.get("/usage", authMiddleware, getSchoolUsage);  // ✅ FIRST

router.post("/",     authMiddleware, createSchool);
router.get("/",      authMiddleware, getAllSchools);
router.get("/:id",   authMiddleware, getSchoolById);
router.put("/:id",   authMiddleware, updateSchool);
router.delete("/:id",authMiddleware, deleteSchool);

export default router;