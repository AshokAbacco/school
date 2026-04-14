// server/src/staffControlls/meetingController.js
import { prisma } from "../config/db.js";
import cacheService from "../utils/cacheService.js";
/* ─── helpers ─────────────────────────────────────────────────── */
const schoolId = (req) => req.user.schoolId;
const userId = (req) => req.user.id;

/* ═══════════════════════════════════════════════════════════════
   HELPER — buildParticipants
   ─────────────────────────────────────────────────────────────
   Converts frontend perSectionCoordinators + participantUserIds
   into MeetingParticipant create rows.

   KEY TRICK (no schema migration needed):
   We store each coordinator's section IDs in the `name` field
   using the tag:  "__coord_sections:sectionId1,sectionId2"
   MeetingViewModal parses this tag to match each coordinator
   to their correct class card.

   perSectionCoordinators: [{ userId, classSectionId }]
     → groups by userId → one DB row per unique coordinator
     → all their section IDs joined in the name tag

   participantUserIds: string[]   (regular attendees)
   externalParticipants: { name?, email }[]
   coordinatorUserId: string      (legacy single-coord fallback)
═══════════════════════════════════════════════════════════════ */
function buildParticipants({
  perSectionCoordinators = [],
  coordinatorUserId,
  participantUserIds = [],
  externalParticipants = [],
}) {
  const rows = [];

  // ── 1. Coordinators ──────────────────────────────────────────
  const coordMap = new Map(); // userId → Set<classSectionId>

  if (perSectionCoordinators.length > 0) {
    for (const { userId: uid, classSectionId } of perSectionCoordinators) {
      if (!uid) continue;
      if (!coordMap.has(uid)) coordMap.set(uid, new Set());
      if (classSectionId) coordMap.get(uid).add(classSectionId);
    }
  } else if (coordinatorUserId) {
    // Legacy: single coordinator with no section breakdown
    coordMap.set(coordinatorUserId, new Set());
  }

  for (const [uid, sectionIds] of coordMap) {
    const sectionArr = [...sectionIds];
    rows.push({
      type: "USER",
      userId: uid,
      isCoordinator: true,
      // Encode section IDs in name field — frontend reads this to
      // match coordinator → class card in MeetingViewModal
      name:
        sectionArr.length > 0
          ? `__coord_sections:${sectionArr.join(",")}`
          : null,
    });
  }

  // ── 2. Regular attendees ─────────────────────────────────────
  const coordUserIds = new Set(coordMap.keys());
  for (const uid of participantUserIds) {
    if (!uid || coordUserIds.has(uid)) continue; // skip if already coordinator
    rows.push({ type: "USER", userId: uid, isCoordinator: false });
  }

  // ── 3. External participants ─────────────────────────────────
  for (const ep of externalParticipants) {
    if (!ep.email) continue;
    rows.push({ type: "EXTERNAL", name: ep.name ?? null, email: ep.email });
  }

  return rows;
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/meetings/class-sections/:classSectionId/teachers
═══════════════════════════════════════════════════════════════ */
export const getTeachersByClassSection = async (req, res) => {
  try {
    const { classSectionId } = req.params;
    const { academicYearId } = req.query;

    const where = {
      classSectionId,
      classSection: { schoolId: schoolId(req) },
      ...(academicYearId ? { academicYearId } : {}),
    };

    const assignments = await prisma.teacherAssignment.findMany({
      where,
      include: {
        teacher: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    // Deduplicate by teacherId
    const seen = new Set();
    const teachers = [];
    for (const a of assignments) {
      if (!seen.has(a.teacherId)) {
        seen.add(a.teacherId);
        teachers.push({
          teacherId: a.teacher.id,
          userId: a.teacher.user?.id,
          name: `${a.teacher.firstName} ${a.teacher.lastName}`,
          email: a.teacher.user?.email,
          subjects: assignments
            .filter((x) => x.teacherId === a.teacherId)
            .map((x) => x.subject.name),
        });
      }
    }

    return res.json({ teachers });
  } catch (err) {
    console.error("getTeachersByClassSection:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/meetings/stats
═══════════════════════════════════════════════════════════════ */
export const getMeetingStats = async (req, res) => {
  try {
    const { academicYearId } = req.query;
    const sid = schoolId(req);
    const key = await cacheService.buildKey(
      sid,
      `meetings:stats:${academicYearId ?? "all"}`,
    );

    const cached = await cacheService.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const where = {
      schoolId: sid,
      ...(academicYearId ? { academicYearId } : {}),
    };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, scheduled, completed, cancelled, thisMonth, participantAgg] =
      await Promise.all([
        prisma.meeting.count({ where }),
        prisma.meeting.count({ where: { ...where, status: "SCHEDULED" } }),
        prisma.meeting.count({ where: { ...where, status: "COMPLETED" } }),
        prisma.meeting.count({ where: { ...where, status: "CANCELLED" } }),
        prisma.meeting.count({
          where: { ...where, meetingDate: { gte: startOfMonth } },
        }),
        prisma.meetingParticipant.count({ where: { meeting: where } }),
      ]);

    const responseData = {
      data: {
        total,
        scheduled,
        completed,
        cancelled,
        thisMonth,
        totalParticipants: participantAgg,
      },
    };

    // ✅ FIX 1: stringify before storing so JSON.parse on cache read works correctly
    await cacheService.set(key, JSON.stringify(responseData));

    return res.json(responseData);
  } catch (err) {
    console.error("getMeetingStats:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/meetings
═══════════════════════════════════════════════════════════════ */
export const getMeetings = async (req, res) => {
  try {
    const {
      search,
      type,
      status,
      academicYearId,
      page = 1,
      limit = 15,
    } = req.query;

    const sid = schoolId(req);

    const key = await cacheService.buildKey(
      sid,
      `meetings:list:${academicYearId ?? "all"}:${type ?? "all"}:${status ?? "all"}:${search ?? "none"}:${page}:${limit}`,
    );

    const cached = await cacheService.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      schoolId: sid,
      ...(academicYearId ? { academicYearId } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        orderBy: { meetingDate: "desc" },
        skip,
        take: Number(limit),
        include: {
          organizer: { select: { id: true, name: true } },
          classes: {
            include: { classSection: { select: { id: true, name: true } } },
          },
          _count: { select: { participants: true, students: true } },
        },
      }),
      prisma.meeting.count({ where }),
    ]);

    const responseData = { meetings, total };

    // ✅ FIX 1: stringify before storing so JSON.parse on cache read works correctly
    await cacheService.set(key, JSON.stringify(responseData));

    return res.json(responseData);
  } catch (err) {
    console.error("getMeetings:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/meetings/:id
═══════════════════════════════════════════════════════════════ */
export const getMeetingById = async (req, res) => {
  try {
    const sid = schoolId(req);
    const { id } = req.params;

    const key = await cacheService.buildKey(sid, `meetings:single:${id}`);

    const cached = await cacheService.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id, schoolId: sid },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        academicYear: { select: { id: true, name: true } },
        classes: {
          include: {
            classSection: {
              select: { id: true, name: true, grade: true, section: true },
            },
          },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            parent: { select: { id: true, name: true, email: true } },
          },
        },
        students: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const responseData = { data: meeting };

    // ✅ FIX 1: stringify before storing so JSON.parse on cache read works correctly
    await cacheService.set(key, JSON.stringify(responseData));

    return res.json(responseData);
  } catch (err) {
    console.error("getMeetingById:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
/* ═══════════════════════════════════════════════════════════════
   POST /api/meetings
═══════════════════════════════════════════════════════════════ */
export const createMeeting = async (req, res) => {
  try {
    const sid = schoolId(req);
    const {
      title,
      description,
      type,
      status = "SCHEDULED",
      meetingDate,
      startTime,
      endTime,
      venueType,
      venueDetail,
      meetingLink,
      academicYearId,
      classSectionIds = [],
      coordinatorUserId, // legacy single-coord
      participantUserIds = [],
      perSectionCoordinators = [], // ← NEW: [{ userId, classSectionId }]
      externalParticipants = [],
      autoInviteParents = false,
      studentIds = [],
    } = req.body;

    if (!title || !meetingDate || !startTime || !endTime) {
      return res.status(400).json({
        message: "title, meetingDate, startTime, endTime are required",
      });
    }

    const participantsToCreate = buildParticipants({
      perSectionCoordinators,
      coordinatorUserId,
      participantUserIds,
      externalParticipants,
    });

    // Auto-invite parents
    if (autoInviteParents && classSectionIds.length > 0) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          classSectionId: { in: classSectionIds },
          ...(academicYearId ? { academicYearId } : {}),
          status: "ACTIVE",
          student: { schoolId: sid },
        },
        include: {
          student: { include: { parentLinks: { include: { parent: true } } } },
        },
      });
      const seenParentIds = new Set();
      for (const enrollment of enrollments) {
        for (const link of enrollment.student.parentLinks) {
          if (!seenParentIds.has(link.parentId)) {
            seenParentIds.add(link.parentId);
            participantsToCreate.push({
              type: "PARENT",
              parentId: link.parentId,
            });
          }
        }
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description: description ?? null,
        type,
        status,
        meetingDate: new Date(meetingDate),
        startTime,
        endTime,
        venueType: venueType ?? null,
        venueDetail: venueDetail ?? null,
        meetingLink: meetingLink ?? null,
        schoolId: sid,
        organizerId: userId(req),
        ...(academicYearId ? { academicYearId } : {}),
        classes: {
          create: classSectionIds.map((csId) => ({ classSectionId: csId })),
        },
        participants: { create: participantsToCreate },
        students: { create: studentIds.map((sId) => ({ studentId: sId })) },
      },
      include: {
        organizer: { select: { id: true, name: true } },
        classes: {
          include: { classSection: { select: { id: true, name: true } } },
        },
        _count: { select: { participants: true } },
      },
    });

    await cacheService.invalidateSchool(sid);
    return res.status(201).json({ data: meeting });
  } catch (err) {
    console.error("createMeeting:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PUT /api/meetings/:id
═══════════════════════════════════════════════════════════════ */
export const updateMeeting = async (req, res) => {
  try {
    const sid = schoolId(req);
    const { id } = req.params;

    const existing = await prisma.meeting.findFirst({
      where: { id, schoolId: sid },
    });
    if (!existing)
      return res.status(404).json({ message: "Meeting not found" });

    const {
      title,
      description,
      type,
      status,
      meetingDate,
      startTime,
      endTime,
      venueType,
      venueDetail,
      meetingLink,
      academicYearId,
      classSectionIds,
      coordinatorUserId, // legacy
      participantUserIds = [],
      perSectionCoordinators = [], // ← NEW: [{ userId, classSectionId }]
      externalParticipants = [],
    } = req.body;

    const rebuildParticipants =
      classSectionIds !== undefined ||
      participantUserIds.length > 0 ||
      perSectionCoordinators.length > 0 ||
      externalParticipants.length > 0 ||
      coordinatorUserId !== undefined;

    if (rebuildParticipants) {
      await prisma.meetingParticipant.deleteMany({ where: { meetingId: id } });
    }
    if (classSectionIds !== undefined) {
      await prisma.meetingClass.deleteMany({ where: { meetingId: id } });
    }

    const participantsToCreate = rebuildParticipants
      ? buildParticipants({
          perSectionCoordinators,
          coordinatorUserId,
          participantUserIds,
          externalParticipants,
        })
      : [];

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(meetingDate !== undefined
          ? { meetingDate: new Date(meetingDate) }
          : {}),
        ...(startTime !== undefined ? { startTime } : {}),
        ...(endTime !== undefined ? { endTime } : {}),
        ...(venueType !== undefined ? { venueType } : {}),
        ...(venueDetail !== undefined ? { venueDetail } : {}),
        ...(meetingLink !== undefined ? { meetingLink } : {}),
        ...(academicYearId !== undefined
          ? { academicYearId: academicYearId || null }
          : {}),
        ...(classSectionIds !== undefined
          ? {
              classes: {
                create: classSectionIds.map((csId) => ({
                  classSectionId: csId,
                })),
              },
            }
          : {}),
        ...(participantsToCreate.length
          ? { participants: { create: participantsToCreate } }
          : {}),
      },
      include: {
        organizer: { select: { id: true, name: true } },
        classes: {
          include: { classSection: { select: { id: true, name: true } } },
        },
        _count: { select: { participants: true } },
      },
    });

    await cacheService.invalidateSchool(sid);
    return res.json({ data: meeting });
  } catch (err) {
    console.error("updateMeeting:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   DELETE /api/meetings/:id
═══════════════════════════════════════════════════════════════ */
export const deleteMeeting = async (req, res) => {
  try {
    const sid = schoolId(req);

    const existing = await prisma.meeting.findFirst({
      where: { id: req.params.id, schoolId: sid },
    });

    if (!existing) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    await prisma.meeting.delete({
      where: { id: req.params.id },
    });

    // 🔥 Invalidate all meeting-related cache for this school
    await cacheService.invalidateSchool(sid);

    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteMeeting:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
/* ═══════════════════════════════════════════════════════════════
   PATCH /api/meetings/:id/status
═══════════════════════════════════════════════════════════════ */
export const updateMeetingStatus = async (req, res) => {
  try {
    const sid = schoolId(req);
    const { status } = req.body;
    const VALID = ["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"];

    if (!VALID.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const existing = await prisma.meeting.findFirst({
      where: { id: req.params.id, schoolId: sid },
    });

    if (!existing)
      return res.status(404).json({ message: "Meeting not found" });

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: { status },
    });

    await cacheService.invalidateSchool(sid);

    return res.json({ data: meeting });
  } catch (err) {
    console.error("updateMeetingStatus:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/meetings/:id/notes
═══════════════════════════════════════════════════════════════ */
export const updateMeetingNotes = async (req, res) => {
  try {
    const sid = schoolId(req);
    const { notes } = req.body;

    const existing = await prisma.meeting.findFirst({
      where: { id: req.params.id, schoolId: sid },
    });

    if (!existing)
      return res.status(404).json({ message: "Meeting not found" });

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: { notes: notes ?? null },
    });

    await cacheService.invalidateSchool(sid);

    return res.json({ data: meeting });
  } catch (err) {
    console.error("updateMeetingNotes:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
/* ═══════════════════════════════════════════════════════════════
   PATCH /api/meetings/:id/reminder
═══════════════════════════════════════════════════════════════ */
export const sendMeetingReminder = async (req, res) => {
  try {
    const sid = schoolId(req);

    const existing = await prisma.meeting.findFirst({
      where: { id: req.params.id, schoolId: sid },
    });

    if (!existing)
      return res.status(404).json({ message: "Meeting not found" });

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: { reminderSentAt: new Date() },
    });

    // 🔥 Invalidate school-level cache
    await cacheService.invalidateSchool(sid);

    return res.json({ data: meeting });
  } catch (err) {
    console.error("sendMeetingReminder:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/meetings/:id/participants/:participantId/attendance
═══════════════════════════════════════════════════════════════ */
export const markParticipantAttendance = async (req, res) => {
  try {
    const sid = schoolId(req);
    const { id, participantId } = req.params;
    const { attended } = req.body;

    const meeting = await prisma.meeting.findFirst({
      where: { id, schoolId: sid },
    });

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const participant = await prisma.meetingParticipant.update({
      where: { id: participantId },
      data: { attended: Boolean(attended) },
    });

    await cacheService.invalidateSchool(sid);

    return res.json({ data: participant });
  } catch (err) {
    console.error("markParticipantAttendance:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
/* ═══════════════════════════════════════════════════════════════
   PATCH /api/meetings/:id/students/:studentId/attendance
═══════════════════════════════════════════════════════════════ */
export const markStudentAttendance = async (req, res) => {
  try {
    const sid = schoolId(req);
    const { id, studentId } = req.params;
    const { attended } = req.body;

    const meeting = await prisma.meeting.findFirst({
      where: { id, schoolId: sid },
    });

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const ms = await prisma.meetingStudent.updateMany({
      where: { meetingId: id, studentId },
      data: { attended: Boolean(attended) },
    });

    await cacheService.invalidateSchool(sid);

    return res.json({ data: ms });
  } catch (err) {
    console.error("markStudentAttendance:", err);
    return res.status(500).json({ message: "Server error" });
  }
};