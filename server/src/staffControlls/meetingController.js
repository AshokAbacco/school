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
  participantUserIds = [], // now supports objects OR strings
  externalParticipants = [],
}) {
  const rows = [];

  // ── 1. Coordinators ──────────────────────────────────────────
  const coordMap = new Map(); // id → { type, sectionIds }

  if (perSectionCoordinators.length > 0) {
    for (const c of perSectionCoordinators) {
      const id = c.userId || c.staffId;
      const type = c.type || (c.userId ? "USER" : "STAFF");

      if (!id) continue;

      if (!coordMap.has(id)) {
        coordMap.set(id, { type, sections: new Set() });
      }

      if (c.classSectionId) {
        coordMap.get(id).sections.add(c.classSectionId);
      }
    }
  } else if (coordinatorUserId) {
    coordMap.set(coordinatorUserId, { type: "USER", sections: new Set() });
  }

  for (const [id, data] of coordMap) {
    rows.push({
      type: data.type,
      userId: data.type === "USER" ? id : null,
      staffId: data.type === "STAFF" ? id : null,
      isCoordinator: true,
      name:
        data.sections.size > 0
          ? `__coord_sections:${[...data.sections].join(",")}`
          : null,
    });
  }

  // ── 2. Regular attendees ─────────────────────────────────────
  const coordIds = new Set(coordMap.keys());

  for (const p of participantUserIds) {
    if (!p) continue;

    // support both old (string) and new (object) formats
    let id, type;

    if (typeof p === "string") {
      // fallback (assume USER if string)
      id = p;
      type = "USER";
    } else {
      id = p.id;
      type = p.type;
    }

    if (!id || coordIds.has(id)) continue;

    rows.push({
      type,
      userId: type === "USER" ? id : null,
      staffId: type === "STAFF" ? id : null,
      isCoordinator: false,
    });
  }

  // ── 3. External participants ─────────────────────────────────
  for (const ep of externalParticipants) {
    if (!ep.email) continue;

    rows.push({
      type: "EXTERNAL",
      name: ep.name ?? null,
      email: ep.email,
    });
  }

  return rows;
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/meetings/staff
   Returns all non-resigned staff profiles for the school.
   Used in the Non-Teaching Staff meeting type participant picker.
═══════════════════════════════════════════════════════════════ */
export const getMeetingStaff = async (req, res) => {
  try {
    const sid = schoolId(req);

    const staff = await prisma.staffProfile.findMany({
      where: {
        schoolId: sid,
        groupType: "Group B",
        NOT: { status: "RESIGNED" },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ firstName: "asc" }],
    });

    const result = staff.map((s) => ({
      staffId: s.id,
      userId: s.userId || null, // keep real userId OR null
      name: `${s.firstName} ${s.lastName ?? ""}`.trim(),
      role: s.role ?? "",
      groupType: s.groupType ?? "Group B",
      email: s.email ?? s.user?.email ?? "",
      phone: s.phone ?? "",
    }));

    return res.json({ staff: result });
  } catch (err) {
    console.error("getMeetingStaff:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

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
            parent: { select: { id: true, name: true, email: true, phone: true } },
            staff: { select: { id: true, firstName: true, lastName: true, phone: true } }, 
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
      coordinatorUserId,
      participantUserIds = [],
      perSectionCoordinators = [],
      externalParticipants = [],
      autoInviteParents = false,
      autoInviteStudents = false,
      studentIds = [],
      contactNumber,
    } = req.body;

    if (!title || !meetingDate || !startTime || !endTime) {
      return res.status(400).json({
        message: "title, meetingDate, startTime, endTime are required",
      });
    }
    let participantsToCreate = buildParticipants({
      perSectionCoordinators,
      coordinatorUserId,
      participantUserIds,
      externalParticipants,
    });

    // ✅ Extract only USER type IDs
    const userIds = participantsToCreate
      .filter(p => p.type === "USER" && p.userId)
      .map(p => p.userId);

    // ✅ Fetch valid users from DB
    const validUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    const validUserSet = new Set(validUsers.map(u => u.id));

    // ✅ Filter invalid userIds (THIS FIXES YOUR ERROR)
    participantsToCreate = participantsToCreate.filter(p => {
      if (p.type === "USER") {
        return validUserSet.has(p.userId);
      }
      if (p.type === "STAFF") {
        return !!p.staffId; // allow staff
      }
      return true;
    });
    // ── Auto-invite parents (PARENTS meeting type or flag) ────────────────
    const shouldInviteParents = autoInviteParents || type === "PARENTS";
    if (shouldInviteParents && classSectionIds.length > 0) {
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

    // ── Auto-add students (STUDENTS meeting type or flag) ─────────────────
    let finalStudentIds = [...studentIds];
    const shouldInviteStudents = autoInviteStudents || type === "STUDENTS";
    if (shouldInviteStudents && classSectionIds.length > 0) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          classSectionId: { in: classSectionIds },
          ...(academicYearId ? { academicYearId } : {}),
          status: "ACTIVE",
          student: { schoolId: sid },
        },
        select: { studentId: true },
      });
      const autoStudentIds = enrollments.map((e) => e.studentId);
      finalStudentIds = [...new Set([...finalStudentIds, ...autoStudentIds])];
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
        students: {
          create: finalStudentIds.map((sId) => ({ studentId: sId })),
        },
        contactNumber: contactNumber || null, 
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
      coordinatorUserId,
      participantUserIds = [],
      perSectionCoordinators = [],
      externalParticipants = [],
      autoInviteParents = false,
      autoInviteStudents = false,
      contactNumber,
    } = req.body;

    const rebuildParticipants =
      perSectionCoordinators.length > 0 ||
      participantUserIds.length > 0 ||
      coordinatorUserId;

    if (rebuildParticipants) {
      await prisma.meetingParticipant.deleteMany({ where: { meetingId: id } });
    }

    if (classSectionIds !== undefined) {
      await prisma.meetingClass.deleteMany({ where: { meetingId: id } });
      await prisma.meetingStudent.deleteMany({ where: { meetingId: id } });
    }

    let participantsToCreate = rebuildParticipants
      ? buildParticipants({
          perSectionCoordinators,
          coordinatorUserId,
          participantUserIds,
          externalParticipants,
        })
      : [];

    // ── Validate userIds against DB (prevents FK violation on userId fkey) ─
    if (participantsToCreate.length > 0) {
      const userIdsToValidate = participantsToCreate
        .filter((p) => p.type === "USER" && p.userId)
        .map((p) => p.userId);

      if (userIdsToValidate.length > 0) {
        const validUsers = await prisma.user.findMany({
          where: { id: { in: userIdsToValidate } },
          select: { id: true },
        });
        const validUserSet = new Set(validUsers.map((u) => u.id));
        participantsToCreate = participantsToCreate.filter((p) => {
          if (p.type !== "USER") return true;
          return validUserSet.has(p.userId);
        });
      }
    }

    // ── Auto-invite parents on update ─────────────────────────────────────
    const resolvedType = type ?? existing.type;
    const resolvedClassSectionIds = classSectionIds ?? [];
    const resolvedAcademicYearId = academicYearId ?? existing.academicYearId;

    const shouldInviteParents =
      autoInviteParents || resolvedType === "PARENTS";
    if (
      shouldInviteParents &&
      rebuildParticipants &&
      resolvedClassSectionIds.length > 0
    ) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          classSectionId: { in: resolvedClassSectionIds },
          ...(resolvedAcademicYearId ? { academicYearId: resolvedAcademicYearId } : {}),
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
            participantsToCreate.push({ type: "PARENT", parentId: link.parentId });
          }
        }
      }
    }

    // ── Auto-add students on update ───────────────────────────────────────
    let autoStudentCreates = [];
    const shouldInviteStudents =
      autoInviteStudents || resolvedType === "STUDENTS";
    if (
      shouldInviteStudents &&
      classSectionIds !== undefined &&
      resolvedClassSectionIds.length > 0
    ) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          classSectionId: { in: resolvedClassSectionIds },
          ...(resolvedAcademicYearId ? { academicYearId: resolvedAcademicYearId } : {}),
          status: "ACTIVE",
          student: { schoolId: sid },
        },
        select: { studentId: true },
      });
      autoStudentCreates = enrollments.map((e) => ({ studentId: e.studentId }));
    }

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
        ...(autoStudentCreates.length
          ? { students: { create: autoStudentCreates } }
          : {}),
        ...(contactNumber !== undefined ? { contactNumber } : {}),
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

