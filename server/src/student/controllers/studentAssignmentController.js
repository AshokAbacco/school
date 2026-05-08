// server/src/studentControlls/studentAssignmentController.js

import { prisma } from "../../config/db.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET;

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });

async function signedUrl(key) {
  if (!key) return null;
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return await getSignedUrl(r2, cmd, { expiresIn: 3600 });
  } catch {
    return null;
  }
}

export async function getStudentAssignments(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorized", 401);

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { classSectionId: true, academicYearId: true },
    });

    if (!enrollment) return ok(res, { data: [] });

    const assignmentSections = await prisma.assignmentSection.findMany({
      where: { classSectionId: enrollment.classSectionId },
      select: { assignmentId: true },
    });

    const assignmentIds = assignmentSections.map((s) => s.assignmentId);
    if (assignmentIds.length === 0) return ok(res, { data: [] });

    const assignments = await prisma.assignment.findMany({
      where: {
        id:             { in: assignmentIds },
        status:         "PUBLISHED",
        isArchived:     false,
        academicYearId: enrollment.academicYearId,
      },
      include: {
        subject:  { select: { id: true, name: true } },
        teacher:  { select: { firstName: true, lastName: true } },
        sections: {
          include: { classSection: { select: { id: true, name: true, grade: true } } },
        },
        submissions: {
          where: { studentId },
          select: {
            id: true, status: true, mcqScore: true, mcqMaxScore: true,
            writtenScore: true, writtenMaxScore: true,
            totalScore: true, totalMaxScore: true,
            percentage: true, grade: true,
            submittedAt: true, isLate: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const enriched = await Promise.all(assignments.map(async (a) => {
      const urls = await Promise.all((a.attachmentKeys || []).map(signedUrl));
      return {
        ...a,
        attachmentSignedUrls: urls,
        submission:    a.submissions?.[0] || null,
        submissions:   undefined,
      };
    }));

    return ok(res, { data: enriched });
  } catch (e) {
    console.error("[getStudentAssignments]", e);
    return err(res, e.message, 500);
  }
}

export async function getSingleAssignmentForStudent(req, res) {
  try {
    const studentId = req.user?.id;
    const { id } = req.params;

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        status: "PUBLISHED",
        isArchived: false,
      },
      include: {
        subject: true,
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    return res.json({
      success: true,
      data: { assignment },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
}