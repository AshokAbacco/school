// components/AssignmentsInfo.jsx

import React from "react";
import { BookOpen } from "lucide-react";

import {
  SectionHeading,
  Loading,
  ErrorMsg,
  Empty,
  C,
} from "./shared.jsx";

export default function AssignmentsInfo({ teacher, loading, error }) {
  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  const list = teacher?.assignments || [];

  if (!list.length) return <Empty message="No assignments found." />;

  return (
    <div>
      <SectionHeading icon={BookOpen} title="Assignments" />

      <div
        style={{
          display: "grid",
          gap: 9,
          /* Single column on mobile, two on wider screens */
          gridTemplateColumns: "1fr",
        }}
      >
        <style>{`
          @media (min-width: 500px) {
            .assign-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (min-width: 900px) {
            .assign-grid { grid-template-columns: 1fr !important; }
          }
          @media (min-width: 1100px) {
            .assign-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>

        <div
          className="assign-grid"
          style={{
            display: "grid",
            gap: 9,
            gridTemplateColumns: "1fr",
          }}
        >
          {list.map((item) => (
            <div key={item.id} className="pf-info-card">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: C.dark,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.subject?.name}
                </div>

                <div style={{ fontSize: 11, color: C.mid, marginTop: 4 }}>
                  {item.classSection?.name} · {item.academicYear?.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}