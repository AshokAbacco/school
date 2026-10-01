// client/src/parent/pages/VehicleTracking/VehicleTracking.jsx  (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════
// Parent — live bus tracking
//   • Embedded live map (bus, your stop, route stops, recent path)
//   • Real-time push over SSE — new GPS points appear within ~1–2 s of reaching
//     the server (was: 30 s polling on top of the GPS delay)
//   • Smooth movement between GPS points (no more jumping marker)
//   • Auto-reconnect; falls back to 10 s polling if the stream is unavailable
//   • Pauses when the tab/app is in the background (saves battery & data)
//   • Multiple children supported
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
  Phone,
  Navigation,
  Bus,
  Clock,
  Gauge,
  AlertTriangle,
  WifiOff,
  Radio,
} from "lucide-react";
import LiveBusMap from "../../../shared/liveTracking/LiveBusMap";
import {
  API_URL,
  authHeaders,
  openLiveStream,
  applyLivePoints,
  tsOf,
  distanceMeters,
  roughEtaMinutes,
  formatAge,
} from "../../../shared/liveTracking/liveTracking";

const BASE = `${API_URL}/api/parent/vehicle-tracking`;
const FALLBACK_POLL_MS = 10 * 1000; // when live stream is not connected
const IDLE_POLL_MS = 60 * 1000; // when there is no bus to stream yet
const STALE_SEC = 180;

// ── Small UI pieces ──────────────────────────────────────────────────────────
function StatusBadge({ status, stale }) {
  const key = stale ? "STALE" : (status || "").toUpperCase();
  const cfg = {
    MOVING: {
      bg: "#F0FDF4",
      color: "#166534",
      dot: "#22C55E",
      label: "Moving",
    },
    IDLE: { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B", label: "Stopped" },
    PARKED: {
      bg: "#EEF2FF",
      color: "#4338CA",
      dot: "#6366F1",
      label: "Parked",
    },
    OFF: {
      bg: "#F9FAFB",
      color: "#6B7280",
      dot: "#9CA3AF",
      label: "Engine off",
    },
    STALE: {
      bg: "#F9FAFB",
      color: "#6B7280",
      dot: "#9CA3AF",
      label: "No recent signal",
    },
  }[key] || {
    bg: "#F9FAFB",
    color: "#6B7280",
    dot: "#D1D5DB",
    label: status || "Unknown",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: cfg.bg,
        color: cfg.color,
        padding: "5px 12px",
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
          animation: key === "MOVING" ? "vt-blink 1.2s infinite" : "none",
        }}
      />
      {cfg.label}
    </span>
  );
}

function ConnectionPill({ mode }) {
  const cfg = {
    live: { color: "#166534", bg: "#F0FDF4", label: "Live", icon: Radio },
    connecting: {
      color: "#92400E",
      bg: "#FFFBEB",
      label: "Connecting…",
      icon: Radio,
    },
    reconnecting: {
      color: "#92400E",
      bg: "#FFFBEB",
      label: "Reconnecting…",
      icon: WifiOff,
    },
    polling: {
      color: "#4338CA",
      bg: "#EEF2FF",
      label: "Updating every 10s",
      icon: Clock,
    },
    paused: { color: "#6B7280", bg: "#F3F4F6", label: "Paused", icon: Clock },
    idle: {
      color: "#6B7280",
      bg: "#F3F4F6",
      label: "Waiting for bus",
      icon: Clock,
    },
  }[mode] || { color: "#6B7280", bg: "#F3F4F6", label: "—", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: 99,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <Icon
        size={13}
        style={{
          animation: mode === "live" ? "vt-blink 1.6s infinite" : "none",
        }}
      />
      {cfg.label}
    </span>
  );
}

