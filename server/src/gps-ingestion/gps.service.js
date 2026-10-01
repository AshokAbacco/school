// server/src/gps/gps.service.js  (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════
// Fixes vs. old version
//   • Used its own `new PrismaClient()` → a 2nd connection pool. Now shares the
//     app's client from config/db.js.
//   • "DD-MM-YYYY HH:mm:ss" was first given to `new Date()`, which V8 reads as
//     MM-DD-YYYY (e.g. 09-10-2026 → 10 Sep instead of 9 Oct). Custom formats are
//     now parsed FIRST.
//   • Device local time was stored as UTC ("...Z") → 5h30m shift for IST
//     devices. Now uses GPS_DEVICE_TZ_OFFSET (default +05:30).
//   • gps_led_status "1" (string) was treated as OFF → location saved as null.
//   • Batch points saved one-by-one → now one createMany; invalid points skipped.
//   • After saving, nudges the live-tracking hub so parents see the point in
//     well under a second instead of waiting for the next poll.
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";
import { nudgeLiveTracking } from "../vehicle/liveTracking.service.js";

const DEVICE_TZ_OFFSET = process.env.GPS_DEVICE_TZ_OFFSET || "+05:30";
const MAX_FUTURE_MS = 10 * 60 * 1000;

// 🔧 Safe number parser
const toNumber = (val, fallback = null) => {
  if (val === null || val === undefined || val === "") return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const toBoolean = (val) =>
  val === true || val === "true" || val === 1 || val === "1";

const isValidLatLng = (lat, lng) =>
  lat !== null &&
  lng !== null &&
  !(lat === 0 && lng === 0) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const pad = (s) => String(s).padStart(2, "0");

// 🔧 Robust timestamp parser (custom formats first, then ISO, then epoch)
const parseTimestamp = (val) => {
  if (val === null || val === undefined || val === "") return new Date();

  let parsed = null;

  // Epoch seconds / milliseconds
  if (typeof val === "number" || /^\d{10,13}$/.test(String(val))) {
    const n = Number(val);
    parsed = new Date(n < 1e12 ? n * 1000 : n);
  }

  const s = String(val).trim();

  // "DD-MM-YYYY HH:mm:ss" or "DD/MM/YYYY HH:mm:ss" (device local time)
  if (!parsed) {
    const m = s.match(
      /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})[ T](\d{1,2}):(\d{2}):(\d{2})$/,
    );
    if (m) {
      const [, d, mo, y, hh, mm, ss] = m;
      parsed = new Date(
        `${y}-${pad(mo)}-${pad(d)}T${pad(hh)}:${mm}:${ss}${DEVICE_TZ_OFFSET}`,
      );
    }
  }

  // "YYYY-MM-DD HH:mm:ss" without zone (device local time)
  if (!parsed) {
    const m = s.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(\.\d+)?$/,
    );
    if (m)
      parsed = new Date(
        `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] || ""}${DEVICE_TZ_OFFSET}`,
      );
  }

  // Full ISO with zone
  if (!parsed && /^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s))
    parsed = new Date(s);

  if (!parsed || isNaN(parsed.getTime())) {
    console.warn("⚠️ Invalid timestamp received:", val);
    return new Date();
  }

  // Device clock far in the future → trust server time
  if (parsed.getTime() - Date.now() > MAX_FUTURE_MS) return new Date();

  return parsed;
};

export const processPayload = async (data = {}) => {
  try {
    const imei = String(data.device_id || "").trim();
    if (!imei) {
      console.warn("⚠️ Missing IMEI");
      return true; // do NOT fail ingestion
    }

    // 🔍 1. Find or create device (upsert = no race between two parallel posts)
    const device = await prisma.device.upsert({
      where: { imei },
      update: data.device_number
        ? { deviceNumber: String(data.device_number) }
        : {},
      create: {
        imei,
        name: `Device-${imei.slice(-4)}`,
        deviceNumber: data.device_number ? String(data.device_number) : null,
      },
    });

    const timestamp = parseTimestamp(data.timestamp);

    // 📦 2. Batch GPS data
    if (Array.isArray(data.gps_data) && data.gps_data.length > 0) {
      const rows = data.gps_data
        .map((point) => {
          const lat = toNumber(point.lat);
          const lng = toNumber(point.lng);
          if (!isValidLatLng(lat, lng)) return null;
          return {
            deviceId: device.id,
            latitude: lat,
            longitude: lng,
            speed: toNumber(point.speed ?? point.speed_kmph),
            heading: toNumber(point.heading),
            timestamp: point.timestamp
              ? parseTimestamp(point.timestamp)
              : timestamp,
            raw: point,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (rows.length) {
        await prisma.deviceLocation.createMany({ data: rows });
        nudgeLiveTracking();
      }
      console.log(
        `📦 Batch GPS saved: ${imei} (${rows.length}/${data.gps_data.length})`,
      );
      return true;
    }

    // 🔍 3. Single point
    const lat = toNumber(data.device_last_lat);
    const lng = toNumber(data.device_last_long);
    const validGps = isValidLatLng(lat, lng);

    // If the device doesn't send gps_led_status at all, trust valid coordinates.
    const gpsOn =
      data.gps_led_status === undefined || data.gps_led_status === null
        ? true
        : toNumber(data.gps_led_status) === 1;

    const signal = Math.max(0, toNumber(data.signalLevel, 0));
    const satellites = Math.max(0, toNumber(data.satellite_count, 0));

    let accStatus = data.acc_status || null;
    if (toNumber(data.speed_kmph) === 0 && toNumber(data.motion_avg) > 1000)
      accStatus = "movement";

    const hasFix = gpsOn && validGps;

    await prisma.deviceLocation.create({
      data: {
        deviceId: device.id,

        latitude: hasFix ? lat : null,
        longitude: hasFix ? lng : null,
        altitude: toNumber(data.device_last_altitude),

        battery:
          toNumber(data.battery_level) !== null
            ? Math.round(toNumber(data.battery_level))
            : null,
        speed: toNumber(data.speed_kmph),
        signal: Math.round(signal),

        satelliteCount: Math.round(satellites),
        heading: toNumber(data.heading),

        accelX:
          toNumber(data.accel_x) !== null
            ? Math.round(toNumber(data.accel_x))
            : null,
        accelY:
          toNumber(data.accel_y) !== null
            ? Math.round(toNumber(data.accel_y))
            : null,
        accelZ:
          toNumber(data.accel_z) !== null
            ? Math.round(toNumber(data.accel_z))
            : null,

        accMagnitude:
          toNumber(data.acc_magnitude) !== null
            ? Math.round(toNumber(data.acc_magnitude))
            : null,
        motionAvg: toNumber(data.motion_avg),
        accStatus,

        batteryVoltage:
          toNumber(data.battery_voltage_mV) !== null
            ? Math.round(toNumber(data.battery_voltage_mV))
            : null,
        batteryStatus: data.battery_status || null,

        historyFlag: toBoolean(data.history_flag),
        frequency:
          toNumber(data.frequency) !== null
            ? Math.round(toNumber(data.frequency))
            : null,

        timestamp,
        raw: data,
      },
    });

    if (hasFix) nudgeLiveTracking();
    return true;
  } catch (err) {
    console.error("❌ GPS DB Error:", err.message);
    return true; // never fail the device
  }
};
