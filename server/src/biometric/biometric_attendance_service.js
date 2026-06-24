// server/src/biometric/biometric_attendance_service.js
//
// BIOMETRIC ATTENDANCE NOTIFICATION SERVICE
// ─────────────────────────────────────────
// Called by the cron scheduler (twice per school per day):
//
//   Cron 1 — school start + 1 hr  → processPresent()
//             Marks students who punched as PRESENT, sends WhatsApp.
//
//   Cron 2 — school start + 3 hrs → processAbsent()
//             Any student still with NO AttendanceRecord → mark ABSENT, send WhatsApp.
//
// Zero changes to the existing manual attendance flow.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "../config/db.js";
import { sendAttendanceWhatsApp } from "../whatsapp/attendanceWhatsAppService.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns today's IST date as a JS Date at midnight IST (stored as UTC in DB).
 * e.g. 2026-06-24 00:00:00 IST = 2026-06-23 18:30:00 UTC
 */
function todayISTMidnight() {
  const now    = new Date();
  const istMs  = now.getTime() + 5.5 * 60 * 60 * 1000;
  const istNow = new Date(istMs);
  const dateStr = istNow.toISOString().slice(0, 10); // "YYYY-MM-DD"
  return new Date(dateStr + "T00:00:00+05:30");
}

/**
 * Returns today's IST date string "YYYY-MM-DD".
 */
