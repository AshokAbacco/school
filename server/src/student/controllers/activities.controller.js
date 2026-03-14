// server/src/student/controllers/activities.controller.js

import { prisma } from "../../config/db.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });

// ─── helper ──────────────────────────────────────────────────────────────────
const getStudentContext = async (studentId) => {
  const student = await prisma.student.findUnique({
    where:  { id: studentId },
    select: { id: true, schoolId: true },
  });
  if (!student) throw new Error("Student not found");

  const enrollment = await prisma.studentEnrollment.findFirst({
    where:   { studentId, status: "ACTIVE" },
    include: { academicYear: { select: { id: true, name: true, isActive: true } } },
  });

  return { student, enrollment };
};

// ═══════════════════════════════════════════════════════════════
//  GET /api/student/activities
//  All activities for the student's school + enrollment status
// ═══════════════════════════════════════════════════════════════
export async function getActivities(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    const { student, enrollment } = await getStudentContext(studentId);
    const academicYearId = enrollment?.academicYear?.id;

    const activities = await prisma.activity.findMany({
      where: {
        schoolId:   student.schoolId,
        isArchived: false,                          // ← never show archived activities
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        academicYear:    { select: { id: true, name: true } },
        activityClasses: {
          include: {
            classSection: { select: { id: true, name: true, grade: true } },
          },
        },
        // Only fetch the student's ACTIVE enrollment — not all enrollments
        enrollments: {
          where:  { studentId, status: "ACTIVE" },  // ← fix: must be ACTIVE
          select: { id: true, enrolledAt: true, status: true },
        },
        _count: {
          select: {
            enrollments: { where: { status: "ACTIVE" } }, // ← only count active members
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = activities.map((a) => ({
      ...a,
      isEnrolled: a.enrollments.length > 0,         // ← correct: only ACTIVE enrollments checked
      enrolledAt: a.enrollments[0]?.enrolledAt ?? null,
    }));

    return ok(res, { data, enrollment });
  } catch (e) {
    console.error("[student.getActivities]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/student/activities/:activityId/enroll
// ═══════════════════════════════════════════════════════════════
export async function enrollActivity(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    const { activityId } = req.params;
    const { student, enrollment } = await getStudentContext(studentId);

    if (!enrollment) return err(res, "No active enrollment found for this academic year");

    const academicYearId = enrollment.academicYear.id;

    const activity = await prisma.activity.findFirst({
      where: { id: activityId, schoolId: student.schoolId, isArchived: false },
    });
    if (!activity) return err(res, "Activity not found", 404);

    // Check if already has an enrollment record (active or inactive)
    const existing = await prisma.studentActivityEnrollment.findUnique({
      where: {
        studentId_activityId_academicYearId: { studentId, activityId, academicYearId },
      },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        return err(res, "Already enrolled in this activity");
      }
      // Re-activate a previously withdrawn enrollment
      const reactivated = await prisma.studentActivityEnrollment.update({
        where: { id: existing.id },
        data:  { status: "ACTIVE", leftAt: null },
      });
      return ok(res, { data: reactivated, message: "Re-enrolled successfully" }, 200);
    }

    // Fresh enrollment
    const enroll = await prisma.studentActivityEnrollment.create({
      data: { studentId, activityId, academicYearId, status: "ACTIVE" },
    });

    return ok(res, { data: enroll, message: "Enrolled successfully" }, 201);
  } catch (e) {
    console.error("[student.enrollActivity]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  DELETE /api/student/activities/:activityId/enroll
//  Soft-withdraw — sets status INACTIVE, records leftAt
//  NEVER hard-deletes (history must be preserved)
// ═══════════════════════════════════════════════════════════════
export async function withdrawActivity(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    const { activityId } = req.params;

    const updated = await prisma.studentActivityEnrollment.updateMany({
      where: { studentId, activityId, status: "ACTIVE" }, // ← only affect active enrollments
      data:  { status: "INACTIVE", leftAt: new Date() },   // ← soft withdraw with timestamp
    });

    if (updated.count === 0) {
      return err(res, "No active enrollment found for this activity", 404);
    }

    return ok(res, { message: "Withdrawn from activity" });
  } catch (e) {
    console.error("[student.withdrawActivity]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  GET /api/student/activities/events
//  Events the student participated in (as individual or team member)
// ═══════════════════════════════════════════════════════════════
export async function getMyEvents(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    // Events as individual participant
    const asParticipant = await prisma.eventParticipant.findMany({
  where: {
    studentId,
    event: {
      isArchived: false
    }
  },
  include: {
    event: {
      include: {
        activity: {
          select: { id: true, name: true }
        },
        academicYear: {
          select: { id: true, name: true }
        },
        results: {
          where: { studentId },
          select: {
            id: true,
            resultType: true,
            position: true,
            awardTitle: true
          }
        }
      }
    }
  }
});

    // Events as team member
   const asTeamMember = await prisma.eventTeamMember.findMany({
  where: {
    studentId,
    team: {
      event: {
        isArchived: false
      }
    }
  },
  include: {
    team: {
      include: {
        event: {
          include: {
            activity: { select: { id: true, name: true } },
            academicYear: { select: { id: true, name: true } }
          }
        },
        results: {
          select: {
            id: true,
            resultType: true,
            position: true,
            awardTitle: true
          }
        }
      }
    }
  }
});

    const participantEvents = asParticipant
      .filter((p) => p.event)                               // guard: skip if event was archived
      .map((p) => ({
        eventId:      p.event.id,
        eventName:    p.event.name,
        eventType:    p.event.eventType,
        participationMode: p.event.participationMode,
        eventDate:    p.event.eventDate,
        academicYear: p.event.academicYear,
        activity:     p.event.activity,
        role:         p.role,
        participated: p.participated,
        asTeam:       false,
        teamName:     null,
        results:      p.event.results,
      }));

    const teamEvents = asTeamMember
      .filter((m) => m.team?.event)                         // guard: skip if event was archived
      .map((m) => ({
        eventId:      m.team.event.id,
        eventName:    m.team.event.name,
        eventType:    m.team.event.eventType,
        participationMode: m.team.event.participationMode,
        eventDate:    m.team.event.eventDate,
        academicYear: m.team.event.academicYear,
        activity:     m.team.event.activity,
        role:         m.role ?? null,
        participated: true,
        asTeam:       true,
        teamName:     m.team.name,
        results:      m.team.results,                        // ← fix: was m.team.EventResult
      }));

    // Merge and deduplicate by eventId (prefer participant record if both exist)
    const seen = new Set();
    const allEvents = [...participantEvents, ...teamEvents].filter((e) => {
      if (seen.has(e.eventId)) return false;
      seen.add(e.eventId);
      return true;
    });

    allEvents.sort((a, b) => {
      if (!a.eventDate && !b.eventDate) return 0;
      if (!a.eventDate) return 1;
      if (!b.eventDate) return -1;
      return new Date(b.eventDate) - new Date(a.eventDate);
    });

    return ok(res, { data: allEvents });
  } catch (e) {
    console.error("[student.getMyEvents]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  GET /api/student/activities/achievements
//  All EventResult records for this student (individual + team)
// ═══════════════════════════════════════════════════════════════
export async function getAchievements(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    // Individual results — student directly listed on EventResult
    const individualResults = await prisma.eventResult.findMany({
      where: { studentId },
      include: {
        event: {
          include: {
            activity:     { select: { name: true } },
            academicYear: { select: { name: true } },
          },
        },
      },
      orderBy: { recordedAt: "desc" },
    });

    // Team results — student is a member of a team that has EventResult records
    const teamMemberships = await prisma.eventTeamMember.findMany({
      where: { studentId },
      include: {
        team: {
          include: {
            results: {                                        // ← fix: correct relation name
              include: {
                event: {
                  include: {
                    activity:     { select: { name: true } },
                    academicYear: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const individual = individualResults.map((r) => ({
      id:           r.id,
      eventName:    r.event.name,
      eventType:    r.event.eventType,
      eventDate:    r.event.eventDate,
      activityName: r.event.activity?.name    ?? null,
      academicYear: r.event.academicYear?.name ?? null,
      resultType:   r.resultType,
      position:     r.position,
      awardTitle:   r.awardTitle,
      asTeam:       false,
      teamName:     null,
    }));

    const team = teamMemberships.flatMap((m) =>
      m.team.results.map((r) => ({                          // ← fix: was m.team.EventResult
        id:           r.id,
        eventName:    r.event.name,
        eventType:    r.event.eventType,
        eventDate:    r.event.eventDate,
        activityName: r.event.activity?.name    ?? null,
        academicYear: r.event.academicYear?.name ?? null,
        resultType:   r.resultType,
        position:     r.position,
        awardTitle:   r.awardTitle,
        asTeam:       true,
        teamName:     m.team.name,
      }))
    );

    // Merge and deduplicate by result id
    const seen = new Set();
    const all  = [...individual, ...team].filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    all.sort((a, b) => {
      if (!a.eventDate && !b.eventDate) return 0;
      if (!a.eventDate) return 1;
      if (!b.eventDate) return -1;
      return new Date(b.eventDate) - new Date(a.eventDate);
    });

    return ok(res, { data: all });
  } catch (e) {
    console.error("[student.getAchievements]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  GET /api/student/activities/summary
// ═══════════════════════════════════════════════════════════════
export async function getSummary(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    const { enrollment } = await getStudentContext(studentId);
    const academicYearId = enrollment?.academicYear?.id;

    const [enrolled, participantCount, teamCount, resultCount] = await Promise.all([
      prisma.studentActivityEnrollment.count({
        where: {
          studentId,
          status: "ACTIVE",                                   // ← fix: only ACTIVE enrollments
          ...(academicYearId ? { academicYearId } : {}),
        },
      }),
      prisma.eventParticipant.count({ where: { studentId } }),
      prisma.eventTeamMember.count({ where: { studentId } }),
      prisma.eventResult.count({
        where: {
          OR: [
            { studentId },                                    // individual results
            {
              team: {
                members: { some: { studentId } },            // team results where student is a member
              },
            },
          ],
        },
      }),
    ]);

    return ok(res, {
      data: {
        enrolledActivities: enrolled,
        eventsParticipated: participantCount + teamCount,
        achievements:       resultCount,
        academicYear:       enrollment?.academicYear?.name ?? null,
      },
    });
  } catch (e) {
    console.error("[student.getSummary]", e);
    return err(res, e.message, 500);
  }
}