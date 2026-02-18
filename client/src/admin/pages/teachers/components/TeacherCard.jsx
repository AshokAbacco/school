// client/src/admin/pages/teachers/components/TeacherCard.jsx
import React from "react";

const STATUS = {
  ACTIVE: { dot: "#22c55e", label: "Active" },
  ON_LEAVE: { dot: "#f59e0b", label: "On Leave" },
  RESIGNED: { dot: "#6b7280", label: "Resigned" },
  TERMINATED: { dot: "#ef4444", label: "Terminated" },
};

const initials = (f, l) => `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();

export default function TeacherCard({ teacher, onSelect }) {
  const st = STATUS[teacher.status] ?? STATUS.ACTIVE;

  return (
    <article
      onClick={() => onSelect(teacher.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(teacher.id)}
      tabIndex={0}
      className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer outline-none transition-all duration-150"
      style={{
        border: "1.5px solid #BDDDFC",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(56,73,89,0.05)",
        fontFamily: "'DM Sans', sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#88BDF2";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(106,137,167,0.14)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#BDDDFC";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(56,73,89,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* ── Top: avatar + info + dot ── */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)" }}
        >
          {teacher.profileImage ? (
            <img
              src={teacher.profileImage}
              alt={teacher.firstName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            initials(teacher.firstName, teacher.lastName)
          )}
        </div>

        {/* Name / designation / dept */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3
              className="font-bold text-sm truncate"
              style={{ color: "#384959" }}
            >
              {teacher.firstName} {teacher.lastName}
            </h3>
            {/* Colored status dot */}
            <span
              title={st.label}
              className="flex-shrink-0 inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                background: st.dot,
                boxShadow: `0 0 0 2px ${st.dot}40`,
              }}
            />
          </div>
          <p className="text-xs truncate" style={{ color: "#6A89A7" }}>
            {teacher.designation}
          </p>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider truncate mt-0.5"
            style={{ color: "#88BDF2" }}
          >
            {teacher.department}
          </p>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div
        className="flex text-center pt-3"
        style={{ borderTop: "1px solid #BDDDFC" }}
      >
        {[
          { label: "Code", value: teacher.employeeCode },
          {
            label: "Exp.",
            value:
              teacher.experienceYears != null
                ? `${teacher.experienceYears}y`
                : "—",
          },
          { label: "Classes", value: teacher.assignments?.length ?? 0 },
        ].map(({ label, value }, i, arr) => (
          <div
            key={label}
            className="flex-1 flex flex-col gap-0.5"
            style={{
              borderRight: i < arr.length - 1 ? "1px solid #BDDDFC" : "none",
            }}
          >
            <span
              className="text-[10px] uppercase tracking-wide"
              style={{ color: "#6A89A7" }}
            >
              {label}
            </span>
            <span className="text-xs font-bold" style={{ color: "#384959" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Assignment tags ── */}
      {teacher.assignments?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {teacher.assignments.slice(0, 3).map((a, i) => (
            <span
              key={i}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md"
              style={{ background: "#BDDDFC", color: "#384959" }}
            >
              {a.subject} · {a.grade}
              {a.className}
            </span>
          ))}
          {teacher.assignments.length > 3 && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
              style={{ background: "#88BDF2", color: "#fff" }}
            >
              +{teacher.assignments.length - 3}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
