// server/src/staffControlls/teacherController.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import cacheService from "../utils/cacheService.js";
import { uploadToR2, generateSignedUrl } from "../lib/r2.js";
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
// ── POST /api/teachers/:id/profile-image ──────────────────────
export async function uploadProfileImage(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    if (!req.file) return res.status(400).json({ error: "No file received" });

    const teacher = await prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const key = `teachers/${id}/profile/${Date.now()}-${req.file.originalname}`;
    await uploadToR2(key, req.file.buffer, req.file.mimetype);

    const updated = await prisma.teacherProfile.update({
      where: { id },
      data: { profileImage: key }, // store the R2 key, NOT the URL
    });

    await cacheService.invalidateSchool(schoolId);
    res.json({ data: updated });
  } catch (err) {
    console.error("[uploadProfileImage]", err);
    res.status(500).json({ error: "Failed to upload profile image" });
  }
}

// ── GET /api/teachers/:id/profile-image ───────────────────────
export async function getProfileImage(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    if (!req.user?.role) return res.status(401).json({ error: "Unauthorized" });

    const teacher = await prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      select: { profileImage: true },
    });

    if (!teacher?.profileImage)
      return res.status(404).json({ error: "Profile image not found" });

    const expiresIn = 86400; // 24 hours — matches student pattern
    const signedUrl = await generateSignedUrl(teacher.profileImage, expiresIn);

    res.json({ url: signedUrl, expiresIn });
  } catch (err) {
    console.error("[getProfileImage]", err);
    res.status(500).json({ error: "Failed to fetch profile image" });
  }
}
// ── GET /api/teachers ─────────────────────────────────────────
export async function getTeachers(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
      department = "",
      employmentType = "",
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const schoolId = req.user?.schoolId;

    const cacheKey = await cacheService.buildKey(
      schoolId,
      `teachers:list:${JSON.stringify({ page, limit, search, status, department, employmentType })}`,
    );

    // ── Cache hit — re-sign URLs before returning ──
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const signedData = await Promise.all(
        parsed.data.map(async (t) => {
          if (t.profileImage) {
            try {
              t.profileImage = await generateSignedUrl(t.profileImage, 86400);
            } catch {
              t.profileImage = null;
            }
          }
          return t;
        }),
      );
      return res.json({ data: signedData, meta: parsed.meta, fromCache: true });
    }

    const where = {
      ...(schoolId ? { schoolId } : {}),
      ...(status && { status }),
      ...(employmentType && { employmentType }),
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
          profileImage: true, // ← raw R2 key stored here
          experienceYears: true,
          user: { select: { email: true, isActive: true } },
          assignments: {
            select: {
              id: true,
              academicYear: { select: { id: true, name: true } },
              classSection: {
                select: { id: true, name: true, grade: true, section: true },
              },
              subject: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    const meta = {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };

    // ── Cache raw keys (NOT signed URLs — they expire) ──
    await cacheService.set(cacheKey, { data, meta });

    // ── Sign URLs only for the response ──
    const signedData = await Promise.all(
      data.map(async (t) => {
        if (t.profileImage) {
          try {
            t.profileImage = await generateSignedUrl(t.profileImage, 86400);
          } catch {
            t.profileImage = null;
          }
        }
        return t;
      }),
    );

    res.json({ data: signedData, meta, fromCache: false });
  } catch (err) {
    console.error("[getTeachers]", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
}

// ── GET /api/teachers/:id ─────────────────────────────────────
export async function getTeacherById(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    const cacheKey = await cacheService.buildKey(schoolId, `teachers:${id}`);

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const teacher = JSON.parse(cached);
      // Refresh signed URL on every fetch — URLs expire after 24h
      if (teacher.profileImage) {
        teacher.profileImage = await generateSignedUrl(
          teacher.profileImage,
          86400,
        );
      }
      return res.json({ data: teacher, fromCache: true });
    }

    const teacher = await prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      include: {
        user: {
          select: { id: true, email: true, isActive: true, lastLoginAt: true },
        },
        assignments: {
          include: {
            classSection: {
              select: { id: true, name: true, grade: true, section: true },
            },
            subject: { select: { id: true, name: true, code: true } },
            academicYear: { select: { id: true, name: true } },
          },
        },
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

    // Cache the raw key, NOT the signed URL (URLs expire)
    await cacheService.set(cacheKey, teacher);

    // Generate signed URL after caching
    if (teacher.profileImage) {
      teacher.profileImage = await generateSignedUrl(
        teacher.profileImage,
        86400,
      );
    }

    res.json({ data: teacher, fromCache: false });
  } catch (err) {
    console.error("[getTeacherById]", err);
    res.status(500).json({ error: "Failed to fetch teacher" });
  }
}

// ── POST /api/teachers ────────────────────────────────────────
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

    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ error: "schoolId missing from token" });

    const teacher = await prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await tx.user.create({
        data: {
          name: name || `${firstName} ${lastName}`,
          email,
          password: hashedPassword,
          role: "TEACHER",
          schoolId,
        },
      });

      return tx.teacherProfile.create({
        data: {
          userId: user.id,
          schoolId,
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

    await cacheService.invalidateSchool(schoolId);
    res.status(201).json({ data: teacher });
  } catch (err) {
    if (err.code === "P2002")
      return res
        .status(409)
        .json({ error: "Email or employee code already exists" });
    console.error("[createTeacher]", err);
    res.status(500).json({ error: "Failed to create teacher" });
  }
}

// ── PATCH /api/teachers/:id ───────────────────────────────────
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
    if (data.salary !== undefined) {
      data.salary = data.salary ? Number(data.salary) : null;
    }
    const updated = await prisma.teacherProfile.update({ where: { id }, data });

    const schoolId = req.user?.schoolId;
    await cacheService.invalidateSchool(schoolId);
    res.json({ data: updated });
  } catch (err) {
    console.error("[updateTeacher]", err);
    res.status(500).json({ error: "Failed to update teacher" });
  }
}

