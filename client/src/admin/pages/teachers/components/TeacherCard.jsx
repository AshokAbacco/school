// client/src/admin/pages/teachers/components/TeacherCard.jsx
import React from "react";

const STATUS = {
  ACTIVE:     { dot: "#22c55e", label: "Active",     color: "#166534", bg: "#dcfce7" },
  ON_LEAVE:   { dot: "#f59e0b", label: "On Leave",   color: "#92400e", bg: "#fef3c7" },
  RESIGNED:   { dot: "#6b7280", label: "Resigned",   color: "#6b7280", bg: "#f3f4f6" },
  TERMINATED: { dot: "#ef4444", label: "Terminated", color: "#991b1b", bg: "#fee2e2" },
};

const initials = (f, l) => `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();
const font = { fontFamily: "'Inter', sans-serif" };

export default function TeacherCard({ teacher, onSelect }) {
  const st = STATUS[teacher.status] ?? STATUS.ACTIVE;

  return (
    <>
      <style>{`
        .tcard {
          border-radius: 16px; padding: 16px 18px;
          display: flex; flex-direction: column; gap: 12px;
          cursor: pointer; outline: none;
          border: 1.5px solid #E8F0F9;
          background: #fff;
          box-shadow: 0 1px 4px rgba(56,73,89,0.04), 0 4px 16px rgba(56,73,89,0.04);
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          position: relative; overflow: hidden;
        }
        .tcard:hover {
          border-color: #BDDDFC;
          box-shadow: 0 4px 24px rgba(136,189,242,0.18), 0 1px 4px rgba(56,73,89,0.06);
          transform: translateY(-2px);
        }
        .tcard:focus-visible { outline: 2px solid #88BDF2; outline-offset: 2px; }
      `}</style>
      <article className="tcard" onClick={() => onSelect(teacher.id)} onKeyDown={(e) => e.key === "Enter" && onSelect(teacher.id)} tabIndex={0}>
        {/* Top accent */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: "linear-gradient(90deg, #88BDF2 0%, #6A89A7 100%)", borderRadius: "16px 16px 0 0" }} />

        {/* Avatar + info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 15, overflow: "hidden",
            border: "2px solid #EDF3FA",
          }}>
            {teacher.profileImage
              ? <img src={teacher.profileImage} alt={teacher.firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              : initials(teacher.firstName, teacher.lastName)
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 1 }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1a2733", ...font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>
                {teacher.firstName} {teacher.lastName}
              </h3>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, flexShrink: 0, display: "inline-block", boxShadow: `0 0 0 2.5px ${st.dot}25` }} />
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#6A89A7", ...font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.designation}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#88BDF2", ...font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teacher.department}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", textAlign: "center", borderTop: "1px solid #F0F6FD", paddingTop: 11 }}>
          {[
            { label: "Code",    value: teacher.employeeCode ?? "—" },
            { label: "Exp.",    value: teacher.experienceYears != null ? `${teacher.experienceYears}y` : "—" },
            { label: "Classes", value: teacher.assignments?.length ?? 0 },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, borderRight: i < arr.length - 1 ? "1px solid #F0F6FD" : "none" }}>
              <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6A89A7", fontWeight: 700, ...font }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2733", ...font }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Assignment tags */}
        {teacher.assignments?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {teacher.assignments.slice(0, 3).map((a, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#EDF3FA", color: "#384959", border: "1px solid #DDE9F5", ...font }}>
                {a.subject?.name} · {a.classSection?.name}
              </span>
            ))}
            {teacher.assignments.length > 3 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#384959", color: "#fff", ...font }}>
                +{teacher.assignments.length - 3}
              </span>
            )}
          </div>
        )}
      </article>
    </>
  );
}