// server/src/staffControlls/teacherAssignmentController.js

import { prisma } from "../config/db.js";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

// ── R2 client ──────────────────────────────────────────────────
const r2 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;

// ── multer: memory storage (we stream to R2) ──────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
});

// ── updated helpers ───────────────────────────────────────────
const schoolGuard = (req) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) throw new Error("No schoolId on token");
  return schoolId;
};

/**
 * Enhanced Teacher Guard:
 * Checks token first. If missing, queries DB using userId.
 */
const teacherGuard = async (req) => {
  // 1. Try to get from token
  if (req.user?.teacherProfileId) return req.user.teacherProfileId;

  // 2. Fallback: Lookup in DB via userId
  if (!req.user?.id) throw new Error("Unauthorized: No user ID in token");

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: req.user.id },
    select: { id: true }
  });

  if (!profile) throw new Error("Teacher profile not found for this account");
  
  // Cache it on the request object for subsequent calls in this request cycle
  req.user.teacherProfileId = profile.id;
  return profile.id;
};

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });

async function uploadToR2(buffer, key, mimetype) {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }));
  return key;
}

async function deleteFromR2(key) {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    console.warn("[deleteFromR2] failed for key:", key, e.message);
  }
}

async function getSignedFileUrl(key) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, cmd, { expiresIn: 3600 });
}

// ═══════════════════════════════════════════════════════════════
//  DROPDOWN HELPERS
// ═══════════════════════════════════════════════════════════════

export async function getDropdownSubjects(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const teacherId = await teacherGuard(req);

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId },
      select: { subject: { select: { id: true, name: true, code: true } } },
      distinct: ["subjectId"],
    });

    const subjects = assignments.map((a) => a.subject);
    return ok(res, { data: subjects });
  } catch (e) {
    return err(res, e.message, 500);
  }
}

export async function getDropdownAcademicYears(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const years = await prisma.academicYear.findMany({
      where:   { schoolId },
      select:  { id: true, name: true, isActive: true },
      orderBy: { startDate: "desc" },
    });
    return ok(res, { data: years });
  } catch (e) {
    return err(res, e.message, 500);
  }
}

export async function getDropdownClassSections(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const teacherId = await teacherGuard(req);

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId },
      select: {
        classSection: { select: { id: true, grade: true, section: true, name: true } },
      },
      distinct: ["classSectionId"],
    });

    const sections = assignments.map((a) => a.classSection);
    return ok(res, { data: sections });
  } catch (e) {
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ASSIGNMENTS CRUD
// ═══════════════════════════════════════════════════════════════

export async function getAssignments(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const teacherId = await teacherGuard(req);
    const { academicYearId, status, subjectId } = req.query;

    const assignments = await prisma.assignment.findMany({
      where: {
        schoolId,
        teacherId,
        isArchived: false,
        ...(academicYearId ? { academicYearId } : {}),
        ...(status         ? { status }         : {}),
        ...(subjectId      ? { subjectId }      : {}),
      },
      include: {
        subject:      { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, name: true, isActive: true } },
        sections: {
          include: {
            classSection: { select: { id: true, grade: true, section: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const signedUrls = await Promise.all(
          (a.attachmentKeys || []).map((k) => getSignedFileUrl(k))
        );
        return { ...a, attachmentSignedUrls: signedUrls };
      })
    );

    return ok(res, { data: enriched });
  } catch (e) {
    console.error("[getAssignments]", e);
    return err(res, e.message, 500);
  }
}

export async function getAssignmentById(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const teacherId = await teacherGuard(req);

    const assignment = await prisma.assignment.findFirst({
      where: { id: req.params.id, schoolId, teacherId, isArchived: false },
      include: {
        subject:      { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, name: true } },
        sections: {
          include: {
            classSection: { select: { id: true, grade: true, section: true, name: true } },
          },
        },
      },
    });

    if (!assignment) return err(res, "Assignment not found", 404);

    const signedUrls = await Promise.all(
      (assignment.attachmentKeys || []).map((k) => getSignedFileUrl(k))
    );

    return ok(res, { data: { ...assignment, attachmentSignedUrls: signedUrls } });
  } catch (e) {
    console.error("[getAssignmentById]", e);
    return err(res, e.message, 500);
  }
}

export async function createAssignment(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const teacherId = await teacherGuard(req);

    const {
      title,
      description,
      type        = "REGULAR",
      status      = "DRAFT",
      dueDate,
      subjectId,
      academicYearId,
      classSectionIds,
      timeLimitMinutes,
    } = req.body;

    if (!title)          return err(res, "title is required");
    if (!dueDate)        return err(res, "dueDate is required");
    if (!subjectId)      return err(res, "subjectId is required");
    if (!academicYearId) return err(res, "academicYearId is required");

    const sectionIds = Array.isArray(classSectionIds)
      ? classSectionIds
      : JSON.parse(classSectionIds || "[]");

    if (sectionIds.length === 0) return err(res, "At least one class section is required");

    const files = req.files || [];
    const attachmentKeys  = [];
    const attachmentNames = [];
    const attachmentTypes = [];

    for (const file of files) {
      const key = `assignments/${schoolId}/${uuidv4()}-${file.originalname}`;
      await uploadToR2(file.buffer, key, file.mimetype);
      attachmentKeys.push(key);
      attachmentNames.push(file.originalname);
      attachmentTypes.push(file.mimetype);
    }

    const parsedLimit = timeLimitMinutes ? parseInt(timeLimitMinutes, 10) : null;

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: description || null,
        type,
        status,
        dueDate:          new Date(dueDate),
        timeLimitMinutes: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : null,
        attachmentKeys,
        attachmentNames,
        attachmentTypes,
        subjectId,
        teacherId,
        schoolId,
        academicYearId,
        sections: {
          create: sectionIds.map((csId) => ({ classSectionId: csId })),
        },
      },
      include: {
        subject:      { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        sections: {
          include: {
            classSection: { select: { id: true, grade: true, section: true, name: true } },
          },
        },
      },
    });

    return ok(res, { data: assignment }, 201);
  } catch (e) {
    console.error("[createAssignment]", e);
    return err(res, e.message, 500);
  }
}

