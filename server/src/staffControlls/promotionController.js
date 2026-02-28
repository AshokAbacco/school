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

//     if (!fromAcademicYearId || !toAcademicYearName)
//       return res.status(400).json({
//         message: "fromAcademicYearId and toAcademicYearName are required",
//       });

//     const promotionConfig = await prisma.schoolPromotionConfig.findUnique({
//       where: { schoolId },
//     });

//     // 1. Find or auto-create target academic year
//     let toYear = await prisma.academicYear.findUnique({
//       where: { name_schoolId: { name: toAcademicYearName, schoolId } },
//     });

//     if (!toYear) {
//       if (!toAcademicYearStartDate || !toAcademicYearEndDate)
//         return res.status(400).json({
//           message:
//             "Target academic year does not exist. Provide toAcademicYearStartDate and toAcademicYearEndDate to auto-create it.",
//         });

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

//     // 2. Get all active sections in the from-year
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
//             status: "ACTIVE", // Only promote ACTIVE students
//           },
//           include: { student: true },
//         },
//       },
//     });

//     const results = {
//       promoted: 0,
//       graduated: 0,
//       skipped: 0,
//       autoCreatedSections: [],
//       errors: [],
//     };

//     // 3. Process each section
//     await prisma.$transaction(async (tx) => {
//       for (const section of activeSections) {
//         const skipGrades = promotionConfig?.skipGrades || [];
//         const lastGrade = await getLastGradeForSection(
//           section,
//           promotionConfig,
//         );

//         const isSkipGrade = skipGrades.includes(section.grade);
//         const isLastGrade =
//           lastGrade &&
//           extractGradeNumber(section.grade) === extractGradeNumber(lastGrade);

//         for (const enrollment of section.studentEnrollments) {
//           const studentId = enrollment.studentId;

//           try {
//             if (isLastGrade) {
//               // GRADUATE — update status, no new enrollment
//               await tx.studentPersonalInfo.updateMany({
//                 where: { studentId },
//                 data: { status: "GRADUATED" },
//               });
//               results.graduated++;
//             } else if (isSkipGrade) {
//               // SKIP — mark PENDING_READMISSION, no new enrollment
//               await tx.studentPersonalInfo.updateMany({
//                 where: { studentId },
//                 data: { status: "PENDING_READMISSION" },
//               });
//               results.skipped++;
//             } else {
//               // PROMOTE — create new enrollment in next grade
//               const targetGrade = nextGrade(section.grade);
//               const targetSection = await findOrCreateTargetSection(
//                 tx,
//                 section,
//                 targetGrade,
//                 schoolId,
//               );

//               // Track auto-created sections
//               const alreadyTracked = results.autoCreatedSections.find(
//                 (s) => s.id === targetSection.id,
//               );
//               if (!alreadyTracked) {
//                 results.autoCreatedSections.push({
//                   id: targetSection.id,
//                   name: targetSection.name,
//                 });
//               }

//               // Activate target section for new year
//               await tx.classSectionAcademicYear.upsert({
//                 where: {
//                   classSectionId_academicYearId: {
//                     classSectionId: targetSection.id,
//                     academicYearId: toAcademicYearId,
//                   },
//                 },
//                 update: { isActive: true },
//                 create: {
//                   classSectionId: targetSection.id,
//                   academicYearId: toAcademicYearId,
//                   isActive: true,
//                 },
//               });

//               // Check if student already enrolled in new year (prevent duplicates)
//               const alreadyEnrolled = await tx.studentEnrollment.findUnique({
//                 where: {
//                   studentId_academicYearId: {
//                     studentId,
//                     academicYearId: toAcademicYearId,
//                   },
//                 },
//               });

//               if (!alreadyEnrolled) {
//                 await tx.studentEnrollment.create({
//                   data: {
//                     studentId,
//                     classSectionId: targetSection.id,
//                     academicYearId: toAcademicYearId,
//                     status: "ACTIVE",
//                     rollNumber: null, // Admin assigns later
//                   },
//                 });
//                 results.promoted++;
//               }
//             }
//           } catch (err) {
//             results.errors.push({
//               studentId,
//               error: err.message,
//             });
//           }
//         }
//       }

//       // 4. Create promotion log
//       await tx.promotionLog.create({
//         data: {
//           schoolId,
//           fromAcademicYearId,
//           toAcademicYearId,
//           totalPromoted: results.promoted,
//           totalGraduated: results.graduated,
//           totalSkipped: results.skipped,
//           totalFailed: 0,
//           totalInactive: 0,
//           triggeredById: userId,
//         },
//       });
//     });

//     await invalidate(schoolId);

