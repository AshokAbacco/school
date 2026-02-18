// server/src/staffControlls/teacherController.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import redisClient from "../utils/redis.js";

const prisma = new PrismaClient();
const CACHE_TTL = 300;
const SALT_ROUNDS = 10;

/* ─── helpers ─────────────────────────────────────────────── */
const listKey = (q) => `teachers:list:${JSON.stringify(q)}`;

async function bustListCache() {
  const keys = await redisClient.keys("teachers:list:*");
  if (keys.length) await redisClient.del(keys);
}

/* ─── GET /api/teachers ──────────────────────────────────── */
export async function getTeachers(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
      department = "",
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Always scope to school from JWT
    const schoolId = req.user?.schoolId;
    const cacheKey = listKey({
      page,
      limit,
      search,
      status,
      department,
      schoolId,
    });

    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json({ ...JSON.parse(cached), fromCache: true });

    const where = {
      ...(schoolId ? { schoolId } : {}),
      ...(status && { status }),
      ...(department && {
        department: { contains: department, mode: "insensitive" },
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { employeeCode: { contains: search, mode: "insensitive" } },
          { department: { contains: search, mode: "insensitive" } },
          { designation: { contains: search, mode: "insensitive" } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.teacherProfile.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
          designation: true,
          employmentType: true,
          status: true,
          joiningDate: true,
          phone: true,
          profileImage: true,
          experienceYears: true,
          user: { select: { email: true, isActive: true } },
          assignments: {
            select: {
              id: true,
              grade: true,
              className: true,
              subject: true,
              academicYear: true,
            },
          },
        },
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    const payload = {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };

    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(payload));
    res.json({ ...payload, fromCache: false });
  } catch (err) {
    console.error("[getTeachers]", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
}

/* ─── GET /api/teachers/:id ──────────────────────────────── */
export async function getTeacherById(req, res) {
  try {
    const { id } = req.params;
    const cacheKey = `teachers:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json({ data: JSON.parse(cached), fromCache: true });

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, isActive: true, lastLoginAt: true },
        },
        assignments: true,
        documents: {
          select: {
            id: true,
            documentType: true,
            customLabel: true,
            fileKey: true,
            fileType: true,
            fileSizeBytes: true,
            isVerified: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(teacher));
    res.json({ data: teacher, fromCache: false });
  } catch (err) {
    console.error("[getTeacherById]", err);
    res.status(500).json({ error: "Failed to fetch teacher" });
  }
}

/* ─── POST /api/teachers ─────────────────────────────────── */
export async function createTeacher(req, res) {
  try {
    const {
      email,
      password,
      name,
      employeeCode,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      address,
      city,
      state,
      zipCode,
      department,
      designation,
      qualification,
      experienceYears,
      joiningDate,
      employmentType,
      salary,
      bankAccountNo,
      bankName,
      ifscCode,
      panNumber,
      aadhaarNumber,
    } = req.body;

    // ✅ schoolId from JWT — Admin creating teacher in their school
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res
        .status(400)
        .json({
          error: "schoolId missing from token — ensure admin is logged in",
        });
    }

    const teacher = await prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await tx.user.create({
        data: {
          name: name || `${firstName} ${lastName}`,
          email,
          password: hashedPassword,
          role: "TEACHER",
          schoolId, // ✅ scoped to school
        },
      });

      return tx.teacherProfile.create({
        data: {
          userId: user.id,
          schoolId, // ✅ denormalised for easy queries
          employeeCode,
          firstName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          phone: phone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
          department,
          designation,
          qualification: qualification || null,
          experienceYears: experienceYears ? Number(experienceYears) : null,
          joiningDate: new Date(joiningDate),
          employmentType,
          salary: salary ? Number(salary) : null,
          bankAccountNo: bankAccountNo || null,
          bankName: bankName || null,
          ifscCode: ifscCode || null,
          panNumber: panNumber || null,
          aadhaarNumber: aadhaarNumber || null,
        },
        include: { user: { select: { id: true, email: true } } },
      });
    });

    await bustListCache();
    res.status(201).json({ data: teacher });
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Email or employee code already exists" });
    }
    console.error("[createTeacher]", err);
    res.status(500).json({ error: "Failed to create teacher" });
  }
}

/* ─── PATCH /api/teachers/:id ────────────────────────────── */
export async function updateTeacher(req, res) {
  try {
    const { id } = req.params;
    const allowed = [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "phone",
      "address",
      "city",
      "state",
      "zipCode",
      "department",
      "designation",
      "qualification",
      "experienceYears",
      "employmentType",
      "status",
      "salary",
      "bankAccountNo",
      "bankName",
      "ifscCode",
      "panNumber",
      "aadhaarNumber",
      "profileImage",
    ];

    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.experienceYears)
      data.experienceYears = Number(data.experienceYears);
    if (data.salary) data.salary = Number(data.salary);

    const updated = await prisma.teacherProfile.update({ where: { id }, data });

    await Promise.all([bustListCache(), redisClient.del(`teachers:${id}`)]);
    res.json({ data: updated });
  } catch (err) {
    console.error("[updateTeacher]", err);
    res.status(500).json({ error: "Failed to update teacher" });
  }
}

/* ─── DELETE /api/teachers/:id (soft delete) ────────────── */
export async function deleteTeacher(req, res) {
  try {
    const { id } = req.params;
    await prisma.teacherProfile.update({
      where: { id },
      data: { status: "RESIGNED" },
    });
    await Promise.all([bustListCache(), redisClient.del(`teachers:${id}`)]);
    res.json({ message: "Teacher marked as resigned" });
  } catch (err) {
    console.error("[deleteTeacher]", err);
    res.status(500).json({ error: "Failed to deactivate teacher" });
  }
}

/* ─── POST /api/teachers/:id/assignments ─────────────────── */
export async function addAssignment(req, res) {
  try {
    const { id } = req.params;
    const { grade, className, subject, academicYear } = req.body;
    const assignment = await prisma.teacherAssignment.create({
      data: { teacherId: id, grade, className, subject, academicYear },
    });
    await redisClient.del(`teachers:${id}`);
    res.status(201).json({ data: assignment });
  } catch (err) {
    console.error("[addAssignment]", err);
    res.status(500).json({ error: "Failed to add assignment" });
  }
}

/* ─── DELETE /api/teachers/:id/assignments/:aId ──────────── */
export async function removeAssignment(req, res) {
  try {
    const { id, aId } = req.params;
    await prisma.teacherAssignment.delete({ where: { id: aId } });
    await redisClient.del(`teachers:${id}`);
    res.json({ message: "Assignment removed" });
  } catch (err) {
    console.error("[removeAssignment]", err);
    res.status(500).json({ error: "Failed to remove assignment" });
  }
}
