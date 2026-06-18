// server/src/parent/controllers/vehicleTracking.controller.js
// ═══════════════════════════════════════════════════════════════
// Parent — Vehicle Live Tracking
// Gets parentId from JWT token → finds linked student automatically
// No studentId query param needed from frontend
// Chain: parentId → StudentParent → Student → StudentTransport
//        → TransportRoute → vehicleNumber → SchoolVehicle → VehicleLocation
// ═══════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";

export const getChildBusLocation = async (req, res) => {
  try {
    // ── 1. Get parentId from JWT token (set by requireAuth middleware) ─────────
    const parentId = req.user?.id || req.user?.parentId;
    if (!parentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Optional: if parent has multiple children, use studentId query param
    const { studentId } = req.query;

    // ── 2. Find student linked to this parent ─────────────────────────────────
    const studentLink = await prisma.studentParent.findFirst({
      where: {
        parentId,
        ...(studentId ? { studentId } : {}),
      },
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
    });

    if (!studentLink?.student) {
      return res.json({
        success: true,
        data: null,
        message: "No student linked to this parent account",
      });
    }

    const resolvedStudentId = studentLink.student.id;
    const studentName       = studentLink.student.name;

    // ── 3. Get student's active transport assignment ───────────────────────────
    const transport = await prisma.studentTransport.findFirst({
      where: { studentId: resolvedStudentId, isActive: true },
      include: {
        route: {
          select: {
            id: true, name: true, code: true,
            vehicleNumber: true,
            driverName: true, driverPhone: true,
            conductorName: true, conductorPhone: true,
          },
        },
        stop: {
          select: { id: true, name: true, area: true, latitude: true, longitude: true },
        },
      },
    });

    if (!transport) {
      return res.json({
        success: true,
        data: null,
        studentName,
        message: "No active transport assignment found for this student",
      });
    }

    const route = transport.route;

    if (!route?.vehicleNumber) {
      return res.json({
        success: true,
        data: {
          studentName,
          route: {
            name: route.name, code: route.code,
            driverName: route.driverName, driverPhone: route.driverPhone,
            conductorName: route.conductorName,
          },
          stop: transport.stop,
          vehicle: null, location: null,
          message: "No vehicle assigned to this route yet",
        },
      });
    }

    // ── 4. Match vehicleNumber → SchoolVehicle ────────────────────────────────
    const vehicle = await prisma.schoolVehicle.findFirst({
      where: { regNo: route.vehicleNumber.toUpperCase().trim(), isActive: true },
      select: { id: true, regNo: true, vehicleName: true, vehicleType: true },
    });

    if (!vehicle) {
      return res.json({
        success: true,
        data: {
          studentName,
          route: {
            name: route.name, code: route.code,
            driverName: route.driverName, driverPhone: route.driverPhone,
            conductorName: route.conductorName,
          },
          stop: transport.stop,
          vehicle: { regNo: route.vehicleNumber },
          location: null,
          message: "Vehicle not yet registered in tracking system",
        },
      });
    }

    // ── 5. Get latest location ────────────────────────────────────────────────
    const location = await prisma.vehicleLocation.findFirst({
      where:   { schoolVehicleId: vehicle.id },
      orderBy: { recordedAt: "desc" },
      select: {
        latitude: true, longitude: true,
        speed: true, bearing: true,
        status: true, ignitionStatus: true, vehicleStatus: true,
        address: true, gpsTimestamp: true, recordedAt: true,
      },
    });

    return res.json({
      success: true,
      data: {
        studentName,
        route: {
          name: route.name, code: route.code,
          driverName: route.driverName, driverPhone: route.driverPhone,
          conductorName: route.conductorName,
        },
        stop:     transport.stop,
        vehicle:  { regNo: vehicle.regNo, vehicleName: vehicle.vehicleName, vehicleType: vehicle.vehicleType },
        location,
      },
    });

  } catch (err) {
    console.error("[getChildBusLocation]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};