// client/src/superAdmin/pages/VehicleTracking/RouteStopsTab.jsx  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// Route stop priority
//   • pick a route, set the ORDER (priority) of its stops:
//       drag ⋮⋮, ▲ / ▼, or type a position number
//   • edit morning pickup / evening drop time per stop
//   • switch a stop off for the route without deleting it
//   • "Auto-arrange" orders stops by distance (farthest from school first,
//     then nearest-next, ending at the school)
//   • see which stops have a wrong / missing map location
//   • live map preview of the order (numbered stops + school)
// Morning pickup runs stop 1 → last stop → School.
// Evening drop runs School → stops in reverse (or by drop time when set).
// Saved with PUT /api/vehicles/routes/:routeId/stops; ETAs update immediately.
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  Wand2,
  AlertTriangle,
  CheckCircle,
  MapPin,
  School,
  Route as RouteIcon,
} from "lucide-react";
import LiveBusMap from "../../../shared/liveTracking/LiveBusMap";
import {
  API_URL,
  fetchJson,
  authHeaders,
  distanceMeters,
} from "../../../shared/liveTracking/liveTracking";

const BASE = `${API_URL}/api/vehicles`;

/** "7:35 AM" / "07:35" / "7:35" → "07:35" (for <input type="time">) */
function toHHMM(v) {
  const m = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?\s*$/i.exec(
    String(v || ""),
  );
  if (!m) return "";
  let h = Number(m[1]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (h > 23) return "";
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

function LocationBadge({ issue, hasLocation }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 99,
    whiteSpace: "nowrap",
  };
  if (issue === "TOO_FAR")
    return (
      <span
        style={{ ...base, color: "#B91C1C", background: "#FEF2F2" }}
        title="More than 60 km from the school — fix it under Transport → Stops"
      >
        <AlertTriangle size={11} /> Wrong location
      </span>
    );
  if (issue === "SWAPPED")
    return (
      <span
        style={{ ...base, color: "#B45309", background: "#FFFBEB" }}
        title="Latitude and longitude were entered the wrong way round — auto-corrected"
      >
        <AlertTriangle size={11} /> Lat/lng swapped
      </span>
    );
  if (!hasLocation)
    return (
      <span style={{ ...base, color: "#B45309", background: "#FFFBEB" }}>
        <MapPin size={11} /> No location
      </span>
    );
  return (
    <span style={{ ...base, color: "#166534", background: "#F0FDF4" }}>
      <CheckCircle size={11} /> On map
    </span>
  );
}

/** farthest-from-school first, then nearest neighbour; unmapped stops keep their place at the end */
function autoArrange(stops, school) {
  const mapped = stops.filter((s) => s.latitude != null);
  const unmapped = stops.filter((s) => s.latitude == null);
  if (mapped.length < 2) return stops;
  const P = (s) => ({ lat: Number(s.latitude), lng: Number(s.longitude) });
  const anchor =
    school?.latitude != null
      ? { lat: Number(school.latitude), lng: Number(school.longitude) }
      : null;

  let remaining = [...mapped];
  let current;
  if (anchor) {
    current = remaining.reduce((a, b) =>
      distanceMeters(P(b), anchor) > distanceMeters(P(a), anchor) ? b : a,
    );
  } else {
    current = remaining[0];
  }
  const out = [current];
  remaining = remaining.filter((s) => s !== current);
  while (remaining.length) {
    const here = P(current);
    current = remaining.reduce((a, b) =>
      distanceMeters(here, P(b)) < distanceMeters(here, P(a)) ? b : a,
    );
    out.push(current);
    remaining = remaining.filter((s) => s !== current);
  }
  return [...out, ...unmapped];
}

export default function RouteStopsTab({ schoolId }) {
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState("");
  const [stops, setStops] = useState([]); // editable copy
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mapKey, setMapKey] = useState("init");
  const dragFrom = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const route = routes.find((r) => r.id === routeId) || null;

  const resetFrom = useCallback((r) => {
    setStops(
      (r?.stops || []).map((s) => ({
        ...s,
        pickupTime: toHHMM(s.pickupTime),
        dropTime: toHHMM(s.dropTime),
      })),
    );
    setMapKey(`${r?.id}-${Date.now()}`);
  }, []);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError("");
    try {
      const d = await fetchJson(
        `${BASE}/routes?schoolId=${encodeURIComponent(schoolId)}`,
      );
      const list = d.data || [];
      setRoutes(list);
      const keep =
        list.find((r) => r.id === routeId) ||
        list.find((r) => r.isActive) ||
        list[0];
      setRouteId(keep?.id || "");
      resetFrom(keep);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const original = useMemo(
    () =>
      (route?.stops || [])
        .map(
          (s) =>
            `${s.routeStopId}|${toHHMM(s.pickupTime)}|${toHHMM(s.dropTime)}|${
              s.isActive
            }`,
        )
        .join(","),
    [route],
  );
  const current = stops
    .map((s) => `${s.routeStopId}|${s.pickupTime}|${s.dropTime}|${s.isActive}`)
    .join(",");
  const dirty = !!route && original !== current;

  const pickRoute = (id) => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?"))
      return;
    setRouteId(id);
    resetFrom(routes.find((r) => r.id === id));
    setNotice("");
  };

  const move = (from, to) => {
    if (to < 0 || to >= stops.length || from === to) return;
    setStops((prev) => {
      const next = [...prev];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });
    setNotice("");
  };
  const update = (i, patch) =>
    setStops((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const save = async () => {
    if (!route) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const d = await fetchJson(`${BASE}/routes/${route.id}/stops`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          stops: stops.map((s) => ({
            routeStopId: s.routeStopId,
            pickupTime: s.pickupTime || null,
            dropTime: s.dropTime || null,
            isActive: s.isActive,
          })),
        }),
      });
      setRoutes((prev) => prev.map((r) => (r.id === d.data.id ? d.data : r)));
      resetFrom(d.data);
      setNotice("Stop priority saved. Live ETAs and maps now use this order.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // map preview (active stops with a valid location, in the current order + school)
  const previewStops = useMemo(() => {
    let n = 0;
    const list = stops
      .filter((s) => s.isActive)
      .map((s) => ({ s, number: ++n }))
      .filter(({ s }) => s.latitude != null)
      .map(({ s, number }) => ({
        id: s.routeStopId,
        number,
        name: s.name,
        landmark: s.landmark,
        latitude: s.latitude,
        longitude: s.longitude,
        state: "UPCOMING",
        lines: [
          s.pickupTime && { text: `Morning pickup ${s.pickupTime}` },
          s.dropTime && { text: `Evening drop ${s.dropTime}` },
        ].filter(Boolean),
      }));
    if (route?.school?.latitude != null)
      list.push({
        id: "school",
        name: route.school.name || "School",
        latitude: route.school.latitude,
        longitude: route.school.longitude,
        state: "UPCOMING",
        isSchool: true,
        flag: "School",
        lines: [{ text: "Morning trip ends here · evening trip starts here" }],
      });
    return list;
  }, [stops, route]);

  const counts = {
    total: stops.length,
    off: stops.filter((s) => !s.isActive).length,
    wrong: stops.filter((s) => s.locationIssue === "TOO_FAR").length,
    missing: stops.filter(
      (s) => s.latitude == null && s.locationIssue !== "TOO_FAR",
    ).length,
  };

  const inp = {
    padding: "6px 8px",
    border: "1.5px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 13,
    background: "#fff",
    color: "#111827",
    minWidth: 0,
  };
  const btn = (bg, color, border = bg) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: bg,
    color,
    border: `1.5px solid ${border}`,
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  });
  const iconBtn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    padding: 0,
  };

  if (!schoolId)
    return (
      <div
        style={{
          color: "#9CA3AF",
          fontSize: 14,
          padding: "30px 0",
          textAlign: "center",
        }}
      >
        Select a school.
      </div>
    );

  return (
    <div
      style={{
        fontFamily: "system-ui,-apple-system,sans-serif",
        color: "#111827",
      }}
    >
      {/* Route picker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <RouteIcon size={16} color="#4F46E5" />
        <select
          value={routeId}
          onChange={(e) => pickRoute(e.target.value)}
          style={{ ...inp, padding: "8px 10px", fontWeight: 600 }}
          aria-label="Route"
        >
          {routes.length === 0 && <option value="">No routes</option>}
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.code ? ` (${r.code})` : ""}
              {r.vehicleNumber ? ` · ${r.vehicleNumber}` : " · no bus"}
              {r.isActive ? "" : " · inactive"}
            </option>
          ))}
        </select>
        {route && (
          <span style={{ fontSize: 12, color: "#6B7280" }}>
            {counts.total} stops{counts.off ? ` · ${counts.off} off` : ""}
            {counts.wrong ? ` · ${counts.wrong} wrong location` : ""}
            {counts.missing ? ` · ${counts.missing} without location` : ""}
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{" "}
          {error}
        </div>
      )}
      {notice && (
        <div
          style={{
            padding: "10px 14px",
            background: "#F0FDF4",
            border: "1px solid #86EFAC",
            color: "#166534",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          ✓ {notice}
        </div>
      )}
      {route && route.school?.latitude == null && (
        <div
          style={{
            padding: "10px 14px",
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            color: "#92400E",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          The school's map location is not set, so routes can't start/end at the
          school. Set School latitude/longitude (or DEFAULT_SCHOOL_LOCATION on
          the server).
        </div>
      )}

      {loading && (
        <div
          style={{ padding: "30px 0", textAlign: "center", color: "#9CA3AF" }}
        >
          Loading routes…
        </div>
      )}

      {!loading && route && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* Editor */}
          <div style={{ flex: "1 1 460px", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <button
                onClick={save}
                disabled={!dirty || saving}
                style={{
                  ...btn(dirty ? "#4F46E5" : "#C7D2FE", "#fff"),
                  cursor: dirty && !saving ? "pointer" : "not-allowed",
                }}
              >
                <Save size={14} /> {saving ? "Saving…" : "Save priority"}
              </button>
              <button
                onClick={() => {
                  setStops((prev) => autoArrange(prev, route.school));
                  setNotice("");
                }}
                style={btn("#fff", "#4338CA", "#C7D2FE")}
                title="Farthest stop from the school first, then the nearest next stop"
              >
                <Wand2 size={14} /> Auto-arrange by distance
              </button>
              <button
                onClick={() => resetFrom(route)}
                disabled={!dirty}
                style={{
                  ...btn("#fff", "#374151", "#E5E7EB"),
                  opacity: dirty ? 1 : 0.5,
                }}
              >
                <RotateCcw size={14} /> Undo changes
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
              Priority 1 is the first pickup in the morning. Drag{" "}
              <GripVertical size={12} style={{ verticalAlign: "middle" }} />,
              use ▲ ▼, or type a position.
            </div>

            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {stops.map((s, i) => (
                <div
                  key={s.routeStopId}
                  draggable
                  onDragStart={() => (dragFrom.current = i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(i);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom.current != null) move(dragFrom.current, i);
                    dragFrom.current = null;
                    setDragOver(null);
                  }}
                  onDragEnd={() => {
                    dragFrom.current = null;
                    setDragOver(null);
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 54px minmax(0,1fr)",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderBottom: "1px solid #F3F4F6",
                    background:
                      dragOver === i
                        ? "#EEF2FF"
                        : s.isActive
                        ? "#fff"
                        : "#F9FAFB",
                    opacity: s.isActive ? 1 : 0.6,
                  }}
                >
                  <GripVertical
                    size={16}
                    color="#9CA3AF"
                    style={{ cursor: "grab" }}
                    aria-hidden
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <input
                      key={`${s.routeStopId}-${i}`}
                      type="number"
                      min={1}
                      max={stops.length}
                      defaultValue={i + 1}
                      onBlur={(e) => {
                        const to =
                          Math.min(
                            stops.length,
                            Math.max(1, Number(e.target.value) || i + 1),
                          ) - 1;
                        if (to !== i) move(i, to);
                        else e.target.value = i + 1;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      style={{
                        ...inp,
                        width: 48,
                        textAlign: "center",
                        fontWeight: 800,
                        padding: "4px 2px",
                      }}
                      aria-label={`Priority of ${s.name}`}
                    />
                    <div style={{ display: "flex", gap: 2 }}>
                      <button
                        style={iconBtn}
                        onClick={() => move(i, i - 1)}
                        disabled={i === 0}
                        aria-label="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        style={iconBtn}
                        onClick={() => move(i, i + 1)}
                        disabled={i === stops.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        {s.name}
                      </span>
                      <LocationBadge
                        issue={s.locationIssue}
                        hasLocation={s.latitude != null}
                      />
                      {!s.stopIsActive && (
                        <span style={{ fontSize: 11, color: "#B45309" }}>
                          (stop disabled in Transport)
                        </span>
                      )}
                    </div>
                    {s.landmark && (
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                        {s.landmark}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 6,
                        alignItems: "center",
                      }}
                    >
                      <label
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        Pickup
                        <input
                          type="time"
                          value={s.pickupTime}
                          onChange={(e) =>
                            update(i, { pickupTime: e.target.value })
                          }
                          style={inp}
                        />
                      </label>
                      <label
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        Drop
                        <input
                          type="time"
                          value={s.dropTime}
                          onChange={(e) =>
                            update(i, { dropTime: e.target.value })
                          }
                          style={inp}
                        />
                      </label>
                      <label
                        style={{
                          fontSize: 12,
                          color: "#374151",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={s.isActive}
                          onChange={(e) =>
                            update(i, { isActive: e.target.checked })
                          }
                        />
                        Bus stops here
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#EEF2FF",
                }}
              >
                <School size={16} color="#1E1B4B" />
                <span
                  style={{ fontWeight: 700, fontSize: 13, color: "#1E1B4B" }}
                >
                  {route.school?.name || "School"}
                </span>
                <span style={{ fontSize: 12, color: "#4338CA" }}>
                  morning trip ends here · evening trip starts here
                </span>
              </div>
            </div>
            {dirty && (
              <div style={{ fontSize: 12, color: "#B45309", marginTop: 8 }}>
                Unsaved changes — click “Save priority”.
              </div>
            )}
          </div>

          {/* Map preview */}
          <div style={{ flex: "1 1 360px", minWidth: 0 }}>
            <LiveBusMap
              stops={previewStops}
              fitKey={mapKey}
              legend
              height="clamp(320px, 55vh, 560px)"
            />
            <div style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 6 }}>
              Preview of the order. Stops with a wrong or missing location are
              not drawn — fix them under Transport → Stops.
            </div>
          </div>
        </div>
      )}

      {!loading && !route && !error && (
        <div
          style={{
            color: "#9CA3AF",
            fontSize: 14,
            padding: "30px 0",
            textAlign: "center",
          }}
        >
          No transport routes for this school yet.
        </div>
      )}
    </div>
  );
}
