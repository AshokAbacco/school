// client/src/busHead/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Bus, Activity, ParkingSquare, WifiOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12.5, color: "#6B7280", marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/bus-head/vehicles/live-all`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setVehicles(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const moving = vehicles.filter((v) => v.location?.vehicleStatus === "MOVING" || v.location?.status === "MOVING");
  const parked = vehicles.filter((v) => v.location?.vehicleStatus === "PARKED" || v.location?.status === "PARKED");
  const noData = vehicles.filter((v) => !v.location);

  let auth = null;
  try { auth = JSON.parse(localStorage.getItem("auth"))?.user; } catch {}

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#111827" }}>
          Welcome, {auth?.name || "Bus Head"}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#6B7280" }}>
          {auth?.accessType === "ALL_SCHOOLS"
            ? `Overview of all vehicles across ${auth?.university?.name || "your university"}`
            : `Overview of vehicles for ${auth?.school?.name || "your school"}`}
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#9CA3AF", fontSize: 13.5 }}>Loading fleet summary…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <StatCard icon={Bus}          label="Total Vehicles" value={vehicles.length} color="#4338CA" bg="#EEF2FF" />
          <StatCard icon={Activity}     label="Moving Now"     value={moving.length}   color="#166534" bg="#F0FDF4" />
          <StatCard icon={ParkingSquare} label="Parked"        value={parked.length}   color="#92400E" bg="#FFFBEB" />
          <StatCard icon={WifiOff}      label="No GPS Data"    value={noData.length}   color="#6B7280" bg="#F9FAFB" />
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 12.5, color: "#9CA3AF" }}>
        Go to <b>Vehicle Tracking</b> in the sidebar to see live locations on the map.
      </p>
    </div>
  );
}