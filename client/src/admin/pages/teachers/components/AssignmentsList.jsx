// client/src/admin/pages/teachers/components/AssignmentsList.jsx
import React from "react";
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
      <p
        className="text-xs py-2"
        style={{ color: "#6A89A7", fontFamily: "'DM Sans', sans-serif" }}
      >
        No assignments yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {assignments.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
          style={{ background: "#f3f8fd", border: "1px solid #BDDDFC" }}
        >
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "#384959", fontFamily: "'DM Sans', sans-serif" }}
            >
              {a.subject}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "#6A89A7", fontFamily: "'DM Sans', sans-serif" }}
            >
              Grade {a.grade} · Class {a.className} · {a.academicYear}
            </p>
          </div>
          {a.id && (
            <button
              onClick={() => handleRemove(a.id)}
              className="text-lg leading-none px-1 transition-colors"
              style={{
                color: "#6A89A7",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#991b1b")}
              onMouseLeave={(e) => (e.target.style.color = "#6A89A7")}
              title="Remove assignment"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
