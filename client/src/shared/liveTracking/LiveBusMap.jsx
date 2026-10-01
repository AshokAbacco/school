// client/src/shared/liveTracking/LiveBusMap.jsx  (NEW FILE)
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
//   stops       [{ id, name, latitude, longitude, isMyStop }]  (route stops, ordered)
//   myStop      { name, latitude, longitude }                    (highlighted pin)
//   followId    vehicle id to keep in view (parent view)
//   fitKey      change this to re-fit the map to vehicles + stop
//   height      CSS height
//   showLabels  permanent reg-no labels (admin)
//   onSelect    (vehicleId) => void
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  CircleMarker,
  Polyline,
  Marker,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { distanceMeters, bearingDeg, tsOf } from "./liveTracking";

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

function FitOnKey({ fitKey, vehicles, myStop }) {
  const map = useMap();
  const done = useRef(null);
  useEffect(() => {
    if (done.current === fitKey) return;
    const pts = vehicles
      .filter((v) => v.point)
      .map((v) => [v.point.latitude, v.point.longitude]);
    if (myStop?.latitude != null && myStop?.longitude != null)
      pts.push([Number(myStop.latitude), Number(myStop.longitude)]);
    if (!pts.length) return;
    done.current = fitKey;
    if (pts.length === 1) map.setView(pts[0], 15, { animate: false });
    else
      map.fitBounds(L.latLngBounds(pts).pad(0.25), {
        maxZoom: 16,
        animate: false,
      });
  }, [fitKey, vehicles, myStop, map]);
  return null;
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

  const routeLine = stops.map((s) => [Number(s.latitude), Number(s.longitude)]);

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
        <FitOnKey fitKey={fitKey} vehicles={vehicles} myStop={myStop} />

        {/* Route stops (straight dashed line between stops, in route order) */}
        {routeLine.length > 1 && (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: "#94A3B8",
              weight: 3,
              dashArray: "6 8",
              opacity: 0.8,
            }}
          />
        )}
        {stops
          .filter((s) => !s.isMyStop)
          .map((s) => (
            <CircleMarker
              key={s.id}
              center={[Number(s.latitude), Number(s.longitude)]}
              radius={5}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: "#64748B",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {s.name}
                {s.pickupTime ? ` · ${s.pickupTime}` : ""}
              </Tooltip>
            </CircleMarker>
          ))}

        {myStop?.latitude != null && myStop?.longitude != null && (
          <Marker
            position={[Number(myStop.latitude), Number(myStop.longitude)]}
            icon={stopIcon}
            zIndexOffset={500}
          >
            <Tooltip direction="top" offset={[0, -36]} permanent>
              Your stop
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
