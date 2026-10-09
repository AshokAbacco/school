// client/src/parent/pages/BusTracking.jsx  (REWRITTEN · history-tab loop fix · bus alerts panel · simple map tooltips)
// ═══════════════════════════════════════════════════════════════════════════════
// Parent — school bus tracking
//
// LIVE tab
//   • map: bus (smooth, real-time), route line along the roads (or a smooth
//     curve), every stop numbered and coloured (passed / next / upcoming), the
//     child's stop ringed in green with an always-visible label; tap or hover
//     any stop for scheduled / expected / actual times
//   • "Your stop": ETA countdown, expected arrival + departure, early / late,
//     stops away, distance; or the scheduled time when no trip is running
//   • "Trip progress": stop-by-stop timeline with arrival / departure times
//   • "Right now": status, speed, last update, address
//   • bus, route, driver and conductor (tap to call)
//
// HISTORY tab
//   • any day in the last 30 days, morning / evening / full day
//   • replay the trip on the map, see when the bus reached each stop
//
// Endpoints: /api/parent/vehicle-tracking[/stream|/eta|/history|/history/days]
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bus,
  Radio,
  WifiOff,
  Clock,
  Gauge,
  MapPin,
  Navigation,
  Phone,
  AlertTriangle,
  History,
  Activity,
  Route as RouteIcon,
  Info,
} from "lucide-react";
import LiveBusMap from "../../shared/liveTracking/LiveBusMap";
import StopEtaTimeline, {
  buildMapStops,
  stopNumbers,
} from "../../shared/liveTracking/StopEtaTimeline";
import TripHistoryPanel from "../../shared/liveTracking/TripHistoryPanel";
import { BusAlertsPanel } from "../components/BusAlerts";
import useRouteEta from "../../shared/liveTracking/useRouteEta";
import {
  API_URL,
  fetchJson,
  openLiveStream,
  applyLivePoints,
  tsOf,
  formatAge,
  formatClock,
  formatScheduled,
  formatEtaMin,
  punctualityStyle,
  distanceMeters,
} from "../../shared/liveTracking/liveTracking";

const BASE = `${API_URL}/api/parent/vehicle-tracking`;
const FALLBACK_POLL_MS = 15 * 1000;
const STALE_SEC = 180;

const q = (params) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

