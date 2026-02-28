// server/src/staffControlls/extraClassController.js
import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

const prisma = new PrismaClient();

// ── Time overlap helper ───────────────────────────────────────────────────────
// Returns true if [s1, e1) overlaps [s2, e2)  (times as "HH:MM" strings)
function timesOverlap(s1, e1, s2, e2) {
  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/class-sections/:id/extra-classes?academicYearId=xxx
// Returns all extra classes for one section in one year
// ─────────────────────────────────────────────────────────────────────────────
export const getExtraClasses = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id: classSectionId } = req.params;
    const { academicYearId } = req.query;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const key = await cacheService.buildKey(
      schoolId,
      `extra-classes:section:${classSectionId}:${academicYearId}`,
    );

    const cached = await cacheService.get(key);
    if (cached)
      return res.json({ extraClasses: JSON.parse(cached), fromCache: true });

    const extraClasses = await prisma.extraClass.findMany({
      where: { schoolId, classSectionId, academicYearId, isActive: true },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            profileImage: true,
          },
        },
      },
      orderBy: [
        { recurringDay: "asc" },
        { specificDate: "asc" },
        { startTime: "asc" },
      ],
    });

    await cacheService.set(key, extraClasses);
    return res.json({ extraClasses });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/class-sections/extra-classes/overview?academicYearId=xxx
// Admin overview — all extra classes across ALL sections for a given year
// ─────────────────────────────────────────────────────────────────────────────
export const getAllExtraClassesOverview = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYearId } = req.query;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });
    const key = await cacheService.buildKey(
      schoolId,
      `extra-classes:all:${academicYearId}`,
    );

    const cached = await cacheService.get(key);
    if (cached)
      return res.json({ extraClasses: JSON.parse(cached), fromCache: true });

    const extraClasses = await prisma.extraClass.findMany({
      where: { schoolId, academicYearId, isActive: true },
      include: {
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
        subject: { select: { id: true, name: true, code: true } },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
      },
      orderBy: [
        { recurringDay: "asc" },
        { specificDate: "asc" },
        { startTime: "asc" },
      ],
    });
    await cacheService.set(key, extraClasses);
    return res.json({ extraClasses });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/class-sections/:id/extra-classes
