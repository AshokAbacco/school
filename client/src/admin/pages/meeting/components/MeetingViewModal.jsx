// client/src/admin/pages/meeting/components/MeetingViewModal.jsx
import React, { useState } from "react";
import {
  X, CalendarDays, Clock4, MapPin, Link2, Users, BookOpen,
  User, CheckCircle2, Circle, Loader2, Bell, Star, FileText,
  Save, Wifi, Building2, MicVocal, HelpCircle,
} from "lucide-react";
import {
  markParticipantAttendance, markStudentAttendance,
  sendMeetingReminder, updateMeetingStatus, updateMeetingNotes,
  fetchMeetingById,
} from "../api/meetingsApi";

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2",
  deep: "#384959", bg: "#EDF3FA", white: "#FFFFFF",
  border: "#C8DCF0", borderLight: "#DDE9F5", text: "#243340", textLight: "#6A89A7",
};

const STATUS_STYLES = {
  SCHEDULED: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  COMPLETED: { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  CANCELLED: { bg: "#FFF1F2", color: "#E11D48", border: "#FECDD3" },
  POSTPONED: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
};
const TYPE_STYLES = {
  STAFF:   { bg: C.mist,       color: C.deep },
  PARENT:  { bg: "#EDE9FE",    color: "#6D28D9" },
  STUDENT: { bg: "#FEF3C7",    color: "#B45309" },
  GENERAL: { bg: "#F1F5F9",    color: "#475569" },
  BOARD:   { bg: `${C.sky}33`, color: C.deep },
  CUSTOM:  { bg: "#F3F4F6",    color: "#4B5563" },
};
const VENUE_ICON = { CLASSROOM: MapPin, AUDITORIUM: MicVocal, STAFFROOM: Building2, ONLINE: Wifi, OTHER: HelpCircle };

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function SectionHead({ icon: Icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", borderBottom: `1.5px solid ${C.borderLight}`, marginBottom: 10 }}>
      {Icon && <Icon size={13} color={C.textLight} />}
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>{children}</span>
    </div>
  );
}

function AttendanceRow({ label, attended, loading, onToggle }) {
  const s = attended
    ? { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" }
    : { bg: C.bg,     color: C.textLight, border: C.border };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: `${C.bg}88`, borderRadius: 10, padding: "9px 12px" }}>
      <span style={{ fontSize: 13, color: C.text }}>{label}</span>
      <button onClick={onToggle} disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 99, border: `1px solid ${s.border}`, background: s.bg, color: s.color, cursor: "pointer" }}>
        {loading ? <Loader2 size={11} className="animate-spin" /> : attended ? <CheckCircle2 size={11} /> : <Circle size={11} />}
        {attended ? "Present" : "Absent"}
      </button>
    </div>
  );
}

