// client/src/admin/pages/Exams/components/StudentReportModal.jsx
// Admin-side "Marks & Report Card" viewer — reuses the same components,
// styling, and PDF export used on the student/parent Marks page, but is
// fed by the admin report endpoint so any student's card can be opened
// straight from the Exams → Results table.
//
// "Print Preview" renders the exact PDF that Download produces (same theme,
// same sections) and shows it inside the app, so admins can check the
// printed look before downloading or printing.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  Eye,
  ExternalLink,
  Check,
} from "lucide-react";
import { getToken } from "../../../../auth/storage.js";
import { useSchoolLogo } from "../../../../hooks/useSchoolLogo.js";
import SummaryCards from "../../../../student/pages/marks/components/SummaryCards.jsx";
import SubjectTable from "../../../../student/pages/marks/components/SubjectTable.jsx";
import PerformanceInsights from "../../../../student/pages/marks/components/PerformanceInsights.jsx";
import ThemeModal from "../../../../student/pages/marks/components/ThemeModal.jsx";
import {
  downloadReportPDF,
  generateReportPDFBlobUrl,
  PDF_THEMES,
  DEFAULT_SECTION_OPTIONS,
} from "../../../../student/pages/marks/utils/downloadPDF.js";

const API_URL = import.meta.env.VITE_API_URL;
const authHdr = () => ({ Authorization: `Bearer ${getToken()}` });

/* School logo badge for the header bar — silently collapses if there's
   no logo URL or the image fails to load. */
function SchoolLogo({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={alt || "School logo"}
      onError={() => setFailed(true)}
      className="h-9 w-9 flex-shrink-0 rounded-lg border border-white/25 bg-white object-cover sm:h-10 sm:w-10"
    />
  );
}

/* ── Print Preview overlay ──────────────────────────────────────────────
   Shows the generated PDF in an <iframe>. The theme and section toggles at
   the top re-generate the preview, so what you see is what downloads. */
