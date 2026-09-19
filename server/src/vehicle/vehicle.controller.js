// server/src/vehicle/vehicle.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE CONTROLLER  — performance-fixed
//
// WHAT CHANGED AND WHY
// ────────────────────
// The old code loaded the newest location like this:
//
//     include: { locations: { orderBy: { recordedAt: "desc" }, take: 1 } }
//
// Prisma compiles a nested `take` into a ROW_NUMBER() OVER (PARTITION BY ...)
// subquery. Postgres cannot satisfy a window function from an index, so it
// reads and sorts EVERY location row belonging to those vehicles before
// throwing away all but the newest one. Your @@index([schoolVehicleId,
// recordedAt]) is correct — it just cannot be used by that query shape.
//
// At one GPS poll per 30s per vehicle you write ~8,600 rows/day, each carrying
// a `rawData Json` blob, so that scan gets measurably slower every single day.
//
// The replacement issues one `findFirst` per vehicle. Each one is
//   WHERE "schoolVehicleId" = $1 ORDER BY "recordedAt" DESC LIMIT 1
// which is a backward index scan that stops on the first row it touches:
// O(log n) instead of O(n), and it stays fast no matter how big the table gets.
//
// The JSON response shape is byte-for-byte identical to before — no frontend
// changes are required for this file.
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";

// Never select rawData in a list endpoint — it is TOASTed and can be KBs per row.
const LOCATION_SELECT = {
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

// Hard ceilings so a bad query string can never pin the database.
const MAX_HISTORY_LIMIT = 1000;
const LOOKUP_CONCURRENCY = 8; // stay well under the Prisma connection pool

// ─────────────────────────────────────────────────────────────────────────────
// Run `fn` over `items` with bounded concurrency. Keeps result order.
// Prevents Promise.all() from grabbing the entire connection pool at once
// if the fleet grows from 3 vehicles to 300.
// ─────────────────────────────────────────────────────────────────────────────
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Latest location for each vehicle id → Map<vehicleId, location|null>
// This is the single hot path that was causing the multi-minute page loads.
// ─────────────────────────────────────────────────────────────────────────────
async function getLatestLocations(vehicleIds) {
  if (!vehicleIds.length) return new Map();

  const rows = await mapLimit(vehicleIds, LOOKUP_CONCURRENCY, (id) =>
    prisma.vehicleLocation.findFirst({
      where: { schoolVehicleId: id },
      orderBy: { recordedAt: "desc" },
      select: LOCATION_SELECT,
    }),
  );

  const map = new Map();
  vehicleIds.forEach((id, i) => map.set(id, rows[i] || null));
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles?schoolId=&includeInactive=
// List all vehicles for a school
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicles = async (req, res) => {
  try {
    const { schoolId, includeInactive } = req.query;
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res
        .status(400)
        .json({ success: false, message: "universityId missing" });
    }

    const where = { school: { universityId } };
    if (schoolId) where.schoolId = schoolId;
    if (includeInactive !== "true") where.isActive = true;

    // `select` rather than `include`, and NO nested locations.
    const vehicles = await prisma.schoolVehicle.findMany({
      where,
      select: {
        id: true,
        schoolId: true,
        regNo: true,
        vehicleName: true,
        vehicleType: true,
        deviceId: true,
        isActive: true,
        createdAt: true,
        school: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const latest = await getLatestLocations(vehicles.map((v) => v.id));

    const data = vehicles.map((v) => ({
      id:          v.id,
      schoolId:    v.schoolId,
      schoolName:  v.school.name,
      regNo:       v.regNo,
      vehicleName: v.vehicleName,
      vehicleType: v.vehicleType,
      deviceId:    v.deviceId,
      isActive:    v.isActive,
      createdAt:   v.createdAt,
      latestLocation: latest.get(v.id) || null,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getVehicles]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/live-all?schoolId=
// Latest location for ALL active vehicles of a school (dashboard map view)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllVehiclesLive = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res
        .status(400)
        .json({ success: false, message: "universityId missing" });
    }

    const where = { school: { universityId }, isActive: true };
    if (schoolId) where.schoolId = schoolId;

    const vehicles = await prisma.schoolVehicle.findMany({
      where,
      select: {
        id: true,
        regNo: true,
        vehicleName: true,
        vehicleType: true,
        schoolId: true,
        school: { select: { name: true } },
      },
      orderBy: { regNo: "asc" },
    });

    const latest = await getLatestLocations(vehicles.map((v) => v.id));

    const data = vehicles.map((v) => ({
      id:          v.id,
      regNo:       v.regNo,
      vehicleName: v.vehicleName,
      vehicleType: v.vehicleType,
      schoolId:    v.schoolId,
      schoolName:  v.school.name,
      location:    latest.get(v.id) || null,
    }));

    // Tell the browser not to re-use a stale live view.
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getAllVehiclesLive]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vehicles
// Body: { schoolId, regNo, vehicleName, vehicleType }
// ─────────────────────────────────────────────────────────────────────────────
export const addVehicle = async (req, res) => {
  try {
    let { schoolId, regNo, vehicleName, vehicleType } = req.body;

    if (!schoolId || !regNo) {
      return res
        .status(400)
        .json({ success: false, message: "schoolId and regNo are required" });
    }

    regNo = String(regNo).toUpperCase().replace(/\s+/g, "").trim();

    // Uses the @@unique([schoolId, regNo]) index.
    const existing = await prisma.schoolVehicle.findUnique({
      where: { schoolId_regNo: { schoolId, regNo } },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Vehicle ${regNo} already registered for this school`,
      });
    }

    const vehicle = await prisma.schoolVehicle.create({
      data: { schoolId, regNo, vehicleName, vehicleType, isActive: true },
    });

    return res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    // Race on the unique constraint
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, message: "Vehicle already registered for this school" });
    }
    console.error("[addVehicle]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/vehicles/:id/toggle
// ─────────────────────────────────────────────────────────────────────────────
export const toggleVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.schoolVehicle.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

    const updated = await prisma.schoolVehicle.update({
      where: { id },
      data: { isActive: !vehicle.isActive },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("[toggleVehicle]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/:id/live
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleLiveLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await prisma.vehicleLocation.findFirst({
      where: { schoolVehicleId: id },
      orderBy: { recordedAt: "desc" },
      select: { id: true, ...LOCATION_SELECT },
    });

    if (!location) {
      return res.json({
        success: true,
        data: null,
        message: "No location data yet",
      });
    }

    res.set("Cache-Control", "no-store");
    return res.json({ success: true, data: location });
  } catch (err) {
    console.error("[getVehicleLiveLocation]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/:id/history?from=&to=&limit=
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    // Cap the limit — the old code would happily accept limit=1000000.
    const parsed = parseInt(req.query.limit ?? "100", 10);
    const limit = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), MAX_HISTORY_LIMIT)
      : 100;

    const where = { schoolVehicleId: id };
    if (from || to) {
      where.recordedAt = {};
      if (from) where.recordedAt.gte = new Date(from);
      if (to)   where.recordedAt.lte = new Date(to);
    }

    const locations = await prisma.vehicleLocation.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: limit,
      select: { id: true, ...LOCATION_SELECT },
    });

    return res.json({
      success: true,
      data: locations,
      total: locations.length,
      limit,
    });
  } catch (err) {
    console.error("[getVehicleHistory]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};