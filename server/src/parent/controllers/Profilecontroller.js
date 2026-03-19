// server/src/parent/controllers/profileController.js
// ═══════════════════════════════════════════════════════════════
//  Parent — Profile Controller
//  Returns identical JSON shape to student /profile/me so all
//  student sub-components (PersonalInfo, AcademicInfo, etc.)
//  work without any modification.
// ═══════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";

async function verifyParentOwnsStudent(parentId, studentId) {
  const link = await prisma.studentParent.findFirst({
    where: { parentId, studentId },
  });
  return !!link;
}

// ── GET /api/parent/profile?studentId= ───────────────────────
export const getProfile = async (req, res) => {
  try {
    const parentId  = req.user?.id;
    const studentId = req.query.studentId;

    if (!parentId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!studentId)
      return res.status(400).json({ success: false, message: "studentId is required" });

    const owns = await verifyParentOwnsStudent(parentId, studentId);
    if (!owns)
      return res.status(403).json({ success: false, message: "Access denied" });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        personalInfo: true,
        enrollments: {
          include: {
            academicYear:  true,
            classSection: {
              include: {
                stream:      true,
                course:      true,
                branch:      true,
                combination: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        parentLinks: {
          include: {
            parent: {
              select: {
                id: true, name: true, email: true,
                phone: true, occupation: true, profileImage: true,
              },
            },
          },
        },
      },
    });

    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    return res.json({ success: true, student });
  } catch (err) {
    console.error("[parent/getProfile]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/parent/profile/documents?studentId= ─────────────
export const getDocuments = async (req, res) => {
  try {
    const parentId  = req.user?.id;
    const studentId = req.query.studentId;

    if (!parentId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!studentId)
      return res.status(400).json({ success: false, message: "studentId is required" });

    const owns = await verifyParentOwnsStudent(parentId, studentId);
    if (!owns)
      return res.status(403).json({ success: false, message: "Access denied" });

    const rawDocs = await prisma.studentDocumentInfo.findMany({
      where: { studentId },
      orderBy: { uploadedAt: "desc" },
    });

    // Generate presigned/signed URLs if your storage layer supports it.
    // For now, expose fileUrl directly (replace this with your signed URL logic).
    const documents = rawDocs.map(d => ({
      id:           d.id,
      documentName: d.documentName,
      customLabel:  d.customLabel,
      fileType:     d.fileType,
      fileSizeBytes: d.fileSizeBytes,
      isVerified:   d.isVerified,
      verifiedAt:   d.verifiedAt,
      uploadedAt:   d.uploadedAt,
      url:          d.fileUrl ?? null,  // swap for your signed URL generator
    }));

    return res.json({ success: true, documents });
  } catch (err) {
    console.error("[parent/getDocuments]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};