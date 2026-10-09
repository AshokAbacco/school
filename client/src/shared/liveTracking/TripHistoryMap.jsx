// client/src/shared/liveTracking/TripHistoryMap.jsx  (NEW FILE)
// Static map of one past trip:
//   • the path the bus actually drove (snapped to roads when available,
//     otherwise smoothed)  • start / end markers
//   • numbered stops with actual times in tooltips
//   • a bus marker at the playback position

import React, { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { stopNumberIcon, flagIcon, StopTooltipBody } from "./LiveBusMap";
import { chaikin, curveThrough } from "./geoSmooth";
import { formatClock, formatScheduled } from "./liveTracking";

const DEFAULT_CENTER = [12.9716, 77.5946];

const pinIcon = (text, bg) =>
  L.divIcon({
    className: "th-pin-wrap",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div class="th-pin" style="background:${bg}">${text}</div>`,
  });
const START_ICON = pinIcon("Start", "#16A34A");
const END_ICON = pinIcon("End", "#DC2626");

const BUS_ICON = L.divIcon({
  className: "th-bus-wrap",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `<div class="th-bus"><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M6 3h12a3 3 0 0 1 3 3v10a2 2 0 0 1-1 1.73V20a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.27A2 2 0 0 1 3 16V6a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v5h14V6a1 1 0 0 0-1-1H6Zm1 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg></div>`,
});

function FitTo({ fitKey, points }) {
  const map = useMap();
  const done = useRef(null);
  useEffect(() => {
    if (done.current === fitKey || !points.length) return;
    done.current = fitKey;
    if (points.length === 1) map.setView(points[0], 15, { animate: false });
    else map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: 16, animate: false });
  }, [fitKey, points, map]);
  return null;
}

/** history stop → tooltip lines */
export function historyStopLines(s) {
  const lines = [];
  if (s.scheduledTime) lines.push({ text: `Scheduled ${formatScheduled(s.scheduledTime)}`, color: "#6B7280" });
  if (s.actualArrival) lines.push({ text: `Reached ${formatClock(s.actualArrival)}`, color: "#166534" });
  if (s.actualDeparture && s.actualDeparture !== s.actualArrival)
    lines.push({ text: `Left ${formatClock(s.actualDeparture)}${s.dwellMin ? ` (${s.dwellMin} min stop)` : ""}`, color: "#166534" });
  if (s.punctuality === "DELAYED") lines.push({ text: `${Math.round(s.delayMin)} min late`, color: "#B91C1C" });
  if (s.punctuality === "EARLY") lines.push({ text: `${Math.round(-s.delayMin)} min early`, color: "#1D4ED8" });
  if (s.punctuality === "ON_TIME") lines.push({ text: "On time", color: "#166534" });
  if (s.state === "SKIPPED") lines.push({ text: "Skipped by the bus", color: "#6B7280" });
  if (s.state === "MISSED") lines.push({ text: "No GPS record at this stop", color: "#B91C1C" });
  return lines;
}

export default function TripHistoryMap({ history, playIdx = null, myStopId = null, height = "clamp(320px, 55vh, 600px)" }) {
  const raw = useMemo(() => (history?.path || []).map((p) => [p[0], p[1]]), [history]);

  const drivenLine = useMemo(() => {
    if (history?.snappedPath?.length > 1) return history.snappedPath;
    return chaikin(raw, 2);
  }, [history, raw]);

  const stops = (history?.stops || []).filter((s) => s.hasLocation);

  const plannedLine = useMemo(() => {
    if (history?.routeGeometry?.length > 1) return history.routeGeometry;
    return curveThrough(stops.map((s) => [Number(s.latitude), Number(s.longitude)]));
  }, [history]); // eslint-disable-line react-hooks/exhaustive-deps

  const fitPoints = useMemo(() => {
    const pts = raw.length ? raw : stops.map((s) => [Number(s.latitude), Number(s.longitude)]);
    return pts;
  }, [raw]); // eslint-disable-line react-hooks/exhaustive-deps

  const center = fitPoints[0] || DEFAULT_CENTER;
  const cur = playIdx != null && history?.path?.[playIdx];
  const fitKey = `${history?.date}|${history?.session}|${raw.length}`;

  return (
    <div style={{ position: "relative", zIndex: 0, borderRadius: 14, overflow: "hidden", border: "1px solid #E5E7EB" }}>
      <style>{`
        .th-pin-wrap, .th-bus-wrap { background: transparent; border: 0; }
        .th-pin { position: absolute; left: 0; bottom: 6px; transform: translateX(-50%); color: #fff;
          font: 800 11px system-ui, sans-serif; padding: 3px 8px; border-radius: 8px; white-space: nowrap;
          box-shadow: 0 2px 6px rgba(15,23,42,.3); }
        .th-bus { width: 30px; height: 30px; border-radius: 50%; background: #4F46E5; display: flex;
          align-items: center; justify-content: center; box-shadow: 0 0 0 3px #fff, 0 3px 10px rgba(15,23,42,.35); }
      `}</style>
      <MapContainer center={center} zoom={14} style={{ height, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitTo fitKey={fitKey} points={fitPoints} />

        {plannedLine.length > 1 && (
          <Polyline positions={plannedLine} pathOptions={{ color: "#94A3B8", weight: 3, opacity: 0.7, dashArray: "6 8", interactive: false }} />
        )}

        {drivenLine.length > 1 && (
          <>
            <Polyline positions={drivenLine} pathOptions={{ color: "#fff", weight: 9, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false }} />
            <Polyline positions={drivenLine} pathOptions={{ color: "#4F46E5", weight: 5, opacity: 0.85, lineCap: "round", lineJoin: "round", interactive: false }} />
          </>
        )}

        {stops.map((s) => {
          const mine = myStopId && s.stopId === myStopId;
          return (
            <Marker
              key={s.routeStopId}
              position={[Number(s.latitude), Number(s.longitude)]}
              icon={stopNumberIcon(s.number, s.state === "UPCOMING" ? "UPCOMING" : s.state, mine, !!s.isSchool)}
              zIndexOffset={mine ? 600 : 300}
            >
              <Tooltip direction="top" className="lb-stop-tip" opacity={1}>
                <StopTooltipBody s={{ ...s, isMine: mine, lines: historyStopLines(s) }} />
              </Tooltip>
            </Marker>
          );
        })}
        {stops
          .filter((s) => myStopId && s.stopId === myStopId)
          .map((s) => (
            <Marker
              key="mine-flag"
              position={[Number(s.latitude), Number(s.longitude)]}
              icon={flagIcon(s.actualArrival ? `Your stop · ${formatClock(s.actualArrival)}` : "Your stop", "mine")}
              interactive={false}
              zIndexOffset={700}
            />
          ))}

        {raw.length > 1 && (
          <>
            <Marker position={raw[0]} icon={START_ICON} interactive={false} />
            <Marker position={raw[raw.length - 1]} icon={END_ICON} interactive={false} />
          </>
        )}

        {cur && (
          <Marker position={[cur[0], cur[1]]} icon={BUS_ICON} zIndexOffset={1000}>
            <Tooltip direction="top" offset={[0, -14]} permanent>
              {formatClock(new Date(cur[2]).toISOString())}
              {cur[3] != null ? ` · ${cur[3]} km/h` : ""}
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
