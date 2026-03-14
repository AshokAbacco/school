// client/src/admin/pages/teachers/components/TeachersHeader.jsx
import React from "react";
import { UserPlus } from "lucide-react";

export default function TeachersHeader({ total, onAdd }) {
  return (
    <>
      <style>{`
        .th-wrap {
          display: flex; align-items: center; justify-content: space-between;
          padding: 28px 32px 20px; gap: 16px;
        }
        .th-add-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 12px;
          background: #243340; color: #fff;
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
          border: none; cursor: pointer; flex-shrink: 0;
          box-shadow: 0 2px 12px rgba(36,51,64,0.22);
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
          letter-spacing: -0.01em;
        }
        .th-add-btn:hover { background: #384959; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(36,51,64,0.30); }
        .th-add-btn:active { transform: translateY(0); }
        @media (max-width: 767px) {
          .th-wrap { padding: 18px 16px 12px; }
          .th-title { font-size: 22px !important; }
          .th-subtitle { display: none !important; }
          .th-add-label { display: none; }
        }
      `}</style>
      <div className="th-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 4, height: 38, borderRadius: 99, background: "linear-gradient(180deg, #88BDF2 0%, #384959 100%)", flexShrink: 0 }} />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h1 className="th-title" style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: "#1a2733", fontFamily: "'Inter', sans-serif", lineHeight: 1.1 }}>
                Teachers
              </h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#EDF3FA", color: "#384959", border: "1.5px solid #C8DCF0", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                {total}
              </span>
            </div>
            <p className="th-subtitle" style={{ margin: "3px 0 0", fontSize: 12, color: "#6A89A7", fontFamily: "'Inter', sans-serif" }}>
              Manage staff profiles, assignments &amp; records
            </p>
          </div>
        </div>
        <button className="th-add-btn" onClick={onAdd}>
          <UserPlus size={14} strokeWidth={2.2} />
          <span className="th-add-label">Add Teacher</span>
        </button>
      </div>
    </>
  );
}