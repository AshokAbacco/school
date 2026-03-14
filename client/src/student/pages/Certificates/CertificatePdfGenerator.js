// client/src/student/pages/Certificates/CertificatePdfGenerator.js
//
// Pure jsPDF drawing — mirrors each CertificateDesign category exactly.
// Page size: 280 × 198 mm landscape  (794px × 562px @ 72dpi ≈ 280×198mm)
// This matches the certificate exactly — no white space, no cropping.

// ─── Per-category design specs (mirror CertificateDesigns.jsx) ──────────────
const DESIGNS = {
  LEADERSHIP: {
    pageBg:       [254, 249, 231],
    headerBg:     [146, 64, 14],
    headerText:   [255, 255, 255],
    subHeaderText:[253, 230, 138],
    accentGold:   [217, 119, 6],
    borderOuter:  [180, 83, 9],
    borderInner:  [251, 191, 36],
    bodyTitle:    [146, 64, 14],
    bodyText:     [120, 53, 15],
    mutedText:    [180, 83, 9],
    cornerFill:   [254, 243, 199],
    sectionLabel: "CERTIFICATE OF LEADERSHIP EXCELLENCE",
    certType:     "Certificate of Award",
    tagline:      "Office of Leadership & Excellence",
  },
  ACADEMIC: {
    pageBg:       [254, 249, 231],
    headerBg:     [120, 53, 15],
    headerText:   [255, 255, 255],
    subHeaderText:[253, 230, 138],
    accentGold:   [217, 119, 6],
    borderOuter:  [146, 64, 14],
    borderInner:  [251, 191, 36],
    bodyTitle:    [120, 53, 15],
    bodyText:     [92, 40, 8],
    mutedText:    [146, 64, 14],
    cornerFill:   [254, 243, 199],
    sectionLabel: "CERTIFICATE OF ACADEMIC EXCELLENCE",
    certType:     "Certificate of Excellence",
    tagline:      "Office of Academic Affairs",
  },
  ATTENDANCE: {
    pageBg:       [240, 253, 244],
    headerBg:     [21, 128, 61],
    headerText:   [255, 255, 255],
    subHeaderText:[187, 247, 208],
    accentGold:   [22, 163, 74],
    borderOuter:  [21, 128, 61],
    borderInner:  [74, 222, 128],
    bodyTitle:    [21, 128, 61],
    bodyText:     [15, 100, 50],
    mutedText:    [22, 163, 74],
    cornerFill:   [220, 252, 231],
    sectionLabel: "CERTIFICATE OF PERFECT ATTENDANCE",
    certType:     "Certificate of Attendance",
    tagline:      "Office of Student Affairs",
  },
  SPORTS: {
    pageBg:       [255, 255, 255],
    headerBg:     [153, 27, 27],
    headerText:   [255, 255, 255],
    subHeaderText:[254, 202, 202],
    accentGold:   [220, 38, 38],
    borderOuter:  [185, 28, 28],
    borderInner:  [252, 165, 165],
    bodyTitle:    [185, 28, 28],
    bodyText:     [153, 27, 27],
    mutedText:    [220, 38, 38],
    cornerFill:   [254, 226, 226],
    sectionLabel: "CERTIFICATE OF SPORTING ACHIEVEMENT",
    certType:     "Certificate of Achievement",
    tagline:      "Office of Sports & Athletics",
  },
  CULTURAL: {
    pageBg:       [250, 245, 255],
    headerBg:     [109, 40, 217],
    headerText:   [255, 255, 255],
    subHeaderText:[221, 214, 254],
    accentGold:   [124, 58, 237],
    borderOuter:  [109, 40, 217],
    borderInner:  [167, 139, 250],
    bodyTitle:    [109, 40, 217],
    bodyText:     [91, 33, 182],
    mutedText:    [124, 58, 237],
    cornerFill:   [237, 233, 254],
    sectionLabel: "CERTIFICATE OF CULTURAL EXCELLENCE",
    certType:     "Certificate of Achievement",
    tagline:      "Office of Arts & Culture",
  },
  DISCIPLINE: {
    pageBg:       [15, 23, 42],
    headerBg:     [30, 41, 59],
    headerText:   [226, 232, 240],
    subHeaderText:[148, 163, 184],
    accentGold:   [100, 116, 139],
    borderOuter:  [51, 65, 85],
    borderInner:  [71, 85, 105],
    bodyTitle:    [226, 232, 240],
    bodyText:     [203, 213, 225],
    mutedText:    [148, 163, 184],
    cornerFill:   [30, 41, 59],
    sectionLabel: "CERTIFICATE OF DISCIPLINE & CONDUCT",
    certType:     "Certificate of Excellence",
    tagline:      "Office of Student Conduct",
  },
  SPECIAL: {
    pageBg:       [46, 16, 101],       // deep purple matching SpecialCertificate
    headerBg:     [59, 7, 100],
    headerText:   [237, 233, 254],
    subHeaderText:[196, 181, 253],
    accentGold:   [167, 139, 250],
    borderOuter:  [167, 139, 250],
    borderInner:  [139, 92, 246],
    bodyTitle:    [255, 255, 255],
    bodyText:     [196, 181, 253],
    mutedText:    [167, 139, 250],
    cornerFill:   [59, 7, 100],
    sectionLabel: "CERTIFICATE OF SPECIAL RECOGNITION",
    certType:     "Certificate of Recognition",
    tagline:      "Special Recognition Award",
  },
};

