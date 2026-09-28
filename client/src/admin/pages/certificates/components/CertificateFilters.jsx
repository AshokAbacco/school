// client/src/admin/pages/certificates/components/CertificateFilters.jsx
import { useEffect, useState } from "react";
import { getToken } from "../../../../auth/storage";
import { C, API_URL } from "./theme";

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const selectStyle = {
  border: `1px solid ${C.border}`,
  background: C.white,
  color: C.text,
};

export default function CertificateFilters({
  academicYearId,
  onAcademicYearChange,
  classSectionId,
  onClassSectionChange,
  certificateType,
  onCertificateTypeChange,
  certificateTypeOptions = [],
  showTypeFilter = false,
  showDateRange = false,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  // Exam Name dropdown (Certificate History). `examOptions` = [{ examId, examName, count }]
  showExamFilter = false,
  examValue,
  onExamChange,
  examOptions = [],
  loadingExams = false,
  // Single date filter (Certificate History) — replaces the From/To pair there.
  showSingleDate = false,
  date,
  onDateChange,
}) {
  const [academicYears, setAcademicYears] = useState([]);
  const [classSections, setClassSections] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [ayRes, csRes] = await Promise.all([
          fetch(`${API_URL}/api/academic-years`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/class-sections`, { headers: authHeaders() }),
        ]);
        const ayData = await ayRes.json();
        const csData = await csRes.json();
        setAcademicYears(ayData.academicYears || []);
        setClassSections(csData.classSections || []);
      } catch (err) {
        console.error("CertificateFilters fetch error:", err);
      }
    })();
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={academicYearId || ""}
        onChange={(e) => onAcademicYearChange?.(e.target.value || null)}
        className="px-3 py-2 rounded-xl text-sm outline-none"
        style={selectStyle}
      >
        <option value="">All Academic Years</option>
        {academicYears.map((ay) => (
          <option key={ay.id} value={ay.id}>
            {ay.name}
            {ay.isActive ? " (Current)" : ""}
          </option>
        ))}
      </select>

      <select
        value={classSectionId || ""}
        onChange={(e) => onClassSectionChange?.(e.target.value || null)}
        className="px-3 py-2 rounded-xl text-sm outline-none"
        style={selectStyle}
      >
        <option value="">All Classes</option>
        {classSections.map((cs) => (
          <option key={cs.id} value={cs.id}>
            {cs.name || `${cs.grade}${cs.section ? " - " + cs.section : ""}`}
          </option>
        ))}
      </select>

      {showExamFilter && (
        <select
          value={examValue || ""}
          onChange={(e) => onExamChange?.(e.target.value || null)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={selectStyle}
          title="Exam Name"
        >
          <option value="">{loadingExams ? "Loading exams…" : "All Exams"}</option>
          {examOptions.map((ex) => {
            const value = ex.examId || `name:${ex.examName}`;
            return (
              <option key={value} value={value}>
                {ex.examName}
              </option>
            );
          })}
        </select>
      )}

      {showTypeFilter && (
        <select
          value={certificateType || ""}
          onChange={(e) => onCertificateTypeChange?.(e.target.value || null)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={selectStyle}
        >
          <option value="">All Certificate Types</option>
          {certificateTypeOptions.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      )}

      {showSingleDate && (
        <input
          type="date"
          value={date || ""}
          onChange={(e) => onDateChange?.(e.target.value || null)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={selectStyle}
          title="Generated on"
          aria-label="Generated on"
        />
      )}

      {showDateRange && (
        <>
          <input
            type="date"
            value={dateFrom || ""}
            onChange={(e) => onDateFromChange?.(e.target.value || null)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={selectStyle}
          />
          <input
            type="date"
            value={dateTo || ""}
            onChange={(e) => onDateToChange?.(e.target.value || null)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={selectStyle}
          />
        </>
      )}
    </div>
  );
}