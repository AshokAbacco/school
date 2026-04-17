import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🔧 Safe number parser (improved)
const toNumber = (val, fallback = null) => {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
};

// 🔧 Safe boolean parser
const toBoolean = (val) => {
  return val === true || val === "true" || val === 1 || val === "1";
};

// 🔧 Robust timestamp parser
const parseTimestamp = (val) => {
  if (!val) return new Date();

  // ✅ Try ISO format
  const iso = new Date(val);
  if (!isNaN(iso.getTime())) return iso;

  // ✅ Handle "DD-MM-YYYY HH:mm:ss"
  const match = val.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
  );

  if (match) {
    const [, d, m, y, hh, mm, ss] = match;

    const formatted = `${y}-${m.padStart(2, "0")}-${d.padStart(
      2,
      "0",
    )}T${hh}:${mm}:${ss}Z`;

    const parsed = new Date(formatted);

    if (!isNaN(parsed.getTime())) return parsed;
  }

  // ✅ FINAL FALLBACK (never invalid)
  console.warn("⚠️ Invalid timestamp received:", val);
  return new Date();
};

export const processPayload = async (data = {}) => {
  try {
    const imei = String(data.device_id || "").trim();

    if (!imei) {
      console.warn("⚠️ Missing IMEI");
      return true; // do NOT fail ingestion
    }

    // 🔍 1. Find or create device
    let device = await prisma.device.findUnique({
      where: { imei },
    });

    if (!device) {
      device = await prisma.device.create({
        data: {
          imei,
          name: `Device-${imei.slice(-4)}`,
          deviceNumber: data.device_number || null,
        },
      });

      console.log("🆕 New device created:", imei);
    } else {
      if (data.device_number && device.deviceNumber !== data.device_number) {
        await prisma.device.update({
          where: { id: device.id },
          data: { deviceNumber: data.device_number },
        });
      }
    }

    // ⏱️ Normalize timestamp
    const timestamp = parseTimestamp(data.timestamp);

    // 📦 Handle batch GPS data
    if (Array.isArray(data.gps_data) && data.gps_data.length > 0) {
      for (const point of data.gps_data) {
        await prisma.deviceLocation.create({
          data: {
            deviceId: device.id,
            latitude: toNumber(point.lat),
            longitude: toNumber(point.lng),
            timestamp: point.timestamp
              ? parseTimestamp(point.timestamp)
              : timestamp,
            raw: point,
          },
        });
      }

      console.log("📦 Batch GPS data saved:", imei);
      return true;
    }

    // 🔍 GPS validation
    const lat = toNumber(data.device_last_lat);
    const lng = toNumber(data.device_last_long);

    const isValidGPS =
      lat !== null && lng !== null && !(lat === 0 && lng === 0);

    const gpsOn = data.gps_led_status === 1;

    // 🔋 Normalize signal & satellites
    const signal = Math.max(0, toNumber(data.signalLevel, 0));
    const satellites = Math.max(0, toNumber(data.satellite_count, 0));

    // 🚗 Fix inconsistent motion data
    let accStatus = data.acc_status || null;

    if (toNumber(data.speed_kmph) === 0 && toNumber(data.motion_avg) > 1000) {
      accStatus = "movement";
    }

    // 📍 Save location
    await prisma.deviceLocation.create({
      data: {
        deviceId: device.id,

        // 📍 GPS (safe)
        latitude: gpsOn && isValidGPS ? lat : null,
        longitude: gpsOn && isValidGPS ? lng : null,
        altitude: toNumber(data.device_last_altitude),

        // 🔋 Basic
        battery: toNumber(data.battery_level),
        speed: toNumber(data.speed_kmph),
        signal,

        // 🛰️ GPS quality
        satelliteCount: satellites,
        heading: toNumber(data.heading),

        // 📈 Motion
        accelX: toNumber(data.accel_x),
        accelY: toNumber(data.accel_y),
        accelZ: toNumber(data.accel_z),

        accMagnitude: toNumber(data.acc_magnitude),
        motionAvg: toNumber(data.motion_avg),
        accStatus,

        // 🔋 Advanced battery
        batteryVoltage: toNumber(data.battery_voltage_mV),
        batteryStatus: data.battery_status || null,

        // ⚙️ Flags
        historyFlag: toBoolean(data.history_flag),
        frequency: toNumber(data.frequency),

        // ⏱️ Time
        timestamp,

        // 🔥 Full payload
        raw: data,
      },
    });

    console.log("📍 Location saved:", imei);

    return true;
  } catch (err) {
    console.error("❌ DB Error:", err);

    // ⚠️ Do NOT fail API — just log
    return true;
  }
};
