// server/src/staffControlls/adminAttendanceController.js
import { prisma } from "../config/db.js";
import cacheService from "../utils/cacheService.js";

// ── GET /api/admin/attendance ─────────────────────────────────────────────────
export const getAttendance = async (req, res) => {
  try {
    const { classSectionId, date } = req.query;
    const schoolId = req.user.schoolId;

    const cacheKey = await cacheService.buildKey(
      schoolId,
      `attendance:list:${classSectionId || "all"}:${date || "all"}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear) {
      return res.status(404).json({ message: "No active academic year found" });
    }

    const filters = {
      academicYearId: activeYear.id,
      classSection: { schoolId },
    };
    if (classSectionId) filters.classSectionId = classSectionId;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end   = new Date(date); end.setHours(23, 59, 59, 999);
      filters.date = { gte: start, lte: end };
    }

    const attendance = await prisma.attendanceRecord.findMany({
      where: filters,
      include: {
        student: {
          select: {
            id: true,
            personalInfo: { select: { firstName: true, lastName: true } },
          },
        },
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
      },
      orderBy: [{ classSection: { grade: "asc" } }, { date: "desc" }],
    });

    const normalised = attendance.map((r) => ({
      ...r,
      student: {
        ...r.student,
        name: [r.student?.personalInfo?.firstName, r.student?.personalInfo?.lastName]
          .filter(Boolean).join(" ") || "Unknown Student",
      },
    }));

    await cacheService.set(cacheKey, normalised);
    return res.json(normalised);
  } catch (error) {
    console.error("getAttendance error:", error);
    return res.status(500).json({ message: "Failed to fetch attendance" });
  }
};

// ── GET /api/admin/attendance/summary ────────────────────────────────────────
export const getAttendanceSummary = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split("T")[0];

    const cacheKey = await cacheService.buildKey(
      schoolId,
      `attendance:summary:${dateStr}`
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear) {
      return res.status(404).json({ message: "No active academic year found" });
    }

    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(targetDate); end.setHours(23, 59, 59, 999);

    const sectionLinks = await prisma.classSectionAcademicYear.findMany({
      where: { academicYearId: activeYear.id, isActive: true },
      include: {
        classSection: {
          select: { id: true, grade: true, section: true, name: true },
        },
      },
    });

    const summaries = await Promise.all(
      sectionLinks.map(async (link) => {
        const sectionId = link.classSectionId;

        const [totalStudents, attendanceRecords] = await Promise.all([
          prisma.studentEnrollment.count({
            where: { classSectionId: sectionId, academicYearId: activeYear.id, status: "ACTIVE" },
          }),
          prisma.attendanceRecord.findMany({
            where: {
              classSectionId: sectionId,
              academicYearId: activeYear.id,
              date: { gte: start, lte: end },
            },
            select: { status: true },
          }),
        ]);

        const present = attendanceRecords.filter((r) => r.status === "PRESENT").length;
        const absent  = attendanceRecords.filter((r) => r.status === "ABSENT").length;
        const marked  = attendanceRecords.length;

        return {
          classSectionId: sectionId,
          grade: link.classSection.grade,
          section: link.classSection.section,
          name: link.classSection.name,
          totalStudents,
          present,
          absent,
          marked,
          attendanceRate: marked > 0 ? Math.round((present / marked) * 100) : null,
        };
      })
    );

    const payload = {
      academicYear: { id: activeYear.id, name: activeYear.name },
      date: dateStr,
      summaries,
    };

    await cacheService.set(cacheKey, payload);
    return res.json(payload);
  } catch (error) {
    console.error("getAttendanceSummary error:", error);
    return res.status(500).json({ message: "Failed to fetch attendance summary" });
  }
};