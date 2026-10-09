// client/src/shared/liveTracking/LiveBusMap.jsx  (UPDATED)
//   • numbered stop markers coloured by trip state + rich tooltips (hover / tap)
//   • always-visible labels for "Your stop" and the next stop
//   • route line follows the roads (routeGeometry) or a smooth curve — never straight
//   • optional legend
// ═══════════════════════════════════════════════════════════════════════════════
// Live map used by BOTH the parent page and the admin dashboard.
//
// How smooth movement works
//   GPS points arrive every few seconds (device) or ~once a minute (provider).
//   Instead of teleporting the marker, we animate it along every point received
//   (the road it actually took), spreading the movement over the real time gap
//   between GPS fixes. Result: the bus is always gliding, never frozen/jumping.
//   Big gaps (>2.5 min) or jumps (>3 km) snap instantly instead.
//
// Props
//   vehicles    [{ id, regNo, vehicleName, vehicleType, point, motion, initialTrail }]
//   stops       [{ id, name, latitude, longitude,                 (route stops, travel order)
//                 number?, state?, isMine?, landmark?,
//                 lines?: [{ text, color? }],   tooltip detail lines
//                 flag?: "short permanent label" }]
//                 state: PASSED|SKIPPED|AT_STOP|NEXT|UPCOMING|MISSED
//   routeGeometry [[lat,lng],...] road path for the route line (else smooth curve)
//   myStop      { name, latitude, longitude, label? }            (green pin)
//   legend      true → show a small legend
//   showMyStopPin false → myStop only used for fitting (stop drawn as a numbered marker)
//   myStop      { name, latitude, longitude }                    (highlighted pin)
//   followId    vehicle id to keep in view (parent view)
//   fitKey      change this to re-fit the map to vehicles + stop
//   height      CSS height
//   showLabels  permanent reg-no labels (admin)
//   onSelect    (vehicleId) => void
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Polyline,
  Marker,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { distanceMeters, bearingDeg, tsOf } from "./liveTracking";
import { curveThrough, cleanPath } from "./geoSmooth";

const DEFAULT_CENTER = [12.9716, 77.5946];
const MAX_GAP_MS = 150 * 1000; // longer gap → snap
const MAX_JUMP_M = 3000; // bigger jump → snap
const MAX_ANIM_MS = 65 * 1000;
const MIN_ANIM_MS = 700;
const TRAIL_MAX = 400;
const TRAIL_REDRAW_MS = 250;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ── Vehicle icon: static bus badge + rotating heading arrow ──────────────────
const GLYPHS = {
  BUS: '<path d="M6 3h12a3 3 0 0 1 3 3v10a2 2 0 0 1-1 1.73V20a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.27A2 2 0 0 1 3 16V6a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v5h14V6a1 1 0 0 0-1-1H6Zm1 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>',
  VAN: '<path d="M3 6a2 2 0 0 1 2-2h10l5 5v7a2 2 0 0 1-2 2h-.5a2.5 2.5 0 0 1-5 0h-3a2.5 2.5 0 0 1-5 0H5a2 2 0 0 1-2-2V6Zm2 0v4h4V6H5Zm6 0v4h7l-3-4h-4Z"/>',
};

function vehicleIcon(type, color) {
  const glyph = GLYPHS[(type || "").toUpperCase()] || GLYPHS.BUS;
  return L.divIcon({
    className: "lb-veh-wrap",
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -22],
    html: `
      <div class="lb-veh" style="--c:${color}">
        <div class="lb-heading"><span></span></div>
        <div class="lb-pulse"></div>
        <div class="lb-badge"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">${glyph}</svg></div>
      </div>`,
  });
}

const stopIcon = L.divIcon({
  className: "lb-stop-wrap",
  iconSize: [30, 40],
  iconAnchor: [15, 38],
  html: `<svg viewBox="0 0 30 40" width="30" height="40"><path d="M15 1C7.3 1 1 7.1 1 14.7 1 25 15 39 15 39s14-14 14-24.3C29 7.1 22.7 1 15 1Z" fill="#16A34A" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14.5" r="5.5" fill="#fff"/></svg>`,
});

