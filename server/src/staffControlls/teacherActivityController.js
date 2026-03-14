// server/src/staffControlls/teacherActivityController.js

import { prisma } from "../config/db.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });


// ── Check if teacher is a class teacher ──────────────────────
const assertClassTeacher = async (teacherId) => {
  const ct = await prisma.classSectionAcademicYear.findFirst({
    where: { classTeacherId: teacherId },
  });
  if (!ct) throw Object.assign(new Error('Only class teachers can manage teams'), { status: 403 });
};

const getTeacherId = async (userId) => {
  const profile = await prisma.teacherProfile.findUnique({
    where:  { userId },
    select: { id: true, schoolId: true },
  });
  if (!profile) throw new Error("Teacher profile not found");
  return profile;
};

// ═══════════════════════════════════════════════════════════════
//  ACTIVITIES — view what the teacher's classes are enrolled in
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/teacher/activities
 * Returns all activities available for the teacher's school
 * Query: ?academicYearId=
 */
export async function getActivities(req, res) {
  try {
    const { id: userId } = req.user;
    const { schoolId } = await getTeacherId(userId);
    const { academicYearId } = req.query;

    const activities = await prisma.activity.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        academicYear: { select: { id: true, name: true, isActive: true } },
        activityClasses: {
          include: {
            classSection: { select: { id: true, grade: true, section: true, name: true } },
          },
        },
        _count: { select: { enrollments: true, events: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(res, { data: activities });
  } catch (e) {
    console.error("[teacher.getActivities]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  STUDENT ENROLLMENTS IN ACTIVITIES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/teacher/activities/:activityId/enrollments
 * Returns enrolled students for an activity
 * Query: ?classSectionId= (filter by class)
 */
export async function getEnrollments(req, res) {
  try {
    const { id: userId }  = req.user;
    const { id: teacherId } = await getTeacherId(userId);
    const { activityId }  = req.params;
    const { classSectionId } = req.query;

    // Get teacher assigned class sections
    const assignments = await prisma.teacherAssignment.findMany({
      where:  { teacherId },
      select: { classSectionId: true },
    });
    const teacherClassIds = [...new Set(assignments.map(a => a.classSectionId))];

    const enrollments = await prisma.studentActivityEnrollment.findMany({
      where: {
        activityId,
        status: "ACTIVE",
        student: {
          enrollments: {
            some: {
              classSectionId: classSectionId
                ? classSectionId
                : { in: teacherClassIds },
              status: "ACTIVE",
            },
          },
        },
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return ok(res, { data: enrollments });
  } catch (e) {
    console.error("[teacher.getEnrollments]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * POST /api/teacher/activities/:activityId/enrollments
 * Enroll one or multiple students in an activity
 * Body: { studentIds: [], academicYearId }
 */
export async function enrollStudents(req, res) {
  try {
    const { activityId } = req.params;
    const { studentIds, academicYearId } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0)
      return err(res, "studentIds array is required");
    if (!academicYearId) return err(res, "academicYearId is required");

    // Verify activity exists
    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) return err(res, "Activity not found", 404);

    // Check maxStudentsPerClass limit if set
    if (activity.maxStudentsPerClass) {
      // For simplicity, just upsert — teacher is responsible for limits
    }

    // Upsert enrollments (skip duplicates)
    const results = await Promise.allSettled(
      studentIds.map((studentId) =>
        prisma.studentActivityEnrollment.upsert({
          where: {
            studentId_activityId_academicYearId: {
              studentId,
              activityId,
              academicYearId,
            },
          },
          create:  { studentId, activityId, academicYearId },
          update:  {},
        })
      )
    );

    const enrolled = results.filter((r) => r.status === "fulfilled").length;
    return ok(res, { message: `${enrolled} student(s) enrolled`, enrolled }, 201);
  } catch (e) {
    console.error("[teacher.enrollStudents]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * DELETE /api/teacher/activities/:activityId/enrollments/:studentId
 * Remove a student from an activity
 */
export async function removeEnrollment(req, res) {
  try {
    const { activityId, studentId } = req.params;

    await prisma.studentActivityEnrollment.deleteMany({
      where: { activityId, studentId },
    });

    return ok(res, { message: "Enrollment removed" });
  } catch (e) {
    console.error("[teacher.removeEnrollment]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  AUTO-CREATE DEFAULT EVENT FOR TEAM ACTIVITIES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/teacher/activities/:activityId/ensure-event
 * If no event exists for this activity, auto-create a
 * "General Practice" PARTICIPATION event so teams can be created.
 * Returns the first existing event OR the newly created one.
 */
export async function ensureDefaultEvent(req, res) {
  try {
    const { id: userId }  = req.user;
    const { schoolId }    = await getTeacherId(userId);
    const { activityId }  = req.params;

    const activity = await prisma.activity.findFirst({
      where:   { id: activityId, schoolId },
      include: { academicYear: true },
    });
    if (!activity) return err(res, "Activity not found", 404);

    const defaultName = `${activity.name} — General`;

    // ── Step 1: cleanup any duplicate "General" events (keep the one with most teams) ──
    const allGenerals = await prisma.activityEvent.findMany({
      where:   { activityId, schoolId, name: defaultName },
      include: { _count: { select: { teams: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (allGenerals.length > 1) {
      // Keep the one with most teams (or the oldest if tied)
      const sorted = [...allGenerals].sort((a, b) => b._count.teams - a._count.teams);
      const keep   = sorted[0];
      const remove = sorted.slice(1).map(e => e.id);
      await prisma.activityEvent.deleteMany({ where: { id: { in: remove } } });
      return ok(res, { data: keep, created: false, cleaned: remove.length });
    }

    if (allGenerals.length === 1) {
      return ok(res, { data: allGenerals[0], created: false });
    }

    // ── Step 2: No general event exists — check for ANY event first ──
    const anyExisting = await prisma.activityEvent.findFirst({
      where:   { activityId, schoolId },
      include: { _count: { select: { teams: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (anyExisting) return ok(res, { data: anyExisting, created: false });

    // ── Step 3: Create fresh default event ──
    const event = await prisma.activityEvent.create({
      data: {
        name:           defaultName,
        description:    "Default event for team management",
        activityId,
        schoolId,
        academicYearId: activity.academicYearId,
        eventType:      "PARTICIPATION",
        participationMode: activity.participationType === "INDIVIDUAL" ? "INDIVIDUAL" : "TEAM",
        createdById:    userId,
        isAutoGenerated: true,   // ← hidden from admin events list
      },
      include: { _count: { select: { teams: true } } },
    });

    return ok(res, { data: event, created: true }, 201);
  } catch (e) {
    console.error("[teacher.ensureDefaultEvent]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  EVENTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/teacher/activities/events
 * Query: ?academicYearId=&activityId=&eventType=
 */
export async function getEvents(req, res) {
  try {
    const { id: userId } = req.user;
    const { schoolId } = await getTeacherId(userId);
    const { academicYearId, activityId, eventType, includeAutoGenerated } = req.query;

    const events = await prisma.activityEvent.findMany({
      where: {
        schoolId,
        // includeAutoGenerated=true is used by Teams tab inside Activity Detail
        // All other callers (Events tab) see only real events
        ...(includeAutoGenerated === "true" ? {} : { isAutoGenerated: false }),
        ...(academicYearId ? { academicYearId } : {}),
        ...(activityId     ? { activityId }     : {}),
        ...(eventType      ? { eventType }      : {}),
      },
      include: {
        activity:    { select: { id: true, name: true, participationType: true } },
        academicYear: { select: { id: true, name: true } },
        teams: {
          include: {
            members: {
              include: { student: { select: { id: true, name: true } } },
            },
          },
        },
        participants: {
          include: { student: { select: { id: true, name: true } } },
        },
        results: {
          include: {
            student: { select: { id: true, name: true } },
            team:    { select: { id: true, name: true } },
          },
        },
        _count: { select: { teams: true, participants: true, results: true } },
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    });

    return ok(res, { data: events });
  } catch (e) {
    console.error("[teacher.getEvents]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  TEAMS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/teacher/activities/events/:eventId/teams
 */
export async function getTeams(req, res) {
  try {
    const { id: userId }    = req.user;
    const { id: teacherId } = await getTeacherId(userId);
    const { eventId }       = req.params;

    // Get teacher assigned class sections
    const assignments = await prisma.teacherAssignment.findMany({
      where:  { teacherId },
      select: { classSectionId: true },
    });
    const teacherClassIds = [...new Set(assignments.map(a => a.classSectionId))];

    const teams = await prisma.eventTeam.findMany({
      where: { eventId },
      include: {
        members: {
          include: {
            student: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        results: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Enrich each member with their active classSection
    const allStudentIds = teams.flatMap(t => t.members.map(m => m.student.id));
    const enrollments   = await prisma.studentEnrollment.findMany({
      where:   { studentId: { in: allStudentIds }, status: "ACTIVE" },
      include: { classSection: { select: { id: true, name: true, grade: true, section: true } } },
    });
    const csMap = {};
    enrollments.forEach(e => { csMap[e.studentId] = e.classSection; });

    const enriched = teams
      .map(team => ({
        ...team,
        members: team.members.map(m => ({
          ...m,
          student: { ...m.student, classSection: csMap[m.student.id] ?? null },
        })),
      }))
      // Only show teams that have at least one member from teacher's classes
      // OR teams with no members yet (newly created, unassigned)
      .filter(team =>
        team.members.length === 0 ||
        team.members.some(m => m.student.classSection && teacherClassIds.includes(m.student.classSection.id))
      );

    const event = await prisma.activityEvent.findUnique({ where: { id: eventId }, select: { maxTeamsPerClass: true, maxStudentsPerClass: true } });
    return ok(res, { data: enriched, meta: { maxTeamsPerClass: event?.maxTeamsPerClass ?? null, maxStudentsPerClass: event?.maxStudentsPerClass ?? null } });
  } catch (e) {
    console.error("[teacher.getTeams]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * POST /api/teacher/activities/events/:eventId/teams
 * Create a team and optionally add members
 * Body: { name, studentIds: [] }
 */
export async function createTeam(req, res) {
  try {
    const { id: userId } = req.user;
    const { id: teacherId } = await getTeacherId(userId);
    await assertClassTeacher(teacherId);
    const { eventId } = req.params;
    const { name, studentIds = [] } = req.body;

    if (!name) return err(res, "Team name is required");

    const event = await prisma.activityEvent.findUnique({ where: { id: eventId } });
    if (!event) return err(res, "Event not found", 404);

    if (event.activityId) {
      const activity = await prisma.activity.findUnique({ where: { id: event.activityId } });
      // excludeTeamId = null means this is a NEW team (maxTeamsPerClass will be enforced)
      const violation = await checkTeamLimits({ activity, eventId, studentIds, excludeTeamId: null });
      if (violation) return err(res, violation);
    }

    const team = await prisma.eventTeam.create({
      data: {
        name,
        eventId,
        createdById: userId,
        members: { create: studentIds.map((studentId) => ({ studentId })) },
      },
      include: {
        members: { include: { student: { select: { id: true, name: true } } } },
      },
    });

    return ok(res, { data: team }, 201);
  } catch (e) {
    console.error("[teacher.createTeam]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ════════════════════════════════════════════════════════════════
//  SHARED LIMIT CHECK HELPER
// ════════════════════════════════════════════════════════════════
/**
 * Returns an error string if limits are violated, or null if all ok.
 *
 * maxTeamsPerClass   — blocks creating a NEW team when a class already
 *                      has that many teams. NOT enforced when editing.
 * maxStudentsPerClass — total students from a class that are assigned to ANY
 *                       team in this event cannot exceed this cap.
 *                       When editing, counts only OTHER teams + the new list.
 *
 * @param {object}      activity       - activity record (maxTeamsPerClass, maxStudentsPerClass)
 * @param {string}      eventId        - event being worked on
 * @param {string[]}    studentIds     - new/updated student list for the team
 * @param {string|null} excludeTeamId  - for updateTeam: the team being edited (excluded from counts)
 */
async function checkTeamLimits({ activity, eventId, studentIds, excludeTeamId }) {
  if (!activity) return null;
  const { maxTeamsPerClass, maxStudentsPerClass } = activity;
  if (!maxTeamsPerClass && !maxStudentsPerClass) return null;
  if (!studentIds || studentIds.length === 0) return null;

  // Get class section for each student
  const enrollments = await prisma.studentEnrollment.findMany({
    where:   { studentId: { in: studentIds }, status: "ACTIVE" },
    select:  { studentId: true, classSectionId: true },
    orderBy: { createdAt: "desc" },
  });

  // studentId → classSectionId  (most recent enrollment wins)
  const studentClassMap = {};
  enrollments.forEach(e => {
    if (!studentClassMap[e.studentId]) studentClassMap[e.studentId] = e.classSectionId;
  });

  const classSectionIds = [...new Set(Object.values(studentClassMap))];
  if (classSectionIds.length === 0) return null;

  // Fetch class names
  const classSections = await prisma.classSection.findMany({
    where:  { id: { in: classSectionIds } },
    select: { id: true, name: true },
  });
  const classNameMap = {};
  classSections.forEach(c => { classNameMap[c.id] = c.name; });

  // Fetch existing teams for this event, excluding the team being edited
  const existingTeams = await prisma.eventTeam.findMany({
    where: {
      eventId,
      ...(excludeTeamId ? { id: { not: excludeTeamId } } : {}),
    },
    include: {
      members: {
        include: {
          student: {
            include: {
              enrollments: {
                where:  { status: "ACTIVE" },
                select: { classSectionId: true },
                take:   1,
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  for (const classSectionId of classSectionIds) {
    const className = classNameMap[classSectionId] ?? classSectionId;

    // Students from this class in the incoming list
    const incomingCount = studentIds.filter(id => studentClassMap[id] === classSectionId).length;

    // Existing teams that contain at least one student from this class
    const teamsForClass = existingTeams.filter(team =>
      team.members.some(m =>
        m.student.enrollments.some(e => e.classSectionId === classSectionId)
      )
    );

    // ── maxTeamsPerClass: only blocks NEW team creation ──────────────────────
    if (maxTeamsPerClass && excludeTeamId === null) {
      if (teamsForClass.length >= maxTeamsPerClass) {
        return `Class ${className} already has ${teamsForClass.length}/${maxTeamsPerClass} teams. Cannot create a new team for this class.`;
      }
    }

    // ── maxStudentsPerClass: blocks exceeding student cap ────────────────────
    if (maxStudentsPerClass) {
      // Unique students from this class already assigned in OTHER teams
      const alreadyAssigned = new Set();
      teamsForClass.forEach(team =>
        team.members.forEach(m => {
          if (m.student.enrollments.some(e => e.classSectionId === classSectionId)) {
            alreadyAssigned.add(m.student.id);
          }
        })
      );

      const remaining = maxStudentsPerClass - alreadyAssigned.size;
      if (incomingCount > remaining) {
        return `Class ${className}: only ${remaining} student slot${remaining !== 1 ? "s" : ""} remaining out of ${maxStudentsPerClass} allowed. Cannot assign ${incomingCount} student${incomingCount !== 1 ? "s" : ""} from this class.`;
      }
    }
  }

  return null;
}

/**
 * PUT /api/teacher/activities/events/:eventId/teams/:teamId
 * Rename team and update members
 * Body: { name, studentIds: [] }
 */
export async function updateTeam(req, res) {
  try {
    const { id: userId } = req.user;
    const { id: teacherId } = await getTeacherId(userId);
    await assertClassTeacher(teacherId);
    const { eventId, teamId } = req.params;
    const { name, studentIds } = req.body;

    // ── Limit check when members are being updated ───────────────────────────
    // excludeTeamId = teamId so the current team is excluded from counts
    // (we only check OTHER teams, then apply the new list)
    // maxTeamsPerClass is NOT enforced here — teacher can always edit existing teams
    if (Array.isArray(studentIds) && eventId) {
      const event = await prisma.activityEvent.findUnique({ where: { id: eventId } });
      if (event?.activityId) {
        const activity = await prisma.activity.findUnique({ where: { id: event.activityId } });
        const violation = await checkTeamLimits({
          activity,
          eventId,
          studentIds,
          excludeTeamId: teamId,   // ← this team is excluded, so edit is always allowed for teams
        });
        if (violation) return err(res, violation);
      }
    }

    const team = await prisma.$transaction(async (tx) => {
      // Update members if provided
      if (Array.isArray(studentIds)) {
        await tx.eventTeamMember.deleteMany({ where: { teamId } });
        await tx.eventTeamMember.createMany({
          data: studentIds.map((studentId) => ({ teamId, studentId })),
          skipDuplicates: true,
        });
      }

      return tx.eventTeam.update({
        where: { id: teamId },
        data:  { ...(name ? { name } : {}) },
        include: {
          members: {
            include: { student: { select: { id: true, name: true } } },
          },
        },
      });
    });

    return ok(res, { data: team });
  } catch (e) {
    console.error("[teacher.updateTeam]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * DELETE /api/teacher/activities/events/:eventId/teams/:teamId
 */
export async function deleteTeam(req, res) {
  try {
    const { id: userId } = req.user;
    const { id: teacherId } = await getTeacherId(userId);
    await assertClassTeacher(teacherId);
    const { teamId } = req.params;
    await prisma.eventTeam.delete({ where: { id: teamId } });
    return ok(res, { message: "Team deleted" });
  } catch (e) {
    console.error("[teacher.deleteTeam]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * POST /api/teacher/activities/events/:eventId/teams/:teamId/members
 * Add a student to a team
 * Body: { studentId }
 */
export async function addTeamMember(req, res) {
  try {
    const { id: userId } = req.user;
    const { id: teacherId } = await getTeacherId(userId);
    await assertClassTeacher(teacherId);
    const { teamId } = req.params;
    const { studentId } = req.body;
    if (!studentId) return err(res, "studentId is required");

    const member = await prisma.eventTeamMember.upsert({
      where:  { teamId_studentId: { teamId, studentId } },
      create: { teamId, studentId },
      update: {},
      include: { student: { select: { id: true, name: true } } },
    });

    return ok(res, { data: member }, 201);
  } catch (e) {
    console.error("[teacher.addTeamMember]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * DELETE /api/teacher/activities/events/:eventId/teams/:teamId/members/:studentId
 */
export async function removeTeamMember(req, res) {
  try {
    const { id: userId } = req.user;
    const { id: teacherId } = await getTeacherId(userId);
    await assertClassTeacher(teacherId);
    const { teamId, studentId } = req.params;
    await prisma.eventTeamMember.deleteMany({ where: { teamId, studentId } });
    return ok(res, { message: "Member removed" });
  } catch (e) {
    console.error("[teacher.removeTeamMember]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  PARTICIPANTS (individual / cultural roles)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/teacher/activities/events/:eventId/participants
 */
export async function getParticipants(req, res) {
  try {
    const { eventId } = req.params;

    const participants = await prisma.eventParticipant.findMany({
      where: { eventId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { id: "asc" },
    });

    return ok(res, { data: participants });
  } catch (e) {
    console.error("[teacher.getParticipants]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * POST /api/teacher/activities/events/:eventId/participants
 * Add participant(s) with optional role
 * Body: { studentIds: [], role (optional) }
 *   OR  { participants: [{ studentId, role }] }  — for per-student roles
 */
export async function addParticipants(req, res) {
  try {
    const { eventId } = req.params;
    const { studentIds, role, participants: perStudentList } = req.body;

    const event = await prisma.activityEvent.findUnique({ where: { id: eventId } });
    if (!event) return err(res, "Event not found", 404);

    let toCreate = [];

    if (Array.isArray(perStudentList) && perStudentList.length > 0) {
      // Per-student roles: [{ studentId, role }]
      toCreate = perStudentList;
    } else if (Array.isArray(studentIds) && studentIds.length > 0) {
      toCreate = studentIds.map((studentId) => ({ studentId, role: role || null }));
    } else {
      return err(res, "Provide studentIds[] or participants[]");
    }

    const results = await Promise.allSettled(
      toCreate.map(({ studentId, role: r }) =>
        prisma.eventParticipant.upsert({
          where:  { eventId_studentId: { eventId, studentId } },
          create: { eventId, studentId, role: r || null, participated: true },
          update: { role: r || null, participated: true },
        })
      )
    );

    const added = results.filter((r) => r.status === "fulfilled").length;
    return ok(res, { message: `${added} participant(s) added`, added }, 201);
  } catch (e) {
    console.error("[teacher.addParticipants]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * PATCH /api/teacher/activities/events/:eventId/participants/:studentId
 * Update role or participated flag
 * Body: { role, participated }
 */
export async function updateParticipant(req, res) {
  try {
    const { eventId, studentId } = req.params;
    const { role, participated } = req.body;

    const participant = await prisma.eventParticipant.updateMany({
      where: { eventId, studentId },
      data: {
        ...(role         !== undefined ? { role }         : {}),
        ...(participated !== undefined ? { participated } : {}),
      },
    });

    return ok(res, { data: participant });
  } catch (e) {
    console.error("[teacher.updateParticipant]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * DELETE /api/teacher/activities/events/:eventId/participants/:studentId
 */
export async function removeParticipant(req, res) {
  try {
    const { eventId, studentId } = req.params;
    await prisma.eventParticipant.deleteMany({ where: { eventId, studentId } });
    return ok(res, { message: "Participant removed" });
  } catch (e) {
    console.error("[teacher.removeParticipant]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/teacher/activities/events/:eventId/results
 */
// ═══════════════════════════════════════════════════════════════
//  RESULTS — simple top-3 on team (WINNER / RUNNER_UP / THIRD)
// ═══════════════════════════════════════════════════════════════

// ─── setTeamResult ────────────────────────────────────────────────────────────
// PUT /api/teacher/activities/events/:eventId/teams/:teamId/result
// Body: { result: "WINNER" | "RUNNER_UP" | "THIRD_PLACE" | null }
//
// Schema facts (from schema.prisma):
//   model EventResult {
//     eventId    String
//     teamId     String?
//     resultType ResultType   ← this is the field name, NOT "result"
//     @@unique([eventId, teamId])
//   }
// ─────────────────────────────────────────────────────────────────────────────

export async function setTeamResult(req, res) {
  try {
    const { eventId, teamId } = req.params;
    const { result } = req.body; // "WINNER" | "RUNNER_UP" | "THIRD_PLACE" | null

    // 1. Verify the team belongs to this event
    const team = await prisma.eventTeam.findFirst({
      where: { id: teamId, eventId },
    });
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found in this event" });
    }

    if (!result) {
      // ── CLEAR result ──────────────────────────────────────────
      // Delete the EventResult row for this team in this event
      await prisma.eventResult.deleteMany({
        where: { eventId, teamId },
      });

      return res.json({ success: true, message: "Result cleared" });
    }

    // ── SET result ────────────────────────────────────────────────
    // 2. Remove this rank from any OTHER team in the same event
    //    (only one team can be WINNER, only one RUNNER_UP, etc.)
    await prisma.eventResult.deleteMany({
      where: {
        eventId,
        resultType: result,     // ← correct field name from schema
        teamId: { not: teamId }, // don't touch the current team's own row
      },
    });

    // 3. Upsert this team's result
    //    @@unique([eventId, teamId]) means we can target it precisely
    await prisma.eventResult.upsert({
      where: {
        eventId_teamId: { eventId, teamId }, // compound unique name Prisma generates
      },
      update: {
        resultType: result,
      },
      create: {
        eventId,
        teamId,
        resultType: result,
        // recordedById: req.user?.id ?? null,  // uncomment if you attach user to req
      },
    });

    return res.json({ success: true, message: `Result set to ${result}` });

  } catch (e) {
    console.error("[teacher.setTeamResult]", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

// Keep these as stubs so routes don't break — not used for activities
export async function getResults(req, res) { return ok(res, { data: [] }); }
export async function addResult(req, res) { return err(res, "Use PUT /teams/:teamId/result instead", 400); }
export async function updateResult(req, res) { return err(res, "Use PUT /teams/:teamId/result instead", 400); }
export async function deleteResult(req, res) { return err(res, "Use PUT /teams/:teamId/result instead", 400); }

// ═══════════════════════════════════════════════════════════════
//  HELPER — students in teacher's classes
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/teacher/activities/students
 * Returns students from teacher's assigned class sections
 * Query: ?classSectionId=&academicYearId=
 */
export async function getStudentsForActivity(req, res) {
  try {
    const { id: userId }    = req.user;
    const { schoolId, id: teacherId } = await getTeacherId(userId);
    const { classSectionId, academicYearId, activityId } = req.query;

    // Get teacher assigned class sections
    const assignments = await prisma.teacherAssignment.findMany({
      where:  { teacherId },
      select: { classSectionId: true },
    });
    const teacherClassIds = [...new Set(assignments.map(a => a.classSectionId))];

    // ── If activityId provided: only return students enrolled in that activity ─
    // This is used when building teams — teacher should only pick from
    // students who have already enrolled in the linked activity AND are in teacher class.
    if (activityId) {
      const activityEnrollments = await prisma.studentActivityEnrollment.findMany({
        where: {
          activityId,
          status: "ACTIVE",
          ...(academicYearId ? { academicYearId } : {}),
        },
        include: {
          student: {
            include: {
              enrollments: {
                where: {
                  status: "ACTIVE",
                  classSectionId: classSectionId
                    ? classSectionId
                    : { in: teacherClassIds },
                },
                include: {
                  classSection: { select: { id: true, grade: true, section: true, name: true } },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { student: { name: "asc" } },
      });

      const students = activityEnrollments
        .filter((ae) => ae.student.enrollments.length > 0) // must have active school enrollment
        .map((ae) => ({
          id:    ae.student.id,
          name:  ae.student.name,
          email: ae.student.email,
          classSection:    ae.student.enrollments[0]?.classSection ?? null,
          enrolledInActivity: true,
        }));

      return ok(res, { data: students, filteredByActivity: true });
    }

    // ── Default: return active students in teacher's classes only ───────────────
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        status: "ACTIVE",
        student: { schoolId },
        classSectionId: classSectionId
          ? classSectionId
          : { in: teacherClassIds },
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        student:      { select: { id: true, name: true, email: true } },
        classSection: { select: { id: true, grade: true, section: true, name: true } },
      },
      orderBy: { student: { name: "asc" } },
    });

    const students = enrollments.map((e) => ({
      ...e.student,
      classSection:    e.classSection,
      admissionNumber: e.admissionNumber,
      rollNumber:      e.rollNumber,
    }));

    return ok(res, { data: students, filteredByActivity: false });
  } catch (e) {
    console.error("[teacher.getStudentsForActivity]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * GET /api/teacher/activities/class-sections
 * Returns class sections for the teacher
 */
export async function getClassSections(req, res) {
  try {
    const { id: userId } = req.user;
    const { schoolId }   = await getTeacherId(userId);
    const { academicYearId } = req.query;

    // Get sections where teacher has assignments
    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacher: { userId },
        ...(academicYearId ? { academicYearId } : {}),
      },
      select: { classSectionId: true },
      distinct: ["classSectionId"],
    });

    const sectionIds = assignments.map((a) => a.classSectionId);

    const sections = await prisma.classSection.findMany({
      where: { schoolId, ...(sectionIds.length ? { id: { in: sectionIds } } : {}) },
      select: { id: true, grade: true, section: true, name: true },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });

    return ok(res, { data: sections });
  } catch (e) {
    console.error("[teacher.getClassSections]", e);
    return err(res, e.message, e.status ?? 500);
  }
}

/**
 * GET /api/teacher/activities/academic-years
 */
export async function getAcademicYears(req, res) {
  try {
    const { id: userId } = req.user;
    const { schoolId }   = await getTeacherId(userId);

    const years = await prisma.academicYear.findMany({
      where:   { schoolId },
      select:  { id: true, name: true, isActive: true },
      orderBy: { startDate: "desc" },
    });

    return ok(res, { data: years });
  } catch (e) {
    return err(res, e.message, e.status ?? 500);
  }
}