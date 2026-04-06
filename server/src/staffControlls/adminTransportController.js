// server/src/staffControlls/adminTransportController.js
import { prisma } from "../config/db.js";
import cacheService from "../utils/cacheService.js";

// ── Guards & helpers ──────────────────────────────────────────────────────────
const schoolGuard = (req) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) throw new Error("No schoolId on token");
  return schoolId;
};

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });

// ═══════════════════════════════════════════════════════════════
//  TRANSPORT ROUTES
// ═══════════════════════════════════════════════════════════════

export async function getRoutes(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { isActive } = req.query;

    const cacheKey = await cacheService.buildKey(schoolId, `transport:routes:${isActive ?? "all"}`);
    const cached   = await cacheService.get(cacheKey);
    if (cached) return ok(res, { data: JSON.parse(cached) });

    const routes = await prisma.transportRoute.findMany({
      where: {
        schoolId,
        ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
      },
      include: {
        routeStops: {
          where:   { isActive: true },
          include: { stop: { select: { id: true, name: true, landmark: true, area: true } } },
          orderBy: { stopOrder: "asc" },
        },
        _count: { select: { studentTransport: { where: { isActive: true } } } },
      },
      orderBy: { name: "asc" },
    });

    await cacheService.set(cacheKey, routes);
    return ok(res, { data: routes });
  } catch (e) {
    console.error("[getRoutes]", e);
    return err(res, e.message, 500);
  }
}

export async function getRouteById(req, res) {
  try {
    const schoolId = schoolGuard(req);

    const route = await prisma.transportRoute.findFirst({
      where: { id: req.params.id, schoolId },
      include: {
        routeStops: {
          where:   { isActive: true },
          include: { stop: true },
          orderBy: { stopOrder: "asc" },
        },
        feePlans: {
          include: {
            academicYear: { select: { id: true, name: true } },
            stop:         true,
          },
        },
        studentTransport: {
          where: { isActive: true },
          include: {
            student:     { select: { id: true, name: true, email: true } },
            stop:        { select: { id: true, name: true } },
            academicYear:{ select: { id: true, name: true } },
          },
        },
      },
    });

    if (!route) return err(res, "Route not found", 404);
    return ok(res, { data: route });
  } catch (e) {
    console.error("[getRouteById]", e);
    return err(res, e.message, 500);
  }
}

export async function createRoute(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const {
      name, code, description, vehicleNumber,
      driverName, driverPhone,
      conductorName, conductorPhone, // kept for backward compat; optional
      capacity,
    } = req.body;

    if (!name) return err(res, "name is required");
    if (!code) return err(res, "code is required");

    const exists = await prisma.transportRoute.findFirst({ where: { code, schoolId } });
    if (exists) return err(res, "Route code already exists");

    // Routes are metadata only — stops are added separately via POST /:routeId/stops
    const route = await prisma.transportRoute.create({
      data: {
        schoolId, name, code, description,
        vehicleNumber, driverName, driverPhone,
        conductorName, conductorPhone,
        capacity: capacity ? parseInt(capacity) : null,
      },
      include: {
        routeStops: true,
        _count: { select: { studentTransport: true } },
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: route }, 201);
  } catch (e) {
    console.error("[createRoute]", e);
    return err(res, e.message, 500);
  }
}

export async function updateRoute(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const existing = await prisma.transportRoute.findFirst({ where: { id: req.params.id, schoolId } });
    if (!existing) return err(res, "Route not found", 404);

    const {
      name, code, description, vehicleNumber,
      driverName, driverPhone,
      conductorName, conductorPhone,
      capacity, isActive,
    } = req.body;

    if (code && code !== existing.code) {
      const dup = await prisma.transportRoute.findFirst({ where: { code, schoolId } });
      if (dup) return err(res, "Route code already exists");
    }

    const route = await prisma.transportRoute.update({
      where: { id: req.params.id },
      data: {
        ...(name           !== undefined ? { name }           : {}),
        ...(code           !== undefined ? { code }           : {}),
        ...(description    !== undefined ? { description }    : {}),
        ...(vehicleNumber  !== undefined ? { vehicleNumber }  : {}),
        ...(driverName     !== undefined ? { driverName }     : {}),
        ...(driverPhone    !== undefined ? { driverPhone }    : {}),
        ...(conductorName  !== undefined ? { conductorName }  : {}),
        ...(conductorPhone !== undefined ? { conductorPhone } : {}),
        ...(capacity       !== undefined ? { capacity: capacity ? parseInt(capacity) : null } : {}),
        ...(isActive       !== undefined ? { isActive }       : {}),
      },
      include: {
        routeStops: {
          where:   { isActive: true },
          include: { stop: true },
          orderBy: { stopOrder: "asc" },
        },
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: route });
  } catch (e) {
    console.error("[updateRoute]", e);
    return err(res, e.message, 500);
  }
}

