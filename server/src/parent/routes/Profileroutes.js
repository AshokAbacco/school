// server/src/parent/routes/profileRoutes.js
import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { getProfile, getDocuments } from "../controllers/Profilecontroller.js";

const router = Router();
router.use(authMiddleware);

// GET /api/parent/profile?studentId=<uuid>
router.get("/",           getProfile);

// GET /api/parent/profile/documents?studentId=<uuid>
router.get("/documents",  getDocuments);

export default router;