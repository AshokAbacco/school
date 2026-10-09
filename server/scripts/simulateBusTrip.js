// server/scripts/simulateBusTrip.js  (NEW FILE — testing only)
// ═══════════════════════════════════════════════════════════════════════════════
// Drives a FAKE bus trip by writing GPS points into vehicle_locations, so you can
// test live tracking, stop ETAs and parent bus alerts without a real bus.
//
//   cd server
//   node scripts/simulateBusTrip.js AP39TM7726                      (real speed, ~1 h route)
//   node scripts/simulateBusTrip.js AP39TM7726 --minutes=3          (FAST: whole route in ~3 min)
//   node scripts/simulateBusTrip.js AP39TM7726 --session=PICKUP --speed=40 --interval=5 --dwell=60
//
// FAST TESTING (--minutes) — put these in the server .env and restart the server:
//   ETA_TEST_MODE=1            ETAs follow the simulated speed
//   BUS_NOTIFY_INTERVAL_SEC=3  check for alerts every 3 s
//   ETA_CACHE_SEC=2
//   ETA_MIN_STOP_MIN=0.1       short stops
// Remove them again when you finish testing.
//
//   --session  PICKUP (stop 1 → … → school) | DROP (school → stops). Default: current session.
//   --speed    km/h while driving (default 30)
//   --interval seconds between GPS points (default 5)
//   --dwell    seconds the bus waits at each stop (default 60)
//   --minutes  squeeze the whole route into this many minutes (sets speed, interval=2, dwell=8)
//
// Keep the API server running — it pushes the points to the maps and sends the
// parent alerts. Press Ctrl+C to stop. Points are tagged rawData.simulated=true;
// delete them afterwards with:
//   DELETE FROM vehicle_locations WHERE "rawData"->>'simulated' = 'true';
// Never run this against a bus that is really on the road.
// ═══════════════════════════════════════════════════════════════════════════════

try {
  await import("dotenv/config");
} catch {
  /* dotenv not installed — rely on the environment */
}
const { prisma } = await import("../src/config/db.js");
const { normalizeRegNo } =
  await import("../src/vehicle/liveTracking.service.js");
const { getTripPlan } = await import("../src/vehicle/routeEta.service.js");

const args = Object.fromEntries(
  process.argv
    .slice(3)
    .map((a) => a.replace(/^--/, "").split("="))
    .map(([k, v]) => [k, v ?? true]),
);
const regArg = process.argv[2];
if (!regArg) {
  console.log(
    "Usage: node scripts/simulateBusTrip.js <REG NO> [--session=PICKUP|DROP] [--speed=30] [--interval=5] [--dwell=60]",
  );
  process.exit(1);
}
const FAST_MIN = args.minutes ? Number(args.minutes) : null;
let SPEED_KMH = Number(args.speed || 30);
const INTERVAL_S = Number(args.interval || (FAST_MIN ? 2 : 5));
const DWELL_S = Number(args.dwell || (FAST_MIN ? 8 : 60));

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};
const bearing = (a, b) => {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const key = normalizeRegNo(regArg);
const vehicles = await prisma.schoolVehicle.findMany({
  where: { isActive: true },
  select: { id: true, regNo: true, schoolId: true, deviceId: true },
});
const vehicle = vehicles.find((v) => normalizeRegNo(v.regNo) === key);
if (!vehicle) {
  console.error(`No active vehicle with reg no ${regArg}`);
  process.exit(1);
}
const plan = await getTripPlan(vehicle, { session: args.session });
if (!plan || plan.stops.length < 2) {
  console.error(
    "This bus has no route with at least 2 mapped stops (check Route Stops tab).",
  );
  process.exit(1);
}
if (FAST_MIN) {
  let total = 0;
  for (let i = 1; i < plan.stops.length; i++)
    total += dist(plan.stops[i - 1], plan.stops[i]);
  const driveS = Math.max(
    30,
    FAST_MIN * 60 - (plan.stops.length - 1) * DWELL_S,
  );
  SPEED_KMH = Math.max(20, Math.round((total / driveS) * 3.6));
  console.log(
    `⚡ FAST mode: ${(total / 1000).toFixed(1)} km in ~${FAST_MIN} min → ${SPEED_KMH} km/h, ${DWELL_S}s per stop`,
  );
  console.log(
    "   (server .env needs ETA_TEST_MODE=1, BUS_NOTIFY_INTERVAL_SEC=3, ETA_CACHE_SEC=2, ETA_MIN_STOP_MIN=0.1)",
  );
}
console.log(
  `🚌 Simulating ${vehicle.regNo} on "${plan.routeName}" — ${plan.session}, ${plan.stops.length} points, ${SPEED_KMH} km/h`,
);
plan.stops.forEach((s, i) =>
  console.log(`   ${i + 1}. ${s.isSchool ? "🏫 " : ""}${s.name}`),
);

let stopped = false;
process.on("SIGINT", () => {
  stopped = true;
  console.log("\nStopping…");
});

async function write(p, speed, brg) {
  const now = new Date();
  await prisma.vehicleLocation.create({
    data: {
      schoolVehicleId: vehicle.id,
      schoolId: vehicle.schoolId,
      regNo: vehicle.regNo,
      latitude: p.lat,
      longitude: p.lng,
      speed,
      bearing: brg,
      status: speed > 3 ? "MOVING" : "IDLE",
      vehicleStatus: speed > 3 ? "MOVING" : "PARKED",
      ignitionStatus: "ON",
      gpsTimestamp: now,
      recordedAt: now,
      rawData: { simulated: true },
    },
  });
}

const stepM = (SPEED_KMH / 3.6) * INTERVAL_S;
for (let i = 0; i < plan.stops.length && !stopped; i++) {
  const here = plan.stops[i];
  // wait at the stop
  const waits = i === 0 ? 2 : Math.max(1, Math.round(DWELL_S / INTERVAL_S));
  console.log(
    `⏸  at ${here.name} (${Math.round(((waits * INTERVAL_S) / 60) * 10) / 10} min)`,
  );
  for (let w = 0; w < waits && !stopped; w++) {
    await write(here, 0, null);
    await sleep(INTERVAL_S * 1000);
  }
  const next = plan.stops[i + 1];
  if (!next) break;
  const d = dist(here, next);
  const steps = Math.max(1, Math.ceil(d / stepM));
  const brg = bearing(here, next);
  console.log(
    `➡  driving to ${next.name} (${(d / 1000).toFixed(2)} km, ~${Math.round((steps * INTERVAL_S) / 60)} min)`,
  );
  for (let k = 1; k <= steps && !stopped; k++) {
    const f = k / steps;
    await write(
      {
        lat: here.lat + (next.lat - here.lat) * f,
        lng: here.lng + (next.lng - here.lng) * f,
      },
      SPEED_KMH,
      brg,
    );
    await sleep(INTERVAL_S * 1000);
  }
}
console.log("✅ Simulation finished.");
await prisma.$disconnect?.();
process.exit(0);
