// server/src/student/controllers/homework.controller.js

import { prisma } from "../../config/db.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ── R2 client configuration ───────────────────────────────────
const r2 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });

/**
 * Generates a temporary signed URL for viewing/downloading files
 */
async function getSignedFileUrl(key) {
  if (!key) return null;
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return await getSignedUrl(r2, cmd, { expiresIn: 3600 }); // Valid for 1 hour
  } catch (e) {
    console.error("[getSignedFileUrl] Error generating URL for key:", key, e.message);
    return null;
  }
}

// ── helper: get student's active enrollment ───────────────────
async function getStudentContext(studentId) {
  const student = await prisma.student.findUnique({
    where:  { id: studentId },
    select: { id: true, schoolId: true },
  });
  if (!student) throw new Error("Student not found");

  const enrollment = await prisma.studentEnrollment.findFirst({
    where:   { studentId, status: "ACTIVE" },
    include: {
      classSection:  { select: { id: true, name: true, grade: true } },
      academicYear:  { select: { id: true, name: true, isActive: true } },
    },
  });

  return { student, enrollment };
}

// ═══════════════════════════════════════════════════════════════
//  GET /api/student/homework
// ═══════════════════════════════════════════════════════════════
export async function getHomework(req, res) {
  try {
    
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    const { student, enrollment } = await getStudentContext(studentId);

    if (!enrollment) {
      return ok(res, { data: [], enrollment: null });
    }

    const { classSectionId, academicYear } = enrollment;

    const assignments = await prisma.assignment.findMany({
      where: {
        schoolId:      student.schoolId,
        academicYearId: academicYear.id,
        status:        "PUBLISHED",   
        isArchived:    false,
        sections: {
          some: { classSectionId },   
        },
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { dueDate: "asc" },    
    });

    // Generate signed URLs for all attachments in each assignment
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const signedUrls = await Promise.all(
          (a.attachmentKeys || []).map((key) => getSignedFileUrl(key))
        );
        return { ...a, attachmentSignedUrls: signedUrls };
      })
    );

    return ok(res, { data: enriched, enrollment });
  } catch (e) {
    console.error("[student.getHomework]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  GET /api/student/homework/:id
// ═══════════════════════════════════════════════════════════════
export async function getHomeworkById(req, res) {
  try {
    const studentId    = req.user?.id;
    const { id }       = req.params;
    if (!studentId) return err(res, "Unauthorised", 401);

    const { student, enrollment } = await getStudentContext(studentId);
    if (!enrollment) return err(res, "No active enrollment found", 404);

    const { classSectionId } = enrollment;

    
    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        schoolId:   student.schoolId,
        status:     "PUBLISHED",
        isArchived: false,
        sections: {
          some: { classSectionId },
        },
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!assignment) return err(res, "Assignment not found", 404);

    // Generate signed URLs for this specific assignment's attachments
    const signedUrls = await Promise.all(
      (assignment.attachmentKeys || []).map((key) => getSignedFileUrl(key))
    );

    return ok(res, { 
      data: { ...assignment, attachmentSignedUrls: signedUrls } 
    });
  } catch (e) {
    console.error("[student.getHomeworkById]", e);
    
    return err(res, e.message, 500);
  }
}