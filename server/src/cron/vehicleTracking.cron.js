// server/src/services/vehicleTracking.cron.js
// ═══════════════════════════════════════════════════════════════════════════════
// GPS VEHICLE TRACKING CRON
//
// Runs every 30 seconds:
//   1. Calls GPS API → gets current location of ALL vehicles
//   2. For each vehicle in response → lookup SchoolVehicle by regNo
//   3. If found → store location in VehicleLocation table
//   4. If not found → skip (vehicle not registered in our system)
//
// Token and email are in .env — never exposed to frontend
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";

const GPS_API_BASE   = process.env.GPS_API_BASE;
const GPS_API_TOKEN  = process.env.GPS_API_TOKEN;
const GPS_API_EMAIL  = process.env.GPS_API_EMAIL;

let isRunning = false; // prevent overlapping runs

// ─────────────────────────────────────────────────────────────────────────────
// FETCH from GPS API
// ─────────────────────────────────────────────────────────────────────────────
async function fetchGPSData() {
  const url = `${GPS_API_BASE}/get_current_data?token=${GPS_API_TOKEN}&email=${GPS_API_EMAIL}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!res.ok) {
    throw new Error(`GPS API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // API returns array of vehicle objects
  if (!Array.isArray(data)) {
    throw new Error(`GPS API unexpected response: ${JSON.stringify(data)}`);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS ONE VEHICLE from API response
// ─────────────────────────────────────────────────────────────────────────────
async function processVehicle(apiVehicle) {
  const regNo = apiVehicle.regNo?.toUpperCase()?.trim();
  if (!regNo) return;

  // Match regNo to our SchoolVehicle table
  const schoolVehicle = await prisma.schoolVehicle.findFirst({
    where: { regNo, isActive: true },
    select: { id: true, schoolId: true, regNo: true, deviceId: true },
  });

  if (!schoolVehicle) {
    // Vehicle not registered in our system — skip
    return;
  }

  // Update deviceId on SchoolVehicle if not already stored
  if (!schoolVehicle.deviceId && apiVehicle.deviceId) {
    await prisma.schoolVehicle.update({
      where: { id: schoolVehicle.id },
      data: { deviceId: apiVehicle.deviceId },
    });
  }

  // Store location snapshot
  await prisma.vehicleLocation.create({
    data: {
      schoolVehicleId: schoolVehicle.id,
      schoolId:        schoolVehicle.schoolId,
      regNo:           schoolVehicle.regNo,

      latitude:        apiVehicle.latitude        ?? null,
      longitude:       apiVehicle.longitude       ?? null,
      speed:           apiVehicle.speed           ?? null,
      bearing:         apiVehicle.bearing         ?? null,

      status:          apiVehicle.status          ?? null,
      ignitionStatus:  apiVehicle.ignitionStatus  ?? null,
      vehicleStatus:   apiVehicle.vehicleStatus   ?? null,

      address:         apiVehicle.address         ?? null,
      odoDistance:     apiVehicle.odoDistance      ?? null,
      fuelLitre:       apiVehicle.fuelLitre       ?? null,

      gpsTimestamp:    apiVehicle.isoDate ? new Date(apiVehicle.isoDate) : null,

      rawData:         apiVehicle, // store full API response
    },
  });

  // console.log(`[GPS] Stored: ${regNo} | status=${apiVehicle.status} | speed=${apiVehicle.speed}km/h | ${apiVehicle.address?.slice(0, 50)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN POLL FUNCTION — called every 30 seconds
// ─────────────────────────────────────────────────────────────────────────────
async function pollGPS() {
  if (isRunning) {
    // console.log("[GPS] Previous poll still running — skipping this tick");
    return;
  }

  isRunning = true;

  try {
    if (!GPS_API_BASE || !GPS_API_TOKEN || !GPS_API_EMAIL) {
      // console.warn("[GPS] Missing GPS_API_BASE / GPS_API_TOKEN / GPS_API_EMAIL in .env — skipping poll");
      return;
    }

    const vehicles = await fetchGPSData();
    // console.log(`[GPS] Poll: ${vehicles.length} vehicle(s) from API`);

    // Process all vehicles in parallel
    await Promise.allSettled(vehicles.map(processVehicle));

  } catch (err) {
    // console.error("[GPS] Poll failed:", err.message);
  } finally {
    isRunning = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// START CRON — call this once from server.js / app.js
// ─────────────────────────────────────────────────────────────────────────────
export function startVehicleTrackingCron() {
  if (!GPS_API_TOKEN || !GPS_API_EMAIL) {
    // console.warn("[GPS] GPS env vars not set — vehicle tracking cron NOT started");
    return;
  }

  // console.log("[GPS] Vehicle tracking cron started — polling every 30 seconds");

  // Run immediately on startup
  pollGPS();

  // Then every 30 seconds
  // setInterval(pollGPS, 30 * 1000);
  setInterval(pollGPS, 60 * 1000);
}