// server/src/certificates/certificatePdfGenerator.js
//
// Renders each certificate type to a PDF Buffer using Puppeteer + HTML/CSS,
// the same approach already used in src/utils/invoiceMailer.js for invoices.
// Images (school logo, principal signature, school seal, student photo) are
// inlined as base64 data URIs — the caller (certificate.service.js) is
// responsible for resolving R2 keys to buffers via getObjectBuffer() before
// calling generateCertificatePdf, so this file has no storage dependency.

import {
  getHallTicketTheme,
  DEFAULT_HALL_TICKET_THEME,
  DEFAULT_HALL_TICKET_INSTRUCTIONS,
} from "./certificate.constants.js";

// ── Browser launcher ─────────────────────────────────────────────────────────
// Render (and most hosted/serverless environments) kept failing to find a
// Chrome binary that regular `puppeteer` tries to download into a cache
// folder at install time — the classic "Could not find Chrome ... cache
// path is incorrectly configured" error, even after pinning the cache dir
// and adding an explicit install step to the build command.
//
// @sparticuz/chromium ships a self-contained, pre-built Chromium binary
// *inside* the npm package itself (extracted at runtime via
// chromium.executablePath()) — there's no separate download step and
// therefore no cache-path mismatch to get wrong. It's paired with
// `puppeteer-core`, which is the same Puppeteer API minus the bundled
// browser download.
//
// Locally (where a full Chrome download works fine and this package isn't
// installed/needed), it falls back to plain `puppeteer` — dynamically
// imported so it's not a hard dependency of this file in production.
async function launchBrowser() {
  const isHosted = process.env.RENDER || process.env.NODE_ENV === "production";

  if (isHosted) {
    const [{ default: puppeteerCore }, { default: chromium }] = await Promise.all([
      import("puppeteer-core"),
      import("@sparticuz/chromium"),
    ]);
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  const { default: puppeteerFull } = await import("puppeteer");
  return puppeteerFull.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────

const esc = (v) =>
  v === null || v === undefined
    ? ""
    : String(v).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      }[c]));

