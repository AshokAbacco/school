// server/src/vehicle/liveTracking.service.js  (UPDATED)
// CHANGES: + getPointsBetween() (time-range read used by the stop-ETA engine)
//          + buildLiveRows()    (one snapshot builder shared by admin + Bus Head)
//          deviceUuidForVehicle is now exported
//          openSseStream(…, { eventName }) — used by the parent bus-alert stream
// ═══════════════════════════════════════════════════════════════════════════════
// LIVE TRACKING HUB  (NEW FILE)
// ─ One in-process pub/sub that pushes every new GPS point to connected clients
//   (parents + admins) over Server-Sent Events.
// ─ Works with BOTH location sources in this project:
//     1. VehicleLocation  – filled by the GPS-provider poller (cron)
//     2. DeviceLocation   – pushed directly by IoT devices (POST /api/gps/v1/location)
//        linked to a bus when SchoolVehicle.deviceId === Device.imei
// ─ A lightweight watcher reads only NEW rows every LIVE_TRACKING_POLL_MS (default
//   2s) and only while at least one client is listening. Writers can also call
//   nudgeLiveTracking() right after an insert for near-zero delay.
// ─ No new npm dependencies. Safe with PM2 cluster / multiple instances because
//   every instance reads from the same database.
// ═══════════════════════════════════════════════════════════════════════════════

import { EventEmitter } from "events";
import { prisma } from "../config/db.js";

const POLL_MS = Math.max(
  500,
  Number(process.env.LIVE_TRACKING_POLL_MS || 2000),
);
const MAPPING_TTL_MS = 60 * 1000; // refresh SchoolVehicle ↔ Device mapping every minute
const MAX_ROWS_PER_TICK = 2000;
export const STALE_AFTER_SEC = Number(
  process.env.LIVE_TRACKING_STALE_SEC || 180,
);

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
export const normalizeRegNo = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
const normalizeImei = (s) => String(s || "").trim();

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isValidLatLng = (lat, lng) =>
  lat !== null &&
  lng !== null &&
  !(lat === 0 && lng === 0) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const deriveStatus = (speed, fallback) => {
  if (fallback) return String(fallback).toUpperCase();
  if (speed === null) return null;
  return speed > 3 ? "MOVING" : "IDLE";
};

/** VehicleLocation row → common point shape sent to clients */
export const pointFromVehicleRow = (row) => {
  if (!row) return null;
  const latitude = num(row.latitude);
  const longitude = num(row.longitude);
  if (!isValidLatLng(latitude, longitude)) return null;
  const speed = num(row.speed);
  const ts = row.gpsTimestamp || row.recordedAt;
  return {
    latitude,
    longitude,
    speed,
    bearing: num(row.bearing),
    status: row.vehicleStatus || row.status || deriveStatus(speed),
    ignitionStatus: row.ignitionStatus || null,
    address: row.address || null,
    ts: ts ? new Date(ts).toISOString() : null,
    recordedAt: row.recordedAt ? new Date(row.recordedAt).toISOString() : null,
    source: "provider",
  };
};

/** DeviceLocation row → common point shape */
export const pointFromDeviceRow = (row) => {
  if (!row) return null;
  const latitude = num(row.latitude);
  const longitude = num(row.longitude);
  if (!isValidLatLng(latitude, longitude)) return null;
  const speed = num(row.speed);
  return {
    latitude,
    longitude,
    speed,
    bearing: num(row.heading),
    status: deriveStatus(speed),
    ignitionStatus: null,
    address: null,
    ts: row.timestamp ? new Date(row.timestamp).toISOString() : null,
    recordedAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    source: "device",
  };
};

const tsMs = (p) => (p?.ts ? Date.parse(p.ts) : 0);

