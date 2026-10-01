// server/src/parent/controllers/vehicleTracking.controller.js
// ═══════════════════════════════════════════════════════════════════════════════
// Parent — Vehicle Live Tracking (UPDATED)
// Chain: parentId (JWT) → StudentParent → Student → StudentTransport
//        → TransportRoute.vehicleNumber → SchoolVehicle → latest GPS point
//
// Endpoints
//   GET /api/parent/vehicle-tracking/children        → children + transport summary
//   GET /api/parent/vehicle-tracking?studentId=      → full snapshot (map + trail)
//   GET /api/parent/vehicle-tracking/stream?studentId= → Server-Sent Events (live)
//
// Fixes vs. old version
//   • regNo matching ignored spaces/hyphens → "KA 01 AB 1234" never matched
//     "KA01AB1234" (vehicle showed "not registered"). Now normalized both sides.
//   • SchoolVehicle lookup is scoped to the student's school (regNo is only
//     unique per school).
//   • Latest location skips rows with null lat/lng (map no longer breaks).
//   • Returns stop coordinates, ordered route stops, and recent trail for the map.
//   • Picks the primary parent link first; supports multiple children.
//   • Adds freshness (ageSec / isStale) so parents know if GPS is old.
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";
import {
  normalizeRegNo,
  getLatestPoint,
  getTrail,
  subscribeVehicle,
  openSseStream,
} from "../../vehicle/liveTracking.service.js";

const getParentId = (req) => req.user?.id || req.user?.parentId || null;