function AttendanceSummary({ present, total }) {
  if (!total) return null;
  const pct = Math.round((present / total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ flex: 1, height: 5, background: `${C.mist}55`, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#22C55E", borderRadius: 99, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", whiteSpace: "nowrap" }}>{present}/{total} attended</span>
    </div>
  );
}

export default function MeetingViewModal({ meeting: initialMeeting, onClose, onStatusChange }) {
  const [meeting,         setMeeting]         = useState(initialMeeting);
  const [loadingFull,     setLoadingFull]     = useState(true);  // true: fetch starts on mount
  const [updatingStatus,  setUpdatingStatus]  = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [togglingAtt,     setTogglingAtt]     = useState({});
  const [editingNotes,    setEditingNotes]    = useState(false);
  const [notesValue,      setNotesValue]      = useState(meeting.notes ?? "");
  const [savingNotes,     setSavingNotes]     = useState(false);

  React.useEffect(() => {
    if (!initialMeeting?.id) return;
    setLoadingFull(true);
    fetchMeetingById(initialMeeting.id)
      .then((res) => {
        // API returns { data: meeting } — merge with initialMeeting so scalar
        // fields (meetingDate, startTime, endTime) are never lost even if the
        // full fetch returns a partial object or an unexpected shape.
        const full = res?.data ?? res;
        if (full && typeof full === "object" && full.id) {
          setMeeting((prev) => ({ ...prev, ...full }));
          setNotesValue(full.notes ?? "");
        }
      })
      .catch((err) => {
        console.error("MeetingViewModal: failed to fetch full meeting", err);
        // Keep initialMeeting data — don't blank it out on error
      })
      .finally(() => setLoadingFull(false));
  }, [initialMeeting?.id]);

  const handleStatusChange = async (status) => {
    setUpdatingStatus(true);
    try { await updateMeetingStatus(meeting.id, status); setMeeting((m) => ({ ...m, status })); onStatusChange?.(); }
    catch {} finally { setUpdatingStatus(false); }
  };
  const handleReminder = async () => {
    if (sendingReminder) return;

    setSendingReminder(true);

    try {
      const res = await sendMeetingReminder(meeting.id);

      // ✅ update UI
      setMeeting((m) => ({
        ...m,
        reminderSentAt: new Date().toISOString(),
      }));

      // ✅ SUCCESS MESSAGE
      alert("✅ WhatsApp reminders sent successfully");

    } catch (err) {
      console.error(err);

      // ❌ ERROR MESSAGE
      alert("❌ Failed to send WhatsApp messages");
    } finally {
      setSendingReminder(false);
    }
  };
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try { await updateMeetingNotes(meeting.id, notesValue); setMeeting((m) => ({ ...m, notes: notesValue })); setEditingNotes(false); }
    catch {} finally { setSavingNotes(false); }
  };

  const toggleParticipant = async (p) => {
    const key = `p-${p.id}`; setTogglingAtt((s) => ({ ...s, [key]: true }));
    try {
      const v = !p.attended; await markParticipantAttendance(meeting.id, p.id, v);
      setMeeting((m) => ({ ...m, participants: m.participants.map((x) => x.id === p.id ? { ...x, attended: v } : x) }));
    } catch {} finally { setTogglingAtt((s) => ({ ...s, [key]: false })); }
  };
  const toggleStudent = async (ms) => {
    const key = `s-${ms.studentId}`; setTogglingAtt((s) => ({ ...s, [key]: true }));
    try {
      const v = !ms.attended; await markStudentAttendance(meeting.id, ms.studentId, v);
      setMeeting((m) => ({ ...m, students: m.students.map((s) => s.studentId === ms.studentId ? { ...s, attended: v } : s) }));
    } catch {} finally { setTogglingAtt((s) => ({ ...s, [key]: false })); }
  };

  const userP     = meeting.participants?.filter((p) => p.type === "USER")     ?? [];
  const staffP = meeting.participants?.filter((p) => p.type === "STAFF") ?? [];
  const parentP   = meeting.participants?.filter((p) => p.type === "PARENT")   ?? [];
  const externalP = meeting.participants?.filter((p) => p.type === "EXTERNAL") ?? [];
  const studentP  = meeting.students ?? [];

  const allCoords  = userP.filter((p) => p.isCoordinator);
  const coordMap   = new Map();
  for (const p of allCoords) {
    if (p.name?.startsWith("__coord_sections:"))
      p.name.replace("__coord_sections:", "").split(",").forEach((sid) => { if (sid) coordMap.set(sid, p); });
  }
  const uniqueCoords    = [...new Map(allCoords.map((p) => [p.userId, p])).values()];
  const presentCount    = [...userP, ...parentP, ...studentP].filter((x) => x.attended).length;
  const totalAtt        = userP.length + parentP.length + studentP.length;
  const VenueIcon       = VENUE_ICON[meeting.venueType] ?? MapPin;
  const statusStyle     = STATUS_STYLES[meeting.status] ?? { bg: "#F1F5F9", color: "#64748B", border: "#E2E8F0" };
  const typeStyle       = TYPE_STYLES[meeting.type]     ?? { bg: "#F3F4F6", color: "#4B5563" };

  const badge = (style, children, key) => (
    <span key={key} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, ...style }}>{children}</span>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(56,73,89,0.45)", backdropFilter: "blur(8px)", padding: 16, fontFamily: "'Inter', sans-serif",}}>
      <div style={{ background: C.white, borderRadius: 24, boxShadow: "0 24px 80px rgba(56,73,89,0.2)", width: "100%", maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column", border: `1.5px solid ${C.borderLight}`, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${C.bg} 0%, ${C.white} 100%)`, borderBottom: `1.5px solid ${C.borderLight}`, padding: "18px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: "-0.3px" }}>{meeting.title}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {badge({ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }, meeting.status)}
              {badge({ background: typeStyle.bg, color: typeStyle.color }, meeting.type)}
              {uniqueCoords.slice(0, 2).map((coord) =>
                badge({ background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", display: "inline-flex", alignItems: "center", gap: 4 },
                  <><Star size={9} fill="currentColor" color="#F59E0B" /> {coord.user?.name ?? "Coordinator"}</>, coord.id)
              )}
              {uniqueCoords.length > 2 && badge({ background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A" }, `+${uniqueCoords.length - 2} more`)}
              {meeting.organizer && <span style={{ fontSize: 11, color: C.textLight }}>by {meeting.organizer.name}</span>}
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${C.borderLight}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight, flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `${C.mist}88`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.bg)}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          {loadingFull && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: C.textLight }}>
              <Loader2 size={18} className="animate-spin" />
              <span style={{ fontSize: 13 }}>Loading meeting details…</span>
            </div>
          )}

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { Icon: CalendarDays, label: "Date",  val: fmtDate(meeting.meetingDate) },
              { Icon: Clock4,       label: "Time",  val: meeting.startTime && meeting.endTime ? `${meeting.startTime} – ${meeting.endTime}` : "—" },
              ...((meeting.venueType || meeting.location) ? [{ Icon: VenueIcon, label: "Venue", val: meeting.venueType ? `${meeting.venueType.charAt(0) + meeting.venueType.slice(1).toLowerCase()}${meeting.venueDetail ? ` — ${meeting.venueDetail}` : ""}` : meeting.location }] : []),
            ].map(({ Icon, label, val }) => (
              <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: `${C.bg}88`, borderRadius: 12, padding: "11px 14px", border: `1px solid ${C.borderLight}` }}>
                <Icon size={14} color={C.textLight} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 500, color: C.text }}>{val}</p>
                </div>
              </div>
            ))}
            {meeting.meetingLink && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: `${C.bg}88`, borderRadius: 12, padding: "11px 14px", border: `1px solid ${C.borderLight}` }}>
                <Link2 size={14} color={C.textLight} style={{ marginTop: 2 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>Join Link</p>
                  <a href={meeting.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: C.sky, textDecoration: "none", fontWeight: 500 }}>Open Link</a>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {meeting.description && (
            <div>
              <SectionHead icon={FileText}>Agenda</SectionHead>
              <p style={{ margin: 0, fontSize: 13, color: C.textLight, lineHeight: 1.65, whiteSpace: "pre-line", background: `${C.bg}66`, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.borderLight}` }}>
                {meeting.description}
              </p>
            </div>
          )}

          {/* Classes & Coordinators */}
          {!loadingFull && meeting.classes?.length > 0 && (
            <div>
              <SectionHead icon={BookOpen}>Classes & Coordinators</SectionHead>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {meeting.classes.map((mc) => {
                  const coord = coordMap.get(mc.classSectionId) ?? coordMap.get(mc.id) ?? (uniqueCoords.length === 1 ? uniqueCoords[0] : null);
                  const coordName = coord?.user?.name ?? coord?.name ?? null;
                  return (
                    <div key={mc.id} style={{ borderRadius: 14, overflow: "hidden", border: `1.5px solid ${C.borderLight}` }}>
                      <div style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <BookOpen size={12} color={C.deep} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{mc.classSection?.name ?? mc.classSectionId}</span>
                        </div>
                        {coordName
                          ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", padding: "3px 10px", borderRadius: 99 }}>
                              <Star size={9} fill="currentColor" color="#F59E0B" /> In-charge: {coordName}
                            </span>
                          : <span style={{ fontSize: 11, color: C.textLight, fontStyle: "italic" }}>No in-charge</span>
                        }
                      </div>
                      {coord && (
                        <div style={{ padding: "8px 12px" }}>
                          <AttendanceRow
                            label={
                              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#B45309" }}>
                                  {(coord.user?.name ?? coord.name ?? "?")[0]?.toUpperCase()}
                                </span>
                                <span style={{ fontWeight: 500, fontSize: 13, color: C.text }}>{coord.user?.name ?? coord.name ?? "—"}</span>
                                <span style={{ fontSize: 10, fontWeight: 600, background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", padding: "1px 7px", borderRadius: 99 }}>In-charge</span>
                              </span>
                            }
                            attended={coord.attended}
                            loading={!!togglingAtt[`p-${coord.id}`]}
                            onToggle={() => toggleParticipant(coord)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* All Attendees */}
              {(() => {
                const attendees = userP.filter((p) => !p.isCoordinator);
                if (!attendees.length) return null;
                return (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ background: `${C.deep}08`, border: `1.5px solid ${C.borderLight}`, borderRadius: "12px 12px 0 0", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                      <Users size={13} color={C.deep} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>All Attendees</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, background: C.white, border: `1px solid ${C.borderLight}`, color: C.textLight, padding: "2px 8px", borderRadius: 99 }}>
                        {attendees.length} teacher{attendees.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ border: `1.5px solid ${C.borderLight}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
                      {attendees.map((p, idx) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: idx % 2 === 0 ? C.white : `${C.bg}55` }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 28, height: 28, borderRadius: "50%", background: `${C.deep}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: C.deep }}>
                              {(p.user?.name ?? p.name ?? "?")[0]?.toUpperCase()}
                            </span>
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.text }}>{p.user?.name ?? p.name ?? p.email ?? "—"}</p>
                              <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>Attendee · {meeting.classes?.length} class{meeting.classes?.length !== 1 ? "es" : ""}</p>
                            </div>
                          </span>
                          <button onClick={() => toggleParticipant(p)} disabled={!!togglingAtt[`p-${p.id}`]}
                            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 99, cursor: "pointer", transition: "all 0.15s",
                              ...(p.attended ? { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" } : { background: C.bg, color: C.textLight, border: `1px solid ${C.border}` }) }}>
                            {togglingAtt[`p-${p.id}`] ? <Loader2 size={11} className="animate-spin" /> : p.attended ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                            {p.attended ? "Present" : "Absent"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Attendance summary */}
          {!loadingFull && totalAtt > 0 && meeting.status === "COMPLETED" && (
            <AttendanceSummary present={presentCount} total={totalAtt} />
          )}

          {/* Staff participants (no classes) */}
          {!loadingFull && (!meeting.classes || meeting.classes.length === 0) && userP.length > 0 && (
            <div>
              <SectionHead icon={User}>Staff Participants</SectionHead>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {userP.map((p) => (
                  <AttendanceRow key={p.id}
                    label={<span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {p.isCoordinator && <Star size={11} fill="currentColor" color="#F59E0B" />}
                      {p.user?.name ?? p.name ?? p.email ?? "—"}
                      {p.isCoordinator && <span style={{ fontSize: 10, color: "#B45309", fontWeight: 600 }}>(In-charge)</span>}
                    </span>}
                    attended={p.attended} loading={!!togglingAtt[`p-${p.id}`]} onToggle={() => toggleParticipant(p)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Parents */}
          {parentP.length > 0 && (
            <div>
              <SectionHead icon={Users}>Parent Participants</SectionHead>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {parentP.map((p) => (
                  <AttendanceRow key={p.id} label={p.parent?.name ?? p.name ?? p.email ?? "—"}
                    attended={p.attended} loading={!!togglingAtt[`p-${p.id}`]} onToggle={() => toggleParticipant(p)} />
                ))}
              </div>
            </div>
          )}

          {/* Students */}
          {studentP.length > 0 && (
            <div>
              <SectionHead icon={Users}>Student Participants</SectionHead>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {studentP.map((ms) => (
                  <AttendanceRow key={ms.studentId} label={ms.student?.name ?? ms.studentId}
                    attended={ms.attended} loading={!!togglingAtt[`s-${ms.studentId}`]} onToggle={() => toggleStudent(ms)} />
                ))}
              </div>
            </div>
          )}

          {staffP.length > 0 && (
            <div>
              <SectionHead icon={User}>Non-Teaching Staff</SectionHead>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {staffP.map((p) => (
                  <AttendanceRow
                    key={p.id}
                    label={
                      p.staff
                        ? `${p.staff.firstName} ${p.staff.lastName ?? ""}`.trim()
                        : p.name ?? "Staff"
                    }
                    attended={p.attended}
                    loading={!!togglingAtt[`p-${p.id}`]}
                    onToggle={() => toggleParticipant(p)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* External */}
          {externalP.length > 0 && (
            <div>
              <SectionHead>External Participants</SectionHead>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {externalP.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, background: `${C.bg}88`, borderRadius: 10, padding: "9px 12px" }}>
                    <span style={{ fontSize: 13, color: C.text }}>{p.name && <strong>{p.name} — </strong>}{p.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <SectionHead icon={FileText}>Meeting Notes</SectionHead>
              {!editingNotes && (
                <button onClick={() => { setNotesValue(meeting.notes ?? ""); setEditingNotes(true); }}
                  style={{ fontSize: 11, color: C.sky, background: "none", border: "none", cursor: "pointer", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}>
                  {meeting.notes ? "Edit" : "Add Notes"}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none", resize: "none", fontFamily: "Inter, sans-serif", background: C.bg, boxSizing: "border-box" }}
                  rows={5} placeholder="Record discussion, decisions, action items…"
                  value={notesValue} onChange={(e) => setNotesValue(e.target.value)} autoFocus
                  onFocus={(e) => (e.target.style.borderColor = C.sky)}
                  onBlur={(e)  => (e.target.style.borderColor = C.border)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button onClick={() => setEditingNotes(false)}
                    style={{ padding: "7px 14px", fontSize: 12, color: C.textLight, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveNotes} disabled={savingNotes}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 10, border: "none", background: C.deep, color: "#fff", fontSize: 12, fontWeight: 600, cursor: savingNotes ? "not-allowed" : "pointer", opacity: savingNotes ? 0.7 : 1 }}>
                    {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Notes
                  </button>
                </div>
              </div>
            ) : meeting.notes ? (
              <p style={{ margin: 0, fontSize: 13, color: C.textLight, lineHeight: 1.65, whiteSpace: "pre-line", background: `${C.bg}66`, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.borderLight}` }}>
                {meeting.notes}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: C.textLight, fontStyle: "italic" }}>No notes recorded yet.</p>
            )}
          </div>

          {meeting.reminderSentAt && (
            <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>
              Reminder sent: {new Date(meeting.reminderSentAt).toLocaleString("en-IN")}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 22px", borderTop: `1.5px solid ${C.borderLight}`, background: C.white, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"].filter((s) => s !== meeting.status).map((s) => (
              <button key={s} onClick={() => handleStatusChange(s)} disabled={updatingStatus}
                style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${C.borderLight}`, background: C.bg, color: C.textLight, cursor: updatingStatus ? "not-allowed" : "pointer", opacity: updatingStatus ? 0.5 : 1, transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.mist; e.currentTarget.style.color = C.deep; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.bg;   e.currentTarget.style.color = C.textLight; }}>
                {updatingStatus ? <Loader2 size={11} className="animate-spin" /> : `→ ${s}`}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleReminder}
              disabled={sendingReminder}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                background: sendingReminder ? "#ccc" : "#2563EB",
                color: "#fff",
                cursor: sendingReminder ? "not-allowed" : "pointer",
              }}
            >
              {sendingReminder ? "Sending..." : "Send Reminder"}
            </button>
            <button onClick={onClose}
              style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}