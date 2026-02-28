// server/src/controllers/subjectController.js
import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

const prisma = new PrismaClient();

// ── GET /api/subjects ────────────────────────────────────────────────────────
export const getSubjects = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { gradeLevel, search } = req.query;
    const key = await cacheService.buildKey(
      schoolId,
      `subjects:list:${gradeLevel ?? "all"}:${search ?? "none"}`,
    );

    const cached = await cacheService.get(key);
    if (cached) {
      return res.json({ subjects: JSON.parse(cached), fromCache: true });
    }

    // 2. Cache miss → fetch from DB
    const subjects = await prisma.subject.findMany({
      where: {
        schoolId,
        ...(gradeLevel && { gradeLevel }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { classSubjects: true },
        },
        TeacherAssignment: {
          distinct: ["teacherId"],
          select: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    // 3. Store in cache (fails silently)
    await cacheService.set(key, subjects);

    return res.json({ subjects });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/subjects ───────────────────────────────────────────────────────
export const createSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { name, code, description, isElective, gradeLevel } = req.body;

    if (!name?.trim())
      return res.status(400).json({ message: "Name is required" });

    if (code) {
      const dup = await prisma.subject.findUnique({
        where: { code_schoolId: { code: code.trim(), schoolId } },
      });
      if (dup)
        return res
          .status(409)
          .json({ message: `Code "${code}" already exists` });
    }

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        isElective: isElective ?? false,
        gradeLevel: gradeLevel?.trim() || null,
        schoolId,
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return res.status(201).json({ message: "Subject created", subject });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/subjects/:id ────────────────────────────────────────────────────
export const updateSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { name, code, description, isElective, gradeLevel } = req.body;

    const existing = await prisma.subject.findFirst({
      where: { id, schoolId },
    });
    if (!existing)
      return res.status(404).json({ message: "Subject not found" });

    if (code && code !== existing.code) {
      const dup = await prisma.subject.findFirst({
        where: { code, schoolId, NOT: { id } },
      });
      if (dup)
        return res
          .status(409)
          .json({ message: `Code "${code}" already in use` });
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        code: code?.trim() || null,
        description: description?.trim() || null,
        isElective: isElective ?? existing.isElective,
        gradeLevel: gradeLevel?.trim() || null,
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return res.json({ message: "Subject updated", subject });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/subjects/:id ─────────────────────────────────────────────────
export const deleteSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const existing = await prisma.subject.findFirst({
      where: { id, schoolId },
    });
    if (!existing)
      return res.status(404).json({ message: "Subject not found" });

    const used = await prisma.timetableEntry.count({
      where: { subjectId: id },
    });
    if (used > 0)
      return res.status(409).json({
        message: `Used in ${used} timetable slot(s). Remove those first.`,
      });

    // Delete from DB first
    await prisma.subject.delete({ where: { id } });

    await cacheService.invalidateSchool(schoolId); // wipes subjects:schoolId:list:*

    return res.json({ message: "Subject deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
