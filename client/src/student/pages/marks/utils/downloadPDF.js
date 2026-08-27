// client/src/student/pages/marks/utils/downloadPDF.js
// Modern Dashboard A4 portrait — clean, compact layout matching Stormy
// Morning theme. Supports the school logo and 4 selectable colour themes.
// Sizing is tuned to fit up to ~6 subjects on a single page.

import { GRADE_SCALE, C, FONT } from "../tokens.js";

function rl(status) {
  if (status === "pass") return "P";
  if (status === "fail") return "F";
  return "AB";
}

function buildAddress(enrollment) {
  const parts = [
    enrollment?.schoolAddress,
    enrollment?.schoolCity,
    enrollment?.schoolState,
  ].filter(Boolean);
  return parts.join(", ");
}

function buildContact(enrollment) {
  const parts = [
    enrollment?.schoolPhone  ? `Ph: ${enrollment.schoolPhone}`    : null,
    enrollment?.schoolEmail  ? `Email: ${enrollment.schoolEmail}` : null,
  ].filter(Boolean);
  return parts.join("  ·  ");
}

// ── Colour themes ───────────────────────────────────────────────
export const PDF_THEMES = {
  default: {
    key: "default",
    name: "Default",
    swatch: C?.light ?? "#88bdf2",
    dark: C?.dark ?? "#1e293b",
    mid: C?.mid ?? "#64748b",
    light: C?.light ?? "#88bdf2",
    bgLight: "rgba(237,243,250,0.7)",
    border: "rgba(136,189,242,0.25)",
    textLight: C?.textLight ?? "#94a3b8",
    pass: "#10b981",
    fail: "#ef4444",
  },
  yellow: {
    key: "yellow",
    name: "Yellow",
    swatch: "#f5c518",
    dark: "#7a5b00",
    mid: "#8a6d1f",
    light: "#f5c518",
    bgLight: "rgba(255,247,214,0.75)",
    border: "rgba(245,197,24,0.35)",
    textLight: "#b08d2b",
    pass: "#10b981",
    fail: "#ef4444",
  },
  blue: {
    key: "blue",
    name: "Blue",
    swatch: "#2f80ed",
    dark: "#0b3d91",
    mid: "#3d5a80",
    light: "#2f80ed",
    bgLight: "rgba(224,238,255,0.75)",
    border: "rgba(47,128,237,0.30)",
    textLight: "#5c7ca6",
    pass: "#10b981",
    fail: "#ef4444",
  },
  red: {
    key: "red",
    name: "Red",
    swatch: "#e5484d",
    dark: "#7a1224",
    mid: "#9a5158",
    light: "#e5484d",
    bgLight: "rgba(255,231,231,0.75)",
    border: "rgba(229,72,77,0.32)",
    textLight: "#b66b70",
    pass: "#10b981",
    fail: "#b3261e",
  },
};

const PDF_API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:5000";

