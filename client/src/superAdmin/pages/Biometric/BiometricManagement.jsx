import React, { useState, useEffect, useCallback } from "react";
import { Monitor, Users, Hand, AlertTriangle, UserX, Clock, Save, Building2 } from "lucide-react";
import DevicesTab  from "./DevicesTab";
import MappingsTab from "./MappingsTab";
import LogsTab     from "./LogsTab";

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/biometric`;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const getAuth = () => {
  try { return JSON.parse(localStorage.getItem("auth")) || {}; }
  catch { return {}; }
};

// "13:05" → "1:05 PM"
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const STATS_REFRESH_MS = 60 * 1000; // keeps "Today's Absent" current past the cut-off

const TABS = [
  { key: "devices",  label: "Devices" },
  { key: "mappings", label: "Enrollment Mapping" },
  { key: "logs",     label: "Punch Logs" },
];

const STAT_CARDS = [
  { key: "totalDevices",    label: "Total Devices",    Icon: Monitor,      color: "#4F46E5", bg: "#EEF2FF" },
  { key: "mappedUsers",     label: "Mapped Users",     Icon: Users,        color: "#059669", bg: "#ECFDF5" },
  { key: "todayPunches",    label: "Today's Punches",  Icon: Hand,         color: "#D97706", bg: "#FFFBEB" },
  { key: "todayAbsent",     label: "Today's Absent",   Icon: UserX,        color: "#DC2626", bg: "#FEF2F2" },
  // { key: "unmappedPunches", label: "Unmapped Punches", Icon: AlertTriangle, color: "#DC2626", bg: "#FEF2F2" },
];

export default function BiometricManagement() {
  const [activeTab,    setActiveTab]    = useState("devices");
  const [stats,        setStats]        = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── School scope (SUPER_ADMIN: any school / all; others: locked to own) ──
  const auth         = getAuth();
  const isSuperAdmin = auth.role === "SUPER_ADMIN";
  const ownSchoolId  = auth.user?.schoolId || auth.user?.school?.id || "";
  const [schools,  setSchools]  = useState([]);
  const [schoolId, setSchoolId] = useState(isSuperAdmin ? "" : ownSchoolId);

  // ── Absent-time setting ──
  const [setting,     setSetting]     = useState(null);
  const [absentInput, setAbsentInput] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [settingMsg,  setSettingMsg]  = useState(null); // { type: "ok"|"err", text }

  useEffect(() => {
    fetch(`${BASE}/schools`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => {
        const list = j.data || [];
        setSchools(isSuperAdmin || !ownSchoolId ? list : list.filter((s) => s.id === ownSchoolId));
      })
      .catch(() => setSchools([]));
  }, [isSuperAdmin, ownSchoolId]);

  const loadStats = useCallback((silent = false) => {
    if (!silent) setStatsLoading(true);
    const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
    return fetch(`${BASE}/stats${qs}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => setStats(j.data || null))
      .catch(() => { if (!silent) setStats(null); })
      .finally(() => { if (!silent) setStatsLoading(false); });
  }, [schoolId]);

  useEffect(() => {
    loadStats();
    const t = setInterval(() => loadStats(true), STATS_REFRESH_MS);
    return () => clearInterval(t);
  }, [loadStats]);

  useEffect(() => {
    setSettingMsg(null);
    if (!schoolId) { setSetting(null); setAbsentInput(""); return; }
    fetch(`${BASE}/settings?schoolId=${encodeURIComponent(schoolId)}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) setSettingMsg({ type: "err", text: j.message || "Could not load absent time setting" });
        setSetting(j.data || null);
        setAbsentInput(j.data?.absentTime || j.data?.effectiveAbsentTime || "");
      })
      .catch(() => setSetting(null));
  }, [schoolId]);

  const saveAbsentTime = async () => {
    if (!schoolId || !absentInput) return;
    setSaving(true); setSettingMsg(null);
    try {
      const r = await fetch(`${BASE}/settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ schoolId, absentTime: absentInput }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || "Failed to save");
      setSetting((s) => ({ ...(s || {}), absentTime: absentInput, isConfigured: true, effectiveAbsentTime: absentInput, effectiveSource: "CONFIGURED" }));
      setSettingMsg({ type: "ok", text: `Saved. Users (students, teachers, staff, admin) without a punch by ${fmtTime(absentInput)} will be counted absent.` });
      loadStats(true);
    } catch (e) {
      setSettingMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  // Value + caption for the "Today's Absent" card
  const absentCard = (() => {
    const a = stats?.absentSummary;
    if (!a) return { value: stats?.todayAbsent ?? 0, caption: "" };
    switch (a.status) {
      case "PENDING":
        return { value: "—", caption: a.absentTime ? `${a.mappedStudents} people · counted after ${fmtTime(a.absentTime)}` : "Before absent time" };
      case "HOLIDAY":
        return { value: 0, caption: a.reason ? `Closed today · ${a.reason}` : "Closed today" };
      case "ERROR":
        return { value: "—", caption: "Could not calculate (check server)" };
      case "NOT_CONFIGURED":
        return { value: "—", caption: "Absent time not set" };
      default:
        return {
          value: stats.todayAbsent ?? 0,
          caption: a.absentTime
            ? `${a.mappedStudents} − ${stats.todayPresent ?? 0} punched · by ${fmtTime(a.absentTime)}`
            : `${a.schoolsCounted} school(s) counted${a.schoolsPending ? ` · ${a.schoolsPending} pending` : ""}`,
        };
    }
  })();

  // e.g. "Students 2 · Teachers 1 · Staff 0" (absent per type, once counted)
  const TYPE_LABEL = { STUDENT: "Students", TEACHER: "Teachers", STAFF: "Staff", ADMIN: "Admin", FINANCE: "Finance" };
  const absentBreakdown = (() => {
    const bt = stats?.absentSummary?.byType;
    if (!bt || stats?.absentSummary?.status !== "ACTIVE") return "";
    return Object.entries(bt)
      .filter(([, v]) => v.absent !== null)
      .map(([t, v]) => `${TYPE_LABEL[t] || t} ${v.absent}`)
      .join(" · ");
  })();

  // Small "people" captions so the cards add up: absent = people mapped − people punched
  const peopleMapped  = stats?.absentSummary?.mappedStudents;
  const peoplePunched = stats?.todayPresent;
  const cardCaption = (key) => {
    if (key === "mappedUsers" && peopleMapped != null)
      return `${peopleMapped} people${peopleMapped !== stats?.mappedUsers ? " (some have 2 cards)" : ""}`;
    if (key === "todayPunches" && peoplePunched != null)
      return `by ${peoplePunched} people (in + out)`;
    return "";
  };

  const inputStyle = { height: 36, border: "1px solid #D1D5DB", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#fff", color: "#111827" };

  return (
    <div style={{ padding: "16px", fontFamily: "system-ui,-apple-system,sans-serif", color: "#111827", maxWidth: "100%", boxSizing: "border-box" }}>
      <style>{`
        @media (max-width: 640px) {
          .bm-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .bm-tab-bar button { padding: 10px 14px !important; font-size: 13px !important; }
          .bm-tab-content { padding: 14px !important; }
        }
        @media (max-width: 400px) {
          .bm-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .bm-stat-value { font-size: 20px !important; }
        }
      `}</style>

      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(18px,3vw,22px)", fontWeight: 800 }}>Biometric Management</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
          Manage devices, card assignments, and punch logs across all schools.
        </p>
      </div>

      {/* School scope + absent-time setting */}
      <div className="bm-settings" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200, flex: "1 1 220px" }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4, display: "flex", alignItems: "center", gap: 4 }}>
            <Building2 size={12} /> School
          </label>
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} disabled={!isSuperAdmin && !!ownSchoolId} style={inputStyle}>
            {isSuperAdmin && <option value="">All Schools</option>}
            {!isSuperAdmin && !ownSchoolId && <option value="">Select school</option>}
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "2 1 320px" }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={12} /> Mark users absent if no punch by
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="time" value={absentInput} onChange={(e) => { setAbsentInput(e.target.value); setSettingMsg(null); }} disabled={!schoolId || saving} style={{ ...inputStyle, width: 130 }} />
            <button onClick={saveAbsentTime} disabled={!schoolId || !absentInput || saving || absentInput === setting?.absentTime}
              style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 8, background: "#4F46E5", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: (!schoolId || !absentInput || saving || absentInput === setting?.absentTime) ? 0.5 : 1 }}>
              <Save size={14} /> {saving ? "Saving…" : "Save"}
            </button>
            <span style={{ fontSize: 12, color: "#6B7280" }}>
              {!schoolId
                ? "Select a school to set its absent time."
                : setting?.isConfigured
                  ? `Current: ${fmtTime(setting.absentTime)}${setting.schoolStartTime ? ` · school starts ${fmtTime(setting.schoolStartTime)}` : ""}`
                  : setting?.effectiveAbsentTime
                    ? `Not set — using default ${fmtTime(setting.effectiveAbsentTime)} (start + 3 hrs)`
                    : "Not set — no absent marking until configured."}
            </span>
          </div>
          {settingMsg && (
            <span style={{ fontSize: 12, color: settingMsg.type === "ok" ? "#059669" : "#DC2626" }}>{settingMsg.text}</span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="bm-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {STAT_CARDS.map(({ key, label, Icon, color, bg }) => (
          <div key={key} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</p>
              <p className="bm-stat-value" style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>
                {statsLoading
                  ? <span style={{ color: "#D1D5DB" }}>—</span>
                  : key === "todayAbsent" ? absentCard.value : (stats?.[key] ?? 0)}
              </p>
              {key !== "todayAbsent" && !statsLoading && cardCaption(key) && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={cardCaption(key)}>
                  {cardCaption(key)}
                </p>
              )}
              {key === "todayAbsent" && !statsLoading && absentCard.caption && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={absentCard.caption}>
                  {absentCard.caption}
                </p>
              )}
              {key === "todayAbsent" && !statsLoading && absentBreakdown && (
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={absentBreakdown}>
                  {absentBreakdown}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div className="bm-tab-bar" style={{ display: "flex", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", overflowX: "auto" }}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: "12px 22px", border: "none", borderBottom: active ? "2px solid #4F46E5" : "2px solid transparent", background: "transparent", color: active ? "#4F46E5" : "#6B7280", fontWeight: active ? 700 : 500, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1, flexShrink: 0 }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="bm-tab-content" style={{ padding: "20px 24px" }}>
          {activeTab === "devices"  && <DevicesTab  />}
          {activeTab === "mappings" && <MappingsTab isSuperAdmin={true} />}
          {activeTab === "logs"     && <LogsTab     />}
        </div>
      </div>
    </div>
  );
}