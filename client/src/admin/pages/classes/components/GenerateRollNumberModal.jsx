// client/src/admin/pages/classes/components/GenerateRollNumberModal.jsx
// Used in ClassesList.jsx for both per-class and bulk generation.
//
// Props:
//   mode        — "single" | "bulk"
//   cls         — classSection object (only for mode="single")
//   yearId      — current academicYearId
//   onClose     — close handler
//   onSuccess   — called with result summary after generation

import { useState, useEffect } from "react";
import {
  X,
  Hash,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Users,
  RefreshCw,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { getToken } from "../../../../auth/storage";

const API = import.meta.env.VITE_API_URL;
const auth = () => ({ Authorization: `Bearer ${getToken()}` });

const C = {
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
  bg: "#F4F8FC",
};

// ── Mode selector pill ────────────────────────────────────────────────────────
function ModePill({ selected, onSelect }) {
  return (
    <div
      className="flex flex-col sm:flex-row gap-1 p-1 rounded-xl"
      style={{ background: C.bg, border: `1px solid ${C.border}` }}
    >
      {[
        {
          value: "overwrite_all",
          label: "Regenerate All",
          desc: "Renumber everyone alphabetically (use after new admission)",
        },
        {
          value: "fill_gaps_only",
          label: "Fill Gaps Only",
          desc: "Only assign numbers to students who don't have one yet",
        },
      ].map(({ value, label, desc }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className="flex-1 px-3 py-2.5 rounded-lg text-left transition-all"
          style={{
            background: selected === value ? "white" : "transparent",
            border:
              selected === value
                ? `1.5px solid ${C.light}`
                : "1.5px solid transparent",
            boxShadow:
              selected === value ? "0 1px 4px rgba(136,189,242,0.20)" : "none",
          }}
        >
          <p
            className="text-xs font-bold"
            style={{ color: selected === value ? C.primary : C.mid }}
          >
            {label}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: C.mid }}>
            {desc}
          </p>
        </button>
      ))}
    </div>
  );
}

