// client/src/student/pages/marks/utils/downloadPDF.js
// Modern Dashboard A4 portrait — clean layout matching Stormy Morning theme.

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

export async function downloadReportPDF(reportData) {
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

  // Palette definitions mimicking your tokens.js
  const palette = {
    dark: C?.dark ?? "#1e293b",
    mid: C?.mid ?? "#64748b",
    light: C?.light ?? "#88bdf2",
    bgLight: "rgba(237,243,250,0.7)",
    border: "rgba(136,189,242,0.25)",
    textLight: C?.textLight ?? "#94a3b8",
    pass: "#10b981",
    fail: "#ef4444"
  };

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
      <div style="width: 4px; height: 36px; border-radius: 99px; background: linear-gradient(180deg, ${palette.light} 0%, ${palette.dark} 100%);"></div>
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

  // 3. Fire-and-forget generation and trigger local disk streaming download
  try {
    await html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error("Error creating report card PDF file streaming download", error);
    alert("An error occurred during local conversion operation.");
  }
}