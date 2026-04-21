// server/src/staffControlls/timetableEntryController.js
import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";
import { prisma } from "../config/db.js";
// ═══════════════════════════════════════════════════════════════
//  GET TIMETABLE ENTRIES
//  GET /class-sections/:id/timetable?academicYearId=xxx
// ═══════════════════════════════════════════════════════════════

export const getTimetableEntries = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id: classSectionId } = req.params;
    const { academicYearId } = req.query;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    // ── Cache check ──────────────────────────────────────────
    const namespace = `timetable-entries:${schoolId}:${classSectionId}:${academicYearId}`;
    const key = await cacheService.buildKey(schoolId, namespace);
    const cached = await cacheService.get(key);
    if (cached)
      return res.json({ entries: JSON.parse(cached), fromCache: true });

    // ── DB fetch ─────────────────────────────────────────────
    const entries = await prisma.timetableEntry.findMany({
      where: { classSectionId, academicYearId, schoolId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            profileImage: true,
          },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        // ✅ NEW: periodDefinition instead of periodSlot
        periodDefinition: {
          select: {
            id: true,
            periodNumber: true,
            label: true,
            slotType: true,
            dayType: true,
            startTime: true,
            endTime: true,
            order: true,
          },
        },
      },
      orderBy: [
        { day: "asc" },
        { periodDefinition: { order: "asc" } }, // ✅ order by period order
      ],
    });

    await cacheService.set(key, entries);
    return res.json({ entries });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  SAVE TIMETABLE ENTRIES
//  POST /class-sections/:id/timetable
//
//  Body:
//  {
//    academicYearId: "xxx",
//    entries: [
//      {
//        day: "MONDAY",
//        periodDefinitionId: "xxx",   ✅ NEW (was periodSlotId)
//        subjectId: "xxx",
//        teacherId: "xxx"
//      }
//    ]
//  }
//
//  KEY RULES:
//  ✅ Only deletes entries for THIS class + year (not all classes)
//  ✅ Validates day matches periodDefinition.dayType
//  ✅ Detects teacher conflicts across classes
//  ✅ Auto upserts TeacherAssignment
// ═══════════════════════════════════════════════════════════════

export const saveTimetableEntries = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id: classSectionId } = req.params;
    const { academicYearId, entries } = req.body;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });
    if (!Array.isArray(entries))
      return res.status(400).json({ message: "entries must be an array" });

    // ── Validate class section belongs to school ─────────────
    const section = await prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
    });
    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    // ── Validate periodDefinitionIds exist + day matches dayType ──
    // e.g. SATURDAY entry must use a SATURDAY periodDefinition
    const periodDefIds = [...new Set(entries.map((e) => e.periodDefinitionId))];
    const periodDefs = await prisma.periodDefinition.findMany({
      where: { id: { in: periodDefIds } },
      select: { id: true, dayType: true, label: true },
    });
    const periodDefMap = new Map(periodDefs.map((p) => [p.id, p]));

    const SATURDAY_DAYS = ["SATURDAY"];
    const WEEKDAY_DAYS = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
    ];

    const dayMismatch = [];
    for (const entry of entries) {
      const def = periodDefMap.get(entry.periodDefinitionId);
      if (!def) {
        return res.status(400).json({
          message: `PeriodDefinition ${entry.periodDefinitionId} not found`,
        });
      }
      // Validate day type matches
      const isSaturdayDay = SATURDAY_DAYS.includes(entry.day);
      const isSaturdayDef = def.dayType === "SATURDAY";
      if (isSaturdayDay !== isSaturdayDef) {
        dayMismatch.push({
          day: entry.day,
          periodDefinitionId: entry.periodDefinitionId,
          label: def.label,
          message: `Day ${entry.day} cannot use ${def.dayType} period definition`,
        });
      }
    }
    if (dayMismatch.length > 0) {
      return res.status(400).json({
        message: "Day and period definition type mismatch",
        dayMismatch,
      });
    }

    // ── Teacher conflict detection ───────────────────────────
    // Same teacher cannot be in two classes at same day + same period
    const conflicts = [];
    for (const entry of entries) {
      const conflict = await prisma.timetableEntry.findFirst({
        where: {
          schoolId,
          academicYearId,
          day: entry.day,
          periodDefinitionId: entry.periodDefinitionId, // ✅ NEW
          teacherId: entry.teacherId,
          NOT: { classSectionId }, // exclude current class
        },
        include: {
          classSection: { select: { name: true } },
        },
      });
      if (conflict) {
        conflicts.push({
          day: entry.day,
          periodDefinitionId: entry.periodDefinitionId,
          teacherId: entry.teacherId,
          conflictingClass: conflict.classSection.name,
        });
      }
    }
    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "Teacher conflict detected",
        conflicts,
      });
    }

    // ── Save inside transaction ──────────────────────────────
    const saved = await prisma.$transaction(async (tx) => {
      // Delete ONLY this class's entries for this year
      // Other classes are completely untouched ✅
      await tx.timetableEntry.deleteMany({
        where: { classSectionId, academicYearId, schoolId },
      });

      if (entries.length === 0) return [];

      // Create all entries
      await tx.timetableEntry.createMany({
        data: entries.map((e) => ({
          schoolId,
          academicYearId,
          classSectionId,
          day: e.day,
          periodDefinitionId: e.periodDefinitionId, // ✅ NEW
          configId: e.configId, // ✅ pass configId from frontend
          subjectId: e.subjectId,
          teacherId: e.teacherId,
        })),
      });

      // Auto upsert TeacherAssignment
      const seen = new Set();
      for (const e of entries) {
        const k = `${e.teacherId}:${e.subjectId}`;
        if (seen.has(k)) continue;
        seen.add(k);
        await tx.teacherAssignment.upsert({
          where: {
            classSectionId_subjectId_academicYearId: {
              classSectionId,
              subjectId: e.subjectId,
              academicYearId,
            },
          },
          update: { teacherId: e.teacherId },
          create: {
            teacherId: e.teacherId,
            classSectionId,
            subjectId: e.subjectId,
            academicYearId,
          },
        });
      }

      // Return saved entries with full details
      return tx.timetableEntry.findMany({
        where: { classSectionId, academicYearId, schoolId },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
          subject: { select: { id: true, name: true, code: true } },
          periodDefinition: {
            // ✅ NEW
            select: {
              id: true,
              periodNumber: true,
              label: true,
              slotType: true,
              dayType: true,
              startTime: true,
              endTime: true,
              order: true,
            },
          },
        },
        orderBy: [{ day: "asc" }, { periodDefinition: { order: "asc" } }],
      });
    });

    await cacheService.invalidateSchool(schoolId);
    return res.json({ message: "Timetable saved", entries: saved });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  DELETE SINGLE TIMETABLE ENTRY
//  DELETE /class-sections/:id/timetable/entry/:entryId
// ═══════════════════════════════════════════════════════════════

export const deleteTimetableEntry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id: classSectionId, entryId } = req.params;

    const entry = await prisma.timetableEntry.findFirst({
      where: { id: entryId, schoolId, classSectionId },
    });
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    await prisma.timetableEntry.delete({ where: { id: entryId } });

    await cacheService.invalidateSchool(schoolId);
    return res.json({ message: "Entry removed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
