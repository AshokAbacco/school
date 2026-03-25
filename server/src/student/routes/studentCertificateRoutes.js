// server/src/studentRoutes/studentCertificateRoutes.js
//
// Wire up in student.js:
//   import studentCertificateRoutes from "./studentRoutes/studentCertificateRoutes.js";
//   student.use("/api/student/certificates", studentCertificateRoutes);

import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { listStudentCertificates } from "../controllers/studentCertificateController.js";

const router = Router();
router.use(authMiddleware);

// GET /api/student/certificates
router.get("/", listStudentCertificates);

export default router;