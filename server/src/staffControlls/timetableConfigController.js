// server/src/staffControlls/timetableConfigController.js
import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════
//  BUILD PERIOD DEFINITIONS
//  Converts frontend config → array of PeriodDefinition rows
//
//  Input config shape:
//  {
//    startTime: "08:00",
//    totalPeriods: 7,
//    periodDuration: 45,
//    breaks: [
//      { afterPeriod: 2, label: "Short Break", duration: 10, type: "SHORT_BREAK" },
//      { afterPeriod: 4, label: "Lunch Break", duration: 30, type: "LUNCH_BREAK" },
//    ]
//  }
// ═══════════════════════════════════════════════════════════════

function buildPeriodDefinitions(config, dayType) {
  const definitions = [];
  let order = 1;
  let cursor = timeToMinutes(config.startTime);
  const breakMap = {};
  (config.breaks || []).forEach((b) => (breakMap[b.afterPeriod] = b));

  for (let i = 1; i <= config.totalPeriods; i++) {
    definitions.push({
      periodNumber: i,
      label: dayType === "SATURDAY" ? `Sat Period ${i}` : `Period ${i}`,
      slotType: "PERIOD",
      dayType,
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + config.periodDuration),
      order: order++,
    });
    cursor += config.periodDuration;

    // Insert break after this period if defined
    if (breakMap[i]) {
      const brk = breakMap[i];
      // Breaks use periodNumber = 0 + order as identifier
      // We store them with a negative periodNumber convention:
      // e.g. break after period 2 → periodNumber = -(2) stored as break
      // But since @@unique([configId, periodNumber, dayType]) needs to be unique
      // we use a large offset for breaks: 100 + afterPeriod
      definitions.push({
        periodNumber: 100 + i, // e.g. break after period 2 → periodNumber 102
        // label: dayType === "SATURDAY" ? `Sat ${brk.label}` : brk.label,
        label:
          dayType === "SATURDAY"
            ? `Sat ${brk.label.replace(/^(Sat )+/i, "")}`
            : brk.label.replace(/^(Sat )+/i, ""),

        slotType: brk.type || "SHORT_BREAK",
        dayType,
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + brk.duration),
        order: order++,
      });
      cursor += brk.duration;
    }
  }

  return definitions;
}

// ═══════════════════════════════════════════════════════════════
//  GET TIMETABLE CONFIG
//  GET /timetable/config?academicYearId=xxx
// ═══════════════════════════════════════════════════════════════

export const getTimetableConfig = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYearId } = req.query;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    // Cache check
    const namespace = `timetable-config:${schoolId}:${academicYearId}`;
    const key = await cacheService.buildKey(schoolId, namespace);
    const cached = await cacheService.get(key);
    if (cached)
      return res.json({ config: JSON.parse(cached), fromCache: true });

    // DB fetch — use new periodDefinitions relation
    const config = await prisma.timetableConfig.findUnique({
      where: { schoolId_academicYearId: { schoolId, academicYearId } },
      include: {
        periodDefinitions: {
          orderBy: { order: "asc" },
        },
      },
    });

    await cacheService.set(key, config ?? null);
    return res.json({ config: config || null });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  SAVE TIMETABLE CONFIG
//  POST /timetable/config
//
//  Body:
//  {
//    academicYearId: "xxx",
//    weekday: {
//      startTime: "08:00",
//      totalPeriods: 7,
//      periodDuration: 45,
//      breaks: [...]
//    },
//    saturday: {           ← optional, only if satSameAsWeekday=false
//      startTime: "09:00",
//      totalPeriods: 5,
//      periodDuration: 45,
//      breaks: [...]
//    },
//    satSameAsWeekday: false
//  }
//
//  KEY RULES:
//  ✅ NEVER delete PeriodDefinition rows that have TimetableEntries
//  ✅ UPSERT by (configId, periodNumber, dayType) — update time only
//  ✅ Only delete periods with NO entries (safe to remove)
//  ✅ TimetableEntry rows are NEVER touched here
// ═══════════════════════════════════════════════════════════════

