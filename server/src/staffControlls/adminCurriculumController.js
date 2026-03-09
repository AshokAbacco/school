// server/src/staffControlls/adminCurriculumController.js

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/* ──────────────────────────────────────────────────────────────
   GET /api/admin/curriculum/overview
   Returns ALL subject+section assignments for the school
   with syllabus and progress — admin read-only view
─────────────────────────────────────────────────────────────── */
export async function getAdminCurriculumOverview(req, res) {
  try {
    const { schoolId } = req.user;

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year found" });

    // Fetch ALL teacher assignments for this school + active year
    const assignments = await prisma.teacherAssignment.findMany({
      where: { academicYearId: activeYear.id, teacher: { schoolId } },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // For each assignment fetch syllabus + progress
    const results = await Promise.all(
      assignments.map(async (a) => {
        const syllabus = await prisma.subjectSyllabus.findUnique({
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
        });

        const progress = await prisma.sectionPortionProgress.findUnique({
          where: {
            subjectId_classSectionId_academicYearId: {
              subjectId: a.subjectId,
              classSectionId: a.classSectionId,
              academicYearId: activeYear.id,
            },
          },
        });

        return {
          assignmentId: a.id,
          subjectId: a.subjectId,
          subject: a.subject,
          grade: a.classSection.grade,
          classSection: a.classSection,
          teacher: a.teacher,
          syllabus: syllabus
            ? {
                totalChapters: syllabus.totalChapters,
                setBy: syllabus.createdBy,
                updatedBy: syllabus.updatedBy,
              }
            : null,
          progress: progress
            ? {
                completedChapters: progress.completedChapters,
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
