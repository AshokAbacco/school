import { useState, useEffect } from "react";
import PageLayout from "../../components/PageLayout";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

// ─── Design tokens — matches ERP "Stormy Morning" palette ─────────────────────
const C = {
  dark:  "#384959",
  mid:   "#6A89A7",
  light: "#88BDF2",
  pale:  "#BDDDFC",
  bg:    "#EDF3FA",
  white: "#ffffff",
};

// ─── Category config ───────────────────────────────────────────────────────────
const CATEGORY = {
  ACADEMIC:   { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6", icon: "📘" },
  ATTENDANCE: { bg: "#F0FDF4", text: "#15803D", dot: "#22C55E", icon: "✅" },
  SPORTS:     { bg: "#FFF7ED", text: "#C2410C", dot: "#F97316", icon: "🏆" },
  CULTURAL:   { bg: "#FDF4FF", text: "#7E22CE", dot: "#A855F7", icon: "🎭" },
  DISCIPLINE: { bg: "#FFF1F2", text: "#BE123C", dot: "#F43F5E", icon: "🛡️" },
  LEADERSHIP: { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B", icon: "👑" },
  SPECIAL:    { bg: "#F0F9FF", text: "#0369A1", dot: "#0EA5E9", icon: "⭐" },
};

const CategoryBadge = ({ category }) => {
  const c = CATEGORY[category] ?? CATEGORY.SPECIAL;
  return (
    <span style={{
      background: c.bg, color: c.text,
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
      {category}
    </span>
  );
};

const Avatar = ({ name, image, size = 34 }) => {
  const initials = name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return image ? (
    <img src={image} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
      color: C.white, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {initials}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AwardsPage() {
  const [tab, setTab]                         = useState("assign");
  const [classData, setClassData]             = useState(null);
  const [awardTypes, setAwardTypes]           = useState([]);
  const [history, setHistory]                 = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAward, setSelectedAward]     = useState(null);
  const [remarks, setRemarks]                 = useState("");
  const [search, setSearch]                   = useState("");
  const [loading, setLoading]                 = useState(true);
  const [submitting, setSubmitting]           = useState(false);
  const [toast, setToast]                     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const [classRes, awardsRes] = await Promise.all([
          fetch(`${API_URL}/api/staff/awards/my-class`, { headers }),
          fetch(`${API_URL}/api/staff/awards/types`, { headers }),
        ]);
        const classJson  = await classRes.json();
        const awardsJson = await awardsRes.json();
        if (!classRes.ok)  throw new Error(classJson.message  ?? "Failed to load class");
        if (!awardsRes.ok) throw new Error(awardsJson.message ?? "Failed to load awards");
        setClassData(classJson.data ?? null);
        setAwardTypes(awardsJson.data ?? []);
      } catch (err) {
        showToast("error", err.message ?? "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/staff/awards/given-by-me`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      setHistory(json.data ?? []);
    } catch {
      showToast("error", "Could not load history");
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAssign = async () => {
    if (!selectedStudent || !selectedAward) {
      showToast("error", "Please select both a student and an award");
      return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch(`${API_URL}/api/staff/awards/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ studentId: selectedStudent.id, awardId: selectedAward.id, remarks: remarks.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to assign award");
      showToast("success", json.message ?? "Award assigned successfully!");
      setSelectedStudent(null); setSelectedAward(null); setRemarks(""); setSearch("");
    } catch (err) {
      showToast("error", err.message ?? "Failed to assign award");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = (classData?.students ?? []).filter(s =>
    `${s.name} ${s.rollNumber ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.pale}`, borderTopColor: C.mid, animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: C.mid, fontFamily: "'DM Sans', sans-serif" }}>Loading your class…</p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!classData) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🏫</p>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, fontFamily: "'DM Sans', sans-serif" }}>No class assigned</p>
        <p style={{ fontSize: 12, color: C.mid, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>You are not assigned as a class teacher for the current academic year</p>
      </div>
    </div>
  );

  const canSubmit = !submitting && !!selectedStudent && !!selectedAward;

  return (
    <PageLayout>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 18px", borderRadius: 12,
            background: toast.type === "success" ? "#F0FDF4" : "#FFF1F2",
            color: toast.type === "success" ? "#15803D" : "#BE123C",
            border: `1px solid ${toast.type === "success" ? "#BBF7D0" : "#FECDD3"}`,
            boxShadow: "0 4px 24px rgba(56,73,89,0.14)",
            fontSize: 13, fontWeight: 500,
            animation: "slideIn 0.2s ease",
          }}>
            <span style={{ fontSize: 15 }}>{toast.type === "success" ? "✓" : "✕"}</span>
            {toast.message}
          </div>
        )}

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

          {/* ── Header — matches ERP page header style ── */}
          <div style={{
            background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
            borderRadius: 16, padding: "22px 28px", marginBottom: 24,
            borderLeft: `4px solid ${C.light}`,
            boxShadow: "0 1px 4px rgba(56,73,89,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 11,
                background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, boxShadow: `0 4px 12px rgba(136,189,242,0.35)`,
                flexShrink: 0,
              }}>🏅</div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: C.dark, margin: 0, letterSpacing: -0.3 }}>Student Awards</h1>
                <p style={{ fontSize: 12, color: C.mid, margin: "3px 0 0" }}>
                  {classData?.classSection?.name ?? "—"}&nbsp;·&nbsp;{classData?.academicYear?.name ?? "—"}&nbsp;·&nbsp;{classData?.students?.length ?? 0} students
                </p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{
            display: "inline-flex", gap: 4,
            background: C.white, padding: 4, borderRadius: 12,
            marginBottom: 22,
            boxShadow: "0 1px 4px rgba(56,73,89,0.08)",
          }}>
            {[{ key: "assign", label: "Assign Award" }, { key: "history", label: "Given by Me" }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "8px 20px", borderRadius: 9, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
                background: tab === t.key ? `linear-gradient(135deg, ${C.light}, ${C.mid})` : "transparent",
                color: tab === t.key ? C.white : C.mid,
                boxShadow: tab === t.key ? `0 2px 8px rgba(136,189,242,0.4)` : "none",
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── TAB: ASSIGN ── */}
          {tab === "assign" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

              {/* Student picker */}
              <div style={{ background: C.white, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.pale}`, boxShadow: "0 1px 4px rgba(56,73,89,0.06)" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.bg}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>1. Select Student</p>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.mid }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search by name or roll no…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        width: "100%", padding: "8px 10px 8px 32px",
                        border: `1.5px solid ${C.pale}`, borderRadius: 9,
                        fontSize: 13, color: C.dark, outline: "none",
                        fontFamily: "'DM Sans', sans-serif",
                        background: C.bg, boxSizing: "border-box",
                      }}
                      onFocus={e => e.target.style.borderColor = C.light}
                      onBlur={e => e.target.style.borderColor = C.pale}
                    />
                  </div>
                </div>
                <div style={{ overflowY: "auto", maxHeight: 310 }}>
                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: C.mid }}>No students found</div>
                  ) : filteredStudents.map(s => {
                    const sel = selectedStudent?.id === s.id;
                    return (
                      <button key={s.id} onClick={() => setSelectedStudent(s)} style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 11,
                        padding: "10px 20px", border: "none", cursor: "pointer", textAlign: "left",
                        background: sel ? C.bg : C.white,
                        borderBottom: `1px solid ${C.bg}`,
                        borderLeft: `3px solid ${sel ? C.light : "transparent"}`,
                        transition: "all 0.1s", fontFamily: "'DM Sans', sans-serif",
                      }}
                        onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bg; }}
                        onMouseLeave={e => { if (!sel) e.currentTarget.style.background = C.white; }}
                      >
                        <Avatar name={s.name} image={s.profileImage} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: sel ? C.mid : C.dark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                          {s.rollNumber && <p style={{ fontSize: 11, color: C.mid, margin: "1px 0 0" }}>Roll #{s.rollNumber}</p>}
                        </div>
                        {sel && <span style={{ color: C.light, fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Award picker */}
                <div style={{ background: C.white, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.pale}`, boxShadow: "0 1px 4px rgba(56,73,89,0.06)" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.bg}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>2. Select Award</p>
                  </div>
                  <div style={{ overflowY: "auto", maxHeight: 228 }}>
                    {awardTypes.length === 0 ? (
                      <div style={{ padding: "24px 20px", textAlign: "center", fontSize: 13, color: C.mid }}>No award types configured yet</div>
                    ) : awardTypes.map(a => {
                      const sel = selectedAward?.id === a.id;
                      const cat = CATEGORY[a.category] ?? CATEGORY.SPECIAL;
                      return (
                        <button key={a.id} onClick={() => setSelectedAward(a)} style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 11,
                          padding: "10px 20px", border: "none", cursor: "pointer", textAlign: "left",
                          background: sel ? C.bg : C.white,
                          borderBottom: `1px solid ${C.bg}`,
                          borderLeft: `3px solid ${sel ? C.light : "transparent"}`,
                          transition: "all 0.1s", fontFamily: "'DM Sans', sans-serif",
                        }}
                          onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.bg; }}
                          onMouseLeave={e => { if (!sel) e.currentTarget.style.background = C.white; }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{cat.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: sel ? C.mid : C.dark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</p>
                            {a.description && <p style={{ fontSize: 11, color: C.mid, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</p>}
                          </div>
                          <CategoryBadge category={a.category} />
                          {sel && <span style={{ color: C.light, fontWeight: 700, marginLeft: 4 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Confirm */}
                <div style={{ background: C.white, borderRadius: 14, padding: "18px 20px", border: `1px solid ${C.pale}`, boxShadow: "0 1px 4px rgba(56,73,89,0.06)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>3. Confirm & Submit</p>

                  {/* Summary */}
                  <div style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
                    {[["Student", selectedStudent?.name], ["Award", selectedAward?.name]].map(([label, value]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.pale}` }}>
                        <span style={{ fontSize: 12, color: C.mid }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: value ? C.dark : C.pale }}>{value ?? "—"}</span>
                      </div>
                    ))}
                    {selectedAward && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
                        <span style={{ fontSize: 12, color: C.mid }}>Category</span>
                        <CategoryBadge category={selectedAward.category} />
                      </div>
                    )}
                  </div>

                  <textarea rows={2} placeholder="Remarks (optional)" value={remarks} onChange={e => setRemarks(e.target.value)} style={{
                    width: "100%", padding: "8px 12px",
                    border: `1.5px solid ${C.pale}`, borderRadius: 9,
                    fontSize: 13, color: C.dark, fontFamily: "'DM Sans', sans-serif",
                    resize: "none", outline: "none", boxSizing: "border-box",
                    marginBottom: 12, background: C.bg,
                  }}
                    onFocus={e => e.target.style.borderColor = C.light}
                    onBlur={e => e.target.style.borderColor = C.pale}
                  />

                  <button onClick={handleAssign} disabled={!canSubmit} style={{
                    width: "100%", padding: "11px", borderRadius: 10, border: "none",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                    background: canSubmit ? `linear-gradient(135deg, ${C.light}, ${C.mid})` : C.pale,
                    color: canSubmit ? C.white : C.mid,
                    boxShadow: canSubmit ? `0 4px 14px rgba(136,189,242,0.45)` : "none",
                    transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { if (canSubmit) e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {submitting ? "Assigning…" : "Assign Award"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: HISTORY ── */}
          {tab === "history" && (
            <div style={{ background: C.white, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.pale}`, boxShadow: "0 1px 4px rgba(56,73,89,0.06)" }}>
              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <p style={{ fontSize: 34, marginBottom: 10 }}>🏅</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, margin: 0 }}>No awards assigned yet</p>
                  <p style={{ fontSize: 12, color: C.mid, marginTop: 6 }}>Awards you assign will appear here</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Student", "Award", "Category", "Date", "Remarks"].map(h => (
                        <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: 0.8, textTransform: "uppercase", borderBottom: `1px solid ${C.pale}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} style={{ borderBottom: `1px solid ${C.bg}`, transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = C.bg}
                        onMouseLeave={e => e.currentTarget.style.background = C.white}
                      >
                        <td style={{ padding: "11px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={h.student?.name ?? ""} image={h.student?.personalInfo?.profileImage} size={30} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{h.student?.name ?? "—"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 20px", fontSize: 13, fontWeight: 500, color: C.dark }}>{h.award?.name ?? "—"}</td>
                        <td style={{ padding: "11px 20px" }}>{h.award?.category && <CategoryBadge category={h.award.category} />}</td>
                        <td style={{ padding: "11px 20px", fontSize: 12, color: C.mid }}>
                          {h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td style={{ padding: "11px 20px", fontSize: 12, color: C.mid, fontStyle: h.remarks ? "normal" : "italic" }}>{h.remarks ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </PageLayout>
  );
}