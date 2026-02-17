// studentController.js
// Handles: Student auth · PersonalInfo CRUD · Document upload/delete via Cloudflare R2

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// ─── Cloudflare R2 client ────────────────────────────────────────────────────
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const uploadToR2 = async (fileBuffer, mimeType, folder, originalName) => {
  const ext = originalName.split(".").pop();
  const fileKey = `${folder}/${uuidv4()}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: mimeType,
    })
  );

  const fileUrl = `${PUBLIC_URL}/${fileKey}`;
  return { fileKey, fileUrl };
};

const deleteFromR2 = async (fileKey) => {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey }));
};

// ═════════════════════════════════════════════════════════════════════════════
//  AUTH
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/students/register
export const registerStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "name, email and password are required" });

    const exists = await prisma.student.findUnique({ where: { email } });
    if (exists)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 12);

    const student = await prisma.student.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    res.status(201).json({
      message: "Student registered successfully",
      token: generateToken(student.id),
      student,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/students/login
export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await prisma.student.findUnique({ where: { email } });
    if (!student)
      return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, student.password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    const { password: _, ...safeStudent } = student;
    res.json({
      message: "Login successful",
      token: generateToken(student.id),
      student: safeStudent,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  STUDENTS — list / get / delete
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/students
export const getAllStudents = async (req, res) => {
  try {
    const { search, grade, status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      personalInfo: {
        ...(grade   && { grade }),
        ...(status  && { status }),
        ...(search  && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName:  { contains: search, mode: "insensitive" } },
          ],
        }),
      },
    };

    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          personalInfo: {
            select: {
              firstName: true, lastName: true, phone: true,
              grade: true, className: true, status: true,
              admissionDate: true, profileImage: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      data: students,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/students/:id
export const getStudentById = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, createdAt: true,
        personalInfo: true,
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!student)
      return res.status(404).json({ message: "Student not found" });

    res.json({ data: student });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/students/:id
export const deleteStudent = async (req, res) => {
  try {
    // Delete all R2 files first
    const docs = await prisma.studentDocumentInfo.findMany({
      where: { studentId: req.params.id },
      select: { fileKey: true },
    });

    await Promise.all(docs.map((d) => deleteFromR2(d.fileKey)));

    await prisma.student.delete({ where: { id: req.params.id } });

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  PERSONAL INFO
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/students/:id/personal-info
export const createPersonalInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    const alreadyExists = await prisma.studentPersonalInfo.findUnique({
      where: { studentId: id },
    });
    if (alreadyExists)
      return res.status(409).json({ message: "Personal info already exists. Use PUT to update." });

    const {
      firstName, lastName, dateOfBirth, gender, phone,
      address, city, state, zipCode,
      grade, className, admissionDate, status,
      parentName, parentEmail, parentPhone, emergencyContact,
      bloodGroup, medicalConditions, allergies,
    } = req.body;

    if (!firstName || !lastName || !grade || !className || !admissionDate)
      return res.status(400).json({ message: "firstName, lastName, grade, className and admissionDate are required" });

    // Profile image upload (optional, multer field: profileImage)
    let profileImage = null;
    if (req.file) {
      const { fileUrl } = await uploadToR2(
        req.file.buffer,
        req.file.mimetype,
        `students/${id}/profile`,
        req.file.originalname
      );
      profileImage = fileUrl;
    }

    const info = await prisma.studentPersonalInfo.create({
      data: {
        studentId: id,
        firstName, lastName,
        dateOfBirth:  dateOfBirth  ? new Date(dateOfBirth)  : null,
        gender:       gender       || null,
        profileImage,
        phone, address, city, state, zipCode,
        grade, className,
        admissionDate: new Date(admissionDate),
        status:        status || "ACTIVE",
        parentName, parentEmail, parentPhone, emergencyContact,
        bloodGroup:        bloodGroup        || null,
        medicalConditions: medicalConditions || null,
        allergies:         allergies         || null,
      },
    });

    res.status(201).json({ message: "Personal info created", data: info });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/students/:id/personal-info
export const updatePersonalInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.studentPersonalInfo.findUnique({
      where: { studentId: id },
    });
    if (!existing)
      return res.status(404).json({ message: "Personal info not found. Use POST to create." });

    const {
      firstName, lastName, dateOfBirth, gender, phone,
      address, city, state, zipCode,
      grade, className, admissionDate, status,
      parentName, parentEmail, parentPhone, emergencyContact,
      bloodGroup, medicalConditions, allergies,
    } = req.body;

    // Handle profile image update
    let profileImage = existing.profileImage;
    if (req.file) {
      const { fileUrl } = await uploadToR2(
        req.file.buffer,
        req.file.mimetype,
        `students/${id}/profile`,
        req.file.originalname
      );
      profileImage = fileUrl;
    }

    const updated = await prisma.studentPersonalInfo.update({
      where: { studentId: id },
      data: {
        ...(firstName        && { firstName }),
        ...(lastName         && { lastName }),
        ...(dateOfBirth      && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender           && { gender }),
        profileImage,
        ...(phone            && { phone }),
        ...(address          && { address }),
        ...(city             && { city }),
        ...(state            && { state }),
        ...(zipCode          && { zipCode }),
        ...(grade            && { grade }),
        ...(className        && { className }),
        ...(admissionDate    && { admissionDate: new Date(admissionDate) }),
        ...(status           && { status }),
        ...(parentName       && { parentName }),
        ...(parentEmail      && { parentEmail }),
        ...(parentPhone      && { parentPhone }),
        ...(emergencyContact && { emergencyContact }),
        ...(bloodGroup       && { bloodGroup }),
        ...(medicalConditions !== undefined && { medicalConditions }),
        ...(allergies         !== undefined && { allergies }),
      },
    });

    res.json({ message: "Personal info updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/students/:id/personal-info
export const getPersonalInfo = async (req, res) => {
  try {
    const info = await prisma.studentPersonalInfo.findUnique({
      where: { studentId: req.params.id },
    });

    if (!info)
      return res.status(404).json({ message: "Personal info not found" });

    res.json({ data: info });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENTS
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/students/:id/documents
// multipart/form-data  fields: documentName, customLabel (optional), file
export const uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentName, customLabel } = req.body;

    if (!req.file)
      return res.status(400).json({ message: "No file uploaded" });

    if (!documentName)
      return res.status(400).json({ message: "documentName is required" });

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    const { fileKey, fileUrl } = await uploadToR2(
      req.file.buffer,
      req.file.mimetype,
      `students/${id}/documents`,
      req.file.originalname
    );

    const doc = await prisma.studentDocumentInfo.create({
      data: {
        studentId: id,
        documentName,
        customLabel: documentName === "CUSTOM" ? customLabel : null,
        fileKey,
        fileUrl,
        fileType:      req.file.mimetype,
        fileSizeBytes: req.file.size,
      },
    });

    res.status(201).json({ message: "Document uploaded", data: doc });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/students/:id/documents/bulk
// Upload multiple documents at once
// multipart/form-data  files[] array + metadata[] JSON array
export const uploadDocumentsBulk = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "No files uploaded" });

    // metadata is a JSON array stringified by frontend
    // e.g. [{ documentName: "AADHAR_CARD", customLabel: null }, ...]
    let metadata = [];
    try {
      metadata = JSON.parse(req.body.metadata || "[]");
    } catch {
      return res.status(400).json({ message: "Invalid metadata JSON" });
    }

    const results = await Promise.all(
      req.files.map(async (file, idx) => {
        const { documentName = "CUSTOM", customLabel = null } = metadata[idx] || {};

        const { fileKey, fileUrl } = await uploadToR2(
          file.buffer,
          file.mimetype,
          `students/${id}/documents`,
          file.originalname
        );

        return prisma.studentDocumentInfo.create({
          data: {
            studentId: id,
            documentName,
            customLabel: documentName === "CUSTOM" ? customLabel : null,
            fileKey,
            fileUrl,
            fileType:      file.mimetype,
            fileSizeBytes: file.size,
          },
        });
      })
    );

    res.status(201).json({
      message: `${results.length} document(s) uploaded`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/students/:id/documents
export const getDocuments = async (req, res) => {
  try {
    const docs = await prisma.studentDocumentInfo.findMany({
      where:   { studentId: req.params.id },
      orderBy: { uploadedAt: "desc" },
    });

    res.json({ data: docs });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/students/:id/documents/:docId/signed-url
// Returns a short-lived signed URL for private R2 buckets
export const getSignedDocumentUrl = async (req, res) => {
  try {
    const doc = await prisma.studentDocumentInfo.findFirst({
      where: { id: req.params.docId, studentId: req.params.id },
    });

    if (!doc)
      return res.status(404).json({ message: "Document not found" });

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: doc.fileKey });
    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hr

    res.json({ signedUrl });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PATCH /api/students/:id/documents/:docId/verify
export const verifyDocument = async (req, res) => {
  try {
    const doc = await prisma.studentDocumentInfo.update({
      where: { id: req.params.docId },
      data:  { isVerified: true, verifiedAt: new Date() },
    });

    res.json({ message: "Document verified", data: doc });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/students/:id/documents/:docId
export const deleteDocument = async (req, res) => {
  try {
    const doc = await prisma.studentDocumentInfo.findFirst({
      where: { id: req.params.docId, studentId: req.params.id },
    });

    if (!doc)
      return res.status(404).json({ message: "Document not found" });

    await deleteFromR2(doc.fileKey);
    await prisma.studentDocumentInfo.delete({ where: { id: doc.id } });

    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};