function PrintPreview({
  url,
  loading,
  error,
  themeKey,
  sections,
  onChange,
  onDownload,
  downloading,
  onClose,
}) {
  const themes = Object.values(PDF_THEMES);
  const busy = loading || downloading;

  return (
    <div
      className="fixed inset-0 z-[1500] flex flex-col bg-slate-900/80"
      onClick={(e) => e.stopPropagation()}
    >
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-[#243340] px-4 py-3 text-white sm:px-6">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
        >
          <ArrowLeft size={14} /> Back to report
        </button>

        <p className="mr-auto text-sm font-extrabold">Print Preview</p>

        {/* theme chips */}
        <div
          className="flex items-center gap-1.5"
          role="radiogroup"
          aria-label="PDF theme"
        >
          {themes.map((t) => {
            const active = t.key === themeKey;
            return (
              <button
                key={t.key}
                role="radio"
                aria-checked={active}
                title={t.name}
                disabled={busy}
                onClick={() => onChange(t.key, sections)}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed"
                style={{
                  background: t.swatch,
                  borderColor: active ? "#ffffff" : "rgba(255,255,255,0.25)",
                }}
              >
                {active && <Check size={13} color="#fff" strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {/* optional sections */}
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">
          <input
            type="checkbox"
            checked={!!sections.showProgressChart}
            disabled={busy}
            onChange={(e) =>
              onChange(themeKey, {
                ...sections,
                showProgressChart: e.target.checked,
              })
            }
            className="h-3.5 w-3.5 cursor-pointer"
          />
          Progress Report
        </label>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">
          <input
            type="checkbox"
            checked={!!sections.showRemarks}
            disabled={busy}
            onChange={(e) =>
              onChange(themeKey, { ...sections, showRemarks: e.target.checked })
            }
            className="h-3.5 w-3.5 cursor-pointer"
          />
          Remarks
        </label>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white no-underline transition hover:bg-white/20"
          >
            <ExternalLink size={13} /> Open to print
          </a>
        )}

        <button
          onClick={() => onDownload(themeKey, sections)}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#243340] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {downloading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>

      {/* body */}
      <div className="relative flex-1 bg-slate-600">
        {url && (
          <iframe
            key={url}
            src={`${url}#toolbar=1&view=FitH`}
            title="Report card print preview"
            className="h-full w-full border-0 bg-white"
          />
        )}

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/40 text-white">
            <Loader2 size={26} className="animate-spin" />
            <p className="text-sm font-semibold">Generating preview…</p>
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="flex items-center gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          </div>
        )}
      </div>

      {url && (
        <p className="bg-[#243340] px-4 py-2 text-center text-[11px] font-medium text-white/70 sm:hidden">
          If the preview is blank on your phone, tap “Open to print”.
        </p>
      )}
    </div>
  );
}

/* Only the modal's content survives when the browser print dialog fires.
   Kept as raw CSS since @media print can't be expressed with Tailwind utilities. */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #student-report-print-area, #student-report-print-area * { visibility: visible !important; }
  #student-report-print-area {
    position: absolute !important; inset: 0 !important;
    width: 100% !important; max-width: 100% !important; margin: 0 !important;
    box-shadow: none !important; border-radius: 0 !important;
  }
  #student-report-print-hide { display: none !important; }
}
`;

export default function StudentReportModal({
  studentId,
  assessmentGroupId,
  subAssessmentGroupId,
  studentName,
  onClose,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  // Print Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewTheme, setPreviewTheme] = useState("default");
  const [previewSections, setPreviewSections] = useState({
    ...DEFAULT_SECTION_OPTIONS,
  });
  const previewUrlRef = useRef(null);
  const previewReqRef = useRef(0);

  // ✅ Same hook/endpoint the sidebar uses (/api/school/logo) — guarantees the
  // report card shows the exact same logo as the rest of the admin panel,
  // instead of a possibly-stale logo nested inside the report payload.
  const sidebarLogoUrl = useSchoolLogo();

  useEffect(() => {
    if (!studentId || !assessmentGroupId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    const url = new URL(
      `${API_URL}/api/results/report/${studentId}/${assessmentGroupId}`,
    );
    if (subAssessmentGroupId)
      url.searchParams.set("subAssessmentGroupId", subAssessmentGroupId);
    fetch(url, { headers: authHdr() })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok || !j.success)
          throw new Error(j.message || `HTTP ${r.status}`);
        return j.data;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, assessmentGroupId, subAssessmentGroupId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (themeModalOpen) setThemeModalOpen(false);
      else if (previewOpen) setPreviewOpen(false);
      else onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, themeModalOpen, previewOpen]);

  // Free the preview PDF from memory when the modal unmounts
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  // Report data + the sidebar's logo, so the PDF matches the app exactly
  const buildPdfData = useCallback(
    () => ({
      ...data,
      enrollment: {
        ...data.enrollment,
        // ✅ Prefer the sidebar's logo source so the PDF matches the app exactly
        schoolLogoUrl:
          sidebarLogoUrl ?? data?.enrollment?.schoolLogoUrl ?? null,
      },
    }),
    [data, sidebarLogoUrl],
  );

  const handleDownload = useCallback(
    async (themeKey = "default", sections = DEFAULT_SECTION_OPTIONS) => {
      if (!data) return;
      setPdfLoading(true);
      try {
        await downloadReportPDF(buildPdfData(), themeKey, sections);
      } finally {
        setPdfLoading(false);
        setThemeModalOpen(false);
      }
    },
    [data, buildPdfData],
  );

  const handlePreview = useCallback(
    async (themeKey = "default", sections = DEFAULT_SECTION_OPTIONS) => {
      if (!data) return;
      const reqId = ++previewReqRef.current;
      setThemeModalOpen(false);
      setPreviewTheme(themeKey);
      setPreviewSections(sections);
      setPreviewOpen(true);
      setPreviewLoading(true);
      setPreviewError("");
      try {
        const url = await generateReportPDFBlobUrl(
          buildPdfData(),
          themeKey,
          sections,
        );
        // A newer preview request finished first — discard this one
        if (reqId !== previewReqRef.current) {
          URL.revokeObjectURL(url);
          return;
        }
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } catch (e) {
        if (reqId === previewReqRef.current) {
          setPreviewError(e?.message || "Could not generate the preview.");
        }
      } finally {
        if (reqId === previewReqRef.current) setPreviewLoading(false);
      }
    },
    [data, buildPdfData],
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-0 sm:p-7"
    >
      <style>{PRINT_CSS}</style>

      <div
        id="student-report-print-area"
        onClick={(e) => e.stopPropagation()}
        className="min-h-screen w-full max-w-7xl overflow-hidden rounded-none bg-[#EDF3FA] shadow-2xl sm:min-h-0 sm:rounded-2xl"
      >
        {/* header bar — hidden on print */}
        <div
          id="student-report-print-hide"
          className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-[#243340] px-4 py-3 text-white sm:px-6 sm:py-4"
        >
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="order-3 flex min-w-0 flex-1 basis-full items-center gap-2.5 sm:order-none sm:basis-auto sm:text-left">
            <SchoolLogo
              src={sidebarLogoUrl ?? data?.enrollment?.schoolLogoUrl}
              alt={data?.enrollment?.schoolName}
            />
            <div className="min-w-0">
              {data?.enrollment?.schoolName && (
                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-white/70">
                  {data.enrollment.schoolName}
                </p>
              )}
              <p className="truncate text-sm font-extrabold sm:text-base">
                {studentName || data?.student?.name || "Student"} — Marks &amp;
                Report Card
              </p>
              {data?.exam?.name && (
                <p className="mt-0.5 text-[11px] font-medium text-white/75">
                  {data.exam.term?.name ? `${data.exam.term.name} · ` : ""}
                  {data.exam.name}
                  {data.hasSubExam
                    ? ` + ${data.subExam?.name || "Assessment"}`
                    : ""}
                </p>
              )}
            </div>
          </div>

          {data && (
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => handlePreview(previewTheme, previewSections)}
                disabled={pdfLoading || previewLoading}
                className="flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {previewLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Eye size={13} />
                )}
                Print Preview
              </button>
              <button
                onClick={() => setThemeModalOpen(true)}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {pdfLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                {pdfLoading ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          )}
        </div>

        <div className="p-3.5 sm:p-5 lg:p-6">
          {loading && (
            <div className="py-16 text-center">
              <Loader2
                size={26}
                className="mx-auto animate-spin text-[#6A89A7]"
              />
              <p className="mt-3 text-sm font-semibold text-[#6A89A7]">
                Loading report card…
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              <SummaryCards
                summary={data.summary}
                loading={false}
                isMobile={false}
                isTablet={false}
              />
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_284px] lg:gap-5">
                <SubjectTable
                  subjects={data.subjectResults}
                  summary={data.summary}
                  loading={false}
                  isLocked={data.exam?.isLocked}
                  isMobile={false}
                />
                <PerformanceInsights
                  subjects={data.subjectResults}
                  summary={data.summary}
                  loading={false}
                  isMobile={false}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {previewOpen && (
        <PrintPreview
          url={previewUrl}
          loading={previewLoading}
          error={previewError}
          themeKey={previewTheme}
          sections={previewSections}
          onChange={handlePreview}
          onDownload={handleDownload}
          downloading={pdfLoading}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      <ThemeModal
        open={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        onConfirm={(themeKey, sections) => handleDownload(themeKey, sections)}
        onPreview={(themeKey, sections) => handlePreview(themeKey, sections)}
        previewLoading={previewLoading}
        showSectionOptions
        loading={pdfLoading}
      />
    </div>
  );
}
