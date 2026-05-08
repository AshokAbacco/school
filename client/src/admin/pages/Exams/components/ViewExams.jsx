// client/src/admin/pages/exams/components/ViewExams.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ClipboardList, X, Pencil, Globe, Lock, Calculator,
  Calendar, Loader2, CheckCircle2, AlertCircle, MessageCircle,
} from "lucide-react";
import {
  fetchSchedulesAdmin,
  calculateResults,
  publishGroup,
  lockGroup,
} from "./examsApi";
import { getToken } from "../../../../auth/storage";

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
  blue:    "#3b82f6",
};
const grad = "linear-gradient(135deg, #384959 0%, #6A89A7 100%)";

/* ── Helpers ── */
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
  // Handle "HH:MM" or "HH:MM:SS" plain time strings (no timezone shift)
  const plainTime = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (plainTime) {
    let h = parseInt(plainTime[1], 10);
    const m = plainTime[2];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  }
  return new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

/* ── Status Badge ── */
function StatusBadge({ group }) {
  if (group.isLocked)    return <Pill label="Completed" color={C.success} bg="#f0fdf4" />;
  if (group.isPublished) return <Pill label="Scheduled" color={C.blue}   bg="#eff6ff" />;
  return                        <Pill label="Draft"     color={C.warn}   bg="#fffbeb" />;
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
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!disabled && !btnLoading) e.currentTarget.style.background = color + "22"; }}
      onMouseLeave={e => { e.currentTarget.style.background = color + "12"; }}>
      {btnLoading
        ? <Loader2 size={12} style={{ animation: "spin .8s linear infinite" }} />
        : <Icon size={12} />}
      {label}
    </button>
  );
}

