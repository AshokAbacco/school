// server/src/studentControlls/studentCertificateController.js

import { prisma } from "../../config/db.js";
import { getCachedSignedUrl } from "../../lib/urlCache.js";
import cacheService from "../../utils/cacheService.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

// ═══════════════════════════════════════════════════════════════
//  LIST — GET /api/student/certificates
// ═══════════════════════════════════════════════════════════════

export async function listStudentCertificates(req, res) {
  try {
    const studentId = req.user?.id;
    const schoolId  = req.user?.schoolId;

    if (!studentId) return err(res, "Unauthorized.", 401);

    // ── cache ──────────────────────────────────────────────────
    const cacheKey = await cacheService.buildKey(
      schoolId,
      `student:certificates:${schoolId}:${studentId}`
    );
    const cached = await cacheService.get(cacheKey);

    let certificates;

    if (cached) {
      certificates = typeof cached === "string" ? JSON.parse(cached) : cached;
    } else {
      // ── db fetch ───────────────────────────────────────────
      certificates = await prisma.certificate.findMany({
        where:   { studentId },
        orderBy: { createdAt: "desc" },
        select: {
          id:              true,
          studentName:     true,
          title:           true,
          category:        true,
          achievementText: true,
          academicYear:    true,
          issuedDate:      true,
          fileKey:         true,
          fileType:        true,
          description:     true,
          status:          true,
          source:          true,
          createdAt:       true,
          eventName:       true,
          event: { select: { id: true, name: true } },
        },
      });

      await cacheService.set(cacheKey, certificates);
    }
    // ──────────────────────────────────────────────────────────

    // signed URLs always generated fresh — never cached
    const normalized = await Promise.all(
      certificates.map(async (c) => {
        let fileUrl = null;

        if (c.fileKey) {
          try {
            fileUrl = await getCachedSignedUrl(schoolId, c.fileKey, 3600);
          } catch (e) {
            console.error("Signed URL error:", e);
          }
        }

        return {
          ...c,
          fileUrl,
          title: c.title ?? c.achievementText ?? c.eventName ?? "Certificate",
        };
      })
    );

    return ok(res, { data: normalized });
  } catch (e) {
    console.error("[studentCertificate.listStudentCertificates]", e);
    return err(res, e.message, 500);
  }
}