// ── Animated marker (imperative Leaflet for 60fps without React re-renders) ──
function AnimatedVehicleMarker({
  vehicle,
  color,
  showLabel,
  onFrame,
  onSelect,
  popupHtml,
}) {
  const map = useMap();
  const markerRef = useRef(null);
  const trailRef = useRef(null);
  const posRef = useRef(null); // { lat, lng, bearing }
  const lastTsRef = useRef(0);
  const rafRef = useRef(null);
  const seqRef = useRef(null);

  const setHeading = (deg, moving) => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    const h = el.querySelector(".lb-heading");
    if (h && Number.isFinite(deg)) h.style.transform = `rotate(${deg}deg)`;
    el.classList.toggle("is-moving", !!moving);
  };

  const setStale = (stale) =>
    markerRef.current?.getElement()?.classList.toggle("is-stale", !!stale);

  const placeAt = (lat, lng, bearing, moving) => {
    posRef.current = {
      lat,
      lng,
      bearing: Number.isFinite(bearing)
        ? bearing
        : posRef.current?.bearing ?? 0,
    };
    markerRef.current?.setLatLng([lat, lng]);
    setHeading(posRef.current.bearing, moving);
    onFrame?.(vehicle.id, lat, lng);
  };

  // Create marker + trail once
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      markerRef.current?.remove();
      trailRef.current?.remove();
      markerRef.current = null;
      trailRef.current = null;
    };
  }, [map]);

  // Popup content refresh
  useEffect(() => {
    if (markerRef.current && popupHtml)
      markerRef.current.setPopupContent(popupHtml);
  }, [popupHtml]);

  // Staleness styling
  useEffect(() => {
    setStale(vehicle.point?.isStale);
  }, [vehicle.point?.isStale]);

  // React to new motion
  useEffect(() => {
    const p = vehicle.point;
    if (!p) return;

    // First time: build marker at the latest point and draw history trail
    if (!markerRef.current) {
      const m = L.marker([p.latitude, p.longitude], {
        icon: vehicleIcon(vehicle.vehicleType, color),
        zIndexOffset: 1000,
        keyboard: false,
      }).addTo(map);
      if (showLabel) {
        m.bindTooltip(vehicle.regNo || "", {
          permanent: true,
          direction: "top",
          offset: [0, -24],
          className: "lb-label",
        });
      }
      if (popupHtml) m.bindPopup(popupHtml);
      m.on("click", () => onSelect?.(vehicle.id));
      markerRef.current = m;

      const hist = (vehicle.initialTrail || [])
        .filter((t) => tsOf(t) <= tsOf(p))
        .map((t) => [Number(t.latitude), Number(t.longitude)]);
      hist.push([p.latitude, p.longitude]);
      trailRef.current = L.polyline(hist.slice(-TRAIL_MAX), {
        color,
        weight: 4,
        opacity: 0.55,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(map);

      lastTsRef.current = tsOf(p);
      seqRef.current = vehicle.motion?.seq ?? null;
      placeAt(p.latitude, p.longitude, p.bearing, (p.speed || 0) > 3);
      setStale(p.isStale);
      return;
    }

    const motion = vehicle.motion;
    if (!motion || motion.seq === seqRef.current) return;
    seqRef.current = motion.seq;

    const pts = (motion.points?.length ? motion.points : [p]).map((q) => ({
      lat: q.latitude,
      lng: q.longitude,
      bearing: q.bearing,
      speed: q.speed,
      ts: tsOf(q),
    }));
    const endPt = pts[pts.length - 1];
    const prevTs = lastTsRef.current;
    lastTsRef.current = endPt.ts || prevTs;

    const from = posRef.current || {
      lat: endPt.lat,
      lng: endPt.lng,
      bearing: 0,
    };
    const waypoints = [from, ...pts];

    const cum = [0];
    for (let i = 1; i < waypoints.length; i++)
      cum.push(cum[i - 1] + distanceMeters(waypoints[i - 1], waypoints[i]));
    const total = cum[cum.length - 1];
    const gapMs = prevTs && endPt.ts ? endPt.ts - prevTs : 0;
    const moving = (endPt.speed || 0) > 3 || total > 15;

    cancelAnimationFrame(rafRef.current);
    const trail = trailRef.current;
    const base = trail ? trail.getLatLngs().map((ll) => [ll.lat, ll.lng]) : [];

    const snap =
      motion.jump ||
      !gapMs ||
      gapMs > MAX_GAP_MS ||
      total > MAX_JUMP_M ||
      total < 1 ||
      document.hidden ||
      prefersReducedMotion();

    if (snap) {
      const b = Number.isFinite(endPt.bearing)
        ? endPt.bearing
        : total > 5
        ? bearingDeg(waypoints[waypoints.length - 2], endPt)
        : from.bearing;
      placeAt(endPt.lat, endPt.lng, b, moving);
      if (trail)
        trail.setLatLngs(
          [...base, ...pts.map((q) => [q.lat, q.lng])].slice(-TRAIL_MAX),
        );
      return;
    }

    // Spread the movement over the real GPS gap (slightly less, so we arrive
    // just before the next point comes in).
    const duration = Math.min(MAX_ANIM_MS, Math.max(MIN_ANIM_MS, gapMs * 0.95));
    const start = performance.now();
    let lastTrailDraw = 0;

    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const d = t * total;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const a = waypoints[i - 1];
      const b = waypoints[i];
      const segLen = cum[i] - cum[i - 1];
      const k = segLen > 0 ? (d - cum[i - 1]) / segLen : 1;
      const lat = a.lat + (b.lat - a.lat) * k;
      const lng = a.lng + (b.lng - a.lng) * k;
      const brg =
        segLen > 3
          ? bearingDeg(a, b)
          : Number.isFinite(b.bearing)
          ? b.bearing
          : posRef.current?.bearing;

      placeAt(lat, lng, brg, moving);

      if (trail && (now - lastTrailDraw > TRAIL_REDRAW_MS || t === 1)) {
        lastTrailDraw = now;
        const passed = waypoints.slice(1, i).map((w) => [w.lat, w.lng]);
        trail.setLatLngs([...base, ...passed, [lat, lng]].slice(-TRAIL_MAX));
      }

      if (t < 1) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [vehicle.point, vehicle.motion?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── Map helpers ──────────────────────────────────────────────────────────────
function MapBridge({ onReady }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

function FitOnKey({ fitKey, vehicles, myStop, stops = [] }) {
  const map = useMap();
  const done = useRef(null);
  useEffect(() => {
    if (done.current === fitKey) return;
    const pts = vehicles
      .filter((v) => v.point)
      .map((v) => [v.point.latitude, v.point.longitude]);
    if (myStop?.latitude != null && myStop?.longitude != null)
      pts.push([Number(myStop.latitude), Number(myStop.longitude)]);
    for (const s of stops)
      if (s.latitude != null && s.longitude != null)
        pts.push([Number(s.latitude), Number(s.longitude)]);
    if (!pts.length) return;
    done.current = fitKey;
    if (pts.length === 1) map.setView(pts[0], 15, { animate: false });
    else
      map.fitBounds(L.latLngBounds(pts).pad(0.25), {
        maxZoom: 16,
        animate: false,
      });
  }, [fitKey, vehicles, myStop, stops, map]);
  return null;
}

const STOP_STYLE = {
  PASSED: { fill: "#16A34A", border: "#fff", text: "#fff", size: 22 },
  SKIPPED: { fill: "#E5E7EB", border: "#fff", text: "#6B7280", size: 20 },
  MISSED: { fill: "#FEE2E2", border: "#fff", text: "#B91C1C", size: 20 },
  AT_STOP: { fill: "#F59E0B", border: "#fff", text: "#fff", size: 28 },
  NEXT: { fill: "#4F46E5", border: "#fff", text: "#fff", size: 28 },
  UPCOMING: { fill: "#fff", border: "#475569", text: "#1E293B", size: 22 },
};

const iconCache = new Map();
const SCHOOL_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Zm-7 9.18v4L12 20l7-3.82v-4L12 16l-7-3.82Z"/></svg>';

export function stopNumberIcon(number, state, mine, isSchool = false) {
  const key = `${number}|${state}|${mine ? 1 : 0}|${isSchool ? 1 : 0}`;
  if (iconCache.has(key)) return iconCache.get(key);
  if (isSchool) {
    const done = state === "PASSED";
    const icon = L.divIcon({
      className: "lb-stopnum-wrap",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      tooltipAnchor: [0, -16],
      html: `<div class="lb-school${
        state === "NEXT" ? " is-next" : ""
      }" style="background:${
        done ? "#16A34A" : "#1E1B4B"
      }">${SCHOOL_SVG}</div>`,
    });
    iconCache.set(key, icon);
    return icon;
  }
  const st = STOP_STYLE[state] || STOP_STYLE.UPCOMING;
  const size = mine ? Math.max(st.size, 26) : st.size;
  const ring = mine
    ? "box-shadow:0 0 0 3px #16A34A,0 2px 6px rgba(15,23,42,.35);"
    : "";
  const icon = L.divIcon({
    className: "lb-stopnum-wrap",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -size / 2],
    html: `<div class="lb-stopnum${
      state === "NEXT" || state === "AT_STOP" ? " is-next" : ""
    }" style="width:${size}px;height:${size}px;background:${
      st.fill
    };border-color:${st.border};color:${st.text};${ring}">${
      number ?? ""
    }</div>`,
  });
  iconCache.set(key, icon);
  return icon;
}

export function flagIcon(text, tone) {
  const key = `flag|${text}|${tone}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const icon = L.divIcon({
    className: "lb-flag-wrap",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div class="lb-flag lb-flag-${tone}">${String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</div>`,
  });
  iconCache.set(key, icon);
  return icon;
}

export function StopTooltipBody({ s }) {
  return (
    <div style={{ minWidth: 150, maxWidth: 240 }}>
      <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: "normal" }}>
        {s.isSchool ? "🏫 " : s.number != null ? `${s.number}. ` : ""}
        {s.name}
        {s.isMine ? (
          <span style={{ color: "#16A34A" }}> · Your stop</span>
        ) : null}
      </div>
      {s.landmark && (
        <div style={{ color: "#6B7280", fontSize: 11.5, whiteSpace: "normal" }}>
          {s.landmark}
        </div>
      )}
      {(s.lines || []).map((l, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            color: l.color || "#374151",
            marginTop: i === 0 ? 4 : 1,
            whiteSpace: "normal",
          }}
        >
          {l.text}
        </div>
      ))}
      {!s.lines?.length && (s.label || s.pickupTime) && (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          {s.label || s.pickupTime}
        </div>
      )}
    </div>
  );
}

