import { prisma } from "../../config/db.js";
import cacheService from "../../utils/cacheService.js";

function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function mapStatus(prismaStatus) {
  switch (prismaStatus) {
    case "PRESENT":  return "present";
    case "ABSENT":   return "absent";
    case "LATE":     return "late";
    case "HALF_DAY": return "late";
    case "EXCUSED":  return "present";
    default:         return "present";
  }
}

function dayAbbr(date) {
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

const pad2 = (n) => String(n).padStart(2, "0");

export async function getAttendance(req, res) {
  try {
    const studentId = req.user?.id;
    const schoolId  = req.user?.schoolId;
    const role      = req.user?.role;
    if (!studentId || role !== "STUDENT") {
      return res.status(401).json({ success: false, message: "Unauthorised" });
    }

    const now   = new Date();
    const year  = parseInt(req.query.year  ?? now.getUTCFullYear(),  10);
    const month = parseInt(req.query.month ?? now.getUTCMonth() + 1, 10);

    if (
      isNaN(year) || isNaN(month) ||
      month < 1   || month > 12   ||
      year  < 2000 || year > 2100
    ) {
      return res.status(400).json({ success: false, message: "Invalid year/month" });
    }

    // ── Cache: keyed by student + year + month ─────────────────────────────
    const cacheKey = await cacheService.buildKey(
      schoolId,
      `student:attendance:${studentId}:${year}:${month}`
    );
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const { start, end } = monthRange(year, month);

    const student = await prisma.student.findUnique({
      where:  { id: studentId },
      select: { schoolId: true },
    });
    const resolvedSchoolId = student?.schoolId;

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        status: "ACTIVE",
        academicYear: { startDate: { lte: end }, endDate: { gte: start } },
      },
      include: {
        classSection: { select: { grade: true, section: true, name: true } },
        academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });

    const [breaks, records, govHolidays, schoolHolidayRanges] = await Promise.all([
      enrollment ? prisma.periodDefinition.findMany({
        where: {
          slotType: { in: ["SHORT_BREAK", "LUNCH_BREAK"] },
          config: { schoolId: resolvedSchoolId, academicYearId: enrollment.academicYear.id },
        },
        select: { label: true, startTime: true, endTime: true, slotType: true },
        orderBy: { order: "asc" },
      }) : [],

      prisma.attendanceRecord.findMany({
        where: {
          studentId,
          date: { gte: start, lte: end },
          ...(enrollment ? { academicYearId: enrollment.academicYear.id } : {}),
        },
        orderBy: { date: "desc" },
      }),

      resolvedSchoolId ? prisma.schoolHoliday.findMany({
        where: { schoolId: resolvedSchoolId, type: "GOVERNMENT", month },
      }) : [],

      resolvedSchoolId && enrollment ? prisma.schoolHoliday.findMany({
        where: {
          schoolId:       resolvedSchoolId,
          type:           "SCHOOL",
          academicYearId: enrollment.academicYear.id,
          startDate:      { lte: end },
          OR: [{ endDate: null }, { endDate: { gte: start } }],
        },
      }) : [],
    ]);

    const govHolidayDays = new Set(govHolidays.map((h) => h.day));

    function isInSchoolHoliday(dateObj) {
      return schoolHolidayRanges.some((h) => {
        const hStart = new Date(h.startDate); hStart.setUTCHours(0, 0, 0, 0);
        const hEnd = h.endDate ? new Date(h.endDate) : new Date(hStart);
        hEnd.setUTCHours(23, 59, 59, 999);
        return dateObj >= hStart && dateObj <= hEnd;
      });
    }

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const recordMap   = new Map(records.map((r) => [pad2(new Date(r.date).getUTCDate()), r]));

    const calendarDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj           = new Date(Date.UTC(year, month - 1, d));
      const dateStr           = pad2(d);
      const weekday           = dateObj.getUTCDay();
      const isWeekend         = weekday === 0;
      const record            = recordMap.get(dateStr);
      const isDeclaredHoliday = govHolidayDays.has(d) || isInSchoolHoliday(dateObj);

      let status;
      if (record)                                status = mapStatus(record.status);
      else if (isWeekend || isDeclaredHoliday)   status = "holiday";
      else if (dateObj > now)                    status = "upcoming";
      else                                       status = "absent";

      calendarDays.push({
        date: dateStr,
        day:  dayAbbr(dateObj),
        status,
        ...(isDeclaredHoliday && !record ? {
          holidayName: [
            ...govHolidays.filter((h) => h.day === d).map((h) => h.title),
            ...schoolHolidayRanges
              .filter((h) => {
                const hStart = new Date(h.startDate); hStart.setUTCHours(0, 0, 0, 0);
                const hEnd = h.endDate ? new Date(h.endDate) : new Date(hStart);
                hEnd.setUTCHours(23, 59, 59, 999);
                return dateObj >= hStart && dateObj <= hEnd;
              })
              .map((h) => h.title),
          ].join(", "),
        } : {}),
      });
    }

    const schoolDays = calendarDays.filter((d) => d.status !== "holiday" && d.status !== "upcoming");
    const totalDays  = schoolDays.length;
    const present    = schoolDays.filter((d) => d.status === "present").length;
    const absent     = schoolDays.filter((d) => d.status === "absent").length;
    const late       = schoolDays.filter((d) => d.status === "late").length;
    const percentage = totalDays > 0
      ? parseFloat(((present + late) / totalDays * 100).toFixed(1))
      : 0;

    const recentRecords = records
      .filter((r) => r.status !== undefined)
      .slice(0, 10)
      .map((r) => {
        const d = new Date(r.date);
        return {
          date:     d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }),
          day:      d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
          checkIn:  r.checkInTime  ?? "-",
          checkOut: r.checkOutTime ?? "-",
          status:   mapStatus(r.status),
          remarks:  r.remarks ?? null,
        };
      });

    let availableMonths = [];
    if (enrollment) {
      const ayStart = new Date(enrollment.academicYear.startDate ?? start);
      const ayEnd   = new Date(enrollment.academicYear.endDate   ?? end);
      const cursor  = new Date(Date.UTC(ayStart.getUTCFullYear(), ayStart.getUTCMonth(), 1));
      while (cursor <= ayEnd) {
        availableMonths.push({
          label: cursor.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
          year:  cursor.getUTCFullYear(),
          month: cursor.getUTCMonth() + 1,
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    const data = {
      selectedMonth: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
        "en-US", { month: "long", year: "numeric", timeZone: "UTC" }
      ),
      enrollment: enrollment ? {
        admissionNumber: enrollment.admissionNumber,
        rollNumber:      enrollment.rollNumber,
        grade:           enrollment.classSection.grade,
        section:         enrollment.classSection.section,
        className:       enrollment.classSection.name,
        academicYear:    enrollment.academicYear.name,
      } : null,
      stats:           { totalDays, present, absent, late, percentage },
      calendarDays,
      recentRecords,
      availableMonths,
      breaks,
    };

    await cacheService.set(cacheKey, data);
    return res.json({ success: true, data });

  } catch (err) {
    console.error("[getAttendance]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}