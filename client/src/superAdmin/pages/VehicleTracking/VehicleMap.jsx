// client/src/superAdmin/pages/VehicleTracking/VehicleMap.jsx  (UPDATED)
// Thin wrapper over the shared animated LiveBusMap so the admin dashboard gets
// the same smooth, real-time markers as the parent app.

import React from "react";
import LiveBusMap from "../../../shared/liveTracking/LiveBusMap";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ]),
  );

const popupFor = (v) => {
  const p = v.point || {};
  return `
    <div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;min-width:160px">
      <strong style="font-size:14px">${esc(v.regNo)}</strong>
      ${
        v.vehicleName
          ? `<div style="color:#6B7280">${esc(v.vehicleName)}</div>`
          : ""
      }
      <div>Type: <b>${esc(v.vehicleType || "—")}</b></div>
      <div>Speed: <b>${p.speed != null ? Math.round(p.speed) : 0} km/h</b></div>
      ${
        p.address
          ? `<div style="color:#166534;margin-top:4px">${esc(p.address)}</div>`
          : ""
      }
    </div>`;
};

/**
 * @param vehicles  [{ id, regNo, vehicleName, vehicleType, point, motion, initialTrail }]
 */
export default function VehicleMap({
  vehicles = [],
  fitKey = "init",
  onSelect,
  height,
}) {
  return (
    <LiveBusMap
      vehicles={vehicles}
      fitKey={fitKey}
      showLabels
      onSelect={onSelect}
      popupFor={popupFor}
      height={height || "clamp(320px, 50vw, 620px)"}
    />
  );
}
