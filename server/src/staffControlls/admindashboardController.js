// server/src/staffControlls/admindashboardController.js
import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

import { prisma } from "../config/db.js";

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

    // ── Today's date range ────────────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // FIX: Fetch active academic year first (one fast indexed lookup).
    // We use its id as a direct FK filter in 4 queries below, replacing
    // relation-traversal joins (classSection.schoolId, academicYear.isActive)
    // that were causing full table scans.
    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    const activeYearId = activeAcademicYear?.id;

    // ── All remaining queries in parallel ─────────────────────────────────────
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      teachersByStatus,
      studentPresentToday,
      studentAbsentToday,
      teacherPresentToday,
      teacherAbsentToday,
      totalClasses,
      upcomingMeetings,
      recentStudents,
      recentTeachers,
      todayAbsentStudents,
    ] = await Promise.all([

      // 1. Total students
      prisma.student.count({
        where: { schoolId, isActive: true },
      }),

      // 2. Active enrollments
      activeYearId
        ? prisma.studentEnrollment.count({
            where: { academicYearId: activeYearId, status: "ACTIVE" },
          })
        : Promise.resolve(0),

      // 3. Total teachers
      prisma.teacherProfile.count({ where: { schoolId } }),

      // 4. Teachers by status (for the teachers summary card)
      prisma.teacherProfile.groupBy({
        by: ["status"],
        where: { schoolId },
        _count: { id: true },
      }),

      // 5. Student present count today
      activeYearId
        ? prisma.attendanceRecord.count({
            where: {
              academicYearId: activeYearId,
              date: { gte: todayStart, lte: todayEnd },
              status: "PRESENT",
            },
          })
        : Promise.resolve(0),

      // 6. Student absent count today
      activeYearId
        ? prisma.attendanceRecord.count({
            where: {
              academicYearId: activeYearId,
              date: { gte: todayStart, lte: todayEnd },
              status: "ABSENT",
            },
          })
        : Promise.resolve(0),

      // 7. Teacher present count today
      prisma.teacherAttendance.count({
        where: {
          schoolId,
          date: { gte: todayStart, lte: todayEnd },
          status: "PRESENT",
        },
      }),

      // 8. Teacher absent count today
      prisma.teacherAttendance.count({
        where: {
          schoolId,
          date: { gte: todayStart, lte: todayEnd },
          status: "ABSENT",
        },
      }),

      // 9. Total class sections
      prisma.classSection.count({ where: { schoolId } }),

      // 8. Upcoming meetings — unchanged
      prisma.meeting.findMany({
        where: {
          schoolId,
          status: { in: ["SCHEDULED"] },
          meetingDate: { gte: todayStart, lte: weekEnd },
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

      // 9. Recent students
      // was: nested enrollments filtered via academicYear: { isActive, schoolId } (join)
      // now: academicYearId direct FK
      prisma.student.findMany({
        where: { schoolId, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          createdAt: true,
          enrollments: activeYearId
            ? {
                where: { academicYearId: activeYearId },
                take: 1,
                select: {
                  admissionNumber: true,
                  status: true,
                  classSection: { select: { name: true, grade: true } },
                },
              }
            : { take: 0 },
        },
      }),

      // 10. Recent teachers — unchanged
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

      // 11. Today's absent students
      // was: classSection: { schoolId } (join scan)
      // now: academicYearId direct indexed FK
      activeYearId
        ? prisma.attendanceRecord.findMany({
            where: {
              academicYearId: activeYearId,
              date: { gte: todayStart, lte: todayEnd },
              status: "ABSENT",
            },
            take: 5,
            select: {
              student: { select: { id: true, name: true } },
              classSection: { select: { name: true, grade: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    // ── Shape counts ──────────────────────────────────────────────────────────
    const teacherStatusMap = Object.fromEntries(
      teachersByStatus.map((t) => [t.status, t._count.id])
    );

    const summary = {
      students: {
        total: totalStudents,
        active: activeStudents,
      },
      teachers: {
        total:      totalTeachers,
        active:     teacherStatusMap["ACTIVE"]     ?? 0,
        onLeave:    teacherStatusMap["ON_LEAVE"]   ?? 0,
        resigned:   teacherStatusMap["RESIGNED"]   ?? 0,
        terminated: teacherStatusMap["TERMINATED"] ?? 0,
      },
      studentAttendanceToday: {
        present: studentPresentToday,
        absent:  studentAbsentToday,
        total:   studentPresentToday + studentAbsentToday,
      },
      teacherAttendanceToday: {
        present: teacherPresentToday,
        absent:  teacherAbsentToday,
        total:   teacherPresentToday + teacherAbsentToday,
      },
      totalClasses,
      activeAcademicYear,
      upcomingMeetings,
      recentStudents,
      recentTeachers,
      todayAbsentStudents,
      generatedAt: new Date().toISOString(),
    };

    // FIX: Don't await the cache write — fire and forget so the response
    // goes out immediately without waiting for the Redis SET round-trip.
    cacheService.set(cacheKey, summary, 300);

    res.json({ ...summary, fromCache: false });
  } catch (err) {
    console.error("[getDashboardSummary]", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
}