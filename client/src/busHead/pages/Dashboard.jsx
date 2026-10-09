// client/src/busHead/pages/Dashboard.jsx  (UPDATED)
// ─ Uses the fixed /api/bus-head/vehicles/live-all (same data as the admin map,
//   including buses that report through a direct GPS device)
// ─ Real errors are shown with Retry instead of an empty "0 vehicles" screen
// ─ NEW: "Running late" / "Early" counts and a per-bus next-stop list from ETAs
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bus, Activity, ParkingSquare, WifiOff, AlarmClock, AlertTriangle, MapPin } from "lucide-react";
import {
  API_URL,
  fetchJson,
  formatClock,
  formatEtaMin,
  punctualityStyle,
} from "../../shared/liveTracking/liveTracking";

const BASE = `${API_URL}/api/bus-head`;
const REFRESH_MS = 60 * 1000;

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
  const [etas, setEtas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fetchJson(`${BASE}/vehicles/live-all`);
      setVehicles(d.data || []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // ETAs are a bonus — never block the summary on them
    try {
      const e = await fetchJson(`${BASE}/vehicles/eta`, { timeoutMs: 30000 });
      const map = {};
      for (const x of e.data || []) map[x.vehicleId] = x;
      setEtas(map);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState !== "hidden") load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const live = (v) => v.location && !v.location.isStale;
  const isMoving = (v) => live(v) && (v.location.status === "MOVING" || (v.location.speed || 0) > 3);
  const moving = vehicles.filter(isMoving);
  const parked = vehicles.filter((v) => live(v) && !isMoving(v));
  const noData = vehicles.filter((v) => !live(v));

  const onTrip = vehicles
    .map((v) => ({ v, e: etas[v.id] }))
    .filter(({ e }) => e?.tripState === "IN_PROGRESS");
  const late = onTrip.filter(({ e }) => e.currentPunctuality === "DELAYED");
  const early = onTrip.filter(({ e }) => e.currentPunctuality === "EARLY");

  let auth = null;
  try {
    auth = JSON.parse(localStorage.getItem("auth"))?.user;
  } catch {
    /* ignore */
  }

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

      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          <span style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </span>
          <button onClick={load} style={{ padding: "5px 12px", background: "#fff", color: "#991B1B", border: "1px solid #FECACA", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#9CA3AF", fontSize: 13.5 }}>Loading fleet summary…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <StatCard icon={Bus} label="Total Vehicles" value={vehicles.length} color="#4338CA" bg="#EEF2FF" />
          <StatCard icon={Activity} label="Moving Now" value={moving.length} color="#166534" bg="#F0FDF4" />
          <StatCard icon={ParkingSquare} label="Stopped" value={parked.length} color="#92400E" bg="#FFFBEB" />
          <StatCard icon={WifiOff} label="No GPS Signal" value={noData.length} color="#6B7280" bg="#F9FAFB" />
          <StatCard icon={AlarmClock} label={`Running late${early.length ? ` · ${early.length} early` : ""}`} value={late.length} color="#B91C1C" bg="#FEF2F2" />
        </div>
      )}

      {onTrip.length > 0 && (
        <div style={{ marginTop: 22, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", fontWeight: 700, fontSize: 14 }}>
            Buses on trip — next stop
          </div>
          {onTrip.map(({ v, e }) => {
            const n = e.nextStop;
            const p = n ? punctualityStyle(n.punctuality, n.delayMin) : null;
            return (
              <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 16px", borderBottom: "1px solid #F9FAFB", fontSize: 13 }}>
                <div style={{ minWidth: 0 }}>
                  <b>{v.regNo}</b>
                  <span style={{ color: "#9CA3AF" }}> · {e.route?.name}{v.schoolName ? ` · ${v.schoolName}` : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {n ? (
                    <>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} color="#4F46E5" /> {n.name}
                      </span>
                      <span style={{ color: "#4338CA", fontWeight: 700 }}>
                        {n.state === "AT_STOP" ? "at stop" : `${formatEtaMin(n.etaMin)} · ${formatClock(n.expectedArrival)}`}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "#9CA3AF" }}>—</span>
                  )}
                  {p && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.color, background: p.bg, padding: "2px 8px", borderRadius: 99 }}>
                      {p.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 12.5, color: "#9CA3AF" }}>
        Go to <Link to="../vehicle-tracking" style={{ color: "#4F46E5", fontWeight: 600 }}>Vehicle Tracking</Link> to see live locations and stop-by-stop ETAs.
      </p>
    </div>
  );
}
