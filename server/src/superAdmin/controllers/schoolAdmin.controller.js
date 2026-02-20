// server/src/staffControlls/schoolAdmin.controller.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import redisClient from "../../utils/redis.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const CACHE_TTL = 300;

const cacheKey = (schoolId) => `school_admins:${schoolId}`;

async function bustCache(schoolId) {
  await redisClient.del(cacheKey(schoolId));
}

/**
 * GET /api/school-admins
 * Returns all ADMIN users scoped to the university's schools
 */
export async function getSchoolAdmins(req, res) {
  try {
    const universityId = req.user.universityId;

    const cached = await redisClient.get(`school_admins:uni:${universityId}`);
    if (cached) return res.json({ admins: JSON.parse(cached), fromCache: true });

    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "FINANCE"] },
        school: { universityId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        schoolId: true,
        school: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
    });

    await redisClient.setEx(
      `school_admins:uni:${universityId}`,
      CACHE_TTL,
      JSON.stringify(admins)
    );

    return res.json({ admins, fromCache: false });
  } catch (err) {
    console.error("[getSchoolAdmins]", err);
    return res.status(500).json({ message: "Failed to fetch school admins" });
  }
}

/**
 * POST /api/school-admins
 * Creates a User with role ADMIN for a specific school
 * Body: { name, email, password, schoolId }
 */
export async function createSchoolAdmin(req, res) {
  try {
    const { name, email, password, schoolId, role } = req.body;
    const universityId = req.user.universityId;

    if (!name || !email || !password || !schoolId) {
      return res.status(400).json({
        message: "Name, email, password, and schoolId are required",
      });
    }

    // Verify the school belongs to this university
    const school = await prisma.school.findFirst({
      where: { id: schoolId, universityId },
    });

    if (!school) {
      return res.status(404).json({
        message: "School not found or does not belong to your university",
      });
    }

    // Check duplicate email within the same school
    const existing = await prisma.user.findUnique({
      where: { email_schoolId: { email, schoolId } },
    });

    if (existing) {
      return res.status(409).json({
        message: "An admin with this email already exists in this school",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "ADMIN",
        schoolId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        schoolId: true,
        school: { select: { id: true, name: true, code: true, type: true } },
      },
    });

    await redisClient.del(`school_admins:uni:${universityId}`);

    return res.status(201).json({ message: "School admin created ✅", admin });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "An admin with this email already exists in this school",
      });
    }
    console.error("[createSchoolAdmin]", err);
    return res.status(500).json({ message: "Failed to create school admin" });
  }
}

/**
 * PATCH /api/school-admins/:id
 * Update name, email, isActive — optionally reset password
 */
export async function updateSchoolAdmin(req, res) {
  try {
    const { id } = req.params;
    const universityId = req.user.universityId;
    const { name, email, password, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, SALT_ROUNDS);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, isActive: true,
        schoolId: true,
        school: { select: { id: true, name: true, code: true } },
      },
    });

    await redisClient.del(`school_admins:uni:${universityId}`);

    return res.json({ message: "Admin updated ✅", admin: updated });
  } catch (err) {
    console.error("[updateSchoolAdmin]", err);
    return res.status(500).json({ message: "Failed to update admin" });
  }
}

/**
 * DELETE /api/school-admins/:id  (soft delete — sets isActive: false)
 */
export async function deleteSchoolAdmin(req, res) {
  try {
    const { id } = req.params;
    const universityId = req.user.universityId;

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await redisClient.del(`school_admins:uni:${universityId}`);

    return res.json({ message: "Admin deactivated ✅" });
  } catch (err) {
    console.error("[deleteSchoolAdmin]", err);
    return res.status(500).json({ message: "Failed to deactivate admin" });
  }
}