function MapLegend() {
  const item = (el, label) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {el}
      {label}
    </span>
  );
  const dot = (bg, border = "#fff") => (
    <span
      style={{
        width: 11,
        height: 11,
        borderRadius: "50%",
        background: bg,
        border: `2px solid ${border}`,
        boxShadow: "0 0 0 1px #CBD5E1",
      }}
    />
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 10,
        bottom: 10,
        zIndex: 500,
        background: "rgba(255,255,255,.94)",
        borderRadius: 10,
        padding: "6px 10px",
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 12px",
        fontSize: 11,
        fontWeight: 600,
        color: "#374151",
        boxShadow: "0 2px 8px rgba(15,23,42,.15)",
        maxWidth: "calc(100% - 140px)",
      }}
    >
      {item(dot("#16A34A"), "Passed")}
      {item(dot("#4F46E5"), "Next")}
      {item(dot("#fff", "#475569"), "Upcoming")}
      {item(
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: "#1E1B4B",
          }}
        />,
        "School",
      )}
      {item(
        <span
          style={{
            width: 16,
            height: 4,
            borderRadius: 2,
            background: "#6366F1",
            opacity: 0.6,
          }}
        />,
        "Route",
      )}
    </div>
  );
}

const PALETTE = [
  "#4F46E5",
  "#0891B2",
  "#DB2777",
  "#EA580C",
  "#16A34A",
  "#9333EA",
  "#CA8A04",
  "#DC2626",
];

