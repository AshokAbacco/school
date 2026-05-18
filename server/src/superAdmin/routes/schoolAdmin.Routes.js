// server/src/superAdmin/routes/schoolAdmin.Routes.js
import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import {
  getSchoolAdmins,
  createSchoolAdmin,
  updateSchoolAdmin,
  deleteSchoolAdmin,
  getAdminUsage,
} from "../controllers/schoolAdmin.controller.js";

const router = express.Router();

// ⚠️ IMPORTANT: Static routes MUST come before dynamic /:id routes.
// If /usage is placed after /:id, Express matches "usage" as the :id
// param and the request never reaches getAdminUsage.

router.get("/usage", authMiddleware, getAdminUsage);    // ✅ static — must be FIRST
router.get("/",      authMiddleware, getSchoolAdmins);
router.post("/",     authMiddleware, createSchoolAdmin);
router.patch("/:id", authMiddleware, updateSchoolAdmin);
router.delete("/:id",authMiddleware, deleteSchoolAdmin);

export default router;