// ── DELETE /api/teachers/:id (soft delete) ────────────────────
export async function deleteTeacher(req, res) {
  try {
    const { id } = req.params;
    await prisma.teacherProfile.update({
      where: { id },
      data: { status: "RESIGNED" },
    });
    const schoolId = req.user?.schoolId;

    await cacheService.invalidateSchool(schoolId);
    res.json({ message: "Teacher marked as resigned" });
  } catch (err) {
    console.error("[deleteTeacher]", err);
    res.status(500).json({ error: "Failed to deactivate teacher" });
  }
}

// ── POST /api/teachers/:id/assignments ────────────────────────
export async function addAssignment(req, res) {
  try {
    const { id: teacherId } = req.params;
    const { classSectionId, subjectId, academicYearId } = req.body;
    const schoolId = req.user?.schoolId;

    if (!classSectionId || !subjectId || !academicYearId)
      return res.status(400).json({
        error: "classSectionId, subjectId and academicYearId are required",
      });

    const assignment = await prisma.teacherAssignment.create({
      data: { teacherId, classSectionId, subjectId, academicYearId },
      include: {
        classSection: { select: { name: true, grade: true, section: true } },
        subject: { select: { name: true, code: true } },
        academicYear: { select: { name: true } },
      },
    });

    await cacheService.invalidateSchool(schoolId);

    res.status(201).json({ data: assignment });
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({
        error: "This teacher is already assigned to this subject in this class",
      });

    console.error("[addAssignment]", err);
    res.status(500).json({ error: "Failed to add assignment" });
  }
}

// ── DELETE /api/teachers/:id/assignments/:aId ─────────────────
export async function removeAssignment(req, res) {
  try {
    const { id: teacherId, aId } = req.params;
    const schoolId = req.user?.schoolId;

    await prisma.teacherAssignment.delete({ where: { id: aId } });

    await cacheService.invalidateSchool(schoolId);

    res.json({ message: "Assignment removed" });
  } catch (err) {
    console.error("[removeAssignment]", err);
    res.status(500).json({ error: "Failed to remove assignment" });
  }
}