async function fetchAsDataUrl(fetchUrl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(fetchUrl, { signal: controller.signal });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function toDataUrl(url, timeoutMs = 6000) {
  if (!url) return null;
  const proxied = `${PDF_API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
  const viaProxy = await fetchAsDataUrl(proxied, timeoutMs);
  if (viaProxy) return viaProxy;
  return fetchAsDataUrl(url, timeoutMs);
}

function loadHtml2Pdf() {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) return resolve(window.html2pdf);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => resolve(window.html2pdf);
    script.onerror = () => reject(new Error("Failed to load html2pdf library"));
    document.head.appendChild(script);
  });
}

export async function downloadReportPDF(reportData, themeKey = "default", attendance = [], remarks = "") {
  if (!reportData) return;

  let html2pdf;
  try {
    html2pdf = await loadHtml2Pdf();
  } catch (err) {
    console.error(err);
    alert("Could not load PDF generation library. Please check your internet connection.");
    return;
  }

  const { student, enrollment, exam, subjectResults, summary } = reportData;

  const logoDataUrl = await toDataUrl(enrollment?.schoolLogoUrl);

  const schoolName    = (enrollment?.schoolName   ?? "SCHOOL NAME").toUpperCase();
  const schoolAddr    = buildAddress(enrollment);
  const schoolContact = buildContact(enrollment);

  const className    = enrollment?.className    ?? "—";
  const academicYear = enrollment?.academicYear ?? "—";
  const examName     = exam?.name               ?? "Examination";
  const termName     = exam?.term?.name         ?? "";
  const studentName  = (student?.name          ?? "—").toUpperCase();
  const admNo        = student?.admissionNumber ?? "—";
  const rollNo        = student?.rollNumber      ?? "—";
  const dob          = student?.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "—";
  const gender       = student?.gender ?? "—";
  const today        = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const examTitle    = [termName, examName].filter(Boolean).join(" — ").toUpperCase();
  const overallResult = summary?.hasFail ? "FAIL" : "PASS";

  const palette = PDF_THEMES[themeKey] || PDF_THEMES.default;

  const isFA = (subjectResults ?? []).some((s) => s.components);
  const isCombined = (subjectResults ?? []).some((s) => s.isCombined);

  const subjectRows = isCombined
    ? (subjectResults ?? []).map((s, i) => {
        const absent = s.isAbsent;
        const bg     = i % 2 === 0 ? "rgba(237,243,250,0.25)" : "#ffffff";
        return `
      <tr style="background:${bg}; ${absent ? "color:" + palette.textLight + "; font-style:italic;" : ""}">
        <td class="tc" style="color: ${palette.mid};">${i + 1}</td>
        <td class="tl" style="font-weight:600; color: ${palette.dark};">${s.subjectName}${s.subjectCode ? ` <span style="font-size:6.5pt; font-weight:400; color:${palette.textLight};">(${s.subjectCode})</span>` : ""}</td>
        <td class="tc">${absent ? "AB" : (s.mainObtained ?? "—")}/${s.mainMax ?? "—"}</td>
        <td class="tc">${s.subExamObtained ?? "—"}/${s.subExamMax ?? "—"}</td>
        <td class="tc fw" style="font-size:9pt; color: ${palette.dark};">${s.totalObtained ?? "—"}</td>
        <td class="tc fw" style="color: ${palette.dark};">${absent ? "—" : (s.grade ?? "—")}</td>
        <td class="tc">${absent ? "—" : (s.percentage != null ? `${s.percentage}%` : "—")}</td>
      </tr>`;
      }).join("")
    : isFA
    ? (subjectResults ?? []).map((s, i) => {
        const absent = s.isAbsent;
        const bg     = i % 2 === 0 ? "rgba(237,243,250,0.25)" : "#ffffff";
        const comp   = s.components || {};
        return `
      <tr style="background:${bg}; ${absent ? "color:" + palette.textLight + "; font-style:italic;" : ""}">
        <td class="tc" style="color: ${palette.mid};">${i + 1}</td>
        <td class="tl" style="font-weight:600; color: ${palette.dark};">${s.subjectName}${s.subjectCode ? ` <span style="font-size:6.5pt; font-weight:400; color:${palette.textLight};">(${s.subjectCode})</span>` : ""}</td>
        <td class="tc">${absent ? "—" : (comp.rr ?? "—")}</td>
        <td class="tc">${absent ? "—" : (comp.cw ?? "—")}</td>
        <td class="tc">${absent ? "—" : (comp.pw ?? "—")}</td>
        <td class="tc">${absent ? "—" : (comp.st ?? "—")}</td>
        <td class="tc fw" style="font-size:9pt; color: ${palette.dark};">${absent ? "AB" : (s.marksObtained ?? "—")}</td>
        <td class="tc fw" style="color: ${palette.dark};">${absent ? "—" : (s.grade ?? "—")}</td>
        <td class="tc">${absent ? "—" : (s.percentage != null ? `${s.percentage}%` : "—")}</td>
      </tr>`;
      }).join("")
    : (subjectResults ?? []).map((s, i) => {
        const absent  = s.isAbsent;
        const bg      = i % 2 === 0 ? "rgba(237,243,250,0.25)" : "#ffffff";
        return `
      <tr style="background:${bg}; ${absent ? "color:" + palette.textLight + "; font-style:italic;" : ""}">
        <td class="tc" style="color: ${palette.mid};">${i + 1}</td>
        <td class="tl" style="font-weight:600; color: ${palette.dark};">${s.subjectName}${s.subjectCode ? ` <span style="font-size:6.5pt; font-weight:400; color:${palette.textLight};">(${s.subjectCode})</span>` : ""}</td>
        <td class="tc">${s.maxMarks}</td>
        <td class="tc">${s.passingMarks ?? "—"}</td>
        <td class="tc fw" style="font-size:9pt; color: ${palette.dark};">${absent ? "AB" : (s.marksObtained ?? "—")}</td>
        <td class="tc">${absent ? "—" : (s.percentage != null ? `${s.percentage}%` : "—")}</td>
        <td class="tc fw" style="color: ${palette.dark};">${absent ? "—" : (s.grade ?? "—")}</td>
        <td class="tc fw" style="color: ${s.resultStatus === 'fail' ? palette.fail : palette.pass};">${rl(s.resultStatus)}</td>
      </tr>`;
      }).join("");

  const gradeRows = GRADE_SCALE.map(g => `
    <tr>
      <td class="tc fw" style="color: ${palette.dark};">${g.grade}</td>
      <td class="tc" style="color: ${palette.mid};">${g.min}–${g.max}%</td>
      <td class="tl" style="color: ${palette.mid};">${g.label}</td>
    </tr>`).join("");

  const FA_LEGEND = [
    { abbr: "R&R", label: "Read and reflection" },
    { abbr: "CW",  label: "Class Work Performance" },
    { abbr: "PW",  label: "Project Work Performance" },
    { abbr: "ST",  label: "Slip Test (FA 1 Exams Performance)" },
    { abbr: "TOT", label: "Total" },
    { abbr: "GRD", label: "Grade" },
  ];
  const faLegendRows = FA_LEGEND.map(g => `
    <tr>
      <td class="tc fw" style="color: ${palette.dark}; width:34px;">${g.abbr}</td>
      <td class="tl" style="color: ${palette.mid};">${g.label}</td>
    </tr>`).join("");

  const subjectTableHead = isCombined
    ? `
      <tr>
        <th style="width:26px;">#</th>
        <th class="tl" style="width:auto;">Subject</th>
        <th style="width:76px;">Final Exam</th>
        <th style="width:76px;">Assessment</th>
        <th style="width:60px;">Total</th>
        <th style="width:54px;">Grade</th>
        <th style="width:64px;">Overall %</th>
      </tr>`
    : isFA
    ? `
      <tr>
        <th style="width:26px;">#</th>
        <th class="tl" style="width:auto;">Subject</th>
        <th style="width:44px;">R&amp;R</th>
        <th style="width:44px;">CW</th>
        <th style="width:44px;">PW</th>
        <th style="width:44px;">ST</th>
        <th style="width:54px;">TOT</th>
        <th style="width:54px;">GRD</th>
        <th style="width:60px;">PER(%)</th>
      </tr>`
    : `
      <tr>
        <th style="width:26px;">#</th>
        <th class="tl" style="width:auto;">Subject</th>
        <th style="width:60px;">Max Marks</th>
        <th style="width:60px;">Pass Marks</th>
        <th style="width:74px;">Marks Obtained</th>
        <th style="width:64px;">Overall %</th>
        <th style="width:54px;">Grade</th>
        <th style="width:54px;">Result</th>
      </tr>`;

  const subjectTableFoot = isCombined
    ? `
      <tr class="tot-row">
        <td class="tc">—</td>
        <td class="tl">Grand Total</td>
        <td class="tc">—</td>
        <td class="tc">—</td>
        <td class="tc" style="font-size:9.5pt;">${summary?.totalObtained ?? "—"}/${summary?.totalMax ?? "—"}</td>
        <td class="tc" style="font-size:9.5pt;">${summary?.grade ?? "—"}</td>
        <td class="tc">${summary?.percentage ?? "—"}%</td>
      </tr>`
    : isFA
    ? `
      <tr class="tot-row">
        <td class="tc">—</td>
        <td class="tl">Grand Total</td>
        <td class="tc">—</td>
        <td class="tc">—</td>
        <td class="tc">—</td>
        <td class="tc">—</td>
        <td class="tc" style="font-size:9.5pt;">${summary?.totalObtained ?? "—"}</td>
        <td class="tc" style="font-size:9.5pt;">${summary?.grade ?? "—"}</td>
        <td class="tc">${summary?.percentage ?? "—"}%</td>
      </tr>`
    : `
      <tr class="tot-row">
        <td class="tc">—</td>
        <td class="tl">Grand Total</td>
        <td class="tc">${summary?.totalMax ?? "—"}</td>
        <td class="tc">—</td>
        <td class="tc" style="font-size:9.5pt;">${summary?.totalObtained ?? "—"}</td>
        <td class="tc">${summary?.percentage ?? "—"}%</td>
        <td class="tc" style="font-size:9.5pt;">${summary?.grade ?? "—"}</td>
        <td class="tc" style="font-size:8pt; color:${summary?.hasFail ? palette.fail : palette.pass} !important;">${overallResult}</td>
      </tr>`;

  // ── Dark section-header style (matches Attendance / Remarks bars) ──
  const sectionHeader = (title) => `
    <div style="font-size: 7.4pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; background: ${palette.dark}; color: #ffffff; padding: 5.5px 0;">
      ${title}
    </div>`;

  const scaleLegendPanel = isFA
    ? `
    <div style="border: 1px solid ${palette.dark}; border-radius: 8px; background: #ffffff; overflow: hidden; display: flex; flex-direction: column;">
      ${sectionHeader("Formative Assessment Key")}
      <div style="padding: 4px; flex-grow: 1;">
        <style>
          .fa-mini-table { width: 100%; border-collapse: collapse; }
          .fa-mini-table td { padding: 2px 4px; font-size: 6pt; border-bottom: 1px dashed ${palette.dark}; }
          .fa-mini-table tr:last-child td { border-bottom: none; }
        </style>
        <table class="fa-mini-table">
          <tbody>${faLegendRows}</tbody>
        </table>
      </div>
    </div>`
    : `
    <div style="border: 1px solid ${palette.dark}; border-radius: 8px; background: #ffffff; overflow: hidden; display: flex; flex-direction: column;">
      ${sectionHeader("Standard Scale")}
      <div style="padding: 4px; flex-grow: 1;">
        <style>
          .grade-mini-table { width: 100%; border-collapse: collapse; }
          .grade-mini-table td { padding: 2px 4px; font-size: 6.3pt; border-bottom: 1px dashed ${palette.dark}; }
          .grade-mini-table tr:last-child td { border-bottom: none; }
        </style>
        <table class="grade-mini-table">
          <tbody>${gradeRows}</tbody>
        </table>
        <div style="font-size: 5.1pt; color: ${palette.textLight}; margin-top: 5px; text-align: center; font-weight: 600;">
          P: Pass &nbsp;·&nbsp; F: Fail &nbsp;·&nbsp; AB: Absent
        </div>
      </div>
    </div>`;

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" style="width:34px; height:34px; border-radius:9px; object-fit:cover; border:1px solid ${palette.dark}; background:#ffffff; flex-shrink:0;" />`
    : `<div style="width: 4px; height: 30px; border-radius: 99px; background: linear-gradient(180deg, ${palette.light} 0%, ${palette.dark} 100%);"></div>`;

  const validAttendance = (attendance ?? []).filter((r) => r?.month && String(r.month).trim() !== "");
  const attendanceSection = validAttendance.length
    ? `
  <div style="border: 1.5px solid ${palette.dark}; border-radius: 7px; overflow: hidden; margin-bottom: 10px;">
    ${sectionHeader("Attendance Report")}
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="border: none; padding: 0;"></td>
        ${validAttendance.map((r) => `<td colspan="2" style="border: 1.5px solid ${palette.dark}; padding: 5px 7px; font-size: 7.2pt; font-weight: 800; color: ${palette.dark}; text-align: center; background: ${palette.bgLight};">${String(r.month).toUpperCase()}</td>`).join("")}
      </tr>
      <tr>
        <td rowspan="2" style="border: 1.5px solid ${palette.dark}; padding: 5px 7px; font-size: 6.8pt; font-weight: 800; color: ${palette.dark}; text-transform: uppercase; vertical-align: middle;">Attendance</td>
        ${validAttendance.map(() => `
          <td style="border: 1.5px solid ${palette.dark}; padding: 5px 7px; font-size: 6.4pt; font-weight: 800; color: ${palette.dark}; text-align: center;">Total Days</td>
          <td style="border: 1.5px solid ${palette.dark}; padding: 5px 7px; font-size: 6.4pt; font-weight: 800; color: ${palette.dark}; text-align: center;">Present Days</td>`).join("")}
      </tr>
      <tr>
        ${validAttendance.map((r) => `
          <td style="border: 1.5px solid ${palette.dark}; padding: 5px 7px; font-size: 7.4pt; font-weight: 700; color: ${palette.dark}; text-align: center;">${r.total !== "" && r.total != null ? r.total : "—"}</td>
          <td style="border: 1.5px solid ${palette.dark}; padding: 5px 7px; font-size: 7.4pt; font-weight: 700; color: ${palette.dark}; text-align: center;">${r.present !== "" && r.present != null ? r.present : "—"}</td>`).join("")}
      </tr>
    </table>
  </div>`
    : "";

  const hasRemarks = remarks && String(remarks).trim() !== "";
  const remarksSection = `
  <div style="border: 1.5px solid ${palette.dark}; border-radius: 7px; overflow: hidden; margin-bottom: 10px;">
    ${sectionHeader("Remarks")}
    ${hasRemarks
      ? `<div style="min-height: 34px; padding: 8px 11px; font-size: 7.4pt; color: ${palette.dark}; font-weight: 500;">
           ${String(remarks).trim()}
         </div>`
      : `<div style="padding: 10px 12px 6px 12px;">
           <div style="border-bottom: 1px solid ${palette.border}; height: 18px;"></div>
           <div style="border-bottom: 1px solid ${palette.border}; height: 18px;"></div>
           <div style="height: 18px;"></div>
         </div>`
    }
  </div>`;

  const element = document.createElement("div");
  element.style.width = "190mm";
  element.style.padding = "0";
  element.style.margin = "0";
  element.style.backgroundColor = "#ffffff";

  element.innerHTML = `
<div style="font-family: ${FONT?.sans ?? "Inter, sans-serif"}; font-size: 7.8pt; color: ${palette.dark}; line-height: 1.35; padding: 3mm;">
  
  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${palette.light}; padding-bottom: 8px; margin-bottom: 10px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      ${logoHtml}
      <div>
        <h1 style="font-size: 12.8pt; font-weight: 800; color: ${palette.dark}; margin: 0; letter-spacing: -0.5px;">${schoolName}</h1>
        ${schoolAddr ? `<div style="font-size: 6.6pt; color: ${palette.mid}; margin-top: 1px;">${schoolAddr} ${schoolContact ? `· ${schoolContact}` : ""}</div>` : ""}
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 8.2pt; font-weight: 800; color: ${palette.light}; letter-spacing: 1px;">REPORT CARD</div>
      <div style="font-size: 6.6pt; color: ${palette.textLight}; font-weight: 500; margin-top: 1px;">${examTitle}</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px;">
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.dark}; padding: 5px 9px; border-radius: 6px;">
      <div style="font-size: 5.6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Student Name</div>
      <div style="font-size: 7.9pt; font-weight: 800; color: ${palette.dark}; margin-top: 1px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${studentName}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.dark}; padding: 5px 9px; border-radius: 6px;">
      <div style="font-size: 5.6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Class & Section</div>
      <div style="font-size: 7.9pt; font-weight: 800; color: ${palette.dark}; margin-top: 1px;">${className}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.dark}; padding: 5px 9px; border-radius: 6px;">
      <div style="font-size: 5.6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Roll Number</div>
      <div style="font-size: 7.9pt; font-weight: 800; color: ${palette.dark}; margin-top: 1px;">${rollNo}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.dark}; padding: 5px 9px; border-radius: 6px;">
      <div style="font-size: 5.6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Admission No.</div>
      <div style="font-size: 7.9pt; font-weight: 800; color: ${palette.dark}; margin-top: 1px;">${admNo}</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;">
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.dark}; padding: 5px 9px; border-radius: 6px;">
      <div style="font-size: 5.6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Date of Birth</div>
      <div style="font-size: 7.9pt; font-weight: 800; color: ${palette.dark}; margin-top: 1px;">${dob}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.dark}; padding: 5px 9px; border-radius: 6px;">
      <div style="font-size: 5.6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Gender</div>
      <div style="font-size: 7.9pt; font-weight: 800; color: ${palette.dark}; margin-top: 1px;">${gender}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.dark}; padding: 5px 9px; border-radius: 6px;">
      <div style="font-size: 5.6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Academic Year</div>
      <div style="font-size: 7.9pt; font-weight: 800; color: ${palette.dark}; margin-top: 1px;">${academicYear}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.dark}; padding: 5px 9px; border-radius: 6px;">
      <div style="font-size: 5.6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Date of Issue</div>
      <div style="font-size: 7.9pt; font-weight: 800; color: ${palette.dark}; margin-top: 1px;">${today}</div>
    </div>
  </div>

  <style>
    .pdf-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 0; }
    .pdf-table th { background: rgba(237,243,250,0.9); font-size: 6.2pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2px; color: ${palette.dark}; padding: 5px 6px; border-bottom: 1.5px solid ${palette.dark}; }
    .pdf-table td { padding: 5px 6px; border-bottom: 1px solid ${palette.dark}; font-size: 7.5pt; color: ${palette.mid}; }
    .pdf-table tr:last-child td { border-bottom: none; }
    .tc { text-align: center; }
    .tl { text-align: left !important; padding-left: 8px !important; }
    .fw { font-weight: 700; }
    .tot-row td { background: rgba(237,243,250,0.85) !important; font-weight: 800; font-size: 7.9pt; color: ${palette.dark} !important; border-top: 1.5px solid ${palette.light} !important; }
  </style>

  <!-- 1. Subject-wise Marks Statement -->
  <div style="border: 1.5px solid ${palette.dark}; border-radius: 7px; overflow: hidden; margin-bottom: 10px;">
    ${sectionHeader("Subject-wise Marks Statement")}
    <table class="pdf-table">
      <thead>
        ${subjectTableHead}
      </thead>
      <tbody>
        ${subjectRows}
      </tbody>
      <tfoot>
        ${subjectTableFoot}
      </tfoot>
    </table>
  </div>

  <!-- 2. Attendance Report -->
  ${attendanceSection}

  <!-- 3. Remarks -->
  ${remarksSection}

  <!-- 4. Standard Scale & Consolidated Performance Overview -->
  <div style="display: grid; grid-template-columns: 150px 1fr; gap: 8px; align-items: stretch; margin-bottom: 8px;">
    
    ${scaleLegendPanel}

    <div style="border: 1px solid ${palette.dark}; border-radius: 7px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden;">
      ${sectionHeader("Consolidated Performance Overview")}
      
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; padding: 6px 6px 0 6px;">
        <div style="border: 1px solid ${palette.dark}; background: ${palette.bgLight}; border-radius: 5px; padding: 3.5px; text-align: center;">
          <div style="font-size: 5.1pt; font-weight: 800; text-transform: uppercase; color: ${palette.mid}; padding-bottom: 2px; margin-bottom: 2.5px; border-bottom: 1px solid ${palette.dark};">Total Obtained</div>
          <div style="font-size: 8.4pt; font-weight: 800; color: ${palette.dark};">${summary?.totalObtained ?? "—"}<span style="font-size:5.5pt; font-weight:500; color:${palette.textLight};">/${summary?.totalMax ?? "—"}</span></div>
        </div>
        
        <div style="border: 1px solid ${palette.dark}; background: ${palette.bgLight}; border-radius: 5px; padding: 3.5px; text-align: center;">
          <div style="font-size: 5.1pt; font-weight: 800; text-transform: uppercase; color: ${palette.mid}; padding-bottom: 2px; margin-bottom: 2.5px; border-bottom: 1px solid ${palette.dark};">Percentage</div>
          <div style="font-size: 8.4pt; font-weight: 800; color: ${palette.dark};">${summary?.percentage ?? "—"}%</div>
        </div>
        
        <div style="border: 1px solid ${palette.dark}; background: ${palette.bgLight}; border-radius: 5px; padding: 3.5px; text-align: center;">
          <div style="font-size: 5.1pt; font-weight: 800; text-transform: uppercase; color: ${palette.mid}; padding-bottom: 2px; margin-bottom: 2.5px; border-bottom: 1px solid ${palette.dark};">Overall Grade</div>
          <div style="font-size: 8.4pt; font-weight: 800; color: ${palette.dark};">${summary?.grade ?? "—"}</div>
        </div>
        
        <div style="border: 1px solid ${palette.dark}; background: ${palette.bgLight}; border-radius: 5px; padding: 3.5px; text-align: center;">
          <div style="font-size: 5.1pt; font-weight: 800; text-transform: uppercase; color: ${palette.mid}; padding-bottom: 2px; margin-bottom: 2.5px; border-bottom: 1px solid ${palette.dark};">Class Rank</div>
          <div style="font-size: 8.4pt; font-weight: 800; color: ${palette.dark};">${summary?.rank != null ? `#${summary.rank}` : "—"}</div>
          <div style="font-size: 4.6pt; color: ${palette.textLight};">of ${summary?.totalStudentsInClass ?? "—"}</div>
        </div>
        
        <div style="border: 1px solid ${summary?.hasFail ? palette.fail : palette.light}; background: #ffffff; border-radius: 5px; padding: 3.5px; text-align: center;">
          <div style="font-size: 5.1pt; font-weight: 800; text-transform: uppercase; color: ${summary?.hasFail ? palette.fail : palette.light}; padding-bottom: 2px; margin-bottom: 2.5px; border-bottom: 1px solid ${summary?.hasFail ? 'rgba(239,68,68,0.2)' : palette.dark};">Final Result</div>
          <div style="font-size: 9pt; font-weight: 900; color: ${summary?.hasFail ? palette.fail : palette.pass}; letter-spacing: 0.5px;">${overallResult}</div>
        </div>
      </div>
      
      <div style="margin-top: auto; padding: 10px 8px 6px 8px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center; width: 95px;">
          <div style="border-top: 1px solid ${palette.dark}; margin-bottom: 2px;"></div>
          <div style="font-size: 5.3pt; font-weight: 800; color: ${palette.mid}; text-transform: uppercase; letter-spacing: 0.2px;">Principal Signature</div>
        </div>
        <div style="text-align: center; width: 95px;">
          <div style="border-top: 1px solid ${palette.dark}; margin-bottom: 2px;"></div>
          <div style="font-size: 4.6pt; font-weight: 900; color: ${palette.mid}; text-transform: uppercase; letter-spacing: 0.2px;">Class Teacher Signature</div>
        </div>
        
        <div style="text-align: center; width: 95px;">
          <div style="border-top: 1px solid ${palette.dark}; margin-bottom: 2px;"></div>
          <div style="font-size: 5.3pt; font-weight: 800; color: ${palette.mid}; text-transform: uppercase; letter-spacing: 0.2px;">Parent Guardian</div>
        </div>
      </div>
    </div>
  </div>

  <div style="border-top: 1px solid ${palette.dark}; padding: 4px 3px 0 3px; display: flex; justify-content: space-between; align-items: center; font-size: 5pt; color: ${palette.textLight}; font-weight: 500;">
    <span>* System generated secure report card documentation.</span>
    <span>Powered by ${schoolName} </span>
  </div>

</div>
  `;

  const options = {
    margin: [4, 6, 4, 6],
    filename: `MarkSheet_${studentName.replace(/\s+/g, "_")}_${examName.replace(/\s+/g, "_")}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error("Error creating report card PDF file streaming download", error);
    alert("An error occurred during local conversion operation.");
  }
}