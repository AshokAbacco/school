// server/src/certificates/certificate.service.js
import { prisma } from "../config/db.js";
import { uploadToR2, generateSignedUrl, getObjectBuffer } from "../lib/r2.js";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_NUMBER_PREFIX,
  getCertificateTypeMeta,
} from "./certificate.constants.js";
import { generateCertificatePdf, openPdfBrowser } from "./certificatePdfGenerator.js";
import { randomUUID } from "crypto";

// ── Certificate types (static list) ──────────────────────────────────────────
export function listCertificateTypes() {
  return CERTIFICATE_TYPES;
}

// ── Students available for certificate generation, with filters ─────────────
export async function listStudentsForCertificates({
  schoolId, academicYearId, classSectionId, search, page, limit,
}) {
  const enrollmentFilter = {
    ...(classSectionId ? { classSectionId } : {}),
    ...(academicYearId ? { academicYearId } : {}),
  };
  const hasEnrollmentFilter = Object.keys(enrollmentFilter).length > 0;

  const where = {
    schoolId,
    deletedAt: null,
    ...(hasEnrollmentFilter ? { enrollments: { some: enrollmentFilter } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { personalInfo: { is: { firstName: { contains: search, mode: "insensitive" } } } },
            { enrollments: { some: { admissionNumber: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.student.count({ where });

  const students = await prisma.student.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      personalInfo: {
        select: { firstName: true, lastName: true, profileImage: true },
      },
      enrollments: {
        where: academicYearId ? { academicYearId } : {},
        include: {
          classSection: { select: { id: true, grade: true, section: true, name: true } },
          academicYear: { select: { id: true, name: true, isActive: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return { students, total, page, limit, pages: Math.ceil(total / limit) };
}

// ── Full student info for auto-fill on the Generate Certificate step ────────
export async function getStudentCertificateInfo({ schoolId, studentId, academicYearId, classSectionId }) {
  const enrollmentInclude = {
    classSection: { select: { id: true, grade: true, section: true, name: true } },
    academicYear: { select: { id: true, name: true, isActive: true } },
  };

  // 1) Try to honour whatever Academic Year / Class the staff member picked
  //    in the wizard, so the certificate matches what they were looking at
  //    (e.g. roll number / class shown on the Students page for that year).
  const scopedFilter = {
    ...(academicYearId ? { academicYearId } : {}),
    ...(classSectionId ? { classSectionId } : {}),
  };
  const hasScope = Object.keys(scopedFilter).length > 0;

  let student = await prisma.student.findUnique({
    where: { id: studentId, schoolId },
    include: {
      personalInfo: true,
      enrollments: {
        ...(hasScope ? { where: scopedFilter } : {}),
        include: enrollmentInclude,
        // Prefer the currently active academic year, then the most recently
        // started one — NOT just whichever enrollment row was created last,
        // which could be stale (e.g. after a promotion).
        orderBy: [{ academicYear: { isActive: "desc" } }, { academicYear: { startDate: "desc" } }],
        take: 1,
      },
    },
  });

  // 2) If the scoped lookup found no enrollment (e.g. filters didn't match
  //    anything for this student), fall back to their latest enrollment
  //    overall rather than returning blank fields.
  if (student && hasScope && student.enrollments.length === 0) {
    student = await prisma.student.findUnique({
      where: { id: studentId, schoolId },
      include: {
        personalInfo: true,
        enrollments: {
          include: enrollmentInclude,
          orderBy: [{ academicYear: { isActive: "desc" } }, { academicYear: { startDate: "desc" } }],
          take: 1,
        },
      },
    });
  }

  if (!student) return null;

  const enrollment = student.enrollments?.[0] || null;
  const info = student.personalInfo || {};

  // Parent/Guardian display: prefer Father, then Mother, then Guardian —
  // never show two blank/duplicate lines when only one is on file.
  const fatherName = info.parentName || null;
  const motherName = info.motherName || null;
  const guardianName = info.guardianName || null;
  const parentOrGuardianName = fatherName || motherName || guardianName || null;

  return {
    id: student.id,
    studentName: student.name,
    admissionNumber: enrollment?.admissionNumber || null,
    admissionDate: enrollment?.admissionDate || null,
    rollNumber: enrollment?.rollNumber || null,
    className: enrollment?.classSection
      ? enrollment.classSection.name ||
        `${enrollment.classSection.grade}${enrollment.classSection.section ? " - " + enrollment.classSection.section : ""}`
      : null,
    academicYear: enrollment?.academicYear?.name || null,
    academicYearId: enrollment?.academicYear?.id || null,
    dob: info.dateOfBirth || null,
    gender: info.gender || null,
    fatherName,
    motherName,
    guardianName,
    parentOrGuardianName,
    nationality: info.nationality || null,
    religion: info.religion || null,
    casteCategory: info.casteCategory || null,
    address: [info.address, info.city, info.state, info.zipCode].filter(Boolean).join(", ") || null,
    contactNumber: info.phone || info.parentPhone || null,
    profileImageKey: info.profileImage || null,
  };
}

// ── School letterhead info (name/address/logo/principal/seal) ──────────────
async function getSchoolLetterheadInfo(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      name: true, address: true, city: true, state: true, phone: true, email: true,
      code: true, certificatePrefix: true, motto: true,
      principalName: true, principalSignatureKey: true, schoolSealKey: true,
      universityId: true,
    },
  });
  if (!school) return null;

  const university = await prisma.university.findUnique({
    where: { id: school.universityId },
    select: { logoUrl: true },
  });

  return {
    schoolName: school.name,
    schoolAddress: [school.address, school.city, school.state].filter(Boolean).join(", "),
    schoolPhone: school.phone,
    schoolEmail: school.email,
    schoolMotto: school.motto,
    principalName: school.principalName,
    principalSignatureKey: school.principalSignatureKey,
    schoolSealKey: school.schoolSealKey,
    logoKey: university?.logoUrl || null,
    certificatePrefix: school.certificatePrefix,
    code: school.code,
  };
}

// ── Certificate number generator (atomic per-school sequence, TC-style) ─────
async function generateCertificateNumber(schoolId, certificateType) {
  const school = await prisma.school.update({
    where: { id: schoolId },
    data: { certificateSeq: { increment: 1 } },
    select: { certificateSeq: true, certificatePrefix: true, code: true },
  });

  const schoolPrefix =
    (school.certificatePrefix || school.code || "SCH")
      .toString()
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10) || "SCH";

  const typePrefix = CERTIFICATE_NUMBER_PREFIX[certificateType] || "CERT";
  const seqStr = String(school.certificateSeq).padStart(6, "0");

  return `${schoolPrefix}-${typePrefix}-${seqStr}`;
}

// ── Generate a certificate: build data, render PDF, upload, persist row ────
export async function generateCertificate({
  schoolId, generatedById, certificateType, studentId, academicYear, academicYearId, classSectionId, editableFields = {},
}) {
  const typeMeta = getCertificateTypeMeta(certificateType);
  if (!typeMeta) throw Object.assign(new Error("Invalid certificate type"), { status: 400 });

  const [studentInfo, letterhead] = await Promise.all([
    getStudentCertificateInfo({ schoolId, studentId, academicYearId, classSectionId }),
    getSchoolLetterheadInfo(schoolId),
  ]);

  if (!studentInfo) throw Object.assign(new Error("Student not found"), { status: 404 });
  if (!letterhead) throw Object.assign(new Error("School not found"), { status: 404 });

  const certificateNumber = await generateCertificateNumber(schoolId, certificateType);
  const issueDate = new Date();

  const templateData = {
    ...studentInfo,
    ...letterhead,
    academicYear: academicYear || studentInfo.academicYear || "________",
    certificateNumber,
    issueDate,
    // editable fields (spread last so staff overrides win)
    ...editableFields,
  };

  // Fetch images referenced by key, in parallel; missing keys resolve to null
  // and the PDF generator falls back to placeholder boxes.
  const [logoBuf, signatureBuf, sealBuf, photoBuf] = await Promise.all([
    getObjectBuffer(letterhead.logoKey),
    getObjectBuffer(letterhead.principalSignatureKey),
    getObjectBuffer(letterhead.schoolSealKey),
    getObjectBuffer(studentInfo.profileImageKey),
  ]);

  const pdfBuffer = await generateCertificatePdf(certificateType, templateData, {
    logo: logoBuf, signature: signatureBuf, seal: sealBuf, photo: photoBuf,
  });

  const pdfKey = `schools/${schoolId}/certificates/${studentId}/${certificateNumber}-${Date.now()}.pdf`;
  await uploadToR2(pdfKey, pdfBuffer, "application/pdf");

  const record = await prisma.academicCertificate.create({
    data: {
      certificateNumber,
      certificateType,
      studentId,
      schoolId,
      academicYear: templateData.academicYear,
      generatedById: generatedById || null,
      generatedDate: issueDate,
      remarks: editableFields.remarks || null,
      fieldsSnapshot: editableFields,
      pdfPath: pdfKey,
    },
  });

  const pdfUrl = await generateSignedUrl(pdfKey, 3600);

  return { certificate: record, pdfUrl };
}

// ── History listing with filters + pagination ───────────────────────────────
// Filters are combined with AND so e.g. Class + Exam + Student name all apply
// together (previously several filters wrote to the same `student` key and
// silently overrode each other).
function buildHistoryWhere({
  schoolId, studentName, admissionNumber, classSectionId, certificateType,
  academicYear, examId, examName, dateFrom, dateTo,
}) {
  const and = [];

  if (studentName) and.push({ student: { is: { name: { contains: studentName, mode: "insensitive" } } } });
  if (admissionNumber)
    and.push({ student: { is: { enrollments: { some: { admissionNumber: { contains: admissionNumber, mode: "insensitive" } } } } } });
  if (classSectionId) {
    // Class-wide Hall Tickets record the class they were generated for; older
    // certificates fall back to the student's enrollment in that class.
    and.push({
      OR: [
        { fieldsSnapshot: { path: ["classSectionId"], equals: classSectionId } },
        { student: { is: { enrollments: { some: { classSectionId } } } } },
      ],
    });
  }
  if (examId) {
    // Match by Exam id (class-wide tickets) or, for tickets generated before
    // the id was stored, by the exam name that was printed on them.
    and.push({
      OR: [
        { fieldsSnapshot: { path: ["assessmentGroupId"], equals: examId } },
        ...(examName ? [{ fieldsSnapshot: { path: ["examName"], equals: examName } }] : []),
      ],
    });
  } else if (examName) {
    and.push({ fieldsSnapshot: { path: ["examName"], equals: examName } });
  }
  if (dateFrom || dateTo) {
    and.push({
      generatedDate: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    });
  }

  return {
    schoolId,
    deletedAt: null,
    ...(certificateType ? { certificateType } : {}),
    ...(academicYear ? { academicYear } : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

async function resolveAcademicYearName(schoolId, academicYearId) {
  if (!academicYearId) return null;
  const ay = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId }, select: { name: true } });
  return ay?.name || "__none__"; // unknown id → match nothing rather than everything
}

export async function listCertificateHistory({
  schoolId, studentName, admissionNumber, classSectionId, certificateType,
  academicYear, academicYearId, examId, examName, dateFrom, dateTo, page, limit,
}) {
  const ayName = academicYear || (await resolveAcademicYearName(schoolId, academicYearId));
  const where = buildHistoryWhere({
    schoolId, studentName, admissionNumber, classSectionId, certificateType,
    academicYear: ayName, examId, examName, dateFrom, dateTo,
  });

  const total = await prisma.academicCertificate.count({ where });

  const certificates = await prisma.academicCertificate.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { generatedDate: "desc" },
    include: {
      student: {
        select: {
          id: true, name: true,
          enrollments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { classSection: { select: { grade: true, section: true, name: true } } },
          },
        },
      },
      generatedBy: { select: { id: true, name: true } },
    },
  });

  return { certificates, total, page, limit, pages: Math.ceil(total / limit) };
}

// ── Exams that have Hall Tickets in history (for the Exam Name dropdown) ────
// Built from what was actually printed, so the dropdown only lists exams that
// have certificates — narrowed to the selected Class / Academic Year if given.
export async function listHistoryExams({ schoolId, classSectionId, academicYearId }) {
  const ayName = await resolveAcademicYearName(schoolId, academicYearId);
  const where = buildHistoryWhere({
    schoolId, classSectionId, certificateType: "HALL_TICKET", academicYear: ayName,
  });

  const rows = await prisma.academicCertificate.findMany({
    where,
    select: { fieldsSnapshot: true, generatedDate: true },
    orderBy: { generatedDate: "desc" },
  });

  const byKey = new Map();
  for (const r of rows) {
    const snap = r.fieldsSnapshot || {};
    const name = snap.examName ? String(snap.examName) : null;
    const id = snap.assessmentGroupId ? String(snap.assessmentGroupId) : null;
    if (!name && !id) continue;
    const key = id || `name:${name}`;
    if (!byKey.has(key)) byKey.set(key, { examId: id, examName: name || "Unnamed exam", count: 0 });
    byKey.get(key).count += 1;
  }

  // Older tickets with only a name are folded into the id-based entry of the
  // same name, so one exam doesn't appear twice in the dropdown.
  const withId = [...byKey.values()].filter((e) => e.examId);
  for (const [key, e] of [...byKey.entries()]) {
    if (e.examId) continue;
    const match = withId.find((x) => x.examName === e.examName);
    if (match) {
      match.count += e.count;
      byKey.delete(key);
    }
  }

  return [...byKey.values()].sort((a, b) => a.examName.localeCompare(b.examName));
}

export async function getCertificateById({ schoolId, id }) {
  return prisma.academicCertificate.findFirst({
    where: { id, schoolId, deletedAt: null },
    include: {
      student: { select: { id: true, name: true } },
      generatedBy: { select: { id: true, name: true } },
    },
  });
}

export async function getCertificateFileUrl({ schoolId, id }) {
  const cert = await getCertificateById({ schoolId, id });
  if (!cert || !cert.pdfPath) return null;
  return generateSignedUrl(cert.pdfPath, 900);
}

export async function softDeleteCertificate({ schoolId, id }) {
  const cert = await prisma.academicCertificate.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!cert) return null;
  return prisma.academicCertificate.update({
    where: { id },
    data: { deletedAt: new Date(), status: "REVOKED" },
  });
}

// ── Re-render an existing certificate's PDF with the CURRENT template ──────
// Use this to fix already-generated PDFs after a template change (e.g. a
// layout bug fix) — it reuses the same certificate number, the same
// fieldsSnapshot the staff member originally entered, and overwrites the
// same R2 key, so nothing else about the history row changes.
export async function regenerateCertificatePdf({ schoolId, id }) {
  const cert = await prisma.academicCertificate.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!cert) throw Object.assign(new Error("Certificate not found"), { status: 404 });

  const editableFields = cert.fieldsSnapshot || {};

  const [studentInfo, letterhead] = await Promise.all([
    // Class-wide Hall Tickets store the year/class they were generated for —
    // reuse it so a re-render shows the same class/roll no. as the original.
    getStudentCertificateInfo({
      schoolId,
      studentId: cert.studentId,
      academicYearId: editableFields.academicYearId || null,
      classSectionId: editableFields.classSectionId || null,
    }),
    getSchoolLetterheadInfo(schoolId),
  ]);
  if (!studentInfo) throw Object.assign(new Error("Student not found"), { status: 404 });
  if (!letterhead) throw Object.assign(new Error("School not found"), { status: 404 });

  const templateData = {
    ...studentInfo,
    ...letterhead,
    academicYear: cert.academicYear || studentInfo.academicYear || "________",
    certificateNumber: cert.certificateNumber,
    issueDate: cert.generatedDate,
    ...editableFields,
  };

  const [logoBuf, signatureBuf, sealBuf, photoBuf] = await Promise.all([
    getObjectBuffer(letterhead.logoKey),
    getObjectBuffer(letterhead.principalSignatureKey),
    getObjectBuffer(letterhead.schoolSealKey),
    getObjectBuffer(studentInfo.profileImageKey),
  ]);

  const pdfBuffer = await generateCertificatePdf(cert.certificateType, templateData, {
    logo: logoBuf, signature: signatureBuf, seal: sealBuf, photo: photoBuf,
  });

  // Overwrite the same key when we have one, so no orphaned files pile up in R2.
  const pdfKey = cert.pdfPath || `schools/${schoolId}/certificates/${cert.studentId}/${cert.certificateNumber}-${Date.now()}.pdf`;
  await uploadToR2(pdfKey, pdfBuffer, "application/pdf");

  const updated = await prisma.academicCertificate.update({
    where: { id },
    data: { pdfPath: pdfKey },
  });

  const pdfUrl = await generateSignedUrl(pdfKey, 3600);
  return { certificate: updated, pdfUrl };
}
// ═════════════════════════════════════════════════════════════════════════════
// Class-wide Hall Tickets
// ─────────────────────────────────────────────────────────────────────────────
// Hall Tickets are generated for an entire Class/Section at once. The admin
// enters a Hall Ticket Number range (e.g. 00001234 → 00001299) and numbers are
// assigned sequentially to the class roster (ordered by roll number, then
// name). Each student still gets their own AcademicCertificate row + PDF, so
// History / Download / Print / Regenerate all keep working unchanged. Batch
// metadata lives in fieldsSnapshot — no schema change needed.
// ═════════════════════════════════════════════════════════════════════════════

const rollSortKey = (a, b) => {
  const ra = a.rollNumber || "";
  const rb = b.rollNumber || "";
  if (ra && !rb) return -1;
  if (!ra && rb) return 1;
  const byRoll = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: "base" });
  if (byRoll !== 0) return byRoll;
  return (a.studentName || "").localeCompare(b.studentName || "", undefined, { sensitivity: "base" });
};

