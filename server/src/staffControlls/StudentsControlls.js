// server/src/staffControlls/StudentsControlls.js
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { uploadToR2, generateSignedUrl } from "../lib/r2.js";
import { getExpiryByRole } from "../utils/fileAccessPolicy.js";

const prisma = new PrismaClient();

const toEnum = (v) => (v ? v.toUpperCase().replace(/\s+/g, "_") : undefined);

const bloodGroupMap = {
  A_PLUS: "A_POS",
  A_MINUS: "A_NEG",
  B_PLUS: "B_POS",
  B_MINUS: "B_NEG",
  AB_PLUS: "AB_POS",
  AB_MINUS: "AB_NEG",
  O_PLUS: "O_POS",
  O_MINUS: "O_NEG",
  // Also accept direct Prisma enum values
  A_POS: "A_POS",
  A_NEG: "A_NEG",
  B_POS: "B_POS",
  B_NEG: "B_NEG",
  AB_POS: "AB_POS",
  AB_NEG: "AB_NEG",
  O_POS: "O_POS",
  O_NEG: "O_NEG",
};

const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  );

// ── registerStudent ────────────────────────────────────────────────────────
/**
 * POST /api/students/register
 * Requires: name, email, password
 * schoolId comes from req.user (JWT) — staff/admin creates the student
 */
export const registerStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }

    // schoolId must come from the authenticated user's JWT
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res
        .status(400)
        .json({
          message: "schoolId missing from token — ensure staff is logged in",
        });
    }

    // Check duplicate within this school
    const exists = await prisma.student.findFirst({
      where: { email, schoolId },
    });
    if (exists) {
      return res
        .status(409)
        .json({
          message: "A student with this email already exists in this school",
        });
    }

    const hashed = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: { name, email, password: hashed, schoolId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return res.status(201).json({ student });
  } catch (err) {
    console.error("[registerStudent]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ── savePersonalInfo ───────────────────────────────────────────────────────
export const savePersonalInfo = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      address,
      city,
      state,
      zipCode,
      grade,
      className,
      admissionDate,
      rollNumber,
      status,
      parentName,
      parentEmail,
      parentPhone,
      emergencyContact,
      bloodGroup,
      medicalConditions,
      allergies,
    } = req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "firstName and lastName are required" });
    }
    if (!grade || !className || !admissionDate) {
      return res
        .status(400)
        .json({ message: "grade, className and admissionDate are required" });
    }

    let profileImageUrl;
    if (req.file) {
      const key = `students/${studentId}/profile/${Date.now()}-${req.file.originalname}`;
      profileImageUrl = await uploadToR2(
        key,
        req.file.buffer,
        req.file.mimetype,
      );
    }

    const rawBloodGroup = toEnum(bloodGroup)
      ?.replace(/\+/g, "_PLUS")
      .replace(/-/g, "_MINUS");

    const fixedBloodGroup = bloodGroupMap[rawBloodGroup] || rawBloodGroup;

    const data = compact({
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      grade,
      className,
      rollNumber,
      admissionDate: admissionDate ? new Date(admissionDate) : undefined,
      status: toEnum(status) || "ACTIVE",
      parentName,
      parentEmail,
      parentPhone,
      emergencyContact,
      bloodGroup: fixedBloodGroup,
      medicalConditions,
      allergies,
      ...(profileImageUrl ? { profileImage: profileImageUrl } : {}),
      ...(req.body.dateOfBirth
        ? { dateOfBirth: new Date(req.body.dateOfBirth) }
        : {}),
      ...(req.body.gender ? { gender: toEnum(req.body.gender) } : {}),
    });

    const personalInfo = await prisma.studentPersonalInfo.upsert({
      where: { studentId },
      create: { studentId, ...data },
      update: data,
    });

    return res.status(200).json({ personalInfo });
  } catch (err) {
    console.error("[savePersonalInfo]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ── uploadDocumentsBulk ────────────────────────────────────────────────────
export const uploadDocumentsBulk = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!req.files?.length) {
      return res.status(400).json({ message: "No files received" });
    }

    const metadata = JSON.parse(req.body.metadata || "[]");
    if (metadata.length !== req.files.length) {
      return res
        .status(400)
        .json({ message: "metadata length must match files length" });
    }

    const created = await Promise.all(
      req.files.map(async (file, idx) => {
        const { documentName, customLabel } = metadata[idx];
        const key = `students/${studentId}/documents/${Date.now()}-${file.originalname}`;
        await uploadToR2(key, file.buffer, file.mimetype);
        return prisma.studentDocumentInfo.create({
          data: {
            studentId,
            documentName,
            customLabel: customLabel || null,
            fileKey: key,
            fileType: file.mimetype,
            fileSizeBytes: file.size,
          },
        });
      }),
    );

    return res.status(201).json({ documents: created });
  } catch (err) {
    console.error("[uploadDocumentsBulk]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── getStudent ─────────────────────────────────────────────────────────────
export const getStudent = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        personalInfo: true,
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });
    return res.json({ student });
  } catch (err) {
    console.error("[getStudent]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── listStudents ───────────────────────────────────────────────────────────
export const listStudents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "20"));
    const search = req.query.search?.trim() || "";

    // Always scope to the school from the JWT
    const schoolId = req.user?.schoolId;

    const where = {
      ...(schoolId ? { schoolId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              {
                personalInfo: {
                  firstName: { contains: search, mode: "insensitive" },
                },
              },
              {
                personalInfo: {
                  lastName: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [total, students] = await prisma.$transaction([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          personalInfo: {
            select: {
              firstName: true,
              lastName: true,
              grade: true,
              className: true,
              status: true,
              profileImage: true,
            },
          },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    return res.json({
      students,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[listStudents]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── deleteStudent ──────────────────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const docs = await prisma.studentDocumentInfo.findMany({
      where: { studentId: id },
      select: { fileKey: true },
    });

    await prisma.student.delete({ where: { id } });

    // R2 cleanup in background
    // Promise.all(docs.map((d) => deleteFromR2(d.fileKey))).catch(console.error);

    return res.json({ message: "Student deleted" });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ message: "Student not found" });
    console.error("[deleteStudent]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── viewStudentDocument ────────────────────────────────────────────────────
export const viewStudentDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    if (!req.user?.role) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const document = await prisma.studentDocumentInfo.findUnique({
      where: { id: documentId },
    });

    if (!document)
      return res.status(404).json({ message: "Document not found" });

    const expiresIn = getExpiryByRole(req.user.role);
    const signedUrl = await generateSignedUrl(document.fileKey, expiresIn);

    return res.json({ url: signedUrl, expiresIn });
  } catch (error) {
    console.error("[viewStudentDocument]", error);
    return res.status(500).json({ message: "Server error" });
  }
};
