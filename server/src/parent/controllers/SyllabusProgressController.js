import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normaliseChapters(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((ch) => ({
    name: typeof ch?.name === "string" ? ch.name : "",
    description: typeof ch?.description === "string" ? ch.description : "",
  }));
}

export const getSyllabusProgress = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { studentId } = req.query;

    // 1. Build the parent→student lookup condition
    const whereCondition = studentId
      ? { parentId, studentId }
      : { parentId };

    const studentLink = await prisma.studentParent.findFirst({
      where: whereCondition,
      include: {
        student: {
          include: {
            enrollments: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                classSection: true,
                academicYear: true,
              },
            },
          },
        },
      },
    });

    if (!studentLink) {
      return res.status(404).json({ message: "No child found" });
    }

    const student = studentLink.student;
    const enrollment = student.enrollments[0];

    if (!enrollment) {
      return res.status(404).json({ message: "No enrollment found" });
    }

    const { classSectionId, academicYearId } = enrollment;
    const grade = enrollment.classSection.grade;

    // 2. Get subjects for this class
    const classSubjects = await prisma.classSubject.findMany({
      where: { classSectionId, academicYearId },
      include: { subject: true },
    });

    // 3. For each subject get syllabus + progress
    const subjects = await Promise.all(
      classSubjects.map(async (cs) => {
        const [syllabus, progress] = await Promise.all([
          prisma.subjectSyllabus.findUnique({
            where: {
              subjectId_grade_academicYearId: {
                subjectId: cs.subjectId,
                grade,
                academicYearId,
              },
            },
          }),
          prisma.sectionPortionProgress.findUnique({
            where: {
              subjectId_classSectionId_academicYearId: {
                subjectId: cs.subjectId,
                classSectionId,
                academicYearId,
              },
            },
          }),
        ]);

        const chapters = normaliseChapters(syllabus?.chapters);
        const total = syllabus?.totalChapters ?? chapters.length;

        // Prefer index-based count, fall back to completedChapters field
        const completedChapterIndices = progress?.completedChapterIndices ?? [];
        const completedByIndex = completedChapterIndices.length;
        const completed =
          completedByIndex > 0
            ? completedByIndex
            : (progress?.completedChapters ?? 0);

        const percentage =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          subjectId: cs.subjectId,
          subjectName: cs.subject.name,
          totalChapters: total,
          completedChapters: completed,
          completedChapterIndices,
          percentage,
          chapters, // name + description per chapter
        };
      })
    );

    return res.json({
      student: {
        id: student.id,
        name: student.name,
        class: `${enrollment.classSection.name} · ${enrollment.academicYear.name}`,
      },
      subjects,
    });
  } catch (error) {
    console.error("SyllabusProgress error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};