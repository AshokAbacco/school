// server/src/vehicle/routeEta.service.js  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// STOP-BY-STOP ETA ENGINE
//
// Uses the stops admins already add under Transport:
//   TransportRoute.vehicleNumber  ── matched to ──  SchoolVehicle.regNo
//   TransportRouteStop(stopOrder, pickupTime, dropTime) → TransportStop(lat, lng)
//
// For every bus it works out, for TODAY's trip:
//   • which session is running        PICKUP (morning) / DROP (evening)
//   • which stops were already reached (actual arrival / departure from GPS)
//   • the next stop and its ETA        (from the bus's current position)
//   • expected arrival + departure for every remaining stop
//   • early / on-time / delayed        (vs the pickup/drop time set by admin)
//   • average travel time to each stop (learned from the last 7 days of GPS)
//
// Averages fall back gracefully when there's no history yet:
//   history (median of past trips) → schedule gaps → distance ÷ 20 km/h
//
// The SCHOOL is added as the route's end point (morning pickup) and start
// point (evening drop). Its location comes from School.latitude/longitude, or
// from SCHOOL_LOCATIONS in .env:  SCHOOL_LOCATIONS={"<school code or id>":[14.6875,77.6177]}
// or, as a last resort, DEFAULT_SCHOOL_LOCATION=14.687526894282593,77.61770838715896
// (the default is only used for routes whose stops are within 60 km of it).
//
// Stop coordinates are validated: swapped lat/lng are corrected automatically,
// and stops far away from the school are ignored (they used to draw lines
// across the country).
//
// Nothing is stored — everything is derived from existing tables and cached
// in memory (ETA 10 s, routes 60 s, history averages 1 h).
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";
import {
  normalizeRegNo,
  getLatestPoint,
  getPointsBetween,
} from "./liveTracking.service.js";

// ── Tunables ─────────────────────────────────────────────────────────────────
const ARRIVE_RADIUS_M = Number(process.env.ETA_STOP_RADIUS_M || 150);
const LEAVE_RADIUS_M = ARRIVE_RADIUS_M * 1.4; // hysteresis so GPS jitter ≠ departure
const LOOKAHEAD_STOPS = 3; // a bus may skip up to 3 stops (no students)
const MAX_INTERP_GAP_MS = 10 * 60 * 1000; // don't interpolate across long GPS gaps
const HISTORY_DAYS = Number(process.env.ETA_HISTORY_DAYS || 7);
const HISTORY_TTL_MS = 60 * 60 * 1000;
const ROUTE_TTL_MS = 60 * 1000;
const ETA_TTL_MS = Math.max(1, Number(process.env.ETA_CACHE_SEC || 10)) * 1000;
// TEST MODE (simulator): trust the bus's current speed immediately so a route
// compressed into a few minutes gets matching ETAs. Never enable in production.
const TEST_MODE = process.env.ETA_TEST_MODE === "1";
// Every stop is planned with at least this much stop time (boarding/alighting)
const MIN_DWELL_MS = Number(process.env.ETA_MIN_STOP_MIN || 2) * 60 * 1000;
const DEFAULT_DWELL_MS = MIN_DWELL_MS;
// Stops further than this from the school (or from the other stops) are
// treated as wrongly entered and ignored on the map / in ETAs.
const MAX_STOP_DISTANCE_M = Number(process.env.ETA_MAX_STOP_KM || 60) * 1000;
const FALLBACK_KMH = 20;
const ROAD_FACTOR = 1.35; // straight line → road distance
const ON_TIME_MIN = 2; // ±2 min counts as on time
const LIVE_MAX_AGE_SEC = 15 * 60; // older GPS than this → ETA not "live"
const SESSION_PAD_MIN = 90;

const IST_OFFSET_MS = 330 * 60 * 1000;

// ── Time helpers (all schedule times are IST wall-clock "HH:MM") ─────────────
const istDayStartMs = (ms) => {
  const d = new Date(ms + IST_OFFSET_MS);
  return (
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
    IST_OFFSET_MS
  );
};
const istMinuteOfDay = (ms) => Math.floor((ms - istDayStartMs(ms)) / 60000);

/** "07:35", "7:35", "7:35 AM", "19:05:00" → minutes after midnight */
export function parseClock(s) {
  const m = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?\s*$/i.exec(
    String(s ?? ""),
  );
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);
const round1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : null);
const toMin = (ms) => (Number.isFinite(ms) ? round1(ms / 60000) : null);

// ── Geo helpers ──────────────────────────────────────────────────────────────
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

/** Closest approach of segment a→b to point s (local flat projection). */
function closestOnSegment(a, b, s) {
  const ky = (Math.PI / 180) * R;
  const kx = ky * Math.cos(rad(s.lat));
  const ax = (a.lng - s.lng) * kx;
  const ay = (a.lat - s.lat) * ky;
  const bx = (b.lng - s.lng) * kx;
  const by = (b.lat - s.lat) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0;
  return { dist: Math.hypot(ax + t * dx, ay + t * dy), frac: t };
}

const toGeo = (p) => ({
  lat: Number(p.latitude),
  lng: Number(p.longitude),
  t: p.ts ? Date.parse(p.ts) : 0,
  speed: p.speed ?? null,
});

