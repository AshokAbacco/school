// client/src/shared/liveTracking/StopEtaTimeline.jsx  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// Stop-by-stop trip view for one bus. Used by the admin dashboard, the Bus Head
// portal and (drop-in) the parent app.
//
// Props
//   eta              response of /eta for one vehicle (see routeEta.service.js)
//   nowMs            current time, ideally server-skew corrected (ticks the countdown)
//   compact          show summary + next stops only, with "Show all stops"
//   highlightStopId  TransportStop.id to mark as "Your stop" (parent view)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import {
  Clock,
  MapPin,
  Route,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  formatClock,
  formatScheduled,
  formatEtaMin,
  punctualityStyle,
} from "./liveTracking";

/** Stop numbers matching the map: real stops 1..N, the school has none. */
export function stopNumbers(stops) {
  const map = new Map();
  let n = 0;
  for (const s of stops || []) map.set(s.routeStopId, s.isSchool ? null : ++n);
  return map;
}

/** Arrival / departure lines for one stop (map tooltip + timeline share these). */
export function stopTimeLines(s) {
  const lines = [];
  const planned = s.estimateType === "PLANNED";
  if (s.scheduledTime)
    lines.push({
      text: `Scheduled ${formatScheduled(s.scheduledTime)}`,
      color: "#6B7280",
    });

  if (s.actualArrival) {
    lines.push({
      text: `Arrived ${formatClock(s.actualArrival)}`,
      color: "#166534",
    });
    if (s.state === "AT_STOP" && s.expectedDeparture)
      lines.push({
        text: `Departs ~${formatClock(s.expectedDeparture)}`,
        color: "#92400E",
      });
    else if (s.actualDeparture)
      lines.push({
        text:
          s.actualDeparture === s.actualArrival
            ? "Passed without stopping"
            : `Departed ${formatClock(s.actualDeparture)}`,
        color: "#166534",
      });
  } else if (s.expectedArrival) {
    lines.push({
      text: `${planned ? "Planned arrival" : "Est. arrival"} ${formatClock(
        s.expectedArrival,
      )}${
        !planned && s.etaMin != null ? ` (in ${formatEtaMin(s.etaMin)})` : ""
      }`,
      color: planned ? "#374151" : "#4338CA",
    });
    if (s.expectedDeparture && !s.isSchool)
      lines.push({
        text: `${
          planned ? "Planned departure" : "Est. departure"
        } ${formatClock(s.expectedDeparture)}`,
        color: planned ? "#374151" : "#4338CA",
      });
  }
  const p = punctualityStyle(s.punctuality, s.delayMin);
  if (p) lines.push({ text: p.label, color: p.color });
  if (s.state === "SKIPPED")
    lines.push({ text: "Skipped by the bus", color: "#6B7280" });
  if (s.state === "MISSED")
    lines.push({ text: "No GPS record at this stop", color: "#B91C1C" });
  if (s.avgDwellMin != null && !s.isSchool && !s.actualDeparture)
    lines.push({
      text: `Stop time ~${formatEtaMin(s.avgDwellMin)}`,
      color: "#9CA3AF",
    });
  if (s.avgTravelMinFromPrev != null)
    lines.push({
      text: `~${formatEtaMin(s.avgTravelMinFromPrev)} from previous stop`,
      color: "#9CA3AF",
    });
  if (s.locationIssue === "SWAPPED")
    lines.push({
      text: "Map location was entered with lat/lng swapped (auto-corrected)",
      color: "#B45309",
    });
  return lines;
}

/** "in 5 min" style text; never shows clock times. */
const inMin = (n) =>
  n <= 0 ? "now" : n === 1 ? "in 1 min" : `in ${Math.round(n)} min`;

/**
 * One short message per stop for the MAP tooltip — no timings, just
 * "Bus will arrive at your stop in 5 min" style text.
 */
export function stopArrivalMessage(s, { isMine = false, session = null } = {}) {
  const live = s.estimateType === "LIVE" && s.etaMin != null;
  const where = isMine ? "your stop" : s.isSchool ? "school" : "this stop";
  if (s.state === "AT_STOP")
    return isMine
      ? "The bus is at your stop now"
      : `The bus is at ${where} now`;
  if (s.state === "PASSED") {
    if (s.isSchool)
      return session === "DROP"
        ? "The bus has left school"
        : "The bus has reached school";
    return isMine
      ? "The bus has passed your stop"
      : "The bus has passed this stop";
  }
  if (s.state === "SKIPPED") return "The bus did not stop here";
  if (s.state === "MISSED") return "No record of the bus at this stop";
  if (live)
    return s.etaMin <= 0
      ? `The bus is arriving at ${where} now`
      : `Bus will arrive at ${where} ${inMin(s.etaMin)}`;
  return "The bus has not started yet";
}

