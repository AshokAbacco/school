// client/src/superAdmin/pages/VehicleTracking/LiveTrackingTab.jsx  (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════
// Live dashboard — shared by the Super Admin page AND the Bus Head portal
//   • Real-time push for all buses (SSE), 15 s polling fallback
//   • Smooth animated markers + recent paths
//   • NEW: stop-by-stop ETA per bus — next stop + countdown, expected
//          arrival/departure for every stop, early / on-time / late, average
//          travel time between stops (from the stops added under Transport)
//   • NEW: click a bus (card or map) to draw its route stops with ETA on the map
//   • NEW: errors are shown with a Retry button instead of an empty page
//   • FIX: route line follows the roads (server road geometry); the fallback
//          curve no longer shoots off the map when two stops share a spot
//
// Props
//   schoolId         school to show ("" = all schools in scope, Bus Head only)
//   api              endpoint builders (defaults to the admin /api/vehicles API)
//   showSchoolName   print the school on each card (multi-school views)
//   emptyHint        text under "No vehicles" (admin: "Add one in Manage Vehicles")
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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Route,
} from "lucide-react";
import VehicleMap from "./VehicleMap";
import StopEtaTimeline, {
  buildMapStops,
} from "../../../shared/liveTracking/StopEtaTimeline";
import useRouteEta from "../../../shared/liveTracking/useRouteEta";
import {
  API_URL,
  fetchJson,
  openLiveStream,
  applyLivePoints,
  tsOf,
  formatAge,
  formatClock,
  formatEtaMin,
  punctualityStyle,
} from "../../../shared/liveTracking/liveTracking";

const BASE = `${API_URL}/api/vehicles`;
const FALLBACK_POLL_MS = 15 * 1000;
const STALE_SEC = 180;

const qs = (params) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

/** Admin endpoints — a school must be selected. */
export const ADMIN_TRACKING_API = {
  liveAll: (schoolId, full) =>
    schoolId
      ? `${BASE}/live-all${qs({ schoolId, trail: full ? "1" : "" })}`
      : null,
  stream: (schoolId) =>
    schoolId ? `${BASE}/live-stream${qs({ schoolId })}` : null,
  eta: (schoolId) => (schoolId ? `${BASE}/eta${qs({ schoolId })}` : null),
  routeGeometry: (vehicleId) =>
    `${BASE}/${encodeURIComponent(vehicleId)}/route-geometry`,
};

// ─────────────────────────────────────────────────────────────────────────────
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

/** One-line next-stop summary shown on every card. */
function NextStopLine({ eta, nowMs }) {
  if (!eta) return null;
  if (eta.reason === "NO_ROUTE")
    return (
      <div style={{ fontSize: 12, color: "#9CA3AF" }}>
        No route linked — stop ETAs unavailable
      </div>
    );
  if (eta.tripState === "COMPLETED")
    return (
      <div style={{ fontSize: 12, color: "#4338CA", fontWeight: 600 }}>
        Trip completed · {eta.route?.name}
      </div>
    );
  if (eta.tripState === "NOT_STARTED") {
    const first = eta.stops?.find((s) => s.scheduledTime);
    return (
      <div style={{ fontSize: 12, color: "#6B7280" }}>
        Trip not started{first ? ` · first stop ${first.name}` : ""}
      </div>
    );
  }
  const n = eta.nextStop;
  if (!n) return null;
  const stop = eta.stops?.find((s) => s.routeStopId === n.routeStopId);
  const mins =
    stop?.expectedArrival != null
      ? Math.max(0, (Date.parse(stop.expectedArrival) - nowMs) / 60000)
      : null;
  const p = punctualityStyle(n.punctuality, n.delayMin);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        fontSize: 12.5,
      }}
    >
      <MapPin size={12} color="#4F46E5" />
      <span style={{ color: "#374151" }}>
        {n.state === "AT_STOP" ? "At" : "Next:"} <b>{n.name}</b>
      </span>
      {n.state !== "AT_STOP" && mins != null && (
        <span style={{ color: "#4338CA", fontWeight: 700 }}>
          in {formatEtaMin(mins)} ({formatClock(stop.expectedArrival)})
        </span>
      )}
      {p && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: p.color,
            background: p.bg,
            padding: "1px 7px",
            borderRadius: 99,
          }}
        >
          {p.label}
        </span>
      )}
    </div>
  );
}

