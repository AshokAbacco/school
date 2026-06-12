import React, { useState, useEffect } from "react";

/**
 * DevicesTab
 * ----------
 * Super Admin can:
 *   1. View all devices across all schools (or filtered by school)
 *   2. Add a new device to a school
 *   3. Toggle device active/inactive
 *
 * API endpoints used:
 *   GET    /api/biometric/schools
 *   GET    /api/biometric/devices?schoolId=
 *   POST   /api/biometric/devices
 *   PATCH  /api/biometric/devices/:id/toggle
 */

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/biometric`;

// ─── Auth ─────────────────────────────────────────────────────────────────────
const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
  ...extra,
});

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(url) {
  const res  = await fetch(url, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json.data;
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ size = 16, color = "#4F46E5" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${color}30`,
      borderTop: `2px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function StatusPill({ active }) {
  return (
    <span style={{
      background: active ? "#F0FDF4" : "#F9FAFB",
      color:      active ? "#166534" : "#6B7280",
      border:     `1px solid ${active ? "#86EFAC" : "#E5E7EB"}`,
      padding: "2px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 700,
    }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DevicesTab = () => {
  // schools
  const [schools,        setSchools]        = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [filterSchool,   setFilterSchool]   = useState("");

  // devices table
  const [devices,       setDevices]       = useState([]);
  const [tableLoading,  setTableLoading]  = useState(false);
  const [tableError,    setTableError]    = useState("");
  const [toggling,      setToggling]      = useState(null); // device id being toggled

  // add form
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState({ schoolId: "", deviceName: "", deviceCode: "", serialNo: "" });
  const [formError,    setFormError]    = useState("");
  const [formSuccess,  setFormSuccess]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);

  // ── Load schools ──
  useEffect(() => {
    setSchoolsLoading(true);
    apiFetch(`${BASE}/schools`)
      .then(setSchools)
      .catch(() => {})
      .finally(() => setSchoolsLoading(false));
  }, []);

  // ── Load devices when filter changes ──
  useEffect(() => {
    loadDevices(filterSchool);
  }, [filterSchool]);

  function loadDevices(schoolId) {
    setTableLoading(true);
    setTableError("");
    const url = schoolId
      ? `${BASE}/devices?schoolId=${schoolId}&includeInactive=true`
      : `${BASE}/devices?includeInactive=true`;

    apiFetch(url)
      .then(setDevices)
      .catch((e) => setTableError(e.message || "Failed to load devices"))
      .finally(() => setTableLoading(false));
  }

  // ── Toggle active/inactive ──
  async function handleToggle(deviceId) {
    if (toggling) return;
    setToggling(deviceId);
    try {
      await apiPatch(`${BASE}/devices/${deviceId}/toggle`);
      setDevices((prev) =>
        prev.map((d) => d.id === deviceId ? { ...d, isActive: !d.isActive } : d)
      );
    } catch (e) {
      alert(e.message || "Failed to toggle device");
    } finally {
      setToggling(null);
    }
  }

  // ── Add device ──
  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  }

  async function handleAddDevice() {
    const { schoolId, deviceName, deviceCode, serialNo } = form;
    if (!schoolId || !deviceCode || !serialNo) {
      setFormError("School, Device Code, and Serial No are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");
    try {
      await apiPost(`${BASE}/devices`, { schoolId, deviceName, deviceCode, serialNo });
      setFormSuccess(`Device "${deviceName || deviceCode}" added successfully.`);
      setForm({ schoolId: filterSchool, deviceName: "", deviceCode: "", serialNo: "" });
      setShowForm(false);
      loadDevices(filterSchool);
    } catch (e) {
      setFormError(e.message || "Failed to add device.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const card = {
    background: "#fff", borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: "20px 24px", marginBottom: 20,
  };

  const label = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "#6B7280", textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 6,
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px",
    border: "1.5px solid #E5E7EB", borderRadius: 8,
    fontSize: 14, color: "#111827", outline: "none",
    boxSizing: "border-box", background: "#FAFAFA",
  };

  const thStyle = {
    padding: "10px 14px", textAlign: "left",
    fontWeight: 700, color: "#6B7280",
    fontSize: 11, textTransform: "uppercase",
    letterSpacing: 0.5, borderBottom: "2px solid #F3F4F6",
    whiteSpace: "nowrap", background: "#F9FAFB",
  };

  const tdStyle = {
    padding: "11px 14px", borderBottom: "1px solid #F3F4F6",
    verticalAlign: "middle",
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Biometric Devices</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
          Manage physical biometric devices assigned to schools.
        </p>
      </div>

      {/* Filter + Add button row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260 }}>
          <label style={label}>Filter by School</label>
          <select
            style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            disabled={schoolsLoading}
          >
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setForm({ schoolId: filterSchool, deviceName: "", deviceCode: "", serialNo: "" });
            setFormError("");
            setFormSuccess("");
            setShowForm((v) => !v);
          }}
          style={{
            padding: "10px 20px", background: "#4F46E5", color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14,
            cursor: "pointer",
          }}
        >
          + Add Device
        </button>
      </div>

      {/* Success toast (outside form) */}
      {formSuccess && !showForm && (
        <div style={{
          padding: "10px 16px", background: "#F0FDF4", color: "#166534",
          border: "1px solid #86EFAC", borderRadius: 8, marginBottom: 16,
          fontSize: 13, fontWeight: 500,
        }}>
          ✓ {formSuccess}
        </div>
      )}

      {/* Add Device Form */}
      {showForm && (
        <div style={{ ...card, borderColor: "#C7D2FE", background: "#FAFBFF" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Add New Device</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={label}>School <span style={{ color: "#EF4444" }}>*</span></label>
              <select
                style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
                value={form.schoolId}
                onChange={(e) => handleFormChange("schoolId", e.target.value)}
              >
                <option value="">— Select School —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={label}>Device Name</label>
              <input
                style={inputStyle}
                placeholder="e.g. Main Gate"
                value={form.deviceName}
                onChange={(e) => handleFormChange("deviceName", e.target.value)}
              />
            </div>

            <div>
              <label style={label}>Device Code <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                style={inputStyle}
                placeholder="e.g. D001"
                value={form.deviceCode}
                onChange={(e) => handleFormChange("deviceCode", e.target.value)}
              />
            </div>

            <div>
              <label style={label}>Serial No <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                style={inputStyle}
                placeholder="e.g. SN-001"
                value={form.serialNo}
                onChange={(e) => handleFormChange("serialNo", e.target.value)}
              />
            </div>
          </div>

          {formError && (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#DC2626", fontWeight: 500 }}>✕ {formError}</p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={handleAddDevice}
              disabled={submitting}
              style={{
                padding: "9px 22px", background: submitting ? "#C7D2FE" : "#4F46E5",
                color: "#fff", border: "none", borderRadius: 8,
                fontWeight: 700, fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {submitting && <Spinner size={14} color="#fff" />}
              {submitting ? "Saving…" : "Save Device"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: "9px 18px", background: "#F3F4F6",
                color: "#374151", border: "none", borderRadius: 8,
                fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Devices Table */}
      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Device Name", "Device Code", "Serial No", "School", "Status", "Added On", "Action"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 0" }}>
                    <Spinner size={20} />
                  </td>
                </tr>
              ) : tableError ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px 0", color: "#EF4444", fontSize: 13 }}>
                    {tableError}
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
                    No devices found. Add one above.
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id} style={{ opacity: d.isActive ? 1 : 0.55 }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{d.deviceName || <span style={{ color: "#D1D5DB" }}>—</span>}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{d.deviceCode}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: 13, color: "#374151" }}>{d.serialNo}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13 }}>{d.schoolName || d.school?.name || "—"}</span>
                      {d.schoolCode || d.school?.code ? (
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{d.schoolCode || d.school?.code}</div>
                      ) : null}
                    </td>
                    <td style={tdStyle}><StatusPill active={d.isActive} /></td>
                    <td style={{ ...tdStyle, color: "#6B7280", whiteSpace: "nowrap" }}>
                      {d.createdAt
                        ? new Date(d.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleToggle(d.id)}
                        disabled={toggling === d.id}
                        style={{
                          padding: "5px 12px",
                          background: d.isActive ? "#FFF1F2" : "#F0FDF4",
                          color:      d.isActive ? "#9F1239"  : "#166534",
                          border:     `1px solid ${d.isActive ? "#FECDD3" : "#86EFAC"}`,
                          borderRadius: 6, fontWeight: 600, fontSize: 12,
                          cursor: toggling === d.id ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        {toggling === d.id && <Spinner size={12} color={d.isActive ? "#9F1239" : "#166534"} />}
                        {d.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DevicesTab;