//server\src\staffControlls\tutorialController.js
import { prisma } from "../config/db.js";

// ======================================================
// GET ALL
// ======================================================

export const getTutorialTeachers =
  async (req, res) => {
    try {

      const schoolId =
        req.user.schoolId;

      const tutorials =
        await prisma.teacherTutorialProfile.findMany({
          where: {
            schoolId,
            isActive: true,
          },

          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                designation: true,
                qualification: true,
                experienceYears: true,
                profileImage: true,
                status: true,
              },
            },
          },

          orderBy: [
            {
              rankingScore: "desc",
            },

            {
              adminPriority: "desc",
            },
          ],
        });

      return res.json({
        success: true,
        data: tutorials,
      });

    } catch (error) {

      console.error(
        "[getTutorialTeachers]",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch tutorial teachers",
      });
    }
  };

// ======================================================
// GET SINGLE
// ======================================================

export const getTutorialTeacherById =
  async (req, res) => {
    try {
      const schoolId =
        req.user.schoolId;

      const tutorial =
        await prisma.teacherTutorialProfile.findFirst(
          {
            where: {
              id: req.params.id,
              schoolId,
            },

            include: {
              teacher: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  designation: true,
                  qualification: true,
                  experienceYears: true,
                  profileImage: true,
                  status: true,
                },
              },
            },
          }
        );

      if (!tutorial) {
        return res.status(404).json({
          success: false,
          message:
            "Tutorial teacher not found",
        });
      }

      return res.json({
        success: true,
        data: tutorial,
      });
    } catch (error) {
      console.error(
        "[getTutorialTeacherById]",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch tutorial teacher",
      });
    }
  };

// ======================================================
// CREATE
// ======================================================

export const createTutorialTeacher = async (req, res) => {
  try {
    const schoolId = req.user.schoolId; // ✅ read from auth token, not body

    const {
      teacherId,
      bio,
      mode,
      monthlyFee,
      grades,
      subjects,
      capacity,
      rating,
      passPercentage,
      averageStudentScore,
      adminPriority,
    } = req.body;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "teacherId is required",
      });
    }

    // 🔍 check existing profile
    const existing = await prisma.teacherTutorialProfile.findFirst({
      where: { teacherId, schoolId, isActive: true },
    });

    // ✅ UPDATE if exists
    if (existing) {
      const updated = await prisma.teacherTutorialProfile.update({
        where: { id: existing.id },
        data: {
          bio,
          mode,
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
          grades: grades || [],
          subjects: subjects || [],
          capacity: capacity ? parseInt(capacity) : null,
          rating: rating ? parseFloat(rating) : null,
          passPercentage: passPercentage ? parseFloat(passPercentage) : null,
          averageStudentScore: averageStudentScore ? parseFloat(averageStudentScore) : null,
          adminPriority: adminPriority ? parseInt(adminPriority) : 0,
        },
      });

      return res.json({
        success: true,
        message: "Tutorial profile updated",
        data: updated,
      });
    }

    // ✅ CREATE if not exists
    const created = await prisma.teacherTutorialProfile.create({
      data: {
        teacherId,
        schoolId,
        bio,
        mode,
        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
        grades: grades || [],
        subjects: subjects || [],
        capacity: capacity ? parseInt(capacity) : null,
        rating: rating ? parseFloat(rating) : null,
        passPercentage: passPercentage ? parseFloat(passPercentage) : null,
        averageStudentScore: averageStudentScore ? parseFloat(averageStudentScore) : null,
        adminPriority: adminPriority ? parseInt(adminPriority) : 0,
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Tutorial profile created",
      data: created,
    });

  } catch (error) {
    console.error("Create Tutorial Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ======================================================
// UPDATE
// ======================================================

export const updateTutorialTeacher =
  async (req, res) => {

    try {

      const schoolId =
        req.user.schoolId;

      const existing =
        await prisma.teacherTutorialProfile.findFirst({
          where: {
            id: req.params.id,
            schoolId,
          },

          include: {
            teacher: true,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Tutorial teacher not found",
        });
      }

      const {
        bio,
        mode,
        monthlyFee,
        grades,
        subjects,
        capacity,
        isActive,

        // ✅ NEW
        rating,
        passPercentage,
        averageStudentScore,
        adminPriority,

      } = req.body;

      // =====================================================
      // ✅ RANKING
      // =====================================================

      let rankingType =
        "EXPERIENCE_BASED";

      let rankingScore = 0;

      if (
        rating ||
        passPercentage ||
        averageStudentScore
      ) {

        rankingType =
          "RESULT_BASED";

        rankingScore =
          (
            (Number(passPercentage || 0) * 0.6) +
            (Number(averageStudentScore || 0) * 0.3) +
            (
              (existing.teacher
                ?.experienceYears || 0) * 0.1
            )
          );

      } else {

        rankingScore =
          (
            (
              existing.teacher
                ?.experienceYears || 0
            ) * 0.7
          );
      }

      const updated =
        await prisma.teacherTutorialProfile.update({

          where: {
            id: req.params.id,
          },

          data: {

            bio,
            mode,

            monthlyFee:
              monthlyFee
                ? parseFloat(monthlyFee)
                : null,

            grades:
              grades || [],

            subjects:
              subjects || [],

            capacity:
              capacity
                ? parseInt(capacity)
                : null,

            isActive,

            // ✅ NEW

            rating:
              rating
                ? parseFloat(rating)
                : null,

            passPercentage:
              passPercentage
                ? parseFloat(passPercentage)
                : null,

            averageStudentScore:
              averageStudentScore
                ? parseFloat(
                    averageStudentScore
                  )
                : null,

            adminPriority:
              adminPriority
                ? parseInt(adminPriority)
                : 0,

            rankingType,
            rankingScore,

          },

          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                designation: true,
                qualification: true,
                experienceYears: true,
                profileImage: true,
              },
            },
          },
        });

      return res.json({
        success: true,
        data: updated,
      });

    } catch (error) {

      console.error(
        "[updateTutorialTeacher]",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update tutorial teacher",
      });
    }
  };