export async function deleteRoute(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const existing = await prisma.transportRoute.findFirst({ where: { id: req.params.id, schoolId } });
    if (!existing) return err(res, "Route not found", 404);

    const activeStudents = await prisma.studentTransport.count({
      where: { routeId: req.params.id, isActive: true },
    });
    if (activeStudents > 0) {
      return err(res, `Cannot deactivate: ${activeStudents} student(s) assigned. Remove them first.`, 409);
    }

    await prisma.transportRoute.update({ where: { id: req.params.id }, data: { isActive: false } });
    await cacheService.invalidateSchool(schoolId);
    return ok(res, { message: "Route deactivated successfully" });
  } catch (e) {
    console.error("[deleteRoute]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  TRANSPORT STOPS
// ═══════════════════════════════════════════════════════════════

export async function getStops(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { area, isActive } = req.query;

    const cacheKey = await cacheService.buildKey(schoolId, `transport:stops:${area ?? "all"}:${isActive ?? "all"}`);
    const cached   = await cacheService.get(cacheKey);
    if (cached) return ok(res, { data: JSON.parse(cached) });

    const stops = await prisma.transportStop.findMany({
      where: {
        schoolId,
        ...(area     ? { area }                                        : {}),
        ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
      },
      include: {
        _count: { select: { studentTransport: { where: { isActive: true } } } },
      },
      orderBy: [{ area: "asc" }, { name: "asc" }],
    });

    await cacheService.set(cacheKey, stops);
    return ok(res, { data: stops });
  } catch (e) {
    console.error("[getStops]", e);
    return err(res, e.message, 500);
  }
}

export async function createStop(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { name, landmark, area, latitude, longitude } = req.body;

    if (!name) return err(res, "name is required");

    const stop = await prisma.transportStop.create({
      data: {
        schoolId, name, landmark, area,
        latitude:  latitude  ? parseFloat(latitude)  : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: stop }, 201);
  } catch (e) {
    console.error("[createStop]", e);
    return err(res, e.message, 500);
  }
}

export async function updateStop(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const existing = await prisma.transportStop.findFirst({ where: { id: req.params.id, schoolId } });
    if (!existing) return err(res, "Stop not found", 404);

    const { name, landmark, area, latitude, longitude, isActive } = req.body;

    const stop = await prisma.transportStop.update({
      where: { id: req.params.id },
      data: {
        ...(name      !== undefined ? { name }      : {}),
        ...(landmark  !== undefined ? { landmark }  : {}),
        ...(area      !== undefined ? { area }      : {}),
        ...(latitude  !== undefined ? { latitude:  latitude  ? parseFloat(latitude)  : null } : {}),
        ...(longitude !== undefined ? { longitude: longitude ? parseFloat(longitude) : null } : {}),
        ...(isActive  !== undefined ? { isActive }  : {}),
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: stop });
  } catch (e) {
    console.error("[updateStop]", e);
    return err(res, e.message, 500);
  }
}

export async function deleteStop(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const existing = await prisma.transportStop.findFirst({ where: { id: req.params.id, schoolId } });
    if (!existing) return err(res, "Stop not found", 404);

    const activeStudents = await prisma.studentTransport.count({
      where: { stopId: req.params.id, isActive: true },
    });
    if (activeStudents > 0) {
      return err(res, `Cannot deactivate: ${activeStudents} student(s) at this stop.`, 409);
    }

    // Also check if stop is used in any active route
    const routeUsage = await prisma.transportRouteStop.count({
      where: { stopId: req.params.id, isActive: true },
    });
    if (routeUsage > 0) {
      return err(res, `Cannot deactivate: stop is used in ${routeUsage} route(s). Remove it from routes first.`, 409);
    }

    await prisma.transportStop.update({ where: { id: req.params.id }, data: { isActive: false } });
    await cacheService.invalidateSchool(schoolId);
    return ok(res, { message: "Stop deactivated successfully" });
  } catch (e) {
    console.error("[deleteStop]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ROUTE STOPS — assign stops to a route with strict ordering
// ═══════════════════════════════════════════════════════════════

/**
 * GET /:routeId/stops
 * Returns ordered stops for a specific route (always ASC by stopOrder).
 */
export async function getRouteStops(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { routeId } = req.params;

    const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
    if (!route) return err(res, "Route not found", 404);

    const stops = await prisma.transportRouteStop.findMany({
      where:   { routeId, isActive: true },
      include: { stop: true },
      orderBy: { stopOrder: "asc" },
    });

    return ok(res, { data: stops });
  } catch (e) {
    console.error("[getRouteStops]", e);
    return err(res, e.message, 500);
  }
}

/**
 * POST /:routeId/stops
 * Add a stop to a route at a given position.
 *
 * Insertion rules:
 *   • stopOrder must be an integer >= 0
 *   • If stopOrder equals an existing order → shift all stops at that position
 *     and above up by 1 (insert-in-middle semantics)
 *   • If stopOrder equals (current max + 1) → append
 *   • Any stopOrder > (current max + 1) is rejected (gap prevention)
 *   • If route has no stops yet, only stopOrder = 0 is accepted
 *
 * All mutations run inside a transaction to keep the order consistent.
 */
export async function addStopToRoute(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { routeId } = req.params;
    const { stopId, stopOrder: rawOrder, pickupTime, dropTime, distanceKm } = req.body;

    // ── Basic validation ──────────────────────────────────────
    if (!stopId)              return err(res, "stopId is required");
    if (rawOrder === undefined || rawOrder === null || rawOrder === "") {
      return err(res, "stopOrder is required");
    }

    const stopOrder = parseInt(rawOrder, 10);
    if (!Number.isInteger(stopOrder) || stopOrder < 0) {
      return err(res, "stopOrder must be a non-negative integer");
    }

    // ── Ownership checks ──────────────────────────────────────
    const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
    if (!route) return err(res, "Route not found", 404);

    const stop = await prisma.transportStop.findFirst({ where: { id: stopId, schoolId } });
    if (!stop) return err(res, "Stop not found", 404);

    // ── Transaction: validate order + shift + insert ──────────
    const routeStop = await prisma.$transaction(async (tx) => {
      // Existing active stops for this route, ordered
      const existing = await tx.transportRouteStop.findMany({
        where:   { routeId, isActive: true },
        orderBy: { stopOrder: "asc" },
        select:  { id: true, stopId: true, stopOrder: true },
      });

      // Prevent duplicate stop on same route
      const alreadyAssigned = existing.some((rs) => rs.stopId === stopId);
      if (alreadyAssigned) {
        throw new Error("This stop is already assigned to the route");
      }

      const currentMax = existing.length > 0 ? existing[existing.length - 1].stopOrder : -1;

      // Gap prevention: new order can be at most (currentMax + 1)
      if (stopOrder > currentMax + 1) {
        throw new Error(
          `stopOrder ${stopOrder} would create a gap. Next valid order is ${currentMax + 1} (append) or any existing order (insert).`
        );
      }

      // If inserting in the middle or at start: shift existing stops at this position and above
      const toShift = existing.filter((rs) => rs.stopOrder >= stopOrder);
      if (toShift.length > 0) {
        // Shift in reverse order to avoid transient unique-constraint violations
        for (const rs of [...toShift].reverse()) {
          await tx.transportRouteStop.update({
            where: { id: rs.id },
            data:  { stopOrder: rs.stopOrder + 1 },
          });
        }
      }

      // Create the new stop entry
      return tx.transportRouteStop.create({
        data: {
          routeId, stopId,
          stopOrder,
          pickupTime:  pickupTime  ?? null,
          dropTime:    dropTime    ?? null,
          distanceKm:  distanceKm  ? parseFloat(distanceKm) : null,
        },
        include: { stop: true },
      });
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: routeStop }, 201);
  } catch (e) {
    if (e.code === "P2002") return err(res, "Order conflict — another stop already occupies that position");
    console.error("[addStopToRoute]", e);
    return err(res, e.message, e.message.includes("gap") || e.message.includes("already assigned") ? 400 : 500);
  }
}

/**
 * PUT /:routeId/stops/:routeStopId
 * Update timing/distance for an existing route stop.
 * stopOrder changes must go through reorder API.
 */
export async function updateRouteStop(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { routeId, routeStopId } = req.params;
    const { pickupTime, dropTime, distanceKm } = req.body;

    const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
    if (!route) return err(res, "Route not found", 404);

    const rs = await prisma.transportRouteStop.findFirst({ where: { id: routeStopId, routeId } });
    if (!rs) return err(res, "Route stop not found", 404);

    const updated = await prisma.transportRouteStop.update({
      where: { id: routeStopId },
      data: {
        ...(pickupTime  !== undefined ? { pickupTime }                          : {}),
        ...(dropTime    !== undefined ? { dropTime }                            : {}),
        ...(distanceKm  !== undefined ? { distanceKm: distanceKm ? parseFloat(distanceKm) : null } : {}),
      },
      include: { stop: true },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: updated });
  } catch (e) {
    console.error("[updateRouteStop]", e);
    return err(res, e.message, 500);
  }
}

