// client/src/shared/liveTracking/useRouteEta.js  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// Polls an ETA endpoint and keeps { [vehicleId]: eta } in state.
//   • refreshes every `refreshMs` while the tab is visible
//   • `bumpKey` → call bump() on every live GPS event; the hook refreshes a few
//     seconds later (debounced) so ETAs follow the bus without hammering the API
//   • works with both list responses (school / Bus Head) and single-vehicle ones
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "./liveTracking";

export default function useRouteEta({
  url, // null/"" disables
  refreshMs = 30 * 1000,
  debounceMs = 4000,
  minGapMs = 8000,
}) {
  const [etaByVehicle, setEtaByVehicle] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverSkewMs, setServerSkewMs] = useState(0);

  const inFlight = useRef(false);
  const lastAt = useRef(0);
  const debounceTimer = useRef(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const load = useCallback(async () => {
    const u = urlRef.current;
    if (!u || inFlight.current) return;
    inFlight.current = true;
    lastAt.current = Date.now();
    setLoading(true);
    try {
      const d = await fetchJson(u, { timeoutMs: 25000 });
      if (urlRef.current !== u) return; // school changed meanwhile
      const list = Array.isArray(d.data) ? d.data : d.data ? [d.data] : [];
      const map = {};
      for (const e of list) if (e?.vehicleId) map[e.vehicleId] = e;
      setEtaByVehicle(map);
      setError("");
      const st = Date.parse(d.serverTime);
      if (Number.isFinite(st)) setServerSkewMs(st - Date.now());
    } catch (e) {
      setError(e.message || "Could not load ETAs.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  // reset + first load when the endpoint changes
  useEffect(() => {
    setEtaByVehicle({});
    setError("");
    if (url) load();
  }, [url, load]);

  // periodic refresh while visible
  useEffect(() => {
    if (!url) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "hidden") load();
    }, refreshMs);
    const onVis = () => {
      if (document.visibilityState !== "hidden") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [url, refreshMs, load]);

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  /** Call when a new GPS point arrives. */
  const bump = useCallback(() => {
    clearTimeout(debounceTimer.current);
    const wait = Math.max(debounceMs, minGapMs - (Date.now() - lastAt.current));
    debounceTimer.current = setTimeout(load, wait);
  }, [debounceMs, minGapMs, load]);

  return { etaByVehicle, error, loading, reload: load, bump, serverSkewMs };
}
