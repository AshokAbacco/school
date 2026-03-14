// client/src/admin/pages/teachers/components/AssignmentsList.jsx
import React from "react";
import { X, BookOpen } from "lucide-react";
import { removeAssignment } from "../api/teachersApi";

const F = { fontFamily: "'Inter', sans-serif" };

export default function AssignmentsList({ assignments, teacherId, onUpdate }) {
  const handleRemove = async (aId) => {
    if (!window.confirm("Remove this assignment?")) return;
    try { await removeAssignment(teacherId, aId); onUpdate(); }
    catch (err) { alert(err.message); }
  };

  if (!assignments?.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
        <BookOpen size={14} color="#9BBACF" />
        <p style={{ ...F, fontSize: 12, color: "#9BBACF", margin: 0 }}>No assignments yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {assignments.map((a) => (
        <div key={a.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 13px", borderRadius: 11,
          background: "#f5f9fd", border: "1.5px solid #E4EEF8",
          transition: "border-color 0.12s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#C8DCF0"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "#E4EEF8"}
        >
          <div>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#1a2733", ...F, letterSpacing: "-0.01em" }}>
              {a.subject?.name}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6A89A7", ...F }}>
              {a.classSection?.name} · {a.academicYear?.name}
            </p>
          </div>
          {a.id && (
            <button onClick={() => handleRemove(a.id)} title="Remove"
              style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "none", border: "1.5px solid #E4EEF8",
                cursor: "pointer", color: "#9BBACF", transition: "all 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.color = "#b91c1c"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#E4EEF8"; e.currentTarget.style.color = "#9BBACF"; }}>
              <X size={11} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}