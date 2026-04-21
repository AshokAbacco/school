import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import cacheService from "../utils/cacheService.js";
import { saveBackup } from "../utils/cloudBackup.js";

import { prisma } from "../config/db.js"; 
const SALT_ROUNDS = 10;

// ➤ Create Staff
export async function createStaff(req, res) {
  try {
    const {
      firstName, lastName, phone, email, password,
      role, groupType, basicSalary, joiningDate,
      bankAccountNo, bankName, ifscCode,
    } = req.body;

    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId missing from token" });

    let staff;

    if (email && password) {
      staff = await prisma.$transaction(async (tx) => {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await tx.user.create({
          data: {
            name: `${firstName} ${lastName || ""}`.trim(),
            email,
            password: hashedPassword,
            role: "ADMIN",
            schoolId,
          },
        });

        return tx.staffProfile.create({
          data: {
            schoolId,
            userId: user.id,
            firstName,
            lastName: lastName || "",
            phone: phone || null,
            email,
            role,
            groupType,
            basicSalary: basicSalary ? Number(basicSalary) : null,
            joiningDate: new Date(joiningDate),
            bankAccountNo: bankAccountNo || null,
            bankName: bankName || null,
            ifscCode: ifscCode || null,
          },
          include: { user: { select: { id: true, email: true } } },
        });
        
      });
    } else {
      staff = await prisma.staffProfile.create({
        data: {
          schoolId,
          firstName,
          lastName: lastName || "",
          phone: phone || null,
          email: email || null,
          role,
          groupType,
          basicSalary: basicSalary ? Number(basicSalary) : null,
          joiningDate: new Date(joiningDate),
          bankAccountNo: bankAccountNo || null,
          bankName: bankName || null,
          ifscCode: ifscCode || null,
        },
      });
 
    }

    // ✅ Bust the cache so next GET reflects the new staff immediately
    await cacheService.invalidateSchool(schoolId);

    res.status(201).json({ data: staff });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email already exists in this school" });
    }
    console.error("[createStaff]", err);
    res.status(500).json({ error: "Failed to create staff" });
  }
}

// ➤ Get All Staff
export async function getStaff(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId missing from token" });

    // ✅ Build a versioned cache key — version increments on every invalidation
    const cacheKey = await cacheService.buildKey(schoolId, "staff:list");

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ data: JSON.parse(cached), fromCache: true });
    }

    const staff = await prisma.staffProfile.findMany({
      where: {
        schoolId,
        NOT: { status: "RESIGNED" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, isActive: true } },
      },
    });

    // ✅ Cache the fresh result
    await cacheService.set(cacheKey, staff);

    res.json({ data: staff, fromCache: false });
  } catch (err) {
    console.error("[getStaff]", err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
}

// ➤ Get Single Staff by ID
export async function getStaffById(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId missing from token" });

    // ✅ Per-record versioned cache key
    const cacheKey = await cacheService.buildKey(schoolId, `staff:${id}`);

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ data: JSON.parse(cached), fromCache: true });
    }

    const staff = await prisma.staffProfile.findFirst({
      where: { id, schoolId },
      include: {
        user: { select: { id: true, email: true, isActive: true } },
      },
    });

    if (!staff) return res.status(404).json({ error: "Staff not found" });

    // ✅ Cache individual record
    await cacheService.set(cacheKey, staff);

    res.json({ data: staff, fromCache: false });
  } catch (err) {
    console.error("[getStaffById]", err);
    res.status(500).json({ error: "Failed to fetch staff member" });
  }
}

// ➤ Update Staff
export async function updateStaff(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const existing = await prisma.staffProfile.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: "Staff not found" });

    const {
      firstName, lastName, phone, email,
      role, groupType, basicSalary, joiningDate,
      bankAccountNo, bankName, ifscCode,
    } = req.body;

    const updated = await prisma.staffProfile.update({
      where: { id },
      data: {
        firstName,
        lastName: lastName || "",
        phone: phone || null,
        email: email || null,
        role,
        groupType,
        basicSalary: basicSalary ? Number(basicSalary) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        bankAccountNo: bankAccountNo || null,
        bankName: bankName || null,
        ifscCode: ifscCode || null,
      },
    });

    // ✅ Bust entire school cache — list + individual record both go stale
    await cacheService.invalidateSchool(schoolId);

    res.json({ data: updated });
  } catch (err) {
    console.error("[updateStaff]", err);
    res.status(500).json({ error: "Failed to update staff" });
  }
}

// ➤ Delete (soft delete)
export async function deleteStaff(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const existing = await prisma.staffProfile.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: "Staff not found" });

    await prisma.staffProfile.update({
      where: { id },
      data: { status: "RESIGNED" },
    });

    // ✅ Bust cache so the deleted staff disappears from the list immediately
    await cacheService.invalidateSchool(schoolId);

    res.json({ message: "Staff marked as resigned" });
  } catch (err) {
    console.error("[deleteStaff]", err);
    res.status(500).json({ error: "Failed to delete staff" });
  }
}