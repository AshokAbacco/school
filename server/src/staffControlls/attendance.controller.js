// server/src/staffControlls/attendance.controller.js
import { prisma } from "../config/db.js";
import XLSX from "xlsx";

export const getTeacherClasses = async (req, res) => {
  try {
    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId: teacher.schoolId, isActive: true },
    });

    if (!activeAcademicYear) {
      return res.status(404).json({ success: false, message: "No active academic year found for this school" });
    }

    const activeAcademicYearId = activeAcademicYear.id;

    const classSections = await prisma.classSectionAcademicYear.findMany({
      where: { classTeacherId: teacher.id, academicYearId: activeAcademicYearId, isActive: true },
      include: { classSection: true, academicYear: true },
    });

    const classTeacherClasses = classSections.map((s) => ({
      classSectionId: s.classSectionId,
      academicYearId: s.academicYearId,
      grade: s.classSection.grade,
      section: s.classSection.section,
      name: s.classSection.name,
      academicYearName: s.academicYear.name,
      role: "CLASS_TEACHER",
    }));

    const subjectAssignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id, academicYearId: activeAcademicYearId },
      include: { classSection: true, academicYear: true },
    });

    const subjectTeacherClasses = subjectAssignments.map((a) => ({
      classSectionId: a.classSectionId,
      academicYearId: a.academicYearId,
      grade: a.classSection.grade,
      section: a.classSection.section,
      name: a.classSection.name,
      academicYearName: a.academicYear.name,
      role: "SUBJECT_TEACHER",
    }));

    const seen = new Set();
    const allClasses = [...classTeacherClasses, ...subjectTeacherClasses].filter((c) => {
      const key = `${c.classSectionId}_${c.academicYearId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json({
      success: true,
      activeAcademicYear: { id: activeAcademicYear.id, name: activeAcademicYear.name },
      data: allClasses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch classes" });
  }
};

/**
 * 2️⃣ Get Students For Attendance
 *    ✅ Now includes fatherName from StudentParent (FATHER relation)
 *       so the frontend can display it when duplicate names exist.
 */
export const getClassStudentsForAttendance = async (req, res) => {
  try {
    const { classSectionId, academicYearId, date } = req.query;

    if (!classSectionId || !academicYearId || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing parameters: classSectionId, academicYearId, date are required",
      });
    }

    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId: teacher.schoolId, isActive: true },
    });
    if (!academicYear) {
      return res.status(403).json({ success: false, message: "Access denied: Requested academic year is not active" });
    }

    const [isClassTeacher, isSubjectTeacher] = await Promise.all([
      prisma.classSectionAcademicYear.findFirst({
        where: { classSectionId, academicYearId, classTeacherId: teacher.id, isActive: true },
      }),
      prisma.teacherAssignment.findFirst({
        where: { teacherId: teacher.id, classSectionId, academicYearId },
      }),
    ]);

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({ success: false, message: "Access denied: You are not assigned to this section" });
    }

    // ── Fetch active enrolled students ────────────────────────
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classSectionId, academicYearId, status: "ACTIVE" },
      include: { student: true },
    });

    // ── Sort: numeric roll ASC, nulls last, then alpha name ───
    enrollments.sort((a, b) => {
      const ra = a.rollNumber != null ? parseInt(a.rollNumber, 10) : null;
      const rb = b.rollNumber != null ? parseInt(b.rollNumber, 10) : null;
      if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
      if (ra != null) return -1;
      if (rb != null) return 1;
      return (a.student.name || "").localeCompare(b.student.name || "");
    });

    // ── Fetch father names for ALL enrolled students ──────────
    // We pull FATHER relation from StudentParent and join to Parent for name.
    const studentIds = enrollments.map((e) => e.studentId);

    const fatherLinks = await prisma.studentParent.findMany({
      where: {
        studentId: { in: studentIds },
        relation: "FATHER",
      },
      include: {
        parent: {
          select: { name: true },
        },
      },
    });

    // Map: studentId → father's full name
    const fatherMap = new Map(
      fatherLinks.map((link) => [link.studentId, link.parent?.name || null])
    );

    // ── Fetch existing attendance for this date ───────────────
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { classSectionId, academicYearId, date: new Date(date) },
    });

    const attendanceMap = new Map(attendanceRecords.map((a) => [a.studentId, a]));

    // ── Build response ────────────────────────────────────────
    const students = enrollments.map((e, idx) => {
      const record     = attendanceMap.get(e.studentId);
      const fatherName = fatherMap.get(e.studentId) || null;

      // Derive initials from father name: "Ramesh Kumar Patel" → "R.K.P."
      const fatherInitials = fatherName
        ? fatherName
            .trim()
            .split(/\s+/)
            .map((w) => w[0]?.toUpperCase())
            .filter(Boolean)
            .join(".") + "."
        : null;

      return {
        studentId:      e.studentId,
        rollNumber:     e.rollNumber ?? null,
        tempIndex:      idx + 1,
        name:           e.student.name,
        fatherName,          // ← full father name (e.g. "Ramesh Patel")
        fatherInitials,      // ← initials    (e.g. "R.P.")
        status:         record?.status  || null,
        remarks:        record?.remarks || "",
      };
    });

    return res.json({ success: true, data: students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
};

/**
 * 3️⃣ Mark / Save Attendance
 */
export const markAttendance = async (req, res) => {
  try {
    const { classSectionId, academicYearId, date, records } = req.body;

    if (!classSectionId || !academicYearId || !date || !records) {
      return res.status(400).json({
        success: false,
        message: "Missing fields: classSectionId, academicYearId, date, records are required",
      });
    }

    const userId = req.user.id;

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId: teacher.schoolId, isActive: true },
    });
    if (!academicYear) {
      return res.status(403).json({ success: false, message: "Access denied: Cannot mark attendance for an inactive academic year" });
    }

    const [isClassTeacher, isSubjectTeacher] = await Promise.all([
      prisma.classSectionAcademicYear.findFirst({
        where: { classSectionId, academicYearId, classTeacherId: teacher.id, isActive: true },
      }),
      prisma.teacherAssignment.findFirst({
        where: { teacherId: teacher.id, classSectionId, academicYearId },
      }),
    ]);

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({ success: false, message: "Access denied: You are not assigned to this section" });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "No attendance records provided" });
    }

    await prisma.$transaction(
      records.map((record) =>
        prisma.attendanceRecord.upsert({
          where: {
            studentId_date_academicYearId: {
              studentId: record.studentId,
              date: new Date(date),
              academicYearId,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks || null,
            markedById: userId,
          },
          create: {
            studentId: record.studentId,
            classSectionId,
            academicYearId,
            date: new Date(date),
            status: record.status,
            remarks: record.remarks || null,
            markedById: userId,
          },
        })
      )
    );

    return res.json({ success: true, message: "Attendance saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to mark attendance" });
  }
};


export const exportAttendanceExcel = async (req, res) => {
  try {
    const { classSectionId, date } = req.query;

    if (!classSectionId || !date) {
      return res.status(400).json({ message: "Missing params: classSectionId and date are required" });
    }

    // ── 1. Fetch attendance records ────────────────────────────────────────────
    const records = await prisma.attendanceRecord.findMany({
      where: {
        classSectionId,
        date: new Date(date),
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: { classSectionId },
              select: { rollNumber: true, admissionNumber: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { student: { name: "asc" } },
    });

    if (!records.length) {
      return res.status(404).json({ message: "No attendance records found for this date" });
    }

    // ── 2. Fetch class section name ────────────────────────────────────────────
    const classSection = await prisma.classSection.findUnique({
      where: { id: classSectionId },
      select: { name: true },
    });
    const className = classSection?.name || "Unknown Class";

    // ── 3. Meta ────────────────────────────────────────────────────────────────
    const displayDate = new Date(date).toLocaleDateString("en-IN", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
    const exportDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });

    // ── 4. Sort by roll number (numeric), nulls last, then by name ─────────────
    records.sort((a, b) => {
      const ra = parseInt(a.student.enrollments?.[0]?.rollNumber, 10);
      const rb = parseInt(b.student.enrollments?.[0]?.rollNumber, 10);
      if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
      if (!isNaN(ra)) return -1;
      if (!isNaN(rb)) return  1;
      return (a.student.name || "").localeCompare(b.student.name || "");
    });

    // ── 5. Build workbook ──────────────────────────────────────────────────────
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator  = "School Management System";
    wb.created  = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet("Attendance", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
      views: [{ state: "frozen", ySplit: 6 }],
    });

    // ── 6. Colour palette ──────────────────────────────────────────────────────
    const C = {
      headerBg:    "FF1E3A5F",   // deep navy
      headerFg:    "FFFFFFFF",
      subHeaderBg: "FF2E86AB",   // ocean blue
      subHeaderFg: "FFFFFFFF",
      metaBg:      "FFE8F4FD",   // very light blue
      metaFg:      "FF1E3A5F",
      colHeaderBg: "FF34495E",   // dark slate
      colHeaderFg: "FFFFFFFF",
      rowEven:     "FFF8FBFF",
      rowOdd:      "FFFFFFFF",
      borderCol:   "FFB0C4DE",
      // Status badge colours
      present:     { bg: "FF1A7A4A", fg: "FFFFFFFF" },  // dark green
      absent:      { bg: "FFC62828", fg: "FFFFFFFF" },  // red
      late:        { bg: "FFF57F17", fg: "FFFFFFFF" },  // amber
      halfDay:     { bg: "FF1565C0", fg: "FFFFFFFF" },  // blue
      other:       { bg: "FF6D4C41", fg: "FFFFFFFF" },  // brown
      // Row background
      presentRow:  "FFE8F5E9",   // light green
      absentRow:   "FFFCE4E4",   // light red
      lateRow:     "FFFFF8E1",   // light amber
      halfDayRow:  "FFE3F2FD",   // light blue
    };

    // ── 7. Column definitions ──────────────────────────────────────────────────
    ws.columns = [
      { key: "sno",     width: 8   },  // A – S.No
      { key: "rollNo",  width: 10  },  // B – Roll No
      { key: "name",    width: 30  },  // C – Student Name
      { key: "admNo",   width: 16  },  // D – Admission No
      { key: "status",  width: 14  },  // E – Status
      { key: "remarks", width: 35  },  // F – Remarks
    ];

    const LAST_COL  = "F";
    const TOTAL_COLS = 6;

    // ── 8. Helpers ────────────────────────────────────────────────────────────
    const thinBorder = (color = C.borderCol) => ({
      top:    { style: "thin", color: { argb: color } },
      left:   { style: "thin", color: { argb: color } },
      bottom: { style: "thin", color: { argb: color } },
      right:  { style: "thin", color: { argb: color } },
    });
    const fillSolid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

    const addBanner = (text, bgArgb, fgArgb, fontSize, rowHeight) => {
      const row  = ws.addRow([text]);
      const cell = row.getCell(1);
      ws.mergeCells(`A${row.number}:${LAST_COL}${row.number}`);
      cell.value     = text;
      cell.font      = { bold: true, size: fontSize, color: { argb: fgArgb }, name: "Calibri" };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill      = fillSolid(bgArgb);
      cell.border    = thinBorder("FFFFFFFF");
      row.height     = rowHeight;
      return row;
    };

    // ── 9. Header block (Rows 1-4) ─────────────────────────────────────────────
    addBanner("📅  ATTENDANCE REPORT", C.headerBg, C.headerFg, 18, 36);
    addBanner(`Class: ${className}   |   Date: ${displayDate}`, C.subHeaderBg, C.subHeaderFg, 13, 26);

    const presentCount = records.filter((r) => r.status === "PRESENT").length;
    const absentCount  = records.filter((r) => r.status === "ABSENT").length;
    const lateCount    = records.filter((r) => r.status === "LATE").length;
    const totalCount   = records.length;

    addBanner(
      `Exported on: ${exportDate}     |     Total: ${totalCount}     |     Present: ${presentCount}     |     Absent: ${absentCount}     |     Late: ${lateCount}`,
      C.metaBg, C.metaFg, 10, 20,
    );

    // Spacer
    const spacer = ws.addRow([]);
    spacer.height = 6;

    // ── 10. Column header row (Row 5) ──────────────────────────────────────────
    const hdrRow  = ws.addRow(["S.No", "Roll No", "Student Name", "Admission No", "Status", "Remarks"]);
    hdrRow.height = 28;
    hdrRow.eachCell((cell) => {
      cell.font      = { bold: true, size: 11, color: { argb: C.colHeaderFg }, name: "Calibri" };
      cell.fill      = fillSolid(C.colHeaderBg);
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border    = thinBorder("FF1A252F");
    });

    // ── 11. Data rows ──────────────────────────────────────────────────────────
    records.forEach((r, idx) => {
      const status    = (r.status || "UNKNOWN").toUpperCase();
      const enroll    = r.student.enrollments?.[0];

      // Row background based on status
      const rowBgMap = {
        PRESENT:  C.presentRow,
        ABSENT:   C.absentRow,
        LATE:     C.lateRow,
        HALF_DAY: C.halfDayRow,
      };
      const rowBg = rowBgMap[status] || (idx % 2 === 0 ? C.rowEven : C.rowOdd);

      // Status badge colour
      const badgeMap = {
        PRESENT:  C.present,
        ABSENT:   C.absent,
        LATE:     C.late,
        HALF_DAY: C.halfDay,
      };
      const badge = badgeMap[status] || C.other;

      // Display label (e.g. "HALF_DAY" → "Half Day")
      const statusLabel = status
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ");

      const dataRow = ws.addRow({
        sno:     idx + 1,
        rollNo:  enroll?.rollNumber      || "",
        name:    r.student.name          || "",
        admNo:   enroll?.admissionNumber || "",
        status:  statusLabel,
        remarks: r.remarks               || "",
      });
      dataRow.height = 22;

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const isStatusCol  = colNum === 5;
        const isCenterCol  = colNum === 1 || colNum === 2;

        cell.font      = { size: 10, name: "Calibri", color: { argb: "FF1A1A2E" } };
        cell.alignment = {
          horizontal: isCenterCol || isStatusCol ? "center" : "left",
          vertical:   "middle",
        };
        cell.border = thinBorder(C.borderCol);

        // Row background for non-status columns
        if (!isStatusCol) {
          cell.fill = fillSolid(rowBg);
        }

        // Status badge
        if (isStatusCol) {
          cell.fill      = fillSolid(badge.bg);
          cell.font      = { bold: true, size: 10, name: "Calibri", color: { argb: badge.fg } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
    });

    // ── 12. Summary footer ─────────────────────────────────────────────────────
    ws.addRow([]).height = 8;
    addBanner("SUMMARY", C.headerBg, C.headerFg, 11, 22);

    const halfDayCount = records.filter((r) => r.status === "HALF_DAY").length;
    const attendancePct = totalCount > 0
      ? ((presentCount / totalCount) * 100).toFixed(1)
      : "0.0";

    const statsLabels = [
      ["Total Students", totalCount],
      ["Present",        presentCount],
      ["Absent",         absentCount],
      ["Late",           lateCount],
      ["Half Day",       halfDayCount],
      ["Attendance %",   `${attendancePct}%`],
    ];

    const labels = [];
    const values = [];
    statsLabels.forEach(([l, v]) => { labels.push(l, ""); values.push(v, ""); });
    while (labels.length < TOTAL_COLS) labels.push("");
    while (values.length < TOTAL_COLS) values.push("");

    const lRow = ws.addRow(labels);
    lRow.height = 18;
    lRow.eachCell({ includeEmpty: true }, (cell, cn) => {
      if (labels[cn - 1] !== "") {
        cell.font      = { bold: true, size: 9, color: { argb: C.metaFg }, name: "Calibri" };
        cell.fill      = fillSolid(C.metaBg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = thinBorder(C.borderCol);
      }
    });

    const vRow = ws.addRow(values);
    vRow.height = 22;
    vRow.eachCell({ includeEmpty: true }, (cell, cn) => {
      if (values[cn - 1] !== "") {
        cell.font      = { bold: true, size: 12, color: { argb: C.headerBg }, name: "Calibri" };
        cell.fill      = fillSolid("FFFFFFFF");
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = thinBorder(C.borderCol);
      }
    });

    // ── 13. Footer ─────────────────────────────────────────────────────────────
    ws.addRow([]).height = 6;
    addBanner(
      `This report was generated automatically on ${exportDate}. For official use only.`,
      "FFECF0F1", C.metaFg, 8, 18,
    );

    // ── 14. Send response ──────────────────────────────────────────────────────
    const safeName = `Attendance_${className}_${date}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("[exportAttendanceExcel]", err);
    res.status(500).json({ message: "Export failed", error: err.message });
  }
};