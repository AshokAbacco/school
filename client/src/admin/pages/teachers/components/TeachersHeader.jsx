// client/src/admin/pages/teachers/components/TeachersHeader.jsx
import React from "react";

export default function TeachersHeader({ total, onAdd }) {
  return (
    <>
      <style>{`
        .th-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px 16px;
          gap: 12px;
        }
        @media (max-width: 767px) {
          .th-wrap { padding: 20px 12px 12px; }
          .th-title { font-size: 20px !important; }
          .th-subtitle { display: none; }
          .th-add span { display: none; }
        }
      `}</style>

      <div className="th-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <h1
              className="th-title"
              style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "#384959", fontFamily: "'DM Sans', sans-serif" }}
            >
              Teachers
            </h1>
            <p className="th-subtitle" style={{ margin: "2px 0 0", fontSize: 13, color: "#6A89A7", fontFamily: "Inter, sans-serif" }}>
              Manage staff profiles, assignments & records
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#BDDDFC", color: "#384959", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
            {total} total
          </span>
        </div>

        <button
          className="th-add"
          onClick={onAdd}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 12,
            background: "#384959", color: "#fff",
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
            border: "none", cursor: "pointer", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(56,73,89,0.20)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Add Teacher</span>
        </button>
      </div>
    </>
  );
}