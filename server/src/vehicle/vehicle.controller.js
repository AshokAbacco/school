// server/src/vehicle/vehicle.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE CONTROLLER (UPDATED)
// ─ Add / list / update / toggle school vehicles
// ─ Latest location per vehicle (best of provider + direct device)
// ─ Location history
// ─ NEW: live SSE stream of all vehicles in a school
// ─ FIX: every :id endpoint now checks the vehicle belongs to the caller's
//        university (previously any logged-in user could read/toggle any bus)
// ─ NEW: stop-by-stop ETA  (GET /eta?schoolId=  and  GET /:id/eta)
// ─ NEW: vehicle list shows which transport route the bus is linked to
// ─ NEW: GET /:id/route-geometry   road-following route line for the map
// ─ NEW: GET /routes, PUT /routes/:routeId/stops   stop priority (order),
//        pickup/drop times and on/off per stop — used by the Route Stops tab
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";
import {
  normalizeRegNo,
  getLatestPoint,
  subscribeSchool,
  openSseStream,
  buildLiveRows,
} from "./liveTracking.service.js";
import {
  computeVehicleEta,
  computeEtaForVehicles,
  routeSummaryForVehicle,
  findRouteForVehicle,
  getRouteStopsForMap,
  getSchoolLocation,
  validateStopCoords,
  schoolForRoute,
  parseClock,
  invalidateRouteEta,
} from "./routeEta.service.js";
import { getRoadGeometry } from "./roadRouting.service.js";

const getUniversityId = (req) => req.user?.universityId || null;

async function findOwnedVehicle(req, id) {
  const universityId = getUniversityId(req);
  if (!universityId) return null;
  return prisma.schoolVehicle.findFirst({
    where: { id, school: { universityId } },
  });
}

