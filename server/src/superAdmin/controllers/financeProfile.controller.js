// financeProfile.controller.js
import { PrismaClient } from "@prisma/client";
import redisClient from "../../utils/redis.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CACHE_ALL = "finance_profiles:all";
const CACHE_ONE = (id) => `finance_profile:${id}`;
const TTL = 60; // seconds


/**
 * CREATE FINANCE ACCOUNT
 */
export async function createFinanceProfile(req, res) {
  try {
    const { name, email, password, schoolId, employeeCode, designation, phone } = req.body;

    // Check duplicate email in same school
    const existing = await prisma.user.findFirst({ where: { email, schoolId } });
    if (existing) {
      return res.status(400).json({ message: "A user with this email already exists in the selected school." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const finance = await prisma.user.create({
      data: {
        name, email, password: hashedPassword, role: "FINANCE", schoolId, isActive: true,
        financeProfile: {
          create: { employeeCode, designation, phone, school: { connect: { id: schoolId } } }
        }
      },
      include: { financeProfile: true }
    });

    // ✅ Invalidate list cache so next fetch gets fresh data
    await redisClient.del(CACHE_ALL);

    res.status(201).json({ message: "Finance created successfully", finance });
  } catch (error) {
    console.error("Create Finance Error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A user with this email already exists in the selected school." });
    }
    res.status(500).json({ message: "Failed to create finance" });
  }
}


/**
 * GET ALL FINANCE PROFILES (WITH CACHE)
 */
export const getFinanceProfiles = async (req, res) => {
  try {
    const universityId = req.user.universityId;

    const CACHE_KEY = `finance_profiles:uni:${universityId}`;

    // 1. Try cache
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      return res.json({ success: true, fromCache: true, data: JSON.parse(cached) });
    }

    // 2. Fetch ONLY related finance users
    const profiles = await prisma.financeProfile.findMany({
      where: {
        school: {
          universityId: universityId,   // ✅ FILTER HERE
        },
      },
      include: { user: true, school: true },
      orderBy: { createdAt: "desc" },
    });

    // 3. Cache per university
    await redisClient.set(CACHE_KEY, JSON.stringify(profiles), { EX: 60 });

    res.json({ success: true, fromCache: false, data: profiles });

  } catch (error) {
    console.error("Get FinanceProfiles Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * GET SINGLE FINANCE PROFILE (WITH CACHE)
 */
export const getFinanceProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Try cache first
    const cached = await redisClient.get(CACHE_ONE(id));
    if (cached) {
      return res.json({ success: true, fromCache: true, data: JSON.parse(cached) });
    }

    // 2. Cache miss — fetch from DB
    const profile = await prisma.financeProfile.findUnique({
      where: { id },
      include: { user: true, school: true }
    });

    if (!profile) {
      return res.status(404).json({ message: "Finance profile not found" });
    }

    // 3. Store in cache
    await redisClient.set(CACHE_ONE(id), JSON.stringify(profile), { EX: TTL });

    res.json({ success: true, fromCache: false, data: profile });

  } catch (error) {
    console.error("Get FinanceProfile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * UPDATE FINANCE PROFILE
 */
export const updateFinanceProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, schoolId, employeeCode, designation, phone } = req.body;

    // 1. Find financeProfile to get userId
    const financeProfile = await prisma.financeProfile.findUnique({ where: { id } });
    if (!financeProfile) {
      return res.status(404).json({ message: "Finance profile not found" });
    }

    // 2. Update User fields
    const userUpdateData = { name, email, schoolId };
    if (password) {
      userUpdateData.password = await bcrypt.hash(password, 10);
    }
    await prisma.user.update({ where: { id: financeProfile.userId }, data: userUpdateData });

    // 3. Update FinanceProfile fields
    const updated = await prisma.financeProfile.update({
      where: { id },
      data: {
        employeeCode,
        designation,
        phone,
        school: { connect: { id: schoolId } }
      },
      include: { user: true, school: true }
    });

    // ✅ Invalidate both list and single cache
    await redisClient.del(CACHE_ALL);
    await redisClient.del(CACHE_ONE(id));

    // ✅ Write updated data into single cache immediately
    await redisClient.set(CACHE_ONE(id), JSON.stringify(updated), { EX: TTL });

    res.json({ success: true, message: "Finance profile updated", data: updated });

  } catch (error) {
    console.error("Update Finance Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * DELETE FINANCE PROFILE
 */
export const deleteFinanceProfile = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.financeProfile.delete({ where: { id } });

    // ✅ Invalidate both list and single cache
    await redisClient.del(CACHE_ALL);
    await redisClient.del(CACHE_ONE(id));

    res.json({ success: true, message: "Finance profile deleted successfully" });

  } catch (error) {
    console.error("Delete Finance Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};