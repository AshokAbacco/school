// server/src/controllers/subjectController.js
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
    return null; // cache miss → fall through to DB
  }
}

async function cacheSet(key, value) {
  try {
    await redisClient.setEx(key, CACHE_TTL, JSON.stringify(value));
  } catch (err) {
    console.error(`[Redis] SET ${key} failed:`, err.message);
    // non-fatal — DB already returned the data
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

async function invalidateCache(schoolId, id = null) {
  // Wipe all list variants for this school (gradeLevel + search combos)
  await scanAndDelete(`subjects:${schoolId}:list:*`);
  // Wipe specific subject entry if provided
  if (id) {
    try {
      await redisClient.del(`subjects:${schoolId}:${id}`);
    } catch (err) {
      console.error(`[Redis] DEL subject ${id} failed:`, err.message);
    }
  }
}

// ── Cache key helpers ────────────────────────────────────────────────────────
const cacheKey = {
  list: (schoolId, gradeLevel, search) =>
    `subjects:${schoolId}:list:${gradeLevel ?? "all"}:${search ?? "none"}`,
};

// ── GET /api/subjects ────────────────────────────────────────────────────────
export const getSubjects = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { gradeLevel, search } = req.query;
    const key = cacheKey.list(schoolId, gradeLevel, search);

    // 1. Check cache (fails silently — returns null on Redis error)
    const cached = await cacheGet(key);
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
    await cacheSet(key, subjects);

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

    await invalidateCache(schoolId);
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

    await invalidateCache(schoolId, id);
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

    await prisma.subject.delete({ where: { id } });
    await invalidateCache(schoolId, id);
    return res.json({ message: "Subject deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
