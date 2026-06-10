// server/src/staffControlls/timetableExcelController.js
 
import XLSX from "xlsx";
import { prisma } from "../config/db.js";
import cacheService from "../utils/cacheService.js";

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════

const VALID_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const DAY_DISPLAY = {
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
};

// Marker prefix written into the Excel to identify class blocks / single-class name
const CLASS_MARKER_PREFIX = "CLASS NAME:";

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function toRomanNumeral(n) {
  const map = [
    [10, "X"], [9, "IX"], [8, "VIII"], [7, "VII"], [6, "VI"],
    [5, "V"], [4, "IV"], [3, "III"], [2, "II"], [1, "I"],
  ];
  let result = "";
  for (const [val, sym] of map) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

function periodColumnHeader(def) {
  if (def.slotType === "PERIOD") {
    return `${toRomanNumeral(def.periodNumber)} (${def.periodNumber})`;
  }
  return def.label.toUpperCase();
}

function periodTimeRange(def) {
  return `${def.startTime}-${def.endTime}`;
}

function getDayType(day) {
  return day === "SATURDAY" ? "SATURDAY" : "WEEKDAY";
}

function getDaysList(periodDefs) {
  const hasSat = periodDefs.some((d) => d.dayType === "SATURDAY");
  return hasSat ? VALID_DAYS : VALID_DAYS.filter((d) => d !== "SATURDAY");
}

/**
 * Apply light blue styling to header row of a sheet.
 */
function styleHeaderRow(ws, headerRow, colCount) {
  for (let col = 0; col < colCount; col++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c: col });
    if (!ws[addr]) ws[addr] = { v: "", t: "s" };
    ws[addr].s = {
      fill: { fgColor: { rgb: "BBDEFB" }, patternType: "solid" },
      font: { bold: true, color: { rgb: "1A237E" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "90CAF9" } },
        bottom: { style: "thin", color: { rgb: "90CAF9" } },
        left: { style: "thin", color: { rgb: "90CAF9" } },
        right: { style: "thin", color: { rgb: "90CAF9" } },
      },
    };
  }
}

/**
 * Style the CLASS NAME marker row (green background).
 */
function styleClassMarkerRow(ws, rowIdx, colCount) {
  for (let col = 0; col < colCount; col++) {
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c: col });
    if (!ws[addr]) ws[addr] = { v: "", t: "s" };
    ws[addr].s = {
      fill: { fgColor: { rgb: "C8E6C9" }, patternType: "solid" },
      font: { bold: true, color: { rgb: "1B5E20" }, sz: 12 },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }
}

/**
 * Apply break column styling (grey).
 */
function styleBreakCell(ws, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  if (!ws[addr]) ws[addr] = { v: "", t: "s" };
  ws[addr].s = {
    fill: { fgColor: { rgb: "EEEEEE" }, patternType: "solid" },
    alignment: { horizontal: "center", vertical: "center" },
    font: { italic: true, color: { rgb: "757575" } },
  };
}

// ═══════════════════════════════════════════════════════════════
//  LOAD CONFIG HELPER
// ═══════════════════════════════════════════════════════════════

async function loadConfig(schoolId, academicYearId) {
  const config = await prisma.timetableConfig.findUnique({
    where: { schoolId_academicYearId: { schoolId, academicYearId } },
    include: {
      periodDefinitions: { orderBy: { order: "asc" } },
    },
  });
  return config;
}

// ═══════════════════════════════════════════════════════════════
//  BUILD TIMETABLE ROWS (AOA)
//  Returns: [ headerRow, timingsRow, ...dayRows ]
//  Used both for single-sheet and bulk-sheet building.
//  Does NOT include the CLASS NAME marker row — caller adds that.
// ═══════════════════════════════════════════════════════════════

