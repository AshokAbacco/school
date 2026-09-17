// client/src/student/pages/marks/components/ThemeModal.jsx
// Confirm-before-download modal — lets the user pick a PDF colour theme
// (Default + Yellow + Blue + Red) and optionally enter a month-wise
// attendance table and remarks before the report card downloads. Shared by
// the student Marks page and the admin StudentReportModal.
//
// Props
//   open, onClose, loading
//   onConfirm(themeKey, attendanceRows, remarks, sections)
//       Same first 3 arguments as before, so existing callers keep working.
//       `sections` = { showProgressChart, showAttendance, showRemarks }
//   onPreview(themeKey, attendanceRows, remarks, sections)   — optional;
//       shows a "Preview" button when passed.
//   previewLoading       — optional spinner state for Preview.
//   showSectionOptions   — optional; when true the Progress Report,
//       Attendance and Remarks sections get on/off switches.
//   theme / onThemeChange, sections / onSectionsChange — optional; pass
//       these to control the theme and switches from the parent (the admin
//       Print Preview toolbar uses this to stay in sync).

import { useState } from "react";
import {
  X,
  Download,
  Loader2,
  Check,
  Plus,
  Trash2,
  CalendarDays,
  MessageSquare,
  Eye,
  BarChart3,
} from "lucide-react";
import { PDF_THEMES, DEFAULT_SECTION_OPTIONS } from "../utils/downloadPDF.js";
import { C, FONT } from "../tokens.js";

const THEME_LIST = Object.values(PDF_THEMES);
let rowIdSeq = 0;
const newRow = () => ({ id: ++rowIdSeq, month: "", total: "", present: "" });

const sectionTitleStyle = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  color: C.dark,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

