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
// ── validateClassHallTicketPayload ────────────────────────────────────────────
// Body shape (POST /api/certificates/hall-tickets/generate-class):
//   {
//     academicYearId: "uuid",
//     classSectionId: "uuid",
//     assessmentGroupId: "uuid",       // Exam from the Examination Module
//     hallTicketFrom: "00001234",
//     hallTicketTo:   "00001299",
//     editableFields: { theme, schoolCode, examCentre, examName, subjects[], instructions }
//   }
// The range-vs-class-size check happens in the service, once the roster is known.
export function validateClassHallTicketPayload(body) {
  const errors = [];
  const {
    academicYearId, classSectionId, assessmentGroupId, hallTicketFrom, hallTicketTo, editableFields,
  } = body || {};

  if (!academicYearId || typeof academicYearId !== "string") errors.push("academicYearId is required.");
  if (!classSectionId || typeof classSectionId !== "string") errors.push("classSectionId is required.");
  if (!assessmentGroupId || typeof assessmentGroupId !== "string") errors.push("An Exam (assessmentGroupId) is required.");

  const from = String(hallTicketFrom ?? "").trim();
  const to = String(hallTicketTo ?? "").trim();
  if (!from) errors.push("Hall Ticket Number 'From' is required.");
  if (!to) errors.push("Hall Ticket Number 'To' is required.");
  if (from && !/^\d+$/.test(from)) errors.push("Hall Ticket Number 'From' must contain digits only.");
  if (to && !/^\d+$/.test(to)) errors.push("Hall Ticket Number 'To' must contain digits only.");
  if (from && to && /^\d+$/.test(from) && /^\d+$/.test(to) && Number(to) < Number(from))
    errors.push("'To' must be greater than or equal to 'From'.");

  if (editableFields !== undefined && (typeof editableFields !== "object" || editableFields === null))
    errors.push("editableFields must be an object.");
  const ef = editableFields || {};
  if (!Array.isArray(ef.subjects) || ef.subjects.length === 0)
    errors.push("Hall Ticket requires at least one subject in editableFields.subjects.");

  return { valid: errors.length === 0, errors };
}