function buildTimetableAOA(periodDefs, className) {
  const days = getDaysList(periodDefs);

  const weekdayCols = periodDefs
    .filter((d) => d.dayType === "WEEKDAY")
    .sort((a, b) => a.order - b.order);

  const saturdayCols = periodDefs
    .filter((d) => d.dayType === "SATURDAY")
    .sort((a, b) => a.order - b.order);

  const primaryCols = weekdayCols.length > 0 ? weekdayCols : saturdayCols;

  const headerRow = ["DAYS / PERIODS", ...primaryCols.map(periodColumnHeader)];
  const timingsRow = ["TIMINGS", ...primaryCols.map(periodTimeRange)];

  const dayRows = days.map((day) => {
    const cols = day === "SATURDAY" && saturdayCols.length > 0 ? saturdayCols : primaryCols;
    const cells = primaryCols.map((primaryCol, idx) => {
      const matchingCol = cols[idx];
      if (!matchingCol || matchingCol.slotType !== "PERIOD") return "";
      return "";
    });
    return [DAY_DISPLAY[day], ...cells];
  });

  return {
    rows: [headerRow, timingsRow, ...dayRows],
    primaryCols,
    saturdayCols,
    days,
  };
}

// ═══════════════════════════════════════════════════════════════
//  BUILD TIMETABLE SHEET  (single class — standalone worksheet)
//  Row 0  : CLASS NAME: <name>          ← NEW identifier row
//  Row 1  : DAYS/PERIODS header
//  Row 2  : TIMINGS
//  Row 3+ : day rows
// ═══════════════════════════════════════════════════════════════

function buildTimetableSheet(periodDefs, subjectNames, className) {
  const { rows: timetableRows, primaryCols, saturdayCols, days } = buildTimetableAOA(periodDefs, className);

  const totalDataCols = timetableRows[0].length; // header row length

  // Prepend CLASS NAME marker row
  const classMarkerRow = [`${CLASS_MARKER_PREFIX} ${className}`, ...Array(totalDataCols - 1).fill("")];
  const aoa = [classMarkerRow, ...timetableRows];

  // Row indices (0-based):
  //  0 = CLASS NAME marker
  //  1 = DAYS/PERIODS header
  //  2 = TIMINGS
  //  3+ = day rows

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!cols"] = [
    { wch: 22 }, // first col wider to fit "CLASS NAME: …"
    ...primaryCols.map((col) => ({
      wch: col.slotType === "PERIOD" ? 16 : 12,
    })),
  ];

  ws["!rows"] = [
    { hpt: 26 }, // CLASS NAME row
    { hpt: 28 }, // header
    { hpt: 22 }, // timings
    ...days.map(() => ({ hpt: 22 })),
  ];

  // Style CLASS NAME marker row
  styleClassMarkerRow(ws, 0, totalDataCols);

  // Style header row (row 1) and timings row (row 2)
  styleHeaderRow(ws, 1, totalDataCols);
  styleHeaderRow(ws, 2, totalDataCols);

  // Style break cells in day rows (rows 3+)
  days.forEach((day, dayIdx) => {
    const rowIdx = 3 + dayIdx;
    const cols = day === "SATURDAY" && saturdayCols.length > 0 ? saturdayCols : primaryCols;
    primaryCols.forEach((primaryCol, colIdx) => {
      const col = cols[colIdx];
      if (!col || col.slotType !== "PERIOD") {
        styleBreakCell(ws, rowIdx, colIdx + 1);
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx + 1 });
        if (col) {
          ws[addr] = { v: col.label, t: "s", s: ws[addr]?.s };
        }
      }
    });
  });

  // Excel dropdown validation for period cells
  if (subjectNames && subjectNames.length > 0) {
    const dvList = subjectNames.join(",");
    const dvs = [];
    days.forEach((day, dayIdx) => {
      const rowIdx = 3 + dayIdx;
      const cols = day === "SATURDAY" && saturdayCols.length > 0 ? saturdayCols : primaryCols;
      primaryCols.forEach((primaryCol, colIdx) => {
        const col = cols[colIdx];
        if (col && col.slotType === "PERIOD") {
          dvs.push({
            sqref: XLSX.utils.encode_cell({ r: rowIdx, c: colIdx + 1 }),
            type: "list",
            formula1: `"${dvList}"`,
            showDropDown: false,
            showErrorMessage: true,
            errorTitle: "Invalid Subject",
            error: `Subject must be one of the assigned subjects for ${className}.`,
          });
        }
      });
    });
    ws["!dataValidation"] = dvs;
  }

  return ws;
}

