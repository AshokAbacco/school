//server\src\staffControlls\adminAttendanceController.js
import { prisma } from "../config/db.js";

export const getAttendance = async (req, res) => {
  try {
    const { classSectionId, date } = req.query;

    const filters = {
      academicYearId: req.user.academicYearId,
      classSection: {
        schoolId: req.user.schoolId,
      },
    };

    if (classSectionId) {
      filters.classSectionId = classSectionId;
    }

    if (date) {
      filters.date = new Date(date);
    }

    const attendance = await prisma.attendanceRecord.findMany({
      where: filters,
      include: {
        student: {
          select: { id: true, name: true },
        },
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
      },
      orderBy: [
        { classSection: { grade: "asc" } },
        { student: { name: "asc" } },
      ],
    });

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
};
