// server/src/student/controllers/timetableController.js
// ═══════════════════════════════════════════════════════════════
//  Student Timetable Controller
//  Returns the weekly timetable for the logged-in student's
//  active class section, grouped by day.
// ═══════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";

// ─── Day ordering ────────────────────────────────────────────
const DAY_ORDER = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

// ═══════════════════════════════════════════════════════════════
//  GET /timetable
//  Full weekly timetable for the student's current class section
// ═══════════════════════════════════════════════════════════════
export const getTimetable = async (req, res) => {
  try {
    const studentId =
      req.student?.id ??
      req.user?.id ??
      req.user?.studentId ??
      req.user?.userId ??
      null;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 1️⃣ Find active enrollment
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        academicYear: true,
        classSection: {
          include: {
            stream: { select: { name: true } },
            course: { select: { name: true } },
            school: { select: { name: true } },
          },
        },
      },
    });

    if (!enrollment) {
      return res
        .status(404)
        .json({ success: false, message: "No active enrollment found" });
    }

    // 2️⃣ Get timetable entries
    const entries = await prisma.timetableEntry.findMany({
      where: {
        classSectionId: enrollment.classSectionId,
        academicYearId: enrollment.academicYearId,
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        periodDefinition: {
          select: {
            startTime: true,
            endTime: true,
            slotType: true,
          },
        },
      },
      orderBy: [
        { day: "asc" },
        { periodDefinition: { startTime: "asc" } },
      ],
    });

    // 3️⃣ Group by day
    const grouped = {};

    for (const day of DAY_ORDER) {
      const daySlots = entries.filter((e) => e.day === day);

      if (daySlots.length > 0) {
        grouped[day] = daySlots.map((e) => ({
          id: e.id,
          startTime: e.periodDefinition.startTime,
          endTime: e.periodDefinition.endTime,
          slotType: e.periodDefinition.slotType,
          subject: e.subject
            ? {
                id: e.subject.id,
                name: e.subject.name,
                code: e.subject.code,
              }
            : null,
          teacher: e.teacher
            ? {
                id: e.teacher.id,
                name: `${e.teacher.firstName} ${e.teacher.lastName}`,
              }
            : null,
          roomNumber: null,
        }));
      }
    }

    const totalSlots = entries.length;
    const classSlots = entries.filter(
      (e) => e.periodDefinition.slotType === "PERIOD"
    ).length;

    const allStarts = entries
      .map((e) => e.periodDefinition.startTime)
      .sort();

    const allEnds = entries
      .map((e) => e.periodDefinition.endTime)
      .sort();

    return res.json({
      success: true,
      data: {
        enrollment: {
          className: enrollment.classSection.name,
          grade: enrollment.classSection.grade,
          section: enrollment.classSection.section,
          stream: enrollment.classSection.stream?.name ?? null,
          course: enrollment.classSection.course?.name ?? null,
          academicYear: enrollment.academicYear.name,
          schoolName: enrollment.classSection.school?.name ?? null,
        },
        timetable: grouped,
        days: Object.keys(grouped),
        stats: {
          workingDays: Object.keys(grouped).length,
          totalSlots,
          classSlots,
          dayStart: allStarts[0] ?? "08:00",
          dayEnd: allEnds[allEnds.length - 1] ?? "15:00",
        },
      },
    });
  } catch (err) {
    console.error("[getTimetable]", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET /timetable/today
//  Only today's periods — useful for dashboard widget
// ═══════════════════════════════════════════════════════════════
export const getTodayTimetable = async (req, res) => {
  try {
    // Debug — remove after confirming the correct property
    console.log("[timetable] req.user:", req.user);
    console.log("[timetable] req.student:", req.student);

    const studentId =
      req.student?.id       ??   // studentAuth middleware
      req.user?.id          ??   // general authMiddleware
      req.user?.studentId   ??   // some middlewares nest it here
      req.user?.userId      ??   // another common pattern
      null;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        debug: {
          hasUser:    !!req.user,
          hasStudent: !!req.student,
          userKeys:   req.user    ? Object.keys(req.user)    : [],
          studentKeys:req.student ? Object.keys(req.student) : [],
        },
      });
    }

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { academicYear: true, classSection: true },
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "No active enrollment found" });
    }

    // Today's day name in uppercase
    const todayName = new Date()
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase(); // "MONDAY", "TUESDAY", etc.

    const slots = await prisma.timetableEntry.findMany({
      where: {
        classSectionId: enrollment.classSectionId,
        academicYearId: enrollment.academicYearId,
        dayOfWeek:      todayName,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return res.json({
      success: true,
      data: {
        day: todayName,
        slots: slots.map((s) => ({
          id:         s.id,
          startTime:  s.startTime,
          endTime:    s.endTime,
          slotType:   s.slotType,
          subject:    s.subject ?? null,
          teacher:    s.teacher ?? null,
          roomNumber: s.roomNumber ?? null,
        })),
      },
    });
  } catch (err) {
    console.error("[getTodayTimetable]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};