// server/src/staffControlls/adminHolidayController.js
import { prisma } from "../config/db.js";

// ── GET /api/admin/holidays ───────────────────────────────────────────────────
// Returns all holidays for the school.
// Optional query: ?type=GOVERNMENT|SCHOOL  &academicYearId=...
export const getHolidays = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { type, academicYearId } = req.query;

    const where = { schoolId };
    if (type) where.type = type;
    if (academicYearId) where.academicYearId = academicYearId;

    const holidays = await prisma.schoolHoliday.findMany({
      where,
      include: {
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: [{ type: "asc" }, { month: "asc" }, { day: "asc" }, { startDate: "asc" }],
    });

    return res.json(holidays);
  } catch (error) {
    console.error("getHolidays error:", error);
    return res.status(500).json({ message: "Failed to fetch holidays" });
  }
};


// ── GET /api/admin/holidays/check?date=YYYY-MM-DD ────────────────────────────
export const checkHoliday = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { date } = req.query;

    if (!date) return res.status(400).json({ message: "date query param required." });

    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();

    // 1. Check Government holiday
    const govHoliday = await prisma.schoolHoliday.findFirst({
      where: { schoolId, type: "GOVERNMENT", month, day },
    });
    if (govHoliday) {
      return res.json({ holiday: { ...govHoliday, academicYear: null } });
    }

    // 2. Check School holiday for active year
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (activeYear) {
      const schoolHoliday = await prisma.schoolHoliday.findFirst({
        where: {
          schoolId,
          type: "SCHOOL",
          academicYearId: activeYear.id,
          startDate: { lte: d },
          OR: [{ endDate: null }, { endDate: { gte: d } }],
        },
        include: { academicYear: { select: { id: true, name: true } } },
      });
      if (schoolHoliday) return res.json({ holiday: schoolHoliday });
    }

    return res.json({ holiday: null });
  } catch (error) {
    console.error("checkHoliday error:", error);
    return res.status(500).json({ message: "Failed to check holiday" });
  }
};
// ── POST /api/admin/holidays ──────────────────────────────────────────────────
// Create a new holiday.
// Body for GOVERNMENT: { title, description?, type:"GOVERNMENT", month, day }
// Body for SCHOOL:     { title, description?, type:"SCHOOL", startDate, endDate?, academicYearId }
export const createHoliday = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const createdById = req.user.id;
    const { title, description, type, month, day, startDate, endDate, academicYearId } = req.body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!title?.trim()) return res.status(400).json({ message: "Title is required." });
    if (!type || !["GOVERNMENT", "SCHOOL"].includes(type)) {
      return res.status(400).json({ message: "type must be GOVERNMENT or SCHOOL." });
    }

    if (type === "GOVERNMENT") {
      if (!month || !day) {
        return res.status(400).json({ message: "month and day are required for GOVERNMENT holidays." });
      }
      const m = Number(month);
      const d = Number(day);
      if (m < 1 || m > 12) return res.status(400).json({ message: "month must be 1–12." });
      if (d < 1 || d > 31) return res.status(400).json({ message: "day must be 1–31." });
    } else {
      if (!startDate) return res.status(400).json({ message: "startDate is required for SCHOOL holidays." });
      if (!academicYearId) return res.status(400).json({ message: "academicYearId is required for SCHOOL holidays." });

      // Verify academic year belongs to this school
      const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } });
      if (!year) return res.status(404).json({ message: "Academic year not found." });
    }

    // ── Build data ────────────────────────────────────────────────────────
    const data = {
      title: title.trim(),
      description: description?.trim() || null,
      type,
      school: { connect: { id: schoolId } },
      createdBy: { connect: { id: createdById } },
    };

    if (type === "GOVERNMENT") {
      data.month = Number(month);
      data.day = Number(day);
    } else {
      data.startDate = new Date(startDate);
      data.endDate = endDate ? new Date(endDate) : null;
      data.academicYear = { connect: { id: academicYearId } };
    }

    const holiday = await prisma.schoolHoliday.create({
      data,
      include: { academicYear: { select: { id: true, name: true } } },
    });

    return res.status(201).json(holiday);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "A government holiday already exists for that month/day." });
    }
    console.error("createHoliday error:", error);
    return res.status(500).json({ message: "Failed to create holiday" });
  }
};

// ── PUT /api/admin/holidays/:id ───────────────────────────────────────────────
export const updateHoliday = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { title, description, type, month, day, startDate, endDate, academicYearId } = req.body;

    const existing = await prisma.schoolHoliday.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ message: "Holiday not found." });

    if (!title?.trim()) return res.status(400).json({ message: "Title is required." });
    if (!type || !["GOVERNMENT", "SCHOOL"].includes(type)) {
      return res.status(400).json({ message: "type must be GOVERNMENT or SCHOOL." });
    }

    if (type === "GOVERNMENT") {
      if (!month || !day) {
        return res.status(400).json({ message: "month and day are required for GOVERNMENT holidays." });
      }
    } else {
      if (!startDate) return res.status(400).json({ message: "startDate is required for SCHOOL holidays." });
      if (!academicYearId) return res.status(400).json({ message: "academicYearId is required for SCHOOL holidays." });
      const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } });
      if (!year) return res.status(404).json({ message: "Academic year not found." });
    }

    const data = {
      title: title.trim(),
      description: description?.trim() || null,
      type,
      // Clear fields that don't apply to the selected type
      month: type === "GOVERNMENT" ? Number(month) : null,
      day: type === "GOVERNMENT" ? Number(day) : null,
      startDate: type === "SCHOOL" ? new Date(startDate) : null,
      endDate: type === "SCHOOL" && endDate ? new Date(endDate) : null,
      academicYearId: type === "SCHOOL" ? academicYearId : null,
    };

    const updated = await prisma.schoolHoliday.update({
      where: { id },
      data,
      include: { academicYear: { select: { id: true, name: true } } },
    });

    return res.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "A government holiday already exists for that month/day." });
    }
    console.error("updateHoliday error:", error);
    return res.status(500).json({ message: "Failed to update holiday" });
  }
};

// ── DELETE /api/admin/holidays/:id ────────────────────────────────────────────
export const deleteHoliday = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const existing = await prisma.schoolHoliday.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ message: "Holiday not found." });

    await prisma.schoolHoliday.delete({ where: { id } });
    return res.json({ message: "Holiday deleted successfully." });
  } catch (error) {
    console.error("deleteHoliday error:", error);
    return res.status(500).json({ message: "Failed to delete holiday" });
  }
};

// ── UTILITY: isHoliday(date, schoolId) ───────────────────────────────────────
// Use this helper inside attendance controllers to check if a date is a holiday.
// Returns true if the given date is a government or school holiday.
export const isHoliday = async (date, schoolId, academicYearId) => {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();

  // Check government holiday
  const govHoliday = await prisma.schoolHoliday.findFirst({
    where: { schoolId, type: "GOVERNMENT", month, day },
  });
  if (govHoliday) return true;

  // Check school holiday (date falls within startDate–endDate range)
  if (academicYearId) {
    const schoolHoliday = await prisma.schoolHoliday.findFirst({
      where: {
        schoolId,
        type: "SCHOOL",
        academicYearId,
        startDate: { lte: d },
        OR: [{ endDate: null }, { endDate: { gte: d } }],
      },
    });
    if (schoolHoliday) return true;
  }

  return false;
};