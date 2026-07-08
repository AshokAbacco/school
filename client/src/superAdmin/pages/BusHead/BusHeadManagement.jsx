// client/src/superAdmin/pages/BusHead/BusHeadManagement.jsx
import React, { useEffect, useState } from "react";
import { UserPlus, Bus, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export default function BusHeadManagement() {
  const [schools, setSchools] = useState([]);
  const [busHeads, setBusHeads] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    accessType: "SINGLE_SCHOOL",
    schoolId: "",
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const loadSchools = () => {
    fetch(`${API_URL}/api/biometric/schools`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data?.length) setSchools(d.data); })
      .catch(() => {});
  };

  const loadBusHeads = () => {
    setLoading(true);
    fetch(`${API_URL}/api/bus-heads`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setBusHeads(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchools();
    loadBusHeads();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name || !form.phone || !form.password) {
      setFormError("Please fill in name, mobile number and password");
      return;
    }
    if (form.accessType === "SINGLE_SCHOOL" && !form.schoolId) {
      setFormError("Please select a school");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/bus-heads`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setFormError(data.message || "Failed to create Bus Head");
        setCreating(false);
        return;
      }

      setForm({ name: "", phone: "", password: "", accessType: "SINGLE_SCHOOL", schoolId: "" });
      loadBusHeads();
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (busHead) => {
    await fetch(`${API_URL}/api/bus-heads/${busHead.id}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isActive: !busHead.isActive }),
    });
    loadBusHeads();
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid #E5E7EB",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 5 };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui,-apple-system,sans-serif", color: "#111827" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bus size={20} color="#4F46E5" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Bus Heads</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>
            Create Bus Head logins and control which schools' vehicles they can view.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 20, alignItems: "start" }}>
        {/* Create form */}
        <form onSubmit={handleCreate} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 20 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={16} color="#4F46E5" /> Create Bus Head
          </h2>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Kumar" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Mobile Number</label>
            <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Password</label>
            <input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a login password" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>School Access</label>
            <select
              style={{ ...inputStyle, cursor: "pointer", background: "#FAFAFA" }}
              value={form.accessType}
              onChange={(e) => setForm({ ...form, accessType: e.target.value, schoolId: "" })}
            >
              <option value="SINGLE_SCHOOL">Single School</option>
              <option value="ALL_SCHOOLS">All Schools (entire university)</option>
            </select>
          </div>

          {form.accessType === "SINGLE_SCHOOL" && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Select School</label>
              <select
                style={{ ...inputStyle, cursor: "pointer", background: "#FAFAFA" }}
                value={form.schoolId}
                onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
              >
                <option value="">— Choose a school —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          )}

          {formError && (
            <div style={{ background: "#FEF2F2", color: "#B91C1C", fontSize: 12.5, padding: "9px 12px", borderRadius: 8, marginBottom: 14 }}>
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: "#4F46E5", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}
          >
            {creating ? "Creating…" : "Create Bus Head"}
          </button>
        </form>

        {/* List */}
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #E5E7EB" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>All Bus Heads</h2>
            <button onClick={loadBusHeads} style={{ background: "none", border: "none", cursor: "pointer", color: "#4F46E5", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {busHeads.length === 0 ? (
            <div style={{ padding: "36px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13.5 }}>
              No Bus Heads created yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", textAlign: "left" }}>
                    <th style={{ padding: "10px 16px", fontWeight: 700, color: "#6B7280" }}>Name</th>
                    <th style={{ padding: "10px 16px", fontWeight: 700, color: "#6B7280" }}>Phone</th>
                    <th style={{ padding: "10px 16px", fontWeight: 700, color: "#6B7280" }}>Access</th>
                    <th style={{ padding: "10px 16px", fontWeight: 700, color: "#6B7280" }}>Status</th>
                    <th style={{ padding: "10px 16px", fontWeight: 700, color: "#6B7280" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {busHeads.map((b) => (
                    <tr key={b.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>{b.name}</td>
                      <td style={{ padding: "10px 16px", color: "#6B7280" }}>{b.phone}</td>
                      <td style={{ padding: "10px 16px" }}>
                        {b.accessType === "ALL_SCHOOLS" ? "All Schools" : (b.school?.name || "—")}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        {b.isActive ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#166534", background: "#F0FDF4", padding: "3px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 700 }}>
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#6B7280", background: "#F9FAFB", padding: "3px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 700 }}>
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <button
                          onClick={() => handleToggleStatus(b)}
                          style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 9px", fontSize: 11.5, fontWeight: 600, color: b.isActive ? "#B91C1C" : "#166534", cursor: "pointer" }}
                        >
                          {b.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}