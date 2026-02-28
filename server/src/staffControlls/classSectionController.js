// server/src/staffControlls/classSectionController.js
// UPDATED — supports section optional, stream/course/branch, grade validation
import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

const prisma = new PrismaClient();

// ── Cache helpers ─────────────────────────────────────────────────────────────

const invalidate = (schoolId) => cacheService.invalidateSchool(schoolId);

async function cacheGet(key) {
  try {
    return await cacheService.get(key);
  } catch {
    return null;
  }
}
async function cacheSet(key, value) {
  try {
    await cacheService.set(key, value);
  } catch {}
}

// ── Grade validation per school type ─────────────────────────────────────────

function validateGrade(grade, schoolType) {
  const num = parseInt((grade || "").replace(/\D/g, ""));

  if (schoolType === "SCHOOL") {
    if (isNaN(num) || num < 1 || num > 10)
      return "School only allows Grade 1 to Grade 10";
  }

  if (schoolType === "PUC") {
    if (isNaN(num) || (num !== 11 && num !== 12))
      return "PUC only allows Grade 11 and Grade 12";
  }

  if (["DEGREE", "DIPLOMA", "POSTGRADUATE"].includes(schoolType)) {
    if (!grade?.toLowerCase().startsWith("semester"))
      return "Degree/Diploma/PG must use Semester format (e.g. Semester 1)";
    if (isNaN(num) || num < 1)
      return "Semester number must be a positive number";
  }

  return null; // valid
}

/**
 * Auto-generate display name for a class section
 */
function buildSectionName({ grade, section, stream, course, branch }) {
  const parts = [];
  if (course) parts.push(course);
  if (branch) parts.push(branch);
  parts.push(grade);
  if (stream) parts.push(stream);
  if (section) parts.push(section);
  return parts.join(" - ");
}

// ── GET /api/class-sections ──────────────────────────────────────────────────
export const getClassSections = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { academicYearId } = req.query;
    const namespace = `class-sections:${schoolId}:list:${academicYearId ?? "all"}`;
    const key = await cacheService.buildKey(schoolId, namespace);

    const cached = await cacheGet(key);
    if (cached)
      return res.json({ classSections: JSON.parse(cached), fromCache: true });

    const classSections = await prisma.classSection.findMany({
      where: { schoolId },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
      include: {
        stream: { select: { id: true, name: true } },
        course: { select: { id: true, name: true, totalSemesters: true } },
        branch: { select: { id: true, name: true, code: true } },
        academicYearLinks: {
          where: academicYearId ? { academicYearId } : {},
          include: {
            classTeacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                designation: true,
                profileImage: true,
              },
            },
            academicYear: { select: { id: true, name: true, isActive: true } },
          },
        },
        _count: {
          select: {
            studentEnrollments: academicYearId
              ? { where: { academicYearId } }
              : true,
          },
        },
      },
    });

    await cacheSet(key, classSections);
    return res.json({ classSections });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── GET /api/class-sections/:id ──────────────────────────────────────────────
export const getClassSectionById = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id } = req.params;
    const { academicYearId } = req.query;
    const namespace = `class-sections:${schoolId}:${id}:${academicYearId ?? "all"}`;
    const key = await cacheService.buildKey(schoolId, namespace);

    const cached = await cacheGet(key);
    if (cached)
      return res.json({ classSection: JSON.parse(cached), fromCache: true });

    const section = await prisma.classSection.findFirst({
      where: { id, schoolId },
      include: {
        stream: true,
        course: true,
        branch: true,
        academicYearLinks: {
          where: academicYearId ? { academicYearId } : {},
          include: {
            classTeacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
              },
            },
            academicYear: { select: { id: true, name: true } },
          },
        },
        classSubjects: {
          where: academicYearId ? { academicYearId } : {},
          include: { subject: true },
        },
        teacherAssignments: {
          where: academicYearId ? { academicYearId } : {},
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
              },
            },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        _count: { select: { studentEnrollments: true } },
      },
    });

    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    await cacheSet(key, section);
    return res.json({ classSection: section });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/class-sections ─────────────────────────────────────────────────
