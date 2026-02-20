// server/src/controllers/timetableConfigController.js
import { PrismaClient } from "@prisma/client";
import redisClient from "../utils/redis.js";

const prisma = new PrismaClient();
const CACHE_TTL = 60 * 5; // 5 minutes

// ── Safe Redis helpers (fail silently) ───────────────────────────────────────

async function cacheGet(key) {
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error(`[Redis] GET ${key} failed:`, err.message);
    return null;
  }
}

async function cacheSet(key, value) {
  try {
    await redisClient.setEx(key, CACHE_TTL, JSON.stringify(value));
  } catch (err) {
    console.error(`[Redis] SET ${key} failed:`, err.message);
  }
}

async function cacheDel(key) {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`[Redis] DEL ${key} failed:`, err.message);
  }
}

// ── Cache key helper ─────────────────────────────────────────────────────────
const cacheKey = (schoolId, academicYearId) =>
  `timetable-config:${schoolId}:${academicYearId}`;

// ── Pure helper functions (unchanged) ────────────────────────────────────────

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function buildSlots(config, offset = 0) {
  const slots = [];
  let order = 1 + offset;
  let cursor = timeToMinutes(config.startTime);
  const breakMap = {};
  (config.breaks || []).forEach((b) => (breakMap[b.afterPeriod] = b));
  for (let i = 1; i <= config.totalPeriods; i++) {
    slots.push({
      slotOrder: order++,
      slotType: "PERIOD",
      label: offset > 0 ? `[Sat] Period ${i}` : `Period ${i}`,
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + config.periodDuration),
    });
    cursor += config.periodDuration;
    if (breakMap[i]) {
      const brk = breakMap[i];
      slots.push({
        slotOrder: order++,
        slotType: brk.type || "SHORT_BREAK",
        label: offset > 0 ? `[Sat] ${brk.label}` : brk.label,
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + brk.duration),
      });
      cursor += brk.duration;
    }
  }
  return slots;
}

// ── GET /api/class-sections/timetable/config?academicYearId=xxx ──────────────
export const getTimetableConfig = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYearId } = req.query;
    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const key = cacheKey(schoolId, academicYearId);

    // 1. Check cache
    const cached = await cacheGet(key);
    if (cached) {
      return res.json({ config: JSON.parse(cached), fromCache: true });
    }

    // 2. Cache miss → fetch from DB
    const config = await prisma.timetableConfig.findUnique({
      where: { schoolId_academicYearId: { schoolId, academicYearId } },
      include: { slots: { orderBy: { slotOrder: "asc" } } },
    });

    // 3. Store in cache (cache null too — avoids repeated DB hits for missing config)
    await cacheSet(key, config ?? null);

    return res.json({ config: config || null });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/class-sections/timetable/config ────────────────────────────────
export const saveTimetableConfig = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYearId, weekday, saturday, satSameAsWeekday } = req.body;
    if (!academicYearId || !weekday)
      return res
        .status(400)
        .json({ message: "academicYearId and weekday config required" });

    const year = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });
    if (!year)
      return res.status(404).json({ message: "Academic year not found" });

    const weekdaySlots = buildSlots(weekday, 0);
    const saturdaySlots = satSameAsWeekday
      ? []
      : buildSlots(saturday || weekday, 1000);
    const allSlots = [...weekdaySlots, ...saturdaySlots];

    const savedConfig = await prisma.$transaction(async (tx) => {
      const existing = await tx.timetableConfig.findUnique({
        where: { schoolId_academicYearId: { schoolId, academicYearId } },
      });
      let config;
      if (existing) {
        await tx.timetablePeriodSlot.deleteMany({
          where: { configId: existing.id },
        });
        config = await tx.timetableConfig.update({
          where: { id: existing.id },
          data: {
            startTime: weekday.startTime,
            endTime: weekday.endTime,
            periodDuration: weekday.periodDuration,
            totalPeriods: weekday.totalPeriods,
          },
        });
      } else {
        config = await tx.timetableConfig.create({
          data: {
            schoolId,
            academicYearId,
            startTime: weekday.startTime,
            endTime: weekday.endTime,
            periodDuration: weekday.periodDuration,
            totalPeriods: weekday.totalPeriods,
          },
        });
      }
      await tx.timetablePeriodSlot.createMany({
        data: allSlots.map((s) => ({ ...s, configId: config.id })),
      });
      return tx.timetableConfig.findUnique({
        where: { id: config.id },
        include: { slots: { orderBy: { slotOrder: "asc" } } },
      });
    });

    // Invalidate the cached config for this school + year
    await cacheDel(cacheKey(schoolId, academicYearId));

    return res.json({ message: "Timetable config saved", config: savedConfig });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