/**
 * DELETE /:routeId/stops/:routeStopId
 * Remove a stop from a route and compact the order sequence.
 */
export async function removeStopFromRoute(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { routeId, routeStopId } = req.params;

    const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
    if (!route) return err(res, "Route not found", 404);

    const rs = await prisma.transportRouteStop.findFirst({
      where: { id: routeStopId, routeId, isActive: true },
    });
    if (!rs) return err(res, "Route stop not found", 404);

    // Check if any active students are assigned to this exact stop on this route
    const studentCount = await prisma.studentTransport.count({
      where: { routeId, stopId: rs.stopId, isActive: true },
    });
    if (studentCount > 0) {
      return err(res, `Cannot remove: ${studentCount} student(s) are assigned to this stop on this route. Reassign them first.`, 409);
    }

    // Soft-delete + compact order in a transaction
    await prisma.$transaction(async (tx) => {
      // Soft-delete the route stop
      await tx.transportRouteStop.update({
        where: { id: routeStopId },
        data:  { isActive: false },
      });

      // Re-compact: fetch remaining active stops and renumber 0, 1, 2 …
      const remaining = await tx.transportRouteStop.findMany({
        where:   { routeId, isActive: true },
        orderBy: { stopOrder: "asc" },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].stopOrder !== i) {
          await tx.transportRouteStop.update({
            where: { id: remaining[i].id },
            data:  { stopOrder: i },
          });
        }
      }
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { message: "Stop removed from route and order compacted" });
  } catch (e) {
    console.error("[removeStopFromRoute]", e);
    return err(res, e.message, 500);
  }
}

