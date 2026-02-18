// client/src/admin/pages/teachers/components/TeachersHeader.jsx
import React from "react";

export default function TeachersHeader({ total, onAdd }) {
  return (
    <div className="flex items-center justify-between px-8 pt-7 pb-4">
      <div className="flex items-center gap-3">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#384959", fontFamily: "'DM Sans', sans-serif" }}
          >
            Teachers
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6A89A7" }}>
            Manage staff profiles, assignments & records
          </p>
        </div>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full ml-2"
          style={{ background: "#BDDDFC", color: "#384959" }}
        >
          {total} total
        </span>
      </div>

      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-95 shadow-sm"
        style={{
          background: "#384959",
          color: "#fff",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path
            d="M7.5 2v11M2 7.5h11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Add Teacher
      </button>
    </div>
  );
}
