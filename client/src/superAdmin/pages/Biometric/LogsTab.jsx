import React, { useState, useEffect } from "react";

/**
 * LogsTab
 * -------
 * View all BiometricLog punch records with filters:
 *   - School
 *   - Date range
 *   - Person type
 *   - Mapped / Unmapped
 *
 * API endpoints used:
 *   GET /api/biometric/schools
 *   GET /api/biometric/logs?schoolId=&from=&to=&personType=&mapped=&page=&limit=
 */

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/biometric`;

const PERSON_TYPES = ["STUDENT", "TEACHER", "STAFF", "ADMIN", "FINANCE"];

const PT_LABEL = {
  STUDENT: "Student", TEACHER: "Teacher", STAFF: "Staff",
  ADMIN: "School Admin", FINANCE: "Finance Admin",
};

const PT_COLOR = {
  STUDENT: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  TEACHER: { bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
  STAFF:   { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" },
  ADMIN:   { bg: "#FDF4FF", text: "#7E22CE", border: "#E9D5FF" },
  FINANCE: { bg: "#FFF1F2", text: "#9F1239", border: "#FECDD3" },
};

const PAGE_SIZE = 20;

// ─── Auth ─────────────────────────────────────────────────────────────────────
const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch(url) {
  const res  = await fetch(url, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json;   // return full envelope (data + meta)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ size = 16, color = "#4F46E5" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${color}30`, borderTop: `2px solid ${color}`,
      borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

function Badge({ type }) {
  if (!type) return <span style={{ color: "#D1D5DB", fontSize: 12 }}>—</span>;
  const c = PT_COLOR[type] || { bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" };
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {PT_LABEL[type] || type}
    </span>
  );
}

