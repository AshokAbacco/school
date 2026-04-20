import { prisma } from "../../config/db.js";
import cacheService from "../../utils/cacheService.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

export async function getDashboard(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId) return err(res, "Unauthorised", 401);

    const schoolId = req.user?.schoolId;
    const today    = new Date().toISOString().split("T")[0];

    const cacheKey = await cacheService.buildKey(
      schoolId,
      `student:dashboard:${studentId}:${today}`
    );
    const cached = await cacheService.get(cacheKey);
    if (cached) return ok(res, { data: JSON.parse(cached) });

    const student = await prisma.student.findUnique({
      where:  { id: studentId },
      select: {
        id:    true,
        name:  true,
        email: true,
        personalInfo: {
          select: { firstName: true, lastName: true, profileImage: true, gender: true },
        },
      },
    });
    if (!student) return err(res, "Student not found", 404);

    const enrollment = await prisma.studentEnrollment.findFirst({
      where:   { studentId, status: "ACTIVE" },
      include: {
        classSection: { select: { id: true, name: true, grade: true, section: true } },
        academicYear: { select: { id: true, name: true } },
      },
    });

    const academicYearId = enrollment?.academicYear?.id ?? null;
    const classSectionId = enrollment?.classSection?.id ?? null;

    const DAYS     = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
    const todayDay = DAYS[new Date().getDay()];

    const [
      timetableEntries,
      recentMarks,
      attendanceCounts,
      latestResult,
      upcomingExams,
      enrolledActivities,
      achievementsCount,
      awards,
      upcomingMeetings,
    ] = await Promise.all([
      classSectionId ? prisma.timetableEntry.findMany({
        where:   { classSectionId, day: todayDay },
        include: {
          subject:          { select: { name: true, code: true } },
          teacher:          { select: { firstName: true, lastName: true } },
          periodDefinition: { select: { startTime: true, endTime: true, label: true, slotType: true, order: true } },
        },
        orderBy: { periodDefinition: { order: "asc" } },
      }) : [],

      prisma.marks.findMany({
        where: {
          studentId,
          isAbsent: false,
          marksObtained: { not: null },
          schedule: { assessmentGroup: { isPublished: true } },
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
      }),

      academicYearId ? prisma.attendanceRecord.groupBy({
        by:    ["status"],
        where: { studentId, academicYearId },
        _count: { status: true },
      }) : [],

      academicYearId ? prisma.resultSummary.findFirst({
        where:   { studentId, academicYearId, isPublished: true },
        orderBy: { assessmentGroup: { createdAt: "desc" } },
        include: {
          term:            { select: { name: true } },
          assessmentGroup: { select: { name: true } },
        },
      }) : null,

      classSectionId ? prisma.assessmentSchedule.findMany({
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
      }) : [],

      academicYearId ? prisma.studentActivityEnrollment.count({
        where: { studentId, status: "ACTIVE", academicYearId },
      }) : 0,

      prisma.eventResult.count({
        where: {
          OR: [
            { studentId },
            { team: { members: { some: { studentId } } } },
          ],
        },
      }),

      academicYearId ? prisma.studentAward.findMany({
        where:   { studentId, academicYearId },
        include: { award: { select: { name: true, category: true } } },
        orderBy: { createdAt: "desc" },
        take:    3,
      }) : [],

      prisma.meetingStudent.findMany({
        where: {
          studentId,
          meeting: { meetingDate: { gte: new Date() }, status: "SCHEDULED" },
        },
        include: {
          meeting: {
            select: { id: true, title: true, meetingDate: true, startTime: true, type: true },
          },
        },
        orderBy: { meeting: { meetingDate: "asc" } },
        take:    3,
      }),
    ]);

    const attMap       = Object.fromEntries(attendanceCounts.map((r) => [r.status, r._count.status]));
    const totalDays    = Object.values(attMap).reduce((s, v) => s + v, 0);
    const presentDays  = (attMap.PRESENT ?? 0) + (attMap.LATE ?? 0) + (attMap.HALF_DAY ?? 0);
    const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

    const data = {
      student: {
        id:           student.id,
        name:         student.name,
        email:        student.email,
        firstName:    student.personalInfo?.firstName ?? student.name.split(" ")[0],
        lastName:     student.personalInfo?.lastName  ?? "",
        profileImage: student.personalInfo?.profileImage ?? null,
        gender:       student.personalInfo?.gender ?? null,
      },

      enrollment: enrollment ? {
        admissionNumber: enrollment.admissionNumber,
        rollNumber:      enrollment.rollNumber,
        status:          enrollment.status,
        classSection:    enrollment.classSection,
        academicYear:    enrollment.academicYear,
      } : null,

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

      recentMarks: recentMarks.map((m) => ({
        id:             m.id,
        subject:        m.schedule.subject.name,
        assessmentName: m.schedule.assessmentGroup.name,
        marksObtained:  m.marksObtained,
        maxMarks:       m.schedule.maxMarks,
        percentage:     m.schedule.maxMarks > 0
          ? Math.round((m.marksObtained / m.schedule.maxMarks) * 100)
          : null,
        date: m.updatedAt,
      })),

      attendance: {
        totalDays,
        presentDays,
        absentDays: attMap.ABSENT ?? 0,
        lateDays:   attMap.LATE   ?? 0,
        percentage: attendancePct,
      },

      latestResult: latestResult ? {
        percentage:      latestResult.percentage,
        grade:           latestResult.grade,
        totalMarks:      latestResult.totalMarks,
        maxMarks:        latestResult.maxMarks,
        termName:        latestResult.term?.name            ?? null,
        assessmentGroup: latestResult.assessmentGroup?.name ?? null,
      } : null,

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

      activities: { enrolled: enrolledActivities, achievements: achievementsCount },

      awards: awards.map((a) => ({
        id:       a.id,
        name:     a.award.name,
        category: a.award.category,
        remarks:  a.remarks ?? null,
        date:     a.createdAt,
      })),

      upcomingMeetings: upcomingMeetings.map((ms) => ({
        id:          ms.meeting.id,
        title:       ms.meeting.title,
        meetingDate: ms.meeting.meetingDate,
        startTime:   ms.meeting.startTime,
        type:        ms.meeting.type,
      })),
    };

    await cacheService.set(cacheKey, data);
    return ok(res, { data });
  } catch (e) {
    console.error("[student.getDashboard]", e);
    return err(res, e.message, 500);
  }
}