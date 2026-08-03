// server/src/certificates/certificate.service.js
import { prisma } from "../config/db.js";
import { uploadToR2, generateSignedUrl, getObjectBuffer } from "../lib/r2.js";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_NUMBER_PREFIX,
  getCertificateTypeMeta,
} from "./certificate.constants.js";
import { generateCertificatePdf } from "./certificatePdfGenerator.js";

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
export async function listCertificateHistory({
  schoolId, studentName, admissionNumber, classSectionId, certificateType,
  academicYear, dateFrom, dateTo, page, limit,
}) {
  const where = {
    schoolId,
    deletedAt: null,
    ...(certificateType ? { certificateType } : {}),
    ...(academicYear ? { academicYear } : {}),
    ...(studentName ? { student: { is: { name: { contains: studentName, mode: "insensitive" } } } } : {}),
    ...(admissionNumber
      ? { student: { is: { enrollments: { some: { admissionNumber: { contains: admissionNumber, mode: "insensitive" } } } } } }
      : {}),
    ...(classSectionId
      ? { student: { is: { enrollments: { some: { classSectionId } } } } }
      : {}),
    ...(dateFrom || dateTo
      ? {
          generatedDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

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

  const [studentInfo, letterhead] = await Promise.all([
    getStudentCertificateInfo({ schoolId, studentId: cert.studentId }),
    getSchoolLetterheadInfo(schoolId),
  ]);
  if (!studentInfo) throw Object.assign(new Error("Student not found"), { status: 404 });
  if (!letterhead) throw Object.assign(new Error("School not found"), { status: 404 });

  const editableFields = cert.fieldsSnapshot || {};

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