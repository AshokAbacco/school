// server/src/certificates/certificate.validation.js
import { CERTIFICATE_TYPE_KEYS } from "./certificate.constants.js";

export const isValidCertificateType = (type) =>
  typeof type === "string" && CERTIFICATE_TYPE_KEYS.includes(type);

// ── validateGeneratePayload ───────────────────────────────────────────────────
// Body shape:
//   {
//     certificateType: "TRANSFER_CERTIFICATE",
//     studentId: "uuid",
//     academicYear: "2025-26",           // optional, defaults to student's current enrollment year
//     editableFields: { reasonForLeaving, workingDays, presentDays, conduct, remarks, ... }
//   }
export function validateGeneratePayload(body) {
  const errors = [];
  const { certificateType, studentId, editableFields } = body || {};

  if (!certificateType) errors.push("certificateType is required.");
  else if (!isValidCertificateType(certificateType))
    errors.push(`certificateType must be one of: ${CERTIFICATE_TYPE_KEYS.join(", ")}`);

  if (!studentId || typeof studentId !== "string")
    errors.push("studentId is required.");

  if (editableFields !== undefined && typeof editableFields !== "object")
    errors.push("editableFields must be an object.");

  // Type-specific required fields
  if (certificateType === "HALL_TICKET") {
    const ef = editableFields || {};
    if (!ef.subjects || !Array.isArray(ef.subjects) || ef.subjects.length === 0) {
      errors.push("Hall Ticket requires at least one subject in editableFields.subjects.");
    }
  }

  if (certificateType === "TRANSFER_CERTIFICATE") {
    const ef = editableFields || {};
    if (ef.workingDays != null && isNaN(Number(ef.workingDays)))
      errors.push("workingDays must be a number.");
    if (ef.presentDays != null && isNaN(Number(ef.presentDays)))
      errors.push("presentDays must be a number.");
    if (
      ef.workingDays != null &&
      ef.presentDays != null &&
      Number(ef.presentDays) > Number(ef.workingDays)
    ) {
      errors.push("presentDays cannot exceed workingDays.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateStudentsQuery(query) {
  const errors = [];
  const { academicYearId, classSectionId } = query || {};
  if (academicYearId !== undefined && typeof academicYearId !== "string")
    errors.push("academicYearId must be a string.");
  if (classSectionId !== undefined && typeof classSectionId !== "string")
    errors.push("classSectionId must be a string.");
  return { valid: errors.length === 0, errors };
}

export function validatePagination(query) {
  const page = Math.max(1, parseInt(query?.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit || "20", 10) || 20));
  return { page, limit };
}