export const withFreshness = (point) => {
  if (!point) return null;
  const ageSec = point.ts
    ? Math.max(0, Math.round((Date.now() - tsMs(point)) / 1000))
    : null;
  return {
    ...point,
    ageSec,
    isStale: ageSec === null ? true : ageSec > STALE_AFTER_SEC,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SchoolVehicle.deviceId (IMEI) ↔ Device.id mapping cache
// ─────────────────────────────────────────────────────────────────────────────
let mapping = {
  at: 0,
  deviceUuidToVehicles: new Map(),
  imeiToDeviceUuid: new Map(),
};
let mappingPromise = null;

async function refreshMapping(force = false) {
  if (!force && Date.now() - mapping.at < MAPPING_TTL_MS) return mapping;
  if (mappingPromise) return mappingPromise;

  mappingPromise = (async () => {
    try {
      const vehicles = await prisma.schoolVehicle.findMany({
        where: { isActive: true, deviceId: { not: null } },
        select: { id: true, schoolId: true, regNo: true, deviceId: true },
      });
      const imeis = [
        ...new Set(
          vehicles.map((v) => normalizeImei(v.deviceId)).filter(Boolean),
        ),
      ];
      const devices = imeis.length
        ? await prisma.device.findMany({
            where: { imei: { in: imeis } },
            select: { id: true, imei: true },
          })
        : [];

      const imeiToDeviceUuid = new Map(devices.map((d) => [d.imei, d.id]));
      const deviceUuidToVehicles = new Map();
      for (const v of vehicles) {
        const uuid = imeiToDeviceUuid.get(normalizeImei(v.deviceId));
        if (!uuid) continue;
        if (!deviceUuidToVehicles.has(uuid)) deviceUuidToVehicles.set(uuid, []);
        deviceUuidToVehicles
          .get(uuid)
          .push({ id: v.id, schoolId: v.schoolId, regNo: v.regNo });
      }
      mapping = { at: Date.now(), deviceUuidToVehicles, imeiToDeviceUuid };
    } catch (err) {
      console.error("[liveTracking] mapping refresh failed:", err.message);
    } finally {
      mappingPromise = null;
    }
    return mapping;
  })();

  return mappingPromise;
}

export async function deviceUuidForVehicle(vehicle) {
  const imei = normalizeImei(vehicle?.deviceId);
  if (!imei) return null;
  const m = await refreshMapping();
  if (m.imeiToDeviceUuid.has(imei)) return m.imeiToDeviceUuid.get(imei);
  const device = await prisma.device.findUnique({
    where: { imei },
    select: { id: true },
  });
  return device?.id || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read helpers used by REST snapshot endpoints
// ─────────────────────────────────────────────────────────────────────────────
const VEHICLE_LOC_SELECT = {
  id: true,
  latitude: true,
  longitude: true,
  speed: true,
  bearing: true,
  status: true,
  ignitionStatus: true,
  vehicleStatus: true,
  address: true,
  gpsTimestamp: true,
  recordedAt: true,
};

/**
 * Latest VALID point for a vehicle from the freshest source.
 * vehicle: { id, deviceId? }
 */
export async function getLatestPoint(vehicle) {
  const deviceUuid = await deviceUuidForVehicle(vehicle);

  const [vl, dl] = await Promise.all([
    prisma.vehicleLocation.findFirst({
      where: {
        schoolVehicleId: vehicle.id,
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { recordedAt: "desc" },
      select: VEHICLE_LOC_SELECT,
    }),
    deviceUuid
      ? prisma.deviceLocation.findFirst({
          where: {
            deviceId: deviceUuid,
            latitude: { not: null },
            longitude: { not: null },
          },
          orderBy: { timestamp: "desc" },
          select: {
            latitude: true,
            longitude: true,
            speed: true,
            heading: true,
            timestamp: true,
            createdAt: true,
          },
        })
      : null,
  ]);

  const a = pointFromVehicleRow(vl);
  const b = pointFromDeviceRow(dl);
  const best = !a
    ? b
    : !b
      ? a
      : tsMs(b) > tsMs(a)
        ? { ...b, address: a.address, ignitionStatus: a.ignitionStatus }
        : a;
  return withFreshness(best);
}

const DEVICE_LOC_SELECT = {
  latitude: true,
  longitude: true,
  speed: true,
  heading: true,
  timestamp: true,
  createdAt: true,
};

/**
 * All valid points of a vehicle between two dates (both sources merged,
 * oldest → newest, exact duplicates removed).
 * newest=true keeps the most recent `limit` points when the range has more.
 */
export async function getPointsBetween(
  vehicle,
  from,
  to = new Date(),
  { limit = 2000, newest = true } = {},
) {
  const deviceUuid = await deviceUuidForVehicle(vehicle);
  const dir = newest ? "desc" : "asc";

  const [vl, dl] = await Promise.all([
    prisma.vehicleLocation.findMany({
      where: {
        schoolVehicleId: vehicle.id,
        recordedAt: { gte: from, lte: to },
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { recordedAt: dir },
      take: limit,
      select: VEHICLE_LOC_SELECT,
    }),
    deviceUuid
      ? prisma.deviceLocation.findMany({
          where: {
            deviceId: deviceUuid,
            timestamp: { gte: from, lte: to },
            latitude: { not: null },
            longitude: { not: null },
          },
          orderBy: { timestamp: dir },
          take: limit,
          select: DEVICE_LOC_SELECT,
        })
      : [],
  ]);

  const points = [...vl.map(pointFromVehicleRow), ...dl.map(pointFromDeviceRow)]
    .filter(Boolean)
    .sort((x, y) => tsMs(x) - tsMs(y));

  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (
      last &&
      tsMs(last) === tsMs(p) &&
      last.latitude === p.latitude &&
      last.longitude === p.longitude
    )
      continue;
    out.push(p);
  }
  return newest ? out.slice(-limit) : out.slice(0, limit);
}

/** Recent path for drawing the trail on the map (oldest → newest). */
export async function getTrail(vehicle, { minutes = 30, limit = 300 } = {}) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return getPointsBetween(vehicle, since, new Date(), { limit, newest: true });
}

/**
 * Snapshot rows for the live map. `vehicles` need
 * { id, regNo, vehicleName, vehicleType, schoolId, deviceId, school:{name} }.
 * Same shape is returned to the admin dashboard and the Bus Head portal.
 */
export async function buildLiveRows(vehicles, { withTrail = false } = {}) {
  return Promise.all(
    vehicles.map(async (v) => {
      const [location, trail] = await Promise.all([
        getLatestPoint(v).catch(() => null),
        withTrail
          ? getTrail(v, { minutes: 20, limit: 150 }).catch(() => [])
          : Promise.resolve(undefined),
      ]);
      return {
        id: v.id,
        regNo: v.regNo,
        vehicleName: v.vehicleName,
        vehicleType: v.vehicleType,
        schoolId: v.schoolId,
        schoolName: v.school?.name || null,
        location,
        ...(withTrail ? { trail } : {}),
      };
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Publishing
// ─────────────────────────────────────────────────────────────────────────────
const lastPublishedTs = new Map(); // vehicleId → ms of newest point already sent

function publish(vehicleId, schoolId, points) {
  const lastSent = lastPublishedTs.get(vehicleId) || 0;
  const fresh = points
    .filter((p) => p && tsMs(p) > lastSent)
    .sort((a, b) => tsMs(a) - tsMs(b));
  if (!fresh.length) return;

  lastPublishedTs.set(vehicleId, tsMs(fresh[fresh.length - 1]));
  const payload = {
    vehicleId,
    schoolId,
    latest: withFreshness(fresh[fresh.length - 1]),
    path: fresh, // every point since the last push → client animates along the road
    serverTime: new Date().toISOString(),
  };
  emitter.emit(`vehicle:${vehicleId}`, payload);
  if (schoolId) emitter.emit(`school:${schoolId}`, payload);
}

/**
 * Optional direct publish — call from your GPS-provider cron right after it
 * writes a VehicleLocation row (pass the created row). The watcher would pick it
 * up anyway; this just removes the watcher delay.
 */
export function publishVehicleLocation(row) {
  if (!row?.schoolVehicleId) return;
  const p = pointFromVehicleRow(row);
  if (p) publish(row.schoolVehicleId, row.schoolId, [p]);
}

// ─────────────────────────────────────────────────────────────────────────────
// DB watcher (only runs while someone is subscribed)
// ─────────────────────────────────────────────────────────────────────────────
let timer = null;
let ticking = false;
let subscribers = 0;
let vlCursor = null; // Date of newest VehicleLocation.recordedAt processed
let vlSeenAtCursor = new Set();
let dlCursor = null; // BigInt id of newest DeviceLocation processed

async function initCursors() {
  vlCursor = new Date(Date.now() - 5000);
  vlSeenAtCursor = new Set();
  try {
    const agg = await prisma.deviceLocation.aggregate({ _max: { id: true } });
    dlCursor = agg._max.id ?? BigInt(0);
  } catch {
    dlCursor = BigInt(0);
  }
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    // ── 1. Provider rows (VehicleLocation) ───────────────────────────────────
    const vRows = await prisma.vehicleLocation.findMany({
      where: { recordedAt: { gte: vlCursor } },
      orderBy: { recordedAt: "asc" },
      take: MAX_ROWS_PER_TICK,
      select: { ...VEHICLE_LOC_SELECT, schoolVehicleId: true, schoolId: true },
    });

    const newV = vRows.filter((r) => !vlSeenAtCursor.has(r.id));
    if (vRows.length) {
      const lastAt = vRows[vRows.length - 1].recordedAt;
      if (lastAt.getTime() !== vlCursor.getTime()) vlSeenAtCursor = new Set();
      vlCursor = lastAt;
      for (const r of vRows)
        if (r.recordedAt.getTime() === lastAt.getTime())
          vlSeenAtCursor.add(r.id);
    }

    const byVehicle = new Map();
    for (const r of newV) {
      const p = pointFromVehicleRow(r);
      if (!p) continue;
      if (!byVehicle.has(r.schoolVehicleId))
        byVehicle.set(r.schoolVehicleId, { schoolId: r.schoolId, points: [] });
      byVehicle.get(r.schoolVehicleId).points.push(p);
    }

    // ── 2. Direct device rows (DeviceLocation) linked to a SchoolVehicle ─────
    const m = await refreshMapping();
    if (m.deviceUuidToVehicles.size > 0) {
      const dRows = await prisma.deviceLocation.findMany({
        where: {
          id: { gt: dlCursor },
          deviceId: { in: [...m.deviceUuidToVehicles.keys()] },
          latitude: { not: null },
          longitude: { not: null },
        },
        orderBy: { id: "asc" },
        take: MAX_ROWS_PER_TICK,
        select: {
          id: true,
          deviceId: true,
          latitude: true,
          longitude: true,
          speed: true,
          heading: true,
          timestamp: true,
          createdAt: true,
        },
      });
      if (dRows.length) dlCursor = dRows[dRows.length - 1].id;

      for (const r of dRows) {
        const p = pointFromDeviceRow(r);
        if (!p) continue;
        for (const v of m.deviceUuidToVehicles.get(r.deviceId) || []) {
          if (!byVehicle.has(v.id))
            byVehicle.set(v.id, { schoolId: v.schoolId, points: [] });
          byVehicle.get(v.id).points.push(p);
        }
      }
    } else {
      // nothing mapped – keep cursor current so we don't scan history later
      const agg = await prisma.deviceLocation.aggregate({ _max: { id: true } });
      dlCursor = agg._max.id ?? dlCursor;
    }

    for (const [vehicleId, { schoolId, points }] of byVehicle)
      publish(vehicleId, schoolId, points);
  } catch (err) {
    console.error("[liveTracking] tick failed:", err.message);
  } finally {
    ticking = false;
  }
}

async function startWatcher() {
  if (timer) return;
  await initCursors();
  timer = setInterval(tick, POLL_MS);
  console.log(`📡 Live tracking watcher started (${POLL_MS}ms)`);
}

function stopWatcher() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  console.log("📡 Live tracking watcher stopped (no listeners)");
}

/** Trigger an immediate check (call after inserting GPS rows). Never throws. */
export function nudgeLiveTracking() {
  if (timer) setImmediate(tick);
}

function subscribe(channel, fn) {
  emitter.on(channel, fn);
  subscribers += 1;
  startWatcher().catch((e) =>
    console.error("[liveTracking] start failed:", e.message),
  );

  let done = false;
  return () => {
    if (done) return;
    done = true;
    emitter.off(channel, fn);
    subscribers = Math.max(0, subscribers - 1);
    if (subscribers === 0) stopWatcher();
  };
}

export const subscribeVehicle = (vehicleId, fn) =>
  subscribe(`vehicle:${vehicleId}`, fn);
export const subscribeSchool = (schoolId, fn) =>
  subscribe(`school:${schoolId}`, fn);

// ─────────────────────────────────────────────────────────────────────────────
// SSE helper shared by parent + admin endpoints
// ─────────────────────────────────────────────────────────────────────────────
const MAX_STREAM_MS = 30 * 60 * 1000; // close after 30 min → client reconnects (re-auth + re-resolve)
const HEARTBEAT_MS = 20 * 1000;

export function openSseStream(
  req,
  res,
  { subscribeFn, initialEvents = [], eventName = "location" },
) {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // disable nginx buffering
  });
  res.flushHeaders?.();
  req.socket?.setTimeout?.(0);
  req.socket?.setNoDelay?.(true);
  req.socket?.setKeepAlive?.(true);

  let closed = false;
  const write = (chunk) => {
    if (closed) return;
    res.write(chunk);
    res.flush?.(); // needed when the `compression` middleware is active
  };
  const send = (event, data) =>
    write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  write(`retry: 3000\n\n`);
  for (const [event, data] of initialEvents) send(event, data);

  const unsubscribe = subscribeFn((payload) => send(eventName, payload));
  const heartbeat = setInterval(
    () => write(`: ping ${Date.now()}\n\n`),
    HEARTBEAT_MS,
  );
  const maxLife = setTimeout(() => {
    send("reconnect", { reason: "max-duration" });
    cleanup();
    res.end();
  }, MAX_STREAM_MS);

  function cleanup() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(maxLife);
    unsubscribe();
  }

  req.on("close", cleanup);
  res.on("error", cleanup);
  return {
    send,
    close: () => {
      cleanup();
      res.end();
    },
  };
}