export const createClassSection = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { grade, section, sections, streamId, courseId, branchId } = req.body;

    if (!grade?.trim())
      return res.status(400).json({ message: "Grade is required" });

    // Get school type for validation
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { type: true },
    });

    const gradeError = validateGrade(grade.trim(), school.type);
    if (gradeError) return res.status(400).json({ message: gradeError });

    // Validate stream/course/branch based on school type
    if (school.type === "PUC" && !streamId)
      return res.status(400).json({ message: "Stream is required for PUC" });

    if (
      ["DEGREE", "DIPLOMA", "POSTGRADUATE"].includes(school.type) &&
      !courseId
    )
      return res
        .status(400)
        .json({ message: "Course is required for Degree/Diploma/PG" });

    // Fetch related names for display
    let streamName, courseName, branchName;
    if (streamId) {
      const s = await prisma.stream.findFirst({
        where: { id: streamId, schoolId },
      });
      if (!s) return res.status(404).json({ message: "Stream not found" });
      streamName = s.name;
    }
    if (courseId) {
      const c = await prisma.course.findFirst({
        where: { id: courseId, schoolId },
      });
      if (!c) return res.status(404).json({ message: "Course not found" });
      courseName = c.name;
    }
    if (branchId) {
      const b = await prisma.courseBranch.findFirst({
        where: { id: branchId, courseId },
      });
      if (!b) return res.status(404).json({ message: "Branch not found" });
      branchName = b.name;
    }

    // ── Bulk create ─────────────────────────────────────────────
    if (sections && Array.isArray(sections) && sections.length > 0) {
      const results = [];
      const errors = [];

      for (const sec of sections) {
        const secName = sec.section?.trim() || null;
        const name = buildSectionName({
          grade: grade.trim(),
          section: secName,
          stream: streamName,
          course: courseName,
          branch: branchName,
        });

        // Check duplicate
        const dup = await prisma.classSection.findFirst({
          where: {
            grade: grade.trim(),
            section: secName,
            schoolId,
            streamId: streamId || null,
            courseId: courseId || null,
            branchId: branchId || null,
          },
        });

        if (dup) {
          errors.push(`${name} already exists`);
          continue;
        }

        const created = await prisma.classSection.create({
          data: {
            grade: grade.trim(),
            section: secName,
            name,
            schoolId,
            streamId: streamId || null,
            courseId: courseId || null,
            branchId: branchId || null,
          },
        });
        results.push(created);
      }

      await invalidate(schoolId);
      return res.status(201).json({
        message: `${results.length} class(es) created`,
        classSections: results,
        errors,
      });
    }

    // ── Single create ───────────────────────────────────────────
    const secName = section?.trim() || null;
    const name = buildSectionName({
      grade: grade.trim(),
      section: secName,
      stream: streamName,
      course: courseName,
      branch: branchName,
    });

    const dup = await prisma.classSection.findFirst({
      where: {
        grade: grade.trim(),
        section: secName,
        schoolId,
        streamId: streamId || null,
        courseId: courseId || null,
        branchId: branchId || null,
      },
    });
    if (dup) return res.status(409).json({ message: `${name} already exists` });

    const classSection = await prisma.classSection.create({
      data: {
        grade: grade.trim(),
        section: secName,
        name,
        schoolId,
        streamId: streamId || null,
        courseId: courseId || null,
        branchId: branchId || null,
      },
      include: {
        stream: true,
        course: true,
        branch: true,
      },
    });

    await invalidate(schoolId);
    return res
      .status(201)
      .json({ message: "Class section created", classSection });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/class-sections/:id/activate ────────────────────────────────────