// ── Preview table ─────────────────────────────────────────────────────────────
function PreviewTable({ preview }) {
  if (!preview?.length) return null;
  const changes = preview.filter((p) => p.willChange);
  const unchanged = preview.filter((p) => !p.willChange);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: C.primary }}>
          Preview — Sorted Alphabetically
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: "#10b981" }}>
            {changes.length} will change
          </span>
          {unchanged.length > 0 && (
            <span className="text-[10px]" style={{ color: C.mid }}>
              {unchanged.length} unchanged
            </span>
          )}
        </div>
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${C.border}` }}
      >
        <div
          className="grid text-[10px] font-bold uppercase tracking-wider px-3 py-2"
          style={{
            gridTemplateColumns: "28px 1fr 56px 64px",
            background: "rgba(189,221,252,0.18)",
            color: C.mid,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span>#</span>
          <span>Student</span>
          <span>Curr.</span>
          <span>New #</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {preview.map((p, idx) => (
            <div
              key={p.enrollmentId}
              className="grid items-center px-3 py-2 text-sm"
              style={{
                gridTemplateColumns: "28px 1fr 56px 64px",
                borderBottom:
                  idx < preview.length - 1
                    ? `1px solid rgba(136,189,242,0.08)`
                    : "none",
                background: p.willChange
                  ? "rgba(16,185,129,0.04)"
                  : "transparent",
              }}
            >
              <span className="text-xs" style={{ color: C.mid }}>
                {idx + 1}
              </span>
              <span
                className="font-medium truncate"
                style={{ color: C.primary }}
              >
                {p.name}
              </span>
              <span className="text-xs" style={{ color: C.mid }}>
                {p.currentRollNumber ?? (
                  <span style={{ color: "#f59e0b" }}>None</span>
                )}
              </span>
              <span
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: p.willChange ? "#10b981" : C.mid }}
              >
                {p.willChange && <ArrowRight size={10} />}
                {p.newRollNumber}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bulk result summary ───────────────────────────────────────────────────────
function BulkResult({ result }) {
  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.20)",
        }}
      >
        <CheckCircle2 size={18} style={{ color: "#10b981" }} />
        <div>
          <p className="text-sm font-bold" style={{ color: "#065f46" }}>
            {result.message}
          </p>
          <p className="text-xs" style={{ color: "#065f46" }}>
            {result.totalStudents} students across {result.totalSections}{" "}
            classes · {result.totalUpdated} numbers assigned
          </p>
        </div>
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${C.border}` }}
      >
        <div
          className="grid text-[10px] font-bold uppercase tracking-wider px-4 py-2"
          style={{
            gridTemplateColumns: "1fr 60px 60px",
            background: "rgba(189,221,252,0.18)",
            color: C.mid,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span>Class</span>
          <span>Students</span>
          <span>Updated</span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {result.sections?.map((s, idx) => (
            <div
              key={s.sectionId}
              className="grid px-4 py-2 text-sm"
              style={{
                gridTemplateColumns: "1fr 60px 60px",
                borderBottom:
                  idx < result.sections.length - 1
                    ? `1px solid rgba(136,189,242,0.08)`
                    : "none",
              }}
            >
              <span className="font-medium" style={{ color: C.primary }}>
                {s.sectionName}
              </span>
              <span className="text-xs" style={{ color: C.mid }}>
                {s.students}
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: s.updated > 0 ? "#10b981" : C.mid }}
              >
                {s.updated}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN MODAL
// ═════════════════════════════════════════════════════════════════════════════
export default function GenerateRollNumberModal({
  mode = "single", // "single" | "bulk"
  cls, // classSection object — required when mode="single"
  yearId,
  onClose,
  onSuccess,
}) {
  const [assignMode, setAssignMode] = useState("overwrite_all");
  const [step, setStep] = useState("config"); // "config" | "preview" | "result"
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch preview for single class ───────────────────────────────────────
  const fetchPreview = async () => {
    if (mode !== "single") return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        academicYearId: yearId,
        mode: assignMode,
      });
      const res = await fetch(
        `${API}/api/class-sections/${cls.id}/roll-number-preview?${params}`,
        { headers: auth() },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPreview(data);
      setStep("preview");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Run generation ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      let res, data;

      if (mode === "single") {
        res = await fetch(
          `${API}/api/class-sections/${cls.id}/generate-roll-numbers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...auth() },
            body: JSON.stringify({ academicYearId: yearId, mode: assignMode }),
          },
        );
      } else {
        res = await fetch(
          `${API}/api/class-sections/generate-roll-numbers/bulk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...auth() },
            body: JSON.stringify({ academicYearId: yearId, mode: assignMode }),
          },
        );
      }

      data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResult(data);
      setStep("result");
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isBulk = mode === "bulk";
  const title = isBulk
    ? "Generate Roll Numbers — All Classes"
    : `Generate Roll Numbers — ${cls?.name}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(56,73,89,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{
          maxWidth: 560,
          maxHeight: "92vh",
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(136,189,242,0.18)" }}
            >
              <Hash size={15} style={{ color: C.light }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: C.primary }}>
                {title}
              </p>
              {!isBulk && cls && (
                <p className="text-xs" style={{ color: C.mid }}>
                  {preview
                    ? `${preview.totalStudents} students · ${preview.alreadyAssigned} already have numbers`
                    : "Sort alphabetically and assign roll numbers"}
                </p>
              )}
              {isBulk && (
                <p className="text-xs" style={{ color: C.mid }}>
                  Assigns roll numbers to all active School / PUC classes
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={16} style={{ color: C.mid }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
              }}
            >
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Step: config */}
          {step === "config" && (
            <div className="space-y-4">
              {/* Info box for bulk */}
              {isBulk && (
                <div
                  className="p-3 rounded-xl text-xs"
                  style={{
                    background: "rgba(136,189,242,0.10)",
                    border: `1px solid ${C.border}`,
                    color: C.mid,
                  }}
                >
                  <p className="font-bold mb-1" style={{ color: C.primary }}>
                    What this does:
                  </p>
                  <p>
                    Sorts all students in every active class alphabetically
                    (First Name → Last Name → Admission Date) and assigns roll
                    numbers 1, 2, 3… per class.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold" style={{ color: C.primary }}>
                  Choose Assignment Mode
                </p>
                <ModePill selected={assignMode} onSelect={setAssignMode} />
              </div>

              {/* Warning for overwrite */}
              {assignMode === "overwrite_all" && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    color: "#92400e",
                  }}
                >
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>Regenerate All</strong> will overwrite any existing
                    roll numbers. Use this after a new student admission to
                    restore alphabetical order.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step: preview (single only) */}
          {step === "preview" && preview && (
            <PreviewTable preview={preview.preview} />
          )}

          {/* Step: result (bulk) */}
          {step === "result" && result && isBulk && (
            <BulkResult result={result} />
          )}

          {/* Step: result (single) */}
          {step === "result" && result && !isBulk && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.20)",
              }}
            >
              <CheckCircle2 size={20} style={{ color: "#10b981" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#065f46" }}>
                  Done! Roll numbers assigned.
                </p>
                <p className="text-xs" style={{ color: "#065f46" }}>
                  {result.updated} students updated in {result.section}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex items-center justify-between flex-wrap gap-3 shrink-0"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <button
            onClick={
              step === "config"
                ? onClose
                : () => {
                    setStep("config");
                    setPreview(null);
                    setError("");
                  }
            }
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{
              border: `1px solid ${C.border}`,
              color: C.mid,
              background: "white",
            }}
          >
            {step === "config" ? "Cancel" : "← Back"}
          </button>

          <div className="flex items-center gap-2">
            {/* Single mode: Preview → Generate */}
            {mode === "single" && step === "config" && (
              <button
                onClick={fetchPreview}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: loading ? C.mid : C.primary,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ChevronRight size={14} />
                )}
                Preview
              </button>
            )}

            {mode === "single" && step === "preview" && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: loading ? C.mid : "#10b981",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Hash size={14} />
                )}
                Confirm & Generate
              </button>
            )}

            {/* Bulk mode: Generate directly (no preview step) */}
            {mode === "bulk" && step === "config" && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: loading ? C.mid : C.primary,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Generate for All Classes
              </button>
            )}

            {/* Done — close after result */}
            {step === "result" && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#10b981" }}
              >
                <CheckCircle2 size={14} />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
