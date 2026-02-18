// controllers/studentController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
// import { uploadToR2, deleteFromR2 } from "../lib/r2.js"; // see lib/r2.js below

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Normalise enum-style strings → upper-snake for Prisma */
// ── Helpers ────────────────────────────────────────────────────────────────

const toEnum = (v) => (v ? v.toUpperCase().replace(/\s+/g, "_") : undefined);

// ADD THIS:
const toBloodGroupEnum = (v) => {
  if (!v) return undefined;
  return v
    .toUpperCase()
    .replace(/\+/g, "_PLUS")
    .replace(/-/g, "_MINUS");
  // "A+"  → "A_PLUS"
  // "AB-" → "AB_MINUS"
  // "O+"  → "O_PLUS"  etc.
};
 
/** Strip undefined values so Prisma doesn't complain about missing optionals */
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""));

// ── registerStudent ────────────────────────────────────────────────────────
/**
 * POST /api/students/register
 * Creates the auth row in `Student` table.
 */
export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, firstName, lastName } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    // Check duplicate
    const exists = await prisma.student.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: "A student with this email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = jwt.sign({ id: student.id, role: "student" }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({ student, token });
  } catch (err) {
    console.error("[registerStudent]", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ── savePersonalInfo ───────────────────────────────────────────────────────
/**
 * POST /api/students/:id/personal-info
 * Upserts the StudentPersonalInfo row.
 * Accepts multipart/form-data; req.file = profileImage (optional).
 */
export const savePersonalInfo = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    // Verify student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const {
      firstName, lastName, dateOfBirth, gender,
      phone, address, city, state, zipCode,
      grade, className, admissionDate, status,
      parentName, parentEmail, parentPhone, emergencyContact,
      bloodGroup, medicalConditions, allergies,
    } = req.body;

    // Required personal info fields
    if (!firstName || !lastName) {
      return res.status(400).json({ message: "firstName and lastName are required" });
    }
    if (!grade || !className || !admissionDate) {
      return res.status(400).json({ message: "grade, className and admissionDate are required" });
    }

    // Profile photo upload (optional)
    let profileImageUrl;
    if (req.file) {
      const key = `students/${studentId}/profile/${Date.now()}-${req.file.originalname}`;
      profileImageUrl = await uploadToR2(key, req.file.buffer, req.file.mimetype);
    }

        // ✅ Fix BloodGroup Enum Mapping
    // ✅ Fix BloodGroup Enum Mapping
    const bloodGroupMap = {
    A_PLUS: "A_POS",
    A_MINUS: "A_NEG",
    B_PLUS: "B_POS",
    B_MINUS: "B_NEG",
    AB_PLUS: "AB_POS",
    AB_MINUS: "AB_NEG",
    O_PLUS: "O_POS",
    O_MINUS: "O_NEG",
    };

    const fixedBloodGroup =
    bloodGroupMap[toEnum(bloodGroup)] || toEnum(bloodGroup);

    // Build data payload
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

    admissionDate: admissionDate ? new Date(admissionDate) : undefined,

    status: toEnum(status) || "ACTIVE",

    parentName,
    parentEmail,
    parentPhone,
    emergencyContact,

    // ✅ Fixed Enum Value
    bloodGroup: fixedBloodGroup,

    medicalConditions,
    allergies,
    });

    // Upsert so re-submitting (e.g. going back and re-saving) works cleanly
    const personalInfo = await prisma.studentPersonalInfo.upsert({
      where:  { studentId },
      create: { studentId, ...data },
      update: data,
    });

    return res.status(200).json({ personalInfo });
  } catch (err) {
    console.error("[savePersonalInfo]", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ── uploadDocumentsBulk ────────────────────────────────────────────────────
/**
 * POST /api/students/:id/documents/bulk
 * req.files  — array of uploaded files (multer)
 * req.body.metadata — JSON string: [{ documentName, customLabel }]
 *
 * documentName is one of the enum values from your Prisma schema, e.g.
 *   "AADHAR_CARD" | "BIRTH_CERTIFICATE" | "MARKSHEET" | "TRANSFER_CERTIFICATE" | "CUSTOM"
 */
export const uploadDocumentsBulk = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files received" });
    }

    let metadata = [];
    try {
      metadata = JSON.parse(req.body.metadata || "[]");
    } catch {
      return res.status(400).json({ message: "Invalid metadata JSON" });
    }

    if (metadata.length !== req.files.length) {
      return res.status(400).json({ message: "metadata array length must match files array length" });
    }

    // Upload each file to R2 and record in DB
    const created = await Promise.all(
      req.files.map(async (file, idx) => {
        const { documentName, customLabel } = metadata[idx];
        const key = `students/${studentId}/documents/${Date.now()}-${idx}-${file.originalname}`;
        const fileUrl = await uploadToR2(key, file.buffer, file.mimetype);

        return prisma.studentDocumentInfo.create({
          data: {
            studentId,
            documentName,          // enum value
            customLabel:  customLabel || null,
            fileUrl,
            fileName:     file.originalname,
            fileSize:     file.size,
            mimeType:     file.mimetype,
            r2Key:        key,
          },
        });
      })
    );

    return res.status(201).json({ documents: created });
  } catch (err) {
    console.error("[uploadDocumentsBulk]", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ── getStudent ─────────────────────────────────────────────────────────────
/**
 * GET /api/students/:id
 */
export const getStudent = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, createdAt: true,
        personalInfo: true,
        documents: {
          orderBy: { createdAt: "desc" },
        },
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
/**
 * GET /api/students?page=1&limit=20&search=john
 */
export const listStudents = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || "1"));
    const limit  = Math.min(100, parseInt(req.query.limit || "20"));
    const search = req.query.search?.trim() || "";

    const where = search
      ? {
          OR: [
            { name:  { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { personalInfo: { firstName: { contains: search, mode: "insensitive" } } },
            { personalInfo: { lastName:  { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};

    const [total, students] = await prisma.$transaction([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip:  (page - 1) * limit,
        take:  limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, email: true, createdAt: true,
          personalInfo: {
            select: {
              firstName: true, lastName: true, grade: true,
              className: true, status: true, profileImage: true,
            },
          },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    return res.json({ students, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[listStudents]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── deleteStudent ──────────────────────────────────────────────────────────
/**
 * DELETE /api/students/:id
 * Cascades to personalInfo + documents via Prisma onDelete: Cascade.
 * Also deletes R2 objects for documents.
 */
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Grab document R2 keys first
    const docs = await prisma.studentDocumentInfo.findMany({
      where: { studentId: id },
      select: { fileKey: true },
    });

    // Delete student (cascade clears personalInfo + documents rows)
    await prisma.student.delete({ where: { id } });

    // Clean up R2 objects in background — don't block the response
    Promise.all(docs.map((d) => deleteFromR2(d.r2Key))).catch((e) =>
      console.error("[deleteStudent] R2 cleanup error:", e)
    );

    return res.json({ message: "Student deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Student not found" });
    console.error("[deleteStudent]", err);
    return res.status(500).json({ message: "Server error" });
  }
};