// ─────────────────────────────────────────────────────────────────────────────
// Shared resolver: parent + (optional) studentId → student, transport, vehicle
// ─────────────────────────────────────────────────────────────────────────────
async function resolveChildVehicle(parentId, studentId) {
  const studentLink = await prisma.studentParent.findFirst({
    where: {
      parentId,
      ...(studentId ? { studentId } : {}),
      student: { deletedAt: null },
    },
    include: { student: { select: { id: true, name: true, schoolId: true } } },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  if (!studentLink?.student) {
    return {
      status: "NO_STUDENT",
      message: "No student linked to this parent account",
    };
  }
  const student = studentLink.student;

  const transport = await prisma.studentTransport.findFirst({
    where: {
      studentId: student.id,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    orderBy: { startDate: "desc" },
    include: {
      route: {
        select: {
          id: true,
          name: true,
          code: true,
          vehicleNumber: true,
          driverName: true,
          driverPhone: true,
          conductorName: true,
          conductorPhone: true,
          routeStops: {
            where: { isActive: true },
            orderBy: { stopOrder: "asc" },
            select: {
              stopOrder: true,
              pickupTime: true,
              dropTime: true,
              stop: {
                select: {
                  id: true,
                  name: true,
                  area: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
        },
      },
      stop: {
        select: {
          id: true,
          name: true,
          area: true,
          landmark: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  if (!transport) {
    return {
      status: "NO_TRANSPORT",
      student,
      message: "No active transport assignment found for this student",
    };
  }

  const route = transport.route;
  const myRouteStop = route.routeStops.find(
    (rs) => rs.stop.id === transport.stop.id,
  );

  const base = {
    student,
    pickupType: transport.pickupType,
    route: {
      id: route.id,
      name: route.name,
      code: route.code,
      driverName: route.driverName,
      driverPhone: route.driverPhone,
      conductorName: route.conductorName,
      conductorPhone: route.conductorPhone,
    },
    stop: {
      ...transport.stop,
      pickupTime: myRouteStop?.pickupTime || null,
      dropTime: myRouteStop?.dropTime || null,
    },
    routeStops: route.routeStops
      .filter((rs) => rs.stop.latitude != null && rs.stop.longitude != null)
      .map((rs) => ({
        id: rs.stop.id,
        name: rs.stop.name,
        order: rs.stopOrder,
        latitude: rs.stop.latitude,
        longitude: rs.stop.longitude,
        pickupTime: rs.pickupTime,
        dropTime: rs.dropTime,
        isMyStop: rs.stop.id === transport.stop.id,
      })),
  };

  if (!route.vehicleNumber) {
    return {
      status: "NO_VEHICLE",
      ...base,
      message: "No vehicle assigned to this route yet",
    };
  }

  const wanted = normalizeRegNo(route.vehicleNumber);
  const schoolVehicles = await prisma.schoolVehicle.findMany({
    where: { schoolId: student.schoolId, isActive: true },
    select: {
      id: true,
      regNo: true,
      vehicleName: true,
      vehicleType: true,
      deviceId: true,
      schoolId: true,
    },
  });
  const vehicle = schoolVehicles.find(
    (v) => normalizeRegNo(v.regNo) === wanted,
  );

  if (!vehicle) {
    return {
      status: "NOT_REGISTERED",
      ...base,
      vehicleRegNo: route.vehicleNumber,
      message: "This bus is not yet registered for live tracking",
    };
  }

  return { status: "OK", ...base, vehicle };
}

const publicVehicle = (v) =>
  v
    ? {
        id: v.id,
        regNo: v.regNo,
        vehicleName: v.vehicleName,
        vehicleType: v.vehicleType,
      }
    : null;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/vehicle-tracking/children
// ─────────────────────────────────────────────────────────────────────────────
export const getTrackableChildren = async (req, res) => {
  try {
    const parentId = getParentId(req);
    if (!parentId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const links = await prisma.studentParent.findMany({
      where: { parentId, student: { deletedAt: null } },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { student: { select: { id: true, name: true } } },
    });

    const data = await Promise.all(
      links.map(async ({ student }) => {
        const t = await prisma.studentTransport.findFirst({
          where: { studentId: student.id, isActive: true },
          orderBy: { startDate: "desc" },
          select: { route: { select: { name: true, code: true } } },
        });
        return {
          studentId: student.id,
          name: student.name,
          hasTransport: !!t,
          routeName: t?.route?.name || null,
        };
      }),
    );

    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getTrackableChildren]", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not load children" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/vehicle-tracking?studentId=&trail=1
// ─────────────────────────────────────────────────────────────────────────────
export const getChildBusLocation = async (req, res) => {
  try {
    const parentId = getParentId(req);
    if (!parentId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { studentId } = req.query;
    const withTrail = req.query.trail !== "0";
    const r = await resolveChildVehicle(parentId, studentId);

    if (r.status === "NO_STUDENT") {
      return res.json({
        success: true,
        data: null,
        status: r.status,
        message: r.message,
      });
    }
    if (r.status === "NO_TRANSPORT") {
      return res.json({
        success: true,
        data: null,
        status: r.status,
        studentName: r.student.name,
        message: r.message,
      });
    }

    const common = {
      status: r.status,
      studentId: r.student.id,
      studentName: r.student.name,
      pickupType: r.pickupType,
      route: r.route,
      stop: r.stop,
      routeStops: r.routeStops,
      serverTime: new Date().toISOString(),
    };

    if (r.status !== "OK") {
      return res.json({
        success: true,
        data: {
          ...common,
          vehicle: r.vehicleRegNo ? { regNo: r.vehicleRegNo } : null,
          location: null,
          trail: [],
          message: r.message,
        },
      });
    }

    const [location, trail] = await Promise.all([
      getLatestPoint(r.vehicle),
      withTrail
        ? getTrail(r.vehicle, { minutes: 30, limit: 300 })
        : Promise.resolve([]),
    ]);

    return res.json({
      success: true,
      data: {
        ...common,
        vehicle: publicVehicle(r.vehicle),
        location,
        trail,
        message: location
          ? null
          : "No live location yet — the bus may not have started",
      },
    });
  } catch (err) {
    console.error("[getChildBusLocation]", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not load bus location" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/vehicle-tracking/stream?studentId=
// Server-Sent Events. Events:
//   hello    → { vehicleId, location }
//   location → { vehicleId, latest, path[], serverTime }
//   reconnect→ server asks client to reconnect
// ─────────────────────────────────────────────────────────────────────────────
export const streamChildBusLocation = async (req, res) => {
  try {
    const parentId = getParentId(req);
    if (!parentId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const r = await resolveChildVehicle(parentId, req.query.studentId);
    if (r.status !== "OK") {
      // Not an error for the UI – nothing to stream. Client falls back to slow polling.
      return res
        .status(409)
        .json({ success: false, status: r.status, message: r.message });
    }

    const location = await getLatestPoint(r.vehicle);

    openSseStream(req, res, {
      subscribeFn: (fn) => subscribeVehicle(r.vehicle.id, fn),
      initialEvents: [
        [
          "hello",
          {
            vehicleId: r.vehicle.id,
            location,
            serverTime: new Date().toISOString(),
          },
        ],
      ],
    });
  } catch (err) {
    console.error("[streamChildBusLocation]", err);
    if (!res.headersSent)
      res
        .status(500)
        .json({ success: false, message: "Could not open live stream" });
  }
};
