// server/src/staffControlls/timetableEntryController.js
import XLSX from "xlsx";
import { prisma } from "../config/db.js";
import cacheService from "../utils/cacheService.js";
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
//  ⚠️ Teacher double-booking is ALLOWED (reported, never blocked)
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

    // ── Teacher double-booking check (NON-BLOCKING) ──────────
    // A teacher IS allowed to be assigned to more than one class in
    // the same day + period. We no longer reject the save — we only
    // collect the overlaps and hand them back as informational
    // warnings so the UI can surface them if it wants to.
    let teacherOverlaps = [];
    try {
      const teacherEntries = entries.filter((e) => e.teacherId);

      if (teacherEntries.length > 0) {
        // Single query instead of one-per-entry
        const existing = await prisma.timetableEntry.findMany({
          where: {
            schoolId,
            academicYearId,
            NOT: { classSectionId }, // ignore this class's own rows
            day: { in: [...new Set(teacherEntries.map((e) => e.day))] },
            periodDefinitionId: {
              in: [...new Set(teacherEntries.map((e) => e.periodDefinitionId))],
            },
            teacherId: {
              in: [...new Set(teacherEntries.map((e) => e.teacherId))],
            },
          },
          select: {
            day: true,
            periodDefinitionId: true,
            teacherId: true,
            classSection: { select: { name: true } },
          },
        });

        // "day:periodDefinitionId:teacherId" -> [other class names]
        const busyMap = new Map();
        for (const row of existing) {
          const k = `${row.day}:${row.periodDefinitionId}:${row.teacherId}`;
          if (!busyMap.has(k)) busyMap.set(k, []);
          busyMap.get(k).push(row.classSection?.name || "Unknown class");
        }

        teacherOverlaps = teacherEntries
          .map((e) => {
            const k = `${e.day}:${e.periodDefinitionId}:${e.teacherId}`;
            const alsoIn = busyMap.get(k);
            if (!alsoIn?.length) return null;
            return {
              day: e.day,
              periodDefinitionId: e.periodDefinitionId,
              periodLabel: periodDefMap.get(e.periodDefinitionId)?.label || null,
              teacherId: e.teacherId,
              alsoAssignedIn: [...new Set(alsoIn)],
            };
          })
          .filter(Boolean);
      }
    } catch {
      // Advisory only — never let this break the save
      teacherOverlaps = [];
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
          teacherId: e.teacherId || null,
        })),
      });

      // Auto upsert TeacherAssignment
      const seen = new Set();
      for (const e of entries) {
          if (!e.teacherId) continue;
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
            teacherId: e.teacherId || null,
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
    return res.json({
      message: "Timetable saved",
      entries: saved,
      teacherOverlaps,
      ...(teacherOverlaps.length > 0 && {
        warning: `Saved. ${teacherOverlaps.length} period(s) have a teacher who is also assigned to another class at the same time.`,
      }),
    });
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

   await prisma.timetableEntry.update({
  where: { id: entryId },

  data: {
    deletedAt: new Date(),
  },
});

    await cacheService.invalidateSchool(schoolId);
    return res.json({ message: "Entry removed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const bulkUploadTimetable = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id: classSectionId } = req.params;
    const { academicYearId } = req.body;

    if (!req.file)
      return res.status(400).json({ message: "Excel file required" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const config = await prisma.timetableConfig.findFirst({
      where: { schoolId, academicYearId },
      include: {
        periodDefinitions: {
          where: { slotType: "PERIOD" }, // periods only, no breaks
          orderBy: { order: "asc" },
        },
      },
    });

    if (!config)
      return res.status(404).json({ message: "Timetable config not found" });

    // ✅ Split into weekday vs saturday period arrays
    const weekdayPeriods = config.periodDefinitions
      .filter((d) => d.dayType === "WEEKDAY")
      .sort((a, b) => a.order - b.order);
    const saturdayPeriods = config.periodDefinitions
      .filter((d) => d.dayType === "SATURDAY")
      .sort((a, b) => a.order - b.order);

    const subjects = await prisma.subject.findMany({ where: { schoolId } });
    const teachers = await prisma.teacherProfile.findMany({ where: { schoolId } });

    const VALID_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const entries = [];

    // ✅ Start from row 1 — row 0 is CLASS NAME marker (skipped as invalid day)
    //    row 1 = header (skipped), row 2 = timings (skipped), row 3+ = data
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const day = String(row[0] || "").trim().toUpperCase();

      if (!day || !VALID_DAYS.includes(day)) continue; // skip header/timing/blank rows

      // ✅ Use correct period array based on day
      const periodSlots = day === "SATURDAY" && saturdayPeriods.length > 0
        ? saturdayPeriods
        : weekdayPeriods;

          const totalExcelPeriods = row.length - 1; // minus the DAY column

    for (let col = 1; col <= totalExcelPeriods; col++) {
      const raw = row[col];
      if (!raw) continue;

      const lines = String(raw).split("\n").map((x) => x.trim()).filter(Boolean);
      const subjectName = lines[0];
      const teacherName = lines[1] || null;

      const subject = subjects.find(
        (s) => s.name.toLowerCase() === subjectName.toLowerCase()
      );
      if (!subject) continue;

      let teacher = null;
      if (teacherName) {
        teacher = teachers.find(
          (t) =>
            `${t.firstName} ${t.lastName}`.toLowerCase().trim() ===
            teacherName.toLowerCase().trim()
        );
      }

      // col-1 maps directly to periodSlots index (no breaks in array)
      const period = periodSlots[col - 1];
      if (!period) {
        // No period definition exists in DB config for this column — skipping
        console.warn(`No period definition found for column ${col} (${day}) — add it to timetable config`);
        continue; // silently skip instead of crashing
      }

      entries.push({
        schoolId,
        academicYearId,
        classSectionId,
        configId: config.id,
        periodDefinitionId: period.id,
        day,
        subjectId: subject.id,
        teacherId: teacher?.id || null,
      });
    }



    }

    await prisma.$transaction(async (tx) => {
      await tx.timetableEntry.deleteMany({ where: { schoolId, academicYearId, classSectionId } });
      await tx.timetableEntry.createMany({ data: entries });
    });

    await cacheService.invalidateSchool(schoolId);
    return res.json({
      success: true,
      count: entries.length,
      message: "Timetable uploaded successfully",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};