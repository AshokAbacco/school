// server/src/studentControlls/studentCertificateController.js
//
// GET /api/student/certificates
// Returns all certificates (both UPLOADED and GENERATED) for the logged-in student

import { prisma } from "../../config/db.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

// ═══════════════════════════════════════════════════════════════
//  LIST — GET /api/student/certificates
//  Returns all certificates for the authenticated student
// ═══════════════════════════════════════════════════════════════

export async function listStudentCertificates(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorized.", 401);

    const certificates = await prisma.certificate.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      select: {
        id:              true,
        studentName:     true,
        title:           true,
        category:        true,
        achievementText: true,
        academicYear:    true,
        issuedDate:      true,
        fileUrl:         true,
        fileType:        true,
        description:     true,
        status:          true,
        source:          true,
        createdAt:       true,
        eventName:       true,
        event: {
          select: { id: true, name: true },
        },
      },
    });

    // Normalize: if title is missing, fall back to achievementText or eventName
    const normalized = certificates.map(c => ({
      ...c,
      title: c.title ?? c.achievementText ?? c.eventName ?? "Certificate",
    }));

    return ok(res, { data: normalized });
  } catch (e) {
    console.error("[studentCertificate.listStudentCertificates]", e);
    return err(res, e.message, 500);
  }
}