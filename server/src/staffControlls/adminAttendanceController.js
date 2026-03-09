// server/src/staffControlls/adminAttendanceController.js
import { prisma } from "../config/db.js";

// ── GET /api/admin/attendance ─────────────────────────────────────────────────
// ✅ FIX 1: Uses active academic year from DB (req.user.academicYearId was always undefined)
// ✅ FIX 2: student name built from personalInfo since Student has no top-level name
export const getAttendance = async (req, res) => {
  try {
    const { classSectionId, date } = req.query;
    const schoolId = req.user.schoolId;

    // Always resolve active year from DB
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
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
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

    // Normalise: give every record a student.name string
    const normalised = attendance.map((r) => ({
      ...r,
      student: {
        ...r.student,
        name:
          [
            r.student?.personalInfo?.firstName,
            r.student?.personalInfo?.lastName,
          ]
            .filter(Boolean)
            .join(" ") || "Unknown Student",
      },
    }));

    return res.json(normalised);
  } catch (error) {
    console.error("getAttendance error:", error);
    return res.status(500).json({ message: "Failed to fetch attendance" });
  }
};

// ── GET /api/admin/attendance/summary?date=YYYY-MM-DD ────────────────────────
// Returns per-section: totalStudents, present, absent, marked, attendanceRate
// Also returns grade-level aggregates and activeAcademicYear info
// Used by grade cards + section cards to show live stats
export const getAttendanceSummary = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { date } = req.query;

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear) {
      return res.status(404).json({ message: "No active academic year found" });
    }

    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    // All active section links for this year
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
            where: {
              classSectionId: sectionId,
              academicYearId: activeYear.id,
              status: "ACTIVE",
            },
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

        const present = attendanceRecords.filter(
          (r) => r.status === "PRESENT",
        ).length;
        const absent = attendanceRecords.filter(
          (r) => r.status === "ABSENT",
        ).length;
        const marked = attendanceRecords.length;

        return {
          classSectionId: sectionId,
          grade: link.classSection.grade,
          section: link.classSection.section,
          name: link.classSection.name,
          totalStudents,
          present,
          absent,
          marked,
          attendanceRate:
            marked > 0 ? Math.round((present / marked) * 100) : null,
        };
      }),
    );

    return res.json({
      academicYear: { id: activeYear.id, name: activeYear.name },
      date: targetDate.toISOString().split("T")[0],
      summaries,
    });
  } catch (error) {
    console.error("getAttendanceSummary error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch attendance summary" });
  }
};
