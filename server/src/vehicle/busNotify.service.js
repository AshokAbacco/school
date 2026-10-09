// server/src/vehicle/busNotify.service.js  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// BUS ALERTS FOR PARENTS
//
// Every NOTIFY_INTERVAL_MS (default 30 s) the notifier looks at every active bus
// that has a route with students and fresh GPS, computes the stop ETAs, and
// sends each parent — ONCE per trip — :
//
//   TRIP_STARTED   "Bus AP39TM7726 has started. It will reach RJC JNTU in about 15 minutes."
//   STOP_DEPARTED  "The bus has left Gandhi Nagar. It will reach your stop in about 9 minutes."
//                  (for EVERY stop before the parent's stop)
//   NEXT_IS_YOURS  "The bus has arrived at Clock Tower. Your stop is next — please be at
//                   your stop on time."
//   APPROACHING    "The bus will arrive at RJC JNTU in about 5 minutes." (10 / 5 / 2 min)
//   ARRIVED        "The school bus has arrived at RJC JNTU."
//   …and nothing more once the bus has passed the parent's stop.
//
// Language: every alert is written in the parent's chosen language
//   (English / Hindi / Telugu — parent_notify_settings, picked in the app).
//
// Delivery
//   0. Firebase push to the parent's phone (works when the app is CLOSED;
//      Android speaks it aloud) — see push.service.js
//   1. saved in bus_notifications (the parent app lists them, marks read)
//   2. pushed live to the parent app over SSE → toast + browser notification +
//      spoken voice message (text-to-speech in the parent's browser/app)
//   3. optional: POST to BUS_NOTIFY_WEBHOOK_URL with the parent's phone so you
//      can forward it as SMS / WhatsApp / voice call through your provider
//
// .env
//   BUS_NOTIFY_ENABLED=1            (set 0 to switch off)
//   BUS_NOTIFY_INTERVAL_SEC=15
//   BUS_NOTIFY_THRESHOLDS=10,5,2    (minutes before arrival)
//   BUS_NOTIFY_WEBHOOK_URL=https://… (optional)
//   BUS_NOTIFY_WEBHOOK_TOKEN=…       (optional, sent as Bearer token)
//
// Safe with several server instances: each alert has a unique dedupeKey, so a
// second instance trying to send the same alert is rejected by the database.
// ═══════════════════════════════════════════════════════════════════════════════

import { EventEmitter } from "events";
import { prisma } from "../config/db.js";
import { getLatestPoint } from "./liveTracking.service.js";
import { computeVehicleEta, findRouteForVehicle } from "./routeEta.service.js";
import {
  alertText,
  ALERT_LANGUAGES,
  DEFAULT_ALERT_LANG,
} from "./busAlertI18n.js";
import { pushToParent } from "./push.service.js";

const ENABLED = process.env.BUS_NOTIFY_ENABLED !== "0";
// 15 s normally; set BUS_NOTIFY_INTERVAL_SEC=3 while testing with the simulator
const INTERVAL_MS =
  Math.max(2, Number(process.env.BUS_NOTIFY_INTERVAL_SEC || 15)) * 1000;
