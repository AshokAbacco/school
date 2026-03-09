// client/src/admin/pages/teachers/components/TeachersFilters.jsx
import React from "react";
import { Search, X, ChevronDown } from "lucide-react";

const STATUS_OPTS = [
  { value: "", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "RESIGNED", label: "Resigned" },
  { value: "TERMINATED", label: "Terminated" },
];

const EMP_OPTS = [
  { value: "", label: "All Types" },
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
];

const inputBase = {
  border: "1.5px solid #C8DCF0",
  color: "#243340",
  fontFamily: "Inter, sans-serif",
  background: "#EDF3FA",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  transition: "border-color 0.15s",
};

export default function TeachersFilters({ filters, onChange }) {
  return (
    <>
      {/* Inject responsive styles once */}
      <style>{`
        .tf-wrap {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          padding: 8px 32px 12px;
        }
        @media (max-width: 767px) {
          .tf-wrap {
            padding: 8px 12px 12px;
            flex-direction: column;
            align-items: stretch;
          }
          .tf-search { width: 100% !important; }
          .tf-selects { display: flex; gap: 8px; }
          .tf-selects > div { flex: 1; }
          .tf-dept { width: 100% !important; min-width: unset !important; }
        }
      `}</style>

      <div className="tf-wrap fade-up" style={{ animationDelay: "40ms" }}>

        {/* Search */}
        <div className="tf-search" style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6A89A7", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search name, code, department…"
            value={filters.search}
            onChange={(e) => onChange("search", e.target.value)}
            style={{ ...inputBase, width: "100%", padding: "9px 36px 9px 34px", boxSizing: "border-box" }}
            onFocus={(e) => e.target.style.borderColor = "#88BDF2"}
            onBlur={(e) => e.target.style.borderColor = "#C8DCF0"}
          />
          {filters.search && (
            <button onClick={() => onChange("search", "")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#6A89A7", padding: 0, display: "flex" }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status + Employment type side by side on mobile */}
        <div className="tf-selects" style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <select value={filters.status} onChange={(e) => onChange("status", e.target.value)}
              style={{ ...inputBase, appearance: "none", WebkitAppearance: "none", padding: "9px 32px 9px 12px", minWidth: 130, cursor: "pointer", width: "100%" }}>
              {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={11} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6A89A7", pointerEvents: "none" }} />
          </div>

          <div style={{ position: "relative" }}>
            <select value={filters.employmentType || ""} onChange={(e) => onChange("employmentType", e.target.value)}
              style={{ ...inputBase, appearance: "none", WebkitAppearance: "none", padding: "9px 32px 9px 12px", minWidth: 130, cursor: "pointer", width: "100%" }}>
              {EMP_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={11} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6A89A7", pointerEvents: "none" }} />
          </div>
        </div>

        {/* Department */}
        <input
          className="tf-dept"
          type="text"
          placeholder="Department…"
          value={filters.department}
          onChange={(e) => onChange("department", e.target.value)}
          style={{ ...inputBase, padding: "9px 12px", minWidth: 150 }}
          onFocus={(e) => e.target.style.borderColor = "#88BDF2"}
          onBlur={(e) => e.target.style.borderColor = "#C8DCF0"}
        />
      </div>
    </>
  );
}