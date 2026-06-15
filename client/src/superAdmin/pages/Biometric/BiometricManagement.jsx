import React, { useState, useEffect } from "react";
import { Monitor, Users, Hand, AlertTriangle } from "lucide-react";
import DevicesTab  from "./DevicesTab";
import MappingsTab from "./MappingsTab";
import LogsTab     from "./LogsTab";

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/biometric`;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const TABS = [
  { key: "devices",  label: "Devices" },
  { key: "mappings", label: "Enrollment Mapping" },
  { key: "logs",     label: "Punch Logs" },
];

const STAT_CARDS = [
  { key: "totalDevices",    label: "Total Devices",    Icon: Monitor,      color: "#4F46E5", bg: "#EEF2FF" },
  { key: "mappedUsers",     label: "Mapped Users",     Icon: Users,        color: "#059669", bg: "#ECFDF5" },
  { key: "todayPunches",    label: "Today's Punches",  Icon: Hand,         color: "#D97706", bg: "#FFFBEB" },
  { key: "unmappedPunches", label: "Unmapped Punches", Icon: AlertTriangle, color: "#DC2626", bg: "#FEF2F2" },
];

export default function BiometricManagement() {
  const [activeTab,    setActiveTab]    = useState("devices");
  const [stats,        setStats]        = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setStatsLoading(true);
    fetch(`${BASE}/stats`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => setStats(j.data || null))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div style={{ padding: "16px", fontFamily: "system-ui,-apple-system,sans-serif", color: "#111827", maxWidth: "100%", boxSizing: "border-box" }}>
      <style>{`
        @media (max-width: 640px) {
          .bm-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .bm-tab-bar button { padding: 10px 14px !important; font-size: 13px !important; }
          .bm-tab-content { padding: 14px !important; }
        }
        @media (max-width: 400px) {
          .bm-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .bm-stat-value { font-size: 20px !important; }
        }
      `}</style>

      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(18px,3vw,22px)", fontWeight: 800 }}>Biometric Management</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
          Manage devices, card assignments, and punch logs across all schools.
        </p>
      </div>

      {/* Stats row */}
      <div className="bm-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {STAT_CARDS.map(({ key, label, Icon, color, bg }) => (
          <div key={key} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</p>
              <p className="bm-stat-value" style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>
                {statsLoading ? <span style={{ color: "#D1D5DB" }}>—</span> : (stats?.[key] ?? 0)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div className="bm-tab-bar" style={{ display: "flex", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", overflowX: "auto" }}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: "12px 22px", border: "none", borderBottom: active ? "2px solid #4F46E5" : "2px solid transparent", background: "transparent", color: active ? "#4F46E5" : "#6B7280", fontWeight: active ? 700 : 500, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1, flexShrink: 0 }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="bm-tab-content" style={{ padding: "20px 24px" }}>
          {activeTab === "devices"  && <DevicesTab  />}
          {activeTab === "mappings" && <MappingsTab isSuperAdmin={true} />}
          {activeTab === "logs"     && <LogsTab     />}
        </div>
      </div>
    </div>
  );
}