// client/src/busHead/pages/VehicleTracking.jsx  (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════
// Bus Head live tracking — now uses the SAME live dashboard as the Super Admin
// (LiveTrackingTab): real-time SSE updates, smooth markers, trails and
// stop-by-stop ETAs. Only the endpoints differ (/api/bus-head/...), and they are
// scoped on the server to the school(s) this Bus Head may see.
//
// Previously the map stayed empty because the old endpoint returned `location`
// while the shared map needs `point`, and every error was silently swallowed.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from "react";
import { Car, AlertTriangle } from "lucide-react";
import LiveTrackingTab from "../../superAdmin/pages/VehicleTracking/LiveTrackingTab";
import { API_URL, fetchJson } from "../../shared/liveTracking/liveTracking";

const BASE = `${API_URL}/api/bus-head`;

const qs = (params) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

// schoolId "" = every school in this Bus Head's scope
const BUS_HEAD_TRACKING_API = {
  liveAll: (schoolId, full) =>
    `${BASE}/vehicles/live-all${qs({ schoolId, trail: full ? "1" : "" })}`,
  stream: (schoolId) => `${BASE}/vehicles/live-stream${qs({ schoolId })}`,
  eta: (schoolId) => `${BASE}/vehicles/eta${qs({ schoolId })}`,
  routeGeometry: (vehicleId) =>
    `${BASE}/vehicles/${encodeURIComponent(vehicleId)}/route-geometry`,
};

export default function VehicleTracking() {
  const [schools, setSchools] = useState([]);
  const [accessType, setAccessType] = useState(null);
  const [schoolId, setSchoolId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson(`${BASE}/schools`)
      .then((d) => {
        setSchools(d.schools || []);
        setAccessType(d.accessType);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);

  const multi = schools.length > 1;

  return (
    <div
      style={{
        fontFamily: "system-ui,-apple-system,sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "#EEF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Car size={18} color="#4F46E5" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
              Vehicle Tracking
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>
              Live GPS, next-stop ETAs and delays — view only
            </p>
          </div>
        </div>

        {multi && (
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1.5px solid #E5E7EB",
              borderRadius: 8,
              fontSize: 14,
              color: "#111827",
              outline: "none",
              background: "#FAFAFA",
              cursor: "pointer",
              maxWidth: "100%",
            }}
          >
            <option value="">All schools ({schools.length})</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
          {error}
        </div>
      )}

      <div
        style={{
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          padding: "18px 20px",
        }}
      >
        <LiveTrackingTab
          schoolId={schoolId}
          api={BUS_HEAD_TRACKING_API}
          showSchoolName={accessType === "ALL_SCHOOLS" && !schoolId}
          emptyHint="Ask your administrator to add vehicles for your school."
        />
      </div>
    </div>
  );
}