// Active students enrolled in the given Class/Section for the given year,
// in the order Hall Ticket numbers will be assigned.
export async function listClassStudentsForHallTicket({ schoolId, academicYearId, classSectionId }) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      academicYearId,
      classSectionId,
      status: "ACTIVE",
      student: { schoolId, deletedAt: null },
    },
    select: {
      admissionNumber: true,
      rollNumber: true,
      student: {
        select: {
          id: true,
          name: true,
          personalInfo: { select: { profileImage: true } },
        },
      },
    },
  });

  return enrollments
    .map((e) => ({
      studentId: e.student.id,
      studentName: e.student.name,
      admissionNumber: e.admissionNumber || null,
      rollNumber: e.rollNumber || null,
    }))
    .sort(rollSortKey);
}

// Parses + validates a Hall Ticket Number range. Numbers keep their leading
// zeros: the width of the "From" value (or "To", whichever is longer) is used
// for every generated number, so 00001234 → 00001235, 00001236, ...
export function parseHallTicketRange(from, to, requiredCount) {
  const f = String(from ?? "").trim();
  const t = String(to ?? "").trim();
  const errors = [];

  if (!f) errors.push("Hall Ticket Number 'From' is required.");
  if (!t) errors.push("Hall Ticket Number 'To' is required.");
  if (errors.length) return { valid: false, errors };

  if (!/^\d+$/.test(f) || !/^\d+$/.test(t)) {
    return { valid: false, errors: ["Hall Ticket Numbers must contain digits only."] };
  }
  if (f.length > 15 || t.length > 15) {
    return { valid: false, errors: ["Hall Ticket Numbers can be at most 15 digits."] };
  }

  const start = Number(f);
  const end = Number(t);
  if (end < start) {
    return { valid: false, errors: ["'To' must be greater than or equal to 'From'."] };
  }

  const available = end - start + 1;
  if (requiredCount != null && available < requiredCount) {
    return {
      valid: false,
      available,
      errors: [
        `The range ${f} – ${t} has only ${available} number(s), but the class has ${requiredCount} student(s). ` +
          `Extend 'To' to at least ${String(start + requiredCount - 1).padStart(Math.max(f.length, t.length), "0")}.`,
      ],
    };
  }

  const width = Math.max(f.length, t.length);
  const numberAt = (i) => String(start + i).padStart(width, "0");
  return { valid: true, errors: [], start, end, width, available, numberAt };
}