export async function updateAssignment(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const teacherId = await teacherGuard(req);

    const existing = await prisma.assignment.findFirst({
      where: { id: req.params.id, schoolId, teacherId, isArchived: false },
    });
    if (!existing) return err(res, "Assignment not found", 404);

    const {
      title,
      description,
      type,
      status,
      dueDate,
      subjectId,
      academicYearId,
      classSectionIds,
      keepKeys,
      timeLimitMinutes,
    } = req.body;

    const sectionIds = classSectionIds
      ? Array.isArray(classSectionIds) ? classSectionIds : JSON.parse(classSectionIds)
      : null;

    const keptKeys = keepKeys
      ? Array.isArray(keepKeys) ? keepKeys : JSON.parse(keepKeys)
      : existing.attachmentKeys;

    const removedKeys = existing.attachmentKeys.filter((k) => !keptKeys.includes(k));
    await Promise.all(removedKeys.map(deleteFromR2));

    const files = req.files || [];
    const newKeys  = [...keptKeys];
    const newNames = [...existing.attachmentNames.filter((_, i) => keptKeys.includes(existing.attachmentKeys[i]))];
    const newTypes = [...existing.attachmentTypes.filter((_, i) => keptKeys.includes(existing.attachmentKeys[i]))];

    for (const file of files) {
      const key = `assignments/${schoolId}/${uuidv4()}-${file.originalname}`;
      await uploadToR2(file.buffer, key, file.mimetype);
      newKeys.push(key);
      newNames.push(file.originalname);
      newTypes.push(file.mimetype);
    }

    const assignment = await prisma.$transaction(async (tx) => {
      if (sectionIds !== null) {
        await tx.assignmentSection.deleteMany({ where: { assignmentId: req.params.id } });
        if (sectionIds.length > 0) {
          await tx.assignmentSection.createMany({
            data: sectionIds.map((csId) => ({
              assignmentId:   req.params.id,
              classSectionId: csId,
            })),
          });
        }
      }

      return tx.assignment.update({
        where: { id: req.params.id },
        data: {
          ...(title          !== undefined ? { title }          : {}),
          ...(description    !== undefined ? { description }    : {}),
          ...(type           !== undefined ? { type }           : {}),
          ...(status         !== undefined ? { status }         : {}),
          ...(dueDate        !== undefined ? { dueDate: new Date(dueDate) } : {}),
          ...(subjectId      !== undefined ? { subjectId }      : {}),
          ...(academicYearId !== undefined ? { academicYearId } : {}),
          ...(timeLimitMinutes !== undefined ? {
            timeLimitMinutes: timeLimitMinutes === "" || timeLimitMinutes === null
              ? null
              : parseInt(timeLimitMinutes, 10) || null,
          } : {}),
          attachmentKeys:  newKeys,
          attachmentNames: newNames,
          attachmentTypes: newTypes,
        },
        include: {
          subject:      { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
          sections: {
            include: {
              classSection: { select: { id: true, grade: true, section: true, name: true } },
            },
          },
        },
      });
    });

    return ok(res, { data: assignment });
  } catch (e) {
    console.error("[updateAssignment]", e);
    return err(res, e.message, 500);
  }
}

export async function deleteAssignment(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const teacherId = await teacherGuard(req);

    const existing = await prisma.assignment.findFirst({
      where: { id: req.params.id, schoolId, teacherId, isArchived: false },
    });
    if (!existing) return err(res, "Assignment not found", 404);

    await prisma.assignment.update({
      where: { id: req.params.id },
      data:  { isArchived: true, status: "CLOSED" },
    });

    return ok(res, { message: "Assignment deleted successfully" });
  } catch (e) {
    console.error("[deleteAssignment]", e);
    return err(res, e.message, 500);
  }
}

export async function togglePublish(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const teacherId = await teacherGuard(req);

    const existing = await prisma.assignment.findFirst({
      where: { id: req.params.id, schoolId, teacherId, isArchived: false },
    });
    if (!existing) return err(res, "Assignment not found", 404);

    const newStatus = existing.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    const updated = await prisma.assignment.update({
      where: { id: req.params.id },
      data:  { status: newStatus },
      select: { id: true, status: true },
    });

    return ok(res, { data: updated });
  } catch (e) {
    console.error("[togglePublish]", e);
    return err(res, e.message, 500);
  }
}