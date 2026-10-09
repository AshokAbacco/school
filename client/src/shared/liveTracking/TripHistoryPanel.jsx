// client/src/shared/liveTracking/TripHistoryPanel.jsx  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// "History" tab — past bus trips for a day.
//   • pick a day (chips for days that have GPS data + any date in the last 30)
//   • Morning pickup / Evening drop / Full day
//   • trip summary: start, end, duration, distance, speeds, stops reached
//   • replay the trip on the map (play / pause / speed / scrub)
//   • stop-by-stop table: scheduled vs actual arrival + departure, late/early
//
// Props
//   historyUrl(date, session) → URL      (returns { data: <computeTripHistory> })
//   daysUrl                    URL        (returns { data: ["YYYY-MM-DD", ...] })
//   highlightStopId            TransportStop.id of the child's stop (optional)
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  Play,
  Pause,
  AlertTriangle,
  MapPin,
  Clock,
  Gauge,
  Route as RouteIcon,
  Flag,
} from "lucide-react";
import TripHistoryMap from "./TripHistoryMap";
import {
  fetchJson,
  formatClock,
  formatScheduled,
  formatEtaMin,
  punctualityStyle,
} from "./liveTracking";

const IST_OFFSET_MS = 330 * 60 * 1000;
const istDate = (ms) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
const prettyDate = (d) =>
  new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const SESSIONS = [
  { key: "PICKUP", label: "Morning pickup" },
  { key: "DROP", label: "Evening drop" },
  { key: "ALL", label: "Full day" },
];
const SPEEDS = [30, 60, 120];

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div
      style={{
        background: "#F9FAFB",
        borderRadius: 10,
        padding: "10px 12px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          color: "#6B7280",
          fontWeight: 600,
        }}
      >
        <Icon size={12} /> {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "#111827",
          marginTop: 3,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function StatusCell({ s }) {
  const p = punctualityStyle(s.punctuality, s.delayMin);
  const base = {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 99,
    whiteSpace: "nowrap",
  };
  if (p)
    return (
      <span style={{ ...base, color: p.color, background: p.bg }}>
        {p.label}
      </span>
    );
  if (s.state === "PASSED")
    return (
      <span style={{ ...base, color: "#166534", background: "#F0FDF4" }}>
        Reached
      </span>
    );
  if (s.state === "SKIPPED")
    return (
      <span style={{ ...base, color: "#6B7280", background: "#F3F4F6" }}>
        Skipped
      </span>
    );
  if (s.state === "MISSED")
    return (
      <span style={{ ...base, color: "#B91C1C", background: "#FEF2F2" }}>
        No record
      </span>
    );
  return (
    <span style={{ ...base, color: "#6B7280", background: "#F3F4F6" }}>—</span>
  );
}

export default function TripHistoryPanel({
  historyUrl,
  daysUrl,
  highlightStopId = null,
}) {
  const today = istDate(Date.now());
  const minDate = istDate(Date.now() - 30 * 86400000);

  const [days, setDays] = useState([]);
  const [date, setDate] = useState(today);
  const [session, setSession] = useState(() => {
    const h = new Date(Date.now() + IST_OFFSET_MS).getUTCHours();
    return h < 12 ? "PICKUP" : "DROP";
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [playIdx, setPlayIdx] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60);
  const playTimeRef = useRef(null);

  // days with data
  useEffect(() => {
    if (!daysUrl) return;
    fetchJson(daysUrl)
      .then((d) => setDays(d.data || []))
      .catch(() => setDays([]));
  }, [daysUrl]);

  // FIX: depend on the URL *string*, not the historyUrl function. The parent
  // re-renders every second and passed a new function each time, which made
  // this reload every second and stay on "Loading trip…" forever.
  const url = historyUrl(date, session);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    setMessage("");
    setPlaying(false);
    playTimeRef.current = null;
    try {
      const d = await fetchJson(url, { timeoutMs: 45000 });
      if (id !== reqId.current) return; // a newer request (other day/session) won
      setData(d.data || null);
      if (!d.data) setMessage(d.message || "No data.");
      const n = d.data?.path?.length || 0;
      setPlayIdx(n ? n - 1 : null);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e.message);
      setData(null);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  // playback — advances in trip time
  const path = data?.path || [];
  useEffect(() => {
    if (!playing || path.length < 2) return;
    if (playTimeRef.current == null || playIdx >= path.length - 1) {
      playTimeRef.current = path[0][2];
      setPlayIdx(0);
    }
    const TICK = 100;
    const id = setInterval(() => {
      playTimeRef.current += TICK * speed;
      let i = 0;
      // binary search for the last point at/before playTime
      let lo = 0;
      let hi = path.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (path[mid][2] <= playTimeRef.current) {
          i = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      setPlayIdx(i);
      if (i >= path.length - 1) setPlaying(false);
    }, TICK);
    return () => clearInterval(id);
  }, [playing, speed, path]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrub = (i) => {
    setPlaying(false);
    setPlayIdx(i);
    playTimeRef.current = path[i]?.[2] ?? null;
  };

  const sm = data?.summary;
  const myStop = useMemo(
    () =>
      highlightStopId && data?.stops
        ? data.stops.find((s) => s.stopId === highlightStopId)
        : null,
    [data, highlightStopId],
  );
  const myP = myStop
    ? punctualityStyle(myStop.punctuality, myStop.delayMin)
    : null;

  const chip = (active) => ({
    padding: "6px 12px",
    borderRadius: 99,
    border: `1.5px solid ${active ? "#4F46E5" : "#E5E7EB"}`,
    background: active ? "#EEF2FF" : "#fff",
    color: active ? "#4338CA" : "#374151",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const dayChips = useMemo(() => {
    const list = [...new Set([today, ...days])].slice(0, 8);
    if (!list.includes(date)) list.push(date);
    return list;
  }, [days, date, today]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <CalendarDays size={15} color="#6B7280" />
          {dayChips.map((d) => (
            <button key={d} onClick={() => setDate(d)} style={chip(d === date)}>
              {d === today ? "Today" : prettyDate(d)}
              {days.includes(d) && d !== date ? (
                <span style={{ color: "#16A34A" }}> ●</span>
              ) : null}
            </button>
          ))}
          <input
            type="date"
            value={date}
            min={minDate}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            style={{
              padding: "5px 8px",
              border: "1.5px solid #E5E7EB",
              borderRadius: 8,
              fontSize: 12,
              color: "#374151",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SESSIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSession(s.key)}
              style={chip(s.key === session)}
            >
              {s.label}
            </button>
          ))}
        </div>
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
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <span style={{ display: "flex", gap: 8 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
            {error}
          </span>
          <button
            onClick={load}
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
      {message && !error && (
        <div style={{ fontSize: 13, color: "#6B7280" }}>{message}</div>
      )}

      {loading && (
        <div
          style={{
            padding: "30px 0",
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: 13,
          }}
        >
          Loading trip…
        </div>
      )}

      {!loading && data && (
        <>
          {!path.length && (
            <div
              style={{
                padding: "12px 14px",
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                color: "#92400E",
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              No GPS data recorded for{" "}
              {date === today ? "today" : prettyDate(date)} (
              {SESSIONS.find((s) => s.key === data.session)?.label ||
                "this period"}
              ).
              {days.length ? " Days with a green dot have trip data." : ""}
            </div>
          )}

          {path.length > 0 && (
            <>
              {myStop && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: 12,
                    padding: "10px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13.5,
                      color: "#166534",
                    }}
                  >
                    <MapPin size={15} />
                    <span>
                      <b>Your stop ({myStop.name}):</b>{" "}
                      {myStop.actualArrival
                        ? `bus reached at ${formatClock(myStop.actualArrival)}${
                            myStop.actualDeparture &&
                            myStop.actualDeparture !== myStop.actualArrival
                              ? `, left at ${formatClock(
                                  myStop.actualDeparture,
                                )}`
                              : ""
                          }`
                        : myStop.state === "SKIPPED"
                        ? "the bus did not stop here"
                        : "no record of the bus at this stop"}
                      {myStop.scheduledTime
                        ? ` · scheduled ${formatScheduled(
                            myStop.scheduledTime,
                          )}`
                        : ""}
                    </span>
                  </div>
                  {myP && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: myP.color,
                        background: myP.bg,
                        padding: "3px 10px",
                        borderRadius: 99,
                      }}
                    >
                      {myP.label}
                    </span>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 8,
                }}
              >
                <Stat
                  icon={Flag}
                  label="Started"
                  value={formatClock(sm.startedAt || sm.firstPointAt)}
                  sub={sm.endedAt ? `Ended ${formatClock(sm.endedAt)}` : null}
                />
                <Stat
                  icon={Clock}
                  label="Duration"
                  value={
                    sm.durationMin != null ? formatEtaMin(sm.durationMin) : "—"
                  }
                  sub={
                    sm.movingMin ? `${formatEtaMin(sm.movingMin)} moving` : null
                  }
                />
                <Stat
                  icon={RouteIcon}
                  label="Distance"
                  value={`${sm.distanceKm ?? 0} km`}
                />
                <Stat
                  icon={Gauge}
                  label="Speed"
                  value={`${sm.avgMovingSpeedKmh ?? "—"} km/h avg`}
                  sub={`max ${sm.maxSpeedKmh ?? 0} km/h`}
                />
                {sm.stopsTotal > 0 && data.session !== "ALL" && (
                  <Stat
                    icon={MapPin}
                    label="Stops reached"
                    value={`${sm.stopsReached}/${sm.stopsTotal}`}
                  />
                )}
              </div>
            </>
          )}

          <TripHistoryMap
            history={data}
            playIdx={playIdx}
            myStopId={highlightStopId}
          />

          {path.length > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setPlaying((p) => !p)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  background: "#4F46E5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
                {playing ? "Pause" : "Replay trip"}
              </button>
              <input
                type="range"
                min={0}
                max={path.length - 1}
                value={playIdx ?? 0}
                onChange={(e) => scrub(Number(e.target.value))}
                style={{ flex: 1, minWidth: 160, accentColor: "#4F46E5" }}
                aria-label="Trip playback position"
              />
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#374151",
                  minWidth: 70,
                }}
              >
                {playIdx != null && path[playIdx]
                  ? formatClock(new Date(path[playIdx][2]).toISOString())
                  : "—"}
              </span>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                style={{
                  padding: "5px 8px",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                aria-label="Playback speed"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}× speed
                  </option>
                ))}
              </select>
            </div>
          )}

          {data.stops?.length > 0 && data.session !== "ALL" && (
            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  background: "#F9FAFB",
                  fontWeight: 700,
                  fontSize: 13.5,
                  borderBottom: "1px solid #E5E7EB",
                }}
              >
                Stop times · {data.route?.name}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12.5,
                    minWidth: 520,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Stop",
                        "Scheduled",
                        "Arrived",
                        "Left",
                        "Status",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "8px 12px",
                            fontSize: 11,
                            color: "#6B7280",
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                            borderBottom: "1px solid #F3F4F6",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.stops.map((s) => {
                      const mine =
                        highlightStopId && s.stopId === highlightStopId;
                      return (
                        <tr
                          key={s.routeStopId}
                          style={{
                            background: mine ? "#F0FDF4" : "transparent",
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 12px",
                              color: "#9CA3AF",
                              fontWeight: 700,
                            }}
                          >
                            {s.number}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontWeight: mine ? 800 : 600,
                            }}
                          >
                            {s.name}
                            {mine && (
                              <span
                                style={{ color: "#16A34A", fontWeight: 700 }}
                              >
                                {" "}
                                · Your stop
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#6B7280" }}>
                            {s.scheduledTime
                              ? formatScheduled(s.scheduledTime)
                              : "—"}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {formatClock(s.actualArrival)}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {s.actualDeparture
                              ? formatClock(s.actualDeparture)
                              : "—"}
                            {s.dwellMin ? (
                              <span style={{ color: "#9CA3AF" }}>
                                {" "}
                                ({s.dwellMin} min)
                              </span>
                            ) : null}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <StatusCell s={s} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