const fmtDate = (d) => {
  if (!d) return "________";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "________";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

// Shorter date format used only in the Hall Ticket's Examination Schedule
// table — "15 January 2026" (long month) was wide enough to wrap onto two
// lines even at a widened column; "15 Jan 2026" comfortably fits one line.
const fmtDateShort = (d) => {
  if (!d) return "________";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "________";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const toDataUri = (buffer, fallbackMime = "image/png") => {
  if (!buffer) return null;
  return `data:${fallbackMime};base64,${buffer.toString("base64")}`;
};

// "09:00" -> "9:00 AM"
const fmtTime12 = (t) => {
  if (!t) return "________";
  const [hStr, mStr = "00"] = String(t).split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return "________";
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr.padStart(2, "0")} ${period}`;
};


// "09:00" minus 30 minutes -> "08:30"
const subtractMinutes = (t, minutes) => {
  if (!t) return null;
  const [hStr, mStr = "0"] = String(t).split(":");
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  m -= minutes;
  while (m < 0) {
    m += 60;
    h -= 1;
  }
  if (h < 0) h += 24;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Base document chrome shared by every certificate type: ornate double
// border, watermark seal, page size. Individual templates provide `bodyHtml`.
function shell({ title, bodyHtml, images, certificateNumber, issueDate, extraStyles = "" }) {
  const logoImg = images.logo
    ? `<img src="${images.logo}" class="logo" />`
    : `<div class="logo logo-placeholder">LOGO</div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Georgia', 'Times New Roman', serif;
    color: #1c2b3a;
    -webkit-print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 14mm;
    position: relative;
  }
  .border-outer {
    border: 3px solid #16324f;
    padding: 6mm;
    min-height: 269mm;
    position: relative;
  }
  .border-inner {
    border: 1.5px solid #c9a24c;
    padding: 10mm 12mm;
    min-height: 245mm;
    position: relative;
  }
  .watermark {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(0deg);
    width: 120mm; height: 120mm;
    opacity: 0.06;
    z-index: 0;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
  .content { position: relative; z-index: 1; }
  .header {
    display: flex;
    align-items: center;
    gap: 5mm;
    border-bottom: 2px solid #16324f;
    padding-bottom: 4mm;
    margin-bottom: 6mm;
  }
  .logo {
    width: 20mm; height: 20mm;
    object-fit: contain;
    flex-shrink: 0;
  }
  .logo-placeholder {
    display: flex; align-items: center; justify-content: center;
    border: 1px dashed #999;
    font-size: 8px; color: #999;
  }
  .school-meta { flex: 1; text-align: center; }
  .school-name {
    font-size: 22pt;
    font-weight: bold;
    letter-spacing: 0.5px;
    color: #16324f;
    margin: 0;
    text-transform: uppercase;
  }
  .school-sub {
    font-size: 9.5pt;
    color: #445566;
    margin: 1mm 0 0;
  }
  .cert-title {
    text-align: center;
    font-size: 16pt;
    font-weight: bold;
    text-decoration: underline;
    text-underline-offset: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #7a1f1f;
    margin: 4mm 0 6mm;
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 10.5pt;
    margin-bottom: 5mm;
  }
  .body-text {
    font-size: 12pt;
    line-height: 1.9;
    text-align: justify;
  }
  .body-text b { color: #16324f; }
  .field-line {
    display: inline-block;
    min-width: 40mm;
    border-bottom: 1px dotted #444;
    padding: 0 1mm;
    font-weight: bold;
  }
  table.info-table {
    width: 100%;
    border-collapse: collapse;
    margin: 5mm 0;
    font-size: 10.5pt;
  }
  table.info-table td {
    border: 1px solid #b8c2cc;
    padding: 2.2mm 3mm;
  }
  table.info-table td.label {
    background: #f2f5f8;
    font-weight: bold;
    width: 42%;
  }
  .footer {
    position: absolute;
    bottom: 10mm; left: 12mm; right: 12mm;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .footer-left {
    font-size: 9pt;
    color: #333;
    line-height: 1.9;
  }
  .footer-right {
    text-align: center;
    width: 50mm;
  }
  .footer-right .sig-image {
    max-width: 45mm; max-height: 16mm;
    object-fit: contain;
    display: block;
    margin: 0 auto 1mm;
  }
  .footer-right .sig-line {
    border-top: 1px solid #333;
    width: 45mm;
    margin: 0 auto;
  }
  .footer-right .sig-label {
    font-size: 9pt;
    color: #333;
    margin-top: 1.5mm;
  }
  .footer-spacer {
    padding-bottom: 26mm; /* reserve room so body content never runs under the footer */
  }
  ${extraStyles}
</style>
</head>
<body>
  <div class="page">
    <div class="border-outer">
      <div class="border-inner">
        ${images.seal ? `<div class="watermark" style="background-image:url('${images.seal}')"></div>` : ""}
        <div class="content">
          <div class="header">
            ${logoImg}
            <div class="school-meta">
              <p class="school-name">${esc(title.schoolName)}</p>
              <p class="school-sub">${esc(title.schoolAddress)}</p>
              <p class="school-sub">${title.schoolPhone ? `Ph: ${esc(title.schoolPhone)}` : ""}${title.schoolEmail ? ` &nbsp;|&nbsp; ${esc(title.schoolEmail)}` : ""}</p>
            </div>
          </div>

          ${bodyHtml}

          <div class="footer-spacer"></div>
        </div>

        <!-- Footer sits directly inside .border-inner (which has a fixed
             min-height for the full page), NOT inside .content — .content's
             height shrinks to fit short bodies (e.g. a Hall Ticket with only
             2 subjects), which previously made the absolutely-positioned
             footer ride up and overlap the last paragraph of body text. -->
        <div class="footer">
          <div class="footer-left">
            <div>Certificate No: <b>${esc(certificateNumber)}</b></div>
            <div>Date of Issue: <b>${fmtDate(issueDate)}</b></div>
          </div>
          <div class="footer-right">
            ${images.signature ? `<img src="${images.signature}" class="sig-image" />` : ""}
            <div class="sig-line"></div>
            <div class="sig-label">Principal Signature</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── TRANSFER CERTIFICATE ─────────────────────────────────────────────────────
function transferCertificateHtml(data, images) {
  const {
    studentName, admissionNumber, rollNumber, parentOrGuardianName, dob, nationality,
    religion, casteCategory, className, academicYear, admissionDate,
    reasonForLeaving, workingDays, presentDays, conduct, remarks,
  } = data;

  const bodyHtml = `
    <div class="cert-title">Transfer Certificate</div>
    <table class="info-table">
      <tr><td class="label">Admission Number</td><td>${esc(admissionNumber)}</td>
          <td class="label">Roll Number</td><td>${esc(rollNumber || "________")}</td></tr>
      <tr><td class="label">Student Name</td><td>${esc(studentName)}</td>
          <td class="label">Date of Birth</td><td>${fmtDate(dob)}</td></tr>
      <tr><td class="label">Parent / Guardian Name</td><td>${esc(parentOrGuardianName || "________")}</td>
          <td class="label">Academic Year</td><td>${esc(academicYear)}</td></tr>
      <tr><td class="label">Nationality</td><td>${esc(nationality)}</td>
          <td class="label">Religion / Category</td><td>${esc(religion)} / ${esc(casteCategory)}</td></tr>
      <tr><td class="label">Class at Admission / Leaving</td><td colspan="3">${esc(className)}</td></tr>
      <tr><td class="label">Date of Admission</td><td>${fmtDate(admissionDate)}</td>
          <td class="label">Date of Leaving</td><td>${fmtDate(new Date())}</td></tr>
      <tr><td class="label">Working Days</td><td>${esc(workingDays ?? "________")}</td>
          <td class="label">Days Present</td><td>${esc(presentDays ?? "________")}</td></tr>
      <tr><td class="label">Conduct</td><td>${esc(conduct || "Good")}</td>
          <td class="label">Reason for Leaving</td><td>${esc(reasonForLeaving || "________")}</td></tr>
    </table>
    <p class="body-text">
      This is to certify that the above particulars are in accordance with the school records.
      ${remarks ? `<br/><b>Remarks:</b> ${esc(remarks)}` : ""}
    </p>
  `;

  return shell({
    title: {
      schoolName: data.schoolName, schoolAddress: data.schoolAddress,
      schoolPhone: data.schoolPhone, schoolEmail: data.schoolEmail,
      principalName: data.principalName,
    },
    bodyHtml,
    images,
    certificateNumber: data.certificateNumber,
    issueDate: data.issueDate,
  });
}
// ── HALL TICKET — modern, premium, theme-driven design (compact, ~half A4) ──
// This template does NOT use the shared `shell()` — the other six certificate
// types keep the traditional bordered/watermarked letterhead look, but the
// Hall Ticket gets its own distinct, card-based layout per the redesign spec.
//
// Compact layout notes:
//  - Exam Information (centre / reporting time / start time) now sits as a
//    narrow side panel to the right of the student photo+grid, instead of
//    its own full-width row — saves an entire section's worth of height.
//  - Instructions are capped to the first 2 lines regardless of how many
//    the admin typed in (or how many DEFAULT_HALL_TICKET_INSTRUCTIONS has),
//    per the "keep only the important ones" requirement.
//  - Sized to occupy roughly the top half of an A4 sheet — the remaining
//    space is intentionally left blank. Still renders exactly ONE ticket.
function hallTicketHtml(data, images) {
  const {
    studentName, fatherName, parentOrGuardianName, admissionNumber, rollNumber,
    className, dob, gender, contactNumber, academicYear,
    hallTicketNumber, examCentre, schoolCode, subjects = [], photo,
    schoolName, schoolAddress, schoolMotto, certificateNumber, issueDate,
    examName, instructions, theme: themeId,
  } = data;

  const theme = getHallTicketTheme(themeId || DEFAULT_HALL_TICKET_THEME);

  const logoImg = images.logo
    ? `<img src="${images.logo}" class="logo" />`
    : `<div class="logo logo-placeholder">LOGO</div>`;

  const photoBlock = photo
    ? `<img src="${photo}" class="student-photo" />`
    : `<div class="student-photo student-photo-placeholder">Photo</div>`;

  // First scheduled subject (chronologically earliest) drives the two
  // "Exam Information" time fields — the Examination Module has no separate
  // "reporting time" field, so it's derived as 30 minutes before the exam's
  // own start time, which is the usual convention on board hall tickets.
  const firstSubject = subjects[0] || null;
  const examStartTime = firstSubject?.startTime || null;
  const reportingTime = subtractMinutes(examStartTime, 30);

  const subjectRows = subjects
    .map(
      (s, i) => `<tr class="${i % 2 === 1 ? "alt" : ""}">
        <td>${i + 1}</td>
        <td class="subject-cell">${esc(s.subjectName)}${s.subjectCode ? `<span class="subject-code">${esc(s.subjectCode)}</span>` : ""}</td>
        <td class="date-cell">${fmtDateShort(s.examDate)}</td>
        <td>${esc(s.examDay || "")}</td>
        <td class="time-cell">${esc(s.startTime && s.endTime ? `${fmtTime12(s.startTime)} - ${fmtTime12(s.endTime)}` : "")}</td>
      </tr>`
    )
    .join("");

  // Cap to the 2 most important instructions, whatever the source list.
  const instructionsList = (instructions || DEFAULT_HALL_TICKET_INSTRUCTIONS)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((line) => `<li>${esc(line)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  :root {
    --primary: ${theme.primary};
    --secondary: ${theme.secondary};
    --accent: ${theme.accent};
    --bg: ${theme.background};
    --text: ${theme.text};
    --border: ${theme.border};
  }
  body {
    margin: 0;
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: var(--text);
    background: var(--bg);
    -webkit-print-color-adjust: exact;
  }
  /* Page is still full A4; the card is sized to roughly half the sheet's
     height so the remaining space is intentionally left blank. */
  .page { width: 210mm; min-height: 297mm; padding: 6mm; position: relative; }
  .card {
    border: 1.5px solid var(--border);
    border-radius: 5px;
    overflow: hidden;
  }

  /* Header */
  .header {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: #fff;
    padding: 3mm 6mm;
    display: flex;
    align-items: center;
    gap: 4mm;
  }
  .logo { width: 12mm; height: 12mm; object-fit: contain; flex-shrink: 0; background: #fff; border-radius: 3px; padding: 0.8mm; }
  .logo-placeholder { display: flex; align-items: center; justify-content: center; font-size: 6pt; color: #999; }
  .header-meta { flex: 1; }
  .school-name { font-size: 13pt; font-weight: 800; margin: 0; letter-spacing: 0.2px; }
  .school-address { font-size: 6.5pt; opacity: 0.9; margin: 0.4mm 0 0; }
  .school-motto { font-size: 6.5pt; font-style: italic; opacity: 0.85; margin: 0.3mm 0 0; }
  .header-badges { display: flex; flex-direction: column; gap: 0.8mm; align-items: flex-end; }
  .badge {
    display: inline-block;
    padding: 0.7mm 3mm;
    border-radius: 20px;
    font-size: 6.5pt;
    font-weight: 700;
    white-space: nowrap;
  }
  .badge-exam { background: var(--accent); color: #1a1a1a; }
  .badge-year { background: rgba(255,255,255,0.22); color: #fff; border: 1px solid rgba(255,255,255,0.5); }
  .cert-no-tag { font-size: 5.5pt; opacity: 0.85; margin-top: 0.5mm; }

  .body { padding: 3mm 6mm; }

  .section-title {
    font-size: 8pt;
    font-weight: 800;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin: 0 0 1.3mm;
    padding-bottom: 0.8mm;
    border-bottom: 1.5px solid var(--accent);
    display: inline-block;
  }

  /* Top row: photo + student grid + exam-info side panel, all together */
  .top-row { display: flex; gap: 3.5mm; margin-bottom: 3mm; align-items: stretch; }
  .student-photo { width: 18mm; height: 22mm; object-fit: cover; border: 1.5px solid var(--border); border-radius: 3px; flex-shrink: 0; }
  .student-photo-placeholder { display: flex; align-items: center; justify-content: center; font-size: 6pt; color: #999; background: #f2f2f2; }
  .student-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8mm 4mm;
    font-size: 7.5pt;
    align-content: start;
  }
  .student-grid .field-label { color: var(--secondary); font-weight: 700; font-size: 6pt; text-transform: uppercase; letter-spacing: 0.2px; }
  .student-grid .field-value { font-weight: 600; margin-top: 0.2mm; }

  /* Exam Information side panel — sits beside student info, not below it */
  .exam-info-box {
    width: 34mm;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--primary) 6%, white);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1.8mm 2.5mm;
  }
  .exam-info-box .title {
    font-size: 6pt;
    font-weight: 800;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 0.6mm;
    margin-bottom: 1.3mm;
  }
  .exam-info-item { margin-bottom: 1.3mm; }
  .exam-info-item:last-child { margin-bottom: 0; }
  .exam-info-item .label { font-size: 5.5pt; font-weight: 700; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.2px; }
  .exam-info-item .value { font-size: 7.5pt; font-weight: 800; color: var(--primary); line-height: 1.2; }

  /* Schedule table */
  table.schedule { width: 100%; border-collapse: collapse; margin-bottom: 2.5mm; font-size: 7.3pt; }
  table.schedule thead th {
    background: var(--primary);
    color: #fff;
    font-weight: 700;
    padding: 1.1mm 2.5mm;
    text-align: left;
    font-size: 6.8pt;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }
  table.schedule tbody td { padding: 0.9mm 2.5mm; border-bottom: 1px solid #e5e7eb; }
  table.schedule tbody tr.alt td { background: color-mix(in srgb, var(--primary) 4%, white); }
  table.schedule td.time-cell, table.schedule th.time-col,
  table.schedule td.date-cell, table.schedule th.date-col { white-space: nowrap; }
  .subject-cell .subject-code { display: block; font-size: 6.3pt; color: #6b7280; font-weight: 400; }

  /* Instructions */
  .instructions { margin-bottom: 1.5mm; }
  .instructions ul { margin: 0; padding-left: 4mm; font-size: 6.8pt; line-height: 1.4; }
  .instructions li { margin-bottom: 0.3mm; }

  /* Footer */
  .footer {
    padding: 1.8mm 6mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7pt;
  }
  .footer .sig-block { text-align: center; }
  .footer .sig-image { max-width: 24mm; max-height: 8mm; object-fit: contain; display: block; margin: 0 auto 0.5mm; }
  .footer .sig-line { border-top: 1px solid var(--text); width: 24mm; margin: 0 auto 0.5mm; }
</style>
</head>
<body>
  <div class="page">
    <div class="card">
      <div class="header">
        ${logoImg}
        <div class="header-meta">
          <p class="school-name">${esc(schoolName)}</p>
          <p class="school-address">${esc(schoolAddress)}</p>
          ${schoolMotto ? `<p class="school-motto">"${esc(schoolMotto)}"</p>` : ""}
        </div>
        <div class="header-badges">
          <span class="badge badge-exam">${esc(examName || "Examination")}</span>
          <span class="badge badge-year">AY ${esc(academicYear)}</span>
          <span class="cert-no-tag">Hall Ticket No: ${esc(hallTicketNumber || certificateNumber)}</span>
        </div>
      </div>

      <div class="body">
        <div class="top-row">
          ${photoBlock}
          <div class="student-grid">
            <div><div class="field-label">Student Name</div><div class="field-value">${esc(studentName)}</div></div>
            <div><div class="field-label">Father's Name</div><div class="field-value">${esc(fatherName || parentOrGuardianName || "________")}</div></div>
            <div><div class="field-label">Admission Number</div><div class="field-value">${esc(admissionNumber)}</div></div>
            <div><div class="field-label">Roll Number</div><div class="field-value">${esc(rollNumber)}</div></div>
            <div><div class="field-label">Class & Section</div><div class="field-value">${esc(className)}</div></div>
            <div><div class="field-label">Date of Birth</div><div class="field-value">${fmtDate(dob)}</div></div>
            <div><div class="field-label">Gender</div><div class="field-value">${esc(gender || "________")}</div></div>
            <div><div class="field-label">Contact Number</div><div class="field-value">${esc(contactNumber || "________")}</div></div>
          </div>

          <!-- Exam Information now lives here, beside student info, instead
               of as its own full-width section below. -->
          <div class="exam-info-box">
            <div class="title">Exam Information</div>
            <div class="exam-info-item">
              <div class="label">Exam Centre</div>
              <div class="value">${esc(examCentre || "________")}</div>
            </div>
            <div class="exam-info-item">
              <div class="label">Reporting Time</div>
              <div class="value">${fmtTime12(reportingTime)}</div>
            </div>
            <div class="exam-info-item">
              <div class="label">Exam Start Time</div>
              <div class="value">${fmtTime12(examStartTime)}</div>
            </div>
          </div>
        </div>

        <p class="section-title">Examination Schedule</p>
        <!-- Pulled automatically from the Examination Module's timetable for
             this exam + class/section — never typed in by staff. -->
        <table class="schedule">
          <thead>
            <tr><th style="width:7%">S.No</th><th style="width:35%">Subject</th><th class="date-col" style="width:18%">Exam Date</th><th style="width:14%">Day</th><th class="time-col" style="width:26%">Time</th></tr>
          </thead>
          <tbody>${subjectRows || `<tr><td colspan="5" style="text-align:center;color:#999;padding:3mm;">No exam timetable found for this class/section</td></tr>`}</tbody>
        </table>

        <p class="section-title">Instructions</p>
        <div class="instructions">
          <ul>${instructionsList}</ul>
        </div>
      </div>

      <div class="footer">
        <span>Date of Issue: <b>${fmtDate(issueDate)}</b></span>
        <div class="sig-block">
          ${images.signature ? `<img src="${images.signature}" class="sig-image" />` : ""}
          <div class="sig-line"></div>
          <span>Principal Signature</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
// ── Shared prose body for the 5 "formal letter" style certificates ─────────
const PROSE_BY_TYPE = {
  STUDY_CERTIFICATE: (d) =>
    `This is to certify that <b>${esc(d.studentName)}</b>, son/daughter of
     <b>${esc(d.parentOrGuardianName || "________")}</b>, bearing Admission Number
     <b>${esc(d.admissionNumber)}</b>, was/is a bona fide student of this
     school, studying in <b>${esc(d.className)}</b> during the academic year
     <b>${esc(d.academicYear)}</b>. This certificate is issued for the purpose
     of ${esc(d.remarks || "further studies")}.`,
  BONAFIDE_CERTIFICATE: (d) =>
    `This is to certify that <b>${esc(d.studentName)}</b>, son/daughter of
     <b>${esc(d.parentOrGuardianName || "________")}</b>, is a bona fide student of this school,
     studying in <b>${esc(d.className)}</b> during the academic year
     <b>${esc(d.academicYear)}</b>, bearing Admission Number
     <b>${esc(d.admissionNumber)}</b>. ${d.remarks ? esc(d.remarks) : ""}`,
  CONDUCT_CERTIFICATE: (d) =>
    `This is to certify that <b>${esc(d.studentName)}</b>, son/daughter of
     <b>${esc(d.parentOrGuardianName || "________")}</b>, studying in <b>${esc(d.className)}</b>
     during the academic year <b>${esc(d.academicYear)}</b>, has maintained
     <b>${esc(d.conduct || "good")}</b> conduct throughout his/her stay in
     this institution. ${d.remarks ? esc(d.remarks) : ""}`,
  CHARACTER_CERTIFICATE: (d) =>
    `This is to certify that <b>${esc(d.studentName)}</b>, son/daughter of
     <b>${esc(d.parentOrGuardianName || "________")}</b>, studying in <b>${esc(d.className)}</b>
     during the academic year <b>${esc(d.academicYear)}</b>, bears a
     <b>${esc(d.conduct || "good")}</b> moral character to the best of our
     knowledge. ${d.remarks ? esc(d.remarks) : ""}`,
  MIGRATION_CERTIFICATE: (d) =>
    `This is to certify that <b>${esc(d.studentName)}</b>, son/daughter of
     <b>${esc(d.parentOrGuardianName || "________")}</b>, bearing Admission Number
     <b>${esc(d.admissionNumber)}</b>, was a student of this school and is
     hereby permitted to migrate to another institution/board for further
     studies. ${d.remarks ? esc(d.remarks) : ""}`,
};

const TITLE_BY_TYPE = {
  STUDY_CERTIFICATE: "Study Certificate",
  BONAFIDE_CERTIFICATE: "Bonafide Certificate",
  CONDUCT_CERTIFICATE: "Conduct Certificate",
  CHARACTER_CERTIFICATE: "Character Certificate",
  MIGRATION_CERTIFICATE: "Migration Certificate",
};

function formalCertificateHtml(type, data, images) {
  const bodyHtml = `
    <div class="cert-title">${esc(TITLE_BY_TYPE[type])}</div>
    <table class="info-table">
      <tr><td class="label">Admission Number</td><td>${esc(data.admissionNumber)}</td>
          <td class="label">Academic Year</td><td>${esc(data.academicYear)}</td></tr>
      <tr><td class="label">Class</td><td>${esc(data.className)}</td>
          <td class="label">Date of Birth</td><td>${fmtDate(data.dob)}</td></tr>
    </table>
    <p class="body-text">${PROSE_BY_TYPE[type](data)}</p>
  `;

  return shell({
    title: {
      schoolName: data.schoolName, schoolAddress: data.schoolAddress,
      schoolPhone: data.schoolPhone, schoolEmail: data.schoolEmail,
      principalName: data.principalName,
    },
    bodyHtml,
    images,
    certificateNumber: data.certificateNumber,
    issueDate: data.issueDate,
  });
}

// ── buildHtml dispatcher ─────────────────────────────────────────────────────
function buildHtml(type, data, images) {
  switch (type) {
    case "TRANSFER_CERTIFICATE":
      return transferCertificateHtml(data, images);
    case "HALL_TICKET":
      return hallTicketHtml(data, images);
    default:
      return formalCertificateHtml(type, data, images);
  }
}

// ── generateCertificatePdf ───────────────────────────────────────────────────
// data: all fields needed by the templates (see certificate.service.js for
//   exactly what gets passed in — auto-filled from Student + editable fields).
// imageBuffers: { logo, signature, seal, photo } — raw Buffers or null,
//   already fetched from R2 by the service layer.
export async function generateCertificatePdf(type, data, imageBuffers = {}) {
  const images = {
    logo: toDataUri(imageBuffers.logo),
    signature: toDataUri(imageBuffers.signature),
    seal: toDataUri(imageBuffers.seal),
    photo: toDataUri(imageBuffers.photo),
  };

  const html = buildHtml(type, { ...data, photo: images.photo }, images);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}