//     return res.json({
//       message: "Promotion completed successfully",
//       toAcademicYear: toYear,
//       results,
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

    // ─────────────────────────────────────────────
    // 1️⃣ Find or Create Academic Year
    // ─────────────────────────────────────────────
    let toYear = await prisma.academicYear.findUnique({
      where: { name_schoolId: { name: toAcademicYearName, schoolId } },
    });

    if (!toYear) {
      if (!toAcademicYearStartDate || !toAcademicYearEndDate) {
        return res.status(400).json({
          message:
            "Target academic year does not exist. Provide start and end dates.",
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

    // ─────────────────────────────────────────────
    // 2️⃣ Fetch Sections + Active Enrollments
    // ─────────────────────────────────────────────
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
          where: {
            academicYearId: fromAcademicYearId,
            status: "ACTIVE",
          },
        },
      },
    });

    // ─────────────────────────────────────────────
    // 3️⃣ PRECOMPUTE EVERYTHING (NO TRANSACTION)
    // ─────────────────────────────────────────────
    const graduateIds = [];
    const skipIds = [];
    const enrollmentCreates = [];
    const sectionActivationIds = new Set();
    const autoCreatedSections = [];

    // cache course semesters
    const courseSemesterMap = new Map();

    for (const section of activeSections) {
      let lastGrade;

      if (section.courseId) {
        if (!courseSemesterMap.has(section.courseId)) {
          const course = await prisma.course.findUnique({
            where: { id: section.courseId },
            select: { totalSemesters: true },
          });
          courseSemesterMap.set(
            section.courseId,
            course?.totalSemesters || null,
          );
        }

        const totalSem = courseSemesterMap.get(section.courseId);
        const prefix = section.grade.replace(/\d+/, "").trim();
        lastGrade = totalSem ? `${prefix}${totalSem}` : null;
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
          prisma,
          section,
          targetGrade,
          schoolId,
        );

        sectionActivationIds.add(targetSection.id);

        if (!autoCreatedSections.find((s) => s.id === targetSection.id)) {
          autoCreatedSections.push({
            id: targetSection.id,
            name: targetSection.name,
          });
        }
      }

      for (const enrollment of section.studentEnrollments) {
        const studentId = enrollment.studentId;

        if (isLastGrade) {
          graduateIds.push(studentId);
        } else if (isSkipGrade) {
          skipIds.push(studentId);
        } else {
          enrollmentCreates.push({
            studentId,
            classSectionId: targetSection.id,
            academicYearId: toAcademicYearId,
            status: "ACTIVE",
            rollNumber: null,
          });
        }
      }
    }

    // ─────────────────────────────────────────────
    // 4️⃣ SHORT TRANSACTION (WRITES ONLY)
    // ─────────────────────────────────────────────
    await prisma.$transaction(
      async (tx) => {
        if (graduateIds.length) {
          await tx.studentPersonalInfo.updateMany({
            where: { studentId: { in: graduateIds } },
            data: { status: "GRADUATED" },
          });
        }

        if (skipIds.length) {
          await tx.studentPersonalInfo.updateMany({
            where: { studentId: { in: skipIds } },
            data: { status: "PENDING_READMISSION" },
          });
        }

        for (const sectionId of sectionActivationIds) {
          await tx.classSectionAcademicYear.upsert({
            where: {
              classSectionId_academicYearId: {
                classSectionId: sectionId,
                academicYearId: toAcademicYearId,
              },
            },
            update: { isActive: true },
            create: {
              classSectionId: sectionId,
              academicYearId: toAcademicYearId,
              isActive: true,
            },
          });
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
            totalPromoted: enrollmentCreates.length,
            totalGraduated: graduateIds.length,
            totalSkipped: skipIds.length,
            totalFailed: 0,
            totalInactive: 0,
            triggeredById: userId,
          },
        });
      },
      { timeout: 20000 },
    );

    await invalidate(schoolId);

    return res.json({
      message: "Promotion completed successfully",
      toAcademicYear: toYear,
      results: {
        promoted: enrollmentCreates.length,
        graduated: graduateIds.length,
        skipped: skipIds.length,
        autoCreatedSections,
      },
    });
  } catch (err) {
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
    const { academicYearId } = req.query;

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        personalInfo: { status: "PENDING_READMISSION" },
      },
      include: {
        personalInfo: true,
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            classSection: true,
            academicYear: true,
          },
        },
        readmissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return res.json({ students });
  } catch (err) {
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

    if (!newAdmissionNumber || !newAcademicYearId || !newClassSectionId)
      return res.status(400).json({
        message:
          "newAdmissionNumber, newAcademicYearId, newClassSectionId are required",
      });

    // Get student
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        personalInfo: true,
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { classSection: true, academicYear: true },
        },
      },
    });

    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.personalInfo?.status !== "PENDING_READMISSION")
      return res.status(400).json({
        message: "Student is not in PENDING_READMISSION status",
      });

    // Check new admission number is unique
    const dupAdmission = await prisma.student.findFirst({
      where: { admissionNumber: newAdmissionNumber, schoolId },
    });
    if (dupAdmission)
      return res.status(409).json({
        message: `Admission number "${newAdmissionNumber}" is already in use`,
      });

    // Check target section exists and belongs to school
    const targetSection = await prisma.classSection.findFirst({
      where: { id: newClassSectionId, schoolId },
    });
    if (!targetSection)
      return res
        .status(404)
        .json({ message: "Target class section not found" });

    const lastEnrollment = student.enrollments[0];

    await prisma.$transaction(async (tx) => {
      // 1. Save readmission record (preserve history)
      await tx.studentReadmission.create({
        data: {
          studentId,
          previousAdmissionNumber: student.admissionNumber,
          previousGrade: lastEnrollment?.classSection?.grade || "",
          previousAcademicYearId: lastEnrollment?.academicYearId || "",
          previousClassSectionId: lastEnrollment?.classSectionId || "",
          newAdmissionNumber,
          newGrade: targetSection.grade,
          newAcademicYearId,
          newClassSectionId,
          reason: reason || null,
          readmissionDate: new Date(),
        },
      });

      // 2. Update student admission number
      await tx.student.update({
        where: { id: studentId },
        data: { admissionNumber: newAdmissionNumber },
      });

      // 3. Update student status back to ACTIVE
      await tx.studentPersonalInfo.updateMany({
        where: { studentId },
        data: { status: "ACTIVE" },
      });

      // 4. Create new enrollment in Grade 8 / new year
      await tx.studentEnrollment.create({
        data: {
          studentId,
          classSectionId: newClassSectionId,
          academicYearId: newAcademicYearId,
          status: "ACTIVE",
          rollNumber: null, // Admin assigns later
        },
      });

      // 5. Activate target section for new year if not already
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