export const saveTimetableConfig = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYearId, weekday, saturday, satSameAsWeekday } = req.body;

    // ── Validation ───────────────────────────────────────────
    if (!academicYearId || !weekday)
      return res
        .status(400)
        .json({ message: "academicYearId and weekday config required" });

    const year = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });
    if (!year)
      return res.status(404).json({ message: "Academic year not found" });

    // ── Build new definitions from input ─────────────────────
    const weekdayDefs = buildPeriodDefinitions(weekday, "WEEKDAY");
    const saturdayDefs = satSameAsWeekday
      ? []
      : buildPeriodDefinitions(saturday || weekday, "SATURDAY");
    const allNewDefs = [...weekdayDefs, ...saturdayDefs];

    const savedConfig = await prisma.$transaction(async (tx) => {
      // ── Step 1: Find or create TimetableConfig ────────────
      // NEVER delete the config — just update meta fields
      let config = await tx.timetableConfig.findUnique({
        where: { schoolId_academicYearId: { schoolId, academicYearId } },
      });

      if (config) {
        // Update meta counts only
        config = await tx.timetableConfig.update({
          where: { id: config.id },
          data: {
            weekdayTotalPeriods: weekday.totalPeriods,
            saturdayTotalPeriods: satSameAsWeekday
              ? 0
              : saturday?.totalPeriods || weekday.totalPeriods,
          },
        });
      } else {
        // First time setup
        config = await tx.timetableConfig.create({
          data: {
            schoolId,
            academicYearId,
            weekdayTotalPeriods: weekday.totalPeriods,
            saturdayTotalPeriods: satSameAsWeekday
              ? 0
              : saturday?.totalPeriods || weekday.totalPeriods,
          },
        });
      }

      // ── Step 2: Load existing PeriodDefinitions ───────────
      const existingDefs = await tx.periodDefinition.findMany({
        where: { configId: config.id },
        include: {
          // Check if any TimetableEntry uses this definition
          timetableEntries: { select: { id: true }, take: 1 },
        },
      });

      // Map: "periodNumber:dayType" → existing definition
      const existingMap = new Map(
        existingDefs.map((d) => [`${d.periodNumber}:${d.dayType}`, d]),
      );

      // Map: "periodNumber:dayType" → new definition
      const newDefMap = new Map(
        allNewDefs.map((d) => [`${d.periodNumber}:${d.dayType}`, d]),
      );

      // ── Step 3: Find periods to remove ───────────────────
      // Only remove periods that are NOT in new config
      // AND have NO timetable entries (safe to delete)
      const periodsWithEntries = [];
      const periodsToDelete = [];

      for (const [key, existing] of existingMap.entries()) {
        if (!newDefMap.has(key)) {
          if (existing.timetableEntries.length > 0) {
            // ⚠️ Has entries — cannot delete, warn admin
            periodsWithEntries.push({
              periodNumber: existing.periodNumber,
              dayType: existing.dayType,
              label: existing.label,
            });
          } else {
            // Safe to delete — no entries linked
            periodsToDelete.push(existing.id);
          }
        }
      }

      // If any removed period has entries → block and warn
      if (periodsWithEntries.length > 0) {
        throw {
          statusCode: 409,
          message:
            "Some periods have existing timetable entries and cannot be removed. Clear the class timetables first.",
          periodsWithEntries,
        };
      }

      // Safe delete — no entries
      if (periodsToDelete.length > 0) {
        await tx.periodDefinition.deleteMany({
          where: { id: { in: periodsToDelete } },
        });
      }

      // ── Step 4: Upsert each PeriodDefinition ─────────────
      // UPDATE if exists (timing change) → entries auto reflect ✅
      // CREATE if new period added
      for (const def of allNewDefs) {
        const key = `${def.periodNumber}:${def.dayType}`;
        const existing = existingMap.get(key);

        if (existing) {
          // ✅ Just update timing — TimetableEntry untouched
          await tx.periodDefinition.update({
            where: { id: existing.id },
            data: {
              label: def.label,
              slotType: def.slotType,
              startTime: def.startTime,
              endTime: def.endTime,
              order: def.order,
            },
          });
        } else {
          // New period — create fresh
          await tx.periodDefinition.create({
            data: {
              configId: config.id,
              periodNumber: def.periodNumber,
              label: def.label,
              slotType: def.slotType,
              dayType: def.dayType,
              startTime: def.startTime,
              endTime: def.endTime,
              order: def.order,
            },
          });
        }
      }

      // ── Step 5: Return full config with definitions ───────
      return tx.timetableConfig.findUnique({
        where: { id: config.id },
        include: {
          periodDefinitions: { orderBy: { order: "asc" } },
        },
      });
    });

    await cacheService.invalidateSchool(schoolId);
    return res.json({ message: "Timetable config saved", config: savedConfig });
  } catch (err) {
    // Handle our custom conflict error
    if (err.statusCode === 409) {
      return res.status(409).json({
        message: err.message,
        periodsWithEntries: err.periodsWithEntries,
      });
    }
    return res.status(500).json({ message: err.message });
  }
};
