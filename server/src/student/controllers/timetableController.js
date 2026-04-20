// server/src/student/controllers/timetableController.js
// ═══════════════════════════════════════════════════════════════
//  Student Timetable Controller  — Production Ready
//  Caching strategy:
//    • getTimetable      → cached 1 hour  (timetable rarely changes)
//    • getTodayTimetable → NOT cached     (semi real-time, changes daily)
// ═══════════════════════════════════════════════════════════════

import { prisma }       from "../../config/db.js";
import cacheService     from "../../utils/cacheService.js";

// ─── Constants ────────────────────────────────────────────────
const DAY_ORDER        = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const TIMETABLE_TTL    = 60 * 60; // 1 hour — timetable is stable, changes are admin-driven

// ─── Helpers ──────────────────────────────────────────────────

/** Resolve studentId from any middleware shape */
const resolveStudentId = (req) =>
  req.student?.id     ??
  req.user?.id        ??
  req.user?.studentId ??
  req.user?.userId    ??
  null;

/** Safe JSON parse — returns null on failure instead of throwing */
const safeParse = (str) => {
  try {
    return typeof str === "string" ? JSON.parse(str) : str;
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET /timetable
//  Full weekly timetable grouped by day
//  Cache: YES — TTL 1 hour
//  Invalidate: when admin updates timetable entries
// ═══════════════════════════════════════════════════════════════
export const getTimetable = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);
    const schoolId  = req.user?.schoolId;

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Enrollment needed before building the cache key
    const enrollment = await prisma.studentEnrollment.findFirst({
      where:   { studentId, status: "ACTIVE" },
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
      return res.status(404).json({ success: false, message: "No active enrollment found" });
    }

    // ── cache read ─────────────────────────────────────────────
    // Key scoped to student + section + year so a section reassignment
    // never serves the wrong timetable.
    const cacheKey = await cacheService.buildKey(
      schoolId,
      `student:timetable:${studentId}:${enrollment.classSectionId}:${enrollment.academicYearId}`
    );

    const cached = safeParse(await cacheService.get(cacheKey));
    if (cached) {
      return res.json({ success: true, data: cached });
    }
    // ──────────────────────────────────────────────────────────

    // ── db fetch ───────────────────────────────────────────────
    const entries = await prisma.timetableEntry.findMany({
      where: {
        classSectionId: enrollment.classSectionId,
        academicYearId: enrollment.academicYearId,
      },
      include: {
        subject:          { select: { id: true, name: true, code: true } },
        teacher:          { select: { id: true, firstName: true, lastName: true } },
        periodDefinition: { select: { startTime: true, endTime: true, slotType: true } },
      },
      orderBy: [
        { day: "asc" },
        { periodDefinition: { startTime: "asc" } },
      ],
    });

    // ── group by day ───────────────────────────────────────────
    const grouped = {};
    for (const day of DAY_ORDER) {
      const daySlots = entries.filter((e) => e.day === day);
      if (daySlots.length > 0) {
        grouped[day] = daySlots.map((e) => ({
          id:         e.id,
          startTime:  e.periodDefinition.startTime,
          endTime:    e.periodDefinition.endTime,
          slotType:   e.periodDefinition.slotType,
          subject:    e.subject
            ? { id: e.subject.id, name: e.subject.name, code: e.subject.code }
            : null,
          teacher:    e.teacher
            ? { id: e.teacher.id, name: `${e.teacher.firstName} ${e.teacher.lastName}` }
            : null,
          roomNumber: null,
        }));
      }
    }

    const totalSlots = entries.length;
    const classSlots = entries.filter((e) => e.periodDefinition.slotType === "PERIOD").length;
    const allStarts  = entries.map((e) => e.periodDefinition.startTime).sort();
    const allEnds    = entries.map((e) => e.periodDefinition.endTime).sort();

    const data = {
      enrollment: {
        className:    enrollment.classSection.name,
        grade:        enrollment.classSection.grade,
        section:      enrollment.classSection.section,
        stream:       enrollment.classSection.stream?.name  ?? null,
        course:       enrollment.classSection.course?.name  ?? null,
        academicYear: enrollment.academicYear.name,
        schoolName:   enrollment.classSection.school?.name  ?? null,
      },
      timetable: grouped,
      days:      Object.keys(grouped),
      stats: {
        workingDays: Object.keys(grouped).length,
        totalSlots,
        classSlots,
        dayStart:    allStarts[0]                ?? "08:00",
        dayEnd:      allEnds[allEnds.length - 1] ?? "15:00",
      },
    };

    // ── cache write (1 hour TTL) ───────────────────────────────
    await cacheService.set(cacheKey, data, TIMETABLE_TTL);

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getTimetable]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET /timetable/today
//  Only today's periods — dashboard widget
//
//  Cache: NO — intentionally skipped.
//  Reason: "today" changes every midnight. Caching adds complexity
//  (day-based TTL, midnight expiry) with minimal gain since this
//  is a lightweight single-day query. Keeping it cache-free ensures
//  the widget always reflects the correct day without edge cases.
// ═══════════════════════════════════════════════════════════════
export const getTodayTimetable = async (req, res) => {
  try {
    const studentId = resolveStudentId(req);

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const enrollment = await prisma.studentEnrollment.findFirst({
      where:   { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { academicYear: true, classSection: true },
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "No active enrollment found" });
    }

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
          subject:    s.subject    ?? null,
          teacher:    s.teacher    ?? null,
          roomNumber: s.roomNumber ?? null,
        })),
      },
    });
  } catch (err) {
    console.error("[getTodayTimetable]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ═══════════════════════════════════════════════════════════════
//  CACHE INVALIDATION HELPER
//  Call this from the admin timetable controller on any
//  create / update / delete of a timetable entry.
//
//  Usage (admin controller):
//    import { invalidateTimetableCache } from "../student/controllers/timetableController.js";
//    await invalidateTimetableCache(schoolId);
// ═══════════════════════════════════════════════════════════════
export const invalidateTimetableCache = async (schoolId) => {
  // School-wide version bump stales ALL buildKey()-based entries
  // for this school in one atomic increment — including timetable,
  // marks, profile, certificates, etc.
  await cacheService.invalidateSchool(schoolId);
};