// body: { academicYearId, subjectId, teacherId, type, reason?,
//         recurringDays?: string[]  — ["MONDAY","WEDNESDAY","FRIDAY"]
//         recurringDay?:  string    — single day (backwards compat)
//         specificDate?:  string    — ISO date (one-time session)
//         startTime, endTime }
// When recurringDays has multiple entries → creates one row per day in a tx
// ─────────────────────────────────────────────────────────────────────────────
export const createExtraClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id: classSectionId } = req.params;
    const {
      academicYearId,
      subjectId,
      teacherId,
      type,
      reason,
      recurringDays,
      recurringDay,
      specificDate,
      startTime,
      endTime,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!academicYearId || !subjectId || !teacherId || !startTime || !endTime)
      return res.status(400).json({
        message:
          "academicYearId, subjectId, teacherId, startTime and endTime are required",
      });

    // Normalise: prefer recurringDays array, fallback to single recurringDay
    const daysArray =
      Array.isArray(recurringDays) && recurringDays.length > 0
        ? recurringDays
        : recurringDay
          ? [recurringDay]
          : [];

    if (daysArray.length === 0 && !specificDate)
      return res
        .status(400)
        .json({ message: "Either recurringDays or specificDate is required" });

    if (daysArray.length > 0 && specificDate)
      return res.status(400).json({
        message: "Provide only one of recurringDays or specificDate, not both",
      });

    // ── Verify class section belongs to school ───────────────────────────────
    const section = await prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
    });
    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    // ── Teacher conflict detection (check each day in the array) ─────────────
    const conflicts = [];
    for (const day of daysArray) {
      const existingSlots = await prisma.extraClass.findMany({
        where: {
          schoolId,
          teacherId,
          academicYearId,
          isActive: true,
          recurringDay: day,
        },
        include: { classSection: { select: { name: true } } },
      });
      const hit = existingSlots.find((ec) =>
        timesOverlap(startTime, endTime, ec.startTime, ec.endTime),
      );
      if (hit)
        conflicts.push({
          day,
          classSectionName: hit.classSection.name,
          startTime: hit.startTime,
          endTime: hit.endTime,
        });
    }
    // Also check specificDate if provided
    if (specificDate) {
      const existingSlots = await prisma.extraClass.findMany({
        where: {
          schoolId,
          teacherId,
          academicYearId,
          isActive: true,
          specificDate: new Date(specificDate),
        },
        include: { classSection: { select: { name: true } } },
      });
      const hit = existingSlots.find((ec) =>
        timesOverlap(startTime, endTime, ec.startTime, ec.endTime),
      );
      if (hit)
        conflicts.push({
          day: "specific",
          classSectionName: hit.classSection.name,
          startTime: hit.startTime,
          endTime: hit.endTime,
        });
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: `Teacher conflict detected on ${conflicts.map((c) => c.day).join(", ")}`,
        conflicts,
      });
    }

    // ── Create one row per day (or one row for specific date) ─────────────────
    const rowsToCreate =
      daysArray.length > 0
        ? daysArray.map((day) => ({
            schoolId,
            academicYearId,
            classSectionId,
            subjectId,
            teacherId,
            type: type || "OTHER",
            reason: reason || null,
            recurringDay: day,
            specificDate: null,
            startTime,
            endTime,
          }))
        : [
            {
              schoolId,
              academicYearId,
              classSectionId,
              subjectId,
              teacherId,
              type: type || "OTHER",
              reason: reason || null,
              recurringDay: null,
              specificDate: new Date(specificDate),
              startTime,
              endTime,
            },
          ];

    const created = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const row of rowsToCreate) {
        const ec = await tx.extraClass.create({
          data: row,
          include: {
            subject: { select: { id: true, name: true, code: true } },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                profileImage: true,
              },
            },
          },
        });
        results.push(ec);
      }
      return results;
    });
    await cacheService.invalidateSchool(schoolId);
    return res.status(201).json({
      message: `${created.length} extra class${created.length > 1 ? "es" : ""} created`,
      extraClasses: created,
      // Also expose single for backwards compat with callers expecting `extraClass`
      extraClass: created[0],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/class-sections/:id/extra-classes/:extraClassId
// Updates a single existing row — day/days can be changed
// ─────────────────────────────────────────────────────────────────────────────
export const updateExtraClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id: classSectionId, extraClassId } = req.params;
    const {
      academicYearId,
      subjectId,
      teacherId,
      type,
      reason,
      recurringDays,
      recurringDay,
      specificDate,
      startTime,
      endTime,
    } = req.body;

    // ── Find existing record ─────────────────────────────────────────────────
    const existing = await prisma.extraClass.findFirst({
      where: { id: extraClassId, schoolId, classSectionId },
    });
    if (!existing)
      return res.status(404).json({ message: "Extra class not found" });

    // Normalise day input — for edit we only update this single row's recurringDay
    // If admin selected multiple new days, we update this row to the first day
    // (the others would need separate rows — handled at UI level via bulk create)
    const daysArray =
      Array.isArray(recurringDays) && recurringDays.length > 0
        ? recurringDays
        : recurringDay
          ? [recurringDay]
          : [];

    if (daysArray.length === 0 && !specificDate)
      return res
        .status(400)
        .json({ message: "Either recurringDays or specificDate is required" });

    if (daysArray.length > 0 && specificDate)
      return res.status(400).json({
        message: "Provide only one of recurringDays or specificDate, not both",
      });

    // Use first selected day for this row's recurringDay
    const resolvedDay = daysArray.length > 0 ? daysArray[0] : null;
    const resolvedAcademicYearId = academicYearId || existing.academicYearId;
    const resolvedTeacherId = teacherId || existing.teacherId;
    const resolvedStart = startTime || existing.startTime;
    const resolvedEnd = endTime || existing.endTime;

    // ── Teacher conflict check (exclude self) ────────────────────────────────
    if (resolvedDay || specificDate) {
      const conflictWhere = {
        schoolId,
        teacherId: resolvedTeacherId,
        academicYearId: resolvedAcademicYearId,
        isActive: true,
        id: { not: extraClassId },
        ...(resolvedDay
          ? { recurringDay: resolvedDay }
          : { specificDate: new Date(specificDate) }),
      };

      const existingTeacherSlots = await prisma.extraClass.findMany({
        where: conflictWhere,
        include: { classSection: { select: { name: true } } },
      });

      const conflictSlot = existingTeacherSlots.find((ec) =>
        timesOverlap(resolvedStart, resolvedEnd, ec.startTime, ec.endTime),
      );

      if (conflictSlot) {
        return res.status(409).json({
          message: `Teacher conflict with ${conflictSlot.classSection.name} at this time`,
          conflict: {
            classSectionName: conflictSlot.classSection.name,
            startTime: conflictSlot.startTime,
            endTime: conflictSlot.endTime,
          },
        });
      }
    }

    // ── Update ───────────────────────────────────────────────────────────────
    const updated = await prisma.extraClass.update({
      where: { id: extraClassId },
      data: {
        ...(subjectId && { subjectId }),
        ...(teacherId && { teacherId }),
        ...(type && { type }),
        reason: reason !== undefined ? reason : existing.reason,
        recurringDay: resolvedDay,
        specificDate: specificDate ? new Date(specificDate) : null,
        startTime: resolvedStart,
        endTime: resolvedEnd,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            profileImage: true,
          },
        },
      },
    });
    await cacheService.invalidateSchool(schoolId);

    return res.json({ message: "Extra class updated", extraClass: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/class-sections/:id/extra-classes/:extraClassId
// Soft delete (sets isActive = false)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteExtraClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id: classSectionId, extraClassId } = req.params;

    const existing = await prisma.extraClass.findFirst({
      where: { id: extraClassId, schoolId, classSectionId },
    });
    if (!existing)
      return res.status(404).json({ message: "Extra class not found" });

    await prisma.extraClass.update({
      where: { id: extraClassId },
      data: { isActive: false },
    });
    await cacheService.invalidateSchool(schoolId);
    return res.json({ message: "Extra class removed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
