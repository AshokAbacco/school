// server/src/staffControlls/attendance.controller.js
import { prisma } from "../config/db.js";

/**
 * 1️⃣ Get Classes Assigned To Logged-in Teacher
 *    ✅ FIX: Filters BOTH class teacher & subject teacher sections
 *       by the ACTIVE academic year only.
 *       Past year sections will NOT appear after promotion.
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

    // ── Get the currently active academic year for this school ────────────
    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: teacher.schoolId,
        isActive: true,
      },
    });

    if (!activeAcademicYear) {
      return res.status(404).json({
        success: false,
        message: "No active academic year found for this school",
      });
    }

    const activeAcademicYearId = activeAcademicYear.id;

    // ── a) Sections where teacher is the class teacher (active year only) ─
    const classSections = await prisma.classSectionAcademicYear.findMany({
      where: {
        classTeacherId: teacher.id,
        academicYearId: activeAcademicYearId, // ✅ active year only
        isActive: true,
      },
      include: {
        classSection: true,
        academicYear: true,
      },
    });

    const classTeacherClasses = classSections.map((s) => ({
      classSectionId: s.classSectionId,
      academicYearId: s.academicYearId,
      grade: s.classSection.grade,
      section: s.classSection.section,
      name: s.classSection.name,
      academicYearName: s.academicYear.name,
      role: "CLASS_TEACHER",
    }));

    // ── b) Sections where teacher is assigned to a subject (active year) ──
    //    ✅ FIX: Now filtered by active academic year — old year sections excluded
    const subjectAssignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId: teacher.id,
        academicYearId: activeAcademicYearId, // ✅ active year only
      },
      include: {
        classSection: true,
        academicYear: true,
      },
    });

    const subjectTeacherClasses = subjectAssignments.map((a) => ({
      classSectionId: a.classSectionId,
      academicYearId: a.academicYearId,
      grade: a.classSection.grade,
      section: a.classSection.section,
      name: a.classSection.name,
      academicYearName: a.academicYear.name,
      role: "SUBJECT_TEACHER",
    }));

    // ── Merge & deduplicate (class teacher entry takes priority) ──────────
    const seen = new Set();
    const allClasses = [
      ...classTeacherClasses,
      ...subjectTeacherClasses,
    ].filter((c) => {
      const key = `${c.classSectionId}_${c.academicYearId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json({
      success: true,
      activeAcademicYear: {
        id: activeAcademicYear.id,
        name: activeAcademicYear.name,
      },
      data: allClasses,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch classes" });
  }
};

/**
 * 2️⃣ Get Students For Attendance (with existing records)
 *    ✅ Allows BOTH class teachers AND subject teachers to fetch students.
 *    ✅ Validates that the requested academicYear is the active one.
 */
export const getClassStudentsForAttendance = async (req, res) => {
  try {
    const { classSectionId, academicYearId, date } = req.query;

    if (!classSectionId || !academicYearId || !date) {
      return res.status(400).json({
        success: false,
        message:
          "Missing parameters: classSectionId, academicYearId, date are required",
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

    // ── Guard: only allow active academic year ─────────────────────────────
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: teacher.schoolId,
        isActive: true,
      },
    });

    if (!academicYear) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Requested academic year is not active",
      });
    }

    // ── Check teacher is class teacher OR subject teacher for this section ─
    const [isClassTeacher, isSubjectTeacher] = await Promise.all([
      prisma.classSectionAcademicYear.findFirst({
        where: {
          classSectionId,
          academicYearId,
          classTeacherId: teacher.id,
          isActive: true,
        },
      }),
      prisma.teacherAssignment.findFirst({
        where: { teacherId: teacher.id, classSectionId, academicYearId },
      }),
    ]);

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not assigned to this section",
      });
    }

    // ── Fetch active enrolled students ─────────────────────────────────────
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classSectionId, academicYearId, status: "ACTIVE" },
      include: { student: true },
      // Fetch all, sort in JS for correct numeric ordering + nulls last
    });

    // ── Sort: numeric roll number ASC, nulls last, then alphabetical name ──
    // Prisma's DB sort is lexicographic ("1","10","100") — we need numeric
    enrollments.sort((a, b) => {
      const ra = a.rollNumber != null ? parseInt(a.rollNumber, 10) : null;
      const rb = b.rollNumber != null ? parseInt(b.rollNumber, 10) : null;
      if (!isNaN(ra) && !isNaN(rb)) return ra - rb; // both numeric → sort by value
      if (ra != null) return -1; // only a has roll → a first
      if (rb != null) return 1; // only b has roll → b first
      return (a.student.name || "").localeCompare(b.student.name || ""); // both null → alpha
    });

    // ── Fetch existing attendance for this date ────────────────────────────
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { classSectionId, academicYearId, date: new Date(date) },
    });

    const attendanceMap = new Map(
      attendanceRecords.map((a) => [a.studentId, a]),
    );

    const students = enrollments.map((e, idx) => {
      const record = attendanceMap.get(e.studentId);
      return {
        studentId: e.studentId,
        rollNumber: e.rollNumber ?? null, // null = not yet assigned
        tempIndex: idx + 1, // sequential fallback shown in UI when no roll
        name: e.student.name,
        status: record?.status || null,
        remarks: record?.remarks || "",
      };
    });

    return res.json({ success: true, data: students });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch students" });
  }
};

/**
 * 3️⃣ Mark / Save Attendance
 *    ✅ Allows BOTH class teachers AND subject teachers to mark.
 *    ✅ Validates academicYear is active before saving.
 */
export const markAttendance = async (req, res) => {
  try {
    const { classSectionId, academicYearId, date, records } = req.body;

    if (!classSectionId || !academicYearId || !date || !records) {
      return res.status(400).json({
        success: false,
        message:
          "Missing fields: classSectionId, academicYearId, date, records are required",
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

    // ── Guard: only allow active academic year ─────────────────────────────
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: teacher.schoolId,
        isActive: true,
      },
    });

    if (!academicYear) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: Cannot mark attendance for an inactive academic year",
      });
    }

    // ── Check teacher is class teacher OR subject teacher for this section ─
    const [isClassTeacher, isSubjectTeacher] = await Promise.all([
      prisma.classSectionAcademicYear.findFirst({
        where: {
          classSectionId,
          academicYearId,
          classTeacherId: teacher.id,
          isActive: true,
        },
      }),
      prisma.teacherAssignment.findFirst({
        where: { teacherId: teacher.id, classSectionId, academicYearId },
      }),
    ]);

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not assigned to this section",
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No attendance records provided",
      });
    }

    // ── Upsert all records (PRESENT + ABSENT) ─────────────────────────────
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
    res
      .status(500)
      .json({ success: false, message: "Failed to mark attendance" });
  }
};