/**
 * ETA stops → LiveBusMap stops (numbered, coloured, one-line tooltip, flags).
 * @param myStopId  TransportStop.id of the child's stop (parent view)
 */
export function buildMapStops(
  etaStops,
  { myStopId = null, session = null } = {},
) {
  const nums = stopNumbers(etaStops);
  return (etaStops || [])
    .filter((s) => s.hasLocation)
    .map((s) => {
      const isMine = !!(myStopId && s.stopId === myStopId);
      const live = s.estimateType === "LIVE" && s.etaMin != null;
      let flag = null;
      if (s.state === "AT_STOP")
        flag = isMine
          ? "Bus at your stop"
          : s.isSchool
          ? "Bus at school"
          : "Bus here";
      else if (isMine)
        flag =
          s.state === "PASSED"
            ? "Your stop · bus passed"
            : live
            ? `Your stop · ${inMin(s.etaMin)}`
            : "Your stop";
      else if (s.isSchool) flag = "School";
      else if (s.state === "NEXT" && live) flag = `Next · ${inMin(s.etaMin)}`;

      const msg = stopArrivalMessage(s, { isMine, session });
      return {
        id: s.routeStopId,
        number: nums.get(s.routeStopId),
        name: s.name,
        landmark: s.landmark,
        latitude: s.latitude,
        longitude: s.longitude,
        state: s.state === "UNKNOWN" ? "UPCOMING" : s.state,
        isMine,
        isSchool: !!s.isSchool,
        lines: [
          {
            text: msg,
            color:
              s.state === "PASSED" ? "#166534" : live ? "#4338CA" : "#6B7280",
          },
        ],
        flag,
      };
    });
}

const SESSION_LABEL = { PICKUP: "Morning pickup", DROP: "Evening drop" };

const TRIP_STATE = {
  IN_PROGRESS: { label: "Trip in progress", color: "#166534", bg: "#F0FDF4" },
  NOT_STARTED: { label: "Not started", color: "#6B7280", bg: "#F3F4F6" },
  COMPLETED: { label: "Trip completed", color: "#4338CA", bg: "#EEF2FF" },
  NO_SIGNAL: { label: "GPS signal lost", color: "#B45309", bg: "#FFFBEB" },
  UNKNOWN: { label: "Unknown", color: "#6B7280", bg: "#F3F4F6" },
};

const DOT = {
  PASSED: { fill: "#16A34A", ring: "#BBF7D0" },
  AT_STOP: { fill: "#F59E0B", ring: "#FDE68A" },
  NEXT: { fill: "#4F46E5", ring: "#C7D2FE" },
  UPCOMING: { fill: "#fff", ring: "#CBD5E1" },
  SKIPPED: { fill: "#fff", ring: "#E5E7EB" },
  MISSED: { fill: "#FEE2E2", ring: "#FECACA" },
  UNKNOWN: { fill: "#fff", ring: "#E5E7EB" },
};

function Pill({ style, children }) {
  if (!style && !children) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: style?.color || "#374151",
        background: style?.bg || "#F3F4F6",
      }}
    >
      {children ?? style?.label}
    </span>
  );
}

const liveEtaMin = (stop, nowMs) =>
  stop.expectedArrival
    ? Math.max(0, (Date.parse(stop.expectedArrival) - nowMs) / 60000)
    : null;

function arrivalDeparture(stop) {
  const planned = stop.estimateType === "PLANNED";
  const live = { color: "#4338CA" };
  const plan = { color: "#374151" };
  const done = { color: "#166534" };
  const none = { color: "#9CA3AF" };
  let arr;
  let dep;
  if (stop.actualArrival) {
    arr = { ...done, label: "Arrived", value: formatClock(stop.actualArrival) };
    if (stop.state === "AT_STOP")
      dep = {
        color: "#92400E",
        label: "Departs ~",
        value: formatClock(stop.expectedDeparture),
      };
    else if (stop.actualDeparture)
      dep =
        stop.actualDeparture === stop.actualArrival
          ? { ...done, label: "Departed", value: "without stopping" }
          : {
              ...done,
              label: "Departed",
              value: formatClock(stop.actualDeparture),
            };
    else dep = { ...none, label: "Departed", value: "—" };
  } else if (stop.expectedArrival) {
    const st = planned ? plan : live;
    arr = {
      ...st,
      label: planned ? "Planned arr." : "Est. arrival",
      value: formatClock(stop.expectedArrival),
    };
    dep = {
      ...st,
      label: planned ? "Planned dep." : "Est. departure",
      value: formatClock(stop.expectedDeparture),
    };
  } else {
    arr = {
      ...none,
      label: stop.state === "SKIPPED" ? "Skipped" : "Arrival",
      value: stop.state === "SKIPPED" ? "" : "—",
    };
    dep = { ...none, label: "Departure", value: "—" };
  }
  return { arr, dep };
}

