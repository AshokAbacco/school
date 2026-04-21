// server/src/staffControlls/teacherCertificateController.js
//
// Handles:
//   GET    /api/teacher/certificates              — list uploaded certs for this school
//   GET    /api/teacher/certificates/students     — search students for the upload form
//   POST   /api/teacher/certificates/upload       — upload certificate to R2 + create DB record
//   DELETE /api/teacher/certificates/:id          — delete certificate + file from R2

import { prisma } from "../config/db.js";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { getCachedSignedUrl } from "../lib/urlCache.js";
// ─── helpers ─────────────────────────────────────────────────────────────────

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

const getTeacherId = async (userId) => {
  const profile = await prisma.teacherProfile.findUnique({
    where:  { userId },
    select: { id: true, schoolId: true },
  });
  if (!profile) throw new Error("Teacher profile not found");
  return profile;
};

// ─── R2 client ────────────────────────────────────────────────────────────────

const r2 = new S3Client({
  region:   process.env.R2_REGION ?? "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;

// ─── Multer — memory storage, 10 MB limit ────────────────────────────────────

export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, JPG, PNG, or WebP files are allowed."));
  },
});

// ─── Helper: build public file URL ───────────────────────────────────────────

// function buildFileUrl(key) {
//   const endpoint = process.env.R2_ENDPOINT ?? "";
//   return `${endpoint}/${BUCKET}/${key}`;
// }
function buildFileUrl(key) {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) throw new Error("R2_PUBLIC_URL not configured");
  return `${base}/${key}`;
}
// ═══════════════════════════════════════════════════════════════
//  LIST — GET /api/teacher/certificates
//  Returns all UPLOADED certificates for the teacher's school
// ═══════════════════════════════════════════════════════════════