async function schoolBelongsToUser(req, schoolId) {
  const universityId = getUniversityId(req);
  if (!universityId || !schoolId) return false;
  const school = await prisma.school.findFirst({
    where: { id: schoolId, universityId },
    select: { id: true },
  });
  return !!school;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles?schoolId=&includeInactive=
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicles = async (req, res) => {
  try {
    const { schoolId, includeInactive } = req.query;
    const universityId = getUniversityId(req);
    if (!universityId)
      return res
        .status(400)
        .json({ success: false, message: "universityId missing" });

    const where = { school: { universityId } };
    if (schoolId) where.schoolId = schoolId;
    if (includeInactive !== "true") where.isActive = true;

    const vehicles = await prisma.schoolVehicle.findMany({
      where,
      include: { school: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });

    const [latest, routes] = await Promise.all([
      Promise.all(vehicles.map((v) => getLatestPoint(v).catch(() => null))),
      Promise.all(
        vehicles.map((v) => routeSummaryForVehicle(v).catch(() => null)),
      ),
    ]);

    const data = vehicles.map((v, i) => ({
      id: v.id,
      schoolId: v.schoolId,
      schoolName: v.school.name,
      regNo: v.regNo,
      vehicleName: v.vehicleName,
      vehicleType: v.vehicleType,
      deviceId: v.deviceId,
      isActive: v.isActive,
      createdAt: v.createdAt,
      latestLocation: latest[i],
      route: routes[i], // { id, name, code, stopCount, stopsWithLocation } | null
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getVehicles]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vehicles
// Body: { schoolId, regNo, vehicleName, vehicleType, deviceId? }
// ─────────────────────────────────────────────────────────────────────────────
export const addVehicle = async (req, res) => {
  try {
    let { schoolId, regNo, vehicleName, vehicleType, deviceId } = req.body;

    if (!schoolId || !regNo) {
      return res
        .status(400)
        .json({ success: false, message: "schoolId and regNo are required" });
    }
    if (!(await schoolBelongsToUser(req, schoolId))) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this school",
      });
    }

    // Stored as letters+digits only ("KA 01-AB 1234" → "KA01AB1234")
    regNo = normalizeRegNo(regNo);
    if (!regNo)
      return res
        .status(400)
        .json({ success: false, message: "Invalid registration number" });

    const existing = await prisma.schoolVehicle.findFirst({
      where: { schoolId, regNo },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Vehicle ${regNo} already registered for this school`,
      });
    }

    const vehicle = await prisma.schoolVehicle.create({
      data: {
        schoolId,
        regNo,
        vehicleName,
        vehicleType,
        deviceId: deviceId ? String(deviceId).trim() : null,
        isActive: true,
      },
    });

    return res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    console.error("[addVehicle]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/vehicles/:id
// Body: { vehicleName?, vehicleType?, deviceId? }   (deviceId = GPS IMEI)
// ─────────────────────────────────────────────────────────────────────────────
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await findOwnedVehicle(req, req.params.id);
    if (!vehicle)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });

    const { vehicleName, vehicleType, deviceId } = req.body;
    const data = {};
    if (vehicleName !== undefined) data.vehicleName = vehicleName || null;
    if (vehicleType !== undefined) data.vehicleType = vehicleType || null;
    if (deviceId !== undefined)
      data.deviceId = deviceId ? String(deviceId).trim() : null;

    const updated = await prisma.schoolVehicle.update({
      where: { id: vehicle.id },
      data,
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("[updateVehicle]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/vehicles/:id/toggle
// ─────────────────────────────────────────────────────────────────────────────
export const toggleVehicle = async (req, res) => {
  try {
    const vehicle = await findOwnedVehicle(req, req.params.id);
    if (!vehicle)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });

    const updated = await prisma.schoolVehicle.update({
      where: { id: vehicle.id },
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
    const vehicle = await findOwnedVehicle(req, req.params.id);
    if (!vehicle)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });

    const location = await getLatestPoint(vehicle);
    if (!location)
      return res.json({
        success: true,
        data: null,
        message: "No location data yet",
      });
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
    const vehicle = await findOwnedVehicle(req, req.params.id);
    if (!vehicle)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });

    const { from, to } = req.query;
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 100, 1),
      2000,
    );

    const where = { schoolVehicleId: vehicle.id };
    if (from || to) {
      where.recordedAt = {};
      if (from) where.recordedAt.gte = new Date(from);
      if (to) where.recordedAt.lte = new Date(to);
    }

    const locations = await prisma.vehicleLocation.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: limit,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        speed: true,
        bearing: true,
        status: true,
        ignitionStatus: true,
        address: true,
        gpsTimestamp: true,
        recordedAt: true,
      },
    });

    return res.json({
      success: true,
      data: locations,
      total: locations.length,
    });
  } catch (err) {
    console.error("[getVehicleHistory]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/live-all?schoolId=&trail=1
// Snapshot of every active vehicle in a school (map dashboard)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllVehiclesLive = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const universityId = getUniversityId(req);
    if (!universityId)
      return res
        .status(400)
        .json({ success: false, message: "universityId missing" });

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
        deviceId: true,
        school: { select: { name: true } },
      },
    });

    const rows = await buildLiveRows(vehicles, {
      withTrail: req.query.trail === "1",
    });

    return res.json({
      success: true,
      data: rows,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[getAllVehiclesLive]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/live-stream?schoolId=      (Server-Sent Events)
// Pushes { vehicleId, latest, path[] } for any vehicle of the school
// ─────────────────────────────────────────────────────────────────────────────
export const streamSchoolVehicles = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });
    if (!(await schoolBelongsToUser(req, schoolId))) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this school",
      });
    }

    openSseStream(req, res, {
      subscribeFn: (fn) => subscribeSchool(schoolId, fn),
      initialEvents: [
        ["hello", { schoolId, serverTime: new Date().toISOString() }],
      ],
    });
  } catch (err) {
    console.error("[streamSchoolVehicles]", err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/eta?schoolId=
// Stop-by-stop ETA for every active vehicle of a school
// ─────────────────────────────────────────────────────────────────────────────
export const getSchoolVehiclesEta = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });
    if (!(await schoolBelongsToUser(req, schoolId)))
      return res.status(403).json({
        success: false,
        message: "You do not have access to this school",
      });

    const vehicles = await prisma.schoolVehicle.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, regNo: true, schoolId: true, deviceId: true },
    });
    const data = await computeEtaForVehicles(vehicles);
    return res.json({
      success: true,
      data,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[getSchoolVehiclesEta]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/:id/eta
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleEta = async (req, res) => {
  try {
    const vehicle = await findOwnedVehicle(req, req.params.id);
    if (!vehicle)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    const data = await computeVehicleEta(vehicle);
    return res.json({
      success: true,
      data,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[getVehicleEta]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared: road line + stops for one bus (also used by the Bus Head portal)
// ─────────────────────────────────────────────────────────────────────────────
export async function routeGeometryForVehicle(vehicle) {
  const route = await findRouteForVehicle(vehicle);
  if (!route) return { routeId: null, routeGeometry: null, stops: [] };
  const stops = (await getRouteStopsForMap(vehicle, route.id)).filter(
    (s) => s.latitude != null && s.longitude != null,
  );
  const routeGeometry = await Promise.race([
    getRoadGeometry(stops),
    new Promise((r) => setTimeout(() => r(null), 7000)),
  ]);
  return { routeId: route.id, routeGeometry, stops };
}

// GET /api/vehicles/:id/route-geometry
export const getVehicleRouteGeometry = async (req, res) => {
  try {
    const vehicle = await findOwnedVehicle(req, req.params.id);
    if (!vehicle)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    const data = await routeGeometryForVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getVehicleRouteGeometry]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STOP PRIORITY (order of stops on a route)
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE_STOP_SELECT = {
  id: true,
  stopOrder: true,
  pickupTime: true,
  dropTime: true,
  isActive: true,
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
};

async function routeForEditor(route, schoolLoc) {
  const routeStops = route.routeStops.filter(
    (rs) => rs.stop && !rs.stop.deletedAt,
  );
  const school = schoolForRoute(routeStops, schoolLoc);
  const coords = validateStopCoords(routeStops, school);
  return {
    id: route.id,
    name: route.name,
    code: route.code,
    vehicleNumber: route.vehicleNumber,
    isActive: route.isActive,
    school: school?.hasLocation
      ? { name: school.name, latitude: school.lat, longitude: school.lng }
      : { name: school?.name || "School", latitude: null, longitude: null },
    stops: routeStops
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map((rs, i) => {
        const c = coords.get(rs.id) || {};
        return {
          routeStopId: rs.id,
          stopId: rs.stop.id,
          priority: i + 1,
          name: rs.stop.name,
          landmark: rs.stop.landmark || rs.stop.area || null,
          pickupTime: rs.pickupTime || "",
          dropTime: rs.dropTime || "",
          isActive: rs.isActive,
          stopIsActive: rs.stop.isActive,
          latitude: c.hasLocation ? c.lat : null,
          longitude: c.hasLocation ? c.lng : null,
          rawLatitude: rs.stop.latitude,
          rawLongitude: rs.stop.longitude,
          locationIssue: c.invalid || c.fixed || null,
        };
      }),
  };
}

// GET /api/vehicles/routes?schoolId=
export const getRoutesForStopPriority = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });
    if (!(await schoolBelongsToUser(req, schoolId)))
      return res
        .status(403)
        .json({
          success: false,
          message: "You do not have access to this school",
        });

    const [routes, school] = await Promise.all([
      prisma.transportRoute.findMany({
        where: { schoolId, deletedAt: null },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          code: true,
          vehicleNumber: true,
          isActive: true,
          routeStops: { select: ROUTE_STOP_SELECT },
        },
      }),
      getSchoolLocation(schoolId),
    ]);
    const data = await Promise.all(
      routes.map((r) => routeForEditor(r, school)),
    );
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getRoutesForStopPriority]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/vehicles/routes/:routeId/stops
// Body: { stops: [{ routeStopId, pickupTime?, dropTime?, isActive? }] }
// The array order IS the priority: first = stop 1 of the morning pickup.
export const saveRouteStopPriority = async (req, res) => {
  try {
    const universityId = getUniversityId(req);
    const route = await prisma.transportRoute.findFirst({
      where: {
        id: req.params.routeId,
        deletedAt: null,
        school: { universityId },
      },
      select: {
        id: true,
        schoolId: true,
        routeStops: { select: { id: true } },
      },
    });
    if (!route)
      return res
        .status(404)
        .json({ success: false, message: "Route not found" });

    const list = Array.isArray(req.body?.stops) ? req.body.stops : null;
    if (!list?.length)
      return res
        .status(400)
        .json({ success: false, message: "stops array is required" });

    const known = new Set(route.routeStops.map((r) => r.id));
    const ids = list.map((x) => x.routeStopId);
    if (
      new Set(ids).size !== ids.length ||
      ids.some((id) => !known.has(id)) ||
      ids.length !== known.size
    )
      return res.status(400).json({
        success: false,
        message: "Send every stop of this route exactly once, in the new order",
      });

    for (const x of list) {
      for (const k of ["pickupTime", "dropTime"]) {
        if (x[k] && parseClock(x[k]) == null)
          return res
            .status(400)
            .json({
              success: false,
              message: `Invalid ${k} "${x[k]}" — use HH:MM`,
            });
      }
    }

    await prisma.$transaction([
      // 1) move out of the way (stopOrder is unique per route)
      ...list.map((x, i) =>
        prisma.transportRouteStop.update({
          where: { id: x.routeStopId },
          data: { stopOrder: -100000 - i },
        }),
      ),
      // 2) final order + times + on/off
      ...list.map((x, i) =>
        prisma.transportRouteStop.update({
          where: { id: x.routeStopId },
          data: {
            stopOrder: i,
            ...(x.pickupTime !== undefined
              ? { pickupTime: x.pickupTime || null }
              : {}),
            ...(x.dropTime !== undefined
              ? { dropTime: x.dropTime || null }
              : {}),
            ...(x.isActive !== undefined ? { isActive: !!x.isActive } : {}),
          },
        }),
      ),
    ]);

    invalidateRouteEta(route.schoolId);

    const [fresh, school] = await Promise.all([
      prisma.transportRoute.findUnique({
        where: { id: route.id },
        select: {
          id: true,
          name: true,
          code: true,
          vehicleNumber: true,
          isActive: true,
          routeStops: { select: ROUTE_STOP_SELECT },
        },
      }),
      getSchoolLocation(route.schoolId),
    ]);
    return res.json({
      success: true,
      data: await routeForEditor(fresh, school),
    });
  } catch (err) {
    console.error("[saveRouteStopPriority]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
