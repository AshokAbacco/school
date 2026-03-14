// client/src/admin/pages/teachers/components/TeachersFilters.jsx
import React from "react";
import { Search, X, ChevronDown, SlidersHorizontal } from "lucide-react";

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

const base = {
  border: "1.5px solid #DDE9F5", color: "#243340",
  fontFamily: "'Inter', sans-serif", background: "#fff",
  borderRadius: 11, fontSize: 13, fontWeight: 500,
  outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
};

export default function TeachersFilters({ filters, onChange }) {
  return (
    <>
      <style>{`
        .tf-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 0 32px 14px; }
        .tf-input:focus { border-color: #88BDF2 !important; box-shadow: 0 0 0 3px rgba(136,189,242,0.12) !important; }
        .tf-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); border: none; background: none; cursor: pointer; color: #6A89A7; padding: 2px; display: flex; border-radius: 50%; transition: background 0.12s; }
        .tf-clear:hover { background: #EDF3FA; }
        @media (max-width: 767px) {
          .tf-wrap { padding: 0 16px 12px; flex-direction: column; align-items: stretch; }
          .tf-search { width: 100% !important; min-width: unset !important; }
          .tf-selects { display: flex; gap: 8px; }
          .tf-selects > div { flex: 1; }
          .tf-dept { width: 100% !important; min-width: unset !important; }
        }
      `}</style>

      <div className="tf-wrap">
        {/* Search */}
        <div className="tf-search" style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#88BDF2", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search name, code, department…"
            value={filters.search}
            onChange={(e) => onChange("search", e.target.value)}
            className="tf-input"
            style={{ ...base, width: "100%", padding: "9px 36px 9px 34px", boxSizing: "border-box" }}
            onFocus={(e) => { e.target.style.borderColor = "#88BDF2"; e.target.style.boxShadow = "0 0 0 3px rgba(136,189,242,0.12)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#DDE9F5"; e.target.style.boxShadow = "none"; }}
          />
          {filters.search && (
            <button className="tf-clear" onClick={() => onChange("search", "")}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status + Type */}
        <div className="tf-selects" style={{ display: "flex", gap: 8 }}>
          {[
            { key: "status", opts: STATUS_OPTS, minW: 132 },
            { key: "employmentType", opts: EMP_OPTS, minW: 120 },
          ].map(({ key, opts, minW }) => (
            <div key={key} style={{ position: "relative" }}>
              <select
                value={filters[key] || ""}
                onChange={(e) => onChange(key, e.target.value)}
                style={{ ...base, appearance: "none", WebkitAppearance: "none", padding: "9px 30px 9px 12px", minWidth: minW, cursor: "pointer", width: "100%" }}
                onFocus={(e) => { e.target.style.borderColor = "#88BDF2"; e.target.style.boxShadow = "0 0 0 3px rgba(136,189,242,0.12)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#DDE9F5"; e.target.style.boxShadow = "none"; }}
              >
                {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={11} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6A89A7", pointerEvents: "none" }} />
            </div>
          ))}
        </div>

        {/* Department */}
        <div className="tf-dept" style={{ position: "relative", minWidth: 150 }}>
          <input
            type="text"
            placeholder="Department…"
            value={filters.department}
            onChange={(e) => onChange("department", e.target.value)}
            style={{ ...base, padding: "9px 12px", width: "100%", boxSizing: "border-box" }}
            onFocus={(e) => { e.target.style.borderColor = "#88BDF2"; e.target.style.boxShadow = "0 0 0 3px rgba(136,189,242,0.12)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#DDE9F5"; e.target.style.boxShadow = "none"; }}
          />
        </div>
      </div>
    </>
  );
}