const hallTicketRow = (cert) => {
  const snap = cert.fieldsSnapshot || {};
  return {
    certificateId: cert.id,
    certificateNumber: cert.certificateNumber,
    studentId: cert.studentId,
    studentName: snap.studentName || cert.student?.name || "",
    admissionNumber: snap.admissionNumber || null,
    rollNumber: snap.rollNumber || null,
    hallTicketNumber: snap.hallTicketNumber || cert.certificateNumber,
    generatedDate: cert.generatedDate,
  };
};

// Generate Hall Tickets for every active student in a class.
export async function generateHallTicketsForClass({
  schoolId, generatedById, academicYearId, classSectionId, assessmentGroupId,
  hallTicketFrom, hallTicketTo, editableFields = {},
}) {
  const certificateType = "HALL_TICKET";

  const roster = await listClassStudentsForHallTicket({ schoolId, academicYearId, classSectionId });
  if (roster.length === 0) {
    throw Object.assign(new Error("No active students found in the selected class for this academic year."), { status: 400 });
  }

  const range = parseHallTicketRange(hallTicketFrom, hallTicketTo, roster.length);
  if (!range.valid) throw Object.assign(new Error(range.errors.join(" ")), { status: 400 });

  const assignments = roster.map((s, i) => ({ ...s, hallTicketNumber: range.numberAt(i) }));
  const newNumbers = new Set(assignments.map((a) => a.hallTicketNumber));

  // Existing Hall Tickets for the same exam. Ones for THIS class are treated
  // as superseded by this run (regenerating a class replaces its tickets);
  // ones for other classes must not share any number with the new range.
  const existingForExam = await prisma.academicCertificate.findMany({
    where: {
      schoolId,
      certificateType,
      deletedAt: null,
      fieldsSnapshot: { path: ["assessmentGroupId"], equals: assessmentGroupId },
    },
    select: { id: true, studentId: true, fieldsSnapshot: true },
  });

  const supersededIds = [];
  const clashes = [];
  for (const c of existingForExam) {
    const snap = c.fieldsSnapshot || {};
    if (snap.classSectionId === classSectionId) {
      supersededIds.push(c.id);
    } else if (snap.hallTicketNumber && newNumbers.has(String(snap.hallTicketNumber))) {
      clashes.push(String(snap.hallTicketNumber));
    }
  }
  if (clashes.length) {
    const sample = [...new Set(clashes)].sort().slice(0, 5).join(", ");
    throw Object.assign(
      new Error(
        `Hall Ticket Number(s) already used for this exam in another class: ${sample}${clashes.length > 5 ? "…" : ""}. Choose a different range.`
      ),
      { status: 409 }
    );
  }

  const letterhead = await getSchoolLetterheadInfo(schoolId);
  if (!letterhead) throw Object.assign(new Error("School not found"), { status: 404 });

  // School-level images are the same for every ticket — fetch once.
  const [logoBuf, signatureBuf, sealBuf] = await Promise.all([
    getObjectBuffer(letterhead.logoKey),
    getObjectBuffer(letterhead.principalSignatureKey),
    getObjectBuffer(letterhead.schoolSealKey),
  ]);

  const batchId = randomUUID();
  const issueDate = new Date();
  const created = [];
  const failed = [];

  // One Chromium instance for the whole class; pages are rendered one at a
  // time to stay within memory limits on small hosts.
  const browser = await openPdfBrowser();
  try {
    for (const a of assignments) {
      try {
        const studentInfo = await getStudentCertificateInfo({
          schoolId, studentId: a.studentId, academicYearId, classSectionId,
        });
        if (!studentInfo) throw new Error("Student not found");

        const certificateNumber = await generateCertificateNumber(schoolId, certificateType);

        const snapshot = {
          ...editableFields,
          hallTicketNumber: a.hallTicketNumber,
          batchId,
          assessmentGroupId,
          academicYearId,
          classSectionId,
          hallTicketFrom: String(hallTicketFrom).trim(),
          hallTicketTo: String(hallTicketTo).trim(),
          studentName: studentInfo.studentName,
          admissionNumber: studentInfo.admissionNumber,
          rollNumber: studentInfo.rollNumber,
          className: studentInfo.className,
        };

        const templateData = {
          ...studentInfo,
          ...letterhead,
          academicYear: studentInfo.academicYear || "________",
          certificateNumber,
          issueDate,
          ...snapshot,
        };

        const photoBuf = await getObjectBuffer(studentInfo.profileImageKey);
        const pdfBuffer = await generateCertificatePdf(
          certificateType,
          templateData,
          { logo: logoBuf, signature: signatureBuf, seal: sealBuf, photo: photoBuf },
          { browser }
        );

        const pdfKey = `schools/${schoolId}/certificates/${a.studentId}/${certificateNumber}-${Date.now()}.pdf`;
        await uploadToR2(pdfKey, pdfBuffer, "application/pdf");

        const record = await prisma.academicCertificate.create({
          data: {
            certificateNumber,
            certificateType,
            studentId: a.studentId,
            schoolId,
            academicYear: templateData.academicYear,
            generatedById: generatedById || null,
            generatedDate: issueDate,
            remarks: editableFields.remarks || null,
            fieldsSnapshot: snapshot,
            pdfPath: pdfKey,
          },
        });
        created.push(record);
      } catch (err) {
        console.error("[generateHallTicketsForClass] student failed:", a.studentId, err);
        failed.push({
          studentId: a.studentId,
          studentName: a.studentName,
          hallTicketNumber: a.hallTicketNumber,
          message: err.message || "Failed to generate",
        });
      }
    }
  } finally {
    try { await browser.close(); } catch { /* ignore */ }
  }

  // Revoke the class's previous tickets for this exam — only for students who
  // actually received a new one, so a partial failure never leaves a student
  // without a valid Hall Ticket.
  const regeneratedStudentIds = new Set(created.map((c) => c.studentId));
  const toRevoke = existingForExam
    .filter((c) => supersededIds.includes(c.id) && regeneratedStudentIds.has(c.studentId))
    .map((c) => c.id);
  if (toRevoke.length) {
    await prisma.academicCertificate.updateMany({
      where: { id: { in: toRevoke }, schoolId },
      data: { deletedAt: new Date(), status: "REVOKED" },
    });
  }

  return {
    batchId,
    academicYearId,
    classSectionId,
    assessmentGroupId,
    examName: editableFields.examName || null,
    className: created[0]?.fieldsSnapshot?.className || null,
    hallTicketFrom: String(hallTicketFrom).trim(),
    hallTicketTo: String(hallTicketTo).trim(),
    total: assignments.length,
    generatedCount: created.length,
    failed,
    tickets: created.map(hallTicketRow).sort(rollSortKey),
  };
}