function Stat({ icon: Icon, label, value, sub, color = "#111827" }) {
  return (
    <div
      style={{
        background: "#F9FAFB",
        borderRadius: 12,
        padding: "10px 12px",
        minWidth: 0,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "#6B7280",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Icon size={12} /> {label}
      </p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 18,
          fontWeight: 800,
          color,
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function VehicleTracking() {
  const [children, setChildren] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [info, setInfo] = useState(null); // route / stop / vehicle meta
  const [vehicle, setVehicle] = useState(null); // map state (point + motion)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stream, setStream] = useState("connecting");
  const [visible, setVisible] = useState(
    () => document.visibilityState !== "hidden",
  );
  const [now, setNow] = useState(Date.now());
  const skewRef = useRef(0); // serverTime - clientTime

  const updateSkew = (serverTime) => {
    const t = Date.parse(serverTime);
    if (Number.isFinite(t)) skewRef.current = t - Date.now();
  };

  // 1s clock for "x s ago"
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pause in background
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Children list (for parents with more than one child)
  useEffect(() => {
    fetch(`${BASE}/children`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setChildren(d.data || []);
        const first = (d.data || []).find((c) => c.hasTransport) || d.data?.[0];
        setStudentId((cur) => cur || first?.studentId || "");
      })
      .catch(() => setStudentId((cur) => cur ?? ""));
  }, []);

  // Snapshot loader (full = with trail; used on first load / child switch)
  const loadSnapshot = useCallback(
    async ({ full = false } = {}) => {
      if (studentId === null) return;
      const qs = new URLSearchParams();
      if (studentId) qs.set("studentId", studentId);
      if (!full) qs.set("trail", "0");

      try {
        if (full) setLoading(true);
        const res = await fetch(`${BASE}?${qs}`, { headers: authHeaders() });
        const d = await res.json();
        if (!d.success)
          throw new Error(d.message || "Could not load bus location");

        setError("");
        const data = d.data;
        if (data?.serverTime) updateSkew(data.serverTime);

        if (full) {
          setInfo(
            data
              ? { ...data, trail: undefined, location: undefined }
              : { empty: true, message: d.message },
          );
          setVehicle(
            data?.vehicle?.id
              ? applyLivePoints(
                  {
                    ...data.vehicle,
                    initialTrail: data.trail || [],
                    point: null,
                  },
                  data.location ? [data.location] : [],
                  { latestExtra: data.location, jump: true },
                )
              : null,
          );
        } else if (data?.location) {
          setVehicle(
            (prev) =>
              prev &&
              applyLivePoints(prev, [data.location], {
                latestExtra: data.location,
              }),
          );
        }
      } catch (e) {
        setError(
          e.message === "Failed to fetch"
            ? "No internet connection. Retrying…"
            : e.message,
        );
      } finally {
        if (full) setLoading(false);
      }
    },
    [studentId],
  );

  // Full load on child change
  useEffect(() => {
    if (studentId === null) return;
    setInfo(null);
    setVehicle(null);
    loadSnapshot({ full: true });
  }, [studentId, loadSnapshot]);

  const vehicleId = vehicle?.id || null;

  // Live stream
  useEffect(() => {
    if (!vehicleId || !visible) {
      setStream(visible ? "idle" : "paused");
      return;
    }
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    const close = openLiveStream({
      url: `${BASE}/stream${qs}`,
      onStatus: (s) => setStream(s === "unavailable" ? "polling" : s),
      onEvent: (event, payload) => {
        if (payload?.serverTime) updateSkew(payload.serverTime);
        if (event === "hello" && payload?.location) {
          setVehicle(
            (prev) =>
              prev &&
              applyLivePoints(prev, [payload.location], {
                latestExtra: payload.location,
              }),
          );
        }
        if (event === "location") {
          setVehicle(
            (prev) =>
              prev &&
              applyLivePoints(prev, payload.path || [payload.latest], {
                latestExtra: payload.latest,
              }),
          );
        }
      },
    });
    return close;
  }, [vehicleId, studentId, visible]);

  // Catch up immediately when the app comes back to the foreground
  useEffect(() => {
    if (visible && vehicleId) loadSnapshot();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback polling when stream isn't live, slow polling when no bus yet
  useEffect(() => {
    if (!visible || studentId === null) return;
    if (vehicleId && stream === "live") return;
    const ms = vehicleId ? FALLBACK_POLL_MS : IDLE_POLL_MS;
    const id = setInterval(() => loadSnapshot({ full: !vehicleId }), ms);
    return () => clearInterval(id);
  }, [stream, vehicleId, visible, studentId, loadSnapshot]);

  // ── Derived values ────────────────────────────────────────────────────────
  const point = vehicle?.point || null;
  const ageSec = point?.ts
    ? Math.max(0, (now + skewRef.current - tsOf(point)) / 1000)
    : null;
  const isStale = ageSec === null || ageSec > STALE_SEC;
  const speed = point?.speed != null ? Math.round(point.speed) : null;

  const stop = info?.stop;
  const distanceToStop = useMemo(() => {
    if (!point || stop?.latitude == null || stop?.longitude == null)
      return null;
    return distanceMeters(
      { lat: point.latitude, lng: point.longitude },
      { lat: Number(stop.latitude), lng: Number(stop.longitude) },
    );
  }, [point, stop]);
  const eta =
    !isStale && distanceToStop != null && distanceToStop > 150
      ? roughEtaMinutes(distanceToStop, point?.speed)
      : null;

  const mapVehicles = useMemo(
    () =>
      vehicle
        ? [{ ...vehicle, point: point ? { ...point, isStale } : null }]
        : [],
    [vehicle, point, isStale],
  );

  const connectionMode = !vehicleId ? "idle" : !visible ? "paused" : stream;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: 16,
        maxWidth: 960,
        margin: "0 auto",
        fontFamily: "system-ui,-apple-system,sans-serif",
        color: "#111827",
      }}
    >
      <style>{`
        @keyframes vt-blink { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
        .vt-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; align-items: start; }
        @media (max-width: 820px) { .vt-grid { grid-template-columns: 1fr; } }
        .vt-chip:focus-visible, .vt-btn:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 21,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Bus size={22} color="#4F46E5" /> Bus tracking
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6B7280" }}>
            {info?.studentName
              ? `${info.studentName}'s school bus`
              : "Your child's school bus"}
          </p>
        </div>
        <ConnectionPill mode={connectionMode} />
      </div>

      {/* Child switcher */}
      {children.length > 1 && (
        <div
          role="tablist"
          aria-label="Choose child"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {children.map((c) => {
            const active = c.studentId === studentId;
            return (
              <button
                key={c.studentId}
                role="tab"
                aria-selected={active}
                className="vt-chip"
                onClick={() => setStudentId(c.studentId)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: active
                    ? "1.5px solid #4F46E5"
                    : "1.5px solid #E5E7EB",
                  background: active ? "#EEF2FF" : "#fff",
                  color: active ? "#4338CA" : "#374151",
                }}
              >
                {c.name}
                {!c.hasTransport && (
                  <span style={{ color: "#9CA3AF", fontWeight: 400 }}>
                    {" "}
                    (no bus)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 12,
            marginBottom: 14,
            fontSize: 13,
            color: "#B91C1C",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !info && (
        <div className="vt-grid">
          <div
            style={{
              height: 420,
              borderRadius: 14,
              background: "#F3F4F6",
              animation: "vt-blink 1.5s infinite",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 140,
                  borderRadius: 14,
                  background: "#F3F4F6",
                  animation: "vt-blink 1.5s infinite",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* No transport */}
      {!loading && info?.empty && (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: 16,
          }}
        >
          <Bus size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700, color: "#374151" }}>
            No bus assigned
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
            {info.message ||
              "Your child is not assigned to a school bus. Contact the school office to add transport."}
          </p>
        </div>
      )}

      {info && !info.empty && (
        <div className="vt-grid">
          {/* ── Map column ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minWidth: 0,
            }}
          >
            <LiveBusMap
              vehicles={mapVehicles}
              stops={info.routeStops || []}
              myStop={stop}
              followId={vehicleId}
              fitKey={`${studentId}-${vehicleId || "none"}`}
            />

            {!point && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "12px 14px",
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  fontSize: 13,
                  color: "#4B5563",
                }}
              >
                <MapPin size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  {info.message ||
                    "The bus hasn't sent its location yet. It will appear on the map as soon as it starts."}
                </span>
              </div>
            )}

            {point && isStale && (
              <div
                role="status"
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "12px 14px",
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: 12,
                  fontSize: 13,
                  color: "#92400E",
                }}
              >
                <AlertTriangle
                  size={16}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span>
                  Last GPS signal was {formatAge(ageSec)}. The bus may be parked
                  or in a low-network area — the map will update as soon as it
                  reconnects.
                </span>
              </div>
            )}
          </div>

          {/* ── Details column ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minWidth: 0,
            }}
          >
            {/* Live status */}
            <section
              style={{
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  Right now
                </h2>
                {point && <StatusBadge status={point.status} stale={isStale} />}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Stat
                  icon={Gauge}
                  label="Speed"
                  value={speed != null && !isStale ? `${speed} km/h` : "—"}
                  color={speed > 0 && !isStale ? "#166534" : "#111827"}
                />
                <Stat
                  icon={Clock}
                  label="Last update"
                  value={point ? formatAge(ageSec) : "—"}
                  color={isStale ? "#B45309" : "#111827"}
                />
              </div>

              {point?.address && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginTop: 10,
                    padding: "10px 12px",
                    background: "#F0FDF4",
                    borderRadius: 10,
                  }}
                >
                  <MapPin
                    size={14}
                    color="#16A34A"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <span
                    style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}
                  >
                    {point.address}
                  </span>
                </div>
              )}

              {point && (
                <a
                  className="vt-btn"
                  href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: 10,
                    background: "#EEF2FF",
                    color: "#4338CA",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <Navigation size={15} /> Open in Google Maps
                </a>
              )}
            </section>

            {/* Your stop */}
            {stop && (
              <section
                style={{
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <h2
                  style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}
                >
                  Your stop
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MapPin size={15} /> {stop.name}
                </p>
                {(stop.area || stop.landmark) && (
                  <p
                    style={{
                      margin: "3px 0 0 21px",
                      fontSize: 12,
                      color: "#6B7280",
                    }}
                  >
                    {[stop.landmark, stop.area].filter(Boolean).join(", ")}
                  </p>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {(stop.pickupTime || stop.dropTime) && (
                    <Stat
                      icon={Clock}
                      label="Scheduled"
                      value={
                        info.pickupType === "DROP"
                          ? stop.dropTime || "—"
                          : stop.pickupTime || "—"
                      }
                      sub={
                        info.pickupType === "BOTH" && stop.dropTime
                          ? `Drop ${stop.dropTime}`
                          : info.pickupType === "DROP"
                          ? "Drop"
                          : "Pickup"
                      }
                    />
                  )}
                  {distanceToStop != null && (
                    <Stat
                      icon={Navigation}
                      label="Bus distance"
                      value={
                        distanceToStop < 1000
                          ? `${Math.round(distanceToStop)} m`
                          : `${(distanceToStop / 1000).toFixed(1)} km`
                      }
                      sub={
                        distanceToStop <= 150
                          ? "Bus is at your stop"
                          : eta
                          ? `About ${eta} min (approx.)`
                          : "Straight-line distance"
                      }
                    />
                  )}
                </div>
                {stop.latitude == null && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 12,
                      color: "#9CA3AF",
                    }}
                  >
                    This stop has no map location yet, so distance can't be
                    shown.
                  </p>
                )}
              </section>
            )}

            {/* Route & crew */}
            <section
              style={{
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                {info.route?.name}
              </h2>
              <p
                style={{ margin: "2px 0 10px", fontSize: 12, color: "#6B7280" }}
              >
                Route {info.route?.code}
                {info.vehicle?.regNo && (
                  <>
                    {" "}
                    &nbsp;|&nbsp;{" "}
                    <strong style={{ color: "#4338CA", letterSpacing: 0.5 }}>
                      {info.vehicle.regNo}
                    </strong>
                  </>
                )}
                {info.vehicle?.vehicleName && (
                  <> ({info.vehicle.vehicleName})</>
                )}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {info.route?.driverName && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "9px 12px",
                      background: "#F9FAFB",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: "#6B7280",
                          fontWeight: 600,
                        }}
                      >
                        Driver
                      </p>
                      <p
                        style={{
                          margin: "1px 0 0",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {info.route.driverName}
                      </p>
                    </div>
                    {info.route.driverPhone && (
                      <a
                        className="vt-btn"
                        href={`tel:${info.route.driverPhone}`}
                        aria-label={`Call driver ${info.route.driverName}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 12px",
                          background: "#059669",
                          color: "#fff",
                          borderRadius: 9,
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        <Phone size={14} /> Call
                      </a>
                    )}
                  </div>
                )}
                {info.route?.conductorName && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "9px 12px",
                      background: "#F9FAFB",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: "#6B7280",
                          fontWeight: 600,
                        }}
                      >
                        Conductor
                      </p>
                      <p
                        style={{
                          margin: "1px 0 0",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {info.route.conductorName}
                      </p>
                    </div>
                    {info.route.conductorPhone && (
                      <a
                        className="vt-btn"
                        href={`tel:${info.route.conductorPhone}`}
                        aria-label={`Call conductor ${info.route.conductorName}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 12px",
                          background: "#7C3AED",
                          color: "#fff",
                          borderRadius: 9,
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        <Phone size={14} /> Call
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