const card = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  padding: "14px 16px",
};
const cardTitle = {
  margin: "0 0 10px",
  fontSize: 14.5,
  fontWeight: 800,
  color: "#111827",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

function Pill({ color, bg, children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11.5,
        fontWeight: 700,
        color,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function CallButton({ phone }) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        background: "#16A34A",
        color: "#fff",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 13,
        textDecoration: "none",
      }}
    >
      <Phone size={13} /> Call
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BusTracking() {
  const [tab, setTab] = useState("live");
  const [studentId, setStudentId] = useState("");
  const [info, setInfo] = useState(null); // snapshot (route, stops, myStop, vehicle…)
  const [bus, setBus] = useState(null); // animated vehicle state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stream, setStream] = useState("connecting");
  const [visible, setVisible] = useState(
    () => document.visibilityState !== "hidden",
  );
  const [now, setNow] = useState(Date.now());
  const [fitKey, setFitKey] = useState("init");
  const skewRef = useRef(0);
  const geometryRef = useRef(null);

  const vehicleId = info?.vehicle?.id || null;
  const myStopId = info?.myStop?.id || null;

  // 1-second clock for live countdowns — only while the Live tab is open
  useEffect(() => {
    if (tab !== "live") return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tab]);
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const updateSkew = (serverTime) => {
    const t = Date.parse(serverTime);
    if (Number.isFinite(t)) skewRef.current = t - Date.now();
  };

  // ── Snapshot ──────────────────────────────────────────────────────────────
  const load = useCallback(
    async ({ full = false } = {}) => {
      try {
        const d = await fetchJson(`${BASE}${q({ studentId })}`);
        if (d.serverTime) updateSkew(d.serverTime);
        const data = d.data || {
          children: d.children || [],
          message: d.message,
        };
        if (data.routeGeometry) geometryRef.current = data.routeGeometry;
        setInfo((prev) => ({
          ...data,
          routeGeometry:
            data.routeGeometry ||
            (prev?.route?.id === data.route?.id ? geometryRef.current : null),
        }));
        setError("");

        if (data.vehicle?.id) {
          setBus((prev) => {
            const base =
              full || !prev || prev.id !== data.vehicle.id
                ? {
                    id: data.vehicle.id,
                    regNo: data.vehicle.regNo,
                    vehicleType: data.vehicle.vehicleType,
                    initialTrail: data.trail || [],
                    point: null,
                  }
                : prev;
            return data.location
              ? applyLivePoints(base, [data.location], {
                  latestExtra: data.location,
                  jump: full,
                })
              : base;
          });
          if (full) setFitKey(`${data.vehicle.id}-${Date.now()}`);
        } else setBus(null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [studentId],
  );

  useEffect(() => {
    setLoading(true);
    setBus(null);
    geometryRef.current = null;
    load({ full: true });
  }, [load]);

  // Stable URL builders for the History tab (a new function every render made
  // the history panel reload in a loop)
  const historyUrl = useCallback(
    (date, session) => `${BASE}/history${q({ studentId, date, session })}`,
    [studentId],
  );
  const historyDaysUrl = `${BASE}/history/days${q({ studentId })}`;

  // ── ETA (refreshes on every GPS event, debounced) ─────────────────────────
  const { etaByVehicle, bump: bumpEta } = useRouteEta({
    url: vehicleId ? `${BASE}/eta${q({ studentId })}` : null,
  });
  const eta = (vehicleId && etaByVehicle[vehicleId]) || info?.eta || null;

  // ── Live stream ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!vehicleId || !visible || tab !== "live") {
      setStream(visible ? "connecting" : "paused");
      return;
    }
    const close = openLiveStream({
      url: `${BASE}/stream${q({ studentId })}`,
      onStatus: (s) => setStream(s === "unavailable" ? "polling" : s),
      onEvent: (event, payload) => {
        if (payload?.serverTime) updateSkew(payload.serverTime);
        if (event !== "location" || payload?.vehicleId !== vehicleId) return;
        setBus((prev) =>
          prev
            ? applyLivePoints(prev, payload.path || [payload.latest], {
                latestExtra: payload.latest,
              })
            : prev,
        );
        bumpEta();
      },
    });
    return close;
  }, [vehicleId, studentId, visible, tab, bumpEta]);

  useEffect(() => {
    if (!vehicleId || !visible || stream === "live" || tab !== "live") return;
    const id = setInterval(() => load(), FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [vehicleId, visible, stream, tab, load]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const nowMs = now + skewRef.current;
  const point = bus?.point || null;
  const ageSec = point?.ts ? Math.max(0, (nowMs - tsOf(point)) / 1000) : null;
  const stale = !point || ageSec > STALE_SEC;
  const moving =
    !stale && (point?.status === "MOVING" || (point?.speed || 0) > 3);

  const mapVehicles = useMemo(
    () =>
      bus?.point ? [{ ...bus, point: { ...bus.point, isStale: stale } }] : [],
    [bus, stale],
  );

  const etaStops = eta?.stops?.length ? eta.stops : null;
  const mapStops = useMemo(() => {
    if (etaStops)
      return buildMapStops(etaStops, { myStopId, session: eta?.session });
    // no ETA yet → plain route stops in order with scheduled times
    let n = 0;
    return (info?.stops || [])
      .map((s) => ({ s, number: s.isSchool ? null : ++n }))
      .filter(({ s }) => s.latitude != null && s.longitude != null)
      .map(({ s, number }) => {
        const mine = s.stopId === myStopId;
        return {
          id: s.routeStopId,
          number,
          isSchool: !!s.isSchool,
          name: s.name,
          landmark: s.landmark,
          latitude: s.latitude,
          longitude: s.longitude,
          state: "UPCOMING",
          isMine: mine,
          flag: mine ? "Your stop" : s.isSchool ? "School" : null,
          lines: [{ text: "The bus has not started yet", color: "#6B7280" }],
        };
      });
  }, [etaStops, info, myStopId, eta?.session]);

  const myEtaStop = etaStops?.find((s) => s.stopId === myStopId) || null;
  const myIndex = etaStops
    ? etaStops.findIndex((s) => s.stopId === myStopId)
    : -1;
  const myNumber = myEtaStop
    ? stopNumbers(etaStops).get(myEtaStop.routeStopId)
    : null;
  const nextIndex = etaStops
    ? etaStops.findIndex((s) => s.state === "NEXT" || s.state === "AT_STOP")
    : -1;
  const stopsAway =
    myIndex >= 0 && nextIndex >= 0 && myIndex >= nextIndex
      ? myIndex - nextIndex
      : null;

  const myStopLatLng =
    info?.myStop?.latitude != null
      ? {
          lat: Number(info.myStop.latitude),
          lng: Number(info.myStop.longitude),
        }
      : null;
  const busDistKm =
    point && myStopLatLng
      ? Math.round(
          (distanceMeters(
            { lat: point.latitude, lng: point.longitude },
            myStopLatLng,
          ) /
            1000) *
            10,
        ) / 10
      : null;

  const children = info?.children || [];
  const sessionLabel =
    eta?.session === "DROP" ? "Evening drop" : "Morning pickup";
  const myScheduled =
    eta?.session === "DROP" ? info?.myStop?.dropTime : info?.myStop?.pickupTime;

  const streamPill = !vehicleId
    ? null
    : stream === "live"
    ? { color: "#166534", bg: "#F0FDF4", icon: Radio, label: "Live" }
    : stream === "polling"
    ? { color: "#4338CA", bg: "#EEF2FF", icon: Clock, label: "Every 15s" }
    : stream === "paused"
    ? { color: "#6B7280", bg: "#F3F4F6", icon: Clock, label: "Paused" }
    : { color: "#92400E", bg: "#FFFBEB", icon: WifiOff, label: "Connecting…" };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: "system-ui,-apple-system,sans-serif",
        color: "#111827",
        padding: "4px 0",
      }}
    >
      <style>{`@keyframes bt-blink{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Bus size={20} color="#4F46E5" /> Bus tracking
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6B7280" }}>
            {info?.student?.name
              ? `${info.student.name}'s school bus`
              : "Your child's school bus"}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {children.length > 1 && (
            <select
              value={studentId || info?.student?.id || ""}
              onChange={(e) => setStudentId(e.target.value)}
              style={{
                padding: "7px 10px",
                border: "1.5px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 13,
                background: "#fff",
              }}
              aria-label="Select child"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {streamPill && tab === "live" && (
            <Pill color={streamPill.color} bg={streamPill.bg}>
              <streamPill.icon
                size={12}
                style={{
                  animation:
                    stream === "live" ? "bt-blink 1.6s infinite" : "none",
                }}
              />{" "}
              {streamPill.label}
            </Pill>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #E5E7EB",
          marginBottom: 16,
        }}
      >
        {[
          { key: "live", label: "Live tracking", icon: Activity },
          { key: "history", label: "Trip history", icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              border: "none",
              background: "transparent",
              borderBottom:
                tab === key ? "2.5px solid #4F46E5" : "2.5px solid transparent",
              color: tab === key ? "#4338CA" : "#6B7280",
              fontWeight: tab === key ? 800 : 600,
              fontSize: 14,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            borderRadius: 10,
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          <span style={{ display: "flex", gap: 8 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
            {error}
          </span>
          <button
            onClick={() => load({ full: true })}
            style={{
              padding: "5px 12px",
              background: "#fff",
              color: "#991B1B",
              border: "1px solid #FECACA",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div
          style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF" }}
        >
          Loading bus details…
        </div>
      )}

      {!loading && !info?.route && !error && (
        <div
          style={{
            ...card,
            display: "flex",
            gap: 10,
            color: "#6B7280",
            fontSize: 14,
          }}
        >
          <Info size={18} style={{ flexShrink: 0 }} />{" "}
          {info?.message || "No school bus assigned yet."}
        </div>
      )}

      {/* ════════════════════════ LIVE ════════════════════════ */}
      {!loading && info?.route && tab === "live" && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* Map column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minWidth: 0,
              flex: "2 1 520px",
            }}
          >
            <LiveBusMap
              vehicles={mapVehicles}
              stops={mapStops}
              routeGeometry={info.routeGeometry}
              myStop={info.myStop}
              showMyStopPin={false}
              followId={bus?.id || null}
              fitKey={fitKey}
              legend
              height="clamp(340px, 58vh, 640px)"
            />
            {info.message && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "10px 14px",
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  color: "#92400E",
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
                {info.message}
              </div>
            )}
            {point && stale && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "10px 14px",
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  color: "#92400E",
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                <AlertTriangle
                  size={15}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                Last GPS signal was {formatAge(ageSec)}. The bus may be parked
                or in a low-network area — the map updates as soon as it
                reconnects.
              </div>
            )}
            <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>
              Tap a numbered stop to see when the bus will arrive there.
            </div>
          </div>

          {/* Side column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              minWidth: 0,
              flex: "1 1 300px",
            }}
          >
            {/* Bus alerts: started / arriving in 10-5-2 min / arrived — with voice */}
            <BusAlertsPanel studentId={info.student?.id || studentId || null} />

            {/* Your stop */}
            {info.myStop && (
              <div style={{ ...card, borderColor: "#BBF7D0" }}>
                <div style={cardTitle}>
                  <span>Your stop</span>
                  {eta?.session && (
                    <span
                      style={{
                        fontSize: 11.5,
                        color: "#6B7280",
                        fontWeight: 600,
                      }}
                    >
                      {sessionLabel}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 800,
                    color: "#166534",
                    fontSize: 15,
                  }}
                >
                  <MapPin size={15} />
                  {myNumber ? `${myNumber}. ` : ""}
                  {info.myStop.name}
                </div>
                {(info.myStop.landmark || info.myStop.area) && (
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                    {info.myStop.landmark || info.myStop.area}
                  </div>
                )}

                <MyStopStatus
                  eta={eta}
                  myEtaStop={myEtaStop}
                  nowMs={nowMs}
                  scheduled={myScheduled}
                  stopsAway={stopsAway}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <div
                    style={{
                      background: "#F9FAFB",
                      borderRadius: 10,
                      padding: "8px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: 600,
                      }}
                    >
                      Pickup time
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      {info.myStop.pickupTime
                        ? formatScheduled(info.myStop.pickupTime)
                        : "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#F9FAFB",
                      borderRadius: 10,
                      padding: "8px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: 600,
                      }}
                    >
                      Drop time
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      {info.myStop.dropTime
                        ? formatScheduled(info.myStop.dropTime)
                        : "—"}
                    </div>
                  </div>
                </div>
                {busDistKm != null && (
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>
                    Bus is <b style={{ color: "#111827" }}>{busDistKm} km</b>{" "}
                    away (straight line)
                    {stopsAway != null && stopsAway > 0
                      ? ` · ${stopsAway} stop${
                          stopsAway > 1 ? "s" : ""
                        } before yours`
                      : ""}
                  </div>
                )}
              </div>
            )}

            {/* Right now */}
            <div style={card}>
              <div style={cardTitle}>
                <span>Right now</span>
                {point ? (
                  stale ? (
                    <Pill color="#6B7280" bg="#F3F4F6">
                      ● No recent signal
                    </Pill>
                  ) : moving ? (
                    <Pill color="#166534" bg="#F0FDF4">
                      ● Moving
                    </Pill>
                  ) : (
                    <Pill color="#92400E" bg="#FFFBEB">
                      ● Stopped
                    </Pill>
                  )
                ) : (
                  <Pill color="#6B7280" bg="#F3F4F6">
                    Waiting for GPS
                  </Pill>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    background: "#F9FAFB",
                    borderRadius: 10,
                    padding: "8px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Gauge size={12} /> Speed
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                    {point && !stale ? `${Math.round(point.speed ?? 0)}` : "—"}
                    <span style={{ fontSize: 11, fontWeight: 500 }}> km/h</span>
                  </div>
                </div>
                <div
                  style={{
                    background: "#F9FAFB",
                    borderRadius: 10,
                    padding: "8px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={12} /> Last update
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: stale ? "#B45309" : "#111827",
                    }}
                  >
                    {point ? formatAge(ageSec) : "—"}
                  </div>
                  {point?.ts && (
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {formatClock(point.ts)}
                    </div>
                  )}
                </div>
              </div>
              {point?.address && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    background: "#F0FDF4",
                    padding: "8px 12px",
                    borderRadius: 10,
                    marginTop: 8,
                    fontSize: 12.5,
                    color: "#166534",
                  }}
                >
                  <MapPin size={14} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
                  {point.address}
                </div>
              )}
              {point && (
                <a
                  href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "#EEF2FF",
                    color: "#4338CA",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  <Navigation size={13} /> Open in Google Maps
                </a>
              )}
            </div>

            {/* Bus & crew */}
            <div style={card}>
              <div style={cardTitle}>
                <span>{info.vehicle?.vehicleName || "School bus"}</span>
                {info.vehicle?.regNo && (
                  <Pill color="#4338CA" bg="#EEF2FF">
                    {info.vehicle.regNo}
                  </Pill>
                )}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "#6B7280",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RouteIcon size={13} /> {info.route.name}
                {info.route.code ? ` (${info.route.code})` : ""}
              </div>
              {[
                {
                  role: "Driver",
                  name: info.route.driverName,
                  phone: info.route.driverPhone,
                },
                {
                  role: "Conductor",
                  name: info.route.conductorName,
                  phone: info.route.conductorPhone,
                },
              ]
                .filter((p) => p.name || p.phone)
                .map((p) => (
                  <div
                    key={p.role}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      background: "#F9FAFB",
                      borderRadius: 10,
                      padding: "8px 12px",
                      marginTop: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          fontWeight: 600,
                        }}
                      >
                        {p.role}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                        {p.name || "—"}
                      </div>
                    </div>
                    <CallButton phone={p.phone} />
                  </div>
                ))}
            </div>
          </div>

          {/* Trip progress — full width */}
          {eta && (
            <div style={{ ...card, flex: "1 1 100%", minWidth: 0 }}>
              <div style={cardTitle}>
                <span>Trip progress — all stops</span>
              </div>
              <StopEtaTimeline
                eta={eta}
                nowMs={nowMs}
                highlightStopId={myStopId}
                compact={(eta.stops?.length || 0) > 8}
              />
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ HISTORY ════════════════════════ */}
      {!loading && info?.route && tab === "history" && (
        <div style={card}>
          {info.vehicle?.id ? (
            <TripHistoryPanel
              historyUrl={historyUrl}
              daysUrl={historyDaysUrl}
              highlightStopId={myStopId}
            />
          ) : (
            <div style={{ color: "#6B7280", fontSize: 14 }}>
              {info.message ||
                "Trip history is available once the bus is registered for tracking."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function MyStopStatus({ eta, myEtaStop, nowMs, scheduled, stopsAway }) {
  const box = (bg, border, children) => (
    <div
      style={{
        marginTop: 10,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      {children}
    </div>
  );

  if (!eta || eta.reason === "NO_ROUTE" || !myEtaStop) {
    return scheduled
      ? box(
          "#F9FAFB",
          "#E5E7EB",
          <div style={{ fontSize: 13 }}>
            Scheduled at <b>{formatScheduled(scheduled)}</b>
          </div>,
        )
      : null;
  }

  const p = punctualityStyle(myEtaStop.punctuality, myEtaStop.delayMin);
  const pill = p ? (
    <Pill color={p.color} bg={p.bg}>
      {p.label}
    </Pill>
  ) : null;

  if (myEtaStop.state === "AT_STOP")
    return box(
      "#FFFBEB",
      "#FDE68A",
      <>
        <div style={{ fontWeight: 800, color: "#92400E", fontSize: 15 }}>
          🚌 The bus is at your stop now
        </div>
        <div style={{ fontSize: 12.5, color: "#92400E", marginTop: 3 }}>
          Arrived {formatClock(myEtaStop.actualArrival)} · leaving ~
          {formatClock(myEtaStop.expectedDeparture)}
        </div>
        {pill && <div style={{ marginTop: 6 }}>{pill}</div>}
      </>,
    );

  if (myEtaStop.state === "PASSED")
    return box(
      "#F0FDF4",
      "#BBF7D0",
      <>
        <div style={{ fontWeight: 800, color: "#166534", fontSize: 14 }}>
          Bus has passed your stop
        </div>
        <div style={{ fontSize: 12.5, color: "#166534", marginTop: 3 }}>
          Reached {formatClock(myEtaStop.actualArrival)}
          {myEtaStop.actualDeparture &&
          myEtaStop.actualDeparture !== myEtaStop.actualArrival
            ? ` · left ${formatClock(myEtaStop.actualDeparture)}`
            : ""}
        </div>
        {pill && <div style={{ marginTop: 6 }}>{pill}</div>}
      </>,
    );

  if (myEtaStop.state === "SKIPPED")
    return box(
      "#F3F4F6",
      "#E5E7EB",
      <div style={{ fontSize: 13, color: "#374151" }}>
        The bus went past without stopping at your stop today.
      </div>,
    );

  if (eta.tripState === "IN_PROGRESS" && myEtaStop.expectedArrival) {
    const mins = Math.max(
      0,
      (Date.parse(myEtaStop.expectedArrival) - nowMs) / 60000,
    );
    return box(
      "#EEF2FF",
      "#C7D2FE",
      <>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6366F1",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Arriving in
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#3730A3",
                lineHeight: 1.1,
              }}
            >
              {formatEtaMin(mins)}
            </div>
          </div>
          {pill}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "#4338CA",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Expected arrival <b>{formatClock(myEtaStop.expectedArrival)}</b>
          {myEtaStop.expectedDeparture ? (
            <>
              {" "}
              · departs ~<b>{formatClock(myEtaStop.expectedDeparture)}</b>
            </>
          ) : null}
          {myEtaStop.scheduledTime ? (
            <> · scheduled {formatScheduled(myEtaStop.scheduledTime)}</>
          ) : null}
        </div>
        {stopsAway != null && (
          <div style={{ fontSize: 12, color: "#6366F1", marginTop: 3 }}>
            {stopsAway === 0
              ? "Your stop is next"
              : `${stopsAway} stop${stopsAway > 1 ? "s" : ""} before yours`}
          </div>
        )}
        {!eta.live && (
          <div style={{ fontSize: 11.5, color: "#B45309", marginTop: 4 }}>
            Estimate paused — waiting for a fresh GPS signal.
          </div>
        )}
      </>,
    );
  }

  if (eta.tripState === "COMPLETED")
    return box(
      "#EEF2FF",
      "#C7D2FE",
      <div style={{ fontSize: 13, color: "#4338CA" }}>
        Today's trip is complete.
      </div>,
    );

  return box(
    "#F9FAFB",
    "#E5E7EB",
    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.55 }}>
      {eta.tripState === "NO_SIGNAL"
        ? "Waiting for the bus GPS signal."
        : "Trip not started yet."}
      {myEtaStop.expectedArrival ? (
        <>
          {" "}
          Planned arrival <b>{formatClock(myEtaStop.expectedArrival)}</b>
          {myEtaStop.expectedDeparture ? (
            <>
              {" "}
              · departure <b>{formatClock(myEtaStop.expectedDeparture)}</b>
            </>
          ) : null}
          .
        </>
      ) : myEtaStop.scheduledTime ? (
        <>
          {" "}
          Scheduled at <b>{formatScheduled(myEtaStop.scheduledTime)}</b>.
        </>
      ) : null}
      {myEtaStop.avgTravelMinFromStart ? (
        <>
          {" "}
          Usually ~{formatEtaMin(myEtaStop.avgTravelMinFromStart)} after the
          trip starts.
        </>
      ) : null}
    </div>,
  );
}
