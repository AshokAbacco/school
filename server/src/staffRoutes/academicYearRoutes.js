// server/src/staffRoutes/academicYearRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/academic-years ───────────────────────────────────────────────────
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

// ── POST /api/academic-years ──────────────────────────────────────────────────
// Now accepts: { name, startDate, endDate }
router.post("/", authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    let { name, startDate, endDate } = req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ message: "Academic year name is required" });
    }

    // ── Derive dates if not explicitly provided in the request ────────────────
    if (!startDate || !endDate) {
      const YEAR_REGEX = /^(\d{2,4})[-–](\d{2,4})$/;
      const match = name.trim().match(YEAR_REGEX);

      if (!match) {
        return res.status(400).json({
          message:
            'Invalid name format. If not providing dates, use "2025-26" or "2025-2026"',
        });
      }

      const startYearRaw = match[1];
      const endYearRaw = match[2];
      const startYear = parseInt(startYearRaw, 10);

      const endYear =
        endYearRaw.length === 2
          ? Math.floor(startYear / 100) * 100 + parseInt(endYearRaw, 10)
          : parseInt(endYearRaw, 10);

      // Defaulting to your seed/standard school cycle if dates are missing
      startDate = startDate || new Date(`${startYear}-06-01`);
      endDate = endDate || new Date(`${endYear}-03-31`);
    } else {
      // Use the dates provided by the UI
      startDate = new Date(startDate);
      endDate = new Date(endDate);
    }

    // ── Validation ───────────────────────────────────────────────────────────
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format provided" });
    }

    if (startDate >= endDate) {
      return res
        .status(400)
        .json({ message: "Start date must be before end date" });
    }

    // ── Duplicate check ──────────────────────────────────────────────────────
    const exists = await prisma.academicYear.findFirst({
      where: { schoolId, name: name.trim() },
    });
    if (exists) {
      return res.status(409).json({
        message: `Academic year "${name.trim()}" already exists`,
      });
    }

    // ── Auto-set active status ───────────────────────────────────────────────
    const count = await prisma.academicYear.count({ where: { schoolId } });
    const isActive = count === 0;

    const academicYear = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        startDate,
        endDate,
        isActive,
        schoolId,
      },
    });

    return res.status(201).json({ academicYear });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
