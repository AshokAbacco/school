// server/src/staffControlls/rollNumberController.js
// Handles:
//   POST /api/class-sections/:id/generate-roll-numbers        → single class
//   POST /api/class-sections/generate-roll-numbers/bulk       → all eligible classes
//   GET  /api/class-sections/:id/roll-number-preview          → preview before assigning

import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

const prisma = new PrismaClient();
const invalidate = (schoolId) => cacheService.invalidateSchool(schoolId);

const ROLL_NUMBER_SCHOOL_TYPES = ["SCHOOL", "PUC"];

// ── Sort: firstName → lastName → createdAt ────────────────────────────────────
function sortEnrollmentsAlphabetically(enrollments) {
  return [...enrollments].sort((a, b) => {
    const fnA = (
      a.student?.personalInfo?.firstName ||
      a.student?.name ||
      ""
    ).toLowerCase();
    const fnB = (
      b.student?.personalInfo?.firstName ||
      b.student?.name ||
      ""
    ).toLowerCase();
    if (fnA !== fnB) return fnA.localeCompare(fnB);
    const lnA = (a.student?.personalInfo?.lastName || "").toLowerCase();
    const lnB = (b.student?.personalInfo?.lastName || "").toLowerCase();
    if (lnA !== lnB) return lnA.localeCompare(lnB);
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/class-sections/:id/roll-number-preview
// ─────────────────────────────────────────────────────────────────────────────
export const getRollNumberPreview = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const { id: classSectionId } = req.params;
    const { academicYearId, mode = "overwrite_all" } = req.query;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const section = await prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
      select: { id: true, name: true, grade: true },
    });
    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classSectionId, academicYearId, status: "ACTIVE" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            personalInfo: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const sorted = sortEnrollmentsAlphabetically(enrollments);
    const alreadyHaveRoll = enrollments.filter((e) => e.rollNumber !== null);
    const preview = [];

    if (mode === "overwrite_all") {
      sorted.forEach((enroll, idx) => {
        const newRoll = String(idx + 1);
        const fn = enroll.student?.personalInfo?.firstName || "";
        const ln = enroll.student?.personalInfo?.lastName || "";
        preview.push({
          enrollmentId: enroll.id,
          studentId: enroll.student?.id,
          name: fn && ln ? `${fn} ${ln}` : enroll.student?.name || "Unknown",
          currentRollNumber: enroll.rollNumber,
          newRollNumber: newRoll,
          willChange: enroll.rollNumber !== newRoll,
        });
      });
    } else {
      let maxRoll = 0;
      for (const e of enrollments) {
        const n = parseInt(e.rollNumber, 10);
        if (!isNaN(n) && n > maxRoll) maxRoll = n;
      }
      let gap = maxRoll + 1;
      sorted.forEach((enroll) => {
        const fn = enroll.student?.personalInfo?.firstName || "";
        const ln = enroll.student?.personalInfo?.lastName || "";
        const hasExisting = enroll.rollNumber !== null;
        const newRoll = hasExisting ? enroll.rollNumber : String(gap++);
        preview.push({
          enrollmentId: enroll.id,
          studentId: enroll.student?.id,
          name: fn && ln ? `${fn} ${ln}` : enroll.student?.name || "Unknown",
          currentRollNumber: enroll.rollNumber,
          newRollNumber: newRoll,
          willChange: !hasExisting,
        });
      });
    }

    return res.json({
      section: { id: section.id, name: section.name, grade: section.grade },
      totalStudents: enrollments.length,
      alreadyAssigned: alreadyHaveRoll.length,
      willChange: preview.filter((p) => p.willChange).length,
      mode,
      preview,
    });
  } catch (err) {
    console.error("[getRollNumberPreview]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/class-sections/:id/generate-roll-numbers
//
//  KEY FIX — Two-phase update for overwrite_all:
//
//  The unique constraint is (classSectionId, academicYearId, rollNumber).
//  If student A has rollNumber "5" and we want to give "5" to student B,
//  updating B to "5" BEFORE clearing A causes P2002 unique constraint error.
//
//  Solution:
//    Phase 1 → updateMany to set ALL rollNumbers to null  (clears constraint)
//    Phase 2 → assign new numbers 1, 2, 3... sequentially (no collision)
//  Both phases run inside one transaction so it's atomic.
// ─────────────────────────────────────────────────────────────────────────────
export const generateRollNumbers = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const { id: classSectionId } = req.params;
    const { academicYearId, mode = "overwrite_all" } = req.body;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const section = await prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
      select: { id: true, name: true, grade: true, courseId: true },
    });
    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classSectionId, academicYearId, status: "ACTIVE" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            personalInfo: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (enrollments.length === 0) {
      return res.json({
        message: "No active students in this class for this year",
        updated: 0,
      });
    }

    const sorted = sortEnrollmentsAlphabetically(enrollments);
    const enrollmentIds = enrollments.map((e) => e.id);
    const updates = []; // [{ id, rollNumber }]

    if (mode === "overwrite_all") {
      sorted.forEach((enroll, idx) => {
        updates.push({ id: enroll.id, rollNumber: String(idx + 1) });
      });

      // ── TWO-PHASE TRANSACTION ─────────────────────────────────────────────
      await prisma.$transaction(async (tx) => {
        // Phase 1: Clear all roll numbers → removes unique constraint values
        await tx.studentEnrollment.updateMany({
          where: { id: { in: enrollmentIds } },
          data: { rollNumber: null },
        });
        // Phase 2: Assign new numbers → no collision possible
        for (const { id, rollNumber } of updates) {
          await tx.studentEnrollment.update({
            where: { id },
            data: { rollNumber },
          });
        }
      });
    } else {
      // fill_gaps_only — only touch null rows, no collision possible
      let maxRoll = 0;
      for (const enroll of enrollments) {
        const n = parseInt(enroll.rollNumber, 10);
        if (!isNaN(n) && n > maxRoll) maxRoll = n;
      }
      let nextRoll = maxRoll + 1;
      for (const enroll of sorted) {
        if (enroll.rollNumber === null) {
          updates.push({ id: enroll.id, rollNumber: String(nextRoll++) });
        }
      }
      if (updates.length > 0) {
        await prisma.$transaction(
          updates.map(({ id, rollNumber }) =>
            prisma.studentEnrollment.update({
              where: { id },
              data: { rollNumber },
            }),
          ),
        );
      }
    }

    await invalidate(schoolId);

    const updateMap = new Map(updates.map((u) => [u.id, u.rollNumber]));
    const result = sorted.map((enroll) => {
      const fn = enroll.student?.personalInfo?.firstName || "";
      const ln = enroll.student?.personalInfo?.lastName || "";
      return {
        studentId: enroll.student?.id,
        name: fn && ln ? `${fn} ${ln}` : enroll.student?.name || "Unknown",
        rollNumber: updateMap.get(enroll.id) ?? enroll.rollNumber,
      };
    });

    return res.json({
      message: `Roll numbers generated for ${section.name}`,
      section: section.name,
      totalStudents: enrollments.length,
      updated: updates.length,
      mode,
      students: result,
    });
  } catch (err) {
    console.error("[generateRollNumbers]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/class-sections/generate-roll-numbers/bulk
//  Same two-phase fix applied per section.
// ─────────────────────────────────────────────────────────────────────────────
export const generateRollNumbersBulk = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const { academicYearId, mode = "overwrite_all" } = req.body;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { type: true },
    });

    if (!ROLL_NUMBER_SCHOOL_TYPES.includes(school.type)) {
      return res.status(400).json({
        message: `Bulk roll number generation is only for School and PUC types. Your school type is ${school.type}.`,
      });
    }

    const activeSections = await prisma.classSection.findMany({
      where: {
        schoolId,
        courseId: null,
        academicYearLinks: { some: { academicYearId, isActive: true } },
      },
      select: { id: true, name: true, grade: true },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });

    if (activeSections.length === 0) {
      return res.json({
        message: "No active class sections found for this academic year",
        totalSections: 0,
        totalStudents: 0,
        totalUpdated: 0,
      });
    }

    let totalStudents = 0;
    let totalUpdated = 0;
    const sectionResults = [];

    for (const section of activeSections) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { classSectionId: section.id, academicYearId, status: "ACTIVE" },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              personalInfo: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      if (enrollments.length === 0) {
        sectionResults.push({
          sectionId: section.id,
          sectionName: section.name,
          students: 0,
          updated: 0,
        });
        continue;
      }

      const sorted = sortEnrollmentsAlphabetically(enrollments);
      const enrollmentIds = enrollments.map((e) => e.id);
      const updates = [];

      if (mode === "overwrite_all") {
        sorted.forEach((enroll, idx) => {
          updates.push({ id: enroll.id, rollNumber: String(idx + 1) });
        });

        // Two-phase: clear → assign
        await prisma.$transaction(async (tx) => {
          await tx.studentEnrollment.updateMany({
            where: { id: { in: enrollmentIds } },
            data: { rollNumber: null },
          });
          for (const { id, rollNumber } of updates) {
            await tx.studentEnrollment.update({
              where: { id },
              data: { rollNumber },
            });
          }
        });
      } else {
        let maxRoll = 0;
        for (const enroll of enrollments) {
          const n = parseInt(enroll.rollNumber, 10);
          if (!isNaN(n) && n > maxRoll) maxRoll = n;
        }
        let nextRoll = maxRoll + 1;
        for (const enroll of sorted) {
          if (enroll.rollNumber === null) {
            updates.push({ id: enroll.id, rollNumber: String(nextRoll++) });
          }
        }
        if (updates.length > 0) {
          await prisma.$transaction(
            updates.map(({ id, rollNumber }) =>
              prisma.studentEnrollment.update({
                where: { id },
                data: { rollNumber },
              }),
            ),
          );
        }
      }

      totalStudents += enrollments.length;
      totalUpdated += updates.length;
      sectionResults.push({
        sectionId: section.id,
        sectionName: section.name,
        students: enrollments.length,
        updated: updates.length,
      });
    }

    await invalidate(schoolId);

    return res.json({
      message: `Roll numbers generated for ${activeSections.length} classes`,
      totalSections: activeSections.length,
      totalStudents,
      totalUpdated,
      mode,
      sections: sectionResults,
    });
  } catch (err) {
    console.error("[generateRollNumbersBulk]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};
