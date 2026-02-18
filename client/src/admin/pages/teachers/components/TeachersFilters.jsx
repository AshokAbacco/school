// client/src/admin/pages/teachers/components/TeachersFilters.jsx
import React from "react";

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

const selectStyle = {
  border: "1.5px solid #BDDDFC",
  color: "#384959",
  fontFamily: "'DM Sans', sans-serif",
  background: "#fff",
};

export default function TeachersFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-8 pb-5">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
        >
          <circle cx="6" cy="6" r="4.5" stroke="#6A89A7" strokeWidth="1.5" />
          <path
            d="M9.5 9.5l3 3"
            stroke="#6A89A7"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          placeholder="Search name, code, department…"
          value={filters.search}
          onChange={(e) => onChange("search", e.target.value)}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{ ...selectStyle, fontSize: 13 }}
          onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
          onBlur={(e) => (e.target.style.borderColor = "#BDDDFC")}
        />
        {filters.search && (
          <button
            onClick={() => onChange("search", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
            style={{ color: "#6A89A7" }}
          >
            ×
          </button>
        )}
      </div>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => onChange("status", e.target.value)}
        className="py-2.5 px-3 rounded-xl text-sm outline-none cursor-pointer"
        style={{ ...selectStyle, minWidth: 130 }}
      >
        {STATUS_OPTS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Employment type */}
      <select
        value={filters.employmentType || ""}
        onChange={(e) => onChange("employmentType", e.target.value)}
        className="py-2.5 px-3 rounded-xl text-sm outline-none cursor-pointer"
        style={{ ...selectStyle, minWidth: 130 }}
      >
        {EMP_OPTS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Department */}
      <input
        type="text"
        placeholder="Department…"
        value={filters.department}
        onChange={(e) => onChange("department", e.target.value)}
        className="py-2.5 px-3 rounded-xl text-sm outline-none transition-all"
        style={{ ...selectStyle, minWidth: 150 }}
        onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
        onBlur={(e) => (e.target.style.borderColor = "#BDDDFC")}
      />
    </div>
  );
}