export async function listCertificates(req, res) {
  try {
    const { id: userId } = req.user;
    const { schoolId }   = await getTeacherId(userId);

    const certificates = await prisma.certificate.findMany({
      where: {
        source:  "UPLOADED",
        student: { schoolId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id:              true,
        studentId:       true,
        studentName:     true,
        title:           true,
        category:        true,
        achievementText: true,
        academicYear:    true,
        issuedDate:      true,
        fileUrl:         true,
        fileKey:         true,
        fileType:        true,
        description:     true,
        status:          true,
        source:          true,
        createdAt:       true,
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    const certificatesWithUrls = await Promise.all(
  certificates.map(async (cert) => {
    let fileUrl = null;

    if (cert.fileKey) {
      try {
        fileUrl = await getCachedSignedUrl(schoolId, cert.fileKey, 3600);
      } catch (e) {
        console.error("Signed URL error:", e);
      }
    }

    return {
      ...cert,
      fileUrl, // override old broken URL
    };
  })
);

return ok(res, { data: certificatesWithUrls });
  } catch (e) {
    console.error("[teacherCertificate.listCertificates]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH STUDENTS — GET /api/teacher/certificates/students
//  Used in the upload form dropdown
//  Query: ?search=
// ═══════════════════════════════════════════════════════════════

export async function searchStudents(req, res) {
  try {
    const { id: userId } = req.user;
    const { schoolId }   = await getTeacherId(userId);
    const search         = (req.query.search ?? "").trim();

    if (!search) return ok(res, { students: [] });

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where:  { schoolId, isActive: true },
      select: { id: true, name: true },
    });

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [
          { name:  { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          {
            enrollments: {
              some: {
                rollNumber: { contains: search, mode: "insensitive" },
                ...(activeYear ? { academicYearId: activeYear.id } : {}),
              },
            },
          },
        ],
      },
      take: 12,
      select: {
        id:   true,
        name: true,
        personalInfo: {
          select: { firstName: true, lastName: true },
        },
        enrollments: {
          where:  activeYear ? { academicYearId: activeYear.id } : {},
          take:   1,
          select: {
            rollNumber:   true,
            academicYear: { select: { name: true } },
            classSection: { select: { id: true, grade: true, section: true, name: true } },
          },
        },
      },
    });

    const mapped = students.map((s) => {
      const enroll      = s.enrollments?.[0];
      const pi          = s.personalInfo;
      const displayName = pi ? `${pi.firstName} ${pi.lastName}` : s.name;

      return {
        id:           s.id,
        name:         displayName,
        rollNumber:   enroll?.rollNumber             ?? null,
        classSection: enroll?.classSection?.name     ?? enroll?.classSection?.grade ?? null,
        academicYear: enroll?.academicYear?.name     ?? activeYear?.name ?? null,
      };
    });

    return ok(res, { students: mapped });
  } catch (e) {
    console.error("[teacherCertificate.searchStudents]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  UPLOAD — POST /api/teacher/certificates/upload
//  multipart/form-data fields:
//    file        — certificate file  (PDF / JPG / PNG / WebP, max 10 MB)
//    studentId   — string (required)
//    title       — string (required)
//    category    — AwardCategory enum value (required)
//    issuedDate  — ISO date string (required)
//    description — string (optional)
// ═══════════════════════════════════════════════════════════════

export async function uploadCertificate(req, res) {
  try {
    const { id: userId } = req.user;
    const { schoolId }   = await getTeacherId(userId);
    const file           = req.file;

    if (!file)             return err(res, "No file uploaded.");

    const { studentId, title, category, issuedDate, description } = req.body;

    if (!studentId)        return err(res, "studentId is required.");
    if (!title?.trim())    return err(res, "title is required.");
    if (!category)         return err(res, "category is required.");
    if (!issuedDate)       return err(res, "issuedDate is required.");

    // Verify student belongs to this school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        personalInfo: { select: { firstName: true, lastName: true } },
        enrollments: {
          orderBy: { createdAt: "desc" },
          take:    1,
          include: { academicYear: { select: { name: true } } },
        },
      },
    });
    if (!student) return err(res, "Student not found.", 404);

    const studentName  = student.personalInfo
      ? `${student.personalInfo.firstName} ${student.personalInfo.lastName}`
      : student.name;

    const academicYear = student.enrollments?.[0]?.academicYear?.name ?? "—";

    // Upload to R2
    const ext     = file.originalname.split(".").pop().toLowerCase();
    const fileKey = `certificates/${schoolId}/${studentId}/${uuidv4()}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket:      BUCKET,
        Key:         fileKey,
        Body:        file.buffer,
        ContentType: file.mimetype,
      })
    );

    

    // Create Certificate record in DB
    const certificate = await prisma.certificate.create({
      data: {
        studentId,
        studentName,
        achievementText: title.trim(),
        title:           title.trim(),
        category,
        academicYear,
        issuedDate:      new Date(issuedDate),
        status:          "ISSUED",
        source:          "UPLOADED",
        
        fileKey,
        fileType:        file.mimetype,
        description:     description?.trim() || null,
        uploadedById:    userId,
      },
    });


    return ok(res, { data: certificate }, 201);
  } catch (e) {
    console.error("[teacherCertificate.uploadCertificate]", e);
    return err(res, e.message ?? "Upload failed.", e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  DELETE — DELETE /api/teacher/certificates/:id
//  Removes DB record + R2 file
//  Only uploader OR ADMIN / SUPER_ADMIN can delete
// ═══════════════════════════════════════════════════════════════

export async function deleteCertificate(req, res) {
  try {
    const { id: userId } = req.user;
    const { schoolId }   = await getTeacherId(userId);
    const { id }         = req.params;

    const cert = await prisma.certificate.findFirst({
      where: {
        id,
        source:  "UPLOADED",
        student: { schoolId },
      },
    });
    if (!cert) return err(res, "Certificate not found.", 404);

    // Permission check
    const isOwner = cert.uploadedById === userId;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return err(res, "You can only delete certificates you uploaded.", 403);
    }

    // Delete from R2 — non-blocking (DB delete still proceeds on R2 failure)
    if (cert.fileKey) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: cert.fileKey }));
      } catch (r2Err) {
        console.warn("[teacherCertificate.deleteCertificate] R2 delete failed:", r2Err.message);
      }
    }

    await prisma.certificate.delete({ where: { id } });

    return ok(res, { message: "Certificate deleted successfully." });
  } catch (e) {
    console.error("[teacherCertificate.deleteCertificate]", e);
    return err(res, e.message, e.status ?? 500);
  }
}