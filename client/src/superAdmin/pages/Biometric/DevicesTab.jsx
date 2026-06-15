import React, { useState, useEffect } from "react";
import { Monitor, Plus, School, Hash, Cpu, Calendar, CheckCircle, XCircle, Search } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/biometric`;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
  ...extra,
});

async function apiFetch(url) {
  const res  = await fetch(url, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json.data;
}
async function apiPost(url, body) {
  const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json.data;
}
async function apiPatch(url) {
  const res  = await fetch(url, { method: "PATCH", headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json.data;
}

function Spinner({ size = 16, color = "#4F46E5" }) {
  return <span style={{ display:"inline-block", width:size, height:size, border:`2px solid ${color}30`, borderTop:`2px solid ${color}`, borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />;
}

function StatusPill({ active }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background: active?"#F0FDF4":"#F9FAFB", color: active?"#166534":"#6B7280", border:`1px solid ${active?"#86EFAC":"#E5E7EB"}`, padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700 }}>
      {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const DevicesTab = () => {
  const [schools,        setSchools]        = useState([]);
  const [filterSchool,   setFilterSchool]   = useState("");
  const [filterSearch,   setFilterSearch]   = useState("");
  const [devices,        setDevices]        = useState([]);
  const [tableLoading,   setTableLoading]   = useState(false);
  const [tableError,     setTableError]     = useState("");
  const [toggling,       setToggling]       = useState(null);
  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState({ schoolId:"", deviceName:"", deviceCode:"", serialNo:"" });
  const [formError,      setFormError]      = useState("");
  const [formSuccess,    setFormSuccess]    = useState("");
  const [submitting,     setSubmitting]     = useState(false);

  useEffect(() => {
    apiFetch(`${BASE}/schools`).then(setSchools).catch(() => {});
  }, []);

  useEffect(() => { loadDevices(filterSchool); }, [filterSchool]);

  function loadDevices(schoolId) {
    setTableLoading(true); setTableError("");
    const url = schoolId ? `${BASE}/devices?schoolId=${schoolId}&includeInactive=true` : `${BASE}/devices?includeInactive=true`;
    apiFetch(url).then(setDevices).catch((e) => setTableError(e.message || "Failed")).finally(() => setTableLoading(false));
  }

  async function handleToggle(deviceId) {
    if (toggling) return;
    setToggling(deviceId);
    try {
      await apiPatch(`${BASE}/devices/${deviceId}/toggle`);
      setDevices((prev) => prev.map((d) => d.id === deviceId ? { ...d, isActive: !d.isActive } : d));
    } catch (e) { alert(e.message || "Failed"); }
    finally { setToggling(null); }
  }

  async function handleAddDevice() {
    const { schoolId, deviceName, deviceCode, serialNo } = form;
    if (!schoolId || !deviceCode || !serialNo) { setFormError("School, Device Code, and Serial No are required."); return; }
    setSubmitting(true); setFormError(""); setFormSuccess("");
    try {
      await apiPost(`${BASE}/devices`, { schoolId, deviceName, deviceCode, serialNo });
      setFormSuccess(`Device "${deviceName || deviceCode}" added successfully.`);
      setForm({ schoolId: filterSchool, deviceName:"", deviceCode:"", serialNo:"" });
      setShowForm(false);
      loadDevices(filterSchool);
    } catch (e) { setFormError(e.message || "Failed."); }
    finally { setSubmitting(false); }
  }

  const filtered = devices.filter((d) => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return (d.deviceName||"").toLowerCase().includes(q) || (d.deviceCode||"").toLowerCase().includes(q) || (d.serialNo||"").toLowerCase().includes(q) || (d.school?.name||"").toLowerCase().includes(q);
  });

  const inp = { width:"100%", padding:"8px 12px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:14, color:"#111827", outline:"none", boxSizing:"border-box", background:"#FAFAFA" };
  const sel = { ...inp, cursor:"pointer", appearance:"auto" };
  const lbl = { display:"block", fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:0.6, marginBottom:5 };
  const card = { background:"#fff", borderRadius:12, border:"1px solid #E5E7EB", padding:"18px 20px", marginBottom:16 };
  const thS = { padding:"10px 14px", textAlign:"left", fontWeight:700, color:"#6B7280", fontSize:11, textTransform:"uppercase", letterSpacing:0.5, borderBottom:"2px solid #F3F4F6", whiteSpace:"nowrap", background:"#F9FAFB" };
  const tdS = { padding:"12px 14px", borderBottom:"1px solid #F3F4F6", verticalAlign:"middle" };

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif", color:"#111827" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media(max-width:640px){.dev-filter-row{flex-direction:column!important} .dev-table-wrap{font-size:12px!important}}`}</style>

      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Monitor size={20} color="#4F46E5" />
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Biometric Devices</h2>
        </div>
        <p style={{ margin:"4px 0 0", fontSize:13, color:"#6B7280" }}>Manage physical biometric devices assigned to schools.</p>
      </div>

      {/* Filter + Add row */}
      <div className="dev-filter-row" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14, gap:10, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", flex:1 }}>
          <div style={{ minWidth:200, flex:1 }}>
            <label style={lbl}>Filter by School</label>
            <select style={sel} value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)}>
              <option value="">All Schools</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div style={{ minWidth:180, flex:1 }}>
            <label style={lbl}>Search</label>
            <div style={{ position:"relative" }}>
              <Search size={14} color="#9CA3AF" style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }} />
              <input style={{ ...inp, paddingLeft:30 }} placeholder="Name, code, serial…" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <button onClick={() => { setForm({ schoolId:filterSchool, deviceName:"", deviceCode:"", serialNo:"" }); setFormError(""); setFormSuccess(""); setShowForm((v)=>!v); }}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"#4F46E5", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
          <Plus size={16} /> Add Device
        </button>
      </div>

      {formSuccess && !showForm && (
        <div style={{ padding:"10px 14px", background:"#F0FDF4", color:"#166534", border:"1px solid #86EFAC", borderRadius:8, marginBottom:14, fontSize:13 }}>✓ {formSuccess}</div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{ ...card, borderColor:"#C7D2FE", background:"#FAFBFF", marginBottom:16 }}>
          <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}><Plus size={16} color="#4F46E5" /> Add New Device</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"12px 16px" }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>School <span style={{ color:"#EF4444" }}>*</span></label>
              <select style={sel} value={form.schoolId} onChange={(e) => setForm((p) => ({ ...p, schoolId:e.target.value }))}>
                <option value="">— Select School —</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Device Name</label>
              <input style={inp} placeholder="e.g. Main Gate" value={form.deviceName} onChange={(e) => setForm((p) => ({ ...p, deviceName:e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Device Code <span style={{ color:"#EF4444" }}>*</span></label>
              <input style={inp} placeholder="e.g. D001" value={form.deviceCode} onChange={(e) => setForm((p) => ({ ...p, deviceCode:e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Serial No <span style={{ color:"#EF4444" }}>*</span></label>
              <input style={inp} placeholder="e.g. SN-001" value={form.serialNo} onChange={(e) => setForm((p) => ({ ...p, serialNo:e.target.value }))} />
            </div>
          </div>
          {formError && <p style={{ margin:"10px 0 0", fontSize:13, color:"#DC2626" }}>✕ {formError}</p>}
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <button onClick={handleAddDevice} disabled={submitting} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 20px", background:submitting?"#C7D2FE":"#4F46E5", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:submitting?"not-allowed":"pointer" }}>
              {submitting && <Spinner size={13} color="#fff" />} {submitting ? "Saving…" : "Save Device"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding:"8px 16px", background:"#F3F4F6", color:"#374151", border:"none", borderRadius:8, fontWeight:600, fontSize:14, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={card}>
        <div className="dev-table-wrap" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:560 }}>
            <thead>
              <tr>
                {[["Device Name", Monitor], ["Device Code", Hash], ["Serial No", Cpu], ["School", School], ["Status", CheckCircle], ["Added On", Calendar], ["Action", null]].map(([h, Icon]) => (
                  <th key={h} style={thS}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                      {Icon && <Icon size={11} />} {h}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr><td colSpan={7} style={{ textAlign:"center", padding:"40px 0" }}><Spinner size={20} /></td></tr>
              ) : tableError ? (
                <tr><td colSpan={7} style={{ textAlign:"center", padding:"32px 0", color:"#EF4444" }}>{tableError}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign:"center", padding:"40px 0", color:"#9CA3AF" }}>No devices found. Add one above.</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id} style={{ opacity:d.isActive?1:0.55 }}>
                  <td style={tdS}><span style={{ fontWeight:600 }}>{d.deviceName || <span style={{ color:"#D1D5DB" }}>—</span>}</span></td>
                  <td style={tdS}><code style={{ fontFamily:"monospace", fontWeight:700, background:"#F3F4F6", padding:"2px 7px", borderRadius:5 }}>{d.deviceCode}</code></td>
                  <td style={tdS}><code style={{ fontFamily:"monospace", fontSize:12, color:"#374151" }}>{d.serialNo}</code></td>
                  <td style={tdS}>
                    <div style={{ fontWeight:500 }}>{d.schoolName || d.school?.name || "—"}</div>
                    {(d.schoolCode || d.school?.code) && <div style={{ fontSize:11, color:"#9CA3AF" }}>{d.schoolCode || d.school?.code}</div>}
                  </td>
                  <td style={tdS}><StatusPill active={d.isActive} /></td>
                  <td style={{ ...tdS, color:"#6B7280", whiteSpace:"nowrap" }}>
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                  </td>
                  <td style={tdS}>
                    <button onClick={() => handleToggle(d.id)} disabled={toggling===d.id}
                      style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", background:d.isActive?"#FFF1F2":"#F0FDF4", color:d.isActive?"#9F1239":"#166534", border:`1px solid ${d.isActive?"#FECDD3":"#86EFAC"}`, borderRadius:6, fontWeight:600, fontSize:12, cursor:toggling===d.id?"not-allowed":"pointer" }}>
                      {toggling===d.id ? <Spinner size={11} color={d.isActive?"#9F1239":"#166534"} /> : (d.isActive ? <XCircle size={12} /> : <CheckCircle size={12} />)}
                      {d.isActive ? "Deactivate" : "Activate"}
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
};

export default DevicesTab;