// src/voiceAnnouncements/voice.controller.js

import { prisma } from "../config/db.js";
import { uploadVoiceToR2 } from "./utils/uploadVoiceToR2.js";
import {
  createAnnouncementWithTargets,
  listAnnouncementsForAdmin,
  listAnnouncementsForParent,
  recordListen,
  ServiceError,
} from "./voice.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared error responder
// ─────────────────────────────────────────────────────────────────────────────
const sendError = (res, error, fallbackMessage) => {
  console.error(error);
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: error.message || fallbackMessage });
};

// ─────────────────────────────────────────────────────────────────────────────
// resolveActorId — extracts the authenticated actor's ID regardless of whether
// the JWT was issued for a User, SuperAdmin, or Admin.
//
// Different middlewares in this codebase attach the decoded token to different
// keys depending on the role:
//   - Regular users (ADMIN, TEACHER, etc.)  → req.user
//   - Super admins                           → req.superAdmin  (or req.user with role check)
//   - Some setups also use req.admin
//
// We try all three and return the first truthy id. The controller then passes
// this id to the service as `createdById` — which is now nullable in the
// schema, so even if it doesn't match a users row it won't cause a FK error
// when the schema migration makes the column nullable.
//
// For the full dual-FK approach (separate createdBySuperAdminId column) see
// the previous discussion — that gives richer audit trails but requires a
// migration. This approach is the minimal fix.
// ─────────────────────────────────────────────────────────────────────────────
const resolveActorId = (req) =>
  req.user?.id || req.superAdmin?.id || req.admin?.id || null;

// ─────────────────────────────────────────────────────────────────────────────
// resolveCreatedById — checks whether the actor ID belongs to a User row.
// If it does, returns it (safe to use as createdById FK).
// If it doesn't (SuperAdmin), returns null so the nullable FK doesn't crash.
//
// This is what stopped the P2003 FK violation: a SuperAdmin id is not in the
// `users` table, so we must pass null for the User FK column.
// ─────────────────────────────────────────────────────────────────────────────
const resolveCreatedById = async (actorId) => {
  if (!actorId) return null;
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true },
  });
  return user ? actorId : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/voice/upload
// multipart/form-data, field name: "audio"
// ─────────────────────────────────────────────────────────────────────────────
export const uploadVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "audio file is required (field name: 'audio')" });
    }

    const { schoolId } = req.body;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found" });
    }

    const { audioUrl, audioKey } = await uploadVoiceToR2(req.file.buffer, req.file.mimetype, schoolId);

    return res.status(201).json({ success: true, message: "Audio uploaded", data: { audioUrl, audioKey } });
  } catch (error) {
    return sendError(res, error, "Failed to upload audio");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/voice/announcement
// ─────────────────────────────────────────────────────────────────────────────
export const createAnnouncement = async (req, res) => {
  try {
    const {
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
    } = req.body;

    // Resolve actor from whichever key the auth middleware populated.
    const actorId = resolveActorId(req);
    if (!actorId) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    // Resolve whether this actor maps to a users row (FK-safe) or is a
    // SuperAdmin (must pass null to avoid the P2003 FK violation).
    const createdById = await resolveCreatedById(actorId);

    const announcement = await createAnnouncementWithTargets({
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
      createdById, // null-safe — schema column is now nullable
    });

    return res.status(201).json({ success: true, message: "Announcement created", data: announcement });
  } catch (error) {
    return sendError(res, error, "Failed to create announcement");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/voice/announcements?schoolId=&page=&limit=
// Admin list — includes targets + listens
// ─────────────────────────────────────────────────────────────────────────────
export const getAnnouncements = async (req, res) => {
  try {
    const { schoolId, page = "1", limit = "20" } = req.query;

    const result = await listAnnouncementsForAdmin({ schoolId, page, limit });

    return res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return sendError(res, error, "Failed to fetch announcements");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/voice/parent/announcements
// Parent portal — only announcements currently visible to the logged-in parent
// ─────────────────────────────────────────────────────────────────────────────
export const getParentAnnouncements = async (req, res) => {
  try {
    const parentId = req.user?.id || req.parent?.id;
    if (!parentId) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const data = await listAnnouncementsForParent(parentId);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error, "Failed to fetch announcements");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/voice/:announcementId/listen
// ─────────────────────────────────────────────────────────────────────────────
export const markAsListened = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const parentId = req.user?.id || req.parent?.id;
    if (!parentId) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const listen = await recordListen({ announcementId, parentId });

    return res.status(200).json({ success: true, message: "Listen recorded", data: listen });
  } catch (error) {
    return sendError(res, error, "Failed to record listen");
  }
};