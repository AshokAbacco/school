import express from "express";
import {
  getAwardTypes,
  getMyClassStudents,
  assignAward,
  getAwardsGivenByMe,
} from "../staffControlls/Awardcontroller.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication and TEACHER role
router.use(authMiddleware);

// GET  /api/staff/awards/types          → all award types for this school
router.get("/types", getAwardTypes);

// GET  /api/staff/awards/my-class       → students in class teacher's class
router.get("/my-class", getMyClassStudents);

// GET  /api/staff/awards/given-by-me    → awards this teacher has assigned
router.get("/given-by-me", getAwardsGivenByMe);

// POST /api/staff/awards/assign         → assign an award to a student
router.post("/assign", assignAward);

export default router;