const RESULT_LABEL = {
  WINNER: "1st Place", RUNNER_UP: "2nd Place", THIRD_PLACE: "3rd Place",
  PARTICIPATED: "Participant", SPECIAL_AWARD: "Special Award",
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function cx(doc, text, y, W) {
  doc.text(text, W / 2, y, { align: "center" });
}
function hline(doc, y, x1, x2, lw = 0.3) {
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function downloadCertificatePdf(cert, student, school) {
  const { jsPDF } = await import("jspdf");

  // ── Page: landscape, exactly 794×562 px converted to mm at 72 dpi
  //    794px ÷ (72/25.4) = 279.9 mm ≈ 280 mm
  //    562px ÷ (72/25.4) = 198.2 mm ≈ 198 mm
  const W = 280, H = 198;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [W, H],           // custom page size = certificate size
  });

  const cat = cert.category || "SPECIAL";
  const d   = DESIGNS[cat] || DESIGNS.SPECIAL;

  const studentName = [student?.firstName, student?.lastName].filter(Boolean).join(" ") || "Student";
  const schoolName  = school?.name || "School";
  const issueDate   = cert.issuedDate
    ? new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // ── Background ───────────────────────────────────────────────────────────────
  doc.setFillColor(...d.pageBg);
  doc.rect(0, 0, W, H, "F");

  // ── Corner accent triangles ──────────────────────────────────────────────────
  doc.setFillColor(...d.cornerFill);
  doc.setGState(doc.GState({ opacity: 0.35 }));
  doc.triangle(0, 0, 32, 0, 0, 32, "F");
  doc.triangle(W, H, W - 32, H, W, H - 32, "F");
  doc.setFillColor(...d.borderInner);
  doc.setGState(doc.GState({ opacity: 0.18 }));
  doc.triangle(W, 0, W - 22, 0, W, 22, "F");
  doc.triangle(0, H, 22, H, 0, H - 22, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  // ── Outer border ─────────────────────────────────────────────────────────────
  doc.setDrawColor(...d.borderOuter);
  doc.setLineWidth(1.2);
  doc.rect(5, 5, W - 10, H - 10, "S");

  // ── Inner border ─────────────────────────────────────────────────────────────
  doc.setDrawColor(...d.borderInner);
  doc.setLineWidth(0.4);
  doc.rect(8, 8, W - 16, H - 16, "S");

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.setFillColor(...d.headerBg);
  doc.rect(5, 5, W - 10, 26, "F");

  // School name
  doc.setTextColor(...d.headerText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setCharSpace(1.5);
  cx(doc, schoolName.toUpperCase(), 16, W);
  doc.setCharSpace(0);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...d.subHeaderText);
  cx(doc, d.tagline, 23, W);

  // Gold rule under header
  doc.setDrawColor(...d.borderInner);
  doc.setLineWidth(0.8);
  hline(doc, 31, 5, W - 5, 0.8);

  // ── Section label ─────────────────────────────────────────────────────────────
  doc.setTextColor(...d.mutedText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setCharSpace(2);
  cx(doc, d.sectionLabel, 42, W);
  doc.setCharSpace(0);

  // Thin rules flanking the label
  const slw = (doc.getTextWidth(d.sectionLabel) / 2) + 6;
  doc.setDrawColor(...d.borderInner);
  doc.setLineWidth(0.2);
  hline(doc, 44, W / 2 - slw - 10, W / 2 - slw, 0.2);
  hline(doc, 44, W / 2 + slw, W / 2 + slw + 10, 0.2);

  // ── Preamble ──────────────────────────────────────────────────────────────────
  doc.setTextColor(...d.bodyText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  cx(doc, "This certificate is presented with honour to", 54, W);

  // ── Student name ──────────────────────────────────────────────────────────────
  doc.setTextColor(...d.bodyTitle);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(26);
  cx(doc, studentName, 70, W);

  // Name underline
  doc.setDrawColor(...d.borderInner);
  doc.setLineWidth(0.5);
  const nw = doc.getTextWidth(studentName);
  hline(doc, 73, (W - nw) / 2 - 4, (W + nw) / 2 + 4, 0.5);

  // ── Class · Academic year ─────────────────────────────────────────────────────
  const classParts = [
    student?.classSection && `Class ${student.classSection}`,
    student?.academicYear  && student.academicYear,
  ].filter(Boolean).join("   •   ");
  if (classParts) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...d.mutedText);
    doc.setCharSpace(1);
    cx(doc, classParts.toUpperCase(), 80, W);
    doc.setCharSpace(0);
  }

  // ── Decorative divider ────────────────────────────────────────────────────────
  doc.setDrawColor(...d.borderInner);
  doc.setLineWidth(0.35);
  hline(doc, 87, 40, W / 2 - 5, 0.35);
  hline(doc, 87, W / 2 + 5, W - 40, 0.35);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...d.accentGold);
  cx(doc, "✦", 90, W);

  // ── Body copy ─────────────────────────────────────────────────────────────────
  doc.setTextColor(...d.bodyText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  cx(doc, "in recognition of exceptional", 100, W);

  // ── Award title ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...d.bodyTitle);
  cx(doc, cert.title || "Award", 114, W);

  // ── Description ───────────────────────────────────────────────────────────────
  if (cert.description || cert.eventName) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...d.mutedText);
    cx(doc, cert.description || cert.eventName, 122, W);
  }

  // ── Result badge ──────────────────────────────────────────────────────────────
  if (cert.resultType && cert.resultType !== "PARTICIPATED") {
    const rl = RESULT_LABEL[cert.resultType] ?? cert.resultType;
    doc.setFontSize(7.5);
    const rw = doc.getTextWidth(rl) + 10;
    doc.setFillColor(...d.accentGold);
    doc.roundedRect((W - rw) / 2, 125, rw, 7, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    cx(doc, rl, 130.5, W);
  }

  // ── Footer rule ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...d.borderInner);
  doc.setLineWidth(0.35);
  hline(doc, 150, 14, W - 14, 0.35);

  // ── Footer: issuer (left) ─────────────────────────────────────────────────────
  const teacherName = cert.teacherName || cert.issuedBy || "";
  const teacherRole = cert.issuedByDesignation || cert.teacherRole || "Senior Teacher";

  if (teacherName) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...d.bodyTitle);
    doc.text(teacherName, 18, 159);

    doc.setDrawColor(...d.mutedText);
    doc.setLineWidth(0.25);
    hline(doc, 161, 14, 56, 0.25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...d.mutedText);
    doc.setCharSpace(1.2);
    doc.text(teacherRole.toUpperCase(), 14, 166);
    doc.setCharSpace(0);
  }

  // ── Footer: date (right) ──────────────────────────────────────────────────────
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...d.bodyTitle);
  doc.text(issueDate, W - 18, 159, { align: "right" });

  doc.setDrawColor(...d.mutedText);
  doc.setLineWidth(0.25);
  hline(doc, 161, W - 56, W - 14, 0.25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...d.mutedText);
  doc.setCharSpace(1.2);
  doc.text("DATE OF ISSUE", W - 14, 166, { align: "right" });
  doc.setCharSpace(0);

  // ── Footer: school seal (centre) ─────────────────────────────────────────────
  doc.setDrawColor(...d.borderInner);
  doc.setFillColor(...d.cornerFill);
  doc.setLineWidth(0.6);
  doc.circle(W / 2, 160, 9, "FD");
  doc.setLineWidth(0.25);
  doc.circle(W / 2, 160, 7.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.5);
  doc.setCharSpace(0.4);
  doc.setTextColor(...d.mutedText);
  cx(doc, schoolName.toUpperCase().slice(0, 18), 158.5, W);
  cx(doc, "✦ OFFICIAL ✦", 162, W);
  doc.setCharSpace(0);

  // ── Bottom footer band ────────────────────────────────────────────────────────
  doc.setFillColor(...d.headerBg);
  doc.rect(5, H - 14, W - 10, 9, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...d.subHeaderText);
  cx(doc, `${schoolName}  •  ${d.certType}`, H - 8, W);

  // ── Save ──────────────────────────────────────────────────────────────────────
  const safe = (cert.title || "certificate")
    .replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 50);
  doc.save(`${safe}.pdf`);
}