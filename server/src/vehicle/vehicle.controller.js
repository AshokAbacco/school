// server/src/vehicle/vehicle.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE CONTROLLER
// ─ Add / list / toggle school vehicles
// ─ Get latest location per vehicle
// ─ Get location history for a vehicle
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles?schoolId=
// List all vehicles for a school
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicles = async (req, res) => {
  try {
    const { schoolId, includeInactive } = req.query;
    const universityId = req.user?.universityId;

    if (!universityId) return res.status(400).json({ success: false, message: "universityId missing" });

    const where = { school: { universityId } };
    if (schoolId) where.schoolId = schoolId;
    if (includeInactive !== "true") where.isActive = true;

    const vehicles = await prisma.schoolVehicle.findMany({
      where,
      include: {
        school: { select: { id: true, name: true, code: true } },
        locations: {
          orderBy: { recordedAt: "desc" },
          take: 1, // latest location only
          select: {
            latitude: true, longitude: true, speed: true,
            status: true, ignitionStatus: true, vehicleStatus: true,
            address: true, gpsTimestamp: true, recordedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

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
      latestLocation: v.locations[0] || null,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getVehicles]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vehicles
// Add a new vehicle to a school
// Body: { schoolId, regNo, vehicleName, vehicleType }
// ─────────────────────────────────────────────────────────────────────────────
export const addVehicle = async (req, res) => {
  try {
    let { schoolId, regNo, vehicleName, vehicleType } = req.body;

    if (!schoolId || !regNo) {
      return res.status(400).json({ success: false, message: "schoolId and regNo are required" });
    }

    // regNo always stored uppercase
   regNo = regNo.toUpperCase().replace(/\s+/g, "").trim();

    // Check duplicate
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
      data: { schoolId, regNo, vehicleName, vehicleType, isActive: true },
    });

    return res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    console.error("[addVehicle]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/vehicles/:id/toggle
// Activate / deactivate a vehicle
// ─────────────────────────────────────────────────────────────────────────────
export const toggleVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.schoolVehicle.findUnique({ where: { id } });
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

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
// Latest location for one vehicle
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleLiveLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await prisma.vehicleLocation.findFirst({
      where: { schoolVehicleId: id },
      orderBy: { recordedAt: "desc" },
    });

    if (!location) {
      return res.json({ success: true, data: null, message: "No location data yet" });
    }

    return res.json({ success: true, data: location });
  } catch (err) {
    console.error("[getVehicleLiveLocation]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/:id/history?from=&to=&limit=
// Location history for one vehicle
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, limit = "100" } = req.query;

    const where = { schoolVehicleId: id };
    if (from || to) {
      where.recordedAt = {};
      if (from) where.recordedAt.gte = new Date(from);
      if (to)   where.recordedAt.lte = new Date(to);
    }

    const locations = await prisma.vehicleLocation.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: parseInt(limit),
      select: {
        id: true, latitude: true, longitude: true,
        speed: true, bearing: true, status: true,
        ignitionStatus: true, address: true,
        gpsTimestamp: true, recordedAt: true,
      },
    });

    return res.json({ success: true, data: locations, total: locations.length });
  } catch (err) {
    console.error("[getVehicleHistory]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vehicles/live-all?schoolId=
// Latest location for ALL vehicles of a school (for dashboard map view)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllVehiclesLive = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const universityId = req.user?.universityId;

    if (!universityId) return res.status(400).json({ success: false, message: "universityId missing" });

    const where = { school: { universityId }, isActive: true };
    if (schoolId) where.schoolId = schoolId;

    const vehicles = await prisma.schoolVehicle.findMany({
      where,
      select: {
        id: true, regNo: true, vehicleName: true, vehicleType: true, schoolId: true,
        school: { select: { name: true } },
        locations: {
          orderBy: { recordedAt: "desc" },
          take: 1,
          select: {
            latitude: true, longitude: true, speed: true, bearing: true,
            status: true, ignitionStatus: true, vehicleStatus: true,
            address: true, gpsTimestamp: true, recordedAt: true,
          },
        },
      },
    });

    const data = vehicles.map((v) => ({
      id:             v.id,
      regNo:          v.regNo,
      vehicleName:    v.vehicleName,
      vehicleType:    v.vehicleType,
      schoolId:       v.schoolId,
      schoolName:     v.school.name,
      location:       v.locations[0] || null,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getAllVehiclesLive]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};