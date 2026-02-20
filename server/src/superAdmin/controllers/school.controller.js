// src/controllers/school.controller.js

import { PrismaClient } from "@prisma/client";
import redisClient from "../../utils/redis.js";

const prisma = new PrismaClient();

// ✅ Valid SchoolType enum values — must match schema.prisma exactly
const VALID_SCHOOL_TYPES = [
  "PRIMARY",
  "UPPER_PRIMARY",
  "HIGH_SCHOOL",
  "PUC",
  "DEGREE",
  "POSTGRADUATE",
  "OTHER",
];

/**
 * ============================================================
 * ✅ CREATE SCHOOL (Super Admin Only)
 * POST /api/schools
 * ============================================================
 */
export const createSchool = async (req, res) => {
  try {
    const { name, code, type, address, city, state, phone, email } = req.body;

    // University ID comes from token middleware
    const universityId = req.user.universityId;

    // ✅ Validate required fields
    if (!name || !code || !type) {
      return res.status(400).json({
        message: "Name, Code, and Type are required",
      });
    }

    // ✅ Validate that type is a valid Prisma SchoolType enum value
    if (!VALID_SCHOOL_TYPES.includes(type)) {
      return res.status(400).json({
        message: `Invalid school type. Must be one of: ${VALID_SCHOOL_TYPES.join(", ")}`,
      });
    }

    // Check if school code already exists
    const existingSchool = await prisma.school.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingSchool) {
      return res.status(409).json({
        message: "School code already exists",
      });
    }

    // ✅ Create School — type is a valid SchoolType enum, Prisma accepts it
    const school = await prisma.school.create({
      data: {
        name:        name.trim(),
        code:        code.trim().toUpperCase(),
        type,               // SchoolType enum value e.g. "PRIMARY", "HIGH_SCHOOL"
        address:     address?.trim() || null,
        city:        city?.trim()    || null,
        state:       state?.trim()   || null,
        phone:       phone?.trim()   || null,
        email:       email?.trim()   || null,
        universityId,
      },
    });

    // Clear Redis Cache after creating school
    await redisClient.del(`schools:${universityId}`);

    return res.status(201).json({
      message: "School created successfully ✅",
      school,
    });
  } catch (error) {
    console.error("Create School Error:", error);

    // ✅ Surface Prisma enum errors clearly in development
    if (error.code === "P2002") {
      return res.status(409).json({ message: "School code already exists" });
    }

    return res.status(500).json({
      message: "Internal Server Error",
    });
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

    // 1️⃣ Check Redis Cache First
    const cachedSchools = await redisClient.get(cacheKey);
    if (cachedSchools) {
      console.log("✅ Schools Loaded from Redis Cache");
      return res.status(200).json({
        source: "cache",
        schools: JSON.parse(cachedSchools),
      });
    }

    // 2️⃣ Fetch from Database
    console.log("⚡ Schools Loaded from Database");
    const schools = await prisma.school.findMany({
      where: { universityId },
      orderBy: { createdAt: "desc" },
    });

    // 3️⃣ Cache result (TTL = 10 minutes)
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

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

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

    // ✅ If type is being updated, validate enum value
    if (req.body.type && !VALID_SCHOOL_TYPES.includes(req.body.type)) {
      return res.status(400).json({
        message: `Invalid school type. Must be one of: ${VALID_SCHOOL_TYPES.join(", ")}`,
      });
    }

    const updatedSchool = await prisma.school.update({
      where: { id },
      data: req.body,
    });

    // Clear Redis Cache after update
    await redisClient.del(`schools:${universityId}`);

    return res.status(200).json({
      message: "School updated successfully ✅",
      updatedSchool,
    });
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

    await prisma.school.delete({ where: { id } });

    // Clear Redis Cache after delete
    await redisClient.del(`schools:${universityId}`);

    return res.status(200).json({ message: "School deleted successfully ✅" });
  } catch (error) {
    console.error("Delete School Error:", error);
    return res.status(500).json({ message: "Delete failed" });
  }
};