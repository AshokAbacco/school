//server\src\staffControlls\attendance.controller.js
import { prisma } from "../config/db.js";

/**
 * 1️⃣ Get Classes Assigned To Logged-in Teacher
 */
export const getTeacherClasses = async (req, res) => {
  try {
    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    const sections = await prisma.classSectionAcademicYear.findMany({
      where: {
        classTeacherId: teacher.id,
        isActive: true,
      },
      include: {
        classSection: true,
        academicYear: true,
      },
    });

    const classes = sections.map((s) => ({
      classSectionId: s.classSectionId,
      academicYearId: s.academicYearId,
      grade: s.classSection.grade,
      section: s.classSection.section,
      academicYearName: s.academicYear.name,
    }));

    return res.json({ success: true, data: classes });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch classes" });
  }
};

/**
 * 2️⃣ Get Students For Attendance (with existing records)
 */
export const getClassStudentsForAttendance = async (req, res) => {
  try {
    const { classSectionId, academicYearId, date } = req.query;

    if (!classSectionId || !academicYearId || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing parameters",
      });
    }

    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    // ✅ STRICT: Only class teacher allowed
    const section = await prisma.classSectionAcademicYear.findFirst({
      where: {
        classSectionId,
        academicYearId,
        classTeacherId: teacher.id,
      },
    });

    if (!section) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Not class teacher of this section",
      });
    }

    // Fetch active enrolled students
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        classSectionId,
        academicYearId,
        status: "ACTIVE",
      },
      include: { student: true },
      orderBy: { rollNumber: "asc" },
    });

    // Fetch any existing attendance records for this date
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        classSectionId,
        academicYearId,
        date: new Date(date),
      },
    });

    const attendanceMap = new Map(
      attendanceRecords.map((a) => [a.studentId, a]),
    );

    const students = enrollments.map((e) => {
      const record = attendanceMap.get(e.studentId);
      return {
        studentId: e.studentId,
        rollNumber: e.rollNumber,
        name: e.student.name,
        status: record?.status || null,
        remarks: record?.remarks || "",
      };
    });

    return res.json({ success: true, data: students });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

/**
 * 3️⃣ Mark / Save Attendance
 * ✅ Fixed: validates via classSectionAcademicYear (classTeacher),
 *    not teacherAssignment — consistent with getClassStudentsForAttendance.
 *    Also saves ABSENT records so history is complete.
 */
export const markAttendance = async (req, res) => {
  try {
    const { classSectionId, academicYearId, date, records } = req.body;

    if (!classSectionId || !academicYearId || !date || !records) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    // ✅ FIXED: Check classTeacher (same as fetch endpoint), not teacherAssignment
    const section = await prisma.classSectionAcademicYear.findFirst({
      where: {
        classSectionId,
        academicYearId,
        classTeacherId: teacher.id,
      },
    });

    if (!section) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Not class teacher of this section",
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No attendance records provided",
      });
    }

    // Upsert all records (PRESENT + ABSENT) for a complete attendance history
    await prisma.$transaction(
      records.map((record) =>
        prisma.attendanceRecord.upsert({
          where: {
            studentId_date_academicYearId: {
              studentId: record.studentId,
              date: new Date(date),
              academicYearId,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks || null,
            markedById: userId,
          },
          create: {
            studentId: record.studentId,
            classSectionId,
            academicYearId,
            date: new Date(date),
            status: record.status,
            remarks: record.remarks || null,
            markedById: userId,
          },
        }),
      ),
    );

    return res.json({
      success: true,
      message: "Attendance saved successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
    });
  }
};
