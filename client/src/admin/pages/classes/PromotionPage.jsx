// client/src/admin/pages/classes/PromotionPage.jsx
// Handles student promotion for School, PUC, and Degree institutions
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  GraduationCap,
  AlertTriangle,
  SkipForward,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Play,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/PageLayout";
import {
  fetchAcademicYears,
  createAcademicYear,
  fetchPromotionPreview,
  runPromotion as apiRunPromotion,
} from "./api/classesApi";
import { useInstitutionConfig } from "./hooks/useInstitutionConfig";

const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
};
const IS = {
  padding: "8px 11px",
  border: `1.5px solid rgba(136,189,242,0.4)`,
  borderRadius: 10,
  fontSize: 13,
  color: "#384959",
  fontFamily: "Inter, sans-serif",
  outline: "none",
  background: "#fff",
};

function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl shadow-lg text-sm font-medium z-50"
      style={{
        padding: "12px 18px",
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1.5px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
        color: type === "success" ? "#15803d" : "#dc2626",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}{" "}
      {msg}
    </div>
  );
}

// ── Action badge ──────────────────────────────────────────────────────────────
function ActionBadge({ action }) {
  const map = {
    PROMOTE: { bg: "rgba(16,185,129,0.1)", color: "#065f46", label: "Promote" },
    GRADUATE: {
      bg: "rgba(99,102,241,0.1)",
      color: "#4338ca",
      label: "Graduate 🎓",
    },
    SKIP: {
      bg: "rgba(245,158,11,0.1)",
      color: "#92400e",
      label: "Pending Re-admission ⚠️",
    },
  };
  const s = map[action] || map.PROMOTE;
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ── Preview row ───────────────────────────────────────────────────────────────
function PreviewRow({ item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${C.border}` }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: C.pale, color: C.primary }}
          >
            {item.grade.replace(/\D/g, "")}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: C.primary }}>
              {item.sectionName}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <ActionBadge action={item.action} />
              {item.targetGrade && (
                <span className="text-xs" style={{ color: C.mid }}>
                  → {item.targetGrade}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold" style={{ color: C.primary }}>
              {item.counts.willPromote +
                item.counts.willGraduate +
                item.counts.willSkip}
            </p>
            <p className="text-xs" style={{ color: C.mid }}>
              will act
            </p>
          </div>
          <ChevronDown
            size={14}
            style={{
              color: C.mid,
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "0.2s",
            }}
          />
        </div>
      </div>

      {expanded && (
        <div
          className="border-t px-4 py-3 grid grid-cols-3 gap-3"
          style={{ borderColor: C.border, background: "#fafbfc" }}
        >
          {[
            {
              label: "Will Promote",
              val: item.counts.willPromote,
              color: "#065f46",
              bg: "rgba(16,185,129,0.1)",
            },
            {
              label: "Will Graduate",
              val: item.counts.willGraduate,
              color: "#4338ca",
              bg: "rgba(99,102,241,0.1)",
            },
            {
              label: "Pending Re-admission",
              val: item.counts.willSkip,
              color: "#92400e",
              bg: "rgba(245,158,11,0.1)",
            },
            {
              label: "Inactive (skipped)",
              val: item.counts.skippedInactive,
              color: C.mid,
              bg: C.pale,
            },
            {
              label: "Failed (skipped)",
              val: item.counts.skippedFailed,
              color: "#dc2626",
              bg: "rgba(239,68,68,0.1)",
            },
            {
              label: "Suspended (skipped)",
              val: item.counts.skippedSuspended,
              color: "#b45309",
              bg: "rgba(245,158,11,0.08)",
            },
          ].map(
            (s) =>
              s.val > 0 && (
                <div
                  key={s.label}
                  className="rounded-lg p-2.5"
                  style={{ background: s.bg }}
                >
                  <p className="text-lg font-bold" style={{ color: s.color }}>
                    {s.val}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: s.color, opacity: 0.8 }}
                  >
                    {s.label}
                  </p>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PromotionPage() {
  const navigate = useNavigate();
  const config = useInstitutionConfig();

  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1=setup, 2=preview, 3=done

  // Setup form
  const [fromYearId, setFromYearId] = useState("");
  const [toYearName, setToYearName] = useState("");
  const [toYearStart, setToYearStart] = useState("");
  const [toYearEnd, setToYearEnd] = useState("");
  const [gradeFilter, setGradeFilter] = useState(""); // optional: filter by grade

  // Preview data
  const [preview, setPreview] = useState([]);
  const [summary, setSummary] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // Run
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAcademicYears();
        const yr = res.academicYears || [];
        setYears(yr);
        const active = yr.find((y) => y.isActive);
        if (active) setFromYearId(active.id);
      } catch (err) {
        setToast({ type: "error", msg: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePreview = async () => {
    if (!fromYearId)
      return setToast({ type: "error", msg: "Select source academic year" });
    if (!toYearName.trim())
      return setToast({
        type: "error",
        msg: "Enter target academic year name",
      });

    setPreviewing(true);
    try {
      const res = await fetchPromotionPreview({
        fromAcademicYearId: fromYearId,
        gradeFilter: gradeFilter || undefined,
      });
      setPreview(res.preview || []);
      setSummary(res.summary);
      setStep(2);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setPreviewing(false);
    }
  };

  const handleRun = async () => {
    if (
      !window.confirm(
        `This will promote students from ${years.find((y) => y.id === fromYearId)?.name} to ${toYearName}. This cannot be undone easily. Continue?`,
      )
    )
      return;

    setRunning(true);
    try {
      const res = await apiRunPromotion({
        fromAcademicYearId: fromYearId,
        toAcademicYearName: toYearName.trim(),
        toAcademicYearStartDate: toYearStart || undefined,
        toAcademicYearEndDate: toYearEnd || undefined,
        gradeFilter: gradeFilter || undefined,
      });
      setResult(res.results);
      setStep(3);
      setToast({ type: "success", msg: "Promotion completed successfully!" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: C.light }}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            style={{
              border: "none",
              background: C.pale,
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <ArrowLeft size={16} style={{ color: C.primary }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: C.primary }}>
              Student Promotion
            </h1>
            <p className="text-sm" style={{ color: C.mid }}>
              Promote students to the next {config.gradeLabel.toLowerCase()} for
              a new academic year
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {["Setup", "Preview", "Done"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background:
                      step > i + 1
                        ? "#10b981"
                        : step === i + 1
                          ? C.primary
                          : C.pale,
                    color: step >= i + 1 ? "#fff" : C.mid,
                  }}
                >
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: step === i + 1 ? C.primary : C.mid }}
                >
                  {s}
                </span>
              </div>
              {i < 2 && (
                <div className="h-px w-8" style={{ background: C.border }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Setup ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div
            className="rounded-2xl shadow-sm p-6"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <h2 className="text-sm font-bold mb-5" style={{ color: C.primary }}>
              Promotion Setup
            </h2>

            <div className="space-y-4">
              {/* From Year */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  From Academic Year <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={fromYearId}
                  onChange={(e) => setFromYearId(e.target.value)}
                  style={{ ...IS, width: "100%" }}
                >
                  <option value="">Select source year</option>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                      {y.isActive ? " (Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* To Year */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  To Academic Year (New){" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={toYearName}
                  onChange={(e) => setToYearName(e.target.value)}
                  placeholder="e.g. 2025-26"
                  style={{ ...IS, width: "100%" }}
                />
                <p className="text-xs mt-1" style={{ color: C.mid }}>
                  If this year doesn't exist yet, it will be auto-created
                </p>
              </div>

              {/* Date range (for new year auto-creation) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.mid,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    New Year Start Date
                  </label>
                  <input
                    type="date"
                    value={toYearStart}
                    onChange={(e) => setToYearStart(e.target.value)}
                    style={{ ...IS, width: "100%" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.mid,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    New Year End Date
                  </label>
                  <input
                    type="date"
                    value={toYearEnd}
                    onChange={(e) => setToYearEnd(e.target.value)}
                    style={{ ...IS, width: "100%" }}
                  />
                </div>
              </div>
              <p className="text-xs -mt-2" style={{ color: C.mid }}>
                Required only if the target year doesn't exist yet
              </p>

              {/* Grade filter (optional) */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Promote Specific {config.gradeLabel} Only (optional)
                </label>
                <input
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  placeholder={`e.g. Grade 5 — leave blank to promote all`}
                  style={{ ...IS, width: "100%" }}
                />
                <p className="text-xs mt-1" style={{ color: C.mid }}>
                  Leave blank to promote all {config.gradesLabel.toLowerCase()}{" "}
                  at once
                </p>
              </div>

              {/* Info box */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.15)",
                }}
              >
                <p
                  className="text-xs font-semibold mb-2"
                  style={{ color: "#4338ca" }}
                >
                  What will happen:
                </p>
                <ul className="text-xs space-y-1" style={{ color: "#4338ca" }}>
                  {config.hasSkipGrade && (
                    <li>⚠️ Grade 7 students → PENDING_READMISSION (skipped)</li>
                  )}
                  <li>
                    ✅ Active students → promoted to next{" "}
                    {config.gradeLabel.toLowerCase()}
                  </li>
                  <li>
                    🎓 Last {config.gradeLabel.toLowerCase()} students →
                    GRADUATED
                  </li>
                  <li>
                    ⏭️ INACTIVE/FAILED/SUSPENDED students → skipped
                    automatically
                  </li>
                  <li>🆕 New sections auto-created if needed</li>
                  <li>📋 Roll numbers not assigned — admin sets them later</li>
                </ul>
              </div>

              <button
                onClick={handlePreview}
                disabled={previewing}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white rounded-xl"
                style={{
                  padding: "12px 0",
                  background: C.primary,
                  border: "none",
                  cursor: "pointer",
                  opacity: previewing ? 0.7 : 1,
                }}
              >
                {previewing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Eye size={14} />
                )}
                {previewing ? "Loading Preview…" : "Preview Promotion"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ────────────────────────────────────────────── */}
        {step === 2 && summary && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Will Promote",
                  val: summary.totalPromoted,
                  color: "#065f46",
                  bg: "rgba(16,185,129,0.08)",
                  icon: ArrowRight,
                },
                {
                  label: "Will Graduate",
                  val: summary.totalGraduated,
                  color: "#4338ca",
                  bg: "rgba(99,102,241,0.08)",
                  icon: GraduationCap,
                },
                {
                  label: "Pending Re-admission",
                  val: summary.totalSkipped,
                  color: "#92400e",
                  bg: "rgba(245,158,11,0.08)",
                  icon: SkipForward,
                },
                {
                  label: "Skipped (inactive/failed)",
                  val:
                    summary.totalInactive +
                    summary.totalFailed +
                    summary.totalSuspended,
                  color: C.mid,
                  bg: C.pale,
                  icon: Users,
                },
              ].map(({ label, val, color, bg, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-xl p-4"
                  style={{ background: bg, border: `1px solid ${color}20` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} style={{ color }} />
                    <p className="text-xs font-medium" style={{ color }}>
                      {label}
                    </p>
                  </div>
                  <p className="text-2xl font-bold" style={{ color }}>
                    {val}
                  </p>
                </div>
              ))}
            </div>

            {/* Warning if suspended students found */}
            {summary.totalSuspended > 0 && (
              <div
                className="rounded-xl p-4 flex gap-3"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <AlertTriangle
                  size={16}
                  style={{ color: "#b45309", flexShrink: 0, marginTop: 1 }}
                />
                <div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "#b45309" }}
                  >
                    {summary.totalSuspended} suspended student(s) will be
                    skipped
                  </p>
                  <p className="text-xs" style={{ color: "#92400e" }}>
                    Review and lift suspensions before promoting if needed.
                  </p>
                </div>
              </div>
            )}

            {/* Preview list */}
            <div
              className="rounded-2xl shadow-sm overflow-hidden"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div
                className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: C.border }}
              >
                <h2 className="text-sm font-bold" style={{ color: C.primary }}>
                  Promotion Preview —{" "}
                  {years.find((y) => y.id === fromYearId)?.name} → {toYearName}
                </h2>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{ background: C.pale, color: C.mid }}
                >
                  {preview.length} sections
                </span>
              </div>
              <div
                className="p-4 space-y-2"
                style={{ maxHeight: 450, overflowY: "auto" }}
              >
                {preview.map((item) => (
                  <PreviewRow key={item.sectionId} item={item} />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ← Back to Setup
              </button>
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center justify-center gap-2 text-sm font-bold text-white rounded-xl"
                style={{
                  flex: 2,
                  padding: "12px 0",
                  background: "#10b981",
                  border: "none",
                  cursor: "pointer",
                  opacity: running ? 0.7 : 1,
                }}
              >
                {running ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                {running
                  ? "Running Promotion…"
                  : `Confirm & Promote ${summary.totalPromoted + summary.totalGraduated} Students`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ───────────────────────────────────────────────── */}
        {step === 3 && result && (
          <div
            className="rounded-2xl shadow-sm p-8 text-center"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(16,185,129,0.12)" }}
            >
              <CheckCircle2 size={32} style={{ color: "#10b981" }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: C.primary }}>
              Promotion Complete!
            </h2>
            <p className="text-sm mb-6" style={{ color: C.mid }}>
              Students have been promoted to {toYearName}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                {
                  label: "Promoted",
                  val: result.promoted,
                  color: "#065f46",
                  bg: "rgba(16,185,129,0.08)",
                },
                {
                  label: "Graduated",
                  val: result.graduated,
                  color: "#4338ca",
                  bg: "rgba(99,102,241,0.08)",
                },
                {
                  label: "Pending Re-admission",
                  val: result.skipped,
                  color: "#92400e",
                  bg: "rgba(245,158,11,0.08)",
                },
              ].map(({ label, val, color, bg }) => (
                <div
                  key={label}
                  className="rounded-xl p-4"
                  style={{ background: bg }}
                >
                  <p className="text-2xl font-bold" style={{ color }}>
                    {val}
                  </p>
                  <p className="text-xs font-medium" style={{ color }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {result.autoCreatedSections?.length > 0 && (
              <div
                className="rounded-xl p-4 mb-6 text-left"
                style={{
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.15)",
                }}
              >
                <p
                  className="text-xs font-semibold mb-2"
                  style={{ color: "#4338ca" }}
                >
                  {result.autoCreatedSections.length} new section(s)
                  auto-created:
                </p>
                {result.autoCreatedSections.map((s) => (
                  <p
                    key={s.id}
                    className="text-xs"
                    style={{ color: "#4338ca" }}
                  >
                    • {s.name}
                  </p>
                ))}
              </div>
            )}

            {config.hasReadmission && result.skipped > 0 && (
              <div
                className="rounded-xl p-4 mb-6 text-left"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: "#b45309" }}
                >
                  ⚠️ {result.skipped} student(s) are PENDING_READMISSION
                </p>
                <p className="text-xs mt-1" style={{ color: "#92400e" }}>
                  Go to the Re-admission page to process them
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {config.hasReadmission && result.skipped > 0 && (
                <button
                  onClick={() => navigate("/admin/readmission")}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12,
                    color: C.primary,
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Go to Re-admission →
                </button>
              )}
              <button
                onClick={() => {
                  setStep(1);
                  setPreview([]);
                  setSummary(null);
                  setResult(null);
                  setToYearName("");
                }}
                className="flex items-center justify-center gap-2 text-sm font-bold text-white rounded-xl"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: C.primary,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} /> New Promotion
              </button>
            </div>
          </div>
        )}
      </div>
      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </PageLayout>
  );
}
