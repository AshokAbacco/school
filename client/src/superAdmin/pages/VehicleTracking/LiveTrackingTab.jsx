// client/src/superAdmin/pages/VehicleTracking/LiveTrackingTab.jsx

import React, { useState, useEffect, useRef } from "react";
import { MapPin, RefreshCw, Navigation, Clock, Zap } from "lucide-react";
import VehicleMap from "./VehicleMap";
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

function Spinner({ size = 16, color = "#4F46E5" }) {
  return <span style={{ display: "inline-block", width: size, height: size, border: `2px solid ${color}30`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />;
}

function StatusBadge({ status }) {
  const cfg = {
    PARKED:  { bg: "#EEF2FF", color: "#4338CA", dot: "#6366F1", label: "Parked" },
    MOVING:  { bg: "#F0FDF4", color: "#166534", dot: "#22C55E", label: "Moving" },
    IDLE:    { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B", label: "Idle" },
    OFF:     { bg: "#F9FAFB", color: "#6B7280", dot: "#9CA3AF", label: "Off" },
  }[status] || { bg: "#F9FAFB", color: "#6B7280", dot: "#D1D5DB", label: status || "Unknown" };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cfg.bg, color: cfg.color, padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, display: "inline-block", animation: status === "MOVING" ? "blink 1.2s infinite" : "none" }} />
      {cfg.label}
    </span>
  );
}

function VehicleCard({ vehicle }) {
  const loc = vehicle.location;

  const timeAgo = (dt) => {
    if (!dt) return "—";
    const secs = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (secs < 60)  return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Top row — reg no + status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <code style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, letterSpacing: 1, color: "#111827" }}>
            {vehicle.regNo}
          </code>
          {vehicle.vehicleName && (
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{vehicle.vehicleName}</div>
          )}
        </div>
        <StatusBadge status={loc?.vehicleStatus || loc?.status} />
      </div>

      {/* Vehicle type tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ background: "#EEF2FF", color: "#4338CA", padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
          {vehicle.vehicleType || "VEHICLE"}
        </span>
        <span style={{ fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 3 }}>
          <Clock size={10} /> {timeAgo(loc?.recordedAt)}
        </span>
      </div>

      {loc ? (
        <>
          {/* Speed + ignition */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Speed</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: loc.speed > 0 ? "#166534" : "#374151", marginTop: 2 }}>
                {loc.speed ?? 0} <span style={{ fontSize: 11, fontWeight: 400 }}>km/h</span>
              </div>
            </div>
            <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Ignition</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: loc.ignitionStatus === "ON" ? "#166534" : "#6B7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <Zap size={14} /> {loc.ignitionStatus || "—"}
              </div>
            </div>
          </div>

          {/* Address */}
          {loc.address && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#F0FDF4", padding: "8px 12px", borderRadius: 8 }}>
              <MapPin size={14} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: "#166534", lineHeight: 1.4 }}>{loc.address}</span>
            </div>
          )}

          {/* Coordinates — click to open Google Maps */}
          {loc.latitude && loc.longitude && (
            <a
              href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}
            >
              <Navigation size={13} /> Open in Google Maps
            </a>
          )}
        </>
      ) : (
        <div style={{ padding: "16px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
          No location data yet — waiting for GPS signal
        </div>
      )}
    </div>
  );
}

export default function LiveTrackingTab({ schoolId }) {
  const [vehicles,     setVehicles]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [countdown,    setCountdown]    = useState(30);
  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);

  function loadLive() {
    if (!schoolId) return;
    setLoading(true);
    fetch(`${BASE}/live-all?schoolId=${schoolId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setVehicles(d.data || []); setLastUpdated(new Date()); setCountdown(30); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!schoolId) return;

    loadLive();

    // Auto-refresh every 30 seconds (in sync with backend cron)
    intervalRef.current = setInterval(loadLive, 30 * 1000);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [schoolId]);

  const moving  = vehicles.filter((v) => v.location?.vehicleStatus === "MOVING" || v.location?.status === "MOVING");
  const parked  = vehicles.filter((v) => v.location?.vehicleStatus === "PARKED" || v.location?.status === "PARKED");
  const noData  = vehicles.filter((v) => !v.location);

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", color: "#111827" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Stats */}
          {[
            { label: "Total",   value: vehicles.length, color: "#4338CA", bg: "#EEF2FF" },
            { label: "Moving",  value: moving.length,   color: "#166534", bg: "#F0FDF4" },
            { label: "Parked",  value: parked.length,   color: "#92400E", bg: "#FFFBEB" },
            { label: "No Data", value: noData.length,   color: "#6B7280", bg: "#F9FAFB" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, color, padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              {value} {label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
              Updated {lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
              {" "}· refresh in {countdown}s
            </span>
          )}
          <button
            onClick={loadLive}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#4F46E5", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing…" : "Refresh Now"}
          </button>
        </div>
      </div>

      {/* No vehicles */}
      {!loading && vehicles.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF" }}>
          <MapPin size={32} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, margin: 0 }}>No vehicles registered for this school.</p>
          <p style={{ fontSize: 12, margin: "4px 0 0" }}>Go to <b>Manage Vehicles</b> tab to add vehicles.</p>
        </div>
      )}

      {/* Vehicle cards grid */}
      {vehicles.length > 0 && (
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: "20px" }}>
  <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
    {vehicles.map((v) => (
      <VehicleCard key={v.id} vehicle={v} />
    ))}
  </div>
  <div style={{ minWidth: 0 }}>
    <VehicleMap vehicles={vehicles} />
  </div>
</div>
      )}
    </div>
  );
}