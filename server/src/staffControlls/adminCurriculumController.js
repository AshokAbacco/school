// server/src/adminControlls/adminCurriculumController.js

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Coerces the stored `chapters` JSON into a typed array.
 * Also handles legacy data where chapters may be missing or null.
 */
function normaliseChapters(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((ch) => ({
    name: typeof ch?.name === "string" ? ch.name : "",
    description: typeof ch?.description === "string" ? ch.description : "",
  }));
}

function formatSyllabus(syllabus) {
  if (!syllabus) return null;
  return {
    totalChapters: syllabus.totalChapters,
    chapters: normaliseChapters(syllabus.chapters),
    description: syllabus.description ?? null,
    setBy: syllabus.createdBy ?? null,
    updatedBy: syllabus.updatedBy ?? null,
  };
}

export async function getAdminCurriculumOverview(req, res) {
  try {
    const { schoolId } = req.user;

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year found" });

    const assignments = await prisma.teacherAssignment.findMany({
      where: { academicYearId: activeYear.id, teacher: { schoolId } },
      include: {
        subject:      { select: { id: true, name: true, code: true } },
        classSection: { select: { id: true, name: true, grade: true, section: true } },
        teacher:      { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const results = await Promise.all(
      assignments.map(async (a) => {
        const [syllabus, progress] = await Promise.all([
          prisma.subjectSyllabus.findUnique({
            where: {
              subjectId_grade_academicYearId: {
                subjectId: a.subjectId,
                grade: a.classSection.grade,
                academicYearId: activeYear.id,
              },
            },
            include: {
              createdBy: { select: { firstName: true, lastName: true } },
              updatedBy: { select: { firstName: true, lastName: true } },
            },
          }),
          prisma.sectionPortionProgress.findUnique({
            where: {
              subjectId_classSectionId_academicYearId: {
                subjectId: a.subjectId,
                classSectionId: a.classSectionId,
                academicYearId: activeYear.id,
              },
            },
          }),
        ]);

        return {
          assignmentId: a.id,
          subjectId:    a.subjectId,
          subject:      a.subject,
          grade:        a.classSection.grade,
          classSection: a.classSection,
          teacher:      a.teacher,
          syllabus:     formatSyllabus(syllabus),
          progress: progress
            ? {
                completedChapters:
                  progress.completedChapterIndices?.length > 0
                    ? progress.completedChapterIndices.length
                    : (progress.completedChapters ?? 0),
                completedChapterIndices: progress.completedChapterIndices ?? [],
                updatedAt: progress.updatedAt,
              }
            : null,
        };
      }),
    );

    res.json(results);
  } catch (err) {
    console.error("getAdminCurriculumOverview:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}