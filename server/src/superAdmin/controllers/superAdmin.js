// src/controllers/superAdminAuth.controller.js
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../prisma/client.js";
import { generateToken } from "../utils/jwt.js";
import { successResponse, errorResponse } from "../utils/response.js";

// ─── Validation Schemas ────────────────────────────────────────

const registerSchema = z.object({
  // University info
  universityName: z.string().min(2, "University name required"),
  universityCode: z
    .string()
    .min(2)
    .max(20)
    .regex(
      /^[A-Z0-9_]+$/,
      "Code must be uppercase letters, numbers, underscores only",
    )
    .transform((v) => v.toUpperCase()),
  universityAddress: z.string().optional(),
  universityCity: z.string().optional(),
  universityState: z.string().optional(),
  universityPhone: z.string().optional(),
  universityEmail: z.string().email().optional(),
  universityWebsite: z.string().url().optional().or(z.literal("")),

  // Super Admin info
  adminName: z.string().min(2, "Admin name required"),
  adminEmail: z.string().email("Valid email required"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  adminPhone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

// ─── Register University + Super Admin ────────────────────────

/**
 * POST /api/auth/super-admin/register
 * Creates a new University record AND the first Super Admin for it.
 */
export const registerSuperAdmin = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        422,
        parsed.error.flatten().fieldErrors,
      );
    }

    const {
      universityName,
      universityCode,
      universityAddress,
      universityCity,
      universityState,
      universityPhone,
      universityEmail,
      universityWebsite,
      adminName,
      adminEmail,
      adminPassword,
      adminPhone,
    } = parsed.data;

    // Check if university code already taken
    const existingUniversity = await prisma.university.findUnique({
      where: { code: universityCode },
    });
    if (existingUniversity) {
      return errorResponse(
        res,
        "University code already exists. Choose a different code.",
        409,
      );
    }

    // Check if email already taken
    const existingAdmin = await prisma.superAdmin.findUnique({
      where: { email: adminEmail },
    });
    if (existingAdmin) {
      return errorResponse(res, "Email already registered.", 409);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create university + super admin in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const university = await tx.university.create({
        data: {
          name: universityName,
          code: universityCode,
          address: universityAddress,
          city: universityCity,
          state: universityState,
          phone: universityPhone,
          email: universityEmail,
          website: universityWebsite || null,
        },
      });

      const superAdmin = await tx.superAdmin.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          phone: adminPhone,
          universityId: university.id,
        },
      });

      return { university, superAdmin };
    });

    const token = generateToken({
      id: result.superAdmin.id,
      role: "SUPER_ADMIN",
      userType: "superAdmin",
      universityId: result.university.id,
    });

    return successResponse(
      res,
      {
        token,
        user: {
          id: result.superAdmin.id,
          name: result.superAdmin.name,
          email: result.superAdmin.email,
          role: "SUPER_ADMIN",
          userType: "superAdmin",
          university: {
            id: result.university.id,
            name: result.university.name,
            code: result.university.code,
          },
        },
      },
      "University and Super Admin registered successfully",
      201,
    );
  } catch (err) {
    console.error("[registerSuperAdmin]", err);
    return errorResponse(res, "Registration failed. Please try again.");
  }
};

// ─── Super Admin Login ─────────────────────────────────────────

/**
 * POST /api/auth/super-admin/login
 */
export const loginSuperAdmin = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        422,
        parsed.error.flatten().fieldErrors,
      );
    }

    const { email, password } = parsed.data;

    const admin = await prisma.superAdmin.findUnique({
      where: { email },
      include: {
        university: { select: { id: true, name: true, code: true } },
        schoolAccess: {
          include: {
            school: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    if (!admin) return errorResponse(res, "Invalid email or password", 401);
    if (!admin.isActive)
      return errorResponse(res, "Account is deactivated", 403);

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return errorResponse(res, "Invalid email or password", 401);

    // Update last login
    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken({
      id: admin.id,
      role: "SUPER_ADMIN",
      userType: "superAdmin",
      universityId: admin.universityId,
    });

    const accessibleSchools = admin.schoolAccess.map((a) => a.school);

    return successResponse(res, {
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "SUPER_ADMIN",
        userType: "superAdmin",
        university: admin.university,
        // empty array means access to ALL schools
        schoolAccess: accessibleSchools,
      },
    });
  } catch (err) {
    console.error("[loginSuperAdmin]", err);
    return errorResponse(res, "Login failed. Please try again.");
  }
};

// ─── Get current Super Admin profile ──────────────────────────

/**
 * GET /api/auth/super-admin/me
 */
export const getSuperAdminProfile = async (req, res) => {
  try {
    const admin = await prisma.superAdmin.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImage: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        university: {
          select: { id: true, name: true, code: true, city: true, state: true },
        },
        schoolAccess: {
          include: {
            school: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    if (!admin) return errorResponse(res, "Admin not found", 404);

    return successResponse(res, {
      ...admin,
      role: "SUPER_ADMIN",
      userType: "superAdmin",
    });
  } catch (err) {
    console.error("[getSuperAdminProfile]", err);
    return errorResponse(res, "Failed to fetch profile");
  }
};
