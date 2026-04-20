// server/src/staffControlls/promotionController.js
import { prisma } from "../config/db.js";
import cacheService from "../utils/cacheService.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const invalidate = (schoolId) => cacheService.invalidateSchool(schoolId);

/**
 * Extract numeric value from grade/semester string
 * "Grade 5" → 5,  "Semester 3" → 3
 */
function extractGradeNumber(grade) {
  const match = grade?.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

/**
 * Build the next grade string
 * "Grade 5" → "Grade 6",  "Semester 3" → "Semester 4"
 */
function nextGrade(grade) {
  const num = extractGradeNumber(grade);
  if (num === null) return null;
  const prefix = grade.replace(/\d+/, "").trim(); // "Grade " or "Semester "
  return `${prefix}${num + 1}`;
}

/**
 * Auto-create or find target ClassSection for promotion
 * Preserves stream/course/branch from source section
 */
async function findOrCreateTargetSection(
  prismaClient,
  sourceSection,
  targetGrade,
  schoolId,
) {
  // Try to find existing section with same characteristics
  const existing = await prismaClient.classSection.findFirst({
    where: {
      schoolId,
      grade: targetGrade,
      section: sourceSection.section,
      streamId: sourceSection.streamId,
      combinationId: sourceSection.combinationId,
      courseId: sourceSection.courseId,
      branchId: sourceSection.branchId,
    },
  });

  if (existing) return existing;

  // Auto-create if not found
  const nameParts = [targetGrade];
  if (sourceSection.stream?.name) nameParts.push(sourceSection.stream.name);
  if (sourceSection.course?.name) nameParts.push(sourceSection.course.name);
  if (sourceSection.branch?.name) nameParts.push(sourceSection.branch.name);
  if (sourceSection.section) nameParts.push(sourceSection.section);

  const name = nameParts.join(" - ");

  return prismaClient.classSection.create({
    data: {
      grade: targetGrade,
      section: sourceSection.section,
      name,
      schoolId,
      streamId: sourceSection.streamId,
      combinationId: sourceSection.combinationId,
      courseId: sourceSection.courseId,
      branchId: sourceSection.branchId,
    },
  });
}

/**
 * Get last grade/semester for a school
 * For DEGREE/DIPLOMA/PG: last semester per course
 */
async function getLastGradeForSection(section, promotionConfig) {
  if (section.courseId) {
    // Degree/Diploma/PG — last grade is based on course totalSemesters
    const course = await prisma.course.findUnique({
      where: { id: section.courseId },
    });
    if (course) {
      const prefix = section.grade.replace(/\d+/, "").trim();
      return `${prefix}${course.totalSemesters}`;
    }
  }
  return promotionConfig?.lastGrade || null;
}

// ═══════════════════════════════════════════════════════════════
//  GET PROMOTION CONFIG
//  GET /api/promotion/config
// ═══════════════════════════════════════════════════════════════

export const getPromotionConfig = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const config = await prisma.schoolPromotionConfig.findUnique({
      where: { schoolId },
    });
    return res.json({ config });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  PROMOTION PREVIEW
//  POST /api/promotion/preview
//  body: { fromAcademicYearId, toAcademicYearName, gradeFilter? }
//  Returns what WILL happen — no DB changes yet
// ═══════════════════════════════════════════════════════════════

export const getPromotionPreview = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { fromAcademicYearId, gradeFilter } = req.body;

    if (!fromAcademicYearId)
      return res
        .status(400)
        .json({ message: "fromAcademicYearId is required" });

    const [promotionConfig, school] = await Promise.all([
      prisma.schoolPromotionConfig.findUnique({ where: { schoolId } }),
      prisma.school.findUnique({ where: { id: schoolId } }),
    ]);

    // Get all class sections that are active in the from-year
    const activeSections = await prisma.classSection.findMany({
      where: {
        schoolId,
        ...(gradeFilter ? { grade: gradeFilter } : {}),
        academicYearLinks: {
          some: { academicYearId: fromAcademicYearId, isActive: true },
        },
      },
      include: {
        stream: true,
        course: true,
        branch: true,
        studentEnrollments: {
          where: { academicYearId: fromAcademicYearId },
          include: { student: { include: { personalInfo: true } } },
        },
      },
    });

    const preview = [];

    for (const section of activeSections) {
      const gradeNum = extractGradeNumber(section.grade);
      const skipGrades = promotionConfig?.skipGrades || [];
      const lastGrade = await getLastGradeForSection(section, promotionConfig);

      const isSkipGrade = skipGrades.includes(section.grade);
      const isLastGrade =
        lastGrade &&
        extractGradeNumber(section.grade) === extractGradeNumber(lastGrade);

      // Count students by status
      const enrollments = section.studentEnrollments;
      const active = enrollments.filter((e) => e.status === "ACTIVE");
      const inactive = enrollments.filter((e) => e.status === "INACTIVE");
      const failed = enrollments.filter((e) => e.status === "FAILED");
      const suspended = enrollments.filter((e) => e.status === "SUSPENDED");

      let action, targetGrade;

      if (isLastGrade) {
        action = "GRADUATE";
        targetGrade = null;
      } else if (isSkipGrade) {
        action = "SKIP"; // PENDING_READMISSION
        targetGrade = null;
      } else {
        action = "PROMOTE";
        targetGrade = nextGrade(section.grade);
      }

      preview.push({
        sectionId: section.id,
        sectionName: section.name,
        grade: section.grade,
        section: section.section,
        stream: section.stream?.name,
        course: section.course?.name,
        branch: section.branch?.name,
        action,
        targetGrade,
        counts: {
          willPromote: action === "PROMOTE" ? active.length : 0,
          willGraduate: action === "GRADUATE" ? active.length : 0,
          willSkip: action === "SKIP" ? active.length : 0,
          skippedInactive: inactive.length,
          skippedFailed: failed.length,
          skippedSuspended: suspended.length,
          total: enrollments.length,
        },
      });
    }

    // Summary totals
    const summary = preview.reduce(
      (acc, p) => {
        acc.totalPromoted += p.counts.willPromote;
        acc.totalGraduated += p.counts.willGraduate;
        acc.totalSkipped += p.counts.willSkip;
        acc.totalInactive += p.counts.skippedInactive;
        acc.totalFailed += p.counts.skippedFailed;
        acc.totalSuspended += p.counts.skippedSuspended;
        return acc;
      },
      {
        totalPromoted: 0,
        totalGraduated: 0,
        totalSkipped: 0,
        totalInactive: 0,
        totalFailed: 0,
        totalSuspended: 0,
      },
    );

    return res.json({ preview, summary, schoolType: school.type });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  RUN PROMOTION
//  POST /api/promotion/run
//  body: { fromAcademicYearId, toAcademicYearName, toAcademicYearStartDate,
//          toAcademicYearEndDate, gradeFilter? }
// ═══════════════════════════════════════════════════════════════

// export const runPromotion = async (req, res) => {
//   try {
//     const schoolId = req.user.schoolId;
//     const userId = req.user.id;
//     const {
//       fromAcademicYearId,
//       toAcademicYearName,
//       toAcademicYearStartDate,
//       toAcademicYearEndDate,
//       gradeFilter,
//     } = req.body;

//     if (!fromAcademicYearId || !toAcademicYearName) {
//       return res.status(400).json({
//         message: "fromAcademicYearId and toAcademicYearName are required",
//       });
//     }

//     const promotionConfig = await prisma.schoolPromotionConfig.findUnique({
//       where: { schoolId },
//     });

//     // ─────────────────────────────────────────────
//     // 1️⃣ Find or Create Academic Year
//     // ─────────────────────────────────────────────
//     let toYear = await prisma.academicYear.findUnique({
//       where: { name_schoolId: { name: toAcademicYearName, schoolId } },
//     });

//     if (!toYear) {
//       if (!toAcademicYearStartDate || !toAcademicYearEndDate) {
//         return res.status(400).json({
//           message:
//             "Target academic year does not exist. Provide start and end dates.",
//         });
//       }

//       toYear = await prisma.academicYear.create({
//         data: {
//           name: toAcademicYearName,
//           startDate: new Date(toAcademicYearStartDate),
//           endDate: new Date(toAcademicYearEndDate),
//           schoolId,
//           isActive: false,
//         },
//       });
//     }

//     const toAcademicYearId = toYear.id;

//     // ─────────────────────────────────────────────
//     // 2️⃣ Fetch Sections + Active Enrollments
//     // ─────────────────────────────────────────────
//     const activeSections = await prisma.classSection.findMany({
//       where: {
//         schoolId,
//         ...(gradeFilter ? { grade: gradeFilter } : {}),
//         academicYearLinks: {
//           some: { academicYearId: fromAcademicYearId, isActive: true },
//         },
//       },
//       include: {
//         stream: true,
//         course: true,
//         branch: true,
//         studentEnrollments: {
//           where: {
//             academicYearId: fromAcademicYearId,
//             status: "ACTIVE",
//           },
//         },
//       },
//     });

//     // ─────────────────────────────────────────────
//     // 3️⃣ PRECOMPUTE EVERYTHING (NO TRANSACTION)
//     // ─────────────────────────────────────────────
//     const graduateEnrollmentIds = [];
//     const skipEnrollmentIds = [];
//     const promotedEnrollmentIds = [];
//     const enrollmentCreates = [];
//     const sectionActivationIds = new Set();
//     const autoCreatedSections = [];

//     // cache course semesters
//     const courseSemesterMap = new Map();

//     for (const section of activeSections) {
//       let lastGrade;

//       if (section.courseId) {
//         if (!courseSemesterMap.has(section.courseId)) {
//           const course = await prisma.course.findUnique({
//             where: { id: section.courseId },
//             select: { totalSemesters: true },
//           });
//           courseSemesterMap.set(
//             section.courseId,
//             course?.totalSemesters || null,
//           );
//         }

//         const totalSem = courseSemesterMap.get(section.courseId);
//         const prefix = section.grade.replace(/\d+/, "").trim();
//         lastGrade = totalSem ? `${prefix}${totalSem}` : null;
//       } else {
//         lastGrade = promotionConfig?.lastGrade || null;
//       }

//       const skipGrades = promotionConfig?.skipGrades || [];
//       const isSkipGrade = skipGrades.includes(section.grade);
//       const isLastGrade =
//         lastGrade &&
//         extractGradeNumber(section.grade) === extractGradeNumber(lastGrade);

//       let targetSectionData = null;

//       if (!isLastGrade && !isSkipGrade) {
//         const targetGrade = nextGrade(section.grade);

//         targetSectionData = {
//           section,
//           targetGrade,
//         };

//         sectionActivationIds.add(targetSection.id);

//         if (!autoCreatedSections.find((s) => s.id === targetSection.id)) {
//           autoCreatedSections.push({
//             id: targetSection.id,
//             name: targetSection.name,
//           });
//         }
//       }

//       for (const enrollment of section.studentEnrollments) {
//         const studentId = enrollment.studentId;

//         if (isLastGrade) {
//           graduateEnrollmentIds.push(enrollment.id);
//         } else if (isSkipGrade) {
//           skipEnrollmentIds.push(enrollment.id);
//         } else {
//           promotedEnrollmentIds.push(enrollment.id);

//           enrollmentCreates.push({
//             studentId,
//             classSectionId: targetSection.id,
//             academicYearId: toAcademicYearId,
//             status: "ACTIVE",
//             rollNumber: null,
//           });
//         }
//       }
//     }

//     // ─────────────────────────────────────────────
//     // 4️⃣ SHORT TRANSACTION (WRITES ONLY)
//     // ─────────────────────────────────────────────
//     await prisma.$transaction(
//       async (tx) => {
//         // ✅ GRADUATE
//         if (graduateIds.size) {
//           await tx.studentEnrollment.updateMany({
//             where: {
//               studentId: { in: [...graduateIds] },
//               academicYearId: fromAcademicYearId,
//             },
//             data: { status: "GRADUATED" },
//           });
//         }

//         // ✅ SKIP → PENDING_READMISSION
//         if (skipIds.size) {
//           await tx.studentEnrollment.updateMany({
//             where: {
//               studentId: { in: [...skipIds] },
//               academicYearId: fromAcademicYearId,
//             },
//             data: { status: "PENDING_READMISSION" },
//           });
//         }
//         for (const sectionId of sectionActivationIds) {
//           await tx.classSectionAcademicYear.upsert({
//             where: {
//               classSectionId_academicYearId: {
//                 classSectionId: sectionId,
//                 academicYearId: toAcademicYearId,
//               },
//             },
//             update: { isActive: true },
//             create: {
//               classSectionId: sectionId,
//               academicYearId: toAcademicYearId,
//               isActive: true,
//             },
//           });
//         }

//         if (enrollmentCreates.length) {
//           await tx.studentEnrollment.createMany({
//             data: enrollmentCreates,
//             skipDuplicates: true,
//           });
//         }

//         await tx.promotionLog.create({
//           data: {
//             schoolId,
//             fromAcademicYearId,
//             toAcademicYearId,
//             totalPromoted: enrollmentCreates.length,
//             graduated: graduateEnrollmentIds.length,
//             skipped: skipEnrollmentIds.length,
//             totalFailed: 0,
//             totalInactive: 0,
//             triggeredById: userId,
//           },
//         });
//       },
//       { timeout: 20000 },
//     );

//     await invalidate(schoolId);

//     return res.json({
//       message: "Promotion completed successfully",
//       toAcademicYear: toYear,
//       results: {
//         promoted: enrollmentCreates.length,
//         graduated: graduateIds.size,
//         skipped: skipIds.size,
//         autoCreatedSections,
//       },
//     });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };
export const runPromotion = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user.id;

    const {
      fromAcademicYearId,
      toAcademicYearName,
      toAcademicYearStartDate,
      toAcademicYearEndDate,
      gradeFilter,
    } = req.body;

    if (!fromAcademicYearId || !toAcademicYearName) {
      return res.status(400).json({
        message: "fromAcademicYearId and toAcademicYearName are required",
      });
    }

    const promotionConfig = await prisma.schoolPromotionConfig.findUnique({
      where: { schoolId },
    });

    let toYear = await prisma.academicYear.findUnique({
      where: { name_schoolId: { name: toAcademicYearName, schoolId } },
    });

    if (!toYear) {
      if (!toAcademicYearStartDate || !toAcademicYearEndDate) {
        return res.status(400).json({
          message: "Provide start and end dates for new academic year.",
        });
      }

      toYear = await prisma.academicYear.create({
        data: {
          name: toAcademicYearName,
          startDate: new Date(toAcademicYearStartDate),
          endDate: new Date(toAcademicYearEndDate),
          schoolId,
          isActive: false,
        },
      });
    }

    const toAcademicYearId = toYear.id;

    const activeSections = await prisma.classSection.findMany({
      where: {
        schoolId,
        ...(gradeFilter ? { grade: gradeFilter } : {}),
        academicYearLinks: {
          some: { academicYearId: fromAcademicYearId, isActive: true },
        },
      },
      include: {
        stream: true,
        course: true,
        branch: true,
      },
    });

    let totalPromoted = 0;
    let totalGraduated = 0;
    let totalSkipped = 0;
    const enrollmentCreates = [];

    await prisma.$transaction(async (tx) => {
      for (const section of activeSections) {
        let lastGrade;

        if (section.courseId) {
          const course = await tx.course.findUnique({
            where: { id: section.courseId },
            select: { totalSemesters: true },
          });

          const prefix = section.grade.replace(/\d+/, "").trim();
          lastGrade = course ? `${prefix}${course.totalSemesters}` : null;
        } else {
          lastGrade = promotionConfig?.lastGrade || null;
        }

        const skipGrades = promotionConfig?.skipGrades || [];
        const isSkipGrade = skipGrades.includes(section.grade);
        const isLastGrade =
          lastGrade &&
          extractGradeNumber(section.grade) === extractGradeNumber(lastGrade);

        let targetSection = null;

        if (!isLastGrade && !isSkipGrade) {
          const targetGrade = nextGrade(section.grade);

          targetSection = await findOrCreateTargetSection(
            tx,
            section,
            targetGrade,
            schoolId,
          );

          await tx.classSectionAcademicYear.upsert({
            where: {
              classSectionId_academicYearId: {
                classSectionId: targetSection.id,
                academicYearId: toAcademicYearId,
              },
            },
            update: { isActive: true },
            create: {
              classSectionId: targetSection.id,
              academicYearId: toAcademicYearId,
              isActive: true,
            },
          });
        }

        // SECTION-WISE UPDATE (No huge IN arrays)

        if (isLastGrade) {
          const result = await tx.studentEnrollment.updateMany({
            where: {
              classSectionId: section.id,
              academicYearId: fromAcademicYearId,
              status: "ACTIVE",
            },
            data: { status: "GRADUATED" },
          });

          totalGraduated += result.count;
        } else if (isSkipGrade) {
          const result = await tx.studentEnrollment.updateMany({
            where: {
              classSectionId: section.id,
              academicYearId: fromAcademicYearId,
              status: "ACTIVE",
            },
            data: { status: "PENDING_READMISSION" },
          });

          totalSkipped += result.count;
        } else {
          const activeEnrollments = await tx.studentEnrollment.findMany({
            where: {
              classSectionId: section.id,
              academicYearId: fromAcademicYearId,
              status: "ACTIVE",
            },
            select: {
              studentId: true,
              admissionNumber: true,
              admissionDate: true,
              rollNumber: true, // ← ADD THIS: carry forward for degree/diploma
            },
          });

          // DEGREE / DIPLOMA / POSTGRADUATE → carry rollNumber forward
          // SCHOOL / PUC → reset to null (will be regenerated via Generate Roll Numbers)
          const isDegreeLevel = !!section.courseId;

          for (const enrollment of activeEnrollments) {
            enrollmentCreates.push({
              studentId: enrollment.studentId,
              admissionNumber: enrollment.admissionNumber,
              admissionDate: enrollment.admissionDate,
              classSectionId: targetSection.id,
              academicYearId: toAcademicYearId,
              status: "ACTIVE",
              rollNumber: isDegreeLevel ? enrollment.rollNumber : null,
              //           ↑ carry forward for degree, reset for school/PUC
            });
          }

          const result = await tx.studentEnrollment.updateMany({
            where: {
              classSectionId: section.id,
              academicYearId: fromAcademicYearId,
              status: "ACTIVE",
            },
            data: { status: "COMPLETED" },
          });

          totalPromoted += result.count;
        }
      }

      if (enrollmentCreates.length) {
        await tx.studentEnrollment.createMany({
          data: enrollmentCreates,
          skipDuplicates: true,
        });
      }

      await tx.promotionLog.create({
        data: {
          schoolId,
          fromAcademicYearId,
          toAcademicYearId,
          totalPromoted,
          totalGraduated,
          totalSkipped,
          totalFailed: 0,
          totalInactive: 0,
          triggeredById: userId,
        },
      });
    });

    await invalidate(schoolId);

    return res.json({
      message: "Promotion completed successfully",
      toAcademicYear: toYear,
      results: {
        promoted: totalPromoted,
        graduated: totalGraduated,
        skipped: totalSkipped,
      },
    });
  } catch (err) {
    console.error("PROMOTION ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  RE-ADMISSION (Grade 7 → Grade 8, School type only)
//  GET  /api/promotion/pending-readmission
//  POST /api/promotion/readmit/:studentId
// ═══════════════════════════════════════════════════════════════

// GET all students with PENDING_READMISSION status
export const getPendingReadmission = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        enrollments: {
          some: { status: "PENDING_READMISSION" },
        },
      },
      include: {
        personalInfo: true,
        enrollments: {
          where: { status: "PENDING_READMISSION" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            admissionNumber: true,
            admissionDate: true,
            status: true,
            classSection: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
            academicYear: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        readmissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ students });
  } catch (err) {
    console.error("GET PENDING READMISSION ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

// POST re-admit a student
export const readmitStudent = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { studentId } = req.params;
    const { newAdmissionNumber, newAcademicYearId, newClassSectionId, reason } =
      req.body;

    if (!newAdmissionNumber || !newAcademicYearId || !newClassSectionId) {
      return res.status(400).json({
        message:
          "newAdmissionNumber, newAcademicYearId, newClassSectionId are required",
      });
    }

    // ✅ Get the correct pending enrollment
    const lastEnrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        status: "PENDING_READMISSION",
      },
      include: {
        classSection: true,
        academicYear: true,
      },
    });

    if (!lastEnrollment) {
      return res.status(404).json({
        message: "Student not in PENDING_READMISSION status",
      });
    }

    // Check duplicate admission number
    const dupAdmission = await prisma.studentEnrollment.findFirst({
      where: {
        admissionNumber: newAdmissionNumber,
        academicYearId: newAcademicYearId,
      },
    });

    if (dupAdmission) {
      return res.status(409).json({
        message: `Admission number "${newAdmissionNumber}" is already in use`,
      });
    }

    const targetSection = await prisma.classSection.findFirst({
      where: { id: newClassSectionId, schoolId },
    });

    if (!targetSection) {
      return res
        .status(404)
        .json({ message: "Target class section not found" });
    }

    await prisma.$transaction(async (tx) => {
      // Create readmission log
      await tx.studentReadmission.create({
        data: {
          studentId,
          previousAdmissionNumber: lastEnrollment.admissionNumber || "",
          previousGrade: lastEnrollment.classSection?.grade || "",
          previousAcademicYearId: lastEnrollment.academicYearId,
          previousClassSectionId: lastEnrollment.classSectionId,
          newAdmissionNumber,
          newGrade: targetSection.grade,
          newAcademicYearId,
          newClassSectionId,
          reason: reason || null,
          readmissionDate: new Date(),
        },
      });

      // ✅ Mark old enrollment completed
      await tx.studentEnrollment.update({
        where: { id: lastEnrollment.id },
        data: { status: "COMPLETED" },
      });

      // ✅ Create new enrollment (ACTIVE)
      await tx.studentEnrollment.create({
        data: {
          studentId,
          classSectionId: newClassSectionId,
          academicYearId: newAcademicYearId,
          admissionNumber: newAdmissionNumber,
          admissionDate: new Date(),
          status: "ACTIVE",
          rollNumber: null,
        },
      });

      await tx.classSectionAcademicYear.upsert({
        where: {
          classSectionId_academicYearId: {
            classSectionId: newClassSectionId,
            academicYearId: newAcademicYearId,
          },
        },
        update: { isActive: true },
        create: {
          classSectionId: newClassSectionId,
          academicYearId: newAcademicYearId,
          isActive: true,
        },
      });
    });

    await invalidate(schoolId);

    return res.json({
      message: "Student re-admitted successfully",
      newAdmissionNumber,
      newGrade: targetSection.grade,
    });
  } catch (err) {
    console.error("READMISSION ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};
// GET promotion logs
export const getPromotionLogs = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const logs = await prisma.promotionLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


export const readmitStudentBulk = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { students } = req.body;
 
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "students array is required" });
    }
 
    const results = [];
 
    for (const s of students) {
      const {
        studentId,
        newAdmissionNumber,
        newClassSectionId,
        newAcademicYearId,
        reason,
        _row,
      } = s;
 
      try {
        // ── Validate required fields ──────────────────────────────────────
        if (!studentId || !newAdmissionNumber || !newClassSectionId || !newAcademicYearId) {
          results.push({
            _row,
            studentId,
            success: false,
            error: "Missing required fields (admission number, class, or year)",
          });
          continue;
        }
 
        // ── Find pending enrollment ───────────────────────────────────────
        const lastEnrollment = await prisma.studentEnrollment.findFirst({
          where: { studentId, status: "PENDING_READMISSION" },
          include: { classSection: true, academicYear: true },
        });
 
        if (!lastEnrollment) {
          results.push({
            _row,
            studentId,
            success: false,
            error: "Student is not in PENDING_READMISSION status",
          });
          continue;
        }
 
        // ── Check duplicate admission number ──────────────────────────────
        const dupAdmission = await prisma.studentEnrollment.findFirst({
          where: { admissionNumber: newAdmissionNumber, academicYearId: newAcademicYearId },
        });
 
        if (dupAdmission) {
          results.push({
            _row,
            studentId,
            success: false,
            error: `Admission number "${newAdmissionNumber}" is already in use`,
          });
          continue;
        }
 
        // ── Verify target section belongs to this school ──────────────────
        const targetSection = await prisma.classSection.findFirst({
          where: { id: newClassSectionId, schoolId },
        });
 
        if (!targetSection) {
          results.push({
            _row,
            studentId,
            success: false,
            error: "Target class section not found",
          });
          continue;
        }
 
        // ── Run transaction (same logic as readmitStudent) ────────────────
        await prisma.$transaction(async (tx) => {
          // 1. Create readmission log
          await tx.studentReadmission.create({
            data: {
              studentId,
              previousAdmissionNumber: lastEnrollment.admissionNumber || "",
              previousGrade:           lastEnrollment.classSection?.grade || "",
              previousAcademicYearId:  lastEnrollment.academicYearId,
              previousClassSectionId:  lastEnrollment.classSectionId,
              newAdmissionNumber,
              newGrade:           targetSection.grade,
              newAcademicYearId,
              newClassSectionId,
              reason:             reason || null,
              readmissionDate:    new Date(),
            },
          });
 
          // 2. Mark old enrollment as COMPLETED
          await tx.studentEnrollment.update({
            where: { id: lastEnrollment.id },
            data:  { status: "COMPLETED" },
          });
 
          // 3. Create new ACTIVE enrollment
          await tx.studentEnrollment.create({
            data: {
              studentId,
              classSectionId: newClassSectionId,
              academicYearId: newAcademicYearId,
              admissionNumber: newAdmissionNumber,
              admissionDate:   new Date(),
              status:          "ACTIVE",
              rollNumber:      null,
            },
          });
 
          // 4. Ensure section is active for that year
          await tx.classSectionAcademicYear.upsert({
            where: {
              classSectionId_academicYearId: {
                classSectionId: newClassSectionId,
                academicYearId: newAcademicYearId,
              },
            },
            update: { isActive: true },
            create: {
              classSectionId: newClassSectionId,
              academicYearId: newAcademicYearId,
              isActive:       true,
            },
          });
        });
 
        results.push({ _row, studentId, success: true });
 
      } catch (err) {
        results.push({
          _row,
          studentId,
          success: false,
          error: err.message,
        });
      }
    }
 
    await invalidate(schoolId);
 
    const totalSuccess = results.filter((r) => r.success).length;
    const totalFailed  = results.filter((r) => !r.success).length;
 
    return res.json({
      message: `${totalSuccess} re-admitted, ${totalFailed} failed`,
      results,
    });
 
  } catch (err) {
    console.error("BULK READMISSION ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};