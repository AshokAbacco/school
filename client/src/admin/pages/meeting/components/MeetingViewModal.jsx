// client/src/admin/pages/meeting/components/MeetingViewModal.jsx
import React, { useState } from "react";
import {
  X,
  CalendarDays,
  Clock4,
  MapPin,
  Link2,
  Users,
  BookOpen,
  User,
  CheckCircle2,
  Circle,
  Loader2,
  Bell,
  Star,
  FileText,
  Save,
  Wifi,
  Building2,
  MicVocal,
  HelpCircle,
} from "lucide-react";
import {
  markParticipantAttendance,
  markStudentAttendance,
  sendMeetingReminder,
  updateMeetingStatus,
  updateMeetingNotes,
  fetchMeetingById,
} from "../api/meetingsApi";

/* ── helpers ─────────────────────────────────────────────────── */
const STATUS_STYLES = {
  SCHEDULED: "bg-blue-50 text-blue-600 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-500 border-rose-200",
  POSTPONED: "bg-amber-50 text-amber-600 border-amber-200",
};

const TYPE_COLORS = {
  STAFF: "bg-[#BDDDFC] text-[#384959]",
  PARENT: "bg-purple-100 text-purple-700",
  STUDENT: "bg-amber-100 text-amber-700",
  GENERAL: "bg-slate-100 text-slate-600",
  BOARD: "bg-[#88BDF2] text-[#384959]",
  CUSTOM: "bg-gray-100 text-gray-600",
};

const VENUE_ICON = {
  CLASSROOM: MapPin,
  AUDITORIUM: MicVocal,
  STAFFROOM: Building2,
  ONLINE: Wifi,
  OTHER: HelpCircle,
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-semibold text-[#384959] border-b border-[#BDDDFC] pb-1.5 mb-3 flex items-center gap-1.5">
      {children}
    </h3>
  );
}