/**
 * PUT /:routeId/stops/reorder
 * Bulk reorder all stops on a route.
 *
 * Body: { order: ["routeStopId1", "routeStopId2", …] }
 * The array position becomes the new stopOrder (0-indexed).
 * All IDs must belong to the route; no gaps will exist after this call.
 */
export async function reorderRouteStops(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { routeId } = req.params;
    const { order } = req.body; // array of routeStopId strings

    if (!Array.isArray(order) || order.length === 0) {
      return err(res, "order must be a non-empty array of routeStopIds");
    }

    const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
    if (!route) return err(res, "Route not found", 404);

    // Fetch current active stops
    const existing = await prisma.transportRouteStop.findMany({
      where:  { routeId, isActive: true },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((rs) => rs.id));
    const orderSet    = new Set(order);

    // Validate: every ID in the request must belong to this route
    for (const id of order) {
      if (!existingIds.has(id)) {
        return err(res, `routeStopId "${id}" does not belong to this route`);
      }
    }

    // Validate: all active stops must be present in the new order (no omissions)
    if (order.length !== existing.length) {
      return err(res, `All ${existing.length} active stops must be included in the reorder. Received ${order.length}.`);
    }

    // Apply new order in a transaction
    // Use a large temporary offset to sidestep unique constraint during updates
    const TEMP_OFFSET = 10_000;

    await prisma.$transaction(async (tx) => {
      // Phase 1: shift to temp range to avoid collisions
      for (let i = 0; i < order.length; i++) {
        await tx.transportRouteStop.update({
          where: { id: order[i] },
          data:  { stopOrder: TEMP_OFFSET + i },
        });
      }
      // Phase 2: set final values
      for (let i = 0; i < order.length; i++) {
        await tx.transportRouteStop.update({
          where: { id: order[i] },
          data:  { stopOrder: i },
        });
      }
    });

    // Return updated stops in new order
    const updated = await prisma.transportRouteStop.findMany({
      where:   { routeId, isActive: true },
      include: { stop: true },
      orderBy: { stopOrder: "asc" },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: updated });
  } catch (e) {
    console.error("[reorderRouteStops]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  FEE PLANS
// ═══════════════════════════════════════════════════════════════

export async function getFeePlans(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { routeId, academicYearId } = req.query;

    const plans = await prisma.transportFeePlan.findMany({
      where: {
        route: { schoolId },
        ...(routeId        ? { routeId }        : {}),
        ...(academicYearId ? { academicYearId } : {}),
        isActive: true,
      },
      include: {
        route:        { select: { id: true, name: true, code: true } },
        stop:         { select: { id: true, name: true, area: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: [{ route: { name: "asc" } }, { stop: { name: "asc" } }],
    });

    return ok(res, { data: plans });
  } catch (e) {
    console.error("[getFeePlans]", e);
    return err(res, e.message, 500);
  }
}

export async function createFeePlan(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { routeId, stopId, academicYearId, amount, frequency, effectiveFrom } = req.body;

    if (!routeId)        return err(res, "routeId is required");
    if (!stopId)         return err(res, "stopId is required");
    if (!academicYearId) return err(res, "academicYearId is required");
    if (!amount)         return err(res, "amount is required");

    const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
    if (!route) return err(res, "Route not found");

    const validFrequencies = ["MONTHLY", "QUARTERLY", "ANNUAL"];
    if (frequency && !validFrequencies.includes(frequency)) {
      return err(res, `frequency must be one of ${validFrequencies.join(", ")}`);
    }

    const plan = await prisma.transportFeePlan.create({
      data: {
        routeId, stopId, academicYearId,
        amount:        parseFloat(amount),
        frequency:     frequency || "MONTHLY",
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
      },
      include: {
        route:        { select: { id: true, name: true } },
        stop:         { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: plan }, 201);
  } catch (e) {
    if (e.code === "P2002") return err(res, "Fee plan already exists for this route/stop/year combination");
    console.error("[createFeePlan]", e);
    return err(res, e.message, 500);
  }
}

export async function updateFeePlan(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { amount, frequency, effectiveFrom, isActive } = req.body;

    const existing = await prisma.transportFeePlan.findFirst({
      where: { id: req.params.id, route: { schoolId } },
    });
    if (!existing) return err(res, "Fee plan not found", 404);

    const plan = await prisma.transportFeePlan.update({
      where: { id: req.params.id },
      data: {
        ...(amount        !== undefined ? { amount: parseFloat(amount) }                                   : {}),
        ...(frequency     !== undefined ? { frequency }                                                    : {}),
        ...(effectiveFrom !== undefined ? { effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null }: {}),
        ...(isActive      !== undefined ? { isActive }                                                     : {}),
      },
      include: {
        route:        { select: { id: true, name: true } },
        stop:         { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: plan });
  } catch (e) {
    console.error("[updateFeePlan]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  STUDENT TRANSPORT ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════

export async function getStudentTransports(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { academicYearId, routeId, stopId, isActive } = req.query;

    const assignments = await prisma.studentTransport.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(routeId        ? { routeId }        : {}),
        ...(stopId         ? { stopId }         : {}),
        ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
      },
      include: {
        student:     { select: { id: true, name: true, email: true } },
        route:       { select: { id: true, name: true, code: true } },
        stop:        { select: { id: true, name: true, area: true } },
        academicYear:{ select: { id: true, name: true } },
        feePlan:     { select: { id: true, amount: true, frequency: true } },
        feeEntries:  { orderBy: { dueDate: "desc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(res, { data: assignments });
  } catch (e) {
    console.error("[getStudentTransports]", e);
    return err(res, e.message, 500);
  }
}

export async function assignStudentTransport(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const {
      studentId, routeId, stopId, academicYearId,
      feePlanId, pickupType, startDate, feeAmount,
    } = req.body;

    if (!studentId)              return err(res, "studentId is required");
    if (!routeId)                return err(res, "routeId is required");
    if (!stopId)                 return err(res, "stopId is required");
    if (!academicYearId)         return err(res, "academicYearId is required");
    if (feeAmount === undefined)  return err(res, "feeAmount is required");

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) return err(res, "Student not found");

    const route = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId } });
    if (!route) return err(res, "Route not found");

    // Verify the stop is actually on this route
    const stopOnRoute = await prisma.transportRouteStop.findFirst({
      where: { routeId, stopId, isActive: true },
    });
    if (!stopOnRoute) return err(res, "The selected stop is not assigned to this route");

    const existing = await prisma.studentTransport.findFirst({
      where: { studentId, academicYearId, isActive: true },
    });
    if (existing) return err(res, "Student already has an active transport assignment for this year", 409);

    const assignment = await prisma.studentTransport.create({
      data: {
        studentId, routeId, stopId, schoolId, academicYearId,
        feePlanId:  feePlanId  || null,
        pickupType: pickupType || "BOTH",
        feeAmount:  parseFloat(feeAmount),
        startDate:  startDate ? new Date(startDate) : new Date(),
      },
      include: {
        student:     { select: { id: true, name: true, email: true } },
        route:       { select: { id: true, name: true, code: true } },
        stop:        { select: { id: true, name: true, area: true } },
        academicYear:{ select: { id: true, name: true } },
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: assignment }, 201);
  } catch (e) {
    console.error("[assignStudentTransport]", e);
    return err(res, e.message, 500);
  }
}

export async function updateStudentTransport(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const existing = await prisma.studentTransport.findFirst({
      where: { id: req.params.id, schoolId },
    });
    if (!existing) return err(res, "Assignment not found", 404);

    const { routeId, stopId, feePlanId, pickupType, endDate, isActive, feeAmount, remarks } = req.body;

    // If changing route/stop, verify the new stop is on the new route
    if (routeId || stopId) {
      const effectiveRouteId = routeId || existing.routeId;
      const effectiveStopId  = stopId  || existing.stopId;
      const stopOnRoute = await prisma.transportRouteStop.findFirst({
        where: { routeId: effectiveRouteId, stopId: effectiveStopId, isActive: true },
      });
      if (!stopOnRoute) return err(res, "The selected stop is not assigned to this route");
    }

    const assignment = await prisma.studentTransport.update({
      where: { id: req.params.id },
      data: {
        ...(routeId    !== undefined ? { routeId }                                  : {}),
        ...(stopId     !== undefined ? { stopId }                                   : {}),
        ...(feePlanId  !== undefined ? { feePlanId: feePlanId || null }             : {}),
        ...(pickupType !== undefined ? { pickupType }                               : {}),
        ...(endDate    !== undefined ? { endDate: endDate ? new Date(endDate) : null}: {}),
        ...(isActive   !== undefined ? { isActive }                                 : {}),
        ...(feeAmount  !== undefined ? { feeAmount: parseFloat(feeAmount) }         : {}),
        ...(remarks    !== undefined ? { remarks }                                  : {}),
      },
      include: {
        student:     { select: { id: true, name: true } },
        route:       { select: { id: true, name: true } },
        stop:        { select: { id: true, name: true } },
        academicYear:{ select: { id: true, name: true } },
      },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { data: assignment });
  } catch (e) {
    console.error("[updateStudentTransport]", e);
    return err(res, e.message, 500);
  }
}

export async function removeStudentTransport(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const existing = await prisma.studentTransport.findFirst({
      where: { id: req.params.id, schoolId },
    });
    if (!existing) return err(res, "Assignment not found", 404);

    await prisma.studentTransport.update({
      where: { id: req.params.id },
      data:  { isActive: false, endDate: new Date() },
    });

    await cacheService.invalidateSchool(schoolId);
    return ok(res, { message: "Transport assignment deactivated" });
  } catch (e) {
    console.error("[removeStudentTransport]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  FEE ENTRIES
// ═══════════════════════════════════════════════════════════════

export async function getFeeEntries(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { academicYearId, status, routeId, studentId } = req.query;

    const entries = await prisma.transportFeeEntry.findMany({
      where: {
        studentTransport: { schoolId },
        ...(academicYearId ? { academicYearId } : {}),
        ...(status         ? { status }         : {}),
        ...(routeId        ? { routeId }        : {}),
        ...(studentId      ? { studentId }      : {}),
      },
      include: {
        studentTransport: {
          include: {
            student: { select: { id: true, name: true, email: true } },
            route:   { select: { id: true, name: true } },
            stop:    { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ dueDate: "desc" }],
    });

    return ok(res, { data: entries });
  } catch (e) {
    console.error("[getFeeEntries]", e);
    return err(res, e.message, 500);
  }
}

export async function recordFeePayment(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { paidAmount, paymentMode, receiptNo, remarks } = req.body;

    const entry = await prisma.transportFeeEntry.findFirst({
      where: { id: req.params.id, studentTransport: { schoolId } },
    });
    if (!entry) return err(res, "Fee entry not found", 404);

    if (!paidAmount || parseFloat(paidAmount) <= 0) return err(res, "paidAmount must be positive");

    const newPaid      = parseFloat(entry.paidAmount.toString()) + parseFloat(paidAmount);
    const outstanding  = parseFloat(entry.amount.toString()) - parseFloat(entry.waivedAmount.toString());
    const newStatus    = newPaid >= outstanding ? "PAID" : "PENDING";

    const updated = await prisma.transportFeeEntry.update({
      where: { id: req.params.id },
      data: {
        paidAmount:  newPaid,
        status:      newStatus,
        paymentMode: paymentMode || null,
        paymentDate: new Date(),
        receiptNo:   receiptNo  || null,
        remarks:     remarks    || null,
      },
    });

    return ok(res, { data: updated });
  } catch (e) {
    console.error("[recordFeePayment]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS / DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════

export async function getTransportStats(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const { academicYearId } = req.query;

    const [totalRoutes, totalStops, totalStudents, pendingFees] = await Promise.all([
      prisma.transportRoute.count({ where: { schoolId, isActive: true } }),
      prisma.transportStop.count({ where: { schoolId, isActive: true } }),
      prisma.studentTransport.count({
        where: { schoolId, isActive: true, ...(academicYearId ? { academicYearId } : {}) },
      }),
      prisma.transportFeeEntry.aggregate({
        where: {
          status: { in: ["PENDING", "OVERDUE"] },
          studentTransport: { schoolId },
          ...(academicYearId ? { academicYearId } : {}),
        },
        _sum: { amount: true, paidAmount: true },
      }),
    ]);

    const pendingAmount =
      parseFloat(pendingFees._sum.amount?.toString()    ?? "0") -
      parseFloat(pendingFees._sum.paidAmount?.toString() ?? "0");

    return ok(res, {
      data: { totalRoutes, totalStops, totalStudents, pendingAmount },
    });
  } catch (e) {
    console.error("[getTransportStats]", e);
    return err(res, e.message, 500);
  }
}

export async function getAcademicYears(req, res) {
  try {
    const schoolId = schoolGuard(req);
    const years = await prisma.academicYear.findMany({
      where:   { schoolId },
      select:  { id: true, name: true, isActive: true },
      orderBy: { startDate: "desc" },
    });
    return ok(res, { data: years });
  } catch (e) {
    return err(res, e.message, 500);
  }
}