// client/src/admin/pages/teachers/components/TeacherCard.jsx
import React from "react";
import { Users } from "lucide-react";

const STATUS = {
  ACTIVE:     { dot: "#22c55e", label: "Active" },
  ON_LEAVE:   { dot: "#f59e0b", label: "On Leave" },
  RESIGNED:   { dot: "#6b7280", label: "Resigned" },
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
      style={{
        borderRadius: 18,
        padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 12,
        cursor: "pointer", outline: "none",
        border: "1.5px solid #DDE9F5",
        background: "#FFFFFF",
        boxShadow: "0 2px 10px rgba(56,73,89,0.05)",
        fontFamily: "Inter, sans-serif",
        transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#88BDF2";
        e.currentTarget.style.boxShadow = "0 8px 28px rgba(136,189,242,0.20)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#DDE9F5";
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(56,73,89,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #88BDF2, #6A89A7)", borderRadius: "18px 18px 0 0" }} />

      {/* Avatar + info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 14, overflow: "hidden",
          border: "2px solid #EDF3FA",
        }}>
          {teacher.profileImage
            ? <img src={teacher.profileImage} alt={teacher.firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
            : initials(teacher.firstName, teacher.lastName)
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 13, color: "#243340", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {teacher.firstName} {teacher.lastName}
            </h3>
            <span title={st.label} style={{ width: 7, height: 7, borderRadius: "50%", background: st.dot, boxShadow: `0 0 0 2px ${st.dot}33`, flexShrink: 0, display: "inline-block" }} />
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#6A89A7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.designation}</p>
          <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#88BDF2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teacher.department}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", textAlign: "center", borderTop: "1.5px solid #DDE9F5", paddingTop: 11 }}>
        {[
          { label: "Code",    value: teacher.employeeCode },
          { label: "Exp.",    value: teacher.experienceYears != null ? `${teacher.experienceYears}y` : "—" },
          { label: "Classes", value: teacher.assignments?.length ?? 0 },
        ].map(({ label, value }, i, arr) => (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, borderRight: i < arr.length - 1 ? "1px solid #DDE9F5" : "none" }}>
            <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6A89A7", fontWeight: 700 }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#243340" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Assignment tags */}
      {teacher.assignments?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {teacher.assignments.slice(0, 3).map((a, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(189,221,252,0.55)", color: "#384959", border: "1px solid #C8DCF0" }}>
              {a.subject?.name} · {a.classSection?.name}
            </span>
          ))}
          {teacher.assignments.length > 3 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "linear-gradient(135deg, #88BDF2, #6A89A7)", color: "#fff" }}>
              +{teacher.assignments.length - 3}
            </span>
          )}
        </div>
      )}
    </article>
  );
}