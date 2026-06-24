// client/src/superAdmin/pages/VehicleTracking/VehicleManagement.jsx

import React, { useState, useEffect } from "react";
import { Car, MapPin, Plus, Activity } from "lucide-react";
import VehiclesTab from "./VehiclesTab";
import LiveTrackingTab from "./LiveTrackingTab";

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/vehicles`;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const TABS = [
  { key: "live",     label: "Live Tracking",  icon: Activity },
  { key: "vehicles", label: "Manage Vehicles", icon: Car },
];

export default function VehicleManagement() {
  const [activeTab, setActiveTab] = useState("live");
  const [schools,   setSchools]   = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/biometric/schools`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.length) {
          setSchools(d.data);
          setSelectedSchool(d.data[0]?.id || "");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: "16px", fontFamily: "system-ui,-apple-system,sans-serif", color: "#111827" }}>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 480px) {
          .vm-tab-content { padding: 12px 14px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Car size={20} color="#4F46E5" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Vehicle Tracking</h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>
              Live GPS tracking and vehicle management for all schools.
            </p>
          </div>
        </div>
      </div>

      {/* School selector */}
      {schools.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            style={{ padding: "8px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", background: "#FAFAFA", cursor: "pointer" }}
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", overflowX: "auto" }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "12px 22px", border: "none",
                  borderBottom: active ? "2px solid #4F46E5" : "2px solid transparent",
                  background: "transparent",
                  color: active ? "#4F46E5" : "#6B7280",
                  fontWeight: active ? 700 : 500,
                  fontSize: 14, cursor: "pointer",
                  whiteSpace: "nowrap", marginBottom: -1,
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content — tighter padding on mobile */}
        <div className="vm-tab-content" style={{ padding: "20px 24px" }}>
          {activeTab === "live"     && <LiveTrackingTab schoolId={selectedSchool} />}
          {activeTab === "vehicles" && <VehiclesTab     schoolId={selectedSchool} schools={schools} />}
        </div>
      </div>
    </div>
  );
}