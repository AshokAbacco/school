import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

const prisma = new PrismaClient();

export async function getAdminCurriculumOverview(req, res) {
  try {
    const { schoolId } = req.user;

    const cacheKey = await cacheService.buildKey(schoolId, "curriculum:overview");
    // const cached = await cacheService.get(cacheKey);
    // if (cached) return res.json(JSON.parse(cached));

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
          syllabus: syllabus
            ? { totalChapters: syllabus.totalChapters, chapterNames: syllabus.chapterNames, setBy: syllabus.createdBy, updatedBy: syllabus.updatedBy }
            : null,
          progress: progress
            ? { 
                completedChapters:
                  progress.completedChapterIndices?.length ??
                  progress.completedChapters ??
                  0,
                completedChapterIndices: progress.completedChapterIndices,
                updatedAt: progress.updatedAt 
              }
            : null,
        };
      }),
    );

    // await cacheService.set(cacheKey, results);
    res.json(results);
  } catch (err) {
    console.error("getAdminCurriculumOverview:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}