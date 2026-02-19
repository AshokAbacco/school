// server/src/controllers/classSectionController.js
import { PrismaClient } from "@prisma/client";
import redisClient from "../utils/redis.js";

const prisma = new PrismaClient();
const CACHE_TTL = 60 * 5; // 5 minutes

// ── Safe Redis helpers (fail silently) ───────────────────────────────────────

async function cacheGet(key) {
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error(`[Redis] GET ${key} failed:`, err.message);
    return null;
  }
}

async function cacheSet(key, value) {
  try {
    await redisClient.setEx(key, CACHE_TTL, JSON.stringify(value));
  } catch (err) {
    console.error(`[Redis] SET ${key} failed:`, err.message);
  }
}

async function cacheDel(...keys) {
  try {
    await redisClient.del(keys);
  } catch (err) {
    console.error(`[Redis] DEL ${keys.join(", ")} failed:`, err.message);
  }
}

// Uses SCAN instead of KEYS to avoid blocking Redis in production
async function scanAndDelete(pattern) {
  try {
    let cursor = 0;
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = reply.cursor;
      if (reply.keys.length) await redisClient.del(reply.keys);
    } while (cursor !== 0);
  } catch (err) {
    console.error(`[Redis] SCAN/DEL ${pattern} failed:`, err.message);
  }
}

// ── Cache key helpers ────────────────────────────────────────────────────────
const cacheKey = {
  list: (schoolId, academicYearId) =>
    `class-sections:${schoolId}:list:${academicYearId ?? "all"}`,
  single: (schoolId, id, academicYearId) =>
    `class-sections:${schoolId}:${id}:${academicYearId ?? "all"}`,
};

async function invalidateCache(schoolId, id = null) {
  // Wipe all list variants for this school
  await scanAndDelete(`class-sections:${schoolId}:list:*`);

  // Wipe all academicYearId variants for a specific section
  if (id) {
    await scanAndDelete(`class-sections:${schoolId}:${id}:*`);
  }
}

// ── GET /api/class-sections?academicYearId=xxx ───────────────────────────────
export const getClassSections = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYearId } = req.query;
    const key = cacheKey.list(schoolId, academicYearId);

    // 1. Check cache
    const cached = await cacheGet(key);
    if (cached) {
      return res.json({ classSections: JSON.parse(cached), fromCache: true });
    }

    // 2. Cache miss → fetch from DB
    const classSections = await prisma.classSection.findMany({
      where: { schoolId },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
      include: {
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

    // 3. Store in cache
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
    const { id } = req.params;
    const { academicYearId } = req.query;
    const key = cacheKey.single(schoolId, id, academicYearId);

    // 1. Check cache
    const cached = await cacheGet(key);
    if (cached) {
      return res.json({ classSection: JSON.parse(cached), fromCache: true });
    }

    // 2. Cache miss → fetch from DB
    const section = await prisma.classSection.findFirst({
      where: { id, schoolId },
      include: {
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

    // 3. Store in cache
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
    const { grade, section, sections, room, capacity } = req.body;

    if (!grade?.trim())
      return res.status(400).json({ message: "Grade is required" });

    // Bulk create
    if (sections && Array.isArray(sections) && sections.length > 0) {
      const results = [];
      const errors = [];
      for (const sec of sections) {
        const secName = sec.section?.trim();
        if (!secName) continue;
        const name = `${grade.trim()}-${secName}`;
        const dup = await prisma.classSection.findFirst({
          where: { grade: grade.trim(), section: secName, schoolId },
        });
        if (dup) {
          errors.push(`${name} already exists`);
          continue;
        }
        const created = await prisma.classSection.create({
          data: { grade: grade.trim(), section: secName, name, schoolId },
        });
        results.push(created);
      }
      await invalidateCache(schoolId);
      return res.status(201).json({
        message: `${results.length} class(es) created`,
        classSections: results,
        errors,
      });
    }

    // Single create
    if (!section?.trim())
      return res.status(400).json({ message: "Section is required" });
    const name = `${grade.trim()}-${section.trim()}`;
    const dup = await prisma.classSection.findFirst({
      where: { grade: grade.trim(), section: section.trim(), schoolId },
    });
    if (dup) return res.status(409).json({ message: `${name} already exists` });

    const classSection = await prisma.classSection.create({
      data: { grade: grade.trim(), section: section.trim(), name, schoolId },
    });

    await invalidateCache(schoolId);
    return res
      .status(201)
      .json({ message: "Class section created", classSection });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/class-sections/:id/activate ───────────────────────────────────
export const activateClassForYear = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
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

    await invalidateCache(schoolId, id);
    return res.json({ message: "Class activated for year", link });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/class-sections/:id ──────────────────────────────────────────
export const deleteClassSection = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
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
    await invalidateCache(schoolId, id);
    return res.json({ message: "Class section deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/class-sections/:id/class-subjects ──────────────────────────────
export const assignSubjectToClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
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

    await invalidateCache(schoolId, classSectionId);
    return res.status(201).json({ message: "Subject assigned", classSubject });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/class-sections/:id/class-subjects/:classSubjectId ────────────
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
    if (section) await invalidateCache(section.schoolId, classSectionId);

    return res.json({ message: "Subject removed from class" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/class-sections/:id/teacher-assignments ─────────────────────────
export const assignTeacherToSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
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

    await invalidateCache(schoolId, classSectionId);
    return res.status(201).json({ message: "Teacher assigned", assignment });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/class-sections/:id/teacher-assignments/:assignmentId ─────────
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
    if (section) await invalidateCache(section.schoolId, classSectionId);

    return res.json({ message: "Teacher assignment removed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
