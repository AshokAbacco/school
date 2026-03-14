// server/src/staffControlls/attendance.controller.js
import { prisma } from "../config/db.js";

export const getTeacherClasses = async (req, res) => {
  try {
    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId: teacher.schoolId, isActive: true },
    });

    if (!activeAcademicYear) {
      return res.status(404).json({ success: false, message: "No active academic year found for this school" });
    }

    const activeAcademicYearId = activeAcademicYear.id;

    const classSections = await prisma.classSectionAcademicYear.findMany({
      where: { classTeacherId: teacher.id, academicYearId: activeAcademicYearId, isActive: true },
      include: { classSection: true, academicYear: true },
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

    const subjectAssignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id, academicYearId: activeAcademicYearId },
      include: { classSection: true, academicYear: true },
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

    const seen = new Set();
    const allClasses = [...classTeacherClasses, ...subjectTeacherClasses].filter((c) => {
      const key = `${c.classSectionId}_${c.academicYearId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json({
      success: true,
      activeAcademicYear: { id: activeAcademicYear.id, name: activeAcademicYear.name },
      data: allClasses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch classes" });
  }
};

/**
 * 2️⃣ Get Students For Attendance
 *    ✅ Now includes fatherName from StudentParent (FATHER relation)
 *       so the frontend can display it when duplicate names exist.
 */
export const getClassStudentsForAttendance = async (req, res) => {
  try {
    const { classSectionId, academicYearId, date } = req.query;

    if (!classSectionId || !academicYearId || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing parameters: classSectionId, academicYearId, date are required",
      });
    }

    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId: teacher.schoolId, isActive: true },
    });
    if (!academicYear) {
      return res.status(403).json({ success: false, message: "Access denied: Requested academic year is not active" });
    }

    const [isClassTeacher, isSubjectTeacher] = await Promise.all([
      prisma.classSectionAcademicYear.findFirst({
        where: { classSectionId, academicYearId, classTeacherId: teacher.id, isActive: true },
      }),
      prisma.teacherAssignment.findFirst({
        where: { teacherId: teacher.id, classSectionId, academicYearId },
      }),
    ]);

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({ success: false, message: "Access denied: You are not assigned to this section" });
    }

    // ── Fetch active enrolled students ────────────────────────
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classSectionId, academicYearId, status: "ACTIVE" },
      include: { student: true },
    });

    // ── Sort: numeric roll ASC, nulls last, then alpha name ───
    enrollments.sort((a, b) => {
      const ra = a.rollNumber != null ? parseInt(a.rollNumber, 10) : null;
      const rb = b.rollNumber != null ? parseInt(b.rollNumber, 10) : null;
      if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
      if (ra != null) return -1;
      if (rb != null) return 1;
      return (a.student.name || "").localeCompare(b.student.name || "");
    });

    // ── Fetch father names for ALL enrolled students ──────────
    // We pull FATHER relation from StudentParent and join to Parent for name.
    const studentIds = enrollments.map((e) => e.studentId);

    const fatherLinks = await prisma.studentParent.findMany({
      where: {
        studentId: { in: studentIds },
        relation: "FATHER",
      },
      include: {
        parent: {
          select: { name: true },
        },
      },
    });

    // Map: studentId → father's full name
    const fatherMap = new Map(
      fatherLinks.map((link) => [link.studentId, link.parent?.name || null])
    );

    // ── Fetch existing attendance for this date ───────────────
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { classSectionId, academicYearId, date: new Date(date) },
    });

    const attendanceMap = new Map(attendanceRecords.map((a) => [a.studentId, a]));

    // ── Build response ────────────────────────────────────────
    const students = enrollments.map((e, idx) => {
      const record     = attendanceMap.get(e.studentId);
      const fatherName = fatherMap.get(e.studentId) || null;

      // Derive initials from father name: "Ramesh Kumar Patel" → "R.K.P."
      const fatherInitials = fatherName
        ? fatherName
            .trim()
            .split(/\s+/)
            .map((w) => w[0]?.toUpperCase())
            .filter(Boolean)
            .join(".") + "."
        : null;

      return {
        studentId:      e.studentId,
        rollNumber:     e.rollNumber ?? null,
        tempIndex:      idx + 1,
        name:           e.student.name,
        fatherName,          // ← full father name (e.g. "Ramesh Patel")
        fatherInitials,      // ← initials    (e.g. "R.P.")
        status:         record?.status  || null,
        remarks:        record?.remarks || "",
      };
    });

    return res.json({ success: true, data: students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
};

/**
 * 3️⃣ Mark / Save Attendance
 */
export const markAttendance = async (req, res) => {
  try {
    const { classSectionId, academicYearId, date, records } = req.body;

    if (!classSectionId || !academicYearId || !date || !records) {
      return res.status(400).json({
        success: false,
        message: "Missing fields: classSectionId, academicYearId, date, records are required",
      });
    }

    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId: teacher.schoolId, isActive: true },
    });
    if (!academicYear) {
      return res.status(403).json({ success: false, message: "Access denied: Cannot mark attendance for an inactive academic year" });
    }

    const [isClassTeacher, isSubjectTeacher] = await Promise.all([
      prisma.classSectionAcademicYear.findFirst({
        where: { classSectionId, academicYearId, classTeacherId: teacher.id, isActive: true },
      }),
      prisma.teacherAssignment.findFirst({
        where: { teacherId: teacher.id, classSectionId, academicYearId },
      }),
    ]);

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({ success: false, message: "Access denied: You are not assigned to this section" });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "No attendance records provided" });
    }

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
        })
      )
    );

    return res.json({ success: true, message: "Attendance saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to mark attendance" });
  }
};