const THRESHOLDS = String(process.env.BUS_NOTIFY_THRESHOLDS || "10,5,2")
  .split(",")
  .map((x) => Number(x.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
  .sort((a, b) => b - a);
const WEBHOOK_URL = process.env.BUS_NOTIFY_WEBHOOK_URL || "";
const WEBHOOK_TOKEN = process.env.BUS_NOTIFY_WEBHOOK_TOKEN || "";
const START_SPEED_KMH = 8;

const IST_OFFSET_MS = 330 * 60 * 1000;
const istDate = (ms = Date.now()) =>
  new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

/** Live push to one parent (SSE). Returns unsubscribe. */
export function subscribeParentAlerts(parentId, fn) {
  emitter.on(`parent:${parentId}`, fn);
  return () => emitter.off(`parent:${parentId}`, fn);
}

// ─────────────────────────────────────────────────────────────────────────────
// Save + push + (optional) webhook. Returns the saved row or null if it was a
// duplicate (already sent).
// ─────────────────────────────────────────────────────────────────────────────
export async function sendBusNotification(n) {
  if (n.textKey) {
    const t = alertText(n.textKey, n.lang, n.vars || {});
    n = {
      ...n,
      title: t.title,
      message: t.message,
      messageEn: t.messageEn,
      lang: t.lang,
    };
  }
  let row;
  try {
    row = await prisma.busNotification.create({
      data: {
        parentId: n.parentId,
        studentId: n.studentId || null,
        schoolId: n.schoolId,
        vehicleId: n.vehicleId || null,
        routeId: n.routeId || null,
        stopId: n.stopId || null,
        type: n.type,
        session: n.session || null,
        title: n.title,
        message: n.message,
        etaMin: n.etaMin != null ? Math.round(n.etaMin) : null,
        dedupeKey: n.dedupeKey,
      },
    });
  } catch (e) {
    if (e?.code === "P2002") return null; // already sent
    throw e;
  }

  const payload = {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    etaMin: row.etaMin,
    studentId: row.studentId,
    vehicleId: row.vehicleId,
    lang: n.lang || "en",
    createdAt: row.createdAt.toISOString(),
  };
  emitter.emit(`parent:${n.parentId}`, payload);

  // phone push (app closed / background). Never blocks the notifier.
  pushToParent(n.parentId, {
    ...payload,
    messageEn: n.messageEn || n.message,
  }).catch((e) => console.warn("[busNotify] push failed:", e.message));

  if (WEBHOOK_URL && n.parentPhone && n.type !== "TEST") {
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WEBHOOK_TOKEN ? { Authorization: `Bearer ${WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        phone: n.parentPhone,
        parentName: n.parentName || null,
        studentName: n.studentName || null,
        type: n.type,
        title: n.title,
        message: n.message,
        messageEn: n.messageEn || n.message,
        lang: n.lang || "en",
        etaMin: payload.etaMin,
        voice: true,
      }),
    }).catch((e) => console.warn("[busNotify] webhook failed:", e.message));
  }
  return row;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parent language preferences
// ─────────────────────────────────────────────────────────────────────────────
export async function getParentLanguages(parentIds) {
  const map = new Map();
  if (!parentIds.length) return map;
  try {
    const rows = await prisma.parentNotifySetting.findMany({
      where: { parentId: { in: [...new Set(parentIds)] } },
      select: { parentId: true, language: true },
    });
    for (const r of rows)
      if (ALERT_LANGUAGES.includes(r.language)) map.set(r.parentId, r.language);
  } catch {
    /* table not migrated yet → default language */
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Who rides this route (and which parents to tell)
// ─────────────────────────────────────────────────────────────────────────────
async function ridersForRoute(routeId, session) {
  const allowed = session === "DROP" ? ["DROP", "BOTH"] : ["PICKUP", "BOTH"];
  const rows = await prisma.studentTransport.findMany({
    where: {
      routeId,
      isActive: true,
      pickupType: { in: allowed },
      student: { deletedAt: null, isActive: true },
    },
    select: {
      studentId: true,
      stopId: true,
      stop: { select: { name: true } },
      student: {
        select: {
          name: true,
          parentLinks: {
            select: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  isActive: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const out = [];
  for (const r of rows) {
    for (const l of r.student.parentLinks) {
      if (!l.parent || !l.parent.isActive || l.parent.deletedAt) continue;
      out.push({
        parentId: l.parent.id,
        parentName: l.parent.name,
        parentPhone: l.parent.phone,
        studentId: r.studentId,
        studentName: r.student.name,
        stopId: r.stopId,
        stopName: r.stop?.name || "your stop",
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// One bus → alerts
// ─────────────────────────────────────────────────────────────────────────────
async function checkVehicle(vehicle) {
  const route = await findRouteForVehicle(vehicle);
  if (!route) return;

  const eta = await computeVehicleEta(vehicle, { routeId: route.id });
  if (!eta?.live || eta.tripState !== "IN_PROGRESS") return;

  const stops = eta.stops || [];
  const passedAny = stops.some(
    (s) => s.state === "PASSED" || s.state === "AT_STOP",
  );
  const moving = (eta.currentSpeedKmh || 0) >= START_SPEED_KMH;
  if (!passedAny && !moving) return; // parked at the start — not started yet

  const riders = await ridersForRoute(route.id, eta.session);
  const langs = await getParentLanguages(riders.map((r) => r.parentId));
  if (!riders.length) return;

  const day = istDate();
  const bus = vehicle.regNo;

  for (const r of riders) {
    const myIdx = stops.findIndex((s) => s.stopId === r.stopId);
    if (myIdx < 0) continue;
    const my = stops[myIdx];
    const base = {
      parentId: r.parentId,
      parentName: r.parentName,
      parentPhone: r.parentPhone,
      studentId: r.studentId,
      studentName: r.studentName,
      schoolId: vehicle.schoolId,
      vehicleId: vehicle.id,
      routeId: route.id,
      stopId: r.stopId,
      session: eta.session,
      lang: langs.get(r.parentId) || DEFAULT_ALERT_LANG,
    };
    const v = { bus, stop: r.stopName, session: eta.session };
    const keyBase = `${day}|${eta.session}|${vehicle.id}|${r.parentId}|${r.studentId}`;
    const live = my.estimateType === "LIVE" && my.etaMin != null;
    const etaVar = live ? Math.max(1, my.etaMin) : null;

    // ── After the bus has passed the parent's stop: stay quiet ─────────────
    if (my.state === "PASSED" || my.state === "SKIPPED") continue;

    // ── At the parent's stop ──────────────────────────────────────────────
    if (my.state === "AT_STOP") {
      await sendBusNotification({
        ...base,
        type: "ARRIVED",
        textKey: "ARRIVED",
        vars: v,
        dedupeKey: `${keyBase}|ARRIVED`,
      });
      continue;
    }

    let sentNow = false;

    // ── 1) Trip started ────────────────────────────────────────────────────
    const started = await sendBusNotification({
      ...base,
      type: "TRIP_STARTED",
      textKey: "TRIP_STARTED",
      vars: { ...v, mins: etaVar },
      etaMin: my.etaMin,
      dedupeKey: `${keyBase}|STARTED`,
    });
    if (started) sentNow = true;

    // ── 2) Stop before mine: the bus is AT it now ─────────────────────────
    const prev = [...stops.slice(0, myIdx)]
      .reverse()
      .find((s) => !s.isSchool && s.state !== "SKIPPED");
    if (prev && prev.state === "AT_STOP") {
      const row = await sendBusNotification({
        ...base,
        type: "NEXT_IS_YOURS",
        textKey: "NEXT_ARRIVED",
        vars: { ...v, prev: prev.name },
        etaMin: my.etaMin,
        dedupeKey: `${keyBase}|NEXT|${prev.routeStopId}`,
      });
      if (row) sentNow = true;
    }

    // ── 3) Bus has just left a stop before mine (latest one only) ──────────
    const lastLeft = [...stops.slice(0, myIdx)]
      .reverse()
      .find((s) => !s.isSchool && s.state === "PASSED" && s.actualDeparture);
    if (lastLeft) {
      const isPrev = prev && lastLeft.routeStopId === prev.routeStopId;
      const row = await sendBusNotification({
        ...base,
        type: isPrev ? "NEXT_IS_YOURS" : "STOP_DEPARTED",
        textKey: isPrev ? "NEXT_LEFT" : "STOP_DEPARTED",
        vars: { ...v, prev: lastLeft.name, mins: etaVar },
        etaMin: my.etaMin,
        dedupeKey: `${keyBase}|LEFT|${lastLeft.routeStopId}`,
      });
      if (row) sentNow = true;
    }

    // ── 4) Approaching: 10 / 5 / 2 minutes (one per tick, not on top of another) ─
    if (!sentNow && live) {
      const hit = [...THRESHOLDS].reverse().find((t) => my.etaMin <= t);
      if (hit != null) {
        await sendBusNotification({
          ...base,
          type: "APPROACHING",
          textKey: "APPROACHING",
          vars: { ...v, mins: etaVar, threshold: hit },
          etaMin: my.etaMin,
          dedupeKey: `${keyBase}|APPROACHING|${hit}`,
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loop
// ─────────────────────────────────────────────────────────────────────────────
let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    // only buses that sent GPS in the last 15 minutes
    const vehicles = await prisma.schoolVehicle.findMany({
      where: { isActive: true },
      select: { id: true, regNo: true, schoolId: true, deviceId: true },
    });
    for (const v of vehicles) {
      try {
        const latest = await getLatestPoint(v);
        if (!latest || latest.ageSec == null || latest.ageSec > 15 * 60)
          continue;
        await checkVehicle(v);
      } catch (e) {
        if (String(e?.message || "").includes("busNotification")) throw e;
        console.warn("[busNotify]", v.regNo, e.message);
      }
    }
  } catch (e) {
    console.error("[busNotify] tick failed:", e.message);
  } finally {
    running = false;
  }
}

export function startBusNotifier() {
  if (!ENABLED || timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 5000);
  console.log(
    `🔔 Bus alerts notifier started (every ${INTERVAL_MS / 1000}s, at ${THRESHOLDS.join("/")} min)`,
  );
}

export function stopBusNotifier() {
  clearInterval(timer);
  timer = null;
}

/** Run one check now (used by the trip simulator / tests). */
export const runBusNotifierOnce = tick;