// Hall Tickets produced by one class-wide generation run.
export async function listHallTicketBatch({ schoolId, batchId }) {
  const certs = await prisma.academicCertificate.findMany({
    where: {
      schoolId,
      certificateType: "HALL_TICKET",
      deletedAt: null,
      fieldsSnapshot: { path: ["batchId"], equals: batchId },
    },
    include: { student: { select: { id: true, name: true } } },
  });

  const first = certs[0]?.fieldsSnapshot || {};
  return {
    batchId,
    academicYearId: first.academicYearId || null,
    classSectionId: first.classSectionId || null,
    assessmentGroupId: first.assessmentGroupId || null,
    examName: first.examName || null,
    className: first.className || null,
    hallTicketFrom: first.hallTicketFrom || null,
    hallTicketTo: first.hallTicketTo || null,
    tickets: certs.map(hallTicketRow).sort((a, b) =>
      String(a.hallTicketNumber).localeCompare(String(b.hallTicketNumber), undefined, { numeric: true })
    ),
  };
}

// Returns one certificate's PDF bytes + a friendly file name, so the browser
// can save it as a normal PDF via our own API (no dependency on the storage
// bucket's CORS settings). Used by the Hall Ticket Students tab for both the
// per-student "Download PDF" button and "Download All" (one file per student).
export async function getCertificatePdfFile({ schoolId, id }) {
  const cert = await prisma.academicCertificate.findFirst({
    where: { id, schoolId, deletedAt: null },
    include: { student: { select: { name: true } } },
  });
  if (!cert || !cert.pdfPath) return null;

  const buffer = await getObjectBuffer(cert.pdfPath);
  if (!buffer) return null;

  const safe = (v) => String(v || "").replace(/[^A-Za-z0-9 _.-]/g, "").trim().replace(/\s+/g, "_");
  const snap = cert.fieldsSnapshot || {};
  const number = snap.hallTicketNumber || cert.certificateNumber;
  const fileName = `${safe(number)}_${safe(snap.studentName || cert.student?.name) || "student"}.pdf`;

  return { buffer, fileName };
}