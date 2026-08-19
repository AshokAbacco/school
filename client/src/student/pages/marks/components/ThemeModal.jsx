// client/src/student/pages/marks/components/ThemeModal.jsx
// Small confirm-before-download modal — lets the user pick a PDF colour
// theme (Default + Yellow + Blue + Red) before the report card downloads.
// Shared by the student Marks page and the admin StudentReportModal.

import { useState } from "react";
import { X, Download, Loader2, Check } from "lucide-react";
import { PDF_THEMES } from "../utils/downloadPDF.js";
import { C, FONT } from "../tokens.js";

const THEME_LIST = Object.values(PDF_THEMES);

export default function ThemeModal({ open, onClose, onConfirm, loading }) {
  const [selected, setSelected] = useState("default");
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 380,
          background: C.white, borderRadius: 18,
          border: `1.5px solid ${C.border}`,
          boxShadow: "0 24px 60px rgba(15,23,42,0.30)",
          padding: 20, fontFamily: FONT.sans,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.dark }}>
            Choose a PDF theme
          </p>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.mid, display: "flex", padding: 4,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <p style={{ margin: "2px 0 16px", fontSize: 12, color: C.textLight, fontWeight: 500 }}>
          Pick a colour theme for the downloaded report card.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
          {THEME_LIST.map((t) => {
            const active = selected === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSelected(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 12,
                  border: `1.5px solid ${active ? t.swatch : C.border}`,
                  background: active ? `${t.swatch}14` : C.white,
                  cursor: "pointer", textAlign: "left",
                  boxShadow: active ? `0 0 0 3px ${t.swatch}22` : "none",
                  transition: "all .15s",
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: t.swatch,
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {active && <Check size={13} color="#fff" strokeWidth={3} />}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{t.name}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 11,
              border: `1.5px solid ${C.border}`, background: C.white,
              color: C.mid, fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: FONT.sans,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={loading}
            style={{
              flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px 14px", borderRadius: 11, border: "none",
              background: C.dark, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              fontFamily: FONT.sans,
            }}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />
              : <Download size={14} />}
            {loading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}