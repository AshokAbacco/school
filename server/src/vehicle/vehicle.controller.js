// server/src/vehicle/vehicle.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE CONTROLLER (UPDATED)
// ─ Add / list / update / toggle school vehicles
// ─ Latest location per vehicle (best of provider + direct device)
// ─ Location history
// ─ NEW: live SSE stream of all vehicles in a school
// ─ FIX: every :id endpoint now checks the vehicle belongs to the caller's
//        university (previously any logged-in user could read/toggle any bus)
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";
import {
  normalizeRegNo,
  getLatestPoint,
  getTrail,
  subscribeSchool,
  openSseStream,
} from "./liveTracking.service.js";

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

    const latest = await Promise.all(
      vehicles.map((v) => getLatestPoint(v).catch(() => null)),
    );

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
      return res
        .status(403)
        .json({
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
      return res
        .status(409)
        .json({
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

    const withTrail = req.query.trail === "1";
    const rows = await Promise.all(
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
          schoolName: v.school.name,
          location,
          ...(withTrail ? { trail } : {}),
        };
      }),
    );

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
      return res
        .status(403)
        .json({
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