function todayISTString() {
  const now   = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

/**
 * Send WhatsApp to all parents of a student.
 * Reuses the exact same sendAttendanceWhatsApp() used by the manual flow.
 */
async function notifyParents({ student, status, schoolName }) {
  for (const link of student.parentLinks || []) {
    const parent = link.parent;
    if (!parent?.phone) continue;

    try {
      await sendAttendanceWhatsApp({
        phone:       parent.phone,
        studentName: student.name,
        status:      status === "PRESENT" ? "Present" : "Absent",
        schoolName,
      });
    } catch (err) {
      console.error(
        `[BiometricNotify] WhatsApp failed for parent ${parent.phone} (${student.name}):`,
        err.message
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON 1 — school start + 1 hr
// Process PRESENT students (those who punched in today)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} schoolId
 */
export async function processPresent(schoolId) {
  const label = `[BiometricPresent][${schoolId}]`;
  console.log(`${label} Starting PRESENT processing...`);

  try {
    const todayMidnight = todayISTMidnight();
    const todayStr      = todayISTString();

    // ── 1. School info ────────────────────────────────────────────────────────
    const school = await prisma.school.findUnique({
      where:  { id: schoolId },
      select: { id: true, name: true },
    });
    if (!school) {
      console.error(`${label} School not found.`);
      return;
    }

    // ── 2. Active academic year ───────────────────────────────────────────────
    const academicYear = await prisma.academicYear.findFirst({
      where:  { schoolId, isActive: true },
      select: { id: true },
    });
    if (!academicYear) {
      console.log(`${label} No active academic year, skipping.`);
      return;
    }

    // ── 3. All active student enrollments for this school ─────────────────────
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: academicYear.id,
        status:         "ACTIVE",
        classSection:   { schoolId },
      },
      select: {
        studentId:     true,
        classSectionId: true,
        classSection:  { select: { schoolId: true } },
      },
    });

    if (!enrollments.length) {
      console.log(`${label} No active enrollments found.`);
      return;
    }

    const studentIds = enrollments.map((e) => e.studentId);

    // ── 4. Students who are mapped in biometric ───────────────────────────────
    const mappings = await prisma.biometricUserMapping.findMany({
      where: {
        schoolId,
        personType: "STUDENT",
        isActive:   true,
        studentId:  { in: studentIds },
      },
      select: { studentId: true },
    });

    const mappedStudentIds = new Set(mappings.map((m) => m.studentId));

    if (!mappedStudentIds.size) {
      console.log(`${label} No biometric-mapped students found.`);
      return;
    }

    // ── 5. Students who punched today ─────────────────────────────────────────
    const fromDate = new Date(todayStr + "T00:00:00+05:30");
    const toDate   = new Date(todayStr + "T23:59:59+05:30");

    const punchedLogs = await prisma.biometricLog.findMany({
      where: {
        schoolId,
        personType:   "STUDENT",
        studentId:    { in: [...mappedStudentIds] },
        punchDateTime: { gte: fromDate, lte: toDate },
        biometricUserMappingId: { not: null },
      },
      select: { studentId: true },
      distinct: ["studentId"],
    });

    const punchedStudentIds = new Set(
      punchedLogs.map((l) => l.studentId).filter(Boolean)
    );

    if (!punchedStudentIds.size) {
      console.log(`${label} No punches found for today.`);
      return;
    }

    // ── 6. Existing AttendanceRecords for today (to check teacher-marked ones) ─
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        studentId:     { in: [...punchedStudentIds] },
        academicYearId: academicYear.id,
        date:          todayMidnight,
      },
      select: { studentId: true, markedById: true },
    });

    // Map studentId → existing record
    const existingMap = new Map(existingRecords.map((r) => [r.studentId, r]));

    // ── 7. Build enrollment lookup (studentId → classSectionId) ───────────────
    const enrollmentMap = new Map(
      enrollments.map((e) => [e.studentId, e.classSectionId])
    );

    // ── 8. Fetch student + parent details for punched students ────────────────
    const students = await prisma.student.findMany({
      where: { id: { in: [...punchedStudentIds] } },
      select: {
        id:   true,
        name: true,
        parentLinks: {
          select: {
            parent: { select: { phone: true } },
          },
        },
      },
    });

    // ── 9. Process each punched student ───────────────────────────────────────
    let markedCount   = 0;
    let skippedCount  = 0;
    let notifiedCount = 0;

    for (const student of students) {
      const existing      = existingMap.get(student.id);
      const classSectionId = enrollmentMap.get(student.id);

      if (!classSectionId) continue;

      // SKIP if teacher already manually marked (markedById is not null)
      if (existing && existing.markedById !== null) {
        console.log(`${label} Skipping ${student.name} — teacher already marked.`);
        skippedCount++;
        continue;
      }

      // Upsert AttendanceRecord as PRESENT
      // markedById = null signals this was biometric-created (not teacher)
      await prisma.attendanceRecord.upsert({
        where: {
          studentId_date_academicYearId: {
            studentId:      student.id,
            date:           todayMidnight,
            academicYearId: academicYear.id,
          },
        },
        update: {
          status:    "PRESENT",
          remarks:   "Auto-marked via biometric punch",
          markedById: null,
        },
        create: {
          studentId:      student.id,
          classSectionId,
          academicYearId: academicYear.id,
          date:           todayMidnight,
          status:         "PRESENT",
          remarks:        "Auto-marked via biometric punch",
          markedById:     null,
        },
      });
      markedCount++;

      // Send WhatsApp to parents
      await notifyParents({ student, status: "PRESENT", schoolName: school.name });
      notifiedCount++;
    }

    console.log(
      `${label} Done. Marked: ${markedCount}, Skipped (teacher-marked): ${skippedCount}, Notified: ${notifiedCount}`
    );
  } catch (err) {
    console.error(`${label} Error:`, err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON 2 — school start + 3 hrs
// Process ABSENT students (those with NO AttendanceRecord yet)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} schoolId
 */
export async function processAbsent(schoolId) {
  const label = `[BiometricAbsent][${schoolId}]`;
  console.log(`${label} Starting ABSENT processing...`);

  try {
    const todayMidnight = todayISTMidnight();

    // ── 1. School info ────────────────────────────────────────────────────────
    const school = await prisma.school.findUnique({
      where:  { id: schoolId },
      select: { id: true, name: true },
    });
    if (!school) {
      console.error(`${label} School not found.`);
      return;
    }

    // ── 2. Active academic year ───────────────────────────────────────────────
    const academicYear = await prisma.academicYear.findFirst({
      where:  { schoolId, isActive: true },
      select: { id: true },
    });
    if (!academicYear) {
      console.log(`${label} No active academic year, skipping.`);
      return;
    }

    // ── 3. All active enrollments ─────────────────────────────────────────────
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: academicYear.id,
        status:         "ACTIVE",
        classSection:   { schoolId },
      },
      select: {
        studentId:      true,
        classSectionId: true,
      },
    });

    if (!enrollments.length) {
      console.log(`${label} No active enrollments found.`);
      return;
    }

    const studentIds = enrollments.map((e) => e.studentId);

    // ── 4. Only biometric-mapped students ────────────────────────────────────
    const mappings = await prisma.biometricUserMapping.findMany({
      where: {
        schoolId,
        personType: "STUDENT",
        isActive:   true,
        studentId:  { in: studentIds },
      },
      select: { studentId: true },
    });

    const mappedStudentIds = new Set(mappings.map((m) => m.studentId));

    if (!mappedStudentIds.size) {
      console.log(`${label} No biometric-mapped students.`);
      return;
    }

    // ── 5. Students who ALREADY have an AttendanceRecord today ───────────────
    // (teacher-marked OR biometric-present from Cron 1)
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        studentId:      { in: [...mappedStudentIds] },
        academicYearId: academicYear.id,
        date:           todayMidnight,
      },
      select: { studentId: true },
    });

    const alreadyMarkedIds = new Set(existingRecords.map((r) => r.studentId));

    // ── 6. Students with NO record = ABSENT ───────────────────────────────────
    const absentStudentIds = [...mappedStudentIds].filter(
      (id) => !alreadyMarkedIds.has(id)
    );

    if (!absentStudentIds.length) {
      console.log(`${label} All mapped students already have records. Nothing to do.`);
      return;
    }

    // ── 7. Build enrollment lookup ────────────────────────────────────────────
    const enrollmentMap = new Map(
      enrollments.map((e) => [e.studentId, e.classSectionId])
    );

    // ── 8. Fetch student + parent details ────────────────────────────────────
    const students = await prisma.student.findMany({
      where: { id: { in: absentStudentIds } },
      select: {
        id:   true,
        name: true,
        parentLinks: {
          select: {
            parent: { select: { phone: true } },
          },
        },
      },
    });

    // ── 9. Mark ABSENT and notify ─────────────────────────────────────────────
    let markedCount   = 0;
    let notifiedCount = 0;

    for (const student of students) {
      const classSectionId = enrollmentMap.get(student.id);
      if (!classSectionId) continue;

      // Create ABSENT record (markedById = null = biometric auto)
      await prisma.attendanceRecord.create({
        data: {
          studentId:      student.id,
          classSectionId,
          academicYearId: academicYear.id,
          date:           todayMidnight,
          status:         "ABSENT",
          remarks:        "Auto-marked absent via biometric (no punch recorded)",
          markedById:     null,
        },
      });
      markedCount++;

      // Send WhatsApp to parents
      await notifyParents({ student, status: "ABSENT", schoolName: school.name });
      notifiedCount++;
    }

    console.log(
      `${label} Done. Marked ABSENT: ${markedCount}, Notified: ${notifiedCount}`
    );
  } catch (err) {
    console.error(`${label} Error:`, err);
  }
}