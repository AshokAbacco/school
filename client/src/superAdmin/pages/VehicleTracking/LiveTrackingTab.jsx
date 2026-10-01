// client/src/superAdmin/pages/VehicleTracking/LiveTrackingTab.jsx  (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════
// Admin live dashboard
//   • Real-time push for all buses of the school (SSE) — no 30 s refresh cycle
//   • Smooth animated markers + recent paths
//   • Falls back to 15 s polling when the stream is unavailable
//   • Click a bus on the map to highlight its card
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  MapPin,
  RefreshCw,
  Navigation,
  Clock,
  Zap,
  Radio,
  WifiOff,
} from "lucide-react";
import VehicleMap from "./VehicleMap";
import {
  API_URL,
  authHeaders,
  openLiveStream,
  applyLivePoints,
  tsOf,
  formatAge,
} from "../../../shared/liveTracking/liveTracking";

const BASE = `${API_URL}/api/vehicles`;
const FALLBACK_POLL_MS = 15 * 1000;
const STALE_SEC = 180;

function StatusBadge({ status, stale }) {
  const key = stale ? "STALE" : (status || "").toUpperCase();
  const cfg = {
    PARKED: {
      bg: "#EEF2FF",
      color: "#4338CA",
      dot: "#6366F1",
      label: "Parked",
    },
    MOVING: {
      bg: "#F0FDF4",
      color: "#166534",
      dot: "#22C55E",
      label: "Moving",
    },
    IDLE: { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B", label: "Idle" },
    OFF: { bg: "#F9FAFB", color: "#6B7280", dot: "#9CA3AF", label: "Off" },
    STALE: {
      bg: "#F9FAFB",
      color: "#6B7280",
      dot: "#9CA3AF",
      label: "No signal",
    },
  }[key] || {
    bg: "#F9FAFB",
    color: "#6B7280",
    dot: "#D1D5DB",
    label: status || "No data",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: cfg.bg,
        color: cfg.color,
        padding: "4px 12px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: cfg.dot,
          animation: key === "MOVING" ? "lt-blink 1.2s infinite" : "none",
        }}
      />
      {cfg.label}
    </span>
  );
}

function VehicleCard({ vehicle, ageSec, stale, selected, cardRef }) {
  const loc = vehicle.point;
  return (
    <div
      ref={cardRef}
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: selected ? "2px solid #4F46E5" : "1px solid #E5E7EB",
        boxShadow: selected ? "0 0 0 4px #EEF2FF" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.5 }}>
            {vehicle.regNo}
          </div>
          {vehicle.vehicleName && (
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {vehicle.vehicleName}
            </div>
          )}
        </div>
        <StatusBadge status={loc?.status} stale={loc && stale} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            background: "#EEF2FF",
            color: "#4338CA",
            padding: "2px 9px",
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {vehicle.vehicleType || "Vehicle"}
        </span>
        <span
          style={{
            fontSize: 12,
            color: stale ? "#B45309" : "#6B7280",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Clock size={11} /> {loc ? formatAge(ageSec) : "—"}
        </span>
        {loc?.source === "device" && (
          <span style={{ fontSize: 11, color: "#0891B2", fontWeight: 600 }}>
            Direct GPS
          </span>
        )}
      </div>

      {loc ? (
        <>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div
              style={{
                background: "#F9FAFB",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>
                Speed
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: loc.speed > 0 && !stale ? "#166534" : "#374151",
                  marginTop: 2,
                }}
              >
                {stale ? "—" : Math.round(loc.speed ?? 0)}{" "}
                <span style={{ fontSize: 11, fontWeight: 400 }}>km/h</span>
              </div>
            </div>
            <div
              style={{
                background: "#F9FAFB",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>
                Ignition
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: loc.ignitionStatus === "ON" ? "#166534" : "#6B7280",
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Zap size={14} /> {loc.ignitionStatus || "—"}
              </div>
            </div>
          </div>

          {loc.address && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                background: "#F0FDF4",
                padding: "8px 12px",
                borderRadius: 8,
              }}
            >
              <MapPin
                size={14}
                color="#16A34A"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span style={{ fontSize: 12, color: "#166534", lineHeight: 1.4 }}>
                {loc.address}
              </span>
            </div>
          )}

          <a
            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#4F46E5",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Navigation size={13} /> Open in Google Maps
          </a>
        </>
      ) : (
        <div
          style={{
            padding: "12px 0",
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: 13,
          }}
        >
          No location yet. Waiting for the first GPS signal.
        </div>
      )}
    </div>
  );
}

