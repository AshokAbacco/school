// server/src/parent/controllers/certificatesController.js
// ═══════════════════════════════════════════════════════════════
//  Parent — Certificates Controller
//  Returns identical JSON shape to student certificates controller
//  so all UI components work without modification.
// ═══════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";

async function verifyParentOwnsStudent(parentId, studentId) {
  const link = await prisma.studentParent.findFirst({
    where: { parentId, studentId },
  });
  return !!link;
}

export const getCertificates = async (req, res) => {
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

    // ── Student info ──────────────────────────────────────────
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { personalInfo: true },
    });
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        academicYear: true,
        classSection: { include: { school: true } },
      },
    });

    // ── Certificates ──────────────────────────────────────────
    const rawCerts = await prisma.certificate.findMany({
      where: { studentId },
      include: {
        event:        { select: { name: true } },
        result:       { select: { resultType: true, position: true, awardTitle: true } },
        studentAward: {
          include: {
            award: { select: { name: true, category: true, description: true } },
          },
        },
      },
      orderBy: { issuedDate: "desc" },
    });

    const certificates = rawCerts.map(c => {
      // Determine source
      let source   = "CALCULATED";
      let category = "SPECIAL";
      let title    = c.achievementText ?? "Certificate";
      let description = null;
      let eventName   = c.eventName ?? null;
      let resultType  = null;

      if (c.studentAward) {
        source      = "MANUAL";
        category    = c.studentAward.award.category;
        title       = c.studentAward.award.name;
        description = c.studentAward.award.description;
      } else if (c.result) {
        source     = "EVENT";
        resultType = c.result.resultType;
        title      = c.result.awardTitle ?? c.achievementText ?? "Activity Award";
        eventName  = c.eventName ?? c.event?.name ?? null;
        // Try to derive category from event type — default SPORTS
        category   = "SPORTS";
      } else {
        source = "CALCULATED";
        title  = c.achievementText ?? "Achievement";
      }

      return {
        id:          c.id,
        title,
        description,
        eventName,
        source,
        category,
        resultType,
        issuedDate:  c.issuedDate,
        academicYear: c.academicYear,
        studentName:  c.studentName,
        status:       c.status,
      };
    });

    // ── Stats ─────────────────────────────────────────────────
    const stats = {
      total:      certificates.length,
      manual:     certificates.filter(c => c.source === "MANUAL").length,
      event:      certificates.filter(c => c.source === "EVENT").length,
      calculated: certificates.filter(c => c.source === "CALCULATED").length,
    };

    // ── School info ───────────────────────────────────────────
    const school = enrollment?.classSection?.school
      ? {
          name:    enrollment.classSection.school.name,
       logoUrl: enrollment.classSection.school.logoUrl ?? null,
        }
      : {};

    return res.json({
      success: true,
      data: {
        student: {
          id:           studentId,
          firstName:    student.personalInfo?.firstName ?? student.name.split(" ")[0],
          lastName:     student.personalInfo?.lastName  ?? "",
          profileImage: student.personalInfo?.profileImage ?? null,
          classSection: enrollment?.classSection?.name ?? null,
          academicYear: enrollment?.academicYear?.name ?? null,
        },
        school,
        stats,
        certificates,
      },
    });
  } catch (err) {
    console.error("[parent/getCertificates]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};