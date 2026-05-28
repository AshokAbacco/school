import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js"; // ✅ this one works
import { getParentStudents } from "../controllers/students.controller.js";

const router = Router();
router.use(authMiddleware);
router.get("/", getParentStudents);

export default router;