function VehicleCard({
  vehicle,
  ageSec,
  stale,
  selected,
  cardRef,
  eta,
  nowMs,
  showSchoolName,
  onPick,
}) {
  const loc = vehicle.point;
  const [showStops, setShowStops] = useState(false);

  useEffect(() => {
    if (selected) setShowStops(true);
  }, [selected]);

  return (
    <div
      ref={cardRef}
      onClick={() => onPick(vehicle.id)}
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: selected ? "2px solid #4F46E5" : "1px solid #E5E7EB",
        boxShadow: selected ? "0 0 0 4px #EEF2FF" : "none",
        cursor: "pointer",
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
          {showSchoolName && vehicle.schoolName && (
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
              {vehicle.schoolName}
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

      <NextStopLine eta={eta} nowMs={nowMs} />

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
        </>
      ) : (
        <div
          style={{
            padding: "8px 0",
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: 13,
          }}
        >
          No location yet. Waiting for the first GPS signal.
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {loc ? (
          <a
            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
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
        ) : (
          <span />
        )}
        {eta && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowStops((v) => !v);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              border: "1px solid #E0E7FF",
              background: "#F5F7FF",
              color: "#4338CA",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Route size={12} /> Stops & ETA{" "}
            {showStops ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {showStops && eta && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            borderTop: "1px solid #F3F4F6",
            paddingTop: 10,
            cursor: "default",
          }}
        >
          <StopEtaTimeline eta={eta} nowMs={nowMs} compact />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LiveTrackingTab({
  schoolId,
  api = ADMIN_TRACKING_API,
  showSchoolName = false,
  emptyHint = (
    <>
      Add one in the <b>Manage Vehicles</b> tab.
    </>
  ),
}) {
  const [byId, setById] = useState({});
  const [order, setOrder] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [stream, setStream] = useState("connecting");
  const [visible, setVisible] = useState(
    () => document.visibilityState !== "hidden",
  );
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [fitKey, setFitKey] = useState("init");
  const skewRef = useRef(0);
  const cardRefs = useRef({});
  const resyncTimer = useRef(null);
  const knownIdsRef = useRef(new Set());
  const [geometryById, setGeometryById] = useState({}); // vehicleId → [[lat,lng]] road line

  const liveAllUrl = api.liveAll(schoolId, false);
  const liveAllFullUrl = api.liveAll(schoolId, true);
  const streamUrl = api.stream(schoolId);
  const etaUrl = api.eta(schoolId);
  const scopeKey = liveAllUrl || "";

  const {
    etaByVehicle,
    error: etaError,
    bump: bumpEta,
  } = useRouteEta({ url: etaUrl });

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
      const url = full ? liveAllFullUrl : liveAllUrl;
      if (!url) return;
      setLoading(true);
      try {
        const d = await fetchJson(url);
        if (d.serverTime) updateSkew(d.serverTime);
        setLoadError("");
        const list = d.data || [];
        const meta = (v) => ({
          id: v.id,
          regNo: v.regNo,
          vehicleName: v.vehicleName,
          vehicleType: v.vehicleType,
          schoolId: v.schoolId,
          schoolName: v.schoolName,
        });

        if (full) {
          const next = {};
          for (const v of list) {
            next[v.id] = applyLivePoints(
              { ...meta(v), initialTrail: v.trail || [], point: null },
              v.location ? [v.location] : [],
              { latestExtra: v.location, jump: true },
            );
          }
          setById(next);
          setOrder(list.map((v) => v.id));
          setFitKey(`${url}-${Date.now()}`);
        } else {
          setById((prev) => {
            const next = { ...prev };
            for (const v of list) {
              const base = next[v.id] || {
                ...meta(v),
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
      } catch (e) {
        setLoadError(e.message || "Could not load vehicles.");
      } finally {
        setLoading(false);
        setLoadedOnce(true);
      }
    },
    [liveAllUrl, liveAllFullUrl],
  );

  // Full load when the scope changes
  useEffect(() => {
    setById({});
    setOrder([]);
    setSelected(null);
    setGeometryById({});
    setLoadError("");
    setLoadedOnce(false);
    loadLive({ full: true });
  }, [scopeKey, loadLive]);

  // Live stream
  useEffect(() => {
    if (!streamUrl || !visible) {
      setStream(visible ? "connecting" : "paused");
      return;
    }
    const close = openLiveStream({
      url: streamUrl,
      onStatus: (s) => setStream(s === "unavailable" ? "polling" : s),
      onEvent: (event, payload) => {
        if (payload?.serverTime) updateSkew(payload.serverTime);
        if (event !== "location" || !payload?.vehicleId) return;
        // a bus we don't know yet (just added / just activated) → resync snapshot
        const unknown = !knownIdsRef.current.has(payload.vehicleId);
        setById((prev) => {
          const cur = prev[payload.vehicleId];
          if (!cur) return prev;
          return {
            ...prev,
            [payload.vehicleId]: applyLivePoints(
              cur,
              payload.path || [payload.latest],
              {
                latestExtra: payload.latest,
              },
            ),
          };
        });
        if (unknown) {
          clearTimeout(resyncTimer.current);
          resyncTimer.current = setTimeout(() => loadLive(), 1500);
        }
        bumpEta();
      },
    });
    return () => {
      clearTimeout(resyncTimer.current);
      close();
    };
  }, [streamUrl, visible, loadLive, bumpEta]);

  // Catch up on return to foreground
  useEffect(() => {
    if (visible && loadedOnce) loadLive();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback polling while stream isn't live
  useEffect(() => {
    if (!liveAllUrl || !visible || stream === "live") return;
    const id = setInterval(() => loadLive(), FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [liveAllUrl, visible, stream, loadLive]);

  // ── Road-following route line for the focused bus (fetched once per bus) ──
  const focusForGeometry = selected || (order.length === 1 ? order[0] : null);
  useEffect(() => {
    if (
      !focusForGeometry ||
      !api.routeGeometry ||
      geometryById[focusForGeometry] !== undefined
    )
      return;
    let cancelled = false;
    fetchJson(api.routeGeometry(focusForGeometry), { timeoutMs: 15000 })
      .then((d) => {
        if (!cancelled)
          setGeometryById((m) => ({
            ...m,
            [focusForGeometry]: d.data?.routeGeometry || null,
          }));
      })
      .catch(() => {
        if (!cancelled)
          setGeometryById((m) => ({ ...m, [focusForGeometry]: null }));
      });
    return () => {
      cancelled = true;
    };
  }, [focusForGeometry]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────
  const nowMs = now + skewRef.current;
  const ageOf = (v) =>
    v.point?.ts ? Math.max(0, (nowMs - tsOf(v.point)) / 1000) : null;

  const vehicles = order.map((id) => byId[id]).filter(Boolean);
  knownIdsRef.current = new Set(order);
  const staleIds = new Set(
    vehicles
      .filter((v) => {
        const a = ageOf(v);
        return a === null || a > STALE_SEC;
      })
      .map((v) => v.id),
  );
  const staleKey = [...staleIds].sort().join(",");

  const focusId = selected || (vehicles.length === 1 ? vehicles[0].id : null);
  const focusEta = focusId ? etaByVehicle[focusId] : null;
  const routeGeometry = focusId ? geometryById[focusId] || null : null;

  const mapStops = useMemo(
    () => buildMapStops(focusEta?.stops, { session: focusEta?.session }),
    [focusEta],
  );

  const mapVehicles = useMemo(
    () =>
      vehicles.map((v) => {
        const e = etaByVehicle[v.id];
        const n = e?.nextStop;
        const p = n ? punctualityStyle(n.punctuality, n.delayMin) : null;
        const nextStopText = n
          ? `${n.name}${
              n.expectedArrival ? ` · ${formatClock(n.expectedArrival)}` : ""
            }${p ? ` · ${p.label}` : ""}`
          : null;
        const extra = {
          nextStopText,
          schoolName: showSchoolName ? v.schoolName : null,
        };
        return v.point
          ? {
              ...v,
              ...extra,
              point: { ...v.point, isStale: staleIds.has(v.id) },
            }
          : { ...v, ...extra };
      }),
    [byId, order, staleKey, etaByVehicle, showSchoolName], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const isMoving = (v) =>
    !staleIds.has(v.id) &&
    (v.point?.status === "MOVING" || (v.point?.speed || 0) > 3);
  const moving = vehicles.filter(isMoving);
  const parked = vehicles.filter(
    (v) => v.point && !staleIds.has(v.id) && !isMoving(v),
  );
  const noData = vehicles.filter((v) => !v.point || staleIds.has(v.id));
  const delayed = vehicles.filter((v) => {
    const e = etaByVehicle[v.id];
    return (
      e?.tripState === "IN_PROGRESS" && e?.currentPunctuality === "DELAYED"
    );
  });

  const pickVehicle = (id) => {
    setSelected((cur) => (cur === id ? null : id));
  };
  const onMapSelect = (id) => {
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

  if (!liveAllUrl) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 0",
          color: "#9CA3AF",
          fontSize: 14,
        }}
      >
        Select a school to see its vehicles.
      </div>
    );
  }

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
            ...(delayed.length
              ? [
                  {
                    label: "Running late",
                    value: delayed.length,
                    color: "#B91C1C",
                    bg: "#FEF2F2",
                  },
                ]
              : []),
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

      {loadError && (
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
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          <span style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
            {loadError}
          </span>
          <button
            onClick={() => loadLive({ full: true })}
            style={{
              padding: "5px 12px",
              background: "#fff",
              color: "#991B1B",
              border: "1px solid #FECACA",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {etaError && vehicles.length > 0 && (
        <div style={{ fontSize: 12, color: "#B45309", marginBottom: 10 }}>
          Stop ETAs unavailable: {etaError}
        </div>
      )}

      {loadedOnce && !loading && !loadError && vehicles.length === 0 && (
        <div
          style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF" }}
        >
          <MapPin size={32} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, margin: 0 }}>
            No active vehicles registered.
          </p>
          {emptyHint && (
            <p style={{ fontSize: 12, margin: "4px 0 0" }}>{emptyHint}</p>
          )}
        </div>
      )}

      {!loadedOnce && loading && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "#9CA3AF",
            fontSize: 13,
          }}
        >
          Loading vehicles…
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
              maxHeight: "clamp(420px, 60vw, 760px)",
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
                eta={etaByVehicle[v.id]}
                nowMs={nowMs}
                showSchoolName={showSchoolName}
                onPick={pickVehicle}
                cardRef={(el) => {
                  cardRefs.current[v.id] = el;
                }}
              />
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            <VehicleMap
              vehicles={mapVehicles}
              stops={mapStops}
              routeGeometry={routeGeometry}
              fitKey={fitKey}
              onSelect={onMapSelect}
              legend={mapStops.length > 0}
            />
            <p
              style={{ margin: "8px 2px 0", fontSize: 11.5, color: "#9CA3AF" }}
            >
              {focusEta?.route
                ? `Showing stops of ${focusEta.route.name} for ${byId[focusId]?.regNo}. Click the bus again to clear.`
                : "Click a bus to show its route stops and ETAs on the map."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
