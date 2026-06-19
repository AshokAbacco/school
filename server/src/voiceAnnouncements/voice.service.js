// src/voiceAnnouncements/voice.service.js

import { prisma } from "../config/db.js";
import { deleteVoiceFromR2 } from "./utils/deleteVoiceFromR2.js";

const VALID_TARGET_TYPES = ["SCHOOL", "CLASS", "STUDENT"];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: resolve the recipient parent IDs for a given target configuration.
// ─────────────────────────────────────────────────────────────────────────────
const resolveRecipientParentIds = async ({ schoolId, targetType, classSectionIds, studentIds }) => {
  if (targetType === "SCHOOL") {
    const parents = await prisma.parent.findMany({
      where: { schoolId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    return parents.map((p) => p.id);
  }

  if (targetType === "CLASS") {
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        classSectionId: { in: classSectionIds },
        status: "ACTIVE",
        ...(activeYear && { academicYearId: activeYear.id }),
      },
      select: { studentId: true },
    });

    const studentIdsInClasses = [...new Set(enrollments.map((e) => e.studentId))];
    if (studentIdsInClasses.length === 0) return [];

    const links = await prisma.studentParent.findMany({
      where: { studentId: { in: studentIdsInClasses } },
      select: { parentId: true },
    });
    return [...new Set(links.map((l) => l.parentId))];
  }

  if (targetType === "STUDENT") {
    if (!studentIds || studentIds.length === 0) return [];
    const links = await prisma.studentParent.findMany({
      where: { studentId: { in: studentIds } },
      select: { parentId: true },
    });
    return [...new Set(links.map((l) => l.parentId))];
  }

  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ANNOUNCEMENT (+ targets) in a single transaction.
//
// createdById is now NULLABLE — it will be null when the creator is a
// SuperAdmin (whose id lives in super_admins, not users). The schema column
// must also be nullable; run the migration before deploying this service:
//
//   npx prisma migrate dev --name voice_createdby_nullable
//
// ─────────────────────────────────────────────────────────────────────────────
export const createAnnouncementWithTargets = async ({
  schoolId,
  title,
  description,
  audioUrl,
  audioKey,
  durationSec,
  publishAt,
  expireAt,
  targetType,
  classSectionIds,
  studentIds,
  createdById, // string | null — null when actor is a SuperAdmin
}) => {
  if (!schoolId) throw new ServiceError(400, "schoolId is required");
  if (!audioUrl || !audioKey) throw new ServiceError(400, "audioUrl and audioKey are required");
  if (!publishAt || !expireAt) throw new ServiceError(400, "publishAt and expireAt are required");
  // NOTE: createdById is intentionally NOT required here — SuperAdmins produce
  // a null value because their id is not in the users table. The column is
  // nullable in the schema so this is safe.
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    throw new ServiceError(400, `targetType must be one of ${VALID_TARGET_TYPES.join(", ")}`);
  }

  const publishDate = new Date(publishAt);
  const expireDate = new Date(expireAt);
  if (Number.isNaN(publishDate.getTime()) || Number.isNaN(expireDate.getTime())) {
    throw new ServiceError(400, "publishAt / expireAt must be valid dates");
  }
  if (expireDate <= publishDate) {
    throw new ServiceError(400, "expireAt must be after publishAt");
  }

  let normalizedClassSectionIds = [];
  let normalizedStudentIds = [];

  if (targetType === "CLASS") {
    normalizedClassSectionIds = Array.isArray(classSectionIds) ? [...new Set(classSectionIds)] : [];
    if (normalizedClassSectionIds.length === 0) {
      throw new ServiceError(400, "classSectionIds must be a non-empty array for targetType CLASS");
    }
    const validSections = await prisma.classSection.count({
      where: { id: { in: normalizedClassSectionIds }, schoolId, deletedAt: null },
    });
    if (validSections !== normalizedClassSectionIds.length) {
      throw new ServiceError(400, "One or more classSectionIds do not belong to this school");
    }
  }

  if (targetType === "STUDENT") {
    normalizedStudentIds = Array.isArray(studentIds) ? [...new Set(studentIds)] : [];
    if (normalizedStudentIds.length === 0) {
      throw new ServiceError(400, "studentIds must be a non-empty array for targetType STUDENT");
    }
    const validStudents = await prisma.student.count({
      where: { id: { in: normalizedStudentIds }, schoolId, deletedAt: null },
    });
    if (validStudents !== normalizedStudentIds.length) {
      throw new ServiceError(400, "One or more studentIds do not belong to this school");
    }
  }

  const recipientParentIds = await resolveRecipientParentIds({
    schoolId,
    targetType,
    classSectionIds: normalizedClassSectionIds,
    studentIds: normalizedStudentIds,
  });

  const announcement = await prisma.$transaction(async (tx) => {
    const created = await tx.voiceAnnouncement.create({
      data: {
        schoolId,
        title: title || null,
        description: description || null,
        audioUrl,
        audioKey,
        durationSec: durationSec != null ? Number(durationSec) : null,
        publishAt: publishDate,
        expireAt: expireDate,
        totalRecipients: recipientParentIds.length,
        // null is valid — SuperAdmin creators don't have a users row
        createdById: createdById || null,
        isActive: true,
      },
    });

    if (targetType === "SCHOOL") {
      await tx.voiceAnnouncementTarget.create({
        data: { announcementId: created.id, targetType: "SCHOOL" },
      });
    } else if (targetType === "CLASS") {
      await tx.voiceAnnouncementTarget.createMany({
        data: normalizedClassSectionIds.map((classSectionId) => ({
          announcementId: created.id,
          targetType: "CLASS",
          classSectionId,
        })),
      });
    } else if (targetType === "STUDENT") {
      await tx.voiceAnnouncementTarget.createMany({
        data: normalizedStudentIds.map((studentId) => ({
          announcementId: created.id,
          targetType: "STUDENT",
          studentId,
        })),
      });
    }

    return created;
  });

  return prisma.voiceAnnouncement.findUnique({
    where: { id: announcement.id },
    include: { targets: true, listens: true },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN LIST — includes targets + listens, paginated
// ─────────────────────────────────────────────────────────────────────────────
export const listAnnouncementsForAdmin = async ({ schoolId, page = 1, limit = 20 }) => {
  if (!schoolId) throw new ServiceError(400, "schoolId is required");

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.max(parseInt(limit) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const where = { schoolId };

  const [total, announcements] = await Promise.all([
    prisma.voiceAnnouncement.count({ where }),
    prisma.voiceAnnouncement.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        targets: {
          include: {
            classSection: { select: { id: true, name: true, grade: true, section: true } },
            student: { select: { id: true, name: true, studentCode: true } },
          },
        },
        listens: {
          select: { id: true, parentId: true, listenCount: true, firstListenedAt: true, lastListenedAt: true },
        },
        // createdBy may be null (SuperAdmin creator) — always use optional chaining on the client
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  const data = announcements.map((a) => ({
    ...a,
    uniqueListeners: a.listens.length,
    totalListens: a.listens.reduce((sum, l) => sum + l.listenCount, 0),
  }));

  return {
    data,
    meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PARENT LIST — only currently-visible announcements for this parent
// ─────────────────────────────────────────────────────────────────────────────
export const listAnnouncementsForParent = async (parentId) => {
  if (!parentId) throw new ServiceError(400, "parentId is required");

  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { id: true, schoolId: true, isActive: true, deletedAt: true },
  });

  if (!parent || !parent.isActive || parent.deletedAt) {
    throw new ServiceError(404, "Parent not found or inactive");
  }

  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId: parent.schoolId, isActive: true },
    select: { id: true },
  });

  const studentLinks = await prisma.studentParent.findMany({
    where: { parentId },
    select: {
      student: {
        select: {
          id: true,
          enrollments: {
            where: { status: "ACTIVE", ...(activeYear && { academicYearId: activeYear.id }) },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { classSectionId: true },
          },
        },
      },
    },
  });

  const studentIds = studentLinks.map((l) => l.student.id);
  const classSectionIds = [
    ...new Set(
      studentLinks
        .map((l) => l.student.enrollments?.[0]?.classSectionId)
        .filter(Boolean)
    ),
  ];

  const now = new Date();

  const announcements = await prisma.voiceAnnouncement.findMany({
    where: {
      schoolId: parent.schoolId,
      isActive: true,
      publishAt: { lte: now },
      expireAt: { gte: now },
      targets: {
        some: {
          OR: [
            { targetType: "SCHOOL" },
            ...(classSectionIds.length
              ? [{ targetType: "CLASS", classSectionId: { in: classSectionIds } }]
              : []),
            ...(studentIds.length ? [{ targetType: "STUDENT", studentId: { in: studentIds } }] : []),
          ],
        },
      },
    },
    orderBy: { publishAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      audioUrl: true,
      durationSec: true,
      publishAt: true,
      expireAt: true,
      createdAt: true,
      listens: {
        where: { parentId },
        select: { listenCount: true, firstListenedAt: true, lastListenedAt: true },
      },
    },
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    audioUrl: a.audioUrl,
    durationSec: a.durationSec,
    publishAt: a.publishAt,
    expireAt: a.expireAt,
    createdAt: a.createdAt,
    hasListened: a.listens.length > 0,
    listenCount: a.listens[0]?.listenCount || 0,
    firstListenedAt: a.listens[0]?.firstListenedAt || null,
    lastListenedAt: a.listens[0]?.lastListenedAt || null,
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// MARK AS LISTENED
// ─────────────────────────────────────────────────────────────────────────────
export const recordListen = async ({ announcementId, parentId }) => {
  if (!announcementId || !parentId) {
    throw new ServiceError(400, "announcementId and parentId are required");
  }

  const announcement = await prisma.voiceAnnouncement.findUnique({
    where: { id: announcementId },
    select: { id: true, schoolId: true },
  });
  if (!announcement) throw new ServiceError(404, "Announcement not found");

  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { id: true, schoolId: true },
  });
  if (!parent) throw new ServiceError(404, "Parent not found");
  if (parent.schoolId !== announcement.schoolId) {
    throw new ServiceError(403, "Parent does not belong to this announcement's school");
  }

  const now = new Date();

  const existing = await prisma.voiceAnnouncementListen.findUnique({
    where: { announcementId_parentId: { announcementId, parentId } },
  });

  if (existing) {
    return prisma.voiceAnnouncementListen.update({
      where: { id: existing.id },
      data: {
        listenCount: { increment: 1 },
        lastListenedAt: now,
      },
    });
  }

  return prisma.voiceAnnouncementListen.create({
    data: {
      announcementId,
      parentId,
      listenCount: 1,
      firstListenedAt: now,
      lastListenedAt: now,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP — find announcements expired > graceDays ago, delete R2 + DB records
// ─────────────────────────────────────────────────────────────────────────────
export const cleanupExpiredAnnouncements = async (graceDays = 7) => {
  const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);

  const expired = await prisma.voiceAnnouncement.findMany({
    where: { expireAt: { lt: cutoff } },
    select: { id: true, audioKey: true, title: true },
  });

  let deleted = 0;
  let failed = 0;

  for (const announcement of expired) {
    try {
      await deleteVoiceFromR2(announcement.audioKey);

      await prisma.$transaction(async (tx) => {
        await tx.voiceAnnouncementListen.deleteMany({ where: { announcementId: announcement.id } });
        await tx.voiceAnnouncementTarget.deleteMany({ where: { announcementId: announcement.id } });
        await tx.voiceAnnouncement.delete({ where: { id: announcement.id } });
      });

      deleted++;
    } catch (error) {
      failed++;
      console.error(
        `[cleanupExpiredAnnouncements] Failed to clean up announcement ${announcement.id} ("${announcement.title || "untitled"}"):`,
        error.message
      );
    }
  }

  return { totalFound: expired.length, deleted, failed };
};

// ─────────────────────────────────────────────────────────────────────────────
// Typed error for controller → HTTP status mapping
// ─────────────────────────────────────────────────────────────────────────────
export class ServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}