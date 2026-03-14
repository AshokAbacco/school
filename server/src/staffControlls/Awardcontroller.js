import { prisma } from "../config/db.js";

// ─── GET: All award types for this school ────────────────────────────────────
export const getAwardTypes = async (req, res) => {
  try {
    const { schoolId } = req.user; // from auth middleware

    const awards = await prisma.award.findMany({
      where: { schoolId },
      orderBy: { category: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
      },
    });

    return res.status(200).json({ success: true, data: awards });
  } catch (error) {
    console.error("getAwardTypes error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET: Students in class teacher's assigned class (current academic year) ─
export const getMyClassStudents = async (req, res) => {
  try {
    const { id: userId, schoolId } = req.user;

    // Find teacher profile
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher profile not found" });
    }

    // Find active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, name: true },
    });

    if (!activeYear) {
      return res
        .status(404)
        .json({ success: false, message: "No active academic year found" });
    }

    // Find class section this teacher is class teacher of
    const classSectionYear = await prisma.classSectionAcademicYear.findFirst({
      where: {
        classTeacherId: teacher.id,
        academicYearId: activeYear.id,
        isActive: true,
      },
      include: {
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
      },
    });

    if (!classSectionYear) {
      return res.status(404).json({
        success: false,
        message: "You are not assigned as a class teacher for this year",
      });
    }

    // Get enrolled students in that class
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        classSectionId: classSectionYear.classSection.id,
        academicYearId: activeYear.id,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            personalInfo: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: { rollNumber: "asc" },
    });

    const students = enrollments.map((e) => ({
      id: e.student.id,
      name: e.student.name,
      rollNumber: e.rollNumber,
      profileImage: e.student.personalInfo?.profileImage ?? null,
      firstName: e.student.personalInfo?.firstName ?? "",
      lastName: e.student.personalInfo?.lastName ?? "",
    }));

    return res.status(200).json({
      success: true,
      data: {
        academicYear: activeYear,
        classSection: classSectionYear.classSection,
        students,
      },
    });
  } catch (error) {
    console.error("getMyClassStudents error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST: Assign a manual award to a student ────────────────────────────────
export const assignAward = async (req, res) => {
  try {
    const { id: userId, schoolId } = req.user;
    const { studentId, awardId, remarks } = req.body;

    // Validate required fields
    if (!studentId || !awardId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId and awardId are required" });
    }

    // Find teacher profile
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher profile not found" });
    }

    // Find active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });

    if (!activeYear) {
      return res
        .status(404)
        .json({ success: false, message: "No active academic year" });
    }

    // Verify teacher is class teacher of a class in this school
    const classSectionYear = await prisma.classSectionAcademicYear.findFirst({
      where: {
        classTeacherId: teacher.id,
        academicYearId: activeYear.id,
        isActive: true,
      },
      select: { classSectionId: true },
    });

    if (!classSectionYear) {
      return res.status(403).json({
        success: false,
        message: "Only class teachers can assign awards",
      });
    }

    // Verify student belongs to this class
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        classSectionId: classSectionYear.classSectionId,
        academicYearId: activeYear.id,
        status: "ACTIVE",
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "Student is not in your class",
      });
    }

    // Verify award belongs to this school
    const award = await prisma.award.findFirst({
      where: { id: awardId, schoolId },
    });

    if (!award) {
      return res
        .status(404)
        .json({ success: false, message: "Award not found" });
    }

    // Check duplicate — same award same student same year
    const existing = await prisma.studentAward.findUnique({
      where: {
        studentId_awardId_academicYearId: {
          studentId,
          awardId,
          academicYearId: activeYear.id,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This student has already received this award this year",
      });
    }

    // Create the award record
    const studentAward = await prisma.studentAward.create({
      data: {
        studentId,
        awardId,
        academicYearId: activeYear.id,
        classSectionId: classSectionYear.classSectionId,
        givenById: req.user.id, // User id (not teacher profile id)
        remarks: remarks ?? null,
      },
      include: {
        student: { select: { name: true } },
        award: { select: { name: true, category: true } },
        academicYear: { select: { name: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Award "${studentAward.award.name}" assigned to ${studentAward.student.name}`,
      data: studentAward,
    });
  } catch (error) {
    console.error("assignAward error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET: Awards given by this teacher (current year) ────────────────────────
export const getAwardsGivenByMe = async (req, res) => {
  try {
    const { id: userId, schoolId } = req.user;

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, name: true },
    });

    if (!activeYear) {
      return res.status(200).json({ success: true, data: [] });
    }

    const awardsList = await prisma.studentAward.findMany({
      where: {
        givenById: userId,
        academicYearId: activeYear.id,
      },
      include: {
        student: {
          select: {
            name: true,
            personalInfo: {
              select: { firstName: true, lastName: true, profileImage: true },
            },
          },
        },
        award: { select: { name: true, category: true } },
        classSection: { select: { name: true, grade: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, data: awardsList });
  } catch (error) {
    console.error("getAwardsGivenByMe error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};