export const activateClassForYear = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id } = req.params;
    const { academicYearId, classTeacherId, isActive = true } = req.body;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const section = await prisma.classSection.findFirst({
      where: { id, schoolId },
    });
    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    const year = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });
    if (!year)
      return res.status(404).json({ message: "Academic year not found" });

    const link = await prisma.classSectionAcademicYear.upsert({
      where: {
        classSectionId_academicYearId: { classSectionId: id, academicYearId },
      },
      update: { classTeacherId: classTeacherId || null, isActive },
      create: {
        classSectionId: id,
        academicYearId,
        classTeacherId: classTeacherId || null,
        isActive,
      },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
        academicYear: { select: { id: true, name: true } },
      },
    });

    await invalidate(schoolId);
    return res.json({ message: "Class activated for year", link });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/class-sections/:id ───────────────────────────────────────────
export const deleteClassSection = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id } = req.params;
    const section = await prisma.classSection.findFirst({
      where: { id, schoolId },
    });
    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    const enrollCount = await prisma.studentEnrollment.count({
      where: { classSectionId: id },
    });
    if (enrollCount > 0)
      return res.status(409).json({
        message: `Cannot delete — ${enrollCount} student(s) enrolled`,
      });

    await prisma.classSection.delete({ where: { id } });
    await invalidate(schoolId);
    return res.json({ message: "Class section deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/class-sections/:id/class-subjects ───────────────────────────────
export const assignSubjectToClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id: classSectionId } = req.params;
    const { subjectId, academicYearId } = req.body;
    if (!subjectId || !academicYearId)
      return res
        .status(400)
        .json({ message: "subjectId and academicYearId are required" });

    const section = await prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
    });
    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    const classSubject = await prisma.classSubject.upsert({
      where: {
        classSectionId_subjectId_academicYearId: {
          classSectionId,
          subjectId,
          academicYearId,
        },
      },
      update: {},
      create: { classSectionId, subjectId, academicYearId },
      include: { subject: true },
    });

    await invalidate(schoolId);
    return res.status(201).json({ message: "Subject assigned", classSubject });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/class-sections/:id/class-subjects/:classSubjectId ─────────────
export const removeSubjectFromClass = async (req, res) => {
  try {
    const { id: classSectionId, classSubjectId } = req.params;
    const cs = await prisma.classSubject.findFirst({
      where: { id: classSubjectId, classSectionId },
    });
    if (!cs) return res.status(404).json({ message: "Assignment not found" });

    await prisma.classSubject.delete({ where: { id: classSubjectId } });

    const section = await prisma.classSection.findUnique({
      where: { id: classSectionId },
      select: { schoolId: true },
    });
    if (section) await invalidate(section.schoolId);
    return res.json({ message: "Subject removed from class" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/class-sections/:id/teacher-assignments ─────────────────────────
export const assignTeacherToSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id: classSectionId } = req.params;
    const { teacherId, subjectId, academicYearId } = req.body;
    if (!teacherId || !subjectId || !academicYearId)
      return res
        .status(400)
        .json({ message: "teacherId, subjectId, academicYearId required" });

    const assignment = await prisma.teacherAssignment.upsert({
      where: {
        classSectionId_subjectId_academicYearId: {
          classSectionId,
          subjectId,
          academicYearId,
        },
      },
      update: { teacherId },
      create: { classSectionId, subjectId, academicYearId, teacherId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    await invalidate(schoolId);
    return res.status(201).json({ message: "Teacher assigned", assignment });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/class-sections/:id/teacher-assignments/:assignmentId ──────────
export const removeTeacherAssignment = async (req, res) => {
  try {
    const { id: classSectionId, assignmentId } = req.params;
    const ta = await prisma.teacherAssignment.findFirst({
      where: { id: assignmentId, classSectionId },
    });
    if (!ta) return res.status(404).json({ message: "Assignment not found" });

    await prisma.teacherAssignment.delete({ where: { id: assignmentId } });

    const section = await prisma.classSection.findUnique({
      where: { id: classSectionId },
      select: { schoolId: true },
    });
    if (section) await invalidate(section.schoolId);
    return res.json({ message: "Teacher assignment removed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