/* ── Main Modal ── */
export default function ViewExamsModal({ group, onClose, onEdit }) {
  const [schedules, setSchedules]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [localGroup, setLocalGroup] = useState(group);
  const [actionMap, setActionMap]   = useState({});
  const [actionMsg, setActionMsg]   = useState("");

  const [timetableSent, setTimetableSent] = useState(
    group?.timetableSent || false
  );

  // Progress counter state while sending
  const [sendProgress, setSendProgress] = useState(null); // null = not sending; { sent, total } when active
  const sendProgressRef = useRef(null);

  const sendTimetableToParents = async () => {
    try {
      // ✅ Prevent resend
      if (timetableSent) return;

      setActionMap((p) => ({ ...p, whatsapp: true }));
      setActionMsg("");

      // ── Estimate total parents from schedules (unique classSections × avg parents) ──
      // We don't know the exact count before the call, so we animate an indeterminate counter
      // that increments every ~800 ms until the real totalSent comes back.
      const uniqueClasses = new Set(schedules.map((s) => s.classSectionId)).size;
      const estimatedTotal = Math.max(uniqueClasses * 3, 5); // rough estimate
      let fakeCount = 0;

      setSendProgress({ sent: 0, total: estimatedTotal, estimated: true });

      sendProgressRef.current = setInterval(() => {
        fakeCount += 1;
        setSendProgress((p) =>
          p ? { ...p, sent: Math.min(fakeCount, p.total - 1) } : p
        );
      }, 750);

      const token = getToken();

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/exam-timetable-whatsapp/send/${localGroup.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await res.text();

      console.log("SERVER RESPONSE:", text);

      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text);
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
          data.message ||
          "Failed to send timetable"
        );
      }

      // ── Show real final count briefly, then lock ──
      const realTotal = data.totalSent || 0;
      setSendProgress({ sent: realTotal, total: realTotal, estimated: false });

      // ✅ Disable button after successful send
      setTimetableSent(true);

      setActionMsg(`✅ Exam timetable sent to ${realTotal} parent${realTotal !== 1 ? "s" : ""}`);

    } catch (err) {
      setActionMsg(err.message || "Failed to send timetable");
    } finally {
      // Stop the progress ticker
      if (sendProgressRef.current) {
        clearInterval(sendProgressRef.current);
        sendProgressRef.current = null;
      }
      setTimeout(() => setSendProgress(null), 1800);
      setActionMap((p) => ({ ...p, whatsapp: false }));
    }
  };
  /* ── Escape key ── */
  useEffect(() => {
    const h = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  /* ── Sync group prop changes ── */
  useEffect(() => {
    setLocalGroup(group);
    setTimetableSent(group?.timetableSent || false);
  }, [group]);

  /* ── Fetch schedules using ADMIN route (no classSectionId filter) ── */
  useEffect(() => {
    if (!group?.id) return;
    setLoading(true);
    setError("");
    fetchSchedulesAdmin(group.id)
      .then(data => setSchedules(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error("fetchSchedulesAdmin error:", err);
        setError(err.message || "Failed to load schedules");
        setSchedules([]);
      })
      .finally(() => setLoading(false));
  }, [group?.id]);

  /* ── Action handler ── */
  const doAction = async (fn, key, label) => {
    setActionMap(p => ({ ...p, [key]: true }));
    setActionMsg("");
    try {
      const updated = await fn(localGroup.id);
      setLocalGroup(p => ({ ...p, ...updated }));
      setActionMsg(`${label} successful!`);
      setTimeout(() => setActionMsg(""), 3500);
    } catch (e) {
      setActionMsg(e.message || "Action failed");
    } finally {
      setActionMap(p => ({ ...p, [key]: false }));
    }
  };

  /* ── Build timetable: unique classes (columns) ── */
  const classes = useMemo(() => {
    const seen = new Map();
    schedules.forEach(sc => {
      const id = sc.classSectionId;
      if (!seen.has(id)) {
        const grade   = sc.classSection?.grade   || "";
        const section = sc.classSection?.section || "";
        seen.set(id, {
          id,
          label: section ? `Grade ${grade} – ${section}` : `Grade ${grade}`,
          grade,
          section,
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => {
      const na = parseInt(a.grade) || 0, nb = parseInt(b.grade) || 0;
      return na !== nb ? na - nb : (a.section || "").localeCompare(b.section || "");
    });
  }, [schedules]);

  /* ── Unique dates (rows) ── */
  const dates = useMemo(() => {
    const seen = new Set();
    schedules.forEach(sc => {
      if (sc.examDate) seen.add(sc.examDate.split("T")[0]);
    });
    return Array.from(seen).sort();
  }, [schedules]);

  /* ── Per-date: distinct time-slot combos ── */
  const dateSlots = useMemo(() => {
    const map = {};
    schedules.forEach(sc => {
      const date = sc.examDate?.split("T")[0];
      if (!date) return;
      if (!map[date]) map[date] = new Map();
      // startTime / endTime are already "HH:MM" strings after backend normalization
      const st = (sc.startTime || "").substring(0, 5);
      const et = (sc.endTime   || "").substring(0, 5);
      const slotId = `${st}|${et}`;
      if (!map[date].has(slotId)) {
        map[date].set(slotId, { slotId, startTime: st, endTime: et });
      }
    });
    const result = {};
    Object.keys(map).forEach(date => {
      result[date] = Array.from(map[date].values()).sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
    });
    return result;
  }, [schedules]);

  /* ── Lookup: date → slotId → classId → schedule ── */
  const lookup = useMemo(() => {
    const map = {};
    schedules.forEach(sc => {
      const date   = sc.examDate?.split("T")[0];
      const st     = (sc.startTime || "").substring(0, 5);
      const et     = (sc.endTime   || "").substring(0, 5);
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
        @keyframes viewIn  { from { opacity:0; transform:translate(-50%,-47%) scale(.97) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
        @keyframes spin    { to   { transform:rotate(360deg) } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        .vm-scroll::-webkit-scrollbar       { width: 4px; height: 4px }
        .vm-scroll::-webkit-scrollbar-thumb { background: #BDDDFC; border-radius: 8px }
        .tt-cell { transition: background .12s; }
        .tt-cell:hover { background: #EFF6FD !important; }
      `}</style>

      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(20,30,45,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", zIndex: 50, top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(96vw, 960px)", maxHeight: "93vh",
        background: "#fff", borderRadius: 22, display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 80px rgba(20,30,45,0.2), 0 4px 16px rgba(20,30,45,0.08)",
        animation: "viewIn 0.22s ease", ...F,
      }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: `1.5px solid #DDE9F5`,
          background: `linear-gradient(135deg, #243340, #384959)`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              background: "rgba(59,130,246,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ClipboardList size={18} color="#93c5fd" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ ...F, fontSize: 16, fontWeight: 700, color: "#fff" }}>{localGroup.name}</span>
                <StatusBadge group={localGroup} />
              </div>
              <div style={{ ...F, fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                {totalSchedules} schedule{totalSchedules !== 1 ? "s" : ""} &nbsp;·&nbsp;
                {uniqueSubjects} subject{uniqueSubjects !== 1 ? "s" : ""} &nbsp;·&nbsp;
                {classes.length} class{classes.length !== 1 ? "es" : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onEdit}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.15)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10,
                padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", ...F,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}>
              <Pencil size={12} /> Edit
            </button>
            <button onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(255,255,255,0.08)", border: "none",
                cursor: "pointer", color: "rgba(255,255,255,0.7)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
          padding: "12px 24px", borderBottom: `1px solid ${C.border}`,
          background: C.bg, flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Calculate Results */}
            <ActionBtn
              icon={Calculator}
              label="Calculate Results"
              color={C.mid}
              loading={actionMap.calc}
              disabled={localGroup.isLocked}
              onClick={() => doAction(calculateResults, "calc", "Results calculated")}
            />

            {/* Mark as Completed — shown when exam is scheduled (published) but not yet locked */}
            {localGroup.isPublished && !localGroup.isLocked && (
              <ActionBtn
                icon={CheckCircle2}
                label="Mark as Completed"
                color={C.success}
                loading={actionMap.lock}
                onClick={() => doAction(lockGroup, "lock", "Marked as completed")}
              />
            )}

            {/* Schedule (Publish) — shown when still in draft */}
            {!localGroup.isPublished && (
              <ActionBtn
                icon={Globe}
                label="Publish"
                color={C.blue}
                loading={actionMap.pub}
                onClick={() => doAction(publishGroup, "pub", "Published")}
              />
            )}
            {/* Send Timetable button + live progress */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ActionBtn
                icon={timetableSent ? CheckCircle2 : MessageCircle}
                label={timetableSent ? "Timetable Sent ✓" : "Send Timetable"}
                color={timetableSent ? "#6b7280" : "#16a34a"}
                loading={actionMap.whatsapp}
                disabled={schedules.length === 0 || timetableSent}
                onClick={sendTimetableToParents}
              />

              {/* ── Live progress counter (shown while sending) ── */}
              {sendProgress && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#f0fdf4", border: "1.5px solid #86efac",
                  borderRadius: 10, padding: "5px 12px",
                  fontSize: 12, fontWeight: 700, color: "#16a34a", ...F,
                  animation: "fadeIn 0.2s ease",
                }}>
                  <Loader2 size={12} style={{ animation: "spin .8s linear infinite", flexShrink: 0 }} />
                  <span>
                    Sending&nbsp;
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{sendProgress.sent}</span>
                    {sendProgress.estimated ? "+" : ` / ${sendProgress.total}`}
                    &nbsp;parent{sendProgress.total !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status / feedback message */}
          {actionMsg && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, ...F,
              color: actionMsg.toLowerCase().includes("fail") ? C.danger : C.success,
            }}>
              {actionMsg.toLowerCase().includes("fail")
                ? <AlertCircle size={13} />
                : <CheckCircle2 size={13} />}
              {actionMsg}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="vm-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "80px 0", gap: 12, color: C.mid, ...F,
            }}>
              <Loader2 size={24} style={{ animation: "spin .8s linear infinite" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Loading schedules…</span>
            </div>
          ) : error ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "80px 0", gap: 10, color: C.danger, ...F,
            }}>
              <AlertCircle size={28} style={{ opacity: 0.6 }} />
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Failed to load schedules</p>
              <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>{error}</p>
            </div>
          ) : schedules.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "80px 0", gap: 10, color: C.mid, ...F,
            }}>
              <Calendar size={32} style={{ opacity: .3 }} />
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.dark }}>No schedules added yet</p>
              <p style={{ fontSize: 12, margin: 0 }}>Click <strong>Edit</strong> to add exam schedules for subjects.</p>
            </div>
          ) : (
            <>
              {/* ── Timetable Section Header ── */}
              <div style={{
                ...F, fontSize: 11, fontWeight: 700, color: C.mid,
                marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em",
              }}>
                Exam Timetable
              </div>

              {/* ── Timetable Table ── */}
              <div className="vm-scroll" style={{
                overflowX: "auto", borderRadius: 14,
                border: `1.5px solid ${C.border}`,
                boxShadow: "0 2px 8px rgba(36,51,64,0.06)",
              }}>
                <table style={{
                  width: "100%", borderCollapse: "collapse",
                  minWidth: Math.max(classes.length * 160 + 180, 400),
                }}>
                  <thead>
                    <tr style={{ background: C.dark }}>
                      <th style={{
                        padding: "13px 18px", textAlign: "left",
                        ...F, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        borderRight: `1px solid rgba(255,255,255,0.12)`,
                        whiteSpace: "nowrap", minWidth: 160,
                      }}>
                        Date &amp; Day
                      </th>
                      {classes.map(cls => (
                        <th key={cls.id} style={{
                          padding: "13px 18px", textAlign: "center",
                          ...F, fontSize: 12, fontWeight: 700, color: "#fff",
                          borderLeft: `1px solid rgba(255,255,255,0.12)`,
                          whiteSpace: "nowrap",
                        }}>
                          {cls.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {dates.map((date, rowIdx) => {
                      const slots = dateSlots[date] || [{ slotId: "|", startTime: "", endTime: "" }];
                      const isEven  = rowIdx % 2 === 0;
                      const rowBg   = isEven ? "#fff" : "#fafcff";

                      return slots.map((slot, slotIdx) => {
                        const slotLookup  = (lookup[date] || {})[slot.slotId] || {};
                        const isFirstSlot = slotIdx === 0;
                        const multiSlot   = slots.length > 1;

                        const timeLabel = slot.startTime && slot.endTime
                          ? `${fmtTime(slot.startTime)} – ${fmtTime(slot.endTime)}`
                          : slot.startTime ? fmtTime(slot.startTime) : "";

                        return (
                          <tr key={`${date}_${slot.slotId}`} style={{ background: rowBg }}>

                            {/* Date cell — only on first slot row */}
                            {isFirstSlot && (
                              <td rowSpan={slots.length} style={{
                                padding: "14px 18px",
                                borderRight: `1px solid ${C.border}`,
                                borderTop: `1.5px solid ${C.border}`,
                                ...F, whiteSpace: "nowrap", verticalAlign: "top",
                                background: rowBg,
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
                                  {fmtDate(date)}
                                </div>
                                <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>
                                  {fmtDay(date)}
                                </div>
                                {/* Show time if single slot day */}
                                {!multiSlot && timeLabel && (
                                  <div style={{
                                    marginTop: 5, fontSize: 10, fontWeight: 600,
                                    color: C.blue, background: "#eff6ff",
                                    borderRadius: 5, padding: "2px 7px",
                                    display: "inline-block",
                                  }}>
                                    {timeLabel}
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Subject cells per class */}
                            {classes.map(cls => {
                              const sc = slotLookup[cls.id];
                              return (
                                <td key={cls.id} className="tt-cell" style={{
                                  padding: "10px 16px", textAlign: "center",
                                  borderLeft: `1px solid ${C.border}`,
                                  borderTop: isFirstSlot
                                    ? `1.5px solid ${C.border}`
                                    : `1px dashed ${C.border}`,
                                  background: rowBg,
                                  verticalAlign: "middle",
                                }}>
                                  {/* Time badge for multi-slot days */}
                                  {multiSlot && timeLabel && (
                                    <div style={{
                                      ...F, fontSize: 10, fontWeight: 700,
                                      color: C.blue, background: "#eff6ff",
                                      borderRadius: 6, padding: "2px 8px",
                                      display: "inline-block", marginBottom: 5,
                                    }}>
                                      {timeLabel}
                                    </div>
                                  )}
                                  {sc ? (
                                    <div>
                                      <div style={{ ...F, fontSize: 13, fontWeight: 700, color: C.dark }}>
                                        {sc.subject?.name || "—"}
                                      </div>
                                      {sc.maxMarks != null && (
                                        <div style={{ ...F, fontSize: 10, color: C.mid, marginTop: 3 }}>
                                          Max: {sc.maxMarks}
                                          {sc.passingMarks != null ? ` | Pass: ${sc.passingMarks}` : ""}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: C.light, fontSize: 18 }}>—</span>
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

              {/* ── Summary Cards ── */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10, marginTop: 18,
              }}>
                {[
                  { label: "Total Schedules", value: totalSchedules,  color: C.dark },
                  { label: "Subjects",        value: uniqueSubjects,   color: "#6366f1" },
                  { label: "Classes",         value: classes.length,   color: C.success },
                  { label: "Exam Days",       value: dates.length,     color: C.warn },
                ].map(s => (
                  <div key={s.label} style={{
                    background: C.bg, border: `1.5px solid ${C.border}`,
                    borderRadius: 12, padding: "12px 16px",
                  }}>
                    <div style={{ ...F, fontSize: 10, color: C.mid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {s.label}
                    </div>
                    <div style={{ ...F, fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", justifyContent: "flex-end",
          padding: "14px 24px", borderTop: `1.5px solid ${C.border}`,
          background: "#fafcff", flexShrink: 0,
        }}>
          <button onClick={onClose}
            style={{
              ...F, background: "#f0f5fb", border: `1.5px solid ${C.border}`,
              borderRadius: 10, padding: "9px 22px",
              fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.mid,
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.bg}
            onMouseLeave={e => e.currentTarget.style.background = "#f0f5fb"}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}