// client/src/shared/liveTracking/liveTracking.js  (UPDATED: + fetchJson, time/ETA formatters)
// ═══════════════════════════════════════════════════════════════════════════════
// • openLiveStream  – Server-Sent Events over fetch() so we can send the
//                     Authorization header (native EventSource cannot).
//                     Auto-reconnects with backoff, detects dead connections.
// • applyLivePoints – merges new GPS points into a vehicle's state so the map
//                     can animate along them.
// • geo helpers     – distance, bearing, rough ETA.
// ═══════════════════════════════════════════════════════════════════════════════

export const API_URL = import.meta.env.VITE_API_URL;

export const getToken = () => {
  try {
    return JSON.parse(localStorage.getItem("auth"))?.token || null;
  } catch {
    return null;
  }
};

export const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/**
 * fetch → JSON that always settles and never hides a failure.
 * Throws an Error whose message is human readable ("Session expired (401)…").
 */
export async function fetchJson(url, { timeoutMs = 20000, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      headers: authHeaders(),
      ...options,
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(
      e.name === "AbortError"
        ? `No response in ${Math.round(timeoutMs / 1000)}s — server not responding.`
        : "Network error — check your connection.",
    );
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || body?.success === false) {
    const msg = body?.message || `Server responded ${res.status}`;
    const err = new Error(
      res.status === 401
        ? `Session expired or not authorised (401). Please log in again. ${body?.message ? `— ${body.message}` : ""}`
        : `${msg}${res.ok ? "" : ` (${res.status})`}`,
    );
    err.status = res.status;
    throw err;
  }
  return body;
}

/** ISO → "7:42 am" in IST */
export function formatClock(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "HH:MM" (24h, from the route) → "7:35 am" */
export function formatScheduled(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
  if (!m) return hhmm || "—";
  const h = Number(m[1]);
  const ap = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${m[2]} ${ap}`;
}

/** minutes → "now" | "4 min" | "1 h 12 min" */
export function formatEtaMin(min) {
  if (min === null || min === undefined || !Number.isFinite(min)) return "—";
  if (min <= 0) return "now";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** delay minutes → { label, color, bg } */
export function punctualityStyle(punctuality, delayMin) {
  const d = Math.round(Math.abs(delayMin ?? 0));
  if (punctuality === "EARLY")
    return { label: `${d} min early`, color: "#1D4ED8", bg: "#EFF6FF" };
  if (punctuality === "DELAYED")
    return { label: `${d} min late`, color: "#B91C1C", bg: "#FEF2F2" };
  if (punctuality === "ON_TIME")
    return { label: "On time", color: "#166534", bg: "#F0FDF4" };
  return null;
}

const BACKOFF = [1000, 2000, 4000, 8000, 15000];

/**
 * @param {object}   opts
 * @param {string}   opts.url
 * @param {Function} opts.onEvent   (eventName, data) => void
 * @param {Function} opts.onStatus  ("connecting"|"live"|"reconnecting"|"unavailable", info) => void
 * @returns {Function} close()
 */
export function openLiveStream({
  url,
  onEvent,
  onStatus,
  idleTimeoutMs = 45000,
}) {
  let stopped = false;
  let controller = null;
  let attempt = 0;
  let retryTimer = null;
  let idleTimer = null;

  const status = (s, info) => {
    if (!stopped) onStatus?.(s, info);
  };

  const armIdle = () => {
    clearTimeout(idleTimer);
    // Server sends a heartbeat every 20s; silence means a dead connection.
    idleTimer = setTimeout(() => controller?.abort(), idleTimeoutMs);
  };

  const dispatch = (block) => {
    let event = "message";
    const data = [];
    for (const line of block.split("\n")) {
      if (!line || line.startsWith(":")) continue;
      const i = line.indexOf(":");
      const field = i === -1 ? line : line.slice(0, i);
      let value = i === -1 ? "" : line.slice(i + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "event") event = value;
      else if (field === "data") data.push(value);
    }
    if (!data.length) return;
    let parsed;
    try {
      parsed = JSON.parse(data.join("\n"));
    } catch {
      parsed = data.join("\n");
    }
    try {
      onEvent?.(event, parsed);
    } catch (e) {
      console.error("[liveStream] handler error", e);
    }
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    const delay =
      BACKOFF[Math.min(attempt, BACKOFF.length - 1)] + Math.random() * 400;
    attempt += 1;
    status("reconnecting", { inMs: Math.round(delay) });
    retryTimer = setTimeout(connect, delay);
  };

  async function connect() {
    if (stopped) return;
    controller = new AbortController();
    status(attempt === 0 ? "connecting" : "reconnecting");

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${getToken()}`,
        },
        signal: controller.signal,
        cache: "no-store",
      });

      const type = res.headers.get("content-type") || "";
      if (!res.ok || !res.body || !type.includes("text/event-stream")) {
        let body = null;
        try {
          body = await res.json();
        } catch {
          /* ignore */
        }
        if ([401, 403, 404, 409].includes(res.status) || !res.body || res.ok) {
          // Nothing to stream (no bus / not logged in) or streaming unsupported
          status("unavailable", { httpStatus: res.status, body });
          stopped = true;
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      attempt = 0;
      status("live");
      armIdle();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        armIdle();
        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          dispatch(block);
        }
      }
    } catch {
      /* network error / abort → reconnect below */
    } finally {
      clearTimeout(idleTimer);
    }

    scheduleReconnect();
  }

  connect();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    clearTimeout(idleTimer);
    controller?.abort();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle state merging