function MappedPill({ mapped }) {
  return (
    <span style={{
      background: mapped ? "#F0FDF4" : "#FFF7ED",
      color:      mapped ? "#166534" : "#92400E",
      border:     `1px solid ${mapped ? "#86EFAC" : "#FCD34D"}`,
      padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
    }}>
      {mapped ? "Mapped" : "Unmapped"}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const LogsTab = () => {
  // schools
  const [schools,        setSchools]        = useState([]);
  const [filterSchool,   setFilterSchool]   = useState("");

  // filters
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate,     setFromDate]     = useState(today);
  const [toDate,       setToDate]       = useState(today);
  const [filterType,   setFilterType]   = useState("ALL");
  const [filterMapped, setFilterMapped] = useState("ALL"); // ALL | MAPPED | UNMAPPED

  // data
  const [logs,         setLogs]         = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  // expanded raw data row
  const [expandedRow,  setExpandedRow]  = useState(null);

  // load schools once
  useEffect(() => {
    apiFetch(`${BASE}/schools`)
      .then((j) => setSchools(j.data || []))
      .catch(() => {});
  }, []);

  // load logs on filter/page change
  useEffect(() => {
    loadLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSchool, fromDate, toDate, filterType, filterMapped, page]);

  function loadLogs() {
    setLoading(true); setError("");
    const p = new URLSearchParams({ page, limit: PAGE_SIZE });
    if (filterSchool) p.set("schoolId",  filterSchool);
    if (fromDate)     p.set("from",      fromDate);
    if (toDate)       p.set("to",        toDate);
    if (filterType   !== "ALL") p.set("personType", filterType);
    if (filterMapped === "MAPPED")   p.set("mapped", "true");
    if (filterMapped === "UNMAPPED") p.set("mapped", "false");

    apiFetch(`${BASE}/logs?${p}`)
      .then((j) => {
        setLogs(j.data || []);
        setTotalCount(j.meta?.total || 0);
      })
      .catch((e) => setError(e.message || "Failed to load logs"))
      .finally(() => setLoading(false));
  }

  function handleFilterChange(setter) {
    return (e) => { setter(e.target.value); setPage(1); };
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ─── Styles ───────────────────────────────────────────────────────────────

  const card = { background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 24px", marginBottom: 20 };
  const label = { display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 };
  const inputStyle = { width: "100%", padding: "8px 11px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box", background: "#FAFAFA" };
  const selectStyle = { ...inputStyle, cursor: "pointer", appearance: "auto" };
  const thStyle = { padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#6B7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #F3F4F6", whiteSpace: "nowrap", background: "#F9FAFB" };
  const tdStyle = { padding: "11px 14px", borderBottom: "1px solid #F3F4F6", verticalAlign: "middle" };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Punch Logs</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
          Raw biometric punch records. Unmapped punches are stored but person is unknown.
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "12px 16px", alignItems: "end" }}>

          <div>
            <label style={label}>School</label>
            <select style={selectStyle} value={filterSchool} onChange={handleFilterChange(setFilterSchool)}>
              <option value="">All Schools</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>

          <div>
            <label style={label}>From</label>
            <input type="date" style={inputStyle} value={fromDate} onChange={handleFilterChange(setFromDate)} />
          </div>

          <div>
            <label style={label}>To</label>
            <input type="date" style={inputStyle} value={toDate} onChange={handleFilterChange(setToDate)} />
          </div>

          <div>
            <label style={label}>Person Type</label>
            <select style={selectStyle} value={filterType} onChange={handleFilterChange(setFilterType)}>
              <option value="ALL">All Types</option>
              {PERSON_TYPES.map((pt) => <option key={pt} value={pt}>{PT_LABEL[pt]}</option>)}
            </select>
          </div>

          <div>
            <label style={label}>Mapping</label>
            <select style={selectStyle} value={filterMapped} onChange={handleFilterChange(setFilterMapped)}>
              <option value="ALL">All</option>
              <option value="MAPPED">Mapped</option>
              <option value="UNMAPPED">Unmapped</option>
            </select>
          </div>

        </div>

        {/* Count summary */}
        <div style={{ marginTop: 12, fontSize: 13, color: "#6B7280" }}>
          {loading
            ? "Loading…"
            : <><span style={{ fontWeight: 700, color: "#111827" }}>{totalCount.toLocaleString("en-IN")}</span> punch records found</>
          }
        </div>
      </div>

      {/* ── Table ── */}
      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Date & Time", "Person", "Type", "Enrollment ID", "Device", "Punch Mode", "Mapping", "Raw"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0" }}><Spinner size={20} /></td></tr>
              ) : error ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px 0", color: "#EF4444", fontSize: 13 }}>{error}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>No punch records found for the selected filters.</td></tr>
              ) : logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr style={{ background: log.biometricUserMappingId ? "transparent" : "#FFFBEB" }}>

                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {log.punchDateTime
                          ? new Date(log.punchDateTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>
                        {log.punchDateTime
                          ? new Date(log.punchDateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                          : ""}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      {log.personName
                        ? <>
                            <div style={{ fontWeight: 600 }}>{log.personName}</div>
                            {log.personCode && <div style={{ fontSize: 11, color: "#9CA3AF" }}>{log.personCode}</div>}
                          </>
                        : <span style={{ color: "#D1D5DB", fontSize: 12 }}>Unknown</span>
                      }
                    </td>

                    <td style={tdStyle}><Badge type={log.personType} /></td>

                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>
                        {log.rawData?.enrollmentId || log.rawData?.EnrollmentId || log.rawData?.EnrollmentID || "—"}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <div style={{ fontSize: 13 }}>{log.deviceName || <span style={{ color: "#D1D5DB" }}>—</span>}</div>
                      {log.deviceCode && <div style={{ fontSize: 11, color: "#9CA3AF" }}>{log.deviceCode}</div>}
                    </td>

                    <td style={tdStyle}>
                      <span style={{ background: "#F3F4F6", color: "#374151", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        {log.punchMode || "—"}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <MappedPill mapped={!!log.biometricUserMappingId} />
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        style={{ padding: "4px 10px", background: "#F3F4F6", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#374151", cursor: "pointer" }}
                      >
                        {expandedRow === log.id ? "Hide" : "View"}
                      </button>
                    </td>

                  </tr>

                  {/* Raw data expanded row */}
                  {expandedRow === log.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: "0 14px 14px", background: "#F9FAFB" }}>
                        <pre style={{
                          margin: 0, padding: "12px 16px",
                          background: "#1E1E2E", color: "#CDD6F4",
                          borderRadius: 8, fontSize: 12, lineHeight: 1.6,
                          overflowX: "auto",
                        }}>
                          {JSON.stringify(log.rawData, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              Page <b>{page}</b> of <b>{totalPages}</b> &nbsp;·&nbsp; {totalCount.toLocaleString("en-IN")} records
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #E5E7EB", background: page === 1 ? "#F9FAFB" : "#fff", color: page === 1 ? "#D1D5DB" : "#374151", fontWeight: 600, fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer" }}
              >← Prev</button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #E5E7EB", background: page === totalPages ? "#F9FAFB" : "#fff", color: page === totalPages ? "#D1D5DB" : "#374151", fontWeight: 600, fontSize: 13, cursor: page === totalPages ? "not-allowed" : "pointer" }}
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTab;