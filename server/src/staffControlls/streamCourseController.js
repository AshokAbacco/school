// server/src/staffControlls/streamCourseController.js
import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

const invalidate = (schoolId) => cacheService.invalidateSchool(schoolId);

// ═══════════════════════════════════════════════════════════════
//  STREAMS  (PUC only)
// ═══════════════════════════════════════════════════════════════

// GET /api/streams
export const getStreams = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const streams = await prisma.stream.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      include: {
        combinations: { orderBy: { name: "asc" } },
        _count: { select: { classSections: true } },
      },
    });
    return res.json({ streams });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/streams
export const createStream = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { name, code, hasCombinations } = req.body;

    if (!name?.trim())
      return res.status(400).json({ message: "Stream name is required" });

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (school?.type !== "PUC")
      return res
        .status(400)
        .json({ message: "Streams are only for PUC institutions" });

    const dup = await prisma.stream.findUnique({
      where: { name_schoolId: { name: name.trim(), schoolId } },
    });
    if (dup)
      return res
        .status(409)
        .json({ message: `Stream "${name.trim()}" already exists` });

    const stream = await prisma.stream.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        hasCombinations: hasCombinations ?? false,
        schoolId,
      },
      include: { combinations: true },
    });
    await invalidate(schoolId);
    return res.status(201).json({ message: "Stream created", stream });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /api/streams/:id
export const updateStream = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { name, code, isActive, hasCombinations } = req.body;

    const existing = await prisma.stream.findFirst({
      where: { id, schoolId },
    });
    if (!existing) return res.status(404).json({ message: "Stream not found" });

    const stream = await prisma.stream.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        code: code?.trim() ?? existing.code,
        isActive: isActive ?? existing.isActive,
        hasCombinations: hasCombinations ?? existing.hasCombinations,
      },
      include: { combinations: true },
    });
    await invalidate(schoolId);
    return res.json({ message: "Stream updated", stream });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/streams/:id
export const deleteStream = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const existing = await prisma.stream.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ message: "Stream not found" });

    const count = await prisma.classSection.count({ where: { streamId: id } });
    if (count > 0)
      return res.status(409).json({
        message: `Cannot delete — ${count} class section(s) use this stream`,
      });

    await prisma.stream.delete({ where: { id } });
    await invalidate(schoolId);
    return res.json({ message: "Stream deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  STREAM COMBINATIONS  (PUC — PCMB, PCMC, CEBA etc.)
// ═══════════════════════════════════════════════════════════════

// POST /api/streams/:streamId/combinations
export const createCombination = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { streamId } = req.params;
    const { name, code } = req.body;

    if (!name?.trim())
      return res.status(400).json({ message: "Combination name is required" });

    const stream = await prisma.stream.findFirst({
      where: { id: streamId, schoolId },
    });
    if (!stream) return res.status(404).json({ message: "Stream not found" });

    const dup = await prisma.streamCombination.findUnique({
      where: { name_streamId: { name: name.trim(), streamId } },
    });
    if (dup)
      return res
        .status(409)
        .json({ message: `Combination "${name.trim()}" already exists` });

    const combination = await prisma.streamCombination.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        streamId,
      },
    });
    await invalidate(schoolId);
    return res
      .status(201)
      .json({ message: "Combination created", combination });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /api/streams/:streamId/combinations/:combinationId
export const updateCombination = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { streamId, combinationId } = req.params;
    const { name, code, isActive } = req.body;

    const stream = await prisma.stream.findFirst({
      where: { id: streamId, schoolId },
    });
    if (!stream) return res.status(404).json({ message: "Stream not found" });

    const existing = await prisma.streamCombination.findFirst({
      where: { id: combinationId, streamId },
    });
    if (!existing)
      return res.status(404).json({ message: "Combination not found" });

    const combination = await prisma.streamCombination.update({
      where: { id: combinationId },
      data: {
        name: name?.trim() ?? existing.name,
        code: code?.trim() ?? existing.code,
        isActive: isActive ?? existing.isActive,
      },
    });
    await invalidate(schoolId);
    return res.json({ message: "Combination updated", combination });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/streams/:streamId/combinations/:combinationId
export const deleteCombination = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { streamId, combinationId } = req.params;

    const stream = await prisma.stream.findFirst({
      where: { id: streamId, schoolId },
    });
    if (!stream) return res.status(404).json({ message: "Stream not found" });

    const count = await prisma.classSection.count({
      where: { combinationId },
    });
    if (count > 0)
      return res.status(409).json({
        message: `Cannot delete — ${count} class section(s) use this combination`,
      });

    await prisma.streamCombination.delete({ where: { id: combinationId } });
    await invalidate(schoolId);
    return res.json({ message: "Combination deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  COURSES  (Degree / Diploma / PG)
// ═══════════════════════════════════════════════════════════════

// GET /api/courses
export const getCourses = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const courses = await prisma.course.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      include: {
        branches: { orderBy: { name: "asc" } },
        _count: { select: { classSections: true } },
      },
    });
    return res.json({ courses });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/courses
export const createCourse = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { name, code, totalSemesters, hasBranches, branches } = req.body;

    if (!name?.trim())
      return res.status(400).json({ message: "Course name is required" });
    if (!totalSemesters || totalSemesters < 1)
      return res
        .status(400)
        .json({ message: "Total semesters must be at least 1" });

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const semesterTypes = ["DEGREE", "DIPLOMA", "POSTGRADUATE"];
    if (!semesterTypes.includes(school?.type))
      return res.status(400).json({
        message:
          "Courses are only for Degree, Diploma, or Postgraduate institutions",
      });

    const dup = await prisma.course.findUnique({
      where: { name_schoolId: { name: name.trim(), schoolId } },
    });
    if (dup)
      return res
        .status(409)
        .json({ message: `Course "${name.trim()}" already exists` });

    const course = await prisma.course.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        totalSemesters: Number(totalSemesters),
        hasBranches: hasBranches ?? false,
        schoolId,
        branches: branches?.length
          ? {
              create: branches.map((b) => ({
                name: b.name.trim(),
                code: b.code?.trim() || null,
              })),
            }
          : undefined,
      },
      include: { branches: true },
    });
    await invalidate(schoolId);
    return res.status(201).json({ message: "Course created", course });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /api/courses/:id
export const updateCourse = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { name, code, totalSemesters, isActive, hasBranches } = req.body;

    const existing = await prisma.course.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ message: "Course not found" });

    const course = await prisma.course.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        code: code?.trim() ?? existing.code,
        totalSemesters: totalSemesters
          ? Number(totalSemesters)
          : existing.totalSemesters,
        isActive: isActive ?? existing.isActive,
        hasBranches: hasBranches ?? existing.hasBranches,
      },
      include: { branches: true },
    });
    await invalidate(schoolId);
    return res.json({ message: "Course updated", course });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/courses/:id
export const deleteCourse = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const existing = await prisma.course.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ message: "Course not found" });

    const count = await prisma.classSection.count({ where: { courseId: id } });
    if (count > 0)
      return res.status(409).json({
        message: `Cannot delete — ${count} class section(s) use this course`,
      });

    await prisma.course.delete({ where: { id } });
    await invalidate(schoolId);
    return res.json({ message: "Course deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  COURSE BRANCHES
// ═══════════════════════════════════════════════════════════════

// POST /api/courses/:courseId/branches
export const createBranch = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId } = req.params;
    const { name, code } = req.body;

    if (!name?.trim())
      return res.status(400).json({ message: "Branch name is required" });

    const course = await prisma.course.findFirst({
      where: { id: courseId, schoolId },
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const dup = await prisma.courseBranch.findUnique({
      where: { name_courseId: { name: name.trim(), courseId } },
    });
    if (dup)
      return res
        .status(409)
        .json({ message: `Branch "${name.trim()}" already exists` });

    const branch = await prisma.courseBranch.create({
      data: { name: name.trim(), code: code?.trim() || null, courseId },
    });
    await invalidate(schoolId);
    return res.status(201).json({ message: "Branch created", branch });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /api/courses/:courseId/branches/:branchId
export const updateBranch = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, branchId } = req.params;
    const { name, code, isActive } = req.body;

    const course = await prisma.course.findFirst({
      where: { id: courseId, schoolId },
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const existing = await prisma.courseBranch.findFirst({
      where: { id: branchId, courseId },
    });
    if (!existing) return res.status(404).json({ message: "Branch not found" });

    const branch = await prisma.courseBranch.update({
      where: { id: branchId },
      data: {
        name: name?.trim() ?? existing.name,
        code: code?.trim() ?? existing.code,
        isActive: isActive ?? existing.isActive,
      },
    });
    await invalidate(schoolId);
    return res.json({ message: "Branch updated", branch });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/courses/:courseId/branches/:branchId
export const deleteBranch = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { courseId, branchId } = req.params;

    const course = await prisma.course.findFirst({
      where: { id: courseId, schoolId },
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const count = await prisma.classSection.count({ where: { branchId } });
    if (count > 0)
      return res.status(409).json({
        message: `Cannot delete — ${count} class section(s) use this branch`,
      });

    await prisma.courseBranch.delete({ where: { id: branchId } });
    await invalidate(schoolId);
    return res.json({ message: "Branch deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
