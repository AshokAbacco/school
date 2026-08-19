// client/src/student/pages/marks/utils/downloadPDF.js
// Modern Dashboard A4 portrait — clean layout matching Stormy Morning theme.
// Supports the school logo, 4 selectable colour themes, and an inline
// marks-wise progress chart (SVG bars, no external chart library needed).

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
// "default" is byte-for-byte the original Stormy Morning palette this
// file already used — nothing changes visually unless another theme
// is explicitly picked. yellow / blue / red are the 3 new options.
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

// Fetch a (possibly signed/cross-origin) image URL and convert it to a data URI
// so html2canvas can render it reliably without CORS/timing issues.
//
// R2 signed URLs typically don't send CORS headers on a plain GET, so a direct
// fetch(url, {mode:"cors"}) silently fails here (an <img> tag can still display
// the same URL fine, since *displaying* an image doesn't require CORS — only
// *reading its bytes* via fetch/canvas does). To get around that we route the
// request through the app's own /api/image-proxy endpoint, which fetches the
// image server-side (no CORS restriction there) and re-serves it with
// Access-Control-Allow-Origin: * — falling back to a direct fetch if the
// proxy itself is unreachable.
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

  // 1. Preferred path — via the backend image proxy (adds CORS headers)
  const proxied = `${PDF_API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
  const viaProxy = await fetchAsDataUrl(proxied, timeoutMs);
  if (viaProxy) return viaProxy;

  // 2. Fallback — try fetching the URL directly, in case it already allows CORS
  return fetchAsDataUrl(url, timeoutMs);
}

// Dynamically inject the html2pdf library script tag into the head if not present
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

// ── Marks-wise progress chart (plain inline SVG bars) ──────────────
function buildProgressChartSVG(subjectResults, palette) {
  const rows = (subjectResults ?? []).filter(
    (s) => !s.isAbsent && s.percentage != null
  );
  if (!rows.length) return "";

  const W = 680, H = 150, padTop = 18, padBottom = 34;
  const maxBarH = H - padTop - padBottom;
  const gap = 14;
  const barW = Math.min(46, (W - gap * (rows.length + 1)) / rows.length);
  const totalWidth = rows.length * barW + (rows.length + 1) * gap;
  const startX = Math.max(gap, (W - totalWidth) / 2 + gap);

  const bars = rows.map((s, i) => {
    const pct = Math.max(0, Math.min(100, s.percentage));
    const barH = (pct / 100) * maxBarH;
    const x = startX + i * (barW + gap);
    const y = padTop + (maxBarH - barH);
    const label = String(s.subjectCode || s.subjectName || "").slice(0, 8);
    const barColor = pct >= 50 ? palette.light : palette.fail;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, 2)}" rx="4" fill="${barColor}" opacity="0.92" />
        <text x="${x + barW / 2}" y="${y - 5}" font-size="8.5" font-weight="700" text-anchor="middle" fill="${palette.dark}">${pct}%</text>
        <text x="${x + barW / 2}" y="${H - padBottom + 14}" font-size="7" font-weight="600" text-anchor="middle" fill="${palette.mid}">${label}</text>
      </g>`;
  }).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="${padTop + maxBarH}" x2="${W}" y2="${padTop + maxBarH}" stroke="${palette.border}" stroke-width="1.5" />
      <line x1="0" y1="${padTop}" x2="${W}" y2="${padTop}" stroke="${palette.border}" stroke-width="0.75" stroke-dasharray="2,3" />
      ${bars}
    </svg>`;
}

export async function downloadReportPDF(reportData, themeKey = "default") {
  if (!reportData) return;

  // 1. Ensure the download library is available
  let html2pdf;
  try {
    html2pdf = await loadHtml2Pdf();
  } catch (err) {
    console.error(err);
    alert("Could not load PDF generation library. Please check your internet connection.");
    return;
  }

  const { student, enrollment, exam, subjectResults, summary } = reportData;

  // 2. Pre-fetch the school logo (if any) as a data URI so it renders reliably in the PDF
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
  const rollNo       = student?.rollNumber      ?? "—";
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

  // 3. Resolve the selected colour theme (falls back to default = original look)
  const palette = PDF_THEMES[themeKey] || PDF_THEMES.default;

  const subjectRows = (subjectResults ?? []).map((s, i) => {
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

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" style="width:40px; height:40px; border-radius:10px; object-fit:cover; border:1px solid ${palette.border}; background:#ffffff; flex-shrink:0;" />`
    : `<div style="width: 4px; height: 36px; border-radius: 99px; background: linear-gradient(180deg, ${palette.light} 0%, ${palette.dark} 100%);"></div>`;

  const chartSvg = buildProgressChartSVG(subjectResults, palette);

  // Create a hidden wrapper container to assemble our print-ready layout out of the view viewport
  const element = document.createElement("div");
  element.style.width = "190mm";
  element.style.padding = "0";
  element.style.margin = "0";
  element.style.backgroundColor = "#ffffff";

  element.innerHTML = `
<div style="font-family: ${FONT?.sans ?? "Inter, sans-serif"}; font-size: 8pt; color: ${palette.dark}; line-height: 1.4; padding: 4mm;">
  
  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${palette.light}; padding-bottom: 12px; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      ${logoHtml}
      <div>
        <h1 style="font-size: 13.5pt; font-weight: 800; color: ${palette.dark}; margin: 0; letter-spacing: -0.5px;">${schoolName}</h1>
        ${schoolAddr ? `<div style="font-size: 7pt; color: ${palette.mid}; margin-top: 1px;">${schoolAddr} ${schoolContact ? `· ${schoolContact}` : ""}</div>` : ""}
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.light}; letter-spacing: 1px;">REPORT CARD</div>
      <div style="font-size: 7pt; color: ${palette.textLight}; font-weight: 500; margin-top: 1px;">${examTitle}</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px;">
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.border}; padding: 6px 10px; border-radius: 8px;">
      <div style="font-size: 6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Student Name</div>
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.dark}; margin-top: 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${studentName}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.border}; padding: 6px 10px; border-radius: 8px;">
      <div style="font-size: 6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Class & Section</div>
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.dark}; margin-top: 2px;">${className}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.border}; padding: 6px 10px; border-radius: 8px;">
      <div style="font-size: 6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Roll Number</div>
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.dark}; margin-top: 2px;">${rollNo}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.border}; padding: 6px 10px; border-radius: 8px;">
      <div style="font-size: 6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Admission No.</div>
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.dark}; margin-top: 2px;">${admNo}</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px;">
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.border}; padding: 6px 10px; border-radius: 8px;">
      <div style="font-size: 6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Date of Birth</div>
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.dark}; margin-top: 2px;">${dob}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.border}; padding: 6px 10px; border-radius: 8px;">
      <div style="font-size: 6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Gender</div>
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.dark}; margin-top: 2px;">${gender}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.border}; padding: 6px 10px; border-radius: 8px;">
      <div style="font-size: 6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Academic Year</div>
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.dark}; margin-top: 2px;">${academicYear}</div>
    </div>
    <div style="background: ${palette.bgLight}; border: 1px solid ${palette.border}; padding: 6px 10px; border-radius: 8px;">
      <div style="font-size: 6pt; font-weight: 700; color: ${palette.textLight}; text-transform: uppercase; letter-spacing: 0.3px;">Date of Issue</div>
      <div style="font-size: 8.5pt; font-weight: 800; color: ${palette.dark}; margin-top: 2px;">${today}</div>
    </div>
  </div>

  <div style="font-size: 7.5pt; font-weight: 800; text-transform: uppercase; color: ${palette.dark}; letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
     <span style="display:inline-block; width:6px; height:6px; background:${palette.light}; border-radius:50%;"></span>
     Subject-wise Marks Statement
  </div>

  <style>
    .pdf-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid ${palette.border}; }
    .pdf-table th { background: rgba(237,243,250,0.9); font-size: 6.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; color: ${palette.dark}; padding: 7px 6px; border-bottom: 1.5px solid ${palette.border}; }
    .pdf-table td { padding: 6px; border-bottom: 1px solid ${palette.border}; font-size: 8pt; color: ${palette.mid}; }
    .pdf-table tr:last-child td { border-bottom: none; }
    .tc { text-align: center; }
    .tl { text-align: left !important; padding-left: 10px !important; }
    .fw { font-weight: 700; }
    .tot-row td { background: rgba(237,243,250,0.85) !important; font-weight: 800; font-size: 8.5pt; color: ${palette.dark} !important; border-top: 1.5px solid ${palette.light} !important; }
  </style>

  <table class="pdf-table">
    <thead>
      <tr>
        <th style="width:26px;">#</th>
        <th class="tl" style="width:auto;">Subject</th>
        <th style="width:60px;">Max Marks</th>
        <th style="width:60px;">Pass Marks</th>
        <th style="width:74px;">Marks Obtained</th>
        <th style="width:64px;">Overall %</th>
        <th style="width:54px;">Grade</th>
        <th style="width:54px;">Result</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
    <tfoot>
      <tr class="tot-row">
        <td class="tc">—</td>
        <td class="tl">Grand Total</td>
        <td class="tc">${summary?.totalMax ?? "—"}</td>
        <td class="tc">—</td>
        <td class="tc" style="font-size:9.5pt;">${summary?.totalObtained ?? "—"}</td>
        <td class="tc">${summary?.percentage ?? "—"}%</td>
        <td class="tc" style="font-size:9.5pt;">${summary?.grade ?? "—"}</td>
        <td class="tc" style="font-size:8pt; color:${summary?.hasFail ? palette.fail : palette.pass} !important;">${overallResult}</td>
      </tr>
    </tfoot>
  </table>

  ${chartSvg ? `
  <div style="border: 1px solid ${palette.border}; border-radius: 8px; background:#ffffff; padding: 10px 12px; margin-bottom: 20px;">
    <div style="font-size: 7.5pt; font-weight: 800; text-transform: uppercase; color: ${palette.dark}; letter-spacing: 1px; margin-bottom: 6px; display:flex; align-items:center; gap:6px;">
      <span style="display:inline-block; width:6px; height:6px; background:${palette.light}; border-radius:50%;"></span>
      Marks-wise Progress Report
    </div>
    ${chartSvg}
  </div>` : ""}

  <div style="display: grid; grid-template-columns: 170px 1fr; gap: 12px; align-items: stretch; margin-bottom: 20px;">
    
    <div style="border: 1px solid ${palette.border}; border-radius: 8px; background: #ffffff; overflow: hidden; display: flex; flex-direction: column;">
      <div style="font-size: 6.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; background: rgba(237,243,250,0.8); padding: 5px 0; color: ${palette.dark}; border-bottom: 1px solid ${palette.border};">Standard Scale</div>
      <div style="padding: 6px; flex-grow: 1;">
        <style>
          .grade-mini-table { width: 100%; border-collapse: collapse; }
          .grade-mini-table td { padding: 2.5px 4px; font-size: 6.8pt; border-bottom: 1px dashed ${palette.border}; }
          .grade-mini-table tr:last-child td { border-bottom: none; }
        </style>
        <table class="grade-mini-table">
          <tbody>${gradeRows}</tbody>
        </table>
        <div style="font-size: 5.5pt; color: ${palette.textLight}; margin-top: 6px; text-align: center; font-weight: 600;">
          P: Pass &nbsp;·&nbsp; F: Fail &nbsp;·&nbsp; AB: Absent
        </div>
      </div>
    </div>

    <div style="border: 1px solid ${palette.border}; border-radius: 8px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden;">
      <div style="font-size: 6.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; background: rgba(237,243,250,0.8); padding: 5px 0; color: ${palette.dark}; border-bottom: 1px solid ${palette.border};">Consolidated Performance Overview</div>
      
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 10px 10px 0 10px;">
        <div style="border: 1px solid ${palette.border}; background: ${palette.bgLight}; border-radius: 6px; padding: 5px; text-align: center;">
          <div style="font-size: 5.5pt; font-weight: 800; text-transform: uppercase; color: ${palette.mid}; padding-bottom: 2px; margin-bottom: 3px; border-bottom: 0.5px solid ${palette.border};">Total Obtained</div>
          <div style="font-size: 9.5pt; font-weight: 800; color: ${palette.dark};">${summary?.totalObtained ?? "—"}<span style="font-size:6pt; font-weight:500; color:${palette.textLight};">/${summary?.totalMax ?? "—"}</span></div>
        </div>
        
        <div style="border: 1px solid ${palette.border}; background: ${palette.bgLight}; border-radius: 6px; padding: 5px; text-align: center;">
          <div style="font-size: 5.5pt; font-weight: 800; text-transform: uppercase; color: ${palette.mid}; padding-bottom: 2px; margin-bottom: 3px; border-bottom: 0.5px solid ${palette.border};">Percentage</div>
          <div style="font-size: 9.5pt; font-weight: 800; color: ${palette.dark};">${summary?.percentage ?? "—"}%</div>
        </div>
        
        <div style="border: 1px solid ${palette.border}; background: ${palette.bgLight}; border-radius: 6px; padding: 5px; text-align: center;">
          <div style="font-size: 5.5pt; font-weight: 800; text-transform: uppercase; color: ${palette.mid}; padding-bottom: 2px; margin-bottom: 3px; border-bottom: 0.5px solid ${palette.border};">Overall Grade</div>
          <div style="font-size: 9.5pt; font-weight: 800; color: ${palette.dark};">${summary?.grade ?? "—"}</div>
        </div>
        
        <div style="border: 1px solid ${palette.border}; background: ${palette.bgLight}; border-radius: 6px; padding: 5px; text-align: center;">
          <div style="font-size: 5.5pt; font-weight: 800; text-transform: uppercase; color: ${palette.mid}; padding-bottom: 2px; margin-bottom: 3px; border-bottom: 0.5px solid ${palette.border};">Class Rank</div>
          <div style="font-size: 9.5pt; font-weight: 800; color: ${palette.dark};">${summary?.rank != null ? `#${summary.rank}` : "—"}</div>
          <div style="font-size: 5pt; color: ${palette.textLight};">of ${summary?.totalStudentsInClass ?? "—"}</div>
        </div>
        
        <div style="border: 1px solid ${summary?.hasFail ? palette.fail : palette.light}; background: #ffffff; border-radius: 6px; padding: 5px; text-align: center;">
          <div style="font-size: 5.5pt; font-weight: 800; text-transform: uppercase; color: ${summary?.hasFail ? palette.fail : palette.light}; padding-bottom: 2px; margin-bottom: 3px; border-bottom: 0.5px solid ${summary?.hasFail ? 'rgba(239,68,68,0.2)' : palette.border};">Final Result</div>
          <div style="font-size: 10pt; font-weight: 900; color: ${summary?.hasFail ? palette.fail : palette.pass}; letter-spacing: 0.5px;">${overallResult}</div>
        </div>
      </div>
      
      <div style="margin-top: auto; padding: 16px 12px 10px 12px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center; width: 105px;">
          <div style="border-top: 1px solid ${palette.border}; margin-bottom: 3px;"></div>
          <div style="font-size: 6pt; font-weight: 800; color: ${palette.mid}; text-transform: uppercase; letter-spacing: 0.3px;">Principal Signature</div>
        </div>
        
        <div style="text-align: center; width: 105px;">
          <div style="border-top: 1px solid ${palette.border}; margin-bottom: 3px;"></div>
          <div style="font-size: 6pt; font-weight: 800; color: ${palette.mid}; text-transform: uppercase; letter-spacing: 0.3px;">Parent Guardian</div>
        </div>
      </div>
    </div>
  </div>

  <div style="border-top: 1px solid ${palette.border}; padding: 5px 4px 0 4px; display: flex; justify-content: space-between; align-items: center; font-size: 5.8pt; color: ${palette.textLight}; font-weight: 500;">
    <span>* System generated secure report card documentation.</span>
    <span>Powered by ${schoolName} </span>
  </div>

</div>
  `;

  // Options configuration setup for html2pdf conversion
  const options = {
    margin: [6, 8, 6, 8], // top, left, bottom, right in mm
    filename: `MarkSheet_${studentName.replace(/\s+/g, "_")}_${examName.replace(/\s+/g, "_")}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // 4. Fire-and-forget generation and trigger local disk streaming download
  try {
    await html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error("Error creating report card PDF file streaming download", error);
    alert("An error occurred during local conversion operation.");
  }
}