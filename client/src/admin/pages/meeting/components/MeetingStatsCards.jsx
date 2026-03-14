// client/src/admin/pages/meeting/components/MeetingStatsCards.jsx
import React from "react";
import { CalendarDays, CheckCircle2, Clock4, XCircle, Users, TrendingUp } from "lucide-react";

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2",
  deep: "#384959", bg: "#EDF3FA", white: "#FFFFFF",
  border: "#C8DCF0", borderLight: "#DDE9F5", text: "#243340", textLight: "#6A89A7",
};

const cards = [
  { key: "total",             label: "Total Meetings", icon: CalendarDays,  accent: C.deep,    accentBg: C.mist },
  { key: "scheduled",         label: "Scheduled",      icon: Clock4,        accent: "#3B82F6", accentBg: "#EFF6FF" },
  { key: "completed",         label: "Completed",      icon: CheckCircle2,  accent: "#10B981", accentBg: "#F0FDF4" },
  { key: "cancelled",         label: "Cancelled",      icon: XCircle,       accent: "#F43F5E", accentBg: "#FFF1F2" },
  { key: "totalParticipants", label: "Participants",   icon: Users,         accent: C.slate,   accentBg: `${C.mist}66` },
  { key: "thisMonth",         label: "This Month",     icon: TrendingUp,    accent: C.sky,     accentBg: `${C.sky}22` },
];

export default function MeetingStatsCards({ stats = {}, loading = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
      {cards.map(({ key, label, icon: Icon, accent, accentBg }) => (
        <div key={key} style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 12px rgba(56,73,89,0.05)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,  fontFamily: "'Inter', sans-serif", }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: C.textLight }}>{label}</span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={14} color={accent} />
            </div>
          </div>
          {loading
            ? <div style={{ height: 28, width: 48, borderRadius: 8, background: `${C.mist}88` }} />
            : <span style={{ fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: "-0.5px", lineHeight: 1 }}>{stats[key] ?? 0}</span>
          }
        </div>
      ))}
    </div>
  );
}