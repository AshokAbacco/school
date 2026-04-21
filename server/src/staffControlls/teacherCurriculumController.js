// server/src/staffControlls/teacherCurriculumController.js

import { PrismaClient } from "@prisma/client";
import { prisma } from "../config/db.js";

/* ─── helpers ────────────────────────────────────────────────────────────── */

/**
 * Validates and normalises the `chapters` payload.
 * Returns { ok: true, chapters } or { ok: false, message }.
 *
 * Each element must be an object with at least a non-empty `name`.
 * `description` defaults to an empty string if missing.
 */
function parseChapters(raw, existing = []) {
  if (!Array.isArray(raw)) {
    return { ok: false, message: "`chapters` must be an array" };
  }

  const chapters = raw
    .map((ch, i) => {
      const name = typeof ch?.name === "string" ? ch.name.trim() : "";
      const description =
        typeof ch?.description === "string"
          ? ch.description.trim()
          : "";

      // 🔥 preserve old description if not provided
      return {
        name,
        description: description || existing[i]?.description || "",
      };
    })
    .filter((c) => c.name);

  if (chapters.length === 0) {
    return { ok: false, message: "At least one chapter is required" };
  }

  return { ok: true, chapters };
}

/**
 * Coerces the stored `chapters` JSON value into a typed array.
 * Guards against null / legacy data shapes.
 */
function normaliseChapters(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((ch) => ({
    name: typeof ch?.name === "string" ? ch.name : "",
    description: typeof ch?.description === "string" ? ch.description : "",
  }));
}

/** Builds the syllabus shape returned to the client. */
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

