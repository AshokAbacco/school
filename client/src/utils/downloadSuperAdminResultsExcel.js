// client/src/utils/downloadSuperAdminResultsExcel.js

const FONT = "Calibri";

export function downloadSuperAdminResultsExcel(rows, options) {
  if (!rows) rows = [];
  if (!options) options = {};

  const run = function(ExcelJS) {
    _generate(ExcelJS, rows, options);
  };

  if (window.ExcelJS) {
    run(window.ExcelJS);
  } else {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    s.onload = function() { run(window.ExcelJS); };
    s.onerror = function() { console.error("ExcelJS failed to load"); };
    document.head.appendChild(s);
  }
}

async function _generate(ExcelJS, rows, options) {
  const schoolName = options.schoolName || "School";
  const examName   = options.examName   || "Exam";
  const termName   = options.termName   || "";
  const className  = options.className  || "All Classes";

  const wb     = new ExcelJS.Workbook();
  wb.creator   = schoolName;
  wb.created   = new Date();

  const ws = wb.addWorksheet("Results", { views: [{ showGridLines: true }] });

  ws.columns = [
    { header: "Student Name",   key: "studentName",   width: 22 },
    { header: "Gender",         key: "gender",        width: 10 },
    { header: "Admission No",   key: "admissionNo",   width: 16 },
    { header: "Roll No",        key: "rollNo",        width: 10 },
    { header: "Class",          key: "class",         width: 10 },
    { header: "Grade",          key: "grade",         width: 8  },
    { header: "Section",        key: "section",       width: 10 },
    { header: "Exam",           key: "exam",          width: 22 },
    { header: "Term",           key: "term",          width: 14 },
    { header: "Marks Obtained", key: "marksObtained", width: 16 },
    { header: "Max Marks",      key: "maxMarks",      width: 12 },
    { header: "Percentage (%)", key: "percentage",    width: 16 },
    { header: "Result Grade",   key: "resultGrade",   width: 14 },
  ];

  const hdr = ws.getRow(1);
  hdr.height = 18;
  hdr.eachCell(function(cell) {
    cell.font      = { name: FONT, size: 11, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  rows.forEach(function(r) {
    const dataRow = ws.addRow({
      studentName:   r.studentName     || "",
      gender:        r.gender          || "",
      admissionNo:   r.admissionNumber || "",
      rollNo:        r.rollNumber      || "",
      class:         r.className       || "",
      grade:         r.grade           || "",
      section:       r.section         || "",
      exam:          examName,
      term:          termName,
      marksObtained: Number(r.totalMarks  || 0),
      maxMarks:      Number(r.maxMarks    || 0),
      percentage:    Number(r.percentage  || 0),
      resultGrade:   r.resultGrade     || "",
    });

    dataRow.height = 15;
    dataRow.font   = { name: FONT, size: 11 };

    ["marksObtained", "maxMarks", "percentage"].forEach(function(key) {
      dataRow.getCell(key).alignment = { horizontal: "right" };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const today = new Date().toISOString().slice(0, 10);
  const safe  = function(s) {
    return (s || "").replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  };

  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "Results_" + safe(examName) + "_" + safe(className) + "_" + today + ".xlsx";
  a.click();
}