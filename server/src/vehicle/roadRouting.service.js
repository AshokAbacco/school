// server/src/vehicle/roadRouting.service.js  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// ROAD GEOMETRY — makes map lines follow real roads instead of straight lines.
//
//   getRoadGeometry(stops)   route line through the stops, along roads
//   snapPathToRoads(points)  snaps a recorded GPS path (history) onto roads
//
// Uses an OSRM server. Default is the free public demo (fine for testing and
// light use, results are cached heavily). For production, run your own OSRM or
// point ROUTING_URL at any OSRM-compatible service.
//
//   ROUTING_URL=https://router.project-osrm.org   (default)
//   ROUTING_DISABLED=1                             (turn off → clients draw smooth curves)
//
// Every call is best-effort: on timeout/error it returns null and the client
// falls back to a smooth curve, so tracking never breaks because of routing.
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = (process.env.ROUTING_URL || "https://router.project-osrm.org").replace(/\/+$/, "");
const DISABLED = process.env.ROUTING_DISABLED === "1";
const TIMEOUT_MS = Number(process.env.ROUTING_TIMEOUT_MS || 6000);
const OK_TTL_MS = 7 * 24 * 3600 * 1000;
const FAIL_TTL_MS = 10 * 60 * 1000;
const MATCH_CHUNK = 80;
const MATCH_MAX_POINTS = 320;

const cache = new Map(); // key → { at, ttl, promise }

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function dist(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "school-bus-tracking/1.0" },
    });
    if (!res.ok) throw new Error(`routing HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.promise;
  const entry = { at: Date.now(), ttl: OK_TTL_MS, promise: null };
  entry.promise = fn()
    .then((v) => {
      if (!v) entry.ttl = FAIL_TTL_MS;
      return v;
    })
    .catch((e) => {
      console.warn("[roadRouting]", e.message);
      entry.ttl = FAIL_TTL_MS;
      return null;
    });
  cache.set(key, entry);
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return entry.promise;
}

const fmt = (p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;
const toLatLng = (coords) => coords.map(([lng, lat]) => [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6]);

/**
 * Road path through ordered stops.
 * @param stops [{ latitude, longitude }]  (in travel order)
 * @returns [[lat, lng], ...] | null
 */
export function getRoadGeometry(stops) {
  const pts = (stops || [])
    .map((s) => ({ lat: Number(s.latitude), lng: Number(s.longitude) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0));
  if (DISABLED || pts.length < 2) return Promise.resolve(null);

  const key = `route|${pts.map(fmt).join(";")}`;
  return cached(key, async () => {
    // OSRM handles ~100 waypoints per request; school routes are far below that.
    const coords = pts.slice(0, 100).map(fmt).join(";");
    const j = await getJson(
      `${BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&continue_straight=true`,
    );
    const g = j?.routes?.[0]?.geometry?.coordinates;
    return Array.isArray(g) && g.length > 1 ? toLatLng(g) : null;
  });
}

/**
 * Snap a recorded GPS path onto roads (map matching).
 * @param points  [{ lat, lng, t }]  oldest → newest
 * @param cacheKey stable id, e.g. `${vehicleId}|${date}|${session}`
 * @returns [[lat, lng], ...] | null
 */
export function snapPathToRoads(points, cacheKey) {
  if (DISABLED || !points || points.length < 2) return Promise.resolve(null);

  return cached(`match|${cacheKey}|${points.length}`, async () => {
    // thin to a manageable number of points (≥ 40 m apart)
    const thin = [];
    for (const p of points) {
      if (!thin.length || dist(thin[thin.length - 1], p) >= 40) thin.push(p);
    }
    if (thin[thin.length - 1] !== points[points.length - 1]) thin.push(points[points.length - 1]);
    let use = thin;
    if (use.length > MATCH_MAX_POINTS) {
      const stride = Math.ceil(use.length / MATCH_MAX_POINTS);
      use = use.filter((_, i) => i % stride === 0 || i === use.length - 1);
    }
    if (use.length < 2) return null;

    const out = [];
    let matchedAny = false;
    for (let i = 0; i < use.length - 1; i += MATCH_CHUNK - 1) {
      const chunk = use.slice(i, i + MATCH_CHUNK);
      if (chunk.length < 2) break;
      let piece = null;
      try {
        let lastTs = 0;
        const ts = chunk.map((p) => {
          const s = Math.max(lastTs + 1, Math.floor(p.t / 1000));
          lastTs = s;
          return s;
        });
        const url =
          `${BASE}/match/v1/driving/${chunk.map(fmt).join(";")}` +
          `?overview=full&geometries=geojson&gaps=ignore&tidy=true` +
          `&timestamps=${ts.join(";")}&radiuses=${chunk.map(() => 45).join(";")}`;
        const j = await getJson(url);
        const coords = (j?.matchings || []).flatMap((m) => m.geometry?.coordinates || []);
        if (coords.length > 1) {
          piece = toLatLng(coords);
          matchedAny = true;
        }
      } catch (e) {
        console.warn("[roadRouting] match chunk failed:", e.message);
      }
      if (!piece) piece = chunk.map((p) => [p.lat, p.lng]); // keep raw for this chunk
      if (out.length) piece = piece.slice(1);
      out.push(...piece);
    }
    return matchedAny ? out : null;
  });
}