/* ──────────────────────────────────────────────────────────────
   GET /api/teacher/curriculum/assignments
   Returns all subjects + sections assigned to the logged-in teacher
   with syllabus and section progress.
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

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year found" });

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId, academicYearId: activeYear.id },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
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
          subjectId: a.subjectId,
          subject: a.subject,
          grade: a.classSection.grade,
          classSection: a.classSection,
          syllabus: formatSyllabus(syllabus),
          progress: progress
            ? {
                completedChapters: progress.completedChapters,
                completedChapterIndices: progress.completedChapterIndices ?? [],
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
   Create syllabus for a subject+grade (first time).

   Body: { subjectId, grade, totalChapters, description?, chapters? }
   `chapters` is optional on creation — can be added later via PUT /chapters.
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

    const { subjectId, grade, totalChapters, description, chapters } = req.body;

if (!subjectId || !grade) {
  return res.status(400).json({
    message: "subjectId and grade are required",
  });
}

    const total = Number(totalChapters);

    // Validate chapters if provided
    let parsedChapters = [];
    if (chapters !== undefined) {
      const result = parseChapters(chapters, total);
      if (!result.ok) return res.status(400).json({ message: result.message });
      parsedChapters = result.chapters;
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

    const existing = await prisma.subjectSyllabus.findUnique({
      where: {
        subjectId_grade_academicYearId: {
          subjectId,
          grade,
          academicYearId: activeYear.id,
        },
      },
    });
    if (existing)
      return res
        .status(409)
        .json({ message: "Syllabus already set. Use PUT to update." });

    const syllabus = await prisma.subjectSyllabus.create({
      data: {
        subjectId,
        grade,
        academicYearId: activeYear.id,
        schoolId,
        totalChapters: total,
        chapters: parsedChapters,
        description: description?.trim() || null,
        createdById: teacherId,
        updatedById: teacherId,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ syllabus: formatSyllabus(syllabus) });
  } catch (err) {
    console.error("setSubjectSyllabus:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/* ──────────────────────────────────────────────────────────────
   PUT /api/teacher/curriculum/syllabus
   Edit total chapters (and optionally chapters + description).

   Body: { subjectId, grade, totalChapters, description?, chapters? }
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

    const { subjectId, grade, totalChapters, description, chapters } = req.body;

      if (!subjectId || !grade) {
        return res.status(400).json({
          message: "subjectId and grade are required",
        });
      }

    const total = Number(totalChapters);

    let parsedChapters;
    if (chapters !== undefined) {
      const result = parseChapters(chapters, total);
      if (!result.ok) return res.status(400).json({ message: result.message });
      parsedChapters = result.chapters;
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year" });

    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        subjectId,
        academicYearId: activeYear.id,
        classSection: { grade },
      },
    });
    if (!assignment)
      return res.status(403).json({ message: "Not authorized" });

    // Build update data — only include chapters if provided
      const updateData = {
        updatedById: teacherId,
      };

      if (totalChapters !== undefined) {
        const total = Number(totalChapters);
        if (!total || total < 1) {
          return res.status(400).json({
            message: "totalChapters must be >= 1",
          });
        }
        updateData.totalChapters = total;
      }

      if (description !== undefined) {
        updateData.description = description?.trim() || null;
      }

      if (parsedChapters !== undefined) {
        updateData.chapters = parsedChapters;
      }
    if (parsedChapters !== undefined) {
      updateData.chapters = parsedChapters;
    }

    const syllabus = await prisma.subjectSyllabus.update({
      where: {
        subjectId_grade_academicYearId: {
          subjectId,
          grade,
          academicYearId: activeYear.id,
        },
      },
      data: updateData,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({ syllabus: formatSyllabus(syllabus) });
  } catch (err) {
    console.error("updateSubjectSyllabus:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/* ──────────────────────────────────────────────────────────────
   PUT /api/teacher/curriculum/chapters
   Save/update individual chapter names + descriptions.

   Body: { subjectId, grade, chapters: [{ name, description }] }
─────────────────────────────────────────────────────────────── */
export async function updateChapterNames(req, res) {
  try {
    const { schoolId } = req.user;
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!teacherProfile)
      return res.status(403).json({ message: "Teacher profile not found" });
    const teacherId = teacherProfile.id;

    const { subjectId, grade, chapters } = req.body;

    if (!subjectId || !grade) {
      return res
        .status(400)
        .json({ message: "subjectId and grade are required" });
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!activeYear)
      return res.status(404).json({ message: "No active academic year" });

    // Verify teacher assignment
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

    // Syllabus must already exist
    const syllabus = await prisma.subjectSyllabus.findUnique({
      where: {
        subjectId_grade_academicYearId: {
          subjectId,
          grade,
          academicYearId: activeYear.id,
        },
      },
    });
    if (!syllabus)
      return res
        .status(404)
        .json({ message: "Set total chapters first before naming them" });

    // Validate chapters array
   const result = parseChapters(chapters, syllabus.chapters);
    if (!result.ok) return res.status(400).json({ message: result.message });

    const updated = await prisma.subjectSyllabus.update({
      where: {
        subjectId_grade_academicYearId: {
          subjectId,
          grade,
          academicYearId: activeYear.id,
        },
      },
      data: {
        chapters: result.chapters,
        updatedById: teacherId,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({ syllabus: formatSyllabus(updated) });
  } catch (err) {
    console.error("updateChapterNames:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/* ──────────────────────────────────────────────────────────────
   PUT /api/teacher/curriculum/progress
   Update completed chapters for a specific section. Unchanged.
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

    const { subjectId, classSectionId, completedChapters, completedChapterIndices } =
      req.body;

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
        completedChapterIndices: Array.isArray(completedChapterIndices)
          ? completedChapterIndices
          : [],
        updatedById: teacherId,
      },
      create: {
        subjectId,
        classSectionId,
        academicYearId: activeYear.id,
        schoolId,
        completedChapters: Number(completedChapters),
        completedChapterIndices: Array.isArray(completedChapterIndices)
          ? completedChapterIndices
          : [],
        updatedById: teacherId,
      },
    });

    res.json(progress);
  } catch (err) {
    console.error("updateSectionProgress:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}