/* Section heading that doubles as an on/off switch when `toggle` is set */
function SectionTitle({
  icon: Icon,
  label,
  toggle,
  checked,
  onToggle,
  accent,
}) {
  if (!toggle) {
    return (
      <p style={sectionTitleStyle}>
        {Icon && <Icon size={13} />} {label}
      </p>
    );
  }
  return (
    <label
      style={{ ...sectionTitleStyle, cursor: "pointer", userSelect: "none" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        style={{
          width: 15,
          height: 15,
          margin: 0,
          accentColor: accent,
          cursor: "pointer",
        }}
      />
      {Icon && <Icon size={13} />} {label}
    </label>
  );
}

export default function ThemeModal({
  open,
  onClose,
  onConfirm,
  loading,
  onPreview,
  previewLoading = false,
  showSectionOptions = false,
  theme,
  onThemeChange,
  sections,
  onSectionsChange,
}) {
  const [innerTheme, setInnerTheme] = useState("default");
  const [innerSections, setInnerSections] = useState({
    ...DEFAULT_SECTION_OPTIONS,
  });
  const [attendance, setAttendance] = useState([]);
  const [remarks, setRemarks] = useState("");
  if (!open) return null;

  // Controlled when the parent passes theme / sections, otherwise internal
  const selected = theme ?? innerTheme;
  const setSelected = (k) =>
    onThemeChange ? onThemeChange(k) : setInnerTheme(k);
  const sec = sections ?? innerSections;
  const setSection = (key, value) => {
    const next = { ...sec, [key]: value };
    if (onSectionsChange) onSectionsChange(next);
    else setInnerSections(next);
  };

  const accent = (PDF_THEMES[selected] || PDF_THEMES.default).swatch;
  const busy = loading || previewLoading;

  // Without the switches every section behaves exactly as it always did
  const showChart = showSectionOptions ? !!sec.showProgressChart : true;
  const showAttendance = showSectionOptions ? !!sec.showAttendance : true;
  const showRemarks = showSectionOptions ? !!sec.showRemarks : true;

  const addRow = () => setAttendance((rows) => [...rows, newRow()]);
  const removeRow = (id) =>
    setAttendance((rows) => rows.filter((r) => r.id !== id));
  const updateRow = (id, key, value) =>
    setAttendance((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    );

  const collect = () => {
    const cleanRows = showAttendance
      ? attendance
          .filter((r) => r.month.trim() !== "")
          .map((r) => ({
            month: r.month.trim(),
            total: r.total,
            present: r.present,
          }))
      : [];
    const sectionFlags = {
      showProgressChart: showChart,
      showAttendance,
      showRemarks,
    };
    return [
      selected,
      cleanRows,
      showRemarks ? remarks.trim() : "",
      sectionFlags,
    ];
  };

  const handleConfirm = () => onConfirm(...collect());
  const handlePreview = () => onPreview?.(...collect());

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: C.white,
          borderRadius: 18,
          border: `1.5px solid ${C.border}`,
          boxShadow: "0 24px 60px rgba(15,23,42,0.30)",
          padding: 20,
          fontFamily: FONT.sans,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <p
            style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.dark }}
          >
            Prepare Report Card PDF
          </p>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.mid,
              display: "flex",
              padding: 4,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <p
          style={{
            margin: "2px 0 16px",
            fontSize: 12,
            color: C.textLight,
            fontWeight: 500,
          }}
        >
          {showSectionOptions
            ? "Pick a colour theme and choose which sections to include."
            : "Pick a colour theme, and optionally add monthly attendance."}
        </p>

        {/* ── Theme ── */}
        <p style={{ ...sectionTitleStyle, marginBottom: 8 }}>Colour Theme</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {THEME_LIST.map((t) => {
            const active = selected === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSelected(t.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: `1.5px solid ${active ? t.swatch : C.border}`,
                  background: active ? `${t.swatch}14` : C.white,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: active ? `0 0 0 3px ${t.swatch}22` : "none",
                  transition: "all .15s",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: t.swatch,
                    border: "1.5px solid rgba(0,0,0,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active && <Check size={13} color="#fff" strokeWidth={3} />}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Marks-wise Progress Report (switch only) ── */}
        {showSectionOptions && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle
              icon={BarChart3}
              label="Marks-wise Progress Report"
              toggle
              checked={showChart}
              onToggle={(v) => setSection("showProgressChart", v)}
              accent={accent}
            />
            <p
              style={{
                margin: "4px 0 0 21px",
                fontSize: 11.5,
                color: C.textLight,
              }}
            >
              {showChart
                ? "Bar chart of each subject's percentage."
                : "The progress chart will be left out of the report card."}
            </p>
          </div>
        )}

        {/* ── Attendance ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <SectionTitle
            icon={CalendarDays}
            label={
              showSectionOptions ? "Attendance Report" : "Attendance (Optional)"
            }
            toggle={showSectionOptions}
            checked={showAttendance}
            onToggle={(v) => setSection("showAttendance", v)}
            accent={accent}
          />
          {showAttendance && (
            <button
              onClick={addRow}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: C.bg,
                border: `1.5px solid ${C.border}`,
                borderRadius: 8,
                padding: "4px 9px",
                fontSize: 11,
                fontWeight: 700,
                color: C.dark,
                cursor: "pointer",
                fontFamily: FONT.sans,
              }}
            >
              <Plus size={12} /> Add Month
            </button>
          )}
        </div>

        {!showAttendance ? (
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 11.5,
              color: C.textLight,
              fontStyle: "italic",
            }}
          >
            The Attendance Report will be left out of the report card.
          </p>
        ) : attendance.length === 0 ? (
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 11.5,
              color: C.textLight,
              fontStyle: "italic",
            }}
          >
            No months added — the PDF will skip the Attendance Report section.
          </p>
        ) : (
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 74px 74px 26px",
                gap: 6,
                padding: "0 2px",
              }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: C.textLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Month
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: C.textLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: "center",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: C.textLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: "center",
                }}
              >
                Present
              </span>
              <span />
            </div>
            {attendance.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 74px 74px 26px",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <input
                  value={row.month}
                  onChange={(e) => updateRow(row.id, "month", e.target.value)}
                  placeholder="e.g. June"
                  style={{
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: `1.5px solid ${C.border}`,
                    fontSize: 12.5,
                    color: C.dark,
                    outline: "none",
                    fontFamily: FONT.sans,
                  }}
                />
                <input
                  type="number"
                  min="0"
                  value={row.total}
                  onChange={(e) => updateRow(row.id, "total", e.target.value)}
                  placeholder="30"
                  style={{
                    padding: "7px 6px",
                    borderRadius: 8,
                    border: `1.5px solid ${C.border}`,
                    fontSize: 12.5,
                    color: C.dark,
                    outline: "none",
                    textAlign: "center",
                    fontFamily: FONT.sans,
                  }}
                />
                <input
                  type="number"
                  min="0"
                  value={row.present}
                  onChange={(e) => updateRow(row.id, "present", e.target.value)}
                  placeholder="28"
                  style={{
                    padding: "7px 6px",
                    borderRadius: 8,
                    border: `1.5px solid ${C.border}`,
                    fontSize: 12.5,
                    color: C.dark,
                    outline: "none",
                    textAlign: "center",
                    fontFamily: FONT.sans,
                  }}
                />
                <button
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove month"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.red,
                    padding: 4,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Remarks ── */}
        <div style={{ marginBottom: 8 }}>
          <SectionTitle
            icon={MessageSquare}
            label={showSectionOptions ? "Remarks" : "Remarks (Optional)"}
            toggle={showSectionOptions}
            checked={showRemarks}
            onToggle={(v) => setSection("showRemarks", v)}
            accent={accent}
          />
        </div>
        {showRemarks ? (
          <>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Good progress this term…"
              rows={3}
              style={{
                width: "100%",
                resize: "vertical",
                marginBottom: showSectionOptions ? 4 : 20,
                padding: "9px 10px",
                borderRadius: 10,
                border: `1.5px solid ${C.border}`,
                fontSize: 12.5,
                color: C.dark,
                outline: "none",
                fontFamily: FONT.sans,
                boxSizing: "border-box",
              }}
            />
            {showSectionOptions && (
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: 11.5,
                  color: C.textLight,
                }}
              >
                Leave blank to print empty lines for handwritten remarks.
              </p>
            )}
          </>
        ) : (
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 11.5,
              color: C.textLight,
              fontStyle: "italic",
            }}
          >
            The Remarks section will be left out of the report card.
          </p>
        )}

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onClose}
            style={{
              flex: "1 1 80px",
              padding: "10px 14px",
              borderRadius: 11,
              border: `1.5px solid ${C.border}`,
              background: C.white,
              color: C.mid,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT.sans,
            }}
          >
            Cancel
          </button>

          {onPreview && (
            <button
              onClick={handlePreview}
              disabled={busy}
              style={{
                flex: "1 1 100px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "10px 14px",
                borderRadius: 11,
                border: `1.5px solid ${C.dark}`,
                background: C.white,
                color: C.dark,
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.7 : 1,
                fontFamily: FONT.sans,
              }}
            >
              {previewLoading ? (
                <Loader2
                  size={14}
                  style={{ animation: "spin 0.9s linear infinite" }}
                />
              ) : (
                <Eye size={14} />
              )}
              {previewLoading ? "Preparing…" : "Preview"}
            </button>
          )}

          <button
            onClick={handleConfirm}
            disabled={busy}
            style={{
              flex: "1.4 1 130px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "10px 14px",
              borderRadius: 11,
              border: "none",
              background: C.dark,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
              fontFamily: FONT.sans,
            }}
          >
            {loading ? (
              <Loader2
                size={14}
                style={{ animation: "spin 0.9s linear infinite" }}
              />
            ) : (
              <Download size={14} />
            )}
            {loading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
