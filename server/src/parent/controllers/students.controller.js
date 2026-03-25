  import { prisma } from "../../config/db.js";

  export const getParentStudents = async (req, res) => {
    try {
      const parentId = req.user?.id;

      if (!parentId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

    const students = await prisma.studentParent.findMany({
    where: { parentId },
  include: {
    student: {
      include: {
    personalInfo: true,
  enrollments: {
    orderBy: {
      createdAt: "desc", // latest enrollment
    },
    take: 1,
  },
        attendanceRecords: true,
        resultSummaries: true,
        enrollments: true,
        activityEnrollments: true,
      },
    },
  },
  });
  
  const result = students.map((link) => {
    const s = link.student;
    const enrollment = s.enrollments?.[0];

    return {
      ...s,
      personalInfo: s.personalInfo,

      // ✅ NEW FIELDS
      admissionNumber: enrollment?.admissionNumber || null,
      rollNumber: enrollment?.rollNumber || null,

      // (keep your previous stats if added)
      attendance: s.attendanceRecords?.length || 0,
      gpa: s.resultSummaries?.[0]?.gpa || 0,
      subjects: s.enrollments?.length || 0,
      activities: s.activityEnrollments?.length || 0,
    };
  });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: "Failed to fetch students",
      });
    }
  };