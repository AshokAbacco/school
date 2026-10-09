// server/src/parent/controllers/vehicleTracking.controller.js  (REWRITTEN)
// ═══════════════════════════════════════════════════════════════════════════════
// Parent — school bus tracking
//
//   GET /api/parent/vehicle-tracking?studentId=           live snapshot
//   GET /api/parent/vehicle-tracking/stream?studentId=    SSE live push
//   GET /api/parent/vehicle-tracking/eta?studentId=       stop-by-stop ETA
//   GET /api/parent/vehicle-tracking/history?studentId=&date=YYYY-MM-DD&session=PICKUP|DROP|ALL
//   GET /api/parent/vehicle-tracking/history/days?studentId=
//   GET   /api/parent/vehicle-tracking/notifications            bus alerts (latest 50)
//   GET   /api/parent/vehicle-tracking/notifications/stream     SSE live alerts
//   PATCH /api/parent/vehicle-tracking/notifications/read       mark all read
//   POST  /api/parent/vehicle-tracking/notifications/test       send yourself a test alert
//   GET   /api/parent/vehicle-tracking/notifications/settings   { language }
//   PUT   /api/parent/vehicle-tracking/notifications/settings   { language: en|hi|te }
//   POST  /api/parent/vehicle-tracking/push/register            { token, platform }  (app)
//   POST  /api/parent/vehicle-tracking/push/unregister          { token }            (logout)
//
// Chain: parent (JWT) → StudentParent → Student → StudentTransport (active)
//        → TransportRoute (+ stops) → vehicleNumber → SchoolVehicle (same school)
//
// FIXES vs the old controller
//   • reg no matched after normalising ("AP 39 TM 7726" == "AP39TM7726") and
//     only inside the child's own school
//   • location comes from the best source (GPS provider OR direct device),
//     never a row with empty lat/lng
//   • stops, timetable, ETA, delays and history are now returned
// A parent can only ever see buses of their own linked children.
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";
import {
  normalizeRegNo,
  getLatestPoint,
  getTrail,
  subscribeVehicle,
  openSseStream,
} from "../../vehicle/liveTracking.service.js";
import {
  computeVehicleEta,
  computeTripHistory,
  getActiveDays,
  getRouteStopsForMap,
  istDateString,
} from "../../vehicle/routeEta.service.js";
import {
  getRoadGeometry,
  snapPathToRoads,
} from "../../vehicle/roadRouting.service.js";
import { randomUUID } from "crypto";
import {
  sendBusNotification,
  subscribeParentAlerts,
  startBusNotifier,
  getParentLanguages,
} from "../../vehicle/busNotify.service.js";
import {
  ALERT_LANGUAGES,
  DEFAULT_ALERT_LANG,
} from "../../vehicle/busAlertI18n.js";
import {
  savePushToken,
  deletePushToken,
  isPushConfigured,
} from "../../vehicle/push.service.js";

// Start the bus-alert notifier when this module loads (set BUS_NOTIFY_ENABLED=0 to disable)
startBusNotifier();

const HISTORY_MAX_DAYS = 30;

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

