// server/src/superAdmin/controllers/users.controller.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/users/all
 * Aggregates SuperAdmins, Users (ADMIN/TEACHER), Students, Parents
 * Query params: role, status, search, page, limit
 */
export async function getAllUsers(req, res) {
  try {
    const universityId = req.user.universityId;
    const {
      role   = "ALL",
      status = "ALL",   // "ACTIVE" | "INACTIVE"
      search = "",
      page   = 1,
      limit  = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const isActive = status === "ALL" ? undefined : status === "ACTIVE";

    const searchFilter = (fields) =>
      search
        ? { OR: fields.map((f) => ({ [f]: { contains: search, mode: "insensitive" } })) }
        : {};

    // ── 1. SuperAdmins ──────────────────────────────────────────
    let superAdmins = [];
    if (role === "ALL" || role === "SUPER_ADMIN") {
      const rows = await prisma.superAdmin.findMany({
        where: {
          universityId,
          ...(isActive !== undefined && { isActive }),
          ...searchFilter(["name", "email"]),
        },
        select: {
          id: true, name: true, email: true,
          isActive: true, lastLoginAt: true, createdAt: true,
        },
      });
      superAdmins = rows.map((r) => ({ ...r, role: "SUPER_ADMIN", school: null }));
    }

    // ── 2. Users (ADMIN + TEACHER) ──────────────────────────────
    let staffUsers = [];
    const staffRoles = [];
    if (role === "ALL")         staffRoles.push("ADMIN", "TEACHER");
    if (role === "ADMIN")       staffRoles.push("ADMIN");
    if (role === "TEACHER")     staffRoles.push("TEACHER");

    if (staffRoles.length > 0) {
      const rows = await prisma.user.findMany({
        where: {
          school: { universityId },
          role: { in: staffRoles },
          ...(isActive !== undefined && { isActive }),
          ...searchFilter(["name", "email"]),
        },
        select: {
          id: true, name: true, email: true,
          role: true, isActive: true, lastLoginAt: true, createdAt: true,
          school: { select: { id: true, name: true, code: true } },
        },
      });
      staffUsers = rows.map((r) => ({ ...r }));
    }

    // ── 3. Students ─────────────────────────────────────────────
    let students = [];
    if (role === "ALL" || role === "STUDENT") {
      const rows = await prisma.student.findMany({
        where: {
          school: { universityId },
          ...(isActive !== undefined && { isActive }),
          ...searchFilter(["name", "email"]),
        },
        select: {
          id: true, name: true, email: true,
          isActive: true, createdAt: true,
          school: { select: { id: true, name: true, code: true } },
        },
      });
      students = rows.map((r) => ({ ...r, role: "STUDENT", lastLoginAt: null }));
    }

    // ── 4. Parents ──────────────────────────────────────────────
    let parents = [];
    if (role === "ALL" || role === "PARENT") {
      const rows = await prisma.parent.findMany({
        where: {
          school: { universityId },
          ...(isActive !== undefined && { isActive }),
          ...searchFilter(["name", "email"]),
        },
        select: {
          id: true, name: true, email: true,
          isActive: true, createdAt: true,
          school: { select: { id: true, name: true, code: true } },
        },
      });
      parents = rows.map((r) => ({ ...r, role: "PARENT", lastLoginAt: null }));
    }

    // ── Merge + sort by createdAt desc ──────────────────────────
    const all = [...superAdmins, ...staffUsers, ...students, ...parents].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total = all.length;
    const paginated = all.slice(skip, skip + take);

    // ── Role counts (for stat cards) ────────────────────────────
    const counts = {
      total:       all.length,
      superAdmin:  all.filter((u) => u.role === "SUPER_ADMIN").length,
      admin:       all.filter((u) => u.role === "ADMIN").length,
      teacher:     all.filter((u) => u.role === "TEACHER").length,
      student:     all.filter((u) => u.role === "STUDENT").length,
      parent:      all.filter((u) => u.role === "PARENT").length,
      active:      all.filter((u) => u.isActive).length,
      inactive:    all.filter((u) => !u.isActive).length,
    };

    return res.json({
      users: paginated,
      counts,
      meta: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error("[getAllUsers]", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
}