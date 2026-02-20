//server\src\staffRoutes\academicYearRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
    });
    res.json({ academicYears });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