const fail = (res, tag, err) => {
  if (!err?.status) console.error(tag, err);
  if (res.headersSent) return;
  res
    .status(err?.status || 500)
    .json({ success: false, message: err?.message || "Server error" });
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolve parent → child → transport → route → vehicle
// ─────────────────────────────────────────────────────────────────────────────
async function resolveChildBus(req) {
  const parentId = req.user?.id || req.user?.parentId;
  if (!parentId) throw { status: 401, message: "Unauthorized" };

  const links = await prisma.studentParent.findMany({
    where: { parentId, student: { deletedAt: null } },
    include: { student: { select: { id: true, name: true, schoolId: true } } },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  const children = links.map((l) => ({
    id: l.student.id,
    name: l.student.name,
  }));
  if (!links.length)
    return {
      children,
      student: null,
      message: "No student linked to this parent account",
    };

  const wanted = req.query.studentId;
  const link = wanted ? links.find((l) => l.student.id === wanted) : links[0];
  if (!link)
    throw {
      status: 403,
      message: "This student is not linked to your account",
    };
  const student = link.student;

  const transport = await prisma.studentTransport.findFirst({
    where: { studentId: student.id, isActive: true },
    orderBy: { createdAt: "desc" },
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
          isActive: true,
          deletedAt: true,
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
  if (!transport || !transport.route || transport.route.deletedAt)
    return {
      children,
      student,
      message: "Your child is not assigned to a school bus route yet",
    };

  const route = transport.route;
  const routeStop = transport.stop
    ? await prisma.transportRouteStop.findFirst({
        where: { routeId: route.id, stopId: transport.stop.id },
        select: { pickupTime: true, dropTime: true, stopOrder: true },
      })
    : null;

  const myStop = transport.stop
    ? {
        id: transport.stop.id,
        name: transport.stop.name,
        area: transport.stop.area,
        landmark: transport.stop.landmark,
        latitude: transport.stop.latitude,
        longitude: transport.stop.longitude,
        pickupTime: routeStop?.pickupTime || null,
        dropTime: routeStop?.dropTime || null,
        stopOrder: routeStop?.stopOrder ?? null,
      }
    : null;

  let vehicle = null;
  const regKey = normalizeRegNo(route.vehicleNumber);
  if (regKey) {
    const candidates = await prisma.schoolVehicle.findMany({
      where: { schoolId: transport.schoolId, isActive: true },
      select: {
        id: true,
        regNo: true,
        vehicleName: true,
        vehicleType: true,
        schoolId: true,
        deviceId: true,
      },
    });
    vehicle =
      candidates.find((v) => normalizeRegNo(v.regNo) === regKey) || null;
  }

  return {
    children,
    student,
    schoolId: transport.schoolId,
    pickupType: transport.pickupType,
    route,
    myStop,
    vehicle,
    message: !route.vehicleNumber
      ? "No bus has been assigned to this route yet"
      : !vehicle
        ? `Bus ${route.vehicleNumber} is not registered for live tracking yet`
        : null,
  };
}

const publicRoute = (r) =>
  r && {
    id: r.id,
    name: r.name,
    code: r.code,
    vehicleNumber: r.vehicleNumber,
    driverName: r.driverName,
    driverPhone: r.driverPhone,
    conductorName: r.conductorName,
    conductorPhone: r.conductorPhone,
  };

const publicVehicle = (v) =>
  v && {
    id: v.id,
    regNo: v.regNo,
    vehicleName: v.vehicleName,
    vehicleType: v.vehicleType,
  };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/vehicle-tracking?studentId=
// ─────────────────────────────────────────────────────────────────────────────
export const getChildBusLocation = async (req, res) => {
  try {
    const ctx = await resolveChildBus(req);
    if (!ctx.student || !ctx.route)
      return res.json({
        success: true,
        data: ctx.student
          ? {
              children: ctx.children,
              student: ctx.student,
              message: ctx.message,
            }
          : null,
        children: ctx.children,
        message: ctx.message,
      });

    const stops = await getRouteStopsForMap(
      { schoolId: ctx.schoolId },
      ctx.route.id,
    );

    const [location, trail, eta, routeGeometry] = await Promise.all([
      ctx.vehicle ? getLatestPoint(ctx.vehicle).catch(() => null) : null,
      ctx.vehicle
        ? getTrail(ctx.vehicle, { minutes: 30, limit: 300 }).catch(() => [])
        : [],
      ctx.vehicle
        ? withTimeout(
            computeVehicleEta(ctx.vehicle, { routeId: ctx.route.id }).catch(
              () => null,
            ),
            6000,
          )
        : null,
      withTimeout(getRoadGeometry(stops), 5000),
    ]);

    return res.json({
      success: true,
      data: {
        children: ctx.children,
        student: { id: ctx.student.id, name: ctx.student.name },
        studentName: ctx.student.name, // backward compatible
        pickupType: ctx.pickupType,
        route: publicRoute(ctx.route),
        stop: ctx.myStop, // backward compatible
        myStop: ctx.myStop,
        stops, // route stops in stopOrder (with lat/lng + times)
        routeGeometry, // [[lat,lng]] along roads, or null → client draws a curve
        vehicle:
          publicVehicle(ctx.vehicle) ||
          (ctx.route.vehicleNumber ? { regNo: ctx.route.vehicleNumber } : null),
        location,
        trail,
        eta,
        message: ctx.message,
      },
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    fail(res, "[getChildBusLocation]", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/vehicle-tracking/stream?studentId=     (SSE)
// ─────────────────────────────────────────────────────────────────────────────
export const streamChildBus = async (req, res) => {
  try {
    const ctx = await resolveChildBus(req);
    if (!ctx.vehicle)
      throw { status: 404, message: ctx.message || "No bus to track" };
    openSseStream(req, res, {
      subscribeFn: (fn) => subscribeVehicle(ctx.vehicle.id, fn),
      initialEvents: [
        [
          "hello",
          { vehicleId: ctx.vehicle.id, serverTime: new Date().toISOString() },
        ],
      ],
    });
  } catch (err) {
    fail(res, "[streamChildBus]", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/vehicle-tracking/eta?studentId=
// ─────────────────────────────────────────────────────────────────────────────
export const getChildBusEta = async (req, res) => {
  try {
    const ctx = await resolveChildBus(req);
    if (!ctx.vehicle)
      return res.json({ success: true, data: null, message: ctx.message });
    const data = await computeVehicleEta(ctx.vehicle, {
      routeId: ctx.route.id,
    });
    res.json({ success: true, data, serverTime: new Date().toISOString() });
  } catch (err) {
    fail(res, "[getChildBusEta]", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/vehicle-tracking/history/days?studentId=
// ─────────────────────────────────────────────────────────────────────────────
export const getChildBusHistoryDays = async (req, res) => {
  try {
    const ctx = await resolveChildBus(req);
    if (!ctx.vehicle)
      return res.json({ success: true, data: [], message: ctx.message });
    const data = await getActiveDays(ctx.vehicle, 14);
    res.json({ success: true, data, today: istDateString() });
  } catch (err) {
    fail(res, "[getChildBusHistoryDays]", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/vehicle-tracking/history?studentId=&date=&session=
// ─────────────────────────────────────────────────────────────────────────────
export const getChildBusHistory = async (req, res) => {
  try {
    const ctx = await resolveChildBus(req);
    if (!ctx.vehicle)
      return res.json({ success: true, data: null, message: ctx.message });

    const date = req.query.date || istDateString();
    const oldest = istDateString(Date.now() - HISTORY_MAX_DAYS * 86400000);
    if (date < oldest)
      throw {
        status: 400,
        message: `History is available for the last ${HISTORY_MAX_DAYS} days`,
      };

    const session = ["PICKUP", "DROP", "ALL"].includes(req.query.session)
      ? req.query.session
      : "PICKUP";
    const data = await computeTripHistory(ctx.vehicle, {
      routeId: ctx.route.id,
      date,
      session,
    });

    // Snap the recorded path onto roads (best effort, cached)
    const pts = data.path.map(([lat, lng, t]) => ({ lat, lng, t }));
    const snapped =
      pts.length > 1
        ? await withTimeout(
            snapPathToRoads(pts, `${ctx.vehicle.id}|${date}|${data.session}`),
            9000,
          )
        : null;

    const stops = await getRouteStopsForMap(
      { schoolId: ctx.schoolId },
      ctx.route.id,
    );
    const routeGeometry = await withTimeout(getRoadGeometry(stops), 4000);

    res.json({
      success: true,
      data: {
        ...data,
        snappedPath: snapped,
        routeGeometry,
        myStopId: ctx.myStop?.id || null,
      },
    });
  } catch (err) {
    fail(res, "[getChildBusHistory]", err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// BUS ALERTS
// ═══════════════════════════════════════════════════════════════════════════
const parentIdOf = (req) => req.user?.id || req.user?.parentId || null;

// GET /api/parent/vehicle-tracking/notifications
export const getBusNotifications = async (req, res) => {
  try {
    const parentId = parentIdOf(req);
    if (!parentId) throw { status: 401, message: "Unauthorized" };
    const rows = await prisma.busNotification.findMany({
      where: {
        parentId,
        createdAt: { gte: new Date(Date.now() - 3 * 86400000) },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        message: r.message,
        etaMin: r.etaMin,
        studentId: r.studentId,
        createdAt: r.createdAt,
        read: !!r.readAt,
      })),
      unread: rows.filter((r) => !r.readAt).length,
    });
  } catch (err) {
    fail(res, "[getBusNotifications]", err);
  }
};

// PATCH /api/parent/vehicle-tracking/notifications/read
export const markBusNotificationsRead = async (req, res) => {
  try {
    const parentId = parentIdOf(req);
    if (!parentId) throw { status: 401, message: "Unauthorized" };
    await prisma.busNotification.updateMany({
      where: { parentId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    fail(res, "[markBusNotificationsRead]", err);
  }
};

// GET /api/parent/vehicle-tracking/notifications/stream   (SSE, event: "alert")
export const streamBusNotifications = async (req, res) => {
  try {
    const parentId = parentIdOf(req);
    if (!parentId) throw { status: 401, message: "Unauthorized" };
    openSseStream(req, res, {
      eventName: "alert",
      subscribeFn: (fn) => subscribeParentAlerts(parentId, fn),
      initialEvents: [["hello", { serverTime: new Date().toISOString() }]],
    });
  } catch (err) {
    fail(res, "[streamBusNotifications]", err);
  }
};

// POST /api/parent/vehicle-tracking/notifications/test?studentId=
export const sendTestBusNotification = async (req, res) => {
  try {
    const ctx = await resolveChildBus(req);
    if (!ctx.student)
      throw { status: 404, message: ctx.message || "No child linked" };
    const stopName = ctx.myStop?.name || "your stop";

    let mins = null;
    if (ctx.vehicle && ctx.route) {
      const eta = await withTimeout(
        computeVehicleEta(ctx.vehicle, { routeId: ctx.route.id }).catch(
          () => null,
        ),
        6000,
      );
      const st = eta?.stops?.find((x) => x.stopId === ctx.myStop?.id);
      if (st?.etaMin != null && st.estimateType === "LIVE")
        mins = Math.max(1, st.etaMin);
    }
    const parentId = parentIdOf(req);
    const lang =
      (await getParentLanguages([parentId])).get(parentId) ||
      DEFAULT_ALERT_LANG;

    const row = await sendBusNotification({
      parentId,
      studentId: ctx.student.id,
      schoolId: ctx.schoolId || ctx.student.schoolId,
      vehicleId: ctx.vehicle?.id,
      routeId: ctx.route?.id,
      stopId: ctx.myStop?.id,
      type: "TEST",
      textKey: "TEST",
      lang,
      vars: { stop: stopName, mins, bus: ctx.vehicle?.regNo || "" },
      dedupeKey: `TEST|${randomUUID()}`,
    });
    const message = row?.message;
    res.json({ success: true, data: { id: row?.id, message } });
  } catch (err) {
    fail(res, "[sendTestBusNotification]", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Alert language (en / hi / te)
// ─────────────────────────────────────────────────────────────────────────────
export const getBusAlertSettings = async (req, res) => {
  try {
    const parentId = parentIdOf(req);
    if (!parentId) throw { status: 401, message: "Unauthorized" };
    const lang =
      (await getParentLanguages([parentId])).get(parentId) ||
      DEFAULT_ALERT_LANG;
    res.json({
      success: true,
      data: {
        language: lang,
        languages: ALERT_LANGUAGES,
        pushConfigured: isPushConfigured(),
      },
    });
  } catch (err) {
    fail(res, "[getBusAlertSettings]", err);
  }
};

export const saveBusAlertSettings = async (req, res) => {
  try {
    const parentId = parentIdOf(req);
    if (!parentId) throw { status: 401, message: "Unauthorized" };
    const language = String(req.body?.language || "");
    if (!ALERT_LANGUAGES.includes(language))
      throw {
        status: 400,
        message: `language must be one of ${ALERT_LANGUAGES.join(", ")}`,
      };
    await prisma.parentNotifySetting.upsert({
      where: { parentId },
      create: { parentId, language },
      update: { language },
    });
    res.json({ success: true, data: { language } });
  } catch (err) {
    fail(res, "[saveBusAlertSettings]", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Phone registration for Firebase push (called by the Capacitor app)
// ─────────────────────────────────────────────────────────────────────────────
export const registerPushToken = async (req, res) => {
  try {
    const parentId = parentIdOf(req);
    if (!parentId) throw { status: 401, message: "Unauthorized" };
    const { token, platform, appVersion } = req.body || {};
    await savePushToken({ parentId, token, platform, appVersion });
    res.json({ success: true, pushConfigured: isPushConfigured() });
  } catch (err) {
    fail(res, "[registerPushToken]", err);
  }
};

export const unregisterPushToken = async (req, res) => {
  try {
    const parentId = parentIdOf(req);
    if (!parentId) throw { status: 401, message: "Unauthorized" };
    if (req.body?.token)
      await deletePushToken({ parentId, token: req.body.token });
    res.json({ success: true });
  } catch (err) {
    fail(res, "[unregisterPushToken]", err);
  }
};
