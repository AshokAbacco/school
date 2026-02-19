// server/src/staffRoutes/subjectRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../staffControlls/subjectController.js";

const router = express.Router();
router.get("/", authMiddleware, getSubjects);
router.post("/", authMiddleware, createSubject);
router.put("/:id", authMiddleware, updateSubject);
router.delete("/:id", authMiddleware, deleteSubject);
export default router;
