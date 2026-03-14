// server/src/student/controllers/profile.controller.js

import { prisma } from "../../config/db.js";
import { generateSignedUrl } from "../../lib/r2.js";
import cacheService from "../../utils/cacheService.js";

const PROFILE_IMAGE_EXPIRY = 86400; // 24h
const DOCUMENT_EXPIRY = 3600; // 1h

/* -------------------------------------------------------------------------- */
/* GET /profile/me                                                            */
/* -------------------------------------------------------------------------- */

export async function getMyProfile(req, res) {
  try {
    const studentId = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role = req.user?.role;

    if (!studentId || !schoolId || role !== "STUDENT") {
      return res.status(401).json({
        success: false,
        message: "Unauthorised",
      });
    }

    const baseKey = `student:profile:${schoolId}:${studentId}`;
    const cacheKey = await cacheService.buildKey(schoolId, baseKey);

    let student;
    let fromCache = false;

    /* ------------------------------------------------------------------ */
    /* CACHE CHECK                                                         */
    /* ------------------------------------------------------------------ */

    const cached = await cacheService.get(cacheKey);

    if (cached) {
      student = typeof cached === "string" ? JSON.parse(cached) : cached;
      fromCache = true;
    } else {
      /* ---------------------------------------------------------------- */
      /* DATABASE FETCH                                                   */
      /* ---------------------------------------------------------------- */

      student = await prisma.student.findUnique({
        where: {
          id: studentId,
          schoolId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,

          personalInfo: true,

          enrollments: {
            include: {
              classSection: {
                include: {
                  stream: { select: { id: true, name: true } },
                  combination: { select: { id: true, name: true } },
                  course: { select: { id: true, name: true } },
                  branch: { select: { id: true, name: true } },
                },
              },
              academicYear: {
                select: { id: true, name: true, isActive: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },

          parentLinks: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  occupation: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      await cacheService.set(cacheKey, student);
    }

    /* ------------------------------------------------------------------ */
    /* CLONE OBJECT BEFORE MODIFYING                                      */
    /* ------------------------------------------------------------------ */

    const result = structuredClone(student);

    if (!result.personalInfo) {
      result.personalInfo = {};
    }

    result.personalInfo.profileImageUrl = null;

    /* ------------------------------------------------------------------ */
    /* SIGNED PROFILE IMAGE URL                                           */
    /* ------------------------------------------------------------------ */

    if (result.personalInfo.profileImage) {
      try {
        result.personalInfo.profileImageUrl = await generateSignedUrl(
          result.personalInfo.profileImage,
          PROFILE_IMAGE_EXPIRY
        );
      } catch (err) {
        console.warn(
          "[profile] Failed to generate signed image URL:",
          err.message
        );
      }
    }

    return res.json({
      success: true,
      student: result,
      fromCache,
    });

  } catch (error) {
    console.error("[getMyProfile]", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* GET /profile/documents                                                     */
/* -------------------------------------------------------------------------- */

export async function getMyDocuments(req, res) {
  try {
    const studentId = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role = req.user?.role;

    if (!studentId || !schoolId || role !== "STUDENT") {
      return res.status(401).json({
        success: false,
        message: "Unauthorised",
      });
    }

    const docs = await prisma.studentDocumentInfo.findMany({
      where: { studentId },
      orderBy: { uploadedAt: "desc" },
    });

    const documents = await Promise.all(
      docs.map(async (doc) => {
        let url = null;

        try {
          url = await generateSignedUrl(doc.fileKey, DOCUMENT_EXPIRY);
        } catch (err) {
          console.warn("Signed URL failed:", err.message);
        }

        return {
          id: doc.id,
          documentName: doc.documentName,
          customLabel: doc.customLabel,
          fileType: doc.fileType,
          fileSizeBytes: doc.fileSizeBytes,
          isVerified: doc.isVerified,
          verifiedAt: doc.verifiedAt,
          uploadedAt: doc.uploadedAt,
          url,
        };
      })
    );

    return res.json({
      success: true,
      documents,
    });

  } catch (error) {
    console.error("[getMyDocuments]", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}