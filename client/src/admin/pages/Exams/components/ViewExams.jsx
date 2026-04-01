// client/src/admin/pages/exams/components/ViewExams.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList, X, Pencil, Globe, Lock, Calculator,
  Calendar, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { fetchSchedules, calculateResults, publishGroup, lockGroup } from "./examsApi";

const F = { fontFamily: "'Inter', sans-serif" };
const C = {
  dark:    "#243340",
  mid:     "#6A89A7",
  light:   "#BDDDFC",
  border:  "#C8DCF0",
  bg:      "#EDF3FA",
  card:    "#ffffff",
  hover:   "#EDF3FA",
  success: "#059669",
  warn:    "#d97706",
  danger:  "#dc2626",
};
const grad = "linear-gradient(135deg, #384959 0%, #6A89A7 100%)";

/* ── Helpers ── */
// Use local date parts to avoid UTC timezone shift
const parseLocalDate = (d) => {
  if (!d) return new Date();
  const s = (typeof d === "string" ? d : "").split("T")[0];
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
};

const fmtDate = (d) =>
  parseLocalDate(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtDay = (d) =>
  parseLocalDate(d).toLocaleDateString("en-IN", { weekday: "long" });

const fmtTime = (t) => {
  if (!t) return "";
  // If it's a plain time string like "09:00", "09:00:00", "14:30:00"
  // parse it directly to avoid UTC → local timezone shift
  const plainTime = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (plainTime) {
    let h = parseInt(plainTime[1], 10);
    const m = plainTime[2];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  }
  // Fallback for full ISO datetime strings
  return new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

/* ── Status Badge ── */
function StatusBadge({ group }) {
  if (group.isLocked)    return <Pill label="Locked"    color={C.danger}  bg="#fef2f2" />;
  if (group.isPublished) return <Pill label="Published" color={C.success} bg="#f0fdf4" />;
  return                        <Pill label="Draft"     color={C.warn}    bg="#fffbeb" />;
}
function Pill({ label, color, bg }) {
  return (
    <span style={{
      ...F, fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
      padding: "3px 10px", borderRadius: 20,
      background: bg, color, border: `1px solid ${color}33`,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

/* ── Action Button ── */
function ActionBtn({ icon: Icon, label, color, onClick, disabled, loading: btnLoading }) {
  return (
    <button onClick={onClick} disabled={disabled || btnLoading}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        background: color + "12", border: `1.5px solid ${color}44`,
        color, cursor: (disabled || btnLoading) ? "not-allowed" : "pointer",
        opacity: (disabled || btnLoading) ? 0.6 : 1,
        borderRadius: 10, padding: "7px 14px",
        fontSize: 12, fontWeight: 600, ...F,
      }}>
      {btnLoading ? <Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} /> : <Icon size={12} />}
      {label}
    </button>
  );
}

/* ── Main Modal ── */
export default function ViewExamsModal({ group, onClose, onEdit }) {
  const [schedules, setSchedules]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [localGroup, setLocalGroup] = useState(group);
  const [actionMap, setActionMap]   = useState({});
  const [actionMsg, setActionMsg]   = useState("");

  useEffect(() => {
    const h = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    if (!group?.id) return;
    setLoading(true);
    fetchSchedules(group.id)
      .then(data => setSchedules(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [group?.id]);

  const doAction = async (fn, key, label) => {
    setActionMap(p => ({ ...p, [key]: true }));
    setActionMsg("");
    try {
      const updated = await fn(localGroup.id);
      setLocalGroup(p => ({ ...p, ...updated }));
      setActionMsg(`${label} successful!`);
      setTimeout(() => setActionMsg(""), 3000);
    } catch (e) {
      setActionMsg(e.message || "Action failed");
    } finally {
      setActionMap(p => ({ ...p, [key]: false }));
    }
  };

  /* ── Build timetable data ── */
  // Unique classes (columns) — sorted by grade
  const classes = useMemo(() => {
    const seen = new Map();
    schedules.forEach(sc => {
      const id = sc.classSectionId;
      if (!seen.has(id)) {
        const grade   = sc.classSection?.grade   || "";
        const section = sc.classSection?.section || "";
        seen.set(id, { id, label: section ? `Grade ${grade} – ${section}` : `Grade ${grade}`, grade, section });
      }
    });
    return Array.from(seen.values()).sort((a, b) => {
      const na = parseInt(a.grade) || 0, nb = parseInt(b.grade) || 0;
      return na !== nb ? na - nb : a.section.localeCompare(b.section);
    });
  }, [schedules]);

  // Unique dates (rows) — sorted ascending
  const dates = useMemo(() => {
    const seen = new Set();
    schedules.forEach(sc => { if (sc.examDate) seen.add(sc.examDate.split("T")[0]); });
    return Array.from(seen).sort();
  }, [schedules]);

  // For each date: get distinct time-slot keys (startTime+endTime combo)
  // slot = { slotId: "HH:MM-HH:MM", startTime, endTime }
  const dateSlots = useMemo(() => {
    const map = {}; // date → [{slotId, startTime, endTime}]
    schedules.forEach(sc => {
      const date = sc.examDate?.split("T")[0];
      if (!date) return;
      if (!map[date]) map[date] = new Map();
      const st = sc.startTime || "";
      const et = sc.endTime   || "";
      const slotId = `${st}|${et}`;
      if (!map[date].has(slotId)) map[date].set(slotId, { slotId, startTime: st, endTime: et });
    });
    // convert to sorted array per date
    const result = {};
    Object.keys(map).forEach(date => {
      result[date] = Array.from(map[date].values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return result;
  }, [schedules]);

  // Lookup: date → slotId → classId → schedule
  const lookup = useMemo(() => {
    const map = {};
    schedules.forEach(sc => {
      const date   = sc.examDate?.split("T")[0];
      const st     = sc.startTime || "";
      const et     = sc.endTime   || "";
      const slotId = `${st}|${et}`;
      if (!date) return;
      if (!map[date]) map[date] = {};
      if (!map[date][slotId]) map[date][slotId] = {};
      map[date][slotId][sc.classSectionId] = sc;
    });
    return map;
  }, [schedules]);

  const totalSchedules = schedules.length;
  const uniqueSubjects = new Set(schedules.map(s => s.subjectId)).size;

  return (
    <>
      <style>{`
        @keyframes viewIn { from { opacity:0; transform:translate(-50%,-47%) scale(.97) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
        @keyframes spin   { to   { transform:rotate(360deg) } }
        .vm-scroll::-webkit-scrollbar       { width: 4px; height: 4px }
        .vm-scroll::-webkit-scrollbar-thumb { background: #BDDDFC; border-radius: 8px }
        .tt-cell { transition: background .12s; }
        .tt-cell:hover { background: #EFF6FD !important; }
      `}</style>

      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(20,30,45,0.5)", backdropFilter: "blur(4px)" }} />

      {/* Modal */}
      <div style={{
        position: "fixed", zIndex: 50, top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(92vw, 900px)", maxHeight: "92vh",
        background: "#fff", borderRadius: 22, display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 80px rgba(20,30,45,0.2), 0 4px 16px rgba(20,30,45,0.08)",
        animation: "viewIn 0.22s ease", ...F,
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1.5px solid #DDE9F5`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ClipboardList size={18} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ ...F, fontSize: 16, fontWeight: 700, color: C.dark }}>{localGroup.name}</span>
                <StatusBadge group={localGroup} />
              </div>
              <div style={{ ...F, fontSize: 12, color: C.mid, marginTop: 2 }}>
                {totalSchedules} schedule{totalSchedules !== 1 ? "s" : ""} &nbsp;·&nbsp; {uniqueSubjects} subject{uniqueSubjects !== 1 ? "s" : ""} &nbsp;·&nbsp; {classes.length} class{classes.length !== 1 ? "es" : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onEdit}
              style={{ display: "flex", alignItems: "center", gap: 6, background: grad, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", ...F }}>
              <Pencil size={12} /> Edit
            </button>
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: C.mid, display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = C.hover}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <X size={18} />
            </button>
          </div>
        </div>

        

        {/* ── Body ── */}
        <div className="vm-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12, color: C.mid, ...F }}>
              <Loader2 size={22} style={{ animation: "spin .8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading schedules…</span>
            </div>
          ) : schedules.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: C.mid, ...F }}>
              <Calendar size={30} style={{ opacity: .35 }} />
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: C.dark }}>No schedules added</p>
              <p style={{ fontSize: 12, margin: 0 }}>Click Edit to add exam schedules for subjects.</p>
            </div>
          ) : (
            <>
              {/* ── Timetable ── */}
              <div style={{ ...F, fontSize: 12, fontWeight: 600, color: C.mid, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Exam Timetable
              </div>

              <div className="vm-scroll" style={{ overflowX: "auto", borderRadius: 14, border: `1.5px solid ${C.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: classes.length * 160 + 160 }}>
                  <thead>
                    {/* Row 1: Class names */}
                    <tr style={{ background: C.dark }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", ...F, fontSize: 12, fontWeight: 700, color: "#fff", borderRight: `1px solid rgba(255,255,255,0.15)`, whiteSpace: "nowrap", minWidth: 150 }}>
                        Date &amp; Day
                      </th>
                      {classes.map(cls => (
                        <th key={cls.id} style={{ padding: "12px 16px", textAlign: "center", ...F, fontSize: 13, fontWeight: 700, color: "#fff", borderLeft: `1px solid rgba(255,255,255,0.15)`, whiteSpace: "nowrap" }}>
                          {cls.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {dates.map((date, rowIdx) => {
                      const slots = dateSlots[date] || [{ slotId: "|", startTime: "", endTime: "" }];
                      const isEven = rowIdx % 2 === 0;
                      const rowBg  = isEven ? "#fff" : "#fafcff";

                      return slots.map((slot, slotIdx) => {
                        const slotLookup = (lookup[date] || {})[slot.slotId] || {};
                        const isFirstSlot = slotIdx === 0;
                        const isLastSlot  = slotIdx === slots.length - 1;
                        const multiSlot   = slots.length > 1;

                        // Time label for this slot
                        const timeLabel = slot.startTime && slot.endTime
                          ? `${fmtTime(slot.startTime)} – ${fmtTime(slot.endTime)}`
                          : slot.startTime ? fmtTime(slot.startTime) : "";

                        return (
                          <tr key={`${date}_${slot.slotId}`} style={{ background: rowBg }}>
                            {/* Date cell — only on first slot row, spans all slot rows */}
                            {isFirstSlot && (
                              <td rowSpan={slots.length} style={{
                                padding: "14px 16px",
                                borderRight: `1px solid ${C.border}`,
                                borderTop: `1.5px solid ${C.border}`,
                                ...F, whiteSpace: "nowrap",
                                verticalAlign: "top",
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{fmtDate(date)}</div>
                                <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>{fmtDay(date)}</div>
                              </td>
                            )}

                            {/* Subject cells */}
                            {classes.map(cls => {
                              const sc = slotLookup[cls.id];
                              return (
                                <td key={cls.id} className="tt-cell" style={{
                                  padding: "10px 16px", textAlign: "center",
                                  borderLeft: `1px solid ${C.border}`,
                                  borderTop: isFirstSlot ? `1.5px solid ${C.border}` : `1px dashed ${C.border}`,
                                  background: rowBg,
                                  verticalAlign: "middle",
                                }}>
                                  {/* Time slot badge if multi-slot day */}
                                  {multiSlot && timeLabel && (
                                    <div style={{ ...F, fontSize: 10, fontWeight: 700, color: "#4A6FA5", background: "#EFF6FD", borderRadius: 6, padding: "2px 8px", display: "inline-block", marginBottom: 5 }}>
                                      {timeLabel}
                                    </div>
                                  )}
                                  {/* Single-slot: show time once in the cell if available */}
                                  {!multiSlot && timeLabel && (
                                    <div style={{ ...F, fontSize: 10, color: C.mid, marginBottom: 4 }}>{timeLabel}</div>
                                  )}
                                  {sc ? (
                                    <div>
                                      <div style={{ ...F, fontSize: 13, fontWeight: 700, color: C.dark }}>{sc.subject?.name || "—"}</div>
                                      {sc.maxMarks && (
                                        <div style={{ ...F, fontSize: 10, color: C.mid, marginTop: 3 }}>
                                          Max: {sc.maxMarks}{sc.passingMarks ? ` | Pass: ${sc.passingMarks}` : ""}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: C.light, fontSize: 16 }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Legend / Summary ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
                {[
                  { label: "Total Schedules", value: totalSchedules,   color: C.dark },
                  { label: "Subjects",        value: uniqueSubjects,    color: "#6366f1" },
                  { label: "Classes",         value: classes.length,    color: C.success },
                  { label: "Exam Days",       value: dates.length,      color: C.warn },
                ].map(s => (
                  <div key={s.label} style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 16px" }}>
                    <div style={{ ...F, fontSize: 11, color: C.mid, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    <div style={{ ...F, fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 24px", borderTop: `1.5px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ ...F, background: "#f0f5fb", border: "none", borderRadius: 10, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.mid }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}