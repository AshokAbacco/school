import express from "express";
import { getStudentCertificates } from "../controllers/certificateController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
const router = express.Router();

router.use(authMiddleware);

// GET /api/student/certificates   → all awards + certificates for logged-in student
router.get("/", getStudentCertificates);

export default router;

// ── In your main student server / app.js, mount like: ─────────────────────────
// import certificateRoutes from "./student/routes/certificateRoutes.js";
// app.use("/api/student/certificates", certificateRoutes);