// ── Main component ───────────────────────────────────────────────────────────
export default function LiveBusMap({
  vehicles = [],
  stops = [],
  myStop = null,
  followId = null,
  fitKey = "init",
  height = "clamp(320px, 55vh, 620px)",
  showLabels = false,
  onSelect,
  popupFor,
  routeGeometry = null,
  legend = false,
  showMyStopPin = true,
}) {
  const [map, setMap] = useState(null);
  const [following, setFollowing] = useState(!!followId);
  const lastPan = useRef(0);
  const followRef = useRef(following);
  followRef.current = following;

  useEffect(() => {
    setFollowing(!!followId);
  }, [followId, fitKey]);

  // Stop following when the user drags the map
  useEffect(() => {
    if (!map) return;
    const stop = (e) => {
      if (e?.originalEvent || e?.type === "dragstart") setFollowing(false);
    };
    map.on("dragstart", stop);
    return () => map.off("dragstart", stop);
  }, [map]);

  // Keep the followed bus in view (pan only when it nears the edge)
  const onFrame = useCallback(
    (id, lat, lng) => {
      if (!map || !followRef.current || id !== followId) return;
      const now = performance.now();
      if (now - lastPan.current < 700) return;
      lastPan.current = now;
      const inner = map.getBounds().pad(-0.25);
      if (!inner.contains([lat, lng]))
        map.panTo([lat, lng], { animate: true, duration: 0.8 });
    },
    [map, followId],
  );

  const recenter = () => {
    const v =
      vehicles.find((x) => x.id === followId) || vehicles.find((x) => x.point);
    if (map && v?.point)
      map.setView(
        [v.point.latitude, v.point.longitude],
        Math.max(map.getZoom(), 15),
        { animate: true },
      );
    setFollowing(true);
  };

  const initial = vehicles.find((v) => v.point)?.point;
  const center = initial
    ? [initial.latitude, initial.longitude]
    : myStop?.latitude != null
    ? [Number(myStop.latitude), Number(myStop.longitude)]
    : DEFAULT_CENTER;

  const stopPts = stops
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => [Number(s.latitude), Number(s.longitude)]);
  const stopKey = stopPts.map((p) => p.join(",")).join(";");
  const hasRoad = Array.isArray(routeGeometry) && routeGeometry.length > 1;
  const routeLine = useMemo(
    () => (hasRoad ? cleanPath(routeGeometry) : curveThrough(stopPts)),
    [hasRoad, routeGeometry, stopKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div
      style={{
        position: "relative",
        zIndex: 0,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #E5E7EB",
      }}
    >
      <style>{`
        .leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow,
        .leaflet-tile-container, .leaflet-map-pane svg, .leaflet-map-pane canvas,
        .leaflet-zoom-box, .leaflet-image-layer, .leaflet-layer { z-index: auto !important; }
        .leaflet-control-container .leaflet-top, .leaflet-control-container .leaflet-bottom { z-index: 400 !important; }

        .lb-veh-wrap, .lb-stop-wrap { background: transparent; border: 0; }
        .lb-veh { position: relative; width: 46px; height: 46px; }
        .lb-badge { position: absolute; inset: 9px; border-radius: 50%; background: var(--c);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 3px #fff, 0 2px 8px rgba(15,23,42,.35); }
        .lb-heading { position: absolute; inset: 0; transition: transform .35s linear; opacity: 0; }
        .lb-heading span { position: absolute; left: 50%; top: -2px; margin-left: -7px;
          border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 11px solid var(--c); }
        .lb-veh.is-moving .lb-heading { opacity: 1; }
        .lb-pulse { position: absolute; inset: 9px; border-radius: 50%; background: var(--c); opacity: 0; }
        .lb-veh.is-moving .lb-pulse { animation: lbPulse 2s ease-out infinite; }
        .is-stale .lb-badge { background: #9CA3AF; }
        .is-stale .lb-heading span { border-bottom-color: #9CA3AF; }
        .is-stale .lb-pulse { animation: none !important; }
        @keyframes lbPulse { 0% { transform: scale(1); opacity: .45 } 100% { transform: scale(2.3); opacity: 0 } }
        .lb-label { font: 700 11px system-ui, sans-serif; padding: 2px 6px; border-radius: 6px; }
        .lb-stopnum-wrap, .lb-flag-wrap { background: transparent; border: 0; }
        .lb-stopnum { box-sizing: border-box; border: 2.5px solid; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font: 800 11px/1 system-ui, sans-serif; box-shadow: 0 2px 6px rgba(15,23,42,.35); cursor: pointer; }
        .lb-school { width: 32px; height: 32px; border-radius: 9px; border: 2.5px solid #fff; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(15,23,42,.4); cursor: pointer; }
        .lb-school.is-next { animation: lbStopPulse 1.8s ease-in-out infinite; }
        .lb-flag-school { background: #1E1B4B; color: #fff; border-color: #1E1B4B; bottom: 22px; }
        .lb-stopnum.is-next { animation: lbStopPulse 1.8s ease-in-out infinite; }
        @keyframes lbStopPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(79,70,229,.45), 0 2px 6px rgba(15,23,42,.35) } 50% { box-shadow: 0 0 0 8px rgba(79,70,229,0), 0 2px 6px rgba(15,23,42,.35) } }
        .lb-flag { position: absolute; left: 0; bottom: 16px; transform: translateX(-50%); white-space: nowrap;
          font: 700 11px system-ui, sans-serif; padding: 3px 8px; border-radius: 8px; pointer-events: none;
          box-shadow: 0 2px 6px rgba(15,23,42,.25); }
        .lb-flag::after { content: ""; position: absolute; left: 50%; top: 100%; margin-left: -5px;
          border: 5px solid transparent; border-top-color: inherit; }
        .lb-flag-next { background: #4F46E5; color: #fff; border-color: #4F46E5; }
        .lb-flag-mine { background: #16A34A; color: #fff; border-color: #16A34A; bottom: 22px; }
        .lb-flag-at { background: #F59E0B; color: #fff; border-color: #F59E0B; }
        .leaflet-tooltip.lb-stop-tip { border-radius: 10px; padding: 8px 10px; border: 0; box-shadow: 0 4px 16px rgba(15,23,42,.2); }
        @media (prefers-reduced-motion: reduce) { .lb-pulse { animation: none !important; } .lb-heading { transition: none; } }
      `}</style>

      <MapContainer
        center={center}
        zoom={14}
        style={{ height, width: "100%" }}
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBridge onReady={setMap} />
        <FitOnKey
          fitKey={fitKey}
          vehicles={vehicles}
          myStop={myStop}
          stops={stops}
        />

        {/* Route line: along the roads when available, otherwise a smooth curve */}
        {routeLine.length > 1 && (
          <>
            <Polyline
              positions={routeLine}
              pathOptions={{
                color: "#fff",
                weight: 8,
                opacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
              }}
            />
            <Polyline
              positions={routeLine}
              pathOptions={{
                color: "#6366F1",
                weight: 4,
                opacity: 0.6,
                lineCap: "round",
                lineJoin: "round",
                dashArray: hasRoad ? null : "8 8",
                interactive: false,
              }}
            />
          </>
        )}

        {/* Numbered stops */}
        {stops
          .filter(
            (s) => !s.isMyStop && s.latitude != null && s.longitude != null,
          )
          .map((s, i) => (
            <Marker
              key={`stop-${s.id}`}
              position={[Number(s.latitude), Number(s.longitude)]}
              icon={stopNumberIcon(
                s.number ?? i + 1,
                s.state || "UPCOMING",
                !!s.isMine,
                !!s.isSchool,
              )}
              zIndexOffset={s.state === "NEXT" || s.isMine ? 600 : 300}
              keyboard={false}
            >
              <Tooltip direction="top" className="lb-stop-tip" opacity={1}>
                <StopTooltipBody s={s} />
              </Tooltip>
            </Marker>
          ))}

        {/* Always-visible labels (next stop / your stop) */}
        {stops
          .filter((s) => s.flag && s.latitude != null && s.longitude != null)
          .map((s) => (
            <Marker
              key={`flag-${s.id}`}
              position={[Number(s.latitude), Number(s.longitude)]}
              icon={flagIcon(
                s.flag,
                s.isMine
                  ? "mine"
                  : s.isSchool
                  ? "school"
                  : s.state === "AT_STOP"
                  ? "at"
                  : "next",
              )}
              interactive={false}
              keyboard={false}
              zIndexOffset={700}
            />
          ))}

        {showMyStopPin &&
          myStop?.latitude != null &&
          myStop?.longitude != null && (
            <Marker
              position={[Number(myStop.latitude), Number(myStop.longitude)]}
              icon={stopIcon}
              zIndexOffset={500}
            >
              <Tooltip direction="top" offset={[0, -36]} permanent>
                {myStop.label || "Your stop"}
              </Tooltip>
            </Marker>
          )}

        {vehicles
          .filter((v) => v.point)
          .map((v, i) => (
            <AnimatedVehicleMarker
              key={v.id}
              vehicle={v}
              color={PALETTE[i % PALETTE.length]}
              showLabel={showLabels}
              onFrame={onFrame}
              onSelect={onSelect}
              popupHtml={popupFor ? popupFor(v) : null}
            />
          ))}
      </MapContainer>

      {legend && <MapLegend />}

      {followId && !following && (
        <button
          onClick={recenter}
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            zIndex: 500,
            padding: "9px 14px",
            borderRadius: 10,
            border: "none",
            background: "#4F46E5",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 4px 14px rgba(79,70,229,.35)",
            cursor: "pointer",
          }}
        >
          Follow bus
        </button>
      )}
    </div>
  );
}
