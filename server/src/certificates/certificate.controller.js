// server/src/certificates/certificate.controller.js
import * as certificateService from "./certificate.service.js";
import {
  validateGeneratePayload,
  validateStudentsQuery,
  validatePagination,
} from "./certificate.validation.js";
import { uploadToR2 } from "../lib/r2.js";
import { prisma } from "../config/db.js";

const getSchoolId = (req) => req.query.schoolId || req.user?.schoolId;

// GET /api/certificates/types
export const getCertificateTypes = async (_req, res) => {
  try {
    return res.json({ types: certificateService.listCertificateTypes() });
  } catch (err) {
    console.error("[getCertificateTypes]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/certificates/students?academicYearId&classSectionId&search&page&limit
export const getStudentsForCertificates = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const { valid, errors } = validateStudentsQuery(req.query);
    if (!valid) return res.status(400).json({ message: errors.join(" ") });

    const { page, limit } = validatePagination(req.query);

    const result = await certificateService.listStudentsForCertificates({
      schoolId,
      academicYearId: req.query.academicYearId || null,
      classSectionId: req.query.classSectionId || null,
      search: req.query.search?.trim() || "",
      page,
      limit,
    });

    return res.json(result);
  } catch (err) {
    console.error("[getStudentsForCertificates]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/certificates/student/:id
export const getStudentInfo = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const info = await certificateService.getStudentCertificateInfo({
      schoolId,
      studentId: req.params.id,
      academicYearId: req.query.academicYearId || null,
      classSectionId: req.query.classSectionId || null,
    });
    if (!info) return res.status(404).json({ message: "Student not found" });

    return res.json({ student: info });
  } catch (err) {
    console.error("[getStudentInfo]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/certificates/generate
export const generateCertificate = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const { valid, errors } = validateGeneratePayload(req.body);
    if (!valid) return res.status(400).json({ message: errors.join(" ") });

    const { certificateType, studentId, academicYear, academicYearId, classSectionId, editableFields } = req.body;

    const { certificate, pdfUrl } = await certificateService.generateCertificate({
      schoolId,
      generatedById: req.user?.id || null,
      certificateType,
      studentId,
      academicYear,
      academicYearId,
      classSectionId,
      editableFields: editableFields || {},
    });

    return res.status(201).json({ certificate, pdfUrl });
  } catch (err) {
    console.error("[generateCertificate]", err);
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
};

// GET /api/certificates/history
export const getCertificateHistory = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const { page, limit } = validatePagination(req.query);

    const result = await certificateService.listCertificateHistory({
      schoolId,
      studentName: req.query.studentName?.trim() || null,
      admissionNumber: req.query.admissionNumber?.trim() || null,
      classSectionId: req.query.classSectionId || null,
      certificateType: req.query.certificateType || null,
      academicYear: req.query.academicYear || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      page,
      limit,
    });

    return res.json(result);
  } catch (err) {
    console.error("[getCertificateHistory]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/certificates/:id
export const getCertificate = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const certificate = await certificateService.getCertificateById({ schoolId, id: req.params.id });
    if (!certificate) return res.status(404).json({ message: "Certificate not found" });

    return res.json({ certificate });
  } catch (err) {
    console.error("[getCertificate]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/certificates/download/:id
export const downloadCertificate = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const url = await certificateService.getCertificateFileUrl({ schoolId, id: req.params.id });
    if (!url) return res.status(404).json({ message: "Certificate PDF not found" });

    return res.json({ url });
  } catch (err) {
    console.error("[downloadCertificate]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/certificates/print/:id  → same signed URL, frontend opens it and calls window.print()
export const printCertificate = downloadCertificate;

// POST /api/certificates/:id/regenerate
// Re-renders the PDF for an existing certificate with the current template —
// use this to fix older certificates generated before a layout/template fix.
export const regenerateCertificate = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const { certificate, pdfUrl } = await certificateService.regenerateCertificatePdf({
      schoolId,
      id: req.params.id,
    });

    return res.json({ certificate, pdfUrl });
  } catch (err) {
    console.error("[regenerateCertificate]", err);
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
};

// DELETE /api/certificates/:id  (soft delete / revoke)
export const deleteCertificate = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const deleted = await certificateService.softDeleteCertificate({ schoolId, id: req.params.id });
    if (!deleted) return res.status(404).json({ message: "Certificate not found" });

    return res.json({ message: "Certificate revoked", certificate: deleted });
  } catch (err) {
    console.error("[deleteCertificate]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── School certificate-letterhead settings (principal name / signature / seal) ─
// GET /api/certificates/school-settings
export const getSchoolSettings = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        principalName: true, principalSignatureKey: true, schoolSealKey: true,
        certificatePrefix: true, motto: true,
      },
    });
    if (!school) return res.status(404).json({ message: "School not found" });

    return res.json({ settings: school });
  } catch (err) {
    console.error("[getSchoolSettings]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/certificates/school-settings  (multipart: principalSignature, schoolSeal)
export const updateSchoolSettings = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });
    if (req.user?.role !== "ADMIN")
      return res.status(403).json({ message: "Only ADMIN can update certificate settings" });

    const { principalName, certificatePrefix, motto } = req.body;
    const data = {};
    if (principalName !== undefined) data.principalName = principalName?.trim() || null;
    if (certificatePrefix !== undefined)
      data.certificatePrefix = certificatePrefix?.trim().toUpperCase().slice(0, 10) || null;
    if (motto !== undefined) data.motto = motto?.trim() || null;

    const files = req.files || {};
    if (files.principalSignature?.[0]) {
      const file = files.principalSignature[0];
      const key = `schools/${schoolId}/certificates/settings/signature-${Date.now()}.${file.originalname.split(".").pop()}`;
      await uploadToR2(key, file.buffer, file.mimetype);
      data.principalSignatureKey = key;
    }
    if (files.schoolSeal?.[0]) {
      const file = files.schoolSeal[0];
      const key = `schools/${schoolId}/certificates/settings/seal-${Date.now()}.${file.originalname.split(".").pop()}`;
      await uploadToR2(key, file.buffer, file.mimetype);
      data.schoolSealKey = key;
    }

    const school = await prisma.school.update({ where: { id: schoolId }, data });

    return res.json({
      message: "Certificate settings updated",
      settings: {
        principalName: school.principalName,
        principalSignatureKey: school.principalSignatureKey,
        schoolSealKey: school.schoolSealKey,
        certificatePrefix: school.certificatePrefix,
        motto: school.motto,
      },
    });
  } catch (err) {
    console.error("[updateSchoolSettings]", err);
    return res.status(500).json({ message: "Server error" });
  }
};