// vehicle state shape: { ...meta, point, motion: { seq, points, jump }, initialTrail }
// ─────────────────────────────────────────────────────────────────────────────
export const tsOf = (p) => (p?.ts ? Date.parse(p.ts) : 0);

const validPoint = (p) =>
  p &&
  Number.isFinite(Number(p.latitude)) &&
  Number.isFinite(Number(p.longitude)) &&
  !(Number(p.latitude) === 0 && Number(p.longitude) === 0);

const cleanPoint = (p) => ({
  ...p,
  latitude: Number(p.latitude),
  longitude: Number(p.longitude),
});

/**
 * Add new points to a vehicle. Older/duplicate points are ignored, so it is
 * safe to feed the same data from stream AND polling.
 * @param latestExtra  server's `latest` object (has ageSec/isStale/address)
 */
export function applyLivePoints(
  prev,
  points,
  { latestExtra = null, jump = false } = {},
) {
  const lastTs = tsOf(prev?.point);
  const fresh = (points || [])
    .filter(validPoint)
    .map(cleanPoint)
    .filter((p) => !lastTs || tsOf(p) > lastTs)
    .sort((a, b) => tsOf(a) - tsOf(b));

  if (!fresh.length) {
    // Same position, but status/address/staleness may have changed
    if (latestExtra && prev?.point && tsOf(latestExtra) === lastTs) {
      return { ...prev, point: { ...prev.point, ...cleanPoint(latestExtra) } };
    }
    return prev;
  }

  let latest = fresh[fresh.length - 1];
  if (latestExtra && tsOf(latestExtra) === tsOf(latest))
    latest = { ...latest, ...cleanPoint(latestExtra) };

  return {
    ...prev,
    point: latest,
    motion: {
      seq: (prev?.motion?.seq || 0) + 1,
      points: fresh,
      jump: jump || !prev?.point,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Geo helpers
// ─────────────────────────────────────────────────────────────────────────────
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

export function distanceMeters(a, b) {
  if (!a || !b) return 0;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDeg(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Very rough ETA: straight-line distance × 1.35 road factor at current or 20 km/h. */
export function roughEtaMinutes(meters, speedKmh) {
  if (!meters) return null;
  const kmh = speedKmh && speedKmh > 8 ? speedKmh : 20;
  return Math.max(1, Math.round(((meters * 1.35) / 1000 / kmh) * 60));
}

export function formatAge(sec) {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return "—";
  if (sec < 5) return "just now";
  if (sec < 60) return `${Math.round(sec)}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  return `${Math.floor(sec / 86400)} d ago`;
}
