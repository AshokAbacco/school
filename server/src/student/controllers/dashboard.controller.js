// server/src/student/controllers/dashboard.controller.js

import { prisma } from "../../config/db.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

// ═══════════════════════════════════════════════════════════════
//  GET /api/student/dashboard
//  Single aggregated endpoint powering the student dashboard
// ═══════════════════════════════════════════════════════════════
export async function getDashboard(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    // ── 1. Student base + personal info ───────────────────────
    const student = await prisma.student.findUnique({
      where:  { id: studentId },
      select: {
        id:    true,
        name:  true,
        email: true,
        personalInfo: {
          select: {
            firstName:    true,
            lastName:     true,
            profileImage: true,
            gender:       true,
          },
        },
      },
    });
    if (!student) return err(res, "Student not found", 404);

    // ── 2. Active enrollment → class + academic year ───────────
    const enrollment = await prisma.studentEnrollment.findFirst({
      where:   { studentId, status: "ACTIVE" },
      include: {
        classSection: {
          select: {
            id:      true,
            name:    true,
            grade:   true,
            section: true,
          },
        },
        academicYear: {
          select: { id: true, name: true },
        },
      },
    });

    const academicYearId  = enrollment?.academicYear?.id  ?? null;
    const classSectionId  = enrollment?.classSection?.id  ?? null;

    // ── 3. Today's timetable ────────────────────────────────────
    const DAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
    const todayDay = DAYS[new Date().getDay()];

    const timetableEntries = classSectionId ? await prisma.timetableEntry.findMany({
      where: { classSectionId, day: todayDay },
      include: {
        subject:          { select: { name: true, code: true } },
        teacher:          { select: { firstName: true, lastName: true } },
        periodDefinition: { select: { startTime: true, endTime: true, label: true, slotType: true, order: true } },
      },
      orderBy: { periodDefinition: { order: "asc" } },
    }) : [];

    // ── 4. Recent marks (last 5 published) ──────────────────────
    const recentMarks = await prisma.marks.findMany({
      where: {
        studentId,
        isAbsent: false,
        marksObtained: { not: null },
        schedule: {
          assessmentGroup: { isPublished: true },
        },
      },
      include: {
        schedule: {
          include: {
            subject:         { select: { name: true } },
            assessmentGroup: { select: { name: true, weightage: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take:    5,
    });

    // ── 5. Attendance summary (current academic year) ───────────
    const attendanceCounts = academicYearId ? await prisma.attendanceRecord.groupBy({
      by:    ["status"],
      where: { studentId, academicYearId },
      _count: { status: true },
    }) : [];

    const attMap = Object.fromEntries(
      attendanceCounts.map((r) => [r.status, r._count.status])
    );
    const totalDays    = Object.values(attMap).reduce((s, v) => s + v, 0);
    const presentDays  = (attMap.PRESENT ?? 0) + (attMap.LATE ?? 0) + (attMap.HALF_DAY ?? 0);
    const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

    // ── 6. Latest result summary (best published term) ──────────
    const latestResult = academicYearId ? await prisma.resultSummary.findFirst({
      where:   { studentId, academicYearId, isPublished: true },
      orderBy: { assessmentGroup: { createdAt: "desc" } },
      include: {
        term:            { select: { name: true } },
        assessmentGroup: { select: { name: true } },
      },
    }) : null;

    // ── 7. Upcoming exams (next 4) ──────────────────────────────
    const upcomingExams = classSectionId ? await prisma.assessmentSchedule.findMany({
      where: {
        classSectionId,
        examDate: { gte: new Date() },
        assessmentGroup: { isPublished: true },
      },
      include: {
        subject:         { select: { name: true } },
        assessmentGroup: { select: { name: true } },
      },
      orderBy: { examDate: "asc" },
      take:    4,
    }) : [];

    // ── 8. Activities summary ───────────────────────────────────
    const enrolledActivities = academicYearId ? await prisma.studentActivityEnrollment.count({
      where: { studentId, status: "ACTIVE", academicYearId },
    }) : 0;

    const achievementsCount = await prisma.eventResult.count({
      where: {
        OR: [
          { studentId },
          { team: { members: { some: { studentId } } } },
        ],
      },
    });

    // ── 9. Awards ───────────────────────────────────────────────
    const awards = academicYearId ? await prisma.studentAward.findMany({
      where:   { studentId, academicYearId },
      include: { award: { select: { name: true, category: true } } },
      orderBy: { createdAt: "desc" },
      take:    3,
    }) : [];

    // ── 10. Upcoming meetings (student-tagged) ──────────────────
    const upcomingMeetings = await prisma.meetingStudent.findMany({
      where: {
        studentId,
        meeting: {
          meetingDate: { gte: new Date() },
          status:      "SCHEDULED",
        },
      },
      include: {
        meeting: {
          select: {
            id:          true,
            title:       true,
            meetingDate: true,
            startTime:   true,
            type:        true,
          },
        },
      },
      orderBy: { meeting: { meetingDate: "asc" } },
      take:    3,
    });

    // ── Assemble response ───────────────────────────────────────
    return ok(res, {
      data: {
        student: {
          id:          student.id,
          name:        student.name,
          email:       student.email,
          firstName:   student.personalInfo?.firstName ?? student.name.split(" ")[0],
          lastName:    student.personalInfo?.lastName  ?? "",
          profileImage:student.personalInfo?.profileImage ?? null,
          gender:      student.personalInfo?.gender ?? null,
        },

        enrollment: enrollment
          ? {
              admissionNumber: enrollment.admissionNumber,
              rollNumber:      enrollment.rollNumber,
              status:          enrollment.status,
              classSection:    enrollment.classSection,
              academicYear:    enrollment.academicYear,
            }
          : null,

        // Today's timetable slots (PERIOD only, sorted by order)
        todaySchedule: timetableEntries
          .filter((e) => e.periodDefinition.slotType === "PERIOD")
          .map((e) => ({
            subject:   e.subject.name,
            teacher:   `${e.teacher.firstName} ${e.teacher.lastName}`,
            startTime: e.periodDefinition.startTime,
            endTime:   e.periodDefinition.endTime,
            label:     e.periodDefinition.label,
            order:     e.periodDefinition.order,
          })),

        // Recent 5 marks
        recentMarks: recentMarks.map((m) => ({
          id:              m.id,
          subject:         m.schedule.subject.name,
          assessmentName:  m.schedule.assessmentGroup.name,
          marksObtained:   m.marksObtained,
          maxMarks:        m.schedule.maxMarks,
          percentage:      m.schedule.maxMarks > 0
            ? Math.round((m.marksObtained / m.schedule.maxMarks) * 100)
            : null,
          date: m.updatedAt,
        })),

        // Attendance
        attendance: {
          totalDays,
          presentDays,
          absentDays:  attMap.ABSENT    ?? 0,
          lateDays:    attMap.LATE      ?? 0,
          percentage:  attendancePct,
        },

        // Latest published result
        latestResult: latestResult
          ? {
              percentage:      latestResult.percentage,
              grade:           latestResult.grade,
              totalMarks:      latestResult.totalMarks,
              maxMarks:        latestResult.maxMarks,
              termName:        latestResult.term?.name        ?? null,
              assessmentGroup: latestResult.assessmentGroup?.name ?? null,
            }
          : null,

        // Upcoming exams
        upcomingExams: upcomingExams.map((e) => ({
          id:             e.id,
          subject:        e.subject.name,
          assessmentName: e.assessmentGroup.name,
          examDate:       e.examDate,
          startTime:      e.startTime,
          endTime:        e.endTime,
          maxMarks:       e.maxMarks,
          venue:          e.venue ?? null,
        })),

        // Activities & achievements
        activities: {
          enrolled:     enrolledActivities,
          achievements: achievementsCount,
        },

        // Recent awards
        awards: awards.map((a) => ({
          id:       a.id,
          name:     a.award.name,
          category: a.award.category,
          remarks:  a.remarks ?? null,
          date:     a.createdAt,
        })),

        // Upcoming meetings
        upcomingMeetings: upcomingMeetings.map((ms) => ({
          id:          ms.meeting.id,
          title:       ms.meeting.title,
          meetingDate: ms.meeting.meetingDate,
          startTime:   ms.meeting.startTime,
          type:        ms.meeting.type,
        })),
      },
    });
  } catch (e) {
    console.error("[student.getDashboard]", e);
    return err(res, e.message, 500);
  }
}