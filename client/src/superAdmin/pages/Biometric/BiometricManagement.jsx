import React, { useState, useEffect } from "react";
import DevicesTab   from "./DevicesTab";
import MappingsTab  from "./MappingsTab";
import LogsTab      from "./LogsTab";

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
  { key: "devices",   label: "Devices"            },
  { key: "mappings",  label: "Enrollment Mapping"  },
  { key: "logs",      label: "Punch Logs"          },
];

export default function BiometricManagement() {
  const [activeTab, setActiveTab] = useState("devices");
  const [stats, setStats]         = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setStatsLoading(true);
    fetch(`${BASE}/stats`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => setStats(j.data || null))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  const STAT_CARDS = [
    {
      key:   "totalDevices",
      label: "Total Devices",
      icon:  "🖥️",
      color: "#4F46E5",
      bg:    "#EEF2FF",
    },
    {
      key:   "mappedUsers",
      label: "Mapped Users",
      icon:  "👤",
      color: "#059669",
      bg:    "#ECFDF5",
    },
    {
      key:   "todayPunches",
      label: "Today's Punches",
      icon:  "✋",
      color: "#D97706",
      bg:    "#FFFBEB",
    },
    {
      key:   "unmappedPunches",
      label: "Unmapped Punches",
      icon:  "⚠️",
      color: "#DC2626",
      bg:    "#FEF2F2",
    },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" }}>

      {/* ── Page title ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Biometric Management</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
          Manage devices, card assignments, and punch logs across all schools.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {STAT_CARDS.map((s) => (
          <div key={s.key} style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: s.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4 }}>
                {s.label}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: s.color }}>
                {statsLoading ? (
                  <span style={{ color: "#D1D5DB" }}>—</span>
                ) : (
                  stats?.[s.key] ?? 0
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: "13px 24px",
                  border: "none",
                  borderBottom: active ? "2px solid #4F46E5" : "2px solid transparent",
                  background: "transparent",
                  color: active ? "#4F46E5" : "#6B7280",
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.12s",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: 24 }}>
          {activeTab === "devices"  && <DevicesTab  />}
          {activeTab === "mappings" && <MappingsTab isSuperAdmin={true} />}
          {activeTab === "logs"     && <LogsTab     />}
        </div>

      </div>
    </div>
  );
}