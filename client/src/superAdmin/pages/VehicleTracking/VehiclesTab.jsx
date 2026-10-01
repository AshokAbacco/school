// client/src/superAdmin/pages/VehicleTracking/VehiclesTab.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// WHAT CHANGED AND WHY
// ────────────────────
// Screenshot 3 shows this table stuck on a spinner. Two reasons:
//   1. `.catch(() => {})` swallowed every failure silently, and
//   2. there was no timeout, so a request that never returns left `loading`
//      true forever — the `.finally()` simply never ran.
// This version aborts after 20s, shows the real error, and offers a retry.
// The heavy lifting is on the server (vehicle.controller.js) — this file just
// stops the UI from lying about what is happening.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Car, Plus, CheckCircle, XCircle, Search, AlertTriangle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/vehicles`;

const REQUEST_TIMEOUT_MS = 20_000;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// fetch that always settles — either with a response or an AbortError.
async function fetchWithTimeout(url, options = {}, ms = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const killer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(killer);
  }
}

function Spinner({ size = 16, color = "#4F46E5" }) {
  return (
    <span style={{ display: "inline-block", width: size, height: size, border: `2px solid ${color}30`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
  );
}

function StatusPill({ active }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: active ? "#F0FDF4" : "#F9FAFB", color: active ? "#166534" : "#6B7280", border: `1px solid ${active ? "#86EFAC" : "#E5E7EB"}`, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function VehicleStatusBadge({ status }) {
  const cfg = {
    PARKED:  { bg: "#EEF2FF", color: "#4338CA", dot: "#6366F1" },
    MOVING:  { bg: "#F0FDF4", color: "#166534", dot: "#22C55E" },
    IDLE:    { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
    OFF:     { bg: "#F9FAFB", color: "#6B7280", dot: "#9CA3AF" },
    NODATA:  { bg: "#F9FAFB", color: "#6B7280", dot: "#D1D5DB" },
  }[status] || { bg: "#F9FAFB", color: "#6B7280", dot: "#9CA3AF" };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {status === "NODATA" ? "No signal" : (status || "No Data")}
    </span>
  );
}

const VEHICLE_TYPES = ["BUS", "VAN", "AUTO", "SCOOTY", "CAR", "TRUCK", "OTHER"];

export default function VehiclesTab({ schoolId, schools = [] }) {
  const [vehicles,    setVehicles]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadError,   setLoadError]   = useState("");
  const [toggling,    setToggling]    = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [search,      setSearch]      = useState("");
  const [form,        setForm]        = useState({ schoolId: "", regNo: "", vehicleName: "", vehicleType: "BUS" });
  const [formError,   setFormError]   = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const inFlightRef = useRef(false);
  const mountedRef  = useRef(true);

  const loadVehicles = useCallback(async () => {
    if (!schoolId) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setLoadError("");

    try {
      const res = await fetchWithTimeout(
        `${BASE}?schoolId=${encodeURIComponent(schoolId)}&includeInactive=true`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      const d = await res.json();
      if (!mountedRef.current) return;

      if (d.success) setVehicles(d.data || []);
      else setLoadError(d.message || "Failed to load vehicles.");
    } catch (e) {
      if (!mountedRef.current) return;
      setLoadError(
        e.name === "AbortError"
          ? `No response in ${REQUEST_TIMEOUT_MS / 1000}s — the vehicles API is not responding.`
          : e.message || "Network error.",
      );
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    mountedRef.current = true;
    loadVehicles();
    return () => { mountedRef.current = false; };
  }, [loadVehicles]);

  async function handleAdd() {
    const { schoolId: sid, regNo, vehicleName, vehicleType } = form;
    if (!sid || !regNo) { setFormError("School and Registration Number are required."); return; }
    setSubmitting(true); setFormError(""); setFormSuccess("");
    try {
      const res = await fetchWithTimeout(BASE, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ schoolId: sid, regNo: regNo.toUpperCase().trim(), vehicleName, vehicleType }),
      });
      const d = await res.json();
      if (d.success) {
        setFormSuccess(`Vehicle ${regNo.toUpperCase()} added successfully.`);
        setForm({ schoolId, regNo: "", vehicleName: "", vehicleType: "BUS" });
        setShowForm(false);
        loadVehicles();
      } else {
        setFormError(d.message || "Failed to add vehicle.");
      }
    } catch (e) {
      setFormError(e.name === "AbortError" ? "Request timed out." : e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id) {
    if (toggling) return;
    setToggling(id);
    try {
      const res = await fetchWithTimeout(`${BASE}/${id}/toggle`, { method: "PATCH", headers: authHeaders() });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, isActive: !v.isActive } : v)));
    } catch (e) {
      setLoadError(e.name === "AbortError" ? "Toggle request timed out." : e.message);
    } finally {
      setToggling(null);
    }
  }

  const filtered = vehicles.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.regNo || "").toLowerCase().includes(q)
      || (v.vehicleName || "").toLowerCase().includes(q)
      || (v.vehicleType || "").toLowerCase().includes(q);
  });

  const inp  = { width: "100%", padding: "8px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box", background: "#FAFAFA" };
  const sel  = { ...inp, cursor: "pointer", appearance: "auto" };
  const lbl  = { display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 };
  const card = { background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "18px 20px", marginBottom: 16 };
  const thS  = { padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#6B7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #F3F4F6", whiteSpace: "nowrap", background: "#F9FAFB" };
  const tdS  = { padding: "12px 14px", borderBottom: "1px solid #F3F4F6", verticalAlign: "middle" };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", color: "#111827" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} color="#9CA3AF" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input style={{ ...inp, paddingLeft: 30 }} placeholder="Search by reg no, name, type…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => { setForm({ schoolId, regNo: "", vehicleName: "", vehicleType: "BUS" }); setFormError(""); setFormSuccess(""); setShowForm((v) => !v); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#4F46E5", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {formSuccess && !showForm && (
        <div style={{ padding: "10px 14px", background: "#F0FDF4", color: "#166534", border: "1px solid #86EFAC", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>✓ {formSuccess}</div>
      )}

      {loadError && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          <span style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {loadError}
          </span>
          <button onClick={loadVehicles} style={{ padding: "5px 12px", background: "#fff", color: "#991B1B", border: "1px solid #FECACA", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
            Retry
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{ ...card, borderColor: "#C7D2FE", background: "#FAFBFF" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={16} color="#4F46E5" /> Add New Vehicle
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px 16px" }}>
            {schools.length > 0 && (
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>School <span style={{ color: "#EF4444" }}>*</span></label>
                <select style={sel} value={form.schoolId} onChange={(e) => setForm((p) => ({ ...p, schoolId: e.target.value }))}>
                  <option value="">— Select School —</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={lbl}>Registration No <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                style={{ ...inp, fontFamily: "monospace", fontWeight: 700, fontSize: 15, letterSpacing: 1, textTransform: "uppercase" }}
                placeholder="KA50EL0766"
                value={form.regNo}
                onChange={(e) => setForm((p) => ({ ...p, regNo: e.target.value.toUpperCase().replace(/\s+/g, "") }))}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Must match exactly what the GPS device sends</p>
            </div>
            <div>
              <label style={lbl}>Vehicle Name</label>
              <input style={inp} placeholder="School Bus 1, Van 2…" value={form.vehicleName} onChange={(e) => setForm((p) => ({ ...p, vehicleName: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Vehicle Type</label>
              <select style={sel} value={form.vehicleType} onChange={(e) => setForm((p) => ({ ...p, vehicleType: e.target.value }))}>
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {formError && <p style={{ margin: "10px 0 0", fontSize: 13, color: "#DC2626" }}>✕ {formError}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={handleAdd} disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: submitting ? "#C7D2FE" : "#4F46E5", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting && <Spinner size={13} color="#fff" />} {submitting ? "Saving…" : "Save Vehicle"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr>
                {["Reg No", "Vehicle Name", "Type", "GPS Status", "Last Seen", "Status", "Action"].map((h) => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0" }}><Spinner size={20} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
                  {loadError ? "Could not load vehicles." : "No vehicles found. Add one above."}
                </td></tr>
              ) : filtered.map((v) => (
                <tr key={v.id} style={{ opacity: v.isActive ? 1 : 0.55 }}>
                  <td style={tdS}>
                    <code style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 14, background: "#F3F4F6", padding: "3px 8px", borderRadius: 5, letterSpacing: 1 }}>
                      {v.regNo}
                    </code>
                  </td>
                  <td style={tdS}><span style={{ fontWeight: 600 }}>{v.vehicleName || <span style={{ color: "#D1D5DB" }}>—</span>}</span></td>
                  <td style={tdS}>
                    <span style={{ background: "#EEF2FF", color: "#4338CA", padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      {v.vehicleType || "—"}
                    </span>
                  </td>
                  <td style={tdS}>
                    {v.latestLocation
                      ? <VehicleStatusBadge status={v.latestLocation.vehicleStatus || v.latestLocation.status} />
                      : <span style={{ color: "#D1D5DB", fontSize: 12 }}>No data yet</span>}
                  </td>
                  <td style={{ ...tdS, color: "#6B7280", fontSize: 12 }}>
                    {v.latestLocation?.recordedAt
                      ? new Date(v.latestLocation.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })
                      : "—"}
                  </td>
                  <td style={tdS}><StatusPill active={v.isActive} /></td>
                  <td style={tdS}>
                    <button
                      onClick={() => handleToggle(v.id)}
                      disabled={toggling === v.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", background: v.isActive ? "#FFF1F2" : "#F0FDF4", color: v.isActive ? "#9F1239" : "#166534", border: `1px solid ${v.isActive ? "#FECDD3" : "#86EFAC"}`, borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: toggling === v.id ? "not-allowed" : "pointer" }}
                    >
                      {toggling === v.id ? <Spinner size={11} color={v.isActive ? "#9F1239" : "#166534"} /> : (v.isActive ? <XCircle size={12} /> : <CheckCircle size={12} />)}
                      {v.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}