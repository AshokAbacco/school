// client/src/teacher/pages/Activities/index.jsx
// Redesigned to match Gallery.jsx design system

import { useState } from "react";
import ActivitiesPage    from "./ActivitiesPage";
import TeacherEventsPage from "./TeacherEventsPage";
import PageLayout        from "../../components/PageLayout";
import { Trophy, Star }  from "lucide-react";

/* ── Design tokens (Gallery-identical) ── */
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

const tabs = [
  { key:"activities", label:"Activities", Icon:Star   },
  { key:"events",     label:"Events",     Icon:Trophy },
];

export default function ActivitiesAndEvents() {
  const [tab, setTab] = useState("activities");

  return (
    <PageLayout>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.35s ease both; }
      `}</style>

      {/* Tab switcher — matches Gallery card header style */}
      <div
        className="fade-up"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 0,
          background: C.white,
          border: `1.5px solid ${C.borderLight}`,
          borderRadius: 14,
          padding: 4,
          boxShadow: "0 2px 12px rgba(56,73,89,0.07)",
        }}
      >
        {tabs.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 20px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.01em",
                transition: "all 0.18s ease",
                background: active
                  ? `linear-gradient(135deg, ${C.slate} 0%, ${C.deep} 100%)`
                  : "transparent",
                color: active ? C.white : C.textLight,
                boxShadow: active ? "0 2px 10px rgba(56,73,89,0.22)" : "none",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${C.mist}55`; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              <Icon
                size={13}
                style={{ color: active ? C.mist : C.textLight, opacity: active ? 1 : 0.7 }}
              />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "activities" && <ActivitiesPage />}
      {tab === "events"     && <TeacherEventsPage />}
    </PageLayout>
  );
}