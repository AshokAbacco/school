// src/controllers/school.controller.js

import { prisma } from "../../config/db.js";
import redisClient from "../../utils/redis.js";
import {
  createFullSchoolBackup,
} from "../../modules/backup/backup.service.js";

// ✅ Valid SchoolType enum values — must match schema.prisma exactly
const VALID_SCHOOL_TYPES = [
  "SCHOOL", "PUC", "DIPLOMA", "DEGREE", "POSTGRADUATE", "OTHER",
];

// ============================================================
// 🔧 HELPER: Get latest SUCCESS payment with live plan data
// (mirrors schoolAdmin.controller.js — single source of truth)
// ============================================================
async function getActivePlan(superAdminId) {
  return prisma.payment.findFirst({
    where:   { superAdminId, status: "SUCCESS" },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
}

function resolvePlanLimit(payment, field) {
  // field = "maxSchools" | "maxStudents" | "maxTeachers" | "maxSchoolAdmins"
  const raw = payment.plan?.[field] ?? payment[field] ?? null;
  const isUnlimited = raw === null || raw === -1;
  return { limit: raw, isUnlimited };
}

/**
 * GET /api/schools/usage
 * Returns school count + plan limit in one call.
 * Frontend uses this instead of fetching schools + payment separately.
 */
export const getSchoolUsage = async (req, res) => {
  try {
    const universityId = req.user.universityId;
    const superAdminId = req.user.id;

    const used = await prisma.school.count({ where: { universityId } });

    const payment = await getActivePlan(superAdminId);

    if (!payment) {
      return res.json({
        used,
        limit: 0,
        isUnlimited: false,
        planName: null,
        planExpired: false,
        hasActivePlan: false,
      });
    }

    const { limit, isUnlimited } = resolvePlanLimit(payment, "maxSchools");
    const planExpired = payment.planEndDate
      ? new Date() > new Date(payment.planEndDate)
      : false;

    return res.json({
      used,
      limit:         isUnlimited ? null : limit,
      isUnlimited,
      planName:      payment.plan?.name ?? payment.planName,
      planEndDate:   payment.planEndDate,
      planExpired,
      hasActivePlan: true,
    });
  } catch (err) {
    console.error("getSchoolUsage error:", err);
    return res.status(500).json({ message: "Failed to fetch school usage" });
  }
};

/**
 * ============================================================
 * ✅ CREATE SCHOOL (Super Admin Only)
 * POST /api/schools
 * ============================================================
 */
export const createSchool = async (req, res) => {
  try {
    const { name, code, type, address, city, state, phone, email } = req.body;
    const universityId = req.user.universityId;

    // ✅ Validate required fields
    if (!name || !code || !type) {
      return res.status(400).json({ message: "Name, Code, and Type are required" });
    }

    if (!VALID_SCHOOL_TYPES.includes(type)) {
      return res.status(400).json({
        message: `Invalid school type. Must be one of: ${VALID_SCHOOL_TYPES.join(", ")}`,
      });
    }

    // ============================================================
    // ✅ CHECK ACTIVE PAYMENT PLAN (replaces subscription check)
    // ============================================================
    const payment = await getActivePlan(req.user.id);

    if (!payment) {
      return res.status(403).json({
        message: "No active plan found. Please purchase a plan first.",
      });
    }

    // ✅ Check plan expiry
    if (payment.planEndDate && new Date() > new Date(payment.planEndDate)) {
      return res.status(403).json({
        message: "Your plan has expired. Please renew to add schools.",
      });
    }

    // ============================================================
    // ✅ RESOLVE SCHOOL LIMIT FROM LIVE PLAN
    // ============================================================
    const { limit: planLimit, isUnlimited } = resolvePlanLimit(payment, "maxSchools");
    const planName = payment.plan?.name ?? payment.planName ?? "your plan";

    // ============================================================
    // ✅ COUNT EXISTING SCHOOLS
    // ============================================================
    const existingSchoolsCount = await prisma.school.count({ where: { universityId } });

    // ============================================================
    // ✅ ENFORCE SCHOOL LIMIT
    // ============================================================
    if (!isUnlimited && existingSchoolsCount >= planLimit) {
      return res.status(403).json({
        message: `School limit reached. Your ${planName} plan allows only ${planLimit} school(s). Please upgrade your plan.`,
        usage: { used: existingSchoolsCount, limit: planLimit, planName },
      });
    }

    // ============================================================
    // ✅ CHECK SCHOOL CODE UNIQUENESS
    // ============================================================
    const existingSchool = await prisma.school.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingSchool) {
      return res.status(409).json({ message: "School code already exists" });
    }

    // ============================================================
    // ✅ CREATE SCHOOL
    // ============================================================
    const school = await prisma.school.create({
      data: {
        name:        name.trim(),
        code:        code.trim().toUpperCase(),
        type,
        address:     address?.trim() || null,
        city:        city?.trim()    || null,
        state:       state?.trim()   || null,
        phone:       phone?.trim()   || null,
        email:       email?.trim()   || null,
         universityId:
      req.user.universityId,
        superAdminId: req.user.id,
      },
    });

    await prisma.superAdminSchoolAccess.upsert({
      where: {
        superAdminId_schoolId: {
          superAdminId: req.user.id,
          schoolId: school.id,
        },
      },
      update: {},
      create: {
        superAdminId: req.user.id,
        schoolId: school.id,
      },
    });
    await createFullSchoolBackup(
      school.id
    );

    await redisClient.del(`schools:${universityId}`);

    return res.status(201).json({
      message: "School created successfully ✅",
      school,
      usage: {
        used:        existingSchoolsCount + 1,
        limit:       isUnlimited ? null : planLimit,
        isUnlimited,
        planName,
      },
    });

  } catch (error) {
    console.error("Create School Error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ message: "School code already exists" });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * ============================================================
 * ✅ GET ALL SCHOOLS (Redis Cached)
 * GET /api/schools
 * ============================================================
 */
export const getAllSchools = async (req, res) => {
  try {
    const universityId = req.user.universityId;
    const cacheKey = `schools:${universityId}`;

    const cachedSchools = await redisClient.get(cacheKey);
    if (cachedSchools) {
      return res.status(200).json({ source: "cache", schools: JSON.parse(cachedSchools) });
    }

    const schools = await prisma.school.findMany({
      where:   { universityId },
      orderBy: { createdAt: "desc" },
    });

    await redisClient.setEx(cacheKey, 600, JSON.stringify(schools));

    return res.status(200).json({ source: "db", schools });
  } catch (error) {
    console.error("Get Schools Error:", error);
    return res.status(500).json({ message: "Failed to fetch schools" });
  }
};

/**
 * ============================================================
 * ✅ GET SINGLE SCHOOL BY ID
 * GET /api/schools/:id
 * ============================================================
 */
export const getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await prisma.school.findUnique({ where: { id } });

    if (!school) return res.status(404).json({ message: "School not found" });

    return res.status(200).json(school);
  } catch (error) {
    console.error("Get School Error:", error);
    return res.status(500).json({ message: "Failed to fetch school" });
  }
};

/**
 * ============================================================
 * ✅ UPDATE SCHOOL
 * PUT /api/schools/:id
 * ============================================================
 */
export const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const universityId = req.user.universityId;

    if (req.body.type && !VALID_SCHOOL_TYPES.includes(req.body.type)) {
      return res.status(400).json({
        message: `Invalid school type. Must be one of: ${VALID_SCHOOL_TYPES.join(", ")}`,
      });
    }
await createFullSchoolBackup(id);
    const updatedSchool = await prisma.school.update({ where: { id }, data: req.body });

    await redisClient.del(`schools:${universityId}`);

    return res.status(200).json({ message: "School updated successfully ✅", updatedSchool });
  } catch (error) {
    console.error("Update School Error:", error);
    return res.status(500).json({ message: "Update failed" });
  }
};

/**
 * ============================================================
 * ✅ DELETE SCHOOL
 * DELETE /api/schools/:id
 * ============================================================
 */
export const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const universityId = req.user.universityId;

await prisma.school.update({
  where: { id },

  data: {
    deletedAt: new Date(),
    isActive: false,
  },
});

    await redisClient.del(`schools:${universityId}`);

    return res.status(200).json({ message: "School deleted successfully ✅" });
  } catch (error) {
    console.error("Delete School Error:", error);
    return res.status(500).json({ message: "Delete failed" });
  }
};