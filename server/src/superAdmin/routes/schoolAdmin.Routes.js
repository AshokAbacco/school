// server/src/superAdmin/routes/schoolAdmin.Routes.js
import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import {
  getSchoolAdmins,
  createSchoolAdmin,
  updateSchoolAdmin,
  deleteSchoolAdmin,
} from "../controllers/schoolAdmin.controller.js";

const router = express.Router();

router.get("/",    authMiddleware, getSchoolAdmins);
router.post("/",   authMiddleware, createSchoolAdmin);
router.patch("/:id", authMiddleware, updateSchoolAdmin);
router.delete("/:id", authMiddleware, deleteSchoolAdmin);

export default router;