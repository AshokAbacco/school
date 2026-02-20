import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";

import {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  deleteSchool,
} from "../controllers/school.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createSchool);
router.get("/", authMiddleware, getAllSchools);

router.get("/:id", authMiddleware, getSchoolById);

router.put("/:id", authMiddleware, updateSchool);
router.delete("/:id", authMiddleware, deleteSchool);

export default router;