export default function LiveTrackingTab({ schoolId }) {
  const [byId, setById] = useState({}); // id → vehicle state
  const [order, setOrder] = useState([]); // stable card order
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState("connecting");
  const [visible, setVisible] = useState(
    () => document.visibilityState !== "hidden",
  );
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [fitKey, setFitKey] = useState("init");
  const skewRef = useRef(0);
  const cardRefs = useRef({});

  const updateSkew = (serverTime) => {
    const t = Date.parse(serverTime);
    if (Number.isFinite(t)) skewRef.current = t - Date.now();
  };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Snapshot: full=true rebuilds everything (with trails), otherwise merges
  const loadLive = useCallback(
    async ({ full = false } = {}) => {
      if (!schoolId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `${BASE}/live-all?schoolId=${encodeURIComponent(schoolId)}${
            full ? "&trail=1" : ""
          }`,
          { headers: authHeaders() },
        );
        const d = await res.json();
        if (!d.success) return;
        if (d.serverTime) updateSkew(d.serverTime);

        const list = d.data || [];
        if (full) {
          const next = {};
          for (const v of list) {
            next[v.id] = applyLivePoints(
              {
                id: v.id,
                regNo: v.regNo,
                vehicleName: v.vehicleName,
                vehicleType: v.vehicleType,
                initialTrail: v.trail || [],
                point: null,
              },
              v.location ? [v.location] : [],
              { latestExtra: v.location, jump: true },
            );
          }
          setById(next);
          setOrder(list.map((v) => v.id));
          setFitKey(`${schoolId}-${Date.now()}`);
        } else {
          setById((prev) => {
            const next = { ...prev };
            for (const v of list) {
              const base = next[v.id] || {
                id: v.id,
                regNo: v.regNo,
                vehicleName: v.vehicleName,
                vehicleType: v.vehicleType,
                initialTrail: [],
                point: null,
              };
              next[v.id] = v.location
                ? applyLivePoints(base, [v.location], {
                    latestExtra: v.location,
                  })
                : base;
            }
            return next;
          });
          setOrder((prev) => [
            ...prev,
            ...list.map((v) => v.id).filter((id) => !prev.includes(id)),
          ]);
        }
      } catch {
        /* keep last data; fallback poll will retry */
      } finally {
        setLoading(false);
      }
    },
    [schoolId],
  );

  // Full load on school change
  useEffect(() => {
    setById({});
    setOrder([]);
    setSelected(null);
    loadLive({ full: true });
  }, [schoolId, loadLive]);

  // Live stream
  useEffect(() => {
    if (!schoolId || !visible) {
      setStream(visible ? "connecting" : "paused");
      return;
    }
    const close = openLiveStream({
      url: `${BASE}/live-stream?schoolId=${encodeURIComponent(schoolId)}`,
      onStatus: (s) => setStream(s === "unavailable" ? "polling" : s),
      onEvent: (event, payload) => {
        if (payload?.serverTime) updateSkew(payload.serverTime);
        if (event !== "location" || !payload?.vehicleId) return;
        setById((prev) => {
          const cur = prev[payload.vehicleId];
          if (!cur) return prev; // unknown/new vehicle – picked up by next snapshot
          return {
            ...prev,
            [payload.vehicleId]: applyLivePoints(
              cur,
              payload.path || [payload.latest],
              { latestExtra: payload.latest },
            ),
          };
        });
      },
    });
    return close;
  }, [schoolId, visible]);

  // Catch up on return to foreground
  useEffect(() => {
    if (visible) loadLive();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback polling while stream isn't live
  useEffect(() => {
    if (!schoolId || !visible || stream === "live") return;
    const id = setInterval(() => loadLive(), FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [schoolId, visible, stream, loadLive]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const ageOf = (v) =>
    v.point?.ts
      ? Math.max(0, (now + skewRef.current - tsOf(v.point)) / 1000)
      : null;

  const vehicles = order.map((id) => byId[id]).filter(Boolean);
  const staleIds = new Set(
    vehicles
      .filter((v) => {
        const a = ageOf(v);
        return a === null || a > STALE_SEC;
      })
      .map((v) => v.id),
  );
  const staleKey = [...staleIds].sort().join(",");

  const mapVehicles = useMemo(
    () =>
      vehicles.map((v) =>
        v.point
          ? { ...v, point: { ...v.point, isStale: staleIds.has(v.id) } }
          : v,
      ),
    [byId, order, staleKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const isMoving = (v) =>
    !staleIds.has(v.id) &&
    (v.point?.status === "MOVING" || (v.point?.speed || 0) > 3);
  const moving = vehicles.filter(isMoving);
  const parked = vehicles.filter(
    (v) => v.point && !staleIds.has(v.id) && !isMoving(v),
  );
  const noData = vehicles.filter((v) => !v.point || staleIds.has(v.id));

  const onSelect = (id) => {
    setSelected(id);
    cardRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  const pill = {
    live: { label: "Live", color: "#166534", bg: "#F0FDF4", icon: Radio },
    connecting: {
      label: "Connecting…",
      color: "#92400E",
      bg: "#FFFBEB",
      icon: Radio,
    },
    reconnecting: {
      label: "Reconnecting…",
      color: "#92400E",
      bg: "#FFFBEB",
      icon: WifiOff,
    },
    polling: {
      label: "Updating every 15s",
      color: "#4338CA",
      bg: "#EEF2FF",
      icon: Clock,
    },
    paused: { label: "Paused", color: "#6B7280", bg: "#F3F4F6", icon: Clock },
  }[stream] || { label: stream, color: "#6B7280", bg: "#F3F4F6", icon: Clock };
  const PillIcon = pill.icon;

  return (
    <div
      style={{
        fontFamily: "system-ui,-apple-system,sans-serif",
        color: "#111827",
      }}
    >
      <style>{`@keyframes lt-spin{to{transform:rotate(360deg)}} @keyframes lt-blink{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Total",
              value: vehicles.length,
              color: "#4338CA",
              bg: "#EEF2FF",
            },
            {
              label: "Moving",
              value: moving.length,
              color: "#166534",
              bg: "#F0FDF4",
            },
            {
              label: "Stopped",
              value: parked.length,
              color: "#92400E",
              bg: "#FFFBEB",
            },
            {
              label: "No signal",
              value: noData.length,
              color: "#6B7280",
              bg: "#F9FAFB",
            },
          ].map(({ label, value, color, bg }) => (
            <div
              key={label}
              style={{
                background: bg,
                color,
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {value} {label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 99,
              background: pill.bg,
              color: pill.color,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <PillIcon
              size={13}
              style={{
                animation:
                  stream === "live" ? "lt-blink 1.6s infinite" : "none",
              }}
            />{" "}
            {pill.label}
          </span>
          <button
            onClick={() => loadLive({ full: true })}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "#4F46E5",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: loading ? "lt-spin 1s linear infinite" : "none",
              }}
            />
            Reload map
          </button>
        </div>
      </div>

      {!loading && vehicles.length === 0 && (
        <div
          style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF" }}
        >
          <MapPin size={32} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, margin: 0 }}>
            No vehicles registered for this school.
          </p>
          <p style={{ fontSize: 12, margin: "4px 0 0" }}>
            Add one in the <b>Manage Vehicles</b> tab.
          </p>
        </div>
      )}

      {vehicles.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minWidth: 0,
              maxHeight: "clamp(320px, 50vw, 620px)",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                ageSec={ageOf(v)}
                stale={staleIds.has(v.id)}
                selected={selected === v.id}
                cardRef={(el) => {
                  cardRefs.current[v.id] = el;
                }}
              />
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            <VehicleMap
              vehicles={mapVehicles}
              fitKey={fitKey}
              onSelect={onSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
}