const median = (arr) => {
  if (!arr?.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Route lookup  (vehicle ↔ TransportRoute by registration number)
// ═══════════════════════════════════════════════════════════════════════════════
const routeCache = new Map(); // schoolId → { at, routes }

async function getSchoolRoutes(schoolId) {
  const hit = routeCache.get(schoolId);
  if (hit && Date.now() - hit.at < ROUTE_TTL_MS) return hit.routes;

  const routes = await prisma.transportRoute.findMany({
    where: { schoolId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      code: true,
      vehicleNumber: true,
      driverName: true,
      driverPhone: true,
      routeStops: {
        where: { isActive: true },
        orderBy: { stopOrder: "asc" },
        select: {
          id: true,
          stopOrder: true,
          pickupTime: true,
          dropTime: true,
          distanceKm: true,
          stop: {
            select: {
              id: true,
              name: true,
              landmark: true,
              area: true,
              latitude: true,
              longitude: true,
              isActive: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });

  const school = await getSchoolLocation(schoolId);
  const clean = routes.map((r) => {
    const routeStops = r.routeStops.filter(
      (rs) => rs.stop && !rs.stop.deletedAt,
    );
    const sc = schoolForRoute(routeStops, school);
    return {
      ...r,
      regKey: normalizeRegNo(r.vehicleNumber),
      routeStops,
      school: sc,
      coords: validateStopCoords(routeStops, sc),
    };
  });
  routeCache.set(schoolId, { at: Date.now(), routes: clean });
  return clean;
}

// ── School location ──────────────────────────────────────────────────────────
let envSchoolLocations = null;
function schoolLocationsFromEnv() {
  if (envSchoolLocations) return envSchoolLocations;
  envSchoolLocations = {};
  try {
    const raw = process.env.SCHOOL_LOCATIONS;
    if (raw) envSchoolLocations = JSON.parse(raw);
  } catch (e) {
    console.error("[routeEta] SCHOOL_LOCATIONS is not valid JSON:", e.message);
  }
  return envSchoolLocations;
}

export async function getSchoolLocation(schoolId) {
  let school = null;
  try {
    school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        latitude: true,
        longitude: true,
      },
    });
  } catch {
    // latitude/longitude columns not migrated yet → fall back to name only
    school = await prisma.school
      .findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, code: true },
      })
      .catch(() => null);
  }
  let lat = school?.latitude != null ? Number(school.latitude) : null;
  let lng = school?.longitude != null ? Number(school.longitude) : null;
  if (!validLatLng(lat, lng)) {
    const env = schoolLocationsFromEnv();
    const v = env[schoolId] || (school?.code && env[school.code]);
    if (Array.isArray(v) && validLatLng(Number(v[0]), Number(v[1]))) {
      lat = Number(v[0]);
      lng = Number(v[1]);
    } else {
      const [dLat, dLng] = String(process.env.DEFAULT_SCHOOL_LOCATION || "")
        .split(",")
        .map((x) => Number(x.trim()));
      if (validLatLng(dLat, dLng)) {
        return {
          id: schoolId,
          name: school?.name || "School",
          lat: dLat,
          lng: dLng,
          hasLocation: true,
          isDefault: true,
        };
      }
      lat = null;
      lng = null;
    }
  }
  return {
    id: schoolId,
    name: school?.name || "School",
    lat,
    lng,
    hasLocation: lat != null,
  };
}

const validLatLng = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  !(lat === 0 && lng === 0) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

/**
 * Validated coordinates per routeStop id:
 *   { lat, lng, hasLocation, fixed?: "SWAPPED", invalid?: "TOO_FAR" | "MISSING" }
 * Anchor = school location, else the median of the route's stops.
 */
/** The default school location is only trusted when the route's stops are near it. */
export function schoolForRoute(routeStops, school) {
  if (!school?.isDefault) return school;
  const ok = routeStops
    .map((rs) => ({
      lat: Number(rs.stop.latitude),
      lng: Number(rs.stop.longitude),
    }))
    .filter((p) => validLatLng(p.lat, p.lng));
  const mid = ok.length
    ? { lat: median(ok.map((p) => p.lat)), lng: median(ok.map((p) => p.lng)) }
    : null;
  if (!mid || dist(mid, school) > MAX_STOP_DISTANCE_M)
    return { ...school, lat: null, lng: null, hasLocation: false };
  return school;
}

export function validateStopCoords(routeStops, school) {
  const raw = routeStops.map((rs) => ({
    id: rs.id,
    lat: rs.stop.latitude != null ? Number(rs.stop.latitude) : null,
    lng: rs.stop.longitude != null ? Number(rs.stop.longitude) : null,
  }));

  let anchor = school?.hasLocation
    ? { lat: school.lat, lng: school.lng }
    : null;
  if (!anchor) {
    const ok = raw.filter((p) => validLatLng(p.lat, p.lng));
    if (ok.length)
      anchor = {
        lat: median(ok.map((p) => p.lat)),
        lng: median(ok.map((p) => p.lng)),
      };
  }

  const out = new Map();
  for (const p of raw) {
    if (!validLatLng(p.lat, p.lng) && !validLatLng(p.lng, p.lat)) {
      out.set(p.id, {
        lat: null,
        lng: null,
        hasLocation: false,
        invalid: "MISSING",
      });
      continue;
    }
    if (!anchor) {
      out.set(p.id, { lat: p.lat, lng: p.lng, hasLocation: true });
      continue;
    }
    const near =
      validLatLng(p.lat, p.lng) && dist(p, anchor) <= MAX_STOP_DISTANCE_M;
    if (near) {
      out.set(p.id, { lat: p.lat, lng: p.lng, hasLocation: true });
      continue;
    }
    const swapped = { lat: p.lng, lng: p.lat };
    if (
      validLatLng(swapped.lat, swapped.lng) &&
      dist(swapped, anchor) <= MAX_STOP_DISTANCE_M
    ) {
      out.set(p.id, { ...swapped, hasLocation: true, fixed: "SWAPPED" });
      continue;
    }
    out.set(p.id, {
      lat: p.lat,
      lng: p.lng,
      hasLocation: false,
      invalid: "TOO_FAR",
    });
  }
  return out;
}

/** Route assigned to this bus (TransportRoute.vehicleNumber == regNo). */
export async function findRouteForVehicle(vehicle) {
  if (!vehicle?.schoolId || !vehicle?.regNo) return null;
  const key = normalizeRegNo(vehicle.regNo);
  const routes = await getSchoolRoutes(vehicle.schoolId);
  return routes.find((r) => r.regKey && r.regKey === key) || null;
}

/** Light summary for the "Manage Vehicles" table. */
export async function routeSummaryForVehicle(vehicle) {
  const r = await findRouteForVehicle(vehicle);
  if (!r) return null;
  const c = [...r.coords.values()];
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    stopCount: r.routeStops.length,
    stopsWithLocation: c.filter((x) => x.hasLocation).length,
    stopsTooFar: c.filter((x) => x.invalid === "TOO_FAR").length,
    stopsSwapped: c.filter((x) => x.fixed === "SWAPPED").length,
    schoolLocationSet: !!r.school?.hasLocation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session (morning pickup / evening drop) + ordered stop list
// ═══════════════════════════════════════════════════════════════════════════════
function sessionWindow(times) {
  if (!times.length) return null;
  return {
    start: Math.min(...times) - SESSION_PAD_MIN,
    end: Math.max(...times) + SESSION_PAD_MIN,
    mid: (Math.min(...times) + Math.max(...times)) / 2,
  };
}

const DEFAULT_WINDOWS = {
  PICKUP: { start: 5 * 60, end: 11 * 60 },
  DROP: { start: 12 * 60, end: 19 * 60 + 30 },
};

function routeWindows(route) {
  const pick = route.routeStops
    .map((s) => parseClock(s.pickupTime))
    .filter((n) => n != null);
  const drop = route.routeStops
    .map((s) => parseClock(s.dropTime))
    .filter((n) => n != null);
  return { pw: sessionWindow(pick), dw: sessionWindow(drop) };
}

function pickSession(route, nowMin) {
  const { pw, dw } = routeWindows(route);
  const inP = pw && nowMin >= pw.start && nowMin <= pw.end;
  const inD = dw && nowMin >= dw.start && nowMin <= dw.end;

  let session;
  if (inP && !inD) session = "PICKUP";
  else if (inD && !inP) session = "DROP";
  else if (inP && inD)
    session =
      Math.abs(nowMin - pw.mid) <= Math.abs(nowMin - dw.mid)
        ? "PICKUP"
        : "DROP";
  else session = nowMin < 13 * 60 ? "PICKUP" : "DROP";

  const win = (session === "PICKUP" ? pw : dw) || DEFAULT_WINDOWS[session];
  return {
    session,
    window: win,
    inWindow: session === "PICKUP" ? !!inP : !!inD,
  };
}

function schoolStop(route, session) {
  const sc = route.school;
  if (!sc?.hasLocation) return null;
  return {
    routeStopId: `school-${route.id}`,
    stopId: `school-${sc.id}`,
    name: sc.name || "School",
    landmark:
      session === "PICKUP" ? "Trip ends at school" : "Trip starts from school",
    stopOrder: session === "PICKUP" ? 1e6 : -1,
    lat: sc.lat,
    lng: sc.lng,
    hasLocation: true,
    scheduledTime: null,
    scheduledMin: null,
    isSchool: true,
  };
}

function orderedStops(route, session) {
  const sorted = orderedRouteStops(route, session);
  const sc = schoolStop(route, session);
  if (!sc) return sorted;
  return session === "PICKUP" ? [...sorted, sc] : [sc, ...sorted];
}

function orderedRouteStops(route, session) {
  const list = route.routeStops.map((rs) => {
    const c = route.coords?.get(rs.id) || {};
    const lat = c.lat ?? null;
    const lng = c.lng ?? null;
    const hasLocation = !!c.hasLocation;
    const timeStr = session === "PICKUP" ? rs.pickupTime : rs.dropTime;
    return {
      locationIssue: c.invalid || c.fixed || null,
      routeStopId: rs.id,
      stopId: rs.stop.id,
      name: rs.stop.name,
      landmark: rs.stop.landmark || rs.stop.area || null,
      stopOrder: rs.stopOrder,
      lat,
      lng,
      hasLocation,
      scheduledTime: timeStr || null,
      scheduledMin: parseClock(timeStr),
    };
  });

  if (session === "PICKUP")
    return list.sort((a, b) => a.stopOrder - b.stopOrder);

  // DROP: follow drop times when most stops have one, otherwise reverse order
  const timed = list.filter((s) => s.scheduledMin != null).length;
  if (timed >= Math.ceil(list.length / 2))
    return list.sort(
      (a, b) =>
        (a.scheduledMin ?? Infinity) - (b.scheduledMin ?? Infinity) ||
        b.stopOrder - a.stopOrder,
    );
  return list.sort((a, b) => b.stopOrder - a.stopOrder);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Visit matcher — walks a GPS trail and records when each stop was reached/left.
// Works with sparse provider data (1 point/min) by checking the closest approach
// of every trail segment, not just the raw points.
// ═══════════════════════════════════════════════════════════════════════════════
function matchVisits(points, stops) {
  const visits = stops.map(() => null); // { arrivedAt, departedAt, skipped }
  let next = 0;
  let inside = -1;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev =
      i > 0 && p.t - points[i - 1].t <= MAX_INTERP_GAP_MS
        ? points[i - 1]
        : null;

    if (inside >= 0) {
      if (dist(p, stops[inside]) <= LEAVE_RADIUS_M) continue;
      visits[inside].departedAt = prev ? prev.t + (p.t - prev.t) / 2 : p.t;
      inside = -1;
    }
    if (next >= stops.length) continue;

    const last = Math.min(stops.length - 1, next + LOOKAHEAD_STOPS);
    for (let j = next; j <= last; j++) {
      const s = stops[j];
      let hit = null;
      if (prev) {
        const c = closestOnSegment(prev, p, s);
        if (c.dist <= ARRIVE_RADIUS_M)
          hit = {
            t: prev.t + (p.t - prev.t) * c.frac,
            insideNow: dist(p, s) <= ARRIVE_RADIUS_M,
          };
      } else if (dist(p, s) <= ARRIVE_RADIUS_M) {
        hit = { t: p.t, insideNow: true };
      }
      if (!hit) continue;

      for (let k = next; k < j; k++) visits[k] = visits[k] || { skipped: true };
      visits[j] = {
        arrivedAt: hit.t,
        departedAt: hit.insideNow ? null : hit.t,
      };
      inside = hit.insideNow ? j : -1;
      next = j + 1;
      break;
    }
  }
  return { visits, inside, next };
}

/** Bus position projected onto the stop polyline (fallback when no visits). */
function projectOnRoute(pos, stops) {
  let best = null;
  for (let i = 0; i < stops.length - 1; i++) {
    const c = closestOnSegment(stops[i], stops[i + 1], pos);
    if (!best || c.dist < best.dist) best = { seg: i, ...c };
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Historical averages (median of the last HISTORY_DAYS trips, same session)
// ═══════════════════════════════════════════════════════════════════════════════
const historyCache = new Map(); // key → { at, promise }

async function computeHistory(vehicle, geoStops, window) {
  const n = geoStops.length;
  const segSamples = Array.from({ length: n }, () => []); // i → i+1
  const dwellSamples = Array.from({ length: n }, () => []);
  let tripDays = 0;
  const today = istDayStartMs(Date.now());

  for (let d = 1; d <= HISTORY_DAYS; d++) {
    const day = today - d * 86400000;
    const from = new Date(day + window.start * 60000);
    const to = new Date(day + window.end * 60000);
    const raw = await getPointsBetween(vehicle, from, to, {
      limit: 6000,
      newest: false,
    }).catch(() => []);
    if (raw.length < 5) continue;

    const { visits } = matchVisits(raw.map(toGeo), geoStops);
    let used = false;
    for (let i = 0; i < n; i++) {
      const v = visits[i];
      const w = visits[i + 1];
      if (v && !v.skipped && v.departedAt && w && !w.skipped && w.arrivedAt) {
        const dur = w.arrivedAt - v.departedAt;
        if (dur > 0 && dur < 60 * 60000) {
          segSamples[i].push(dur);
          used = true;
        }
      }
      if (
        i > 0 &&
        i < n - 1 &&
        v &&
        !v.skipped &&
        v.arrivedAt &&
        v.departedAt
      ) {
        const dw = v.departedAt - v.arrivedAt;
        if (dw >= 0 && dw < 15 * 60000) dwellSamples[i].push(dw);
      }
    }
    if (used) tripDays += 1;
  }

  return {
    tripDays,
    segMs: segSamples.map((s) => (s.length ? median(s) : null)),
    segSamples: segSamples.map((s) => s.length),
    dwellMs: dwellSamples.map((s) => (s.length ? median(s) : null)),
  };
}

function getHistory(vehicle, route, session, geoStops, window) {
  const key = `${vehicle.id}|${route.id}|${session}|${geoStops.map((s) => s.routeStopId).join(",")}`;
  const hit = historyCache.get(key);
  if (hit && Date.now() - hit.at < HISTORY_TTL_MS) return hit.promise;
  const promise = computeHistory(vehicle, geoStops, window).catch((e) => {
    console.error("[routeEta] history failed:", e.message);
    historyCache.delete(key);
    return null;
  });
  historyCache.set(key, { at: Date.now(), promise });
  return promise;
}

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

// ═══════════════════════════════════════════════════════════════════════════════
// Main: ETA for one vehicle
// ═══════════════════════════════════════════════════════════════════════════════
async function resolveRoute(vehicle, routeId) {
  if (routeId) {
    const routes = await getSchoolRoutes(vehicle.schoolId);
    const r = routes.find((x) => x.id === routeId);
    if (r) return r;
  }
  return findRouteForVehicle(vehicle);
}

/** Route stops in stopOrder with coordinates — for drawing the route line. */
export async function getRouteStopsForMap(vehicleOrSchool, routeId) {
  const schoolId = vehicleOrSchool.schoolId;
  const routes = await getSchoolRoutes(schoolId);
  const r = routes.find((x) => x.id === routeId);
  if (!r) return [];
  // Morning order (stop 1 … last stop → school). Only validated coordinates.
  const list = r.routeStops
    .slice()
    .sort((a, b) => a.stopOrder - b.stopOrder)
    .map((rs) => {
      const c = r.coords.get(rs.id) || {};
      return {
        routeStopId: rs.id,
        stopId: rs.stop.id,
        name: rs.stop.name,
        landmark: rs.stop.landmark || rs.stop.area || null,
        stopOrder: rs.stopOrder,
        pickupTime: rs.pickupTime || null,
        dropTime: rs.dropTime || null,
        latitude: c.hasLocation ? c.lat : null,
        longitude: c.hasLocation ? c.lng : null,
        locationIssue: c.invalid || c.fixed || null,
      };
    });
  const sc = schoolStop(r, "PICKUP");
  if (sc)
    list.push({
      routeStopId: sc.routeStopId,
      stopId: sc.stopId,
      name: sc.name,
      landmark: "School",
      stopOrder: sc.stopOrder,
      pickupTime: null,
      dropTime: null,
      latitude: sc.lat,
      longitude: sc.lng,
      isSchool: true,
    });
  return list;
}

async function computeVehicleEtaUncached(vehicle, { latest, routeId } = {}) {
  const now = Date.now();
  const base = {
    vehicleId: vehicle.id,
    regNo: vehicle.regNo,
    generatedAt: iso(now),
  };

  const route = await resolveRoute(vehicle, routeId);
  if (!route)
    return {
      ...base,
      route: null,
      reason: "NO_ROUTE",
      message: `No active route has vehicle number ${vehicle.regNo}. Set it on the route in Transport → Routes.`,
      stops: [],
    };

  const nowMin = istMinuteOfDay(now);
  const dayStart = istDayStartMs(now);
  const { session, window, inWindow } = pickSession(route, nowMin);
  const stops = orderedStops(route, session);
  const geo = stops.filter((s) => s.hasLocation);

  const routeInfo = {
    id: route.id,
    name: route.name,
    code: route.code,
    driverName: route.driverName || null,
    driverPhone: route.driverPhone || null,
  };

  if (!geo.length)
    return {
      ...base,
      route: routeInfo,
      session,
      reason: "NO_STOP_LOCATIONS",
      message:
        "Stops on this route have no map location yet. Add latitude/longitude to the stops.",
      tripState: "UNKNOWN",
      stops: stops.map((s) => publicStop(s, { state: "UPCOMING" }, dayStart)),
    };

  latest = latest ?? (await getLatestPoint(vehicle).catch(() => null));
  const live =
    latest && latest.ageSec != null && latest.ageSec <= LIVE_MAX_AGE_SEC;

  // Today's trail since the session window opened (max 4 h back)
  const tripFrom = Math.max(dayStart + window.start * 60000, now - 4 * 3600000);
  const trailRaw =
    tripFrom < now
      ? await getPointsBetween(vehicle, new Date(tripFrom), new Date(now), {
          limit: 5000,
        }).catch(() => [])
      : [];
  const trail = trailRaw.map(toGeo).filter((p) => p.t);
  if (latest && (!trail.length || toGeo(latest).t > trail[trail.length - 1].t))
    trail.push(toGeo(latest));

  let { visits, inside, next } = matchVisits(trail, geo);
  const anyVisit = visits.some((v) => v && !v.skipped);

  // No stop reached yet but the bus is clearly mid-route (e.g. tracking started late)
  let assumedPassed = 0;
  if (!anyVisit && live && geo.length > 1) {
    const pr = projectOnRoute(toGeo(latest), geo);
    if (pr && pr.dist < 800 && (pr.seg > 0 || pr.frac > 0.25)) {
      next = pr.seg + 1;
      assumedPassed = next;
      for (let k = 0; k < next; k++)
        visits[k] = { skipped: true, assumed: true };
    }
  }

  // ── Average segment + dwell times ─────────────────────────────────────────
  const history = await withTimeout(
    getHistory(vehicle, route, session, geo, window),
    3500,
  );
  const segEst = [];
  const segSource = [];
  for (let i = 0; i < geo.length - 1; i++) {
    const a = geo[i];
    const b = geo[i + 1];
    let ms = history?.segMs?.[i] ?? null;
    let src = ms != null ? "history" : null;
    if (
      ms == null &&
      a.scheduledMin != null &&
      b.scheduledMin != null &&
      b.scheduledMin > a.scheduledMin
    ) {
      ms = (b.scheduledMin - a.scheduledMin) * 60000;
      src = "schedule";
    }
    if (ms == null) {
      ms = ((dist(a, b) * ROAD_FACTOR) / 1000 / FALLBACK_KMH) * 3600000;
      src = "distance";
    }
    segEst.push(Math.max(30000, ms));
    segSource.push(src);
  }
  // at least MIN_DWELL_MS at every real stop; the school terminal has none
  const dwellEst = geo.map((g, i) =>
    g.isSchool
      ? 0
      : Math.max(MIN_DWELL_MS, history?.dwellMs?.[i] ?? DEFAULT_DWELL_MS),
  );

  // ── Pace: how fast is the bus running today vs. the averages? ─────────────
  // Median of (actual ÷ expected) over the last 3 completed segments today.
  // A bus stuck in traffic gets later ETAs, a quick one earlier ETAs.
  let pace = 1;
  const ratios = [];
  for (let i = 1; i < geo.length; i++) {
    const a = visits[i - 1];
    const b = visits[i];
    if (a && !a.skipped && a.departedAt && b && !b.skipped && b.arrivedAt) {
      const actual = b.arrivedAt - a.departedAt;
      if (actual > 0) ratios.push(actual / segEst[i - 1]);
    }
  }
  if (ratios.length) pace = median(ratios.slice(-3));
  if (
    TEST_MODE &&
    live &&
    (Number(latest?.speed) || 0) > 8 &&
    next > 0 &&
    next < geo.length
  ) {
    // speed-based pace on the segment the bus is driving now
    const segMs =
      (dist(geo[next - 1], geo[next]) / (Number(latest.speed) / 3.6)) * 1000;
    pace = segMs / segEst[next - 1];
  }
  pace = TEST_MODE
    ? Math.min(3, Math.max(0.005, pace))
    : Math.min(2.5, Math.max(0.5, pace));
  const segLive = segEst.map((ms) => ms * pace);
  const dwellLive = dwellEst.map((ms) => (TEST_MODE ? ms * pace : ms));

  // ── Trip state ────────────────────────────────────────────────────────────
  const allDone = next >= geo.length && inside < 0;
  let tripState;
  if (allDone && anyVisit) tripState = "COMPLETED";
  else if (!live) tripState = anyVisit ? "NO_SIGNAL" : "NOT_STARTED";
  else if (anyVisit || assumedPassed || inWindow) tripState = "IN_PROGRESS";
  else tripState = "NOT_STARTED";

  // ── Project forward ───────────────────────────────────────────────────────
  const expected = geo.map(() => null); // { arrive, depart }
  const nextIdx = inside >= 0 ? inside : next < geo.length ? next : -1;

  if (tripState === "IN_PROGRESS" && nextIdx >= 0) {
    let cursor; // time the bus departs the stop before `startFrom`
    let startFrom;
    const pos = toGeo(latest);

    if (inside >= 0) {
      const v = visits[inside];
      const dep = Math.max(now, v.arrivedAt + dwellLive[inside]);
      expected[inside] = { arrive: v.arrivedAt, depart: dep };
      cursor = dep;
      startFrom = inside + 1;
    } else {
      const target = geo[next];
      const remain = dist(pos, target);
      const speedKmh = Number(latest.speed) || 0;
      const speedEta =
        ((remain * (TEST_MODE ? 1 : ROAD_FACTOR)) /
          1000 /
          Math.max(speedKmh > 8 ? speedKmh : FALLBACK_KMH, 5)) *
        3600000;
      let eta;
      if (next > 0) {
        const segD = dist(geo[next - 1], target) || 1;
        const frac = Math.min(1.5, remain / segD);
        const avgEta = segLive[next - 1] * frac;
        eta =
          TEST_MODE && speedKmh > 8
            ? speedEta
            : speedKmh > 8
              ? 0.6 * avgEta + 0.4 * speedEta
              : avgEta;
      } else {
        eta = speedEta;
      }
      const arrive = now + Math.max(0, eta);
      expected[next] = { arrive, depart: arrive + dwellLive[next] };
      cursor = expected[next].depart;
      startFrom = next + 1;
    }

    for (let j = startFrom; j < geo.length; j++) {
      const arrive = cursor + segLive[j - 1];
      expected[j] = { arrive, depart: arrive + dwellLive[j] };
      cursor = expected[j].depart;
    }
  }

  // ── Planned times for every stop not covered by the live projection ──────
  // Uses the timetable where set, chains average travel + stop time between
  // stops, and back-fills the start (e.g. leaving school) from the first
  // timed stop. Marked as `planned` so the UI shows "Planned" not a countdown.
  if (tripState !== "COMPLETED") {
    let cursor = null;
    for (let i = 0; i < geo.length; i++) {
      const v = visits[i];
      if (v && !v.skipped) {
        cursor = v.departedAt ?? v.arrivedAt + dwellEst[i];
        continue;
      }
      if (v?.skipped) continue;
      if (expected[i]) {
        cursor = expected[i].depart;
        continue;
      }
      const sched =
        geo[i].scheduledMin != null
          ? dayStart + geo[i].scheduledMin * 60000
          : null;
      const arrive =
        sched ?? (cursor != null && i > 0 ? cursor + segEst[i - 1] : null);
      if (arrive == null) continue;
      expected[i] = { arrive, depart: arrive + dwellEst[i], planned: true };
      cursor = expected[i].depart;
    }
    for (let i = geo.length - 2; i >= 0; i--) {
      if (expected[i] || visits[i] || !expected[i + 1]) continue;
      const depart = expected[i + 1].arrive - segEst[i];
      expected[i] = { arrive: depart - dwellEst[i], depart, planned: true };
    }
  }

  // ── Build output ──────────────────────────────────────────────────────────
  const geoIndex = new Map(geo.map((s, i) => [s.routeStopId, i]));
  let cumFromStart = 0;
  const avgFromStart = geo.map((_, i) => {
    if (i === 0) return 0;
    cumFromStart += segEst[i - 1] + (i - 1 > 0 ? dwellEst[i - 1] : 0);
    return cumFromStart;
  });

  const outStops = stops.map((s) => {
    const i = geoIndex.get(s.routeStopId);
    if (i == null) return publicStop(s, { state: "UNKNOWN" }, dayStart);

    const v = visits[i];
    let state;
    if (inside === i) state = "AT_STOP";
    else if (v?.assumed) state = "PASSED";
    else if (v?.skipped) state = "SKIPPED";
    else if (v) state = "PASSED";
    else if (i === nextIdx && tripState === "IN_PROGRESS") state = "NEXT";
    else state = "UPCOMING";

    return publicStop(
      s,
      {
        state,
        actualArrival: v && !v.skipped ? v.arrivedAt : null,
        actualDeparture: v && !v.skipped ? v.departedAt : null,
        expectedArrival: expected[i]?.arrive ?? null,
        expectedDeparture: expected[i]?.depart ?? null,
        planned: !!expected[i]?.planned,
        avgTravelMs: i > 0 ? segEst[i - 1] : null,
        avgTravelSource: i > 0 ? segSource[i - 1] : null,
        avgDwellMs: dwellEst[i],
        avgFromStartMs: avgFromStart[i],
        distanceFromPrevM: i > 0 ? dist(geo[i - 1], geo[i]) : null,
        isFirst: i === 0,
        now,
      },
      dayStart,
    );
  });

  const nextStop =
    outStops.find((s) => s.state === "AT_STOP" || s.state === "NEXT") || null;
  const lastPassed = [...outStops]
    .reverse()
    .find((s) => s.state === "PASSED" && s.actualArrival);

  return {
    ...base,
    route: routeInfo,
    session,
    tripState,
    live: !!live,
    locationAgeSec: latest?.ageSec ?? null,
    currentSpeedKmh: latest?.speed != null ? Math.round(latest.speed) : null,
    pace: Math.round(pace * 100) / 100, // 1 = normal, 1.3 = running 30% slower than usual
    nextStop: nextStop
      ? {
          routeStopId: nextStop.routeStopId,
          name: nextStop.name,
          state: nextStop.state,
          expectedArrival: nextStop.expectedArrival,
          etaMin: nextStop.etaMin,
          delayMin: nextStop.delayMin,
          punctuality: nextStop.punctuality,
        }
      : null,
    currentDelayMin: nextStop?.delayMin ?? lastPassed?.delayMin ?? null,
    currentPunctuality:
      nextStop?.punctuality ?? lastPassed?.punctuality ?? null,
    progress: {
      passed: outStops.filter((s) => s.state === "PASSED").length,
      skipped: outStops.filter((s) => s.state === "SKIPPED").length,
      total: outStops.length,
    },
    averages: {
      basedOnTripDays: history?.tripDays ?? 0,
      source:
        history?.tripDays > 0
          ? "history"
          : segSource.includes("schedule")
            ? "schedule"
            : "distance",
      loading: history === null,
    },
    stops: outStops,
  };
}

function punctualityOf(delayMin) {
  if (delayMin == null) return null;
  if (delayMin < -ON_TIME_MIN) return "EARLY";
  if (delayMin > ON_TIME_MIN) return "DELAYED";
  return "ON_TIME";
}

function publicStop(s, x, dayStart) {
  const scheduledAt =
    s.scheduledMin != null ? dayStart + s.scheduledMin * 60000 : null;

  // Compare the most meaningful time against the schedule
  let refTime = null;
  if (x.state === "PASSED" || x.state === "AT_STOP")
    refTime =
      x.isFirst && x.actualDeparture ? x.actualDeparture : x.actualArrival;
  else if ((x.state === "NEXT" || x.state === "UPCOMING") && !x.planned)
    refTime = x.expectedArrival;

  const delayMin =
    scheduledAt != null && refTime != null
      ? round1((refTime - scheduledAt) / 60000)
      : null;
  const etaMin =
    x.expectedArrival != null &&
    !x.planned &&
    (x.state === "NEXT" || x.state === "UPCOMING")
      ? Math.max(0, Math.round((x.expectedArrival - x.now) / 60000))
      : null;

  return {
    routeStopId: s.routeStopId,
    stopId: s.stopId,
    name: s.name,
    landmark: s.landmark,
    latitude: s.lat,
    longitude: s.lng,
    hasLocation: s.hasLocation,
    isSchool: !!s.isSchool,
    locationIssue: s.locationIssue || null,
    stopOrder: s.stopOrder,
    scheduledTime: s.scheduledTime,
    scheduledAt: iso(scheduledAt),
    estimateType:
      x.expectedArrival == null ? null : x.planned ? "PLANNED" : "LIVE",
    state: x.state,
    actualArrival: iso(x.actualArrival),
    actualDeparture: iso(x.actualDeparture),
    expectedArrival: iso(x.expectedArrival),
    expectedDeparture: iso(x.expectedDeparture),
    etaMin,
    delayMin,
    punctuality: punctualityOf(delayMin),
    avgTravelMinFromPrev: toMin(x.avgTravelMs),
    avgTravelSource: x.avgTravelSource ?? null,
    avgDwellMin: toMin(x.avgDwellMs),
    avgTravelMinFromStart: toMin(x.avgFromStartMs),
    distanceFromPrevKm:
      x.distanceFromPrevM != null ? round1(x.distanceFromPrevM / 1000) : null,
  };
}

// ── Public API (cached) ──────────────────────────────────────────────────────
const etaCache = new Map(); // vehicleId → { at, promise }

/** vehicle: { id, regNo, schoolId, deviceId } */
export function computeVehicleEta(vehicle, opts = {}) {
  const key = `${vehicle.id}|${opts.routeId || ""}`;
  const hit = etaCache.get(key);
  if (hit && Date.now() - hit.at < ETA_TTL_MS) return hit.promise;
  const promise = computeVehicleEtaUncached(vehicle, opts).catch((e) => {
    etaCache.delete(key);
    throw e;
  });
  etaCache.set(key, { at: Date.now(), promise });
  if (etaCache.size > 5000) etaCache.clear();
  return promise;
}

/** ETA for a list of vehicles; failures become { vehicleId, error }. */
export async function computeEtaForVehicles(vehicles) {
  const out = [];
  const CONCURRENCY = 6;
  for (let i = 0; i < vehicles.length; i += CONCURRENCY) {
    const chunk = vehicles.slice(i, i + CONCURRENCY);
    const res = await Promise.all(
      chunk.map((v) =>
        computeVehicleEta(v).catch((e) => {
          console.error("[routeEta]", v.regNo, e.message);
          return {
            vehicleId: v.id,
            regNo: v.regNo,
            error: "ETA unavailable",
            stops: [],
          };
        }),
      ),
    );
    out.push(...res);
  }
  return out;
}

/** Convenience for the parent app: ETA by SchoolVehicle id. */
export async function computeVehicleEtaById(vehicleId) {
  const v = await prisma.schoolVehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, regNo: true, schoolId: true, deviceId: true },
  });
  return v ? computeVehicleEta(v) : null;
}

/** Call after a route / stop is edited so ETAs pick it up immediately. */
export function invalidateRouteEta(schoolId) {
  if (schoolId) routeCache.delete(schoolId);
  else routeCache.clear();
  etaCache.clear();
  historyCache.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIP HISTORY  — what the bus actually did on a past day
//   path, start/end, distance, speeds, and actual arrival/departure at every
//   stop compared with the timetable.
// ═══════════════════════════════════════════════════════════════════════════════
const HISTORY_MAX_PATH = 2500;
const historyResultCache = new Map(); // key → { at, data }

export function istDateString(ms = Date.now()) {
  const d = new Date(ms + IST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

function dayStartFromDateString(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - IST_OFFSET_MS;
}

/** Days (IST, newest first) in the last `days` that have any GPS data. */
export async function getActiveDays(vehicle, days = 14) {
  const today = istDayStartMs(Date.now());
  const out = [];
  for (let d = 0; d < days; d++) {
    const start = today - d * 86400000;
    const pts = await getPointsBetween(
      vehicle,
      new Date(start),
      new Date(start + 86400000),
      {
        limit: 1,
        newest: false,
      },
    ).catch(() => []);
    if (pts.length) out.push(istDateString(start));
  }
  return out;
}

/**
 * @param session  "PICKUP" | "DROP" | "ALL"
 */
export async function computeTripHistory(
  vehicle,
  { routeId, date, session = "PICKUP" } = {},
) {
  const dayStart = dayStartFromDateString(date);
  if (dayStart == null)
    throw { status: 400, message: "date must be YYYY-MM-DD" };
  const now = Date.now();
  if (dayStart > now) throw { status: 400, message: "date is in the future" };

  const isPast = dayStart + 86400000 < now;
  const cacheKey = `${vehicle.id}|${routeId || ""}|${date}|${session}`;
  const hit = historyResultCache.get(cacheKey);
  if (hit && Date.now() - hit.at < (isPast ? 6 * 3600000 : 60000))
    return hit.data;

  const route = await resolveRoute(vehicle, routeId);
  let sess =
    session === "ALL" || !route
      ? "ALL"
      : session === "DROP"
        ? "DROP"
        : "PICKUP";
  let win = { start: 0, end: 24 * 60 };
  if (sess !== "ALL") {
    const { pw, dw } = routeWindows(route);
    win = (sess === "PICKUP" ? pw : dw) || DEFAULT_WINDOWS[sess];
  }

  const from = dayStart + Math.max(0, win.start) * 60000;
  const windowEnd = dayStart + Math.min(24 * 60, win.end) * 60000;
  const windowOver = windowEnd <= now;
  const to = Math.min(windowEnd, now);
  const raw =
    from < to
      ? await getPointsBetween(vehicle, new Date(from), new Date(to), {
          limit: 15000,
          newest: false,
        })
      : [];
  const pts = raw.map(toGeo).filter((p) => p.t);

  // ── Summary ────────────────────────────────────────────────────────────────
  let distanceM = 0;
  let maxSpeed = 0;
  let movingMs = 0;
  let firstMove = null;
  let lastMove = null;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (Number.isFinite(p.speed)) maxSpeed = Math.max(maxSpeed, p.speed);
    if (i === 0) continue;
    const q = pts[i - 1];
    const gap = p.t - q.t;
    const d = dist(q, p);
    if (gap > 0 && gap <= MAX_INTERP_GAP_MS && d < 3000 && d > 8) {
      distanceM += d;
      const segSpeedKmh = (d / (gap / 1000)) * 3.6;
      if (segSpeedKmh > 3 || (p.speed || 0) > 3) {
        movingMs += gap;
        if (firstMove == null) firstMove = q.t;
        lastMove = p.t;
      }
    }
  }

  // ── Stops ──────────────────────────────────────────────────────────────────
  let stopsOut = [];
  if (route) {
    const order = sess === "ALL" ? "PICKUP" : sess;
    const stops = orderedStops(route, order);
    const geo = stops.filter((s) => s.hasLocation);
    const { visits } = sess === "ALL" ? { visits: [] } : matchVisits(pts, geo);
    const gi = new Map(geo.map((s, i) => [s.routeStopId, i]));
    let n = 0;
    stopsOut = stops.map((s) => {
      const number = s.isSchool ? null : ++n;
      const i = gi.get(s.routeStopId);
      const v = i != null ? visits[i] : null;
      const scheduledAt =
        s.scheduledMin != null && sess !== "ALL"
          ? dayStart + s.scheduledMin * 60000
          : null;
      const reached = v && !v.skipped;
      const ref = reached
        ? i === 0 && v.departedAt
          ? v.departedAt
          : v.arrivedAt
        : null;
      const delayMin =
        scheduledAt != null && ref != null
          ? round1((ref - scheduledAt) / 60000)
          : null;
      return {
        number,
        routeStopId: s.routeStopId,
        stopId: s.stopId,
        name: s.name,
        landmark: s.landmark,
        latitude: s.lat,
        longitude: s.lng,
        hasLocation: s.hasLocation,
        isSchool: !!s.isSchool,
        scheduledTime: sess === "ALL" ? null : s.scheduledTime,
        state:
          sess === "ALL"
            ? "UPCOMING"
            : reached
              ? "PASSED"
              : v?.skipped
                ? "SKIPPED"
                : pts.length && windowOver
                  ? "MISSED"
                  : "UPCOMING",
        actualArrival: reached ? iso(v.arrivedAt) : null,
        actualDeparture: reached && v.departedAt ? iso(v.departedAt) : null,
        dwellMin:
          reached && v.departedAt
            ? round1((v.departedAt - v.arrivedAt) / 60000)
            : null,
        delayMin,
        punctuality: punctualityOf(delayMin),
      };
    });
  }

  // ── Path (thinned for transfer) ───────────────────────────────────────────
  const path = [];
  let lastKept = null;
  for (const p of pts) {
    if (!lastKept || dist(lastKept, p) >= 12 || p === pts[pts.length - 1]) {
      path.push([
        round6(p.lat),
        round6(p.lng),
        p.t,
        p.speed != null ? Math.round(p.speed) : null,
      ]);
      lastKept = p;
    }
  }
  const stride = Math.ceil(path.length / HISTORY_MAX_PATH);
  const thinPath =
    stride > 1
      ? path.filter((_, i) => i % stride === 0 || i === path.length - 1)
      : path;

  const data = {
    vehicleId: vehicle.id,
    regNo: vehicle.regNo,
    date,
    session: sess,
    window: { from: iso(from), to: iso(to) },
    route: route ? { id: route.id, name: route.name, code: route.code } : null,
    summary: {
      points: pts.length,
      firstPointAt: pts.length ? iso(pts[0].t) : null,
      lastPointAt: pts.length ? iso(pts[pts.length - 1].t) : null,
      startedAt: iso(firstMove),
      endedAt: iso(lastMove),
      durationMin:
        firstMove != null ? round1((lastMove - firstMove) / 60000) : null,
      movingMin: round1(movingMs / 60000),
      distanceKm: round1(distanceM / 1000),
      maxSpeedKmh: Math.round(maxSpeed),
      avgMovingSpeedKmh:
        movingMs > 0 ? Math.round((distanceM / (movingMs / 1000)) * 3.6) : null,
      stopsReached: stopsOut.filter((s) => s.state === "PASSED").length,
      stopsTotal: stopsOut.length,
    },
    stops: stopsOut,
    path: thinPath, // [lat, lng, tMs, speedKmh]
  };

  historyResultCache.set(cacheKey, { at: Date.now(), data });
  if (historyResultCache.size > 500) historyResultCache.clear();
  return data;
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;

/**
 * Today's trip plan for a bus: session + stops in travel order (incl. school).
 * Used by the trip simulator script and the notifier.
 */
export async function getTripPlan(vehicle, { routeId, session } = {}) {
  const route = await resolveRoute(vehicle, routeId);
  if (!route) return null;
  const now = Date.now();
  const picked = pickSession(route, istMinuteOfDay(now));
  const sess =
    session === "PICKUP" || session === "DROP" ? session : picked.session;
  const stops = orderedStops(route, sess).filter((s) => s.hasLocation);
  return {
    routeId: route.id,
    routeName: route.name,
    session: sess,
    stops: stops.map((s) => ({
      name: s.name,
      stopId: s.stopId,
      isSchool: !!s.isSchool,
      lat: s.lat,
      lng: s.lng,
    })),
  };
}
