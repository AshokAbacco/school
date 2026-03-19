// server/src/parent/routes/certificatesRoutes.js
import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { getCertificates } from "../controllers/Certificatescontroller.js";

const router = Router();
router.use(authMiddleware);

// GET /api/parent/certificates?studentId=<uuid>
router.get("/", getCertificates);

export default router;