// client/src/student/pages/marks/components/ThemeModal.jsx
// Small confirm-before-download modal — lets the user pick a PDF colour
// theme (Default + Yellow + Blue + Red) before the report card downloads.
// Shared by the student Marks page and the admin StudentReportModal.
//
// Props
//   open, onClose, loading          — same as before
//   onConfirm(themeKey, sections)   — Download PDF. `sections` is a new 2nd
//                                     argument; old callers can ignore it.
//   onPreview(themeKey, sections)   — optional. When passed, a "Preview"
//                                     button is shown next to Download.
//   previewLoading                  — optional spinner state for Preview.
//   showSectionOptions              — optional. When true, shows the
//                                     "Include in report card" toggles.
//
// sections = { showProgressChart: boolean, showRemarks: boolean }

import { useState } from "react";
import { X, Download, Loader2, Check, Eye } from "lucide-react";
import { PDF_THEMES, DEFAULT_SECTION_OPTIONS } from "../utils/downloadPDF.js";
import { C, FONT } from "../tokens.js";

const THEME_LIST = Object.values(PDF_THEMES);

const SECTION_TOGGLES = [
  {
    key: "showProgressChart",
    label: "Marks-wise Progress Report",
    hint: "Bar chart of each subject's percentage",
  },
  {
    key: "showRemarks",
    label: "Remarks",
    hint: "Subject remarks + space for teacher's remarks",
  },
];

function ToggleRow({ checked, onChange, label, hint, accent }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 12,
        border: `1.5px solid ${checked ? accent : C.border}`,
        background: checked ? `${accent}10` : C.white,
        cursor: "pointer",
        transition: "all .15s",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 16,
          height: 16,
          accentColor: accent,
          cursor: "pointer",
          flexShrink: 0,
        }}
      />
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
          {label}
        </span>
        {hint && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: C.textLight,
              marginTop: 1,
            }}
          >
            {hint}
          </span>
        )}
      </span>
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
}) {
  const [selected, setSelected] = useState("default");
  const [sections, setSections] = useState({ ...DEFAULT_SECTION_OPTIONS });
  if (!open) return null;

  const activeSwatch = (PDF_THEMES[selected] || PDF_THEMES.default).swatch;
  const busy = loading || previewLoading;
  const setSection = (key, value) =>
    setSections((prev) => ({ ...prev, [key]: value }));

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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: C.white,
          borderRadius: 18,
          border: `1.5px solid ${C.border}`,
          boxShadow: "0 24px 60px rgba(15,23,42,0.30)",
          padding: 20,
          fontFamily: FONT.sans,
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
            {onPreview ? "Report card options" : "Choose a PDF theme"}
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
          {onPreview
            ? "Pick a colour theme, then preview or download the report card."
            : "Pick a colour theme for the downloaded report card."}
        </p>

        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            fontWeight: 700,
            color: C.mid,
          }}
        >
          Theme
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
            marginBottom: 18,
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

        {showSectionOptions && (
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                fontWeight: 700,
                color: C.mid,
              }}
            >
              Include in report card
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SECTION_TOGGLES.map((t) => (
                <ToggleRow
                  key={t.key}
                  checked={!!sections[t.key]}
                  onChange={(v) => setSection(t.key, v)}
                  label={t.label}
                  hint={t.hint}
                  accent={activeSwatch}
                />
              ))}
            </div>
          </div>
        )}

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
              onClick={() => onPreview(selected, sections)}
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
            onClick={() => onConfirm(selected, sections)}
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