// ═══════════════════════════════════════════════════════════════
//  DOWNLOAD ALL CLASSES TEMPLATE
//  GET /api/timetable-excel/download-all?academicYearId=xxx
//
//  NEW FORMAT (v2):
//  Sheet 1 — "All Classes Timetable"
//    For each class:
//      Row N  : CLASS NAME: <className>         (green marker row)
//      Row N+1: DAYS/PERIODS header
//      Row N+2: TIMINGS
//      Row N+3 to N+3+days: day rows
//      (blank separator row between classes)
//  Sheet 2 — "Class Subjects"
//    Columns: Class Name | Subject Name
// ═══════════════════════════════════════════════════════════════

export const downloadAllTimetableTemplate = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYearId } = req.query;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const config = await loadConfig(schoolId, academicYearId);
    if (!config || config.periodDefinitions.length === 0)
      return res.status(404).json({ message: "Timetable configuration not found. Please set up school timings first." });

    const periodDefs = config.periodDefinitions;
    const { rows: sampleRows, primaryCols, saturdayCols, days } = buildTimetableAOA(periodDefs, "");

    const totalDataCols = sampleRows[0].length; // header cols count

    const classes = await prisma.classSection.findMany({
      where: { schoolId },
      include: { classSubjects: { include: { subject: true } } },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });

    if (classes.length === 0)
      return res.status(404).json({ message: "No classes found." });

    const wb = XLSX.utils.book_new();

    // ── Build single combined AOA for all classes ─────────────────
    const combinedAOA = [];

    // Class Subjects sheet rows
    const classSubjectsRows = [["Class Name", "Subject Name"]];

    for (let ci = 0; ci < classes.length; ci++) {
      const cls = classes[ci];
      const subjectNames = cls.classSubjects
        .map((cs) => cs.subject?.name)
        .filter(Boolean)
        .sort();

      // Populate Class Subjects sheet
      subjectNames.forEach((name) => classSubjectsRows.push([cls.name, name]));

      // CLASS NAME marker row
      const markerRow = [`${CLASS_MARKER_PREFIX} ${cls.name}`, ...Array(totalDataCols - 1).fill("")];
      combinedAOA.push(markerRow);

      // DAYS/PERIODS header row (reuse sampleRows[0])
      combinedAOA.push([...sampleRows[0]]);

      // TIMINGS row
      combinedAOA.push([...sampleRows[1]]);

      // Day rows
      days.forEach((day) => {
        const cols = day === "SATURDAY" && saturdayCols.length > 0 ? saturdayCols : primaryCols;
        const cells = primaryCols.map((primaryCol, idx) => {
          const matchingCol = cols[idx];
          if (!matchingCol || matchingCol.slotType !== "PERIOD") return matchingCol?.label || "";
          return "";
        });
        combinedAOA.push([DAY_DISPLAY[day], ...cells]);
      });

      // Blank separator row between classes (not after last class)
      if (ci < classes.length - 1) {
        combinedAOA.push(Array(totalDataCols).fill(""));
      }
    }

    const mainWs = XLSX.utils.aoa_to_sheet(combinedAOA);

    mainWs["!cols"] = [
      { wch: 24 },
      ...primaryCols.map((col) => ({
        wch: col.slotType === "PERIOD" ? 16 : 12,
      })),
    ];

    // Apply styles row by row
    let currentRow = 0;
    const ROWS_PER_CLASS = 3 + days.length; // marker + header + timings + days

    for (let ci = 0; ci < classes.length; ci++) {
      const cls = classes[ci];
      const subjectNames = cls.classSubjects
        .map((cs) => cs.subject?.name)
        .filter(Boolean)
        .sort();

      const markerRowIdx = currentRow;
      const headerRowIdx = currentRow + 1;
      const timingsRowIdx = currentRow + 2;
      const dayStartIdx = currentRow + 3;

      // Style class marker row
      styleClassMarkerRow(mainWs, markerRowIdx, totalDataCols);

      // Style header + timings rows
      styleHeaderRow(mainWs, headerRowIdx, totalDataCols);
      styleHeaderRow(mainWs, timingsRowIdx, totalDataCols);

      // Style break cells in day rows & add data validation
      const dvs = mainWs["!dataValidation"] || [];
      const dvList = subjectNames.join(",");

      days.forEach((day, dayIdx) => {
        const rowIdx = dayStartIdx + dayIdx;
        const cols = day === "SATURDAY" && saturdayCols.length > 0 ? saturdayCols : primaryCols;
        primaryCols.forEach((primaryCol, colIdx) => {
          const col = cols[colIdx];
          if (!col || col.slotType !== "PERIOD") {
            styleBreakCell(mainWs, rowIdx, colIdx + 1);
          } else if (subjectNames.length > 0) {
            dvs.push({
              sqref: XLSX.utils.encode_cell({ r: rowIdx, c: colIdx + 1 }),
              type: "list",
              formula1: `"${dvList}"`,
              showDropDown: false,
              showErrorMessage: true,
              errorTitle: "Invalid Subject",
              error: `Subject must be one of the assigned subjects for ${cls.name}.`,
            });
          }
        });
      });

      if (dvs.length > 0) mainWs["!dataValidation"] = dvs;

      // Advance cursor: marker + header + timings + days + blank separator
      currentRow += ROWS_PER_CLASS + (ci < classes.length - 1 ? 1 : 0);
    }

    XLSX.utils.book_append_sheet(wb, mainWs, "All Classes Timetable");

    // ── Class Subjects sheet ──────────────────────────────────────
    const classSubjectsWs = XLSX.utils.aoa_to_sheet(classSubjectsRows);
    classSubjectsWs["!cols"] = [{ wch: 22 }, { wch: 28 }];
    styleHeaderRow(classSubjectsWs, 0, 2);
    XLSX.utils.book_append_sheet(wb, classSubjectsWs, "Class Subjects");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="All_Classes_Timetable_Template.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  DOWNLOAD SINGLE CLASS TEMPLATE
