// server/src/staffControlls/dashboardController.js
import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

const prisma = new PrismaClient();

// ── GET /api/dashboard/summary ────────────────────────────────
export async function getDashboardSummary(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ error: "schoolId missing from token" });

    const cacheKey = await cacheService.buildKey(schoolId, "dashboard:summary");
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ ...JSON.parse(cached), fromCache: true });
    }

    // Today's date range (midnight → midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ── Run all queries in parallel ───────────────────────────
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      teachersByStatus,
      studentAttendanceToday,
      teacherAttendanceToday,
      totalClasses,
      activeAcademicYear,
      upcomingMeetings,
      recentStudents,
      recentTeachers,
      todayAbsentStudents,
    ] = await Promise.all([
      // 1. Total students
      prisma.student.count({ where: { schoolId, isActive: true } }),

      // 2. Active students (enrolled in active academic year)
      prisma.studentEnrollment.count({
        where: {
          classSection: { schoolId },
          status: "ACTIVE",
          academicYear: { isActive: true, schoolId },
        },
      }),

      // 3. Total teachers
      prisma.teacherProfile.count({ where: { schoolId } }),

      // 4. Teachers grouped by status
      prisma.teacherProfile.groupBy({
        by: ["status"],
        where: { schoolId },
        _count: { id: true },
      }),

      // 5. Student attendance today
      prisma.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          classSection: { schoolId },
          date: { gte: todayStart, lte: todayEnd },
        },
        _count: { id: true },
      }),

      // 6. Teacher attendance today
      prisma.teacherAttendance.groupBy({
        by: ["status"],
        where: {
          schoolId,
          date: { gte: todayStart, lte: todayEnd },
        },
        _count: { id: true },
      }),

      // 7. Total class sections
      prisma.classSection.count({ where: { schoolId } }),

      // 8. Active academic year
      prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true, name: true, startDate: true, endDate: true },
      }),

      // 9. Upcoming meetings (next 7 days)
      prisma.meeting.findMany({
        where: {
          schoolId,
          status: { in: ["SCHEDULED"] },
          meetingDate: {
            gte: todayStart,
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { meetingDate: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          meetingDate: true,
          startTime: true,
          endTime: true,
          venueDetail: true,
        },
      }),

      // 10. Recent students (last 5 enrolled)
      prisma.student.findMany({
        where: { schoolId, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          createdAt: true,
          enrollments: {
            where: { academicYear: { isActive: true, schoolId } },
            take: 1,
            select: {
              admissionNumber: true,
              status: true,
              classSection: { select: { name: true, grade: true } },
            },
          },
        },
      }),

      // 11. Recently added teachers (last 5)
      prisma.teacherProfile.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          designation: true,
          status: true,
          joiningDate: true,
          employmentType: true,
        },
      }),

      // 12. Today's absent students (for alert section)
      prisma.attendanceRecord.findMany({
        where: {
          classSection: { schoolId },
          date: { gte: todayStart, lte: todayEnd },
          status: "ABSENT",
        },
        take: 5,
        select: {
          student: { select: { id: true, name: true } },
          classSection: { select: { name: true, grade: true } },
        },
      }),
    ]);

    // ── Shape teacher status counts ───────────────────────────
    const teacherStatusMap = {};
    teachersByStatus.forEach((t) => {
      teacherStatusMap[t.status] = t._count.id;
    });

    // ── Shape student attendance counts ──────────────────────
    const studentAttMap = {};
    studentAttendanceToday.forEach((a) => {
      studentAttMap[a.status] = a._count.id;
    });

    // ── Shape teacher attendance counts ──────────────────────
    const teacherAttMap = {};
    teacherAttendanceToday.forEach((a) => {
      teacherAttMap[a.status] = a._count.id;
    });

    const summary = {
      students: {
        total: totalStudents,
        active: activeStudents,
      },
      teachers: {
        total: totalTeachers,
        active: teacherStatusMap["ACTIVE"] ?? 0,
        onLeave: teacherStatusMap["ON_LEAVE"] ?? 0,
        resigned: teacherStatusMap["RESIGNED"] ?? 0,
        terminated: teacherStatusMap["TERMINATED"] ?? 0,
      },
      studentAttendanceToday: {
        present: studentAttMap["PRESENT"] ?? 0,
        absent: studentAttMap["ABSENT"] ?? 0,
        late: studentAttMap["LATE"] ?? 0,
        halfDay: studentAttMap["HALF_DAY"] ?? 0,
        excused: studentAttMap["EXCUSED"] ?? 0,
        total:
          (studentAttMap["PRESENT"] ?? 0) +
          (studentAttMap["ABSENT"] ?? 0) +
          (studentAttMap["LATE"] ?? 0) +
          (studentAttMap["HALF_DAY"] ?? 0) +
          (studentAttMap["EXCUSED"] ?? 0),
      },
      teacherAttendanceToday: {
        present: teacherAttMap["PRESENT"] ?? 0,
        absent: teacherAttMap["ABSENT"] ?? 0,
        late: teacherAttMap["LATE"] ?? 0,
        onLeave: teacherAttMap["ON_LEAVE"] ?? 0,
        total:
          (teacherAttMap["PRESENT"] ?? 0) +
          (teacherAttMap["ABSENT"] ?? 0) +
          (teacherAttMap["LATE"] ?? 0) +
          (teacherAttMap["ON_LEAVE"] ?? 0),
      },
      totalClasses,
      activeAcademicYear,
      upcomingMeetings,
      recentStudents,
      recentTeachers,
      todayAbsentStudents,
      generatedAt: new Date().toISOString(),
    };

    // Cache for 5 minutes (dashboard data changes frequently)
    await cacheService.set(cacheKey, summary, 300);

    res.json({ ...summary, fromCache: false });
  } catch (err) {
    console.error("[getDashboardSummary]", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
}
