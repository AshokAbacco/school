// client/src/student/pages/marks/components/ExamTabs.jsx
import { Lock } from "lucide-react";
import { C, FONT } from "../tokens.js";

export default function ExamTabs({ examGroups, selectedGroupId, onChange, isMobile }) {
  if (!examGroups || examGroups.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      gap: 6,
      overflowX: isMobile ? "auto" : "unset",
      flexWrap: isMobile ? "nowrap" : "wrap",
      paddingBottom: isMobile ? 4 : 0,
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
    }}>
      {examGroups.map((g) => {
        const active = g.id === selectedGroupId;
        return (
          <button
            key={g.id}
            className={`mrk-tab${active ? " active" : ""}`}
            onClick={() => onChange(g.id)}
            style={{ fontSize: isMobile ? 11 : 12, padding: isMobile ? "5px 12px" : "6px 16px" }}
          >
            {g.isLocked && <Lock size={10} color={active ? C.dark : C.textLight} />}
            {g.term ? `${g.term.name}: ` : ""}{g.name}
          </button>
        );
      })}
    </div>
  );
}