// server/src/student/controllers/attendance.controller.js

import { prisma } from "../../config/db.js";

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
    const role      = req.user?.role;
    if (!studentId || role !== "STUDENT") {
      return res.status(401).json({ success: false, message: "Unauthorised" });
    }

    // ── 1. Parse query params ──────────────────────────────────────────────
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

    const { start, end } = monthRange(year, month);

    // ── 2. Fetch schoolId ──────────────────────────────────────────────────
    const student = await prisma.student.findUnique({
      where:  { id: studentId },
      select: { schoolId: true },
    });
    const schoolId = student?.schoolId;

    // ── 3. Find active enrollment ──────────────────────────────────────────
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        status: "ACTIVE",
        academicYear: {
          startDate: { lte: end },
          endDate:   { gte: start },
        },
      },
      include: {
        classSection: { select: { grade: true, section: true, name: true } },
        academicYear: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    });

    // ── 3.2 Fetch breaks ───────────────────────────────────────────────────
// ── 3.2 Fetch breaks ───────────────────────────────────────────────────
const breaks = enrollment
  ? await prisma.periodDefinition.findMany({
      where: {
        slotType: { in: ["SHORT_BREAK", "LUNCH_BREAK"] },
        // Remove or expand dayType to ensure it catches the definitions
        config: {
          schoolId,
          academicYearId: enrollment.academicYear.id,
        },
      },
      select: {
        label: true,
        startTime: true,
        endTime: true,
        slotType: true,
      },
      orderBy: { order: "asc" },
    })
  : [];
    // ── 4. Pull attendance records ─────────────────────────────────────────
    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentId,
        date: { gte: start, lte: end },
        ...(enrollment ? { academicYearId: enrollment.academicYear.id } : {}),
      },
      orderBy: { date: "desc" },
    });

    // ── 5. Fetch holidays ──────────────────────────────────────────────────
    const govHolidays = schoolId
      ? await prisma.schoolHoliday.findMany({
          where: { schoolId, type: "GOVERNMENT", month },
        })
      : [];

    const govHolidayDays = new Set(govHolidays.map((h) => h.day));

    const schoolHolidayRanges =
      schoolId && enrollment
        ? await prisma.schoolHoliday.findMany({
            where: {
              schoolId,
              type:           "SCHOOL",
              academicYearId: enrollment.academicYear.id,
              startDate:      { lte: end },
              OR: [{ endDate: null }, { endDate: { gte: start } }],
            },
          })
        : [];

    function isInSchoolHoliday(dateObj) {
      return schoolHolidayRanges.some((h) => {
        const hStart = new Date(h.startDate);
        hStart.setUTCHours(0, 0, 0, 0);
        const hEnd = h.endDate ? new Date(h.endDate) : new Date(hStart);
        hEnd.setUTCHours(23, 59, 59, 999);
        return dateObj >= hStart && dateObj <= hEnd;
      });
    }

    // ── 6. Build calendar grid ─────────────────────────────────────────────
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const recordMap   = new Map(
      records.map((r) => [pad2(new Date(r.date).getUTCDate()), r])
    );

    const calendarDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj  = new Date(Date.UTC(year, month - 1, d));
      const dateStr  = pad2(d);
      const weekday  = dateObj.getUTCDay();
      const isWeekend = weekday === 0;
      const record   = recordMap.get(dateStr);
      const isDeclaredHoliday = govHolidayDays.has(d) || isInSchoolHoliday(dateObj);

      let status;
      if (record)                          status = mapStatus(record.status);
      else if (isWeekend || isDeclaredHoliday) status = "holiday";
      else if (dateObj > now)              status = "upcoming";
      else                                 status = "absent";

      calendarDays.push({
        date: dateStr,
        day:  dayAbbr(dateObj),
        status,
        ...(isDeclaredHoliday && !record
          ? {
              holidayName: [
                ...govHolidays.filter((h) => h.day === d).map((h) => h.title),
                ...schoolHolidayRanges
                  .filter((h) => {
                    const hStart = new Date(h.startDate);
                    hStart.setUTCHours(0, 0, 0, 0);
                    const hEnd = h.endDate ? new Date(h.endDate) : new Date(hStart);
                    hEnd.setUTCHours(23, 59, 59, 999);
                    return dateObj >= hStart && dateObj <= hEnd;
                  })
                  .map((h) => h.title),
              ].join(", "),
            }
          : {}),
      });
    }

    // ── 7. Compute stats ───────────────────────────────────────────────────
    const schoolDays = calendarDays.filter(
      (d) => d.status !== "holiday" && d.status !== "upcoming"
    );
    const totalDays  = schoolDays.length;
    const present    = schoolDays.filter((d) => d.status === "present").length;
    const absent     = schoolDays.filter((d) => d.status === "absent").length;
    const late       = schoolDays.filter((d) => d.status === "late").length;
    const percentage = totalDays > 0
      ? parseFloat(((present + late) / totalDays * 100).toFixed(1))
      : 0;

    // ── 8. Recent records ──────────────────────────────────────────────────
    const recentRecords = records
      .filter((r) => r.status !== undefined)
      .slice(0, 10)
      .map((r) => {
        const d = new Date(r.date);
        return {
          date:     d.toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
          }),
          day:      d.toLocaleDateString("en-US", {
            weekday: "long", timeZone: "UTC",
          }),
          checkIn:  r.checkInTime  ?? "-",
          checkOut: r.checkOutTime ?? "-",
          status:   mapStatus(r.status),
          remarks:  r.remarks ?? null,
        };
      });

    // ── 9. Available months ────────────────────────────────────────────────
    let availableMonths = [];
    if (enrollment) {
      const ayStart = new Date(enrollment.academicYear.startDate ?? start);
      const ayEnd   = new Date(enrollment.academicYear.endDate   ?? end);
      const cursor  = new Date(
        Date.UTC(ayStart.getUTCFullYear(), ayStart.getUTCMonth(), 1)
      );
      while (cursor <= ayEnd) {
        availableMonths.push({
          label: cursor.toLocaleDateString("en-US", {
            month: "long", year: "numeric", timeZone: "UTC",
          }),
          year:  cursor.getUTCFullYear(),
          month: cursor.getUTCMonth() + 1,
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    // ── 10. Response ───────────────────────────────────────────────────────
    return res.json({
      success: true,
      data: {
        selectedMonth: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
          "en-US", { month: "long", year: "numeric", timeZone: "UTC" }
        ),
        enrollment: enrollment
          ? {
              admissionNumber: enrollment.admissionNumber,
              rollNumber:      enrollment.rollNumber,
              grade:           enrollment.classSection.grade,
              section:         enrollment.classSection.section,
              className:       enrollment.classSection.name,
              academicYear:    enrollment.academicYear.name,
            }
          : null,
        stats:           { totalDays, present, absent, late, percentage },
        calendarDays,
        recentRecords,
        availableMonths,
        breaks,
      },
    });

  } catch (err) {
    console.error("[getAttendance]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}