// ======================================================
// DELETE
// ======================================================

export const deleteTutorialTeacher =
  async (req, res) => {
    try {
      const schoolId =
        req.user.schoolId;

      const existing =
        await prisma.teacherTutorialProfile.findFirst(
          {
            where: {
              id: req.params.id,
              schoolId,
            },
          }
        );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Tutorial teacher not found",
        });
      }

      await prisma.teacherTutorialProfile.update(
        {
          where: {
            id: req.params.id,
          },

          data: {
            isActive: false,
          },
        }
      );

      return res.json({
        success: true,
        message:
          "Tutorial teacher archived successfully",
      });
    } catch (error) {
      console.error(
        "[deleteTutorialTeacher]",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to archive tutorial teacher",
      });
    }
  };

// ======================================================
// TEACHER DROPDOWN
// ======================================================

export const getTeacherDropdown =
  async (req, res) => {
    try {
      const schoolId =
        req.user.schoolId;

      const teachers =
        await prisma.teacherProfile.findMany(
          {
            where: {
              schoolId,
              status: "ACTIVE",
            },

            orderBy: {
              firstName: "asc",
            },

            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
              qualification: true,
              experienceYears: true,
            },
          }
        );

      return res.json({
        success: true,

      data: teachers.map((t) => ({
        id: t.id,

        firstName: t.firstName,
        lastName: t.lastName,

        name: `${t.firstName} ${t.lastName}`,

        designation: t.designation,

        qualification: t.qualification,

        experienceYears:
          t.experienceYears,
      }))
      });
    } catch (error) {
      console.error(
        "[getTeacherDropdown]",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch teachers",
      });
    }
  };

// ======================================================
// SUBJECTS
// ======================================================

export const getSubjects =
  async (req, res) => {
    try {
      const schoolId =
        req.user.schoolId;

      const subjects =
        await prisma.subject.findMany({
          where: {
            schoolId,
          },

          orderBy: {
            name: "asc",
          },

          select: {
            id: true,
            name: true,
          },
        });

      return res.json({
        success: true,
        data: subjects,
      });
    } catch (error) {
      console.error(
        "[getSubjects]",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch subjects",
      });
    }
  };

// ======================================================
// GRADES
// ======================================================

export const getGrades =
  async (req, res) => {
    try {
      const schoolId =
        req.user.schoolId;

      const classes =
        await prisma.classSection.findMany(
          {
            where: {
              schoolId,
            },

            distinct: ["grade"],

            orderBy: {
              grade: "asc",
            },

            select: {
              grade: true,
            },
          }
        );

      return res.json({
        success: true,
        data: classes,
      });
    } catch (error) {
      console.error(
        "[getGrades]",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch grades",
      });
    }
  };