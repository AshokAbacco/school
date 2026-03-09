// server/src/staffControlls/teacherCurriculumController.js

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/* ──────────────────────────────────────────────────────────────
   GET /api/teacher/curriculum/assignments
   Returns all subjects + sections assigned to the logged-in teacher
   with syllabus (total chapters) and their section's progress
─────────────────────────────────────────────────────────────── */
export async function getTeacherCurriculumAssignments(req, res) {
  try {
    const { schoolId } = req.user;
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!teacherProfile)
      return res.status(403).json({ message: "Teacher profile not found" });
    const teacherId = teacherProfile.id;

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year found" });

    // Fetch all teacher assignments for active year
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId, academicYearId: activeYear.id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
      },
    });

    // For each assignment, fetch syllabus and progress
    const results = await Promise.all(
      assignments.map(async (a) => {
        // Syllabus is per subject + grade
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

        // Progress is per subject + section
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
    console.error("getTeacherCurriculumAssignments:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/* ──────────────────────────────────────────────────────────────
   POST /api/teacher/curriculum/syllabus
   Set total chapters for a subject+grade (first time)
─────────────────────────────────────────────────────────────── */
export async function setSubjectSyllabus(req, res) {
  try {
    const { schoolId } = req.user;
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!teacherProfile)
      return res.status(403).json({ message: "Teacher profile not found" });
    const teacherId = teacherProfile.id;
    const { subjectId, grade, totalChapters } = req.body;

    if (!subjectId || !grade || !totalChapters || totalChapters < 1) {
      return res
        .status(400)
        .json({ message: "subjectId, grade, and totalChapters are required" });
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year" });

    // Verify teacher is assigned to this subject in this grade
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        subjectId,
        academicYearId: activeYear.id,
        classSection: { grade },
      },
    });
    if (!assignment)
      return res
        .status(403)
        .json({ message: "You are not assigned to this subject/grade" });

    // Check if already exists
    const existing = await prisma.subjectSyllabus.findUnique({
      where: {
        subjectId_grade_academicYearId: {
          subjectId,
          grade,
          academicYearId: activeYear.id,
        },
      },
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Syllabus already set. Use PUT to update." });
    }

    const syllabus = await prisma.subjectSyllabus.create({
      data: {
        subjectId,
        grade,
        academicYearId: activeYear.id,
        schoolId,
        totalChapters: Number(totalChapters),
        createdById: teacherId,
        updatedById: teacherId,
      },
    });

    res.status(201).json(syllabus);
  } catch (err) {
    console.error("setSubjectSyllabus:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/* ──────────────────────────────────────────────────────────────
   PUT /api/teacher/curriculum/syllabus
   Edit total chapters (any assigned teacher can edit)
─────────────────────────────────────────────────────────────── */
export async function updateSubjectSyllabus(req, res) {
  try {
    const { schoolId } = req.user;
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!teacherProfile)
      return res.status(403).json({ message: "Teacher profile not found" });
    const teacherId = teacherProfile.id;
    const { subjectId, grade, totalChapters } = req.body;

    if (!subjectId || !grade || !totalChapters || totalChapters < 1) {
      return res
        .status(400)
        .json({ message: "subjectId, grade, and totalChapters are required" });
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year" });

    // Verify teacher is assigned to this subject in this grade
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        subjectId,
        academicYearId: activeYear.id,
        classSection: { grade },
      },
    });
    if (!assignment) return res.status(403).json({ message: "Not authorized" });

    const syllabus = await prisma.subjectSyllabus.update({
      where: {
        subjectId_grade_academicYearId: {
          subjectId,
          grade,
          academicYearId: activeYear.id,
        },
      },
      data: {
        totalChapters: Number(totalChapters),
        updatedById: teacherId,
      },
    });

    res.json(syllabus);
  } catch (err) {
    console.error("updateSubjectSyllabus:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/* ──────────────────────────────────────────────────────────────
   PUT /api/teacher/curriculum/progress
   Update completed chapters for a specific section
─────────────────────────────────────────────────────────────── */
export async function updateSectionProgress(req, res) {
  try {
    const { schoolId } = req.user;
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!teacherProfile)
      return res.status(403).json({ message: "Teacher profile not found" });
    const teacherId = teacherProfile.id;
    const { subjectId, classSectionId, completedChapters } = req.body;

    if (!subjectId || !classSectionId || completedChapters === undefined) {
      return res.status(400).json({
        message: "subjectId, classSectionId, and completedChapters required",
      });
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year" });

    // Verify teacher is assigned to this exact subject + section
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        subjectId,
        classSectionId,
        academicYearId: activeYear.id,
      },
    });
    if (!assignment)
      return res
        .status(403)
        .json({ message: "You are not assigned to this section" });

    // Verify syllabus exists and completed <= total
    const section = await prisma.classSection.findUnique({
      where: { id: classSectionId },
    });
    const syllabus = await prisma.subjectSyllabus.findUnique({
      where: {
        subjectId_grade_academicYearId: {
          subjectId,
          grade: section.grade,
          academicYearId: activeYear.id,
        },
      },
    });

    // Upsert progress
    const progress = await prisma.sectionPortionProgress.upsert({
      where: {
        subjectId_classSectionId_academicYearId: {
          subjectId,
          classSectionId,
          academicYearId: activeYear.id,
        },
      },
      update: {
        completedChapters: Number(completedChapters),
        updatedById: teacherId,
      },
      create: {
        subjectId,
        classSectionId,
        academicYearId: activeYear.id,
        schoolId,
        completedChapters: Number(completedChapters),
        updatedById: teacherId,
      },
    });

    res.json(progress);
  } catch (err) {
    console.error("updateSectionProgress:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