function StopRow({ stop, number, first, last, nowMs, isMine }) {
  const { arr, dep } = arrivalDeparture(stop);
  // School row: only "leaves school" (start of evening trip) or "reaches school" (end of morning trip)
  const schoolStart = stop.isSchool && first;
  if (schoolStart)
    dep.label = stop.actualDeparture
      ? "Left school"
      : dep.label
          .replace("dep.", "departure")
          .replace("Est. departure", "Leaves school ~");
  if (stop.isSchool && !first)
    arr.label = stop.actualArrival ? "Reached school" : arr.label;
  const dot = DOT[stop.state] || DOT.UPCOMING;
  const punct = punctualityStyle(stop.punctuality, stop.delayMin);
  const done = stop.state === "PASSED" || stop.state === "SKIPPED";
  const upcoming = stop.state === "NEXT" || stop.state === "UPCOMING";

  return (
    <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
      {/* rail */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 16,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            marginTop: 3,
            borderRadius: "50%",
            background: dot.fill,
            border: `3px solid ${dot.ring}`,
            boxSizing: "content-box",
            animation:
              stop.state === "AT_STOP" || stop.state === "NEXT"
                ? "eta-pulse 1.6s infinite"
                : "none",
          }}
        />
        {!last && (
          <span
            style={{
              flex: 1,
              width: 2,
              minHeight: 18,
              background: done ? "#86EFAC" : "#E5E7EB",
              marginTop: 2,
            }}
          />
        )}
      </div>

      {/* body */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontWeight:
                stop.state === "NEXT" || stop.state === "AT_STOP" ? 800 : 600,
              fontSize: 13,
              color: stop.state === "SKIPPED" ? "#9CA3AF" : "#111827",
              textDecoration:
                stop.state === "SKIPPED" ? "line-through" : "none",
            }}
          >
            {stop.isSchool ? "🏫 " : number != null ? `${number}. ` : ""}
            {stop.name}
          </span>
          {isMine && (
            <Pill style={{ color: "#fff", bg: "#16A34A" }}>Your stop</Pill>
          )}
          {stop.state === "AT_STOP" && (
            <Pill style={{ color: "#92400E", bg: "#FEF3C7" }}>At stop now</Pill>
          )}
          {stop.state === "SKIPPED" && (
            <Pill style={{ color: "#6B7280", bg: "#F3F4F6" }}>Skipped</Pill>
          )}
          {!stop.hasLocation && (
            <Pill style={{ color: "#B45309", bg: "#FFFBEB" }}>
              {stop.locationIssue === "TOO_FAR"
                ? "Map location looks wrong"
                : "No map location"}
            </Pill>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "2px 12px",
            marginTop: 4,
            fontSize: 12,
          }}
        >
          {stop.scheduledTime && (
            <span style={{ color: "#6B7280" }}>
              Scheduled {formatScheduled(stop.scheduledTime)}
            </span>
          )}
          {!schoolStart && (
            <span style={{ color: arr.color }}>
              <b style={{ fontWeight: 600 }}>{arr.label}</b> {arr.value}
            </span>
          )}
          {!stop.isSchool || schoolStart ? (
            <span style={{ color: dep.color }}>
              <b style={{ fontWeight: 600 }}>{dep.label}</b> {dep.value}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 4,
            alignItems: "center",
          }}
        >
          {upcoming &&
            stop.expectedArrival &&
            stop.estimateType !== "PLANNED" && (
              <Pill style={{ color: "#4338CA", bg: "#EEF2FF" }}>
                <Clock size={10} /> in {formatEtaMin(liveEtaMin(stop, nowMs))}
              </Pill>
            )}
          {punct && <Pill style={punct} />}
          {!stop.isSchool &&
            stop.avgDwellMin != null &&
            !stop.actualDeparture && (
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                stops ~{formatEtaMin(stop.avgDwellMin)}
              </span>
            )}
          {stop.avgTravelMinFromPrev != null && (
            <span
              title={
                stop.avgTravelSource === "history"
                  ? "Median of recent trips"
                  : stop.avgTravelSource === "schedule"
                  ? "From the route timetable (no trip history yet)"
                  : "Estimated from distance (no history or timetable)"
              }
              style={{ fontSize: 11, color: "#9CA3AF" }}
            >
              ~{formatEtaMin(stop.avgTravelMinFromPrev)} from previous
              {stop.distanceFromPrevKm != null
                ? ` · ${stop.distanceFromPrevKm} km`
                : ""}
              {stop.avgTravelSource !== "history" ? " (est.)" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StopEtaTimeline({
  eta,
  nowMs = Date.now(),
  compact = false,
  highlightStopId = null,
}) {
  const [expanded, setExpanded] = useState(!compact);

  if (!eta) {
    return (
      <div style={{ fontSize: 12, color: "#9CA3AF", padding: "6px 0" }}>
        Loading route ETA…
      </div>
    );
  }
  if (eta.error) {
    return (
      <div style={{ fontSize: 12, color: "#B91C1C", padding: "6px 0" }}>
        {eta.error}
      </div>
    );
  }
  if (eta.reason === "NO_ROUTE") {
    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          fontSize: 12,
          color: "#92400E",
          background: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          No route linked to this bus. In <b>Transport → Routes</b>, set the
          route's vehicle number to <b>{eta.regNo}</b> to see stop ETAs.
        </span>
      </div>
    );
  }

  const stops = eta.stops || [];
  const nums = stopNumbers(stops);
  const planned = stops.some((s) => s.estimateType === "PLANNED");
  const state = TRIP_STATE[eta.tripState] || TRIP_STATE.UNKNOWN;
  const next = stops.find((s) => s.state === "AT_STOP" || s.state === "NEXT");
  const nextPunct = next
    ? punctualityStyle(next.punctuality, next.delayMin)
    : null;

  // compact = the stop before next + next 3
  let visible = stops;
  if (!expanded) {
    const i = next
      ? stops.indexOf(next)
      : stops.findIndex((s) => s.state === "UPCOMING");
    const from = Math.max(0, (i < 0 ? 0 : i) - 1);
    visible = stops.slice(from, from + 4);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`@keyframes eta-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>

      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            fontSize: 12.5,
            fontWeight: 700,
            color: "#374151",
          }}
        >
          <Route size={14} color="#4F46E5" />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {eta.route?.name}
            {eta.route?.code ? ` (${eta.route.code})` : ""}
          </span>
          {eta.session && (
            <span style={{ fontWeight: 500, color: "#6B7280" }}>
              · {SESSION_LABEL[eta.session] || eta.session}
            </span>
          )}
        </div>
        <Pill style={state} />
      </div>

      {eta.reason === "NO_STOP_LOCATIONS" && (
        <div
          style={{
            fontSize: 12,
            color: "#92400E",
            background: "#FFFBEB",
            borderRadius: 8,
            padding: "6px 10px",
          }}
        >
          {eta.message}
        </div>
      )}

      {planned && eta.tripState !== "IN_PROGRESS" && (
        <div
          style={{
            fontSize: 11.5,
            color: "#6B7280",
            background: "#F9FAFB",
            borderRadius: 8,
            padding: "6px 10px",
          }}
        >
          Planned times from the route timetable (every stop ~
          {formatEtaMin(stops.find((x) => !x.isSchool)?.avgDwellMin ?? 2)}).
          They switch to live estimates as soon as the bus starts moving.
        </div>
      )}

      {/* next stop summary */}
      {next && eta.tripState === "IN_PROGRESS" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "#EEF2FF",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6366F1",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {next.state === "AT_STOP" ? "At stop" : "Next stop"}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#1E1B4B",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <MapPin size={13} /> {next.name}
            </div>
            {nextPunct && (
              <div style={{ marginTop: 4 }}>
                <Pill style={nextPunct} />
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#4338CA",
                lineHeight: 1.1,
              }}
            >
              {next.state === "AT_STOP"
                ? "Now"
                : formatEtaMin(liveEtaMin(next, nowMs))}
            </div>
            <div style={{ fontSize: 11, color: "#6366F1" }}>
              {next.state === "AT_STOP"
                ? `leaves ~${formatClock(next.expectedDeparture)}`
                : `ETA ${formatClock(next.expectedArrival)}`}
            </div>
          </div>
        </div>
      )}

      {!eta.live &&
        eta.tripState !== "COMPLETED" &&
        eta.tripState !== "NOT_STARTED" && (
          <div style={{ fontSize: 11.5, color: "#B45309" }}>
            ETAs paused — waiting for a fresh GPS signal.
          </div>
        )}

      {/* timeline */}
      <div>
        {visible.map((s, i) => (
          <StopRow
            key={s.routeStopId}
            stop={s}
            number={nums.get(s.routeStopId)}
            first={stops.indexOf(s) === 0}
            last={i === visible.length - 1}
            nowMs={nowMs}
            isMine={highlightStopId && s.stopId === highlightStopId}
          />
        ))}
      </div>

      {/* footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>
          {eta.progress
            ? `${eta.progress.passed}/${eta.progress.total} stops done · `
            : ""}
          {eta.averages?.basedOnTripDays
            ? `averages from ${eta.averages.basedOnTripDays} recent trip${
                eta.averages.basedOnTripDays > 1 ? "s" : ""
              }`
            : eta.averages?.loading
            ? "learning averages…"
            : "estimated times (no trip history yet)"}
        </span>
        {compact && (expanded || stops.length > visible.length) ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: "none",
              background: "none",
              color: "#4F46E5",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "Show less" : `Show all ${stops.length} stops`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