/* ── Attendance row ─────────────────────────────────────────── */
function AttendanceRow({ label, attended, loading, onToggle }) {
  return (
    <div className="flex items-center justify-between bg-[#BDDDFC]/10 rounded-lg px-3 py-2">
      <span className="text-sm text-[#384959]">{label}</span>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
          attended
            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
            : "bg-white text-[#6A89A7] border-[#BDDDFC]"
        }`}
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : attended ? (
          <CheckCircle2 size={12} />
        ) : (
          <Circle size={12} />
        )}
        {attended ? "Present" : "Absent"}
      </button>
    </div>
  );
}

/* ── Attendance summary bar ─────────────────────────────────── */
function AttendanceSummary({ present, total }) {
  if (total === 0) return null;
  const pct = Math.round((present / total) * 100);
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1 h-2 bg-[#BDDDFC]/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap">
        {present}/{total} attended
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export default function MeetingViewModal({
  meeting: initialMeeting,
  onClose,
  onStatusChange,
}) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [loadingFull, setLoadingFull] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [togglingAttendance, setTogglingAttendance] = useState({});

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(meeting.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  /* ── fetch full meeting detail on open (list only has _count) ── */
  React.useEffect(() => {
    setLoadingFull(true);
    fetchMeetingById(initialMeeting.id)
      .then((res) => {
        const full = res?.data ?? res;
        setMeeting(full);
        setNotesValue(full.notes ?? "");
      })
      .catch(() => {})
      .finally(() => setLoadingFull(false));
  }, [initialMeeting.id]);

  /* ── status change ── */
  const handleStatusChange = async (status) => {
    setUpdatingStatus(true);
    try {
      await updateMeetingStatus(meeting.id, status);
      setMeeting((m) => ({ ...m, status }));
      onStatusChange?.();
    } catch (_) {}
    setUpdatingStatus(false);
  };

  /* ── reminder ── */
  const handleReminder = async () => {
    setSendingReminder(true);
    try {
      await sendMeetingReminder(meeting.id);
      setMeeting((m) => ({ ...m, reminderSentAt: new Date().toISOString() }));
    } catch (_) {}
    setSendingReminder(false);
  };

  /* ── save notes ── */
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateMeetingNotes(meeting.id, notesValue);
      setMeeting((m) => ({ ...m, notes: notesValue }));
      setEditingNotes(false);
    } catch (_) {}
    setSavingNotes(false);
  };

  /* ── attendance toggles ── */
  const toggleParticipantAttendance = async (participant) => {
    const key = `p-${participant.id}`;
    setTogglingAttendance((s) => ({ ...s, [key]: true }));
    try {
      const newVal = !participant.attended;
      await markParticipantAttendance(meeting.id, participant.id, newVal);
      setMeeting((m) => ({
        ...m,
        participants: m.participants.map((p) =>
          p.id === participant.id ? { ...p, attended: newVal } : p,
        ),
      }));
    } catch (_) {}
    setTogglingAttendance((s) => ({ ...s, [key]: false }));
  };

  const toggleStudentAttendance = async (ms) => {
    const key = `s-${ms.studentId}`;
    setTogglingAttendance((s) => ({ ...s, [key]: true }));
    try {
      const newVal = !ms.attended;
      await markStudentAttendance(meeting.id, ms.studentId, newVal);
      setMeeting((m) => ({
        ...m,
        students: m.students.map((s) =>
          s.studentId === ms.studentId ? { ...s, attended: newVal } : s,
        ),
      }));
    } catch (_) {}
    setTogglingAttendance((s) => ({ ...s, [key]: false }));
  };

  /* ── derived participant groups ── */
  const userParticipants =
    meeting.participants?.filter((p) => p.type === "USER") ?? [];
  const parentParticipants =
    meeting.participants?.filter((p) => p.type === "PARENT") ?? [];
  const externalParticipants =
    meeting.participants?.filter((p) => p.type === "EXTERNAL") ?? [];
  const studentParticipants = meeting.students ?? [];

  // Build a map of classSectionId → coordinator participant
  // The backend stores section IDs in participant.name as:
  //   "__coord_sections:sectionId1,sectionId2"
  // We parse this to correctly show each class's coordinator.
  const allCoordinators = userParticipants.filter((p) => p.isCoordinator);
  const coordBySectionId = new Map(); // classSectionId → participant
  for (const p of allCoordinators) {
    if (p.name?.startsWith("__coord_sections:")) {
      const sectionIds = p.name.replace("__coord_sections:", "").split(",");
      for (const sid of sectionIds) {
        if (sid) coordBySectionId.set(sid, p);
      }
    }
  }
  // For header badge — unique coordinators by userId
  const uniqueCoordinators = [
    ...new Map(allCoordinators.map((p) => [p.userId, p])).values(),
  ];
  // Legacy single ref for parts of the UI that still need it
  const coordinator = uniqueCoordinators[0] ?? null;

  // Attendance summary
  const allAttendable = [
    ...userParticipants.filter(
      (p) => !p.isCoordinator || p.attended !== undefined,
    ),
    ...parentParticipants,
    ...studentParticipants,
  ];
  const presentCount = [
    ...userParticipants.filter((p) => p.attended),
    ...parentParticipants.filter((p) => p.attended),
    ...studentParticipants.filter((p) => p.attended),
  ].length;
  const totalAttendable =
    userParticipants.length +
    parentParticipants.length +
    studentParticipants.length;

  /* ── venue display ── */
  const VenueIcon = VENUE_ICON[meeting.venueType] ?? MapPin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#384959]/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#BDDDFC]">
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#BDDDFC]">
          <div className="flex flex-col gap-1.5 flex-1 pr-4">
            <h2 className="text-lg font-semibold text-[#384959] leading-snug">
              {meeting.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[meeting.status] ?? ""}`}
              >
                {meeting.status}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[meeting.type] ?? "bg-gray-100 text-gray-600"}`}
              >
                {meeting.type}
              </span>
              {uniqueCoordinators.slice(0, 2).map((coord) => (
                <span
                  key={coord.id}
                  className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                >
                  <Star
                    size={10}
                    fill="currentColor"
                    className="text-amber-500"
                  />
                  {coord.user?.name ?? "Coordinator"}
                </span>
              ))}
              {uniqueCoordinators.length > 2 && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  +{uniqueCoordinators.length - 2} more
                </span>
              )}
              {meeting.organizer && (
                <span className="text-xs text-[#6A89A7]">
                  by {meeting.organizer.name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#BDDDFC] transition-colors text-[#6A89A7]"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Loading overlay while fetching full data */}
          {loadingFull && (
            <div className="flex items-center justify-center gap-2 py-8 text-[#6A89A7]">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading meeting details…</span>
            </div>
          )}
          {/* Meta info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 bg-[#BDDDFC]/20 rounded-xl p-3">
              <CalendarDays
                size={16}
                className="text-[#6A89A7] mt-0.5 shrink-0"
              />
              <div>
                <div className="text-xs text-[#6A89A7] font-medium">Date</div>
                <div className="text-sm text-[#384959]">
                  {formatDate(meeting.meetingDate)}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-[#BDDDFC]/20 rounded-xl p-3">
              <Clock4 size={16} className="text-[#6A89A7] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-[#6A89A7] font-medium">Time</div>
                <div className="text-sm text-[#384959]">
                  {meeting.startTime} – {meeting.endTime}
                </div>
              </div>
            </div>
            {(meeting.venueType || meeting.location) && (
              <div className="flex items-start gap-2 bg-[#BDDDFC]/20 rounded-xl p-3">
                <VenueIcon
                  size={16}
                  className="text-[#6A89A7] mt-0.5 shrink-0"
                />
                <div>
                  <div className="text-xs text-[#6A89A7] font-medium">
                    Venue
                  </div>
                  <div className="text-sm text-[#384959]">
                    {meeting.venueType
                      ? `${meeting.venueType.charAt(0) + meeting.venueType.slice(1).toLowerCase()}${meeting.venueDetail ? ` — ${meeting.venueDetail}` : ""}`
                      : meeting.location}
                  </div>
                </div>
              </div>
            )}
            {meeting.meetingLink && (
              <div className="flex items-start gap-2 bg-[#BDDDFC]/20 rounded-xl p-3">
                <Link2 size={16} className="text-[#6A89A7] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-[#6A89A7] font-medium">
                    Join Link
                  </div>
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[#88BDF2] hover:underline"
                  >
                    Open Link
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Agenda / Description */}
          {meeting.description && (
            <div>
              <SectionTitle>Agenda / Description</SectionTitle>
              <p className="text-sm text-[#6A89A7] leading-relaxed whitespace-pre-line">
                {meeting.description}
              </p>
            </div>
          )}

          {/* ── Per-Class Breakdown: Coordinator + Attendees ── */}
          {!loadingFull && meeting.classes?.length > 0 && (
            <div>
              <SectionTitle>
                <BookOpen size={13} />
                Classes & Coordinators
              </SectionTitle>

              {/* Class cards — coordinator matched by section ID, never by array index */}
              <div className="flex flex-col gap-2">
                {meeting.classes.map((mc) => {
                  // Match coordinator to this class using the section map.
                  // Fallback: if only one coordinator (legacy or same-for-all),
                  // apply them to every class.
                  const coord =
                    coordBySectionId.get(mc.classSectionId) ??
                    coordBySectionId.get(mc.id) ??
                    (uniqueCoordinators.length === 1
                      ? uniqueCoordinators[0]
                      : null);
                  const coordName = coord?.user?.name ?? coord?.name ?? null;

                  return (
                    <div
                      key={mc.id}
                      className="border border-[#BDDDFC] rounded-xl overflow-hidden"
                    >
                      {/* Class header */}
                      <div className="bg-[#BDDDFC]/30 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen size={13} className="text-[#384959]" />
                          <span className="text-sm font-bold text-[#384959]">
                            {mc.classSection?.name ?? mc.classSectionId}
                          </span>
                        </div>
                        {coordName ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <Star
                              size={10}
                              fill="currentColor"
                              className="text-amber-500"
                            />
                            In-charge: {coordName}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6A89A7] italic">
                            No in-charge assigned
                          </span>
                        )}
                      </div>

                      {/* Coordinator attendance row inside the class card */}
                      {coord && (
                        <div className="px-3 py-2.5">
                          <AttendanceRow
                            label={
                              <span className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">
                                  {(coord.user?.name ??
                                    coord.name ??
                                    "?")[0]?.toUpperCase()}
                                </span>
                                <span className="font-medium text-sm text-[#384959]">
                                  {coord.user?.name ?? coord.name ?? "—"}
                                </span>
                                <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                                  In-charge
                                </span>
                              </span>
                            }
                            attended={coord.attended}
                            loading={!!togglingAttendance[`p-${coord.id}`]}
                            onToggle={() => toggleParticipantAttendance(coord)}
                          />
                        </div>
                      )}
                      {!coord && (
                        <div className="px-4 py-2">
                          <p className="text-xs text-[#6A89A7] italic">
                            No coordinator assigned.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── All Attendees — each teacher appears ONCE regardless of how many classes they cover ── */}
              {(() => {
                const attendees = userParticipants.filter(
                  (p) => !p.isCoordinator,
                );
                if (attendees.length === 0) return null;
                return (
                  <div className="mt-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 bg-[#384959]/5 border border-[#BDDDFC] rounded-t-xl px-4 py-2.5">
                      <Users size={14} className="text-[#384959]" />
                      <span className="text-sm font-bold text-[#384959]">
                        All Attendees
                      </span>
                      <span className="ml-auto text-xs text-[#6A89A7] bg-white border border-[#BDDDFC] px-2 py-0.5 rounded-full">
                        {attendees.length} teacher
                        {attendees.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Class tags row */}
                    <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 bg-[#BDDDFC]/10 border-x border-[#BDDDFC]">
                      <span className="text-[10px] text-[#6A89A7] font-semibold uppercase tracking-wide mr-1">
                        Attending classes:
                      </span>
                      {meeting.classes.map((mc) => (
                        <span
                          key={mc.id}
                          className="text-xs bg-[#384959] text-white px-2 py-0.5 rounded-full font-medium"
                        >
                          {mc.classSection?.name ?? mc.classSectionId}
                        </span>
                      ))}
                    </div>
                    {/* Attendee rows */}
                    <div className="border border-t-0 border-[#BDDDFC] rounded-b-xl overflow-hidden divide-y divide-[#BDDDFC]/50">
                      {attendees.map((p, idx) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between px-4 py-3 ${idx % 2 === 0 ? "bg-white" : "bg-[#BDDDFC]/10"}`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-[#384959]/10 flex items-center justify-center text-[11px] font-bold text-[#384959] shrink-0">
                              {(p.user?.name ??
                                p.name ??
                                "?")[0]?.toUpperCase()}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-[#384959]">
                                {p.user?.name ?? p.name ?? p.email ?? "—"}
                              </p>
                              <p className="text-[10px] text-[#6A89A7]">
                                Attendee · {meeting.classes.length} class
                                {meeting.classes.length !== 1 ? "es" : ""}
                              </p>
                            </div>
                          </span>
                          <button
                            onClick={() => toggleParticipantAttendance(p)}
                            disabled={!!togglingAttendance[`p-${p.id}`]}
                            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                              p.attended
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-white text-[#6A89A7] border-[#BDDDFC] hover:border-[#88BDF2]"
                            }`}
                          >
                            {togglingAttendance[`p-${p.id}`] ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : p.attended ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <Circle size={12} />
                            )}
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

          {/* ── Attendance overall summary (when completed) ── */}
          {!loadingFull &&
            totalAttendable > 0 &&
            meeting.status === "COMPLETED" && (
              <AttendanceSummary
                present={presentCount}
                total={totalAttendable}
              />
            )}

          {/* ── Fallback: staff participants when no classes are assigned ── */}
          {!loadingFull &&
            (!meeting.classes || meeting.classes.length === 0) &&
            userParticipants.length > 0 && (
              <div>
                <SectionTitle>
                  <User size={13} />
                  Staff Participants
                </SectionTitle>
                <div className="flex flex-col gap-1.5">
                  {userParticipants.map((p) => (
                    <AttendanceRow
                      key={p.id}
                      label={
                        <span className="flex items-center gap-1.5">
                          {p.isCoordinator && (
                            <Star
                              size={11}
                              fill="currentColor"
                              className="text-amber-400"
                            />
                          )}
                          {p.user?.name ?? p.name ?? p.email ?? "—"}
                          {p.isCoordinator && (
                            <span className="text-[10px] text-amber-600 font-semibold">
                              (In-charge)
                            </span>
                          )}
                        </span>
                      }
                      attended={p.attended}
                      loading={!!togglingAttendance[`p-${p.id}`]}
                      onToggle={() => toggleParticipantAttendance(p)}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* Parent Participants */}
          {parentParticipants.length > 0 && (
            <div>
              <SectionTitle>Parent Participants</SectionTitle>
              <div className="flex flex-col gap-1.5">
                {parentParticipants.map((p) => (
                  <AttendanceRow
                    key={p.id}
                    label={p.parent?.name ?? p.name ?? p.email ?? "—"}
                    attended={p.attended}
                    loading={!!togglingAttendance[`p-${p.id}`]}
                    onToggle={() => toggleParticipantAttendance(p)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Students */}
          {studentParticipants.length > 0 && (
            <div>
              <SectionTitle>
                <Users size={13} />
                Student Participants
              </SectionTitle>
              <div className="flex flex-col gap-1.5">
                {studentParticipants.map((ms) => (
                  <AttendanceRow
                    key={ms.studentId}
                    label={ms.student?.name ?? ms.studentId}
                    attended={ms.attended}
                    loading={!!togglingAttendance[`s-${ms.studentId}`]}
                    onToggle={() => toggleStudentAttendance(ms)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* External */}
          {externalParticipants.length > 0 && (
            <div>
              <SectionTitle>External Participants</SectionTitle>
              <div className="flex flex-col gap-1.5">
                {externalParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-[#BDDDFC]/10 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-[#384959]">
                      {p.name && <strong>{p.name} — </strong>}
                      {p.email}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meeting Notes / Minutes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle>
                <FileText size={13} />
                Meeting Notes / Minutes
              </SectionTitle>
              {!editingNotes && (
                <button
                  onClick={() => {
                    setNotesValue(meeting.notes ?? "");
                    setEditingNotes(true);
                  }}
                  className="text-xs text-[#6A89A7] hover:text-[#384959] underline underline-offset-2 transition-colors"
                >
                  {meeting.notes ? "Edit" : "Add Notes"}
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full border border-[#BDDDFC] rounded-xl px-3 py-2.5 text-sm text-[#384959] focus:outline-none focus:ring-2 focus:ring-[#88BDF2] resize-none"
                  rows={5}
                  placeholder="Record what was discussed, decisions made, action items…"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="px-3 py-1.5 text-xs text-[#6A89A7] hover:text-[#384959] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#384959] text-white text-xs font-semibold rounded-lg hover:bg-[#6A89A7] transition-colors disabled:opacity-60"
                  >
                    {savingNotes ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    Save Notes
                  </button>
                </div>
              </div>
            ) : meeting.notes ? (
              <p className="text-sm text-[#6A89A7] leading-relaxed whitespace-pre-line bg-[#BDDDFC]/10 rounded-xl px-3 py-2.5">
                {meeting.notes}
              </p>
            ) : (
              <p className="text-sm text-[#6A89A7] italic">
                No notes recorded yet.
              </p>
            )}
          </div>

          {/* Reminder info */}
          {meeting.reminderSentAt && (
            <p className="text-xs text-[#6A89A7]">
              Reminder sent:{" "}
              {new Date(meeting.reminderSentAt).toLocaleString("en-IN")}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#BDDDFC]">
          {/* Status change buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"]
              .filter((s) => s !== meeting.status)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={updatingStatus}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#BDDDFC] text-[#6A89A7] hover:bg-[#BDDDFC]/40 transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    `→ ${s}`
                  )}
                </button>
              ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReminder}
              disabled={sendingReminder}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#BDDDFC] text-[#384959] rounded-lg hover:bg-[#88BDF2] transition-colors disabled:opacity-50"
            >
              {sendingReminder ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Bell size={13} />
              )}
              Send Reminder
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-[#384959] text-white rounded-xl hover:bg-[#6A89A7] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
