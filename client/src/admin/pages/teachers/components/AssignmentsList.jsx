// client/src/admin/pages/teachers/components/AssignmentsList.jsx
import React from "react";
import { X } from "lucide-react";
import { removeAssignment } from "../api/teachersApi";

export default function AssignmentsList({ assignments, teacherId, onUpdate }) {
  const handleRemove = async (aId) => {
    if (!window.confirm("Remove this assignment?")) return;
    try {
      await removeAssignment(teacherId, aId);
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!assignments?.length) {
    return (
      <p style={{ fontSize: 12, color: "#6A89A7", fontFamily: "Inter, sans-serif", padding: "6px 0" }}>
        No assignments yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {assignments.map((a) => (
        <div key={a.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px", borderRadius: 12,
          background: "#EDF3FA",
          border: "1.5px solid #DDE9F5",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#243340", fontFamily: "Inter, sans-serif" }}>
              {a.subject?.name}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6A89A7", fontFamily: "Inter, sans-serif" }}>
              {a.classSection?.name} · {a.academicYear?.name}
            </p>
          </div>
          {a.id && (
            <button
              onClick={() => handleRemove(a.id)}
              title="Remove assignment"
              style={{
                width: 26, height: 26, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "none", border: "1px solid #DDE9F5",
                cursor: "pointer", color: "#6A89A7", transition: "all 0.12s", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.borderColor = "#fca5a5"; e.currentTarget.style.color = "#b91c1c"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#DDE9F5"; e.currentTarget.style.color = "#6A89A7"; }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}