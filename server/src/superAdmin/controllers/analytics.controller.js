import { PrismaClient } from "@prisma/client";
import redisClient from "../../utils/redis.js";

const prisma = new PrismaClient();
const CACHE_TTL = 300; // 5 minutes

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function rangeToDate(range) {
  const now = new Date();
  switch (range) {
    case "7d":  return new Date(now - 7  * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case "1y":  return new Date(now - 365 * 24 * 60 * 60 * 1000);
    case "30d":
    default:    return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
}

function prevRangeToDate(range) {
  const now = new Date();
  switch (range) {
    case "7d":  return new Date(now - 14  * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now - 180 * 24 * 60 * 60 * 1000);
    case "1y":  return new Date(now - 730 * 24 * 60 * 60 * 1000);
    case "30d":
    default:    return new Date(now - 60 * 24 * 60 * 60 * 1000);
  }
}

function formatChange(curr, prev) {
  if (!prev || prev === 0) return curr > 0 ? "+100%" : "0%";
  const pct = (((curr - prev) / prev) * 100).toFixed(1);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function groupByMonth(records, key = "count") {
  const map = {};
  for (const r of records) {
    const label = new Date(r.createdAt).toLocaleDateString("en-US", {
      month: "short",
    });
    map[label] = (map[label] || 0) + 1;
  }
  return Object.entries(map).map(([month, val]) => ({ month, [key]: val }));
}

function groupRevenueByMonth(records) {
  const map = {};
  for (const r of records) {
    const label = new Date(r.createdAt).toLocaleDateString("en-US", {
      month: "short",
    });
    map[label] = (map[label] || 0) + Number(r.amount || 0);
  }
  return Object.entries(map).map(([month, revenue]) => ({ month, revenue }));
}

// ─────────────────────────────────────────────
// Main Controller
// ─────────────────────────────────────────────

export async function getAnalytics(req, res) {
  try {
    const universityId = req.user.universityId;
    const range        = req.query.range || "30d";
    const since        = rangeToDate(range);
    const prevSince    = prevRangeToDate(range);

    const cacheKey = `analytics:${universityId}:${range}`;
    const cached   = await redisClient.get(cacheKey);

    if (cached) {
      return res.json({ ...JSON.parse(cached), fromCache: true });
    }

    // ───────────── Stats ─────────────

    const [totalSchools, activeSchools] = await Promise.all([
      prisma.school.count({ where: { universityId } }),
      prisma.school.count({ where: { universityId, isActive: true } }),
    ]);

    const [totalAdmins, totalTeachers] = await Promise.all([
      prisma.user.count({
        where: { school: { universityId }, role: "ADMIN" },
      }),
      prisma.user.count({
        where: { school: { universityId }, role: "TEACHER" },
      }),
    ]);

    const totalStudents = await prisma.student.count({
      where: { school: { universityId } },
    });

    const totalParents = await prisma.parent.count({
      where: { school: { universityId } },
    });

    const totalUsers =
      totalAdmins + totalTeachers + totalStudents + totalParents;

    // ───────────── Top Schools With Full Lists ─────────────

    const schoolsRaw = await prisma.school.findMany({
      where: { universityId },
      include: {
        users: true,
        students: true,
        parents: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const topSchools = schoolsRaw.map((s) => {
      const admins   = s.users.filter((u) => u.role === "ADMIN");
      const teachers = s.users.filter((u) => u.role === "TEACHER");

      return {
        id: s.id,
        name: s.name,
        city: s.city || "—",
        isActive: s.isActive,
        email: s.email || null,
        phone: s.phone || null,
        website: s.website || null,
        address: s.address || null,
        plan: "—",

        students: s.students.length,
        teachers: teachers.length,
        parents:  s.parents.length,
        admins:   admins.length,

        adminList: admins,
        teacherList: teachers,
        studentList: s.students,
        parentList: s.parents,
      };
    });

    // ───────────── Final Response ─────────────

    const payload = {
      stats: {
        totalSchools,
        activeSchools,
        totalUsers,
        totalAdmins,
        totalTeachers,
        totalStudents,
        totalParents,
      },
      topSchools,
    };

    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(payload));

    return res.json({ ...payload, fromCache: false });

  } catch (err) {
    console.error("[getAnalytics]", err);
    return res.status(500).json({ message: "Failed to load analytics" });
  }
}
