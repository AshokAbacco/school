// server/src/parent/controllers/activitiesController.js
// ═══════════════════════════════════════════════════════════════
//  Parent — Activities Controller (view-only)
//  • Auth via req.user.id (set by authMiddleware)
//  • Requires ?studentId=<uuid> on every request
//  • Validates parent owns student via StudentParent table
// ═══════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";

async function verifyParentOwnsStudent(parentId, studentId) {
  const link = await prisma.studentParent.findFirst({
    where: { parentId, studentId },
  });
  return !!link;
}

function getStudentId(req, res) {
  const parentId  = req.user?.id;
  const studentId = req.query.studentId;
  if (!parentId)  { res.status(401).json({ success: false, message: "Unauthorized" }); return null; }
  if (!studentId) { res.status(400).json({ success: false, message: "studentId is required" }); return null; }
  return { parentId, studentId };
}

// ── GET /api/parent/activities?studentId= ─────────────────────
export const getActivities = async (req, res) => {
  try {
    const ids = getStudentId(req, res);
    if (!ids) return;
    const { parentId, studentId } = ids;

    const owns = await verifyParentOwnsStudent(parentId, studentId);
    if (!owns) return res.status(403).json({ success: false, message: "Access denied" });

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { classSection: true, academicYear: true },
    });
    if (!enrollment)
      return res.status(404).json({ success: false, message: "No active enrollment found" });

    const activities = await prisma.activity.findMany({
      where: {
        schoolId: enrollment.classSection.schoolId,
        academicYearId: enrollment.academicYearId,
        isArchived: false,
        activityClasses: { some: { classSectionId: enrollment.classSectionId } },
      },
      include: {
        activityClasses: { include: { classSection: { select: { id: true, name: true } } } },
        academicYear: { select: { name: true } },
        _count: { select: { enrollments: true, events: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark which ones the student is enrolled in
    const enrollments = await prisma.studentActivityEnrollment.findMany({
      where: { studentId, academicYearId: enrollment.academicYearId, status: "ACTIVE" },
      select: { activityId: true },
    });
    const enrolledSet = new Set(enrollments.map(e => e.activityId));

    const data = activities.map(a => ({
      ...a,
      isEnrolled: enrolledSet.has(a.id),
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[parent/getActivities]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/parent/activities/events?studentId= ──────────────
export const getEvents = async (req, res) => {
  try {
    const ids = getStudentId(req, res);
    if (!ids) return;
    const { parentId, studentId } = ids;

    const owns = await verifyParentOwnsStudent(parentId, studentId);
    if (!owns) return res.status(403).json({ success: false, message: "Access denied" });

    const participants = await prisma.eventParticipant.findMany({
      where: { studentId },
      include: {
        event: {
          include: {
            activity: { select: { name: true } },
            results: {
              where: { studentId },
              select: { resultType: true, position: true, awardTitle: true },
            },
          },
        },
      },
      orderBy: { event: { eventDate: "desc" } },
    });

    const teamMemberships = await prisma.eventTeamMember.findMany({
      where: { studentId },
      include: {
        team: {
          include: {
            event: {
              include: {
                activity: { select: { name: true } },
                results: {
                  where: { teamId: { not: null } },
                  select: { resultType: true, position: true, awardTitle: true, teamId: true },
                },
              },
            },
          },
        },
      },
    });

    const individualEvents = participants.map(p => ({
      eventId:   p.event.id,
      eventName: p.event.name,
      eventType: p.event.eventType,
      eventDate: p.event.eventDate,
      activity:  p.event.activity,
      role:      p.role,
      asTeam:    false,
      results:   p.event.results,
    }));

    const teamEvents = teamMemberships.map(tm => ({
      eventId:   tm.team.event.id,
      eventName: tm.team.event.name,
      eventType: tm.team.event.eventType,
      eventDate: tm.team.event.eventDate,
      activity:  tm.team.event.activity,
      asTeam:    true,
      teamName:  tm.team.name,
      results:   tm.team.event.results.filter(r => r.teamId === tm.team.id),
    }));

    const allEvents = [...individualEvents, ...teamEvents]
      .sort((a, b) => new Date(b.eventDate ?? 0) - new Date(a.eventDate ?? 0));

    return res.json({ success: true, data: allEvents });
  } catch (err) {
    console.error("[parent/getEvents]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/parent/activities/achievements?studentId= ────────
export const getAchievements = async (req, res) => {
  try {
    const ids = getStudentId(req, res);
    if (!ids) return;
    const { parentId, studentId } = ids;

    const owns = await verifyParentOwnsStudent(parentId, studentId);
    if (!owns) return res.status(403).json({ success: false, message: "Access denied" });

    const results = await prisma.eventResult.findMany({
      where: {
        studentId,
        resultType: { not: "PARTICIPATED" },
      },
      include: {
        event: {
          include: { activity: { select: { name: true } } },
        },
        team: { select: { name: true } },
      },
      orderBy: { recordedAt: "desc" },
    });

    const data = results.map(r => ({
      id:           r.id,
      eventName:    r.event.name,
      eventDate:    r.event.eventDate,
      resultType:   r.resultType,
      position:     r.position,
      awardTitle:   r.awardTitle,
      activityName: r.event.activity?.name ?? null,
      asTeam:       !!r.teamId,
      teamName:     r.team?.name ?? null,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[parent/getAchievements]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/parent/activities/summary?studentId= ─────────────
export const getSummary = async (req, res) => {
  try {
    const ids = getStudentId(req, res);
    if (!ids) return;
    const { parentId, studentId } = ids;

    const owns = await verifyParentOwnsStudent(parentId, studentId);
    if (!owns) return res.status(403).json({ success: false, message: "Access denied" });

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { academicYear: true },
    });

    const [enrolledActivities, participatedEvents, achievements] = await Promise.all([
      prisma.studentActivityEnrollment.count({
        where: { studentId, academicYearId: enrollment?.academicYearId, status: "ACTIVE" },
      }),
      prisma.eventParticipant.count({ where: { studentId } }),
      prisma.eventResult.count({
        where: { studentId, resultType: { not: "PARTICIPATED" } },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        enrolledActivities,
        eventsParticipated: participatedEvents,
        achievements,
        academicYear: enrollment?.academicYear?.name ?? null,
      },
    });
  } catch (err) {
    console.error("[parent/getSummary]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};