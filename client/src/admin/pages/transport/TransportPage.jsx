// client/src/admin/pages/transport/TransportPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bus, MapPin, Users, Plus, Pencil, Trash2,
  X, Check, Loader2, AlertCircle, RefreshCw,
  Phone, User, IndianRupee, Search, Filter,
  ArrowLeft, GripVertical, Clock, Ruler,
  ChevronRight, AlertTriangle, CheckCircle2,
  ToggleLeft, ToggleRight, Power,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL     = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });
const authOnly    = () => ({ Authorization: `Bearer ${getToken()}` });

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
  green: "#16a34a", red: "#dc2626", amber: "#d97706", purple: "#7c3aed",
};

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

// ── useWindowWidth hook ───────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

// ═══════════════════════════════════════════════════════════════
//  SHARED PRIMITIVES
// ═══════════════════════════════════════════════════════════════

function Pulse({ w = "100%", h = 14, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55`, animation: "pulse 1.5s infinite" }} />;
}

function Badge({ children, color = C.sky }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color = C.sky }) {
  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={19} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10, color: C.textLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label}</p>
        <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 800, color: C.text }}>{value}</p>
      </div>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, width = 500 }) {
  const winW = useWindowWidth();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", padding: winW < 480 ? 8 : 16 }}>
      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, width: "100%", maxWidth: width, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 60px rgba(36,51,64,0.22)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: C.white, zIndex: 1 }}>
          <div style={{ minWidth: 0, paddingRight: 10 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.text }}>{title}</p>
            {subtitle && <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight, flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: "18px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required, as }) {
  const base = { width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      {as === "textarea"
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} style={{ ...base, resize: "none" }} />
        : <input value={value} onChange={onChange} placeholder={placeholder} type={type} style={base} />}
    </div>
  );
}

function FormRow({ children }) {
  const winW = useWindowWidth();
  return (
    <div style={{ display: "grid", gridTemplateColumns: winW < 480 ? "1fr" : "1fr 1fr", gap: 10 }}>
      {children}
    </div>
  );
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: C.red, fontSize: 12, marginBottom: 4 }}>
      <AlertCircle size={13} /> {msg}
    </div>
  );
}

function SaveBtn({ loading, label = "Save", onClick, color }) {
  const bg = color ? `linear-gradient(135deg, ${color}, ${color}cc)` : `linear-gradient(135deg, ${C.slate}, ${C.deep})`;
  return (
    <button onClick={onClick} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, border: "none", background: bg, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}>
      {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />} {label}
    </button>
  );
}

function IconBtn({ icon: Icon, onClick, color = C.textLight, bg = C.bg, border = C.borderLight, title, size = 32 }) {
  return (
    <button title={title} onClick={onClick}
      style={{ width: size, height: size, borderRadius: size / 2.8, border: `1.5px solid ${border}`, background: bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color, flexShrink: 0 }}>
      <Icon size={size * 0.4} />
    </button>
  );
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: C.textLight }}>
      <Icon size={34} strokeWidth={1.2} style={{ marginBottom: 10, opacity: 0.4 }} />
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</p>
      {sub && <p style={{ margin: "5px 0 0", fontSize: 12 }}>{sub}</p>}
    </div>
  );
}

function Toast({ msg, type = "success", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  const bg   = type === "error" ? "#fef2f2" : "#f0fdf4";
  const cl   = type === "error" ? C.red     : C.green;
  const Icon = type === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div style={{ position: "fixed", bottom: 20, right: 16, left: 16, maxWidth: 360, margin: "0 auto", zIndex: 200, background: bg, border: `1.5px solid ${cl}44`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", animation: "fadeUp .3s ease" }}>
      <Icon size={16} color={cl} />
      <span style={{ fontSize: 13, fontWeight: 600, color: cl }}>{msg}</span>
    </div>
  );
}

// ── Toggle status button ──────────────────────────────────────────────────────
function StatusToggleBtn({ isActive, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={isActive ? "Deactivate" : "Activate"}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${isActive ? "#fecaca" : "#bbf7d0"}`,
        background: isActive ? "#fef2f2" : "#f0fdf4",
        color: isActive ? C.red : C.green,
        fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1, whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {loading
        ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
        : <Power size={11} />}
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DRAG-TO-REORDER HOOK
// ═══════════════════════════════════════════════════════════════
function useDragReorder(items, setItems) {
  const dragIdx = useRef(null);
  const overIdx = useRef(null);
  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragEnter = (i) => { overIdx.current = i; };
  const onDragEnd   = () => {
    if (dragIdx.current === null || overIdx.current === null || dragIdx.current === overIdx.current) {
      dragIdx.current = overIdx.current = null; return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(overIdx.current, 0, moved);
    setItems(next);
    dragIdx.current = overIdx.current = null;
  };
  return { onDragStart, onDragEnter, onDragEnd };
}

// ═══════════════════════════════════════════════════════════════
//  ROUTE DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
function RouteDetail({ route: initialRoute, schoolId, allStops, onBack, showToast }) {
  const [route,       setRoute]       = useState(initialRoute);
  const [routeStops,  setRouteStops]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showAddStop, setShowAddStop] = useState(false);
  const [form,        setForm]        = useState({ stopId: "", pickupTime: "", dropTime: "", distanceKm: "" });
  const [saving,      setSaving]      = useState(false);
  const [reordering,  setReordering]  = useState(false);
  const [error,       setError]       = useState("");
  const [localOrder,  setLocalOrder]  = useState([]);
  const [editingStop, setEditingStop] = useState(null);
  const winW = useWindowWidth();

  const { onDragStart, onDragEnter, onDragEnd: rawDragEnd } = useDragReorder(localOrder, setLocalOrder);

  const fetchStops = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport/${route.id}/stops`, { headers: authOnly() });
      const data = await res.json();
      const stops = data.data || [];
      setRouteStops(stops); setLocalOrder(stops);
    } catch { }
    finally { setLoading(false); }
  }, [route.id]);

  useEffect(() => { fetchStops(); }, [fetchStops]);

  const assignedStopIds = new Set(routeStops.map((rs) => rs.stopId));
  const availableStops  = allStops.filter((s) => s.isActive && !assignedStopIds.has(s.id));

  const addStop = async () => {
    if (!form.stopId) { setError("Please select a stop"); return; }
    setSaving(true); setError("");
    try {
      const nextOrder = routeStops.length;
      const body = { stopId: form.stopId, stopOrder: nextOrder, pickupTime: form.pickupTime || null, dropTime: form.dropTime || null, distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : null };
      const res  = await fetch(`${API_URL}/api/admin/transport/${route.id}/stops`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast("Stop added to route");
      setShowAddStop(false);
      setForm({ stopId: "", pickupTime: "", dropTime: "", distanceKm: "" });
      fetchStops();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const removeStop = async (routeStop) => {
    if (!confirm(`Remove "${routeStop.stop?.name}" from this route?`)) return;
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport/${route.id}/stops/${routeStop.id}`, { method: "DELETE", headers: authOnly() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast("Stop removed"); fetchStops();
    } catch (e) { showToast(e.message, "error"); }
  };

  const saveTiming = async () => {
    if (!editingStop) return;
    setSaving(true);
    try {
      const { id, pickupTime, dropTime, distanceKm } = editingStop;
      const res  = await fetch(`${API_URL}/api/admin/transport/${route.id}/stops/${id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ pickupTime: pickupTime || null, dropTime: dropTime || null, distanceKm: distanceKm ? parseFloat(distanceKm) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast("Stop timing updated"); setEditingStop(null); fetchStops();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const onDragEnd = async () => {
    rawDragEnd();
    setTimeout(async () => {
      setReordering(true);
      try {
        const orderIds  = localOrder.map((rs) => rs.id);
        const unchanged = routeStops.every((rs, i) => rs.id === orderIds[i]);
        if (unchanged) { setReordering(false); return; }
        const res  = await fetch(`${API_URL}/api/admin/transport/${route.id}/stops/reorder`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ order: orderIds }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setRouteStops(data.data || localOrder); setLocalOrder(data.data || localOrder);
        showToast("Stop order saved");
      } catch (e) { showToast(e.message, "error"); fetchStops(); }
      finally { setReordering(false); }
    }, 0);
  };

  const startStop = localOrder[0]?.stop?.name;
  const endStop   = localOrder[localOrder.length - 1]?.stop?.name;
  const isMobile  = winW < 600;

  return (
    <div>
      {/* Back + header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.textLight, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: isMobile ? 16 : 18, color: C.text }}>{route.name}</span>
            <Badge color={C.sky}>{route.code}</Badge>
            {!route.isActive && <Badge color={C.red}>Inactive</Badge>}
          </div>
          {startStop && endStop && startStop !== endStop && (
            <p style={{ margin: "3px 0 0", fontSize: 12, color: C.textLight }}>
              {startStop} <ChevronRight size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {endStop}
            </p>
          )}
        </div>
      </div>

      {/* Route meta pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {route.vehicleNumber && <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: C.bg, border: `1px solid ${C.borderLight}`, fontSize: 11, color: C.text }}><Bus size={11} color={C.sky} />{route.vehicleNumber}</div>}
        {route.driverName    && <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: C.bg, border: `1px solid ${C.borderLight}`, fontSize: 11, color: C.text }}><User size={11} color={C.slate} />{route.driverName}{route.driverPhone ? ` · ${route.driverPhone}` : ""}</div>}
        {route.capacity      && <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: C.bg, border: `1px solid ${C.borderLight}`, fontSize: 11, color: C.text }}><Users size={11} color={C.slate} />Cap: {route.capacity}</div>}
      </div>

      {/* Stops header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Route Stops</span>
          <span style={{ marginLeft: 6, fontSize: 11, color: C.textLight }}>({localOrder.length} · drag to reorder)</span>
          {reordering && <span style={{ marginLeft: 8, fontSize: 11, color: C.amber }}>Saving…</span>}
        </div>
        <button onClick={() => { setError(""); setForm({ stopId: "", pickupTime: "", dropTime: "", distanceKm: "" }); setShowAddStop(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Plus size={13} /> Add Stop
        </button>
      </div>

      {localOrder.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 10, background: `${C.sky}12`, border: `1px solid ${C.sky}33`, marginBottom: 10, fontSize: 11, color: C.deep }}>
          <GripVertical size={12} /> Drag handle to reorder. Changes save automatically.
        </div>
      )}

      {/* Stop list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <Pulse h={20} w={20} r={99} /> <Pulse h={13} w="40%" />
            </div>
          ))}
        </div>
      ) : localOrder.length === 0 ? (
        <EmptyState icon={MapPin} title="No stops on this route" sub="Add stops from the global stop list." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {localOrder.map((rs, idx) => (
            <div key={rs.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragEnter={() => onDragEnter(idx)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => e.preventDefault()}
              style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: isMobile ? "10px 12px" : "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "grab", userSelect: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(56,73,89,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
              <GripVertical size={15} color={C.textLight} style={{ flexShrink: 0 }} />
              <div style={{ width: 26, height: 26, borderRadius: 7, background: idx === 0 ? `${C.green}20` : idx === localOrder.length - 1 ? `${C.amber}20` : `${C.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 800, color: idx === 0 ? C.green : idx === localOrder.length - 1 ? C.amber : C.sky }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{rs.stop?.name}</span>
                  {idx === 0 && <Badge color={C.green}>Start</Badge>}
                  {idx === localOrder.length - 1 && localOrder.length > 1 && <Badge color={C.amber}>End</Badge>}
                  {!isMobile && rs.stop?.area && <span style={{ fontSize: 11, color: C.textLight }}>{rs.stop.area}</span>}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                  {rs.pickupTime && <span style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} />{rs.pickupTime}</span>}
                  {rs.dropTime   && <span style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} />{rs.dropTime}</span>}
                  {rs.distanceKm && <span style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 3 }}><Ruler size={10} />{rs.distanceKm} km</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <IconBtn icon={Pencil} size={28} title="Edit timing" onClick={() => setEditingStop({ id: rs.id, pickupTime: rs.pickupTime || "", dropTime: rs.dropTime || "", distanceKm: rs.distanceKm || "" })} />
                <IconBtn icon={Trash2} size={28} color={C.red} bg="#fef2f2" border="#fecaca" title="Remove stop" onClick={() => removeStop(rs)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add stop modal */}
      {showAddStop && (
        <Modal title="Add Stop to Route" subtitle={`Appending to "${route.name}"`} onClose={() => setShowAddStop(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ErrBanner msg={error} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Stop <span style={{ color: C.red }}>*</span></label>
              {availableStops.length === 0 ? (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: `${C.amber}12`, border: `1px solid ${C.amber}44`, fontSize: 12, color: C.amber }}>All active stops are already on this route.</div>
              ) : (
                <select value={form.stopId} onChange={(e) => setForm((p) => ({ ...p, stopId: e.target.value }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                  <option value="">Select a stop…</option>
                  {availableStops.map((s) => <option key={s.id} value={s.id}>{s.name}{s.area ? ` (${s.area})` : ""}</option>)}
                </select>
              )}
            </div>
            <FormRow>
              <Field label="Pickup Time" value={form.pickupTime} onChange={(e) => setForm((p) => ({ ...p, pickupTime: e.target.value }))} type="time" />
              <Field label="Drop Time"   value={form.dropTime}   onChange={(e) => setForm((p) => ({ ...p, dropTime:   e.target.value }))} type="time" />
            </FormRow>
            <Field label="Distance from Start (km)" value={form.distanceKm} onChange={(e) => setForm((p) => ({ ...p, distanceKm: e.target.value }))} type="number" placeholder="3.5" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <button onClick={() => setShowAddStop(false)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <SaveBtn loading={saving} onClick={addStop} label="Add Stop" />
            </div>
          </div>
        </Modal>
      )}

      {/* Edit timing modal */}
      {editingStop && (
        <Modal title="Edit Stop Timing" subtitle="Update pickup/drop times and distance" onClose={() => setEditingStop(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FormRow>
              <Field label="Pickup Time" value={editingStop.pickupTime} onChange={(e) => setEditingStop((p) => ({ ...p, pickupTime: e.target.value }))} type="time" />
              <Field label="Drop Time"   value={editingStop.dropTime}   onChange={(e) => setEditingStop((p) => ({ ...p, dropTime:   e.target.value }))} type="time" />
            </FormRow>
            <Field label="Distance from Start (km)" value={editingStop.distanceKm} onChange={(e) => setEditingStop((p) => ({ ...p, distanceKm: e.target.value }))} type="number" placeholder="3.5" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <button onClick={() => setEditingStop(null)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <SaveBtn loading={saving} onClick={saveTiming} label="Save Timing" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB: ROUTES
// ═══════════════════════════════════════════════════════════════
function RoutesTab({ allStops, showToast }) {
  const [routes,      setRoutes]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState({});
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [detailRoute, setDetailRoute] = useState(null);
  const [toggling,    setToggling]    = useState({}); // { [id]: true } while toggling
  const winW = useWindowWidth();
  const isMobile = winW < 600;

  const f = (k) => ({ value: form[k] ?? "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })) });

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport`, { headers: authOnly() });
      const data = await res.json();
      setRoutes(data.data || []);
    } catch { setRoutes([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const openCreate = () => { setEditing(null); setForm({}); setError(""); setShowModal(true); };
  const openEdit   = (r, e) => { e.stopPropagation(); setEditing(r); setForm(r); setError(""); setShowModal(true); };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const url    = editing ? `${API_URL}/api/admin/transport/${editing.id}` : `${API_URL}/api/admin/transport`;
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowModal(false);
      showToast(editing ? "Route updated" : "Route created");
      fetchRoutes();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  // ── Toggle active/inactive ────────────────────────────────────
  const toggleActive = async (r, e) => {
    e.stopPropagation();
    setToggling((p) => ({ ...p, [r.id]: true }));
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport/${r.id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(r.isActive ? "Route deactivated" : "Route activated");
      fetchRoutes();
    } catch (e) { showToast(e.message, "error"); }
    finally { setToggling((p) => ({ ...p, [r.id]: false })); }
  };

  const filtered = routes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  );

  if (detailRoute) {
    return <RouteDetail route={detailRoute} allStops={allStops} onBack={() => { setDetailRoute(null); fetchRoutes(); }} showToast={showToast} />;
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textLight, pointerEvents: "none" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search routes…"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px 9px 32px", fontSize: 13, color: C.text, background: C.white, outline: "none", boxSizing: "border-box" }} />
        </div>
        <IconBtn icon={RefreshCw} size={36} onClick={fetchRoutes} title="Refresh" />
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Plus size={14} /> {isMobile ? "Add" : "Add Route"}
        </button>
      </div>

      {/* Route cards */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}><Pulse h={16} w="40%" /><Pulse h={12} w="60%" /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bus} title="No routes found" sub="Create your first transport route" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((r) => {
            const stops     = r.routeStops || [];
            const startName = stops[0]?.stop?.name;
            const endName   = stops[stops.length - 1]?.stop?.name;
            return (
              <div key={r.id}
                onClick={() => setDetailRoute(r)}
                style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: isMobile ? "12px" : "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(56,73,89,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>

                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bus size={17} color={C.sky} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{r.name}</span>
                    <Badge color={C.sky}>{r.code}</Badge>
                    {!r.isActive && <Badge color={C.red}>Inactive</Badge>}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                    {startName && endName && startName !== endName && (
                      <span style={{ fontSize: 11, color: C.textLight }}>{startName} → {endName}</span>
                    )}
                    {!isMobile && r.driverName && <span style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 3 }}><User size={10} />{r.driverName}</span>}
                    {!isMobile && r.vehicleNumber && <span style={{ fontSize: 11, color: C.textLight }}>{r.vehicleNumber}</span>}
                    <span style={{ fontSize: 11, color: C.textLight }}>{stops.length} stop{stops.length !== 1 ? "s" : ""}</span>
                    <span style={{ fontSize: 11, color: C.textLight }}>{r._count?.studentTransport ?? 0} students</span>
                  </div>
                </div>

                <ChevronRight size={15} color={C.textLight} style={{ flexShrink: 0 }} />

                {/* Action buttons — stop click propagation */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  {/* Activate / Deactivate toggle */}
                  <StatusToggleBtn
                    isActive={r.isActive}
                    loading={!!toggling[r.id]}
                    onClick={(e) => toggleActive(r, e)}
                  />
                  {!isMobile && <IconBtn icon={Pencil} size={30} onClick={(e) => openEdit(r, e)} title="Edit route" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <Modal title={editing ? "Edit Route" : "Add Route"} subtitle="Route metadata — add stops after creating" onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ErrBanner msg={error} />
            <div style={{ padding: "9px 13px", borderRadius: 10, background: `${C.sky}12`, border: `1px solid ${C.sky}33`, fontSize: 12, color: C.deep }}>
              💡 Create the route first, then open it to add and order stops.
            </div>
            <FormRow>
              <Field label="Route Name" required {...f("name")} placeholder="e.g. Jayanagar Route" />
              <Field label="Route Code" required {...f("code")} placeholder="e.g. RT-001" />
            </FormRow>
            <Field label="Description" {...f("description")} placeholder="Optional notes" as="textarea" />
            <FormRow>
              <Field label="Vehicle Number" {...f("vehicleNumber")} placeholder="KA 01 AB 1234" />
              <Field label="Capacity"       {...f("capacity")}      placeholder="40" type="number" />
            </FormRow>
            <FormRow>
              <Field label="Driver Name"  {...f("driverName")}  placeholder="Driver full name" />
              <Field label="Driver Phone" {...f("driverPhone")} placeholder="+91 98765 43210" />
            </FormRow>
            <details style={{ fontSize: 12 }}>
              <summary style={{ cursor: "pointer", color: C.textLight, fontWeight: 600, paddingBottom: 8 }}>Conductor (optional)</summary>
              <FormRow>
                <Field label="Conductor Name"  {...f("conductorName")}  placeholder="Conductor name" />
                <Field label="Conductor Phone" {...f("conductorPhone")} placeholder="+91 98765 43210" />
              </FormRow>
            </details>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, flexWrap: "wrap" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <SaveBtn loading={saving} onClick={save} label={editing ? "Update Route" : "Create Route"} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB: STOPS
// ═══════════════════════════════════════════════════════════════
function StopsTab({ onStopsChange, showToast }) {
  const [stops,     setStops]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [toggling,  setToggling]  = useState({});
  const winW = useWindowWidth();
  const isMobile = winW < 600;

  const f = (k) => ({ value: form[k] ?? "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })) });

  const fetchStops = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport/stops`, { headers: authOnly() });
      const data = await res.json();
      const list = data.data || [];
      setStops(list); onStopsChange?.(list);
    } catch { setStops([]); }
    finally { setLoading(false); }
  }, [onStopsChange]);

  useEffect(() => { fetchStops(); }, [fetchStops]);

  const openCreate = () => { setEditing(null); setForm({}); setError(""); setShowModal(true); };
  const openEdit   = (s) => { setEditing(s);  setForm(s);  setError(""); setShowModal(true); };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const url    = editing ? `${API_URL}/api/admin/transport/stops/${editing.id}` : `${API_URL}/api/admin/transport/stops`;
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowModal(false);
      showToast(editing ? "Stop updated" : "Stop created");
      fetchStops();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  // ── Toggle stop active/inactive ───────────────────────────────
  const toggleActive = async (s) => {
    setToggling((p) => ({ ...p, [s.id]: true }));
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport/stops/${s.id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(s.isActive ? "Stop deactivated" : "Stop activated");
      fetchStops();
    } catch (e) { showToast(e.message, "error"); }
    finally { setToggling((p) => ({ ...p, [s.id]: false })); }
  };

  const areas    = [...new Set(stops.map((s) => s.area).filter(Boolean))].sort();
  const filtered = stops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.area ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const cols = winW < 480 ? "1fr" : winW < 900 ? "1fr 1fr" : "repeat(auto-fill, minmax(260px, 1fr))";

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textLight, pointerEvents: "none" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stops or areas…"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px 9px 32px", fontSize: 13, color: C.text, background: C.white, outline: "none", boxSizing: "border-box" }} />
        </div>
        <IconBtn icon={RefreshCw} size={36} onClick={fetchStops} title="Refresh" />
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Plus size={14} /> {isMobile ? "Add" : "Add Stop"}
        </button>
      </div>

      {/* Area filter chips */}
      {areas.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 4 }}><Filter size={10} />Areas:</span>
          {areas.map((a) => (
            <button key={a} onClick={() => setSearch(search === a ? "" : a)}
              style={{ padding: "3px 10px", borderRadius: 99, border: `1px solid ${C.borderLight}`, background: search === a ? C.mist : C.white, color: search === a ? C.deep : C.textLight, fontSize: 11, cursor: "pointer", fontWeight: search === a ? 700 : 400 }}>
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Stop grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} style={{ borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}><Pulse h={14} w="50%" /><Pulse h={11} w="70%" /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={MapPin} title="No stops found" sub="Create global bus stops to attach to routes" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10 }}>
          {filtered.map((s) => (
            <div key={s.id} style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: "13px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: s.isActive ? `${C.green}18` : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <MapPin size={15} color={s.isActive ? C.green : "#9ca3af"} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{s.name}</p>
                    {s.area     && <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight }}>{s.area}</p>}
                    {s.landmark && <p style={{ margin: "1px 0 0", fontSize: 11, color: C.textLight }}>{s.landmark}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                      <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{s._count?.studentTransport ?? 0} students</p>
                      {!s.isActive && <Badge color={C.red}>Inactive</Badge>}
                    </div>
                  </div>
                </div>
                {/* Edit button */}
                <IconBtn icon={Pencil} size={27} onClick={() => openEdit(s)} title="Edit stop" />
              </div>
              {/* Activate/Deactivate below */}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <StatusToggleBtn
                  isActive={s.isActive}
                  loading={!!toggling[s.id]}
                  onClick={() => toggleActive(s)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? "Edit Stop" : "Add Stop"} subtitle="Bus stop details" onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ErrBanner msg={error} />
            <Field label="Stop Name" required {...f("name")} placeholder="e.g. Jayanagar 4th Block" />
            <FormRow>
              <Field label="Area"     {...f("area")}     placeholder="e.g. Jayanagar" />
              <Field label="Landmark" {...f("landmark")} placeholder="Near XYZ junction" />
            </FormRow>
            <FormRow>
              <Field label="Latitude"  {...f("latitude")}  placeholder="12.9352" type="number" />
              <Field label="Longitude" {...f("longitude")} placeholder="77.6245" type="number" />
            </FormRow>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, flexWrap: "wrap" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <SaveBtn loading={saving} onClick={save} label={editing ? "Update Stop" : "Create Stop"} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB: FEE PLANS
// ═══════════════════════════════════════════════════════════════
function FeePlansTab({ showToast }) {
  const [plans,     setPlans]     = useState([]);
  const [routes,    setRoutes]    = useState([]);
  const [stops,     setStops]     = useState([]);
  const [years,     setYears]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const winW = useWindowWidth();

  const f = (k) => ({ value: form[k] ?? "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })) });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pR, rR, sR, yR] = await Promise.all([
        fetch(`${API_URL}/api/admin/transport/fee-plans`,      { headers: authOnly() }),
        fetch(`${API_URL}/api/admin/transport`,                { headers: authOnly() }),
        fetch(`${API_URL}/api/admin/transport/stops`,          { headers: authOnly() }),
        fetch(`${API_URL}/api/admin/transport/academic-years`, { headers: authOnly() }),
      ]);
      const [p, r, s, y] = await Promise.all([pR.json(), rR.json(), sR.json(), yR.json()]);
      setPlans(p.data || []); setRoutes(r.data || []); setStops(s.data || []); setYears(y.data || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    setSaving(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport/fee-plans`, { method: "POST", headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowModal(false); showToast("Fee plan created"); fetchAll();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const FREQ_COLORS = { MONTHLY: C.sky, QUARTERLY: C.amber, ANNUAL: C.green };
  const isMobile = winW < 600;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14, gap: 8 }}>
        <IconBtn icon={RefreshCw} size={36} onClick={fetchAll} title="Refresh" />
        <button onClick={() => { setForm({}); setError(""); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Plus size={14} /> {isMobile ? "Add" : "Add Fee Plan"}
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}><Pulse h={14} w="40%" /><Pulse h={11} w="60%" /></div>)}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState icon={IndianRupee} title="No fee plans yet" sub="Create fee plans for each route-stop combination" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plans.map((p) => (
            <div key={p.id} style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: isMobile ? "12px" : "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IndianRupee size={17} color={C.amber} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.route?.name}</span>
                  <ChevronRight size={12} color={C.textLight} />
                  <span style={{ fontSize: 13, color: C.textLight }}>{p.stop?.name}</span>
                  <Badge color={FREQ_COLORS[p.frequency] ?? C.sky}>{p.frequency}</Badge>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textLight }}>{p.academicYear?.name}</p>
              </div>
              <span style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{fmtCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Fee Plan" subtitle="Set fee for a route-stop combination" onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ErrBanner msg={error} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Academic Year <span style={{ color: C.red }}>*</span></label>
              <select value={form.academicYearId ?? ""} onChange={(e) => setForm((p) => ({ ...p, academicYearId: e.target.value }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                <option value="">Select year…</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.isActive ? " (Active)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Route <span style={{ color: C.red }}>*</span></label>
              <select value={form.routeId ?? ""} onChange={(e) => setForm((p) => ({ ...p, routeId: e.target.value }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                <option value="">Select route…</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Stop <span style={{ color: C.red }}>*</span></label>
              <select value={form.stopId ?? ""} onChange={(e) => setForm((p) => ({ ...p, stopId: e.target.value }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                <option value="">Select stop…</option>
                {stops.map((s) => <option key={s.id} value={s.id}>{s.name}{s.area ? ` (${s.area})` : ""}</option>)}
              </select>
            </div>
            <FormRow>
              <Field label="Fee Amount (₹)" required {...f("amount")} placeholder="1500" type="number" />
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Frequency</label>
                <select value={form.frequency ?? "MONTHLY"} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
            </FormRow>
            <Field label="Effective From" {...f("effectiveFrom")} type="date" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, flexWrap: "wrap" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <SaveBtn loading={saving} onClick={save} label="Create Fee Plan" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TAB: STUDENT ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════
function StudentsTab({ showToast }) {
  const [assignments, setAssignments] = useState([]);
  const [routes,      setRoutes]      = useState([]);
  const [stops,       setStops]       = useState([]);
  const [years,       setYears]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState({});
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [filterYear,  setFilterYear]  = useState("");
  const [routeStops,  setRouteStops]  = useState([]);
  const winW = useWindowWidth();
  const isMobile = winW < 600;

  const f = (k) => ({ value: form[k] ?? "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })) });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ isActive: "true" });
      if (filterYear) params.set("academicYearId", filterYear);
      const [aR, rR, sR, yR] = await Promise.all([
        fetch(`${API_URL}/api/admin/transport/students?${params}`, { headers: authOnly() }),
        fetch(`${API_URL}/api/admin/transport`,                    { headers: authOnly() }),
        fetch(`${API_URL}/api/admin/transport/stops`,              { headers: authOnly() }),
        fetch(`${API_URL}/api/admin/transport/academic-years`,     { headers: authOnly() }),
      ]);
      const [a, r, s, y] = await Promise.all([aR.json(), rR.json(), sR.json(), yR.json()]);
      setAssignments(a.data || []); setRoutes(r.data || []); setStops(s.data || []); setYears(y.data || []);
    } catch { }
    finally { setLoading(false); }
  }, [filterYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!form.routeId) { setRouteStops([]); return; }
    fetch(`${API_URL}/api/admin/transport/${form.routeId}/stops`, { headers: authOnly() })
      .then((r) => r.json())
      .then((d) => setRouteStops((d.data || []).map((rs) => rs.stop).filter(Boolean)))
      .catch(() => setRouteStops([]));
  }, [form.routeId]);

  const save = async () => {
    setSaving(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport/students`, { method: "POST", headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowModal(false); showToast("Student assigned to transport"); fetchAll();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deactivate = async (a) => {
    if (!confirm(`Remove "${a.student?.name}" from transport?`)) return;
    try {
      const res  = await fetch(`${API_URL}/api/admin/transport/students/${a.id}`, { method: "DELETE", headers: authOnly() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast("Transport assignment removed"); fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const filtered = assignments.filter((a) =>
    a.student?.name.toLowerCase().includes(search.toLowerCase()) ||
    a.route?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textLight, pointerEvents: "none" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px 9px 32px", fontSize: 13, color: C.text, background: C.white, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 12px", fontSize: 12, color: C.text, background: C.white, outline: "none", maxWidth: isMobile ? 120 : "none" }}>
          <option value="">All Years</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <IconBtn icon={RefreshCw} size={36} onClick={fetchAll} title="Refresh" />
        <button onClick={() => { setForm({}); setRouteStops([]); setError(""); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Plus size={14} /> {isMobile ? "Assign" : "Assign Student"}
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}><Pulse h={14} w="35%" /><Pulse h={11} w="55%" /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No student assignments found" sub="Assign students to routes and stops" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((a) => (
            <div key={a.id} style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: isMobile ? "11px 12px" : "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.slate}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 13, color: C.slate }}>
                {(a.student?.name ?? "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{a.student?.name}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 3 }}><Bus size={10} />{a.route?.name}</span>
                  <span style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} />{a.stop?.name}</span>
                  {!isMobile && <Badge color={C.sky}>{a.pickupType}</Badge>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.text }}>{fmtCurrency(a.feeAmount)}</p>
                <button onClick={() => deactivate(a)} style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 7, border: `1px solid #fecaca`, background: "#fef2f2", color: C.red, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  <Trash2 size={10} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Assign Student to Transport" subtitle="Link a student to a route and stop" onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ErrBanner msg={error} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Academic Year <span style={{ color: C.red }}>*</span></label>
              <select value={form.academicYearId ?? ""} onChange={(e) => setForm((p) => ({ ...p, academicYearId: e.target.value }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                <option value="">Select year…</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.isActive ? " (Active)" : ""}</option>)}
              </select>
            </div>
            <Field label="Student ID" required {...f("studentId")} placeholder="Student UUID" />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Route <span style={{ color: C.red }}>*</span></label>
              <select value={form.routeId ?? ""} onChange={(e) => setForm((p) => ({ ...p, routeId: e.target.value, stopId: "" }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                <option value="">Select route…</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Stop <span style={{ color: C.red }}>*</span></label>
              {form.routeId && routeStops.length === 0 ? (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: `${C.amber}12`, border: `1px solid ${C.amber}44`, fontSize: 12, color: C.amber }}>No stops on this route yet.</div>
              ) : (
                <select value={form.stopId ?? ""} onChange={(e) => setForm((p) => ({ ...p, stopId: e.target.value }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                  <option value="">Select stop…</option>
                  {(form.routeId ? routeStops : stops).map((s) => <option key={s.id} value={s.id}>{s.name}{s.area ? ` (${s.area})` : ""}</option>)}
                </select>
              )}
            </div>
            <FormRow>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>Pickup Type</label>
                <select value={form.pickupType ?? "BOTH"} onChange={(e) => setForm((p) => ({ ...p, pickupType: e.target.value }))} style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 13px", fontSize: 13, color: C.text, background: C.bg, outline: "none" }}>
                  <option value="BOTH">Both</option>
                  <option value="PICKUP">Pickup Only</option>
                  <option value="DROP">Drop Only</option>
                </select>
              </div>
              <Field label="Fee Amount (₹)" required {...f("feeAmount")} placeholder="1500" type="number" />
            </FormRow>
            <Field label="Start Date" {...f("startDate")} type="date" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, flexWrap: "wrap" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <SaveBtn loading={saving} onClick={save} label="Assign Student" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { id: "routes",   label: "Routes",    icon: Bus },
  { id: "stops",    label: "Stops",     icon: MapPin },
  { id: "fees",     label: "Fee Plans", icon: IndianRupee },
  { id: "students", label: "Students",  icon: Users },
];

export default function TransportPage() {
  const [tab,      setTab]      = useState("routes");
  const [stats,    setStats]    = useState(null);
  const [allStops, setAllStops] = useState([]);
  const [toast,    setToast]    = useState(null);
  const winW = useWindowWidth();
  const isMobile = winW < 600;

  const showToast = useCallback((msg, type = "success") => { setToast({ msg, type }); }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/transport/stats`, { headers: authOnly() })
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(() => {});
  }, []);

  return (
    <>
      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .4s ease both }
        [draggable=true] { cursor: grab; }
        [draggable=true]:active { cursor: grabbing; }
        * { box-sizing: border-box; }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ minHeight: "100vh", background: C.bg, padding: isMobile ? "16px 12px" : "24px 28px", fontFamily: "'DM Sans', sans-serif" }}>
        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 4, height: isMobile ? 24 : 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})` }} />
                <h1 style={{ margin: 0, fontSize: isMobile ? "clamp(18px,5vw,22px)" : "clamp(20px,4vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.5px" }}>Transport Management</h1>
              </div>
              <p style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: C.textLight }}>Manage routes, stops, fee plans, and student assignments</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="fade-up" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
          <StatCard icon={Bus}         label="Active Routes"  value={stats?.totalRoutes   ?? "—"} color={C.sky} />
          <StatCard icon={MapPin}      label="Active Stops"   value={stats?.totalStops    ?? "—"} color={C.green} />
          <StatCard icon={Users}       label="Students"       value={stats?.totalStudents ?? "—"} color={C.slate} />
          <StatCard icon={IndianRupee} label="Pending Fees"   value={stats ? fmtCurrency(stats.pendingAmount) : "—"} color={C.amber} />
        </div>

        {/* Tab bar */}
        <div className="fade-up" style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "7px 12px" : "8px 16px", borderRadius: 11, border: active ? "none" : `1.5px solid ${C.borderLight}`, background: active ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : C.white, color: active ? "#fff" : C.textLight, fontSize: isMobile ? 12 : 13, fontWeight: active ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                <Icon size={13} />
                {isMobile ? (id === "fees" ? "Fees" : label) : label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="fade-up" style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, padding: isMobile ? 14 : 20, boxShadow: "0 2px 20px rgba(56,73,89,0.07)" }}>
          {tab === "routes"   && <RoutesTab   allStops={allStops} showToast={showToast} />}
          {tab === "stops"    && <StopsTab    onStopsChange={setAllStops} showToast={showToast} />}
          {tab === "fees"     && <FeePlansTab showToast={showToast} />}
          {tab === "students" && <StudentsTab showToast={showToast} />}
        </div>
      </div>
    </>
  );
}