/* ─── WhatsApp helpers ────────────────────────────────────────── */
import axios from "axios";

const formatPhone = (phone) => {
  let clean = phone?.replace(/\D/g, "");
  if (!clean) return null;
  if (clean.length === 10) clean = "91" + clean;
  return clean;
};

const cleanText = (text) => {
  return (text || "")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/meetings/:id/reminder
   ─────────────────────────────────────────────────────────────
   Called when admin clicks "Send Reminder" on the frontend.
   Sends the  meeting_scheduled  WhatsApp template to all
   participants / parents and records scheduledSentAt.

   ✅ Does NOT touch reminderSentAt — that field is owned by
      the cron job (meetingReminderCron.js) which fires the
      meeting_reminder template 2 minutes before the meeting.
═══════════════════════════════════════════════════════════════ */
export const sendMeetingReminder = async (req, res) => {
  try {
    const sid = schoolId(req);
    const { id } = req.params;

    const meeting = await prisma.meeting.findFirst({
      where: { id, schoolId: sid },
      include: {
        organizer: true,
        school: true,
        participants: {
          include: {
            user: {
              include: {
                teacherProfile: true,  // ✅ Teacher phones
                StaffProfile: true,    // ✅ Staff phones (capital S)
              },
            },
            parent: true,
            staff: true,
          },
        },
        students: {
          include: {
            student: {
              include: {
                personalInfo: true,
                parentLinks: {
                  include: { parent: true },
                },
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const schoolName = meeting.school?.name || "Your School";
    const date      = new Date(meeting.meetingDate).toLocaleDateString("en-IN");
    const time      = meeting.startTime;
    const location  =
      meeting.venueType === "ONLINE"
        ? meeting.meetingLink || "Online"
        : meeting.venueDetail || "School";
    const topic = meeting.description || "Meeting Discussion";

    /* ── Send meeting_scheduled template ── */
    const sendScheduledMessage = async (phone, name) => {
      const cleanPhone = formatPhone(phone);
      if (!cleanPhone) {
        console.log("❌ Invalid phone:", phone);
        return;
      }
      console.log("📤 Sending meeting_scheduled to:", cleanPhone, name);
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
              name: "meeting_scheduled",          // ← schedule template
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: cleanText(name || "User") },
                    { type: "text", text: cleanText(meeting.title) },
                    { type: "text", text: cleanText(topic) },
                    { type: "text", text: cleanText(date) },
                    { type: "text", text: cleanText(time) },
                    { type: "text", text: cleanText(location) },
                    { type: "text", text: cleanText(schoolName) },
                    { type: "text", text: cleanText(meeting.contactNumber || "N/A") },
                  ],
                },
              ],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("✅ Sent:", response.data);
      } catch (err) {
        console.error("❌ WhatsApp Error:", err.response?.data || err.message);
      }
    };

    // ✅ Send to USERS (Teachers + Staff)
    for (const p of meeting.participants) {
      if (p.type === "USER") {
        const phone =
          p.user?.teacherProfile?.phone || p.user?.StaffProfile?.phone;
        if (!phone) {
          console.log("❌ No phone for user:", p.user?.name);
          continue;
        }
        await sendScheduledMessage(phone, p.user?.name);
      }

        if (p.type === "STAFF") {
          const phone = p.staff?.phone;
          const name = `${p.staff?.firstName ?? ""} ${p.staff?.lastName ?? ""}`.trim();
          if (!phone) { console.log("❌ No phone for staff:", name); continue; }
          await sendScheduledMessage(phone, name);
        }

      // ✅ Send to direct PARENT participants
      if (p.type === "PARENT") {
        if (!p.parent?.phone) {
          console.log("❌ No phone for parent:", p.parent?.name);
          continue;
        }
        await sendScheduledMessage(p.parent.phone, p.parent.name);
      }
    }

    // ✅ Send to STUDENTS 
  for (const s of meeting.students) {
  const student = s.student;

  // ✅ Get phone from StudentPersonalInfo table
  const studentPhone = student?.personalInfo?.phone;

    if (studentPhone) {
      await sendScheduledMessage(studentPhone, student.name);
    } else {
      console.log("❌ No phone for student:", student?.name);
    }

    // ✅ Still send to parents (existing logic)
    if (!student?.parentLinks?.length) continue;

    for (const link of student.parentLinks) {
      const parent = link.parent;

      if (!parent?.phone) continue;

      await sendScheduledMessage(parent.phone, parent.name || student.name);
    }
  }

    // ✅ Only set scheduledSentAt here.
    //    reminderSentAt is set exclusively by the cron job AFTER
    //    it sends the meeting_reminder template (2 min before meeting).
    const updated = await prisma.meeting.update({
      where: { id },
      data: { scheduledSentAt: new Date() },
    });

    await cacheService.invalidateSchool(sid);

    return res.json({
      success: true,
      message: "WhatsApp schedule notifications sent",
      data: updated,
    });
  } catch (err) {
    console.error("sendMeetingReminder:", err.response?.data || err.message);
    return res.status(500).json({ message: "Failed to send reminders" });
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