//  GET /api/timetable-excel/download-single/:classSectionId?academicYearId=xxx
//
//  Sheet 1 — "<ClassName>"
//    Row 0: CLASS NAME: <name>   ← auto-detect identifier
//    Row 1: DAYS/PERIODS header
//    Row 2: TIMINGS
//    Row 3+: day rows
//  Sheet 2 — "Class Subjects"
//    Subject Name column
// ═══════════════════════════════════════════════════════════════

export const downloadSingleTimetableTemplate = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classSectionId } = req.params;
    const { academicYearId } = req.query;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const config = await loadConfig(schoolId, academicYearId);
    if (!config || config.periodDefinitions.length === 0)
      return res.status(404).json({ message: "Timetable configuration not found. Please set up school timings first." });

    const cls = await prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
      include: { classSubjects: { include: { subject: true } } },
    });
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const subjectNames = cls.classSubjects
      .map((cs) => cs.subject?.name)
      .filter(Boolean)
      .sort();

    const periodDefs = config.periodDefinitions;
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Timetable (with CLASS NAME row) ─────────────────
    const timetableWs = buildTimetableSheet(periodDefs, subjectNames, cls.name);
    XLSX.utils.book_append_sheet(wb, timetableWs, cls.name.substring(0, 31));

    // ── Sheet 2: Class Subjects ────────────────────────────────────
    const subjectsAoa = [
      ["Subject Name"],
      ...subjectNames.map((name) => [name]),
    ];
    const subjectsWs = XLSX.utils.aoa_to_sheet(subjectsAoa);
    subjectsWs["!cols"] = [{ wch: 28 }];
    styleHeaderRow(subjectsWs, 0, 1);
    XLSX.utils.book_append_sheet(wb, subjectsWs, "Class Subjects");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${cls.name}_Timetable_Template.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  UPLOAD ALL CLASSES TIMETABLE  (new single-sheet format)
//  POST /api/timetable-excel/upload-all
//  Body: multipart/form-data  { academicYearId, file }
//
//  Reads "All Classes Timetable" sheet (sheet[0] or by name).
//  Parses blocks delimited by "CLASS NAME: <name>" marker rows.
//  Reads subjects from "Class Subjects" sheet to validate per-class.
// ═══════════════════════════════════════════════════════════════

export const uploadAllTimetableTemplate = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYearId } = req.body;

    if (!req.file)
      return res.status(400).json({ message: "Excel file is required" });
    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const config = await loadConfig(schoolId, academicYearId);
    if (!config)
      return res.status(404).json({ message: "Timetable configuration not found" });

    const periodDefs = config.periodDefinitions;

    const weekdayPeriods = periodDefs
      .filter((d) => d.dayType === "WEEKDAY" && d.slotType === "PERIOD")
      .sort((a, b) => a.order - b.order);
    const saturdayPeriods = periodDefs
      .filter((d) => d.dayType === "SATURDAY" && d.slotType === "PERIOD")
      .sort((a, b) => a.order - b.order);
    const weekdayAllCols = periodDefs
      .filter((d) => d.dayType === "WEEKDAY")
      .sort((a, b) => a.order - b.order);
    const saturdayAllCols = periodDefs
      .filter((d) => d.dayType === "SATURDAY")
      .sort((a, b) => a.order - b.order);
    const primaryCols = weekdayAllCols.length > 0 ? weekdayAllCols : saturdayAllCols;

    // Load all classes with subjects
    const classes = await prisma.classSection.findMany({
      where: { schoolId },
      include: { classSubjects: { include: { subject: true } } },
    });
    const classMap = new Map(classes.map((c) => [c.name.toLowerCase().trim(), c]));

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });

    // ── Find the main timetable sheet ─────────────────────────────
    // Accept "All Classes Timetable" by name, or fall back to the first non-"Class Subjects" sheet
    let mainSheetName = wb.SheetNames.find(
      (n) => n.toLowerCase() === "all classes timetable"
    );
    if (!mainSheetName) {
      mainSheetName = wb.SheetNames.find(
        (n) => n.toLowerCase() !== "class subjects"
      );
    }
    if (!mainSheetName) {
      return res.status(400).json({ message: "Could not find the timetable sheet in the uploaded file." });
    }

    const mainSheet = wb.Sheets[mainSheetName];
    const allRows = XLSX.utils.sheet_to_json(mainSheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    // ── Parse "Class Subjects" sheet (optional but preferred) ─────
    // Build map: className → Set<subjectNameLower>
    const classSubjectsSheet = wb.Sheets["Class Subjects"];
    const uploadedSubjectMap = new Map(); // className lower → Set<subjectLower>
    if (classSubjectsSheet) {
      const csRows = XLSX.utils.sheet_to_json(classSubjectsSheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      // csRows[0] = header; csRows[1+] = [className, subjectName]
      for (let i = 1; i < csRows.length; i++) {
        const row = csRows[i];
        const clsName = String(row[0] || "").trim().toLowerCase();
        const subName = String(row[1] || "").trim().toLowerCase();
        if (!clsName || !subName) continue;
        if (!uploadedSubjectMap.has(clsName)) uploadedSubjectMap.set(clsName, new Set());
        uploadedSubjectMap.get(clsName).add(subName);
      }
    }

    // ── Split allRows into per-class blocks ───────────────────────
    // A block starts at a row whose first cell matches "CLASS NAME: ..."
    const blocks = []; // [{ className, rows: [...] }]
    let currentBlock = null;

    for (const row of allRows) {
      const firstCell = String(row[0] || "").trim();
      if (firstCell.toUpperCase().startsWith(CLASS_MARKER_PREFIX.toUpperCase())) {
        // Start a new block
        const detectedName = firstCell.slice(CLASS_MARKER_PREFIX.length).trim();
        currentBlock = { className: detectedName, rows: [] };
        blocks.push(currentBlock);
      } else if (currentBlock) {
        currentBlock.rows.push(row);
      }
    }

    let classesUpdated = 0;
    let totalEntriesCreated = 0;
    let totalEntriesUpdated = 0;
    const failedDetails = [];

    for (const block of blocks) {
      const { className, rows } = block;
      if (!className) continue;

      const cls = classMap.get(className.toLowerCase().trim());
      if (!cls) {
        failedDetails.push({
          class: className,
          day: "-",
          period: "-",
          reason: `Class "${className}" not found in the system`,
        });
        continue;
      }

      // Build subject map for this class from DB
      const classSubjectMap = new Map(
        cls.classSubjects.map((cs) => [
          cs.subject.name.toLowerCase().trim(),
          cs.subject,
        ])
      );

      // block.rows layout:
      //  [0] = DAYS/PERIODS header  (skip)
      //  [1] = TIMINGS row          (skip)
      //  [2+] = day rows
      const entries = [];

      for (let rowIdx = 2; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        const dayRaw = String(row[0] || "").trim().toUpperCase();

        if (!dayRaw || !VALID_DAYS.includes(dayRaw)) {
          if (dayRaw) {
            failedDetails.push({
              class: cls.name,
              day: dayRaw,
              period: "-",
              reason: `Invalid day "${dayRaw}"`,
            });
          }
          continue;
        }

        const isSaturday = dayRaw === "SATURDAY";
        const periodSlots =
          isSaturday && saturdayPeriods.length > 0 ? saturdayPeriods : weekdayPeriods;
        const allCols =
          isSaturday && saturdayAllCols.length > 0 ? saturdayAllCols : primaryCols;

        let periodIdx = 0;
        for (let colIdx = 1; colIdx < row.length; colIdx++) {
          const colDef = allCols[colIdx - 1];
          if (!colDef) break;
          if (colDef.slotType !== "PERIOD") continue;

          const period = periodSlots[periodIdx++];
          if (!period) break;

          const raw = String(row[colIdx] || "").trim();
          if (!raw) continue;

          const lines = raw.split("\n").map((x) => x.trim()).filter(Boolean);
          const subjectName = lines[0];
          if (!subjectName) continue;

          const subject = classSubjectMap.get(subjectName.toLowerCase().trim());
          if (!subject) {
            failedDetails.push({
              class: cls.name,
              day: dayRaw,
              period: period.label,
              reason: `Subject "${subjectName}" is not assigned to ${cls.name}. Assign it first.`,
            });
            continue;
          }

          entries.push({
            schoolId,
            academicYearId,
            classSectionId: cls.id,
            configId: config.id,
            periodDefinitionId: period.id,
            day: dayRaw,
            subjectId: subject.id,
            teacherId: null,
          });
        }
      }

      await prisma.$transaction(async (tx) => {
        const existing = await tx.timetableEntry.count({
          where: { classSectionId: cls.id, academicYearId, schoolId },
        });
        await tx.timetableEntry.deleteMany({
          where: { classSectionId: cls.id, academicYearId, schoolId },
        });
        if (entries.length > 0) {
          await tx.timetableEntry.createMany({ data: entries });
        }
        if (existing > 0) totalEntriesUpdated += existing;
        totalEntriesCreated += entries.length;
      });

      classesUpdated++;
    }

    await cacheService.invalidateSchool(schoolId);

    return res.json({
      success: true,
      summary: {
        classesUpdated,
        entriesCreated: totalEntriesCreated,
        entriesUpdated: totalEntriesUpdated,
        failedRows: failedDetails.length,
        failedDetails,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  UPLOAD SINGLE CLASS TIMETABLE
//  POST /api/timetable-excel/upload-single/:classSectionId
//  Body: multipart/form-data  { academicYearId, file }
//
//  NEW (v2):
//  - Reads "CLASS NAME: <name>" from row 0 of the first sheet.
//  - Auto-detects the class from that name (case-insensitive lookup).
//  - classSectionId in the URL is used as fallback if the marker is absent.
//  - Returns detectedClassName in the response so the UI can display it.
// ═══════════════════════════════════════════════════════════════

export const uploadSingleTimetableTemplate = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classSectionId: urlClassSectionId } = req.params;
    const { academicYearId } = req.body;

    if (!req.file)
      return res.status(400).json({ message: "Excel file is required" });
    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const config = await loadConfig(schoolId, academicYearId);
    if (!config)
      return res.status(404).json({ message: "Timetable configuration not found" });

    const periodDefs = config.periodDefinitions;

    const weekdayPeriods = periodDefs
      .filter((d) => d.dayType === "WEEKDAY" && d.slotType === "PERIOD")
      .sort((a, b) => a.order - b.order);
    const saturdayPeriods = periodDefs
      .filter((d) => d.dayType === "SATURDAY" && d.slotType === "PERIOD")
      .sort((a, b) => a.order - b.order);
    const weekdayAllCols = periodDefs
      .filter((d) => d.dayType === "WEEKDAY")
      .sort((a, b) => a.order - b.order);
    const saturdayAllCols = periodDefs
      .filter((d) => d.dayType === "SATURDAY")
      .sort((a, b) => a.order - b.order);
    const primaryCols = weekdayAllCols.length > 0 ? weekdayAllCols : saturdayAllCols;

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    // ── Auto-detect class from CLASS NAME marker (row 0) ─────────
    let detectedClassName = null;
    let dataStartRow = 2; // default: no marker, rows[0]=header, rows[1]=timings

    if (rows.length > 0) {
      const firstCell = String(rows[0][0] || "").trim();
      if (firstCell.toUpperCase().startsWith(CLASS_MARKER_PREFIX.toUpperCase())) {
        detectedClassName = firstCell.slice(CLASS_MARKER_PREFIX.length).trim();
        dataStartRow = 3; // marker=0, header=1, timings=2, data starts at 3
      }
    }

    // ── Resolve class: detected name → DB lookup → URL fallback ──
    let cls = null;

    if (detectedClassName) {
      // Load all classes for this school and find by name (case-insensitive)
      const allClasses = await prisma.classSection.findMany({
        where: { schoolId },
        include: { classSubjects: { include: { subject: true } } },
      });
      cls = allClasses.find(
        (c) => c.name.toLowerCase().trim() === detectedClassName.toLowerCase().trim()
      ) || null;
    }

    // Fallback: use URL param
    if (!cls && urlClassSectionId) {
      cls = await prisma.classSection.findFirst({
        where: { id: urlClassSectionId, schoolId },
        include: { classSubjects: { include: { subject: true } } },
      });
    }

    if (!cls)
      return res.status(404).json({
        message: detectedClassName
          ? `Class "${detectedClassName}" detected from Excel but not found in the system. Check the class name.`
          : "Class not found",
      });

    const classSubjectMap = new Map(
      cls.classSubjects.map((cs) => [
        cs.subject.name.toLowerCase().trim(),
        cs.subject,
      ])
    );

    const entries = [];
    const failedDetails = [];

    for (let rowIdx = dataStartRow; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const dayRaw = String(row[0] || "").trim().toUpperCase();

      if (!dayRaw || !VALID_DAYS.includes(dayRaw)) {
        if (dayRaw) {
          failedDetails.push({
            class: cls.name,
            day: dayRaw,
            period: "-",
            reason: `Invalid day "${dayRaw}"`,
          });
        }
        continue;
      }

      const isSaturday = dayRaw === "SATURDAY";
      const periodSlots =
        isSaturday && saturdayPeriods.length > 0 ? saturdayPeriods : weekdayPeriods;
      const allCols =
        isSaturday && saturdayAllCols.length > 0 ? saturdayAllCols : primaryCols;

      let periodIdx = 0;
      for (let colIdx = 1; colIdx < row.length; colIdx++) {
        const colDef = allCols[colIdx - 1];
        if (!colDef) break;
        if (colDef.slotType !== "PERIOD") continue;

        const period = periodSlots[periodIdx++];
        if (!period) break;

        const raw = String(row[colIdx] || "").trim();
        if (!raw) continue;

        const lines = raw.split("\n").map((x) => x.trim()).filter(Boolean);
        const subjectName = lines[0];
        if (!subjectName) continue;

        const subject = classSubjectMap.get(subjectName.toLowerCase().trim());
        if (!subject) {
          failedDetails.push({
            class: cls.name,
            day: dayRaw,
            period: period.label,
            reason: `Subject "${subjectName}" is not assigned to ${cls.name}.`,
          });
          continue;
        }

        entries.push({
          schoolId,
          academicYearId,
          classSectionId: cls.id,
          configId: config.id,
          periodDefinitionId: period.id,
          day: dayRaw,
          subjectId: subject.id,
          teacherId: null,
        });
      }
    }

    let entriesCreated = 0;
    let entriesUpdated = 0;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.timetableEntry.count({
        where: { classSectionId: cls.id, academicYearId, schoolId },
      });
      entriesUpdated = existing;
      await tx.timetableEntry.deleteMany({
        where: { classSectionId: cls.id, academicYearId, schoolId },
      });
      if (entries.length > 0) {
        await tx.timetableEntry.createMany({ data: entries });
        entriesCreated = entries.length;
      }
    });

    await cacheService.invalidateSchool(schoolId);

    return res.json({
      success: true,
      // detectedClassName lets the frontend show a "Detected class: X" banner
      detectedClassName: cls.name,
      detectedClassId: cls.id,
      summary: {
        classesUpdated: 1,
        entriesCreated,
        entriesUpdated,
        failedRows: failedDetails.length,
        failedDetails,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};