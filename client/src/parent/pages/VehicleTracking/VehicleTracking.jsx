// client/src/parent/pages/VehicleTracking/VehicleTracking.jsx

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Phone, Navigation, RefreshCw, Bus, Clock, Zap } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

function StatusBadge({ status }) {
  const cfg = {
    PARKED:  { bg: "#EEF2FF", color: "#4338CA", dot: "#6366F1", label: "Parked" },
    MOVING:  { bg: "#F0FDF4", color: "#166534", dot: "#22C55E", label: "Moving" },
    IDLE:    { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B", label: "Idle"   },
    OFF:     { bg: "#F9FAFB", color: "#6B7280", dot: "#9CA3AF", label: "Off"    },
  }[status] || { bg: "#F9FAFB", color: "#6B7280", dot: "#D1D5DB", label: status || "Unknown" };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cfg.bg, color: cfg.color, padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, display: "inline-block", animation: status === "MOVING" ? "blink 1.2s infinite" : "none" }} />
      {cfg.label}
    </span>
  );
}

function InfoCard({ icon: Icon, label, value, color = "#4F46E5" }) {
  return (
    <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 600, color: "#111827" }}>{value || "—"}</p>
      </div>
    </div>
  );
}

export default function VehicleTracking() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [countdown,  setCountdown]  = useState(30);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);

  // parentId comes from JWT token on backend — no need to pass studentId
  function load() {
    setLoading(true);
    fetch(`${API_URL}/api/parent/vehicle-tracking`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setData(d.data); setLastUpdate(new Date()); setCountdown(30); }
        else setError(d.message || "Failed to load");
      })
      .catch(() => setError("Failed to connect"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    intervalRef.current  = setInterval(load, 30 * 1000);
    countdownRef.current = setInterval(() => setCountdown((c) => c <= 1 ? 30 : c - 1), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current); };
  }, []);

  const timeAgo = (dt) => {
    if (!dt) return "—";
    const s = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (s < 60)  return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  return (
    <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
            <Bus size={22} color="#4F46E5" /> Bus Tracking
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6B7280" }}>Live location of your child's school bus</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {lastUpdate && (
            <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Refreshes in {countdown}s</p>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#EEF2FF", color: "#4F46E5", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 4, opacity: loading ? 0.7 : 1 }}
          >
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>



      {/* Error */}
      {error && (
        <div style={{ padding: "14px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, marginBottom: 16, fontSize: 13, color: "#DC2626" }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 12, background: "#F3F4F6", animation: "blink 1.5s infinite" }} />
          ))}
        </div>
      )}

      {/* No transport assigned */}
      {!loading && data === null && !error && (
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16 }}>
          <Bus size={40} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 600, color: "#374151" }}>No transport assigned</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9CA3AF" }}>Your child is not assigned to any school bus yet</p>
        </div>
      )}

      {/* Data */}
      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Route info card */}
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111827" }}>{data.route?.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>Route {data.route?.code}</p>
              </div>
              {data.location && <StatusBadge status={data.location.vehicleStatus || data.location.status} />}
            </div>

            {/* Vehicle reg no */}
            {data.vehicle?.regNo && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EEF2FF", padding: "4px 12px", borderRadius: 8, marginBottom: 12 }}>
                <Bus size={13} color="#4F46E5" />
                <code style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 14, color: "#4338CA", letterSpacing: 1 }}>
                  {data.vehicle.regNo}
                </code>
                {data.vehicle.vehicleName && (
                  <span style={{ fontSize: 12, color: "#6B7280" }}>· {data.vehicle.vehicleName}</span>
                )}
              </div>
            )}

            {/* Your stop */}
            {data.stop && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#F0FDF4", borderRadius: 10, marginBottom: 12 }}>
                <MapPin size={14} color="#16A34A" />
                <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>Your stop: {data.stop.name}</span>
                {data.stop.area && <span style={{ fontSize: 12, color: "#6B7280" }}>({data.stop.area})</span>}
              </div>
            )}

            {/* Driver / Conductor */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {data.route?.driverName && (
                <InfoCard icon={Phone} label="Driver" value={data.route.driverName} color="#059669" />
              )}
              {data.route?.driverPhone && (
                <a href={`tel:${data.route.driverPhone}`} style={{ textDecoration: "none" }}>
                  <InfoCard icon={Phone} label="Driver Phone" value={data.route.driverPhone} color="#059669" />
                </a>
              )}
              {data.route?.conductorName && (
                <InfoCard icon={Phone} label="Conductor" value={data.route.conductorName} color="#7C3AED" />
              )}
            </div>
          </div>

          {/* Live Location card */}
          {data.location ? (
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#111827" }}>📍 Live Location</p>
                <span style={{ fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} /> {timeAgo(data.location.recordedAt)}
                </span>
              </div>

              {/* Speed + Ignition */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase" }}>Speed</p>
                  <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 800, color: data.location.speed > 0 ? "#166534" : "#374151" }}>
                    {data.location.speed ?? 0} <span style={{ fontSize: 11, fontWeight: 400 }}>km/h</span>
                  </p>
                </div>
                <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase" }}>Ignition</p>
                  <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: data.location.ignitionStatus === "ON" ? "#166534" : "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
                    <Zap size={14} /> {data.location.ignitionStatus || "—"}
                  </p>
                </div>
              </div>

              {/* Address */}
              {data.location.address && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#F0FDF4", padding: "10px 12px", borderRadius: 10, marginBottom: 12 }}>
                  <MapPin size={14} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}>{data.location.address}</span>
                </div>
              )}

              {/* Open in Google Maps */}
              {data.location.latitude && data.location.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${data.location.latitude},${data.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", background: "#4F46E5", color: "#fff", borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                >
                  <Navigation size={16} /> Open in Google Maps
                </a>
              )}
            </div>
          ) : (
            <div style={{ padding: "24px", textAlign: "center", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16, color: "#9CA3AF" }}>
              <MapPin size={28} color="#E5E7EB" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 13 }}>{data.message || "No live location data yet — bus may not have started"}</p>
            </div>
          )}

          {/* Last updated */}
          {lastUpdate && (
            <p style={{ margin: 0, textAlign: "center", fontSize: 11, color: "#D1D5DB" }}>
              Last updated: {lastUpdate.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}