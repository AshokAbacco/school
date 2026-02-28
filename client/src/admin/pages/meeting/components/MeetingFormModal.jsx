// client/src/admin/pages/meeting/components/MeetingFormModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  MapPin,
  Clock4,
  CalendarDays,
  Users,
  BookOpen,
  Wifi,
  Building2,
  MicVocal,
  HelpCircle,
  Star,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createMeeting,
  updateMeeting,
  fetchAcademicYears,
  fetchClassSections,
  fetchTeachersByClassSection,
} from "../api/meetingsApi";

/* ── constants ──────────────────────────────────────────────── */
const MEETING_TYPES = [
  "STAFF",
  "PARENT",
  "STUDENT",
  "GENERAL",
  "BOARD",
  "CUSTOM",
];
const MEETING_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"];

const VENUE_TYPES = [
  { value: "CLASSROOM", label: "Classroom", icon: BookOpen, detail: "room" },
  { value: "AUDITORIUM", label: "Auditorium", icon: MicVocal, detail: null },
  { value: "STAFFROOM", label: "Staff Room", icon: Building2, detail: null },
  { value: "ONLINE", label: "Online", icon: Wifi, detail: "link" },
  { value: "OTHER", label: "Other", icon: HelpCircle, detail: "text" },
];

const TOTAL_STEPS = 5;

const INITIAL_FORM = {
  title: "",
  meetingDate: "",
  startTime: "",
  endTime: "",
  venueType: "",
  venueDetail: "",
  meetingLink: "",
  type: "GENERAL",
  status: "SCHEDULED",
  academicYearId: "",
  classSectionId: "", // kept for backward compat
  classSectionIds: [], // all selected section ids
  // per-section coordinator: { [sectionId]: userId }
  sectionCoordinators: {},
  // per-section participants: { [sectionId]: [userId, ...] }
  sectionParticipants: {},
  // legacy flat fields (derived at submit time)
  coordinatorUserId: "",
  participantUserIds: [],
  externalParticipants: [],
  autoInviteParents: false,
  description: "",
};

/* ── small helpers ──────────────────────────────────────────── */
const inputCls =
  "w-full border border-[#BDDDFC] rounded-lg px-3 py-2 text-sm text-[#384959] bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#88BDF2] placeholder-[#6A89A7]/60 transition";

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-[#384959] mb-1.5 uppercase tracking-wide">
      {children}{" "}
      {required && <span className="text-rose-400 normal-case">*</span>}
    </label>
  );
}

function StepHeader({ step, title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-[#384959] text-white text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <h3 className="text-base font-semibold text-[#384959]">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-[#6A89A7] ml-8">{subtitle}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export default function MeetingFormModal({ meeting = null, onClose, onSaved }) {
  const isEdit = !!meeting;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data
  const [academicYears, setAcademicYears] = useState([]);
  const [classSections, setClassSections] = useState([]);
  // sectionData: { [sectionId]: { teachers: [], loading: bool } }
  const [sectionData, setSectionData] = useState({});
  // which section's teacher panel is open
  const [activeSectionId, setActiveSectionId] = useState(null);
  // which grade is currently shown in the grade dropdown
  const [activeGrade, setActiveGrade] = useState("");
  // per-grade: same coordinator for all sections? null=not chosen, true, false
  const [gradeSameCoordinator, setGradeSameCoordinator] = useState({});
  // per-grade: shared coordinator userId (when sameCoord === true)
  const [gradeSharedCoordinator, setGradeSharedCoordinator] = useState({});
  const [loadingAY, setLoadingAY] = useState(true);
  const [loadingCS, setLoadingCS] = useState(true);

  // External participant inputs
  const [extName, setExtName] = useState("");
  const [extEmail, setExtEmail] = useState("");

  /* ── load academic years + class sections ── */
  useEffect(() => {
    fetchAcademicYears()
      .then((res) => {
        const years = Array.isArray(res)
          ? res
          : (res?.data ?? res?.academicYears ?? []);
        setAcademicYears(years);
        const active = years.find((y) => y.isActive);
        if (active && !isEdit)
          setForm((f) => ({ ...f, academicYearId: active.id }));
      })
      .catch(() => {})
      .finally(() => setLoadingAY(false));

    fetchClassSections()
      .then((res) => {
        const arr = Array.isArray(res)
          ? res
          : (res?.data ?? res?.classSections ?? []);
        setClassSections(arr);
      })
      .catch(() => {})
      .finally(() => setLoadingCS(false));
  }, []);

  /* ── if editing, populate form ── */
  useEffect(() => {
    if (!meeting) return;
    const sectionIds = meeting.classes?.map((c) => c.classSectionId) ?? [];
    // Build per-section coordinator map from existing participants
    const sectionCoordinators = {};
    const coordinatorParticipant = meeting.participants?.find(
      (p) => p.isCoordinator,
    );
    if (coordinatorParticipant?.userId && sectionIds.length > 0) {
      // assign coordinator to first section as fallback
      sectionCoordinators[sectionIds[0]] = coordinatorParticipant.userId;
    }
    const participantIds =
      meeting.participants
        ?.filter((p) => p.type === "USER" && !p.isCoordinator && p.userId)
        .map((p) => p.userId) ?? [];
    // Distribute all participants to first section as fallback
    const sectionParticipants = {};
    if (sectionIds.length > 0 && participantIds.length > 0) {
      sectionParticipants[sectionIds[0]] = participantIds;
    }
    setForm({
      title: meeting.title ?? "",
      meetingDate: meeting.meetingDate ? meeting.meetingDate.split("T")[0] : "",
      startTime: meeting.startTime ?? "",
      endTime: meeting.endTime ?? "",
      venueType: meeting.venueType ?? "",
      venueDetail: meeting.venueDetail ?? "",
      meetingLink: meeting.meetingLink ?? "",
      type: meeting.type ?? "GENERAL",
      status: meeting.status ?? "SCHEDULED",
      academicYearId: meeting.academicYearId ?? "",
      classSectionId: sectionIds[0] ?? "",
      classSectionIds: sectionIds,
      sectionCoordinators,
      sectionParticipants,
      coordinatorUserId: coordinatorParticipant?.userId ?? "",
      participantUserIds: participantIds,
      externalParticipants:
        meeting.participants
          ?.filter((p) => p.type === "EXTERNAL")
          .map((p) => ({ name: p.name ?? "", email: p.email ?? "" })) ?? [],
      autoInviteParents: false,
      description: meeting.description ?? "",
    });
    if (sectionIds.length > 0) setActiveSectionId(sectionIds[0]);
  }, [meeting]);

  /* ── fetch teachers for a section (only when not already loaded) ── */
  const loadTeachersForSection = useCallback(
    async (sectionId) => {
      if (!sectionId) return;
      if (sectionData[sectionId]?.teachers) return; // already loaded
      setSectionData((prev) => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          loading: true,
          teachers: prev[sectionId]?.teachers ?? null,
        },
      }));
      try {
        const res = await fetchTeachersByClassSection(
          sectionId,
          form.academicYearId,
        );
        setSectionData((prev) => ({
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            loading: false,
            teachers: res?.teachers ?? [],
          },
        }));
      } catch {
        setSectionData((prev) => ({
          ...prev,
          [sectionId]: { ...prev[sectionId], loading: false, teachers: [] },
        }));
      }
    },
    [sectionData, form.academicYearId],
  );

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  /* ── venue helper ── */
  const selectedVenue = VENUE_TYPES.find((v) => v.value === form.venueType);

  /* ── per-section toggle teacher participant ── */
  const toggleSectionTeacher = (sectionId, uid) => {
    setForm((f) => {
      const current = f.sectionParticipants[sectionId] ?? [];
      const updated = current.includes(uid)
        ? current.filter((x) => x !== uid)
        : [...current, uid];
      return {
        ...f,
        sectionParticipants: { ...f.sectionParticipants, [sectionId]: updated },
      };
    });
  };

  /* ── per-section set coordinator ── */
  const setSectionCoordinator = (sectionId, uid) => {
    setForm((f) => ({
      ...f,
      sectionCoordinators: {
        ...f.sectionCoordinators,
        [sectionId]: f.sectionCoordinators[sectionId] === uid ? "" : uid,
      },
    }));
  };

  /* ── toggle a class section in/out of selection ── */
  const toggleSection = (sectionId) => {
    setForm((f) => {
      const isSelected = f.classSectionIds.includes(sectionId);
      if (isSelected) {
        // remove section and its data
        const newIds = f.classSectionIds.filter((id) => id !== sectionId);
        const newCoords = { ...f.sectionCoordinators };
        const newParts = { ...f.sectionParticipants };
        delete newCoords[sectionId];
        delete newParts[sectionId];
        return {
          ...f,
          classSectionIds: newIds,
          sectionCoordinators: newCoords,
          sectionParticipants: newParts,
        };
      } else {
        return { ...f, classSectionIds: [...f.classSectionIds, sectionId] };
      }
    });
    if (!form.classSectionIds.includes(sectionId)) {
      // newly added — load teachers and set as active
      setActiveSectionId(sectionId);
      loadTeachersForSection(sectionId);
    } else {
      // removed — if it was active, clear active
      setActiveSectionId((prev) => (prev === sectionId ? null : prev));
    }
  };

  /* ── external participant helpers ── */
  const addExternal = () => {
    if (!extEmail) return;
    set("externalParticipants", [
      ...form.externalParticipants,
      { name: extName, email: extEmail },
    ]);
    setExtName("");
    setExtEmail("");
  };
  const removeExternal = (i) =>
    set(
      "externalParticipants",
      form.externalParticipants.filter((_, idx) => idx !== i),
    );

  /* ── step validation ── */
  const canProceed = useCallback(() => {
    if (step === 1)
      return (
        form.title.trim() && form.meetingDate && form.startTime && form.endTime
      );
    if (step === 2) return !!form.venueType;
    return true;
  }, [step, form]);

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!form.title || !form.meetingDate || !form.startTime || !form.endTime) {
      setError("Please fill all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Build per-section coordinator list: [{ userId, classSectionId }]
      // One entry per section — backend groups by userId into one DB row each.
      const perSectionCoordinators = Object.entries(form.sectionCoordinators)
        .filter(([, uid]) => uid)
        .map(([classSectionId, userId]) => ({ userId, classSectionId }));

      // All unique coordinator userIds
      const coordinatorUserIds = [
        ...new Set(perSectionCoordinators.map((e) => e.userId)),
      ];
      const primaryCoordinator = coordinatorUserIds[0] ?? "";

      // All attendee (non-coordinator) participant ids
      const allParticipantIds = new Set();
      Object.values(form.sectionParticipants).forEach((ids) =>
        ids.forEach((id) => allParticipantIds.add(id)),
      );
      // Remove coordinator ids from attendee list (backend handles separately)
      coordinatorUserIds.forEach((id) => allParticipantIds.delete(id));

      const payload = {
        ...form,
        classSectionIds: form.classSectionIds,
        classSectionId: form.classSectionIds[0] ?? "",
        // Legacy single field (first coordinator)
        coordinatorUserId: primaryCoordinator,
        // All non-coordinator attendees
        participantUserIds: [...allParticipantIds],
        // Full per-section coordinator map — backend uses this to save
        // each coordinator with their section IDs encoded in name field
        perSectionCoordinators,
      };

      if (isEdit) await updateMeeting(meeting.id, payload);
      else await createMeeting(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── progress bar ── */
  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#384959]/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border border-[#BDDDFC] overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#BDDDFC] bg-gradient-to-r from-white to-[#BDDDFC]/20">
          <div>
            <h2 className="text-lg font-bold text-[#384959]">
              {isEdit ? "Edit Meeting" : "Schedule Meeting"}
            </h2>
            <p className="text-xs text-[#6A89A7] mt-0.5">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#BDDDFC] transition-colors text-[#6A89A7]"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Progress bar ── */}
        <div className="h-1 bg-[#BDDDFC]/40 w-full">
          <div
            className="h-full bg-[#384959] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ── Step indicators ── */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-[#BDDDFC]/50 bg-[#BDDDFC]/10">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <React.Fragment key={s}>
              <button
                onClick={() => s < step && setStep(s)}
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                  s < step
                    ? "bg-emerald-500 text-white cursor-pointer"
                    : s === step
                      ? "bg-[#384959] text-white ring-2 ring-[#384959]/30"
                      : "bg-white border-2 border-[#BDDDFC] text-[#6A89A7] cursor-default"
                }`}
              >
                {s < step ? <CheckCircle2 size={14} /> : s}
              </button>
              {s < TOTAL_STEPS && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors ${s < step ? "bg-emerald-400" : "bg-[#BDDDFC]"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* ════════ STEP 1 — Title, Date, Time ════════ */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <StepHeader
                step={1}
                title="Meeting Details"
                subtitle="Give your meeting a clear title and set the schedule"
              />

              <div>
                <Label required>Meeting Title</Label>
                <input
                  className={inputCls}
                  placeholder="e.g. Parent–Teacher Meeting Q1"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Meeting Type</Label>
                  <select
                    className={inputCls}
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                  >
                    {MEETING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className={inputCls}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {MEETING_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label required>Academic Year</Label>
                {loadingAY ? (
                  <div className="text-xs text-[#6A89A7]">Loading…</div>
                ) : (
                  <select
                    className={inputCls}
                    value={form.academicYearId}
                    onChange={(e) => set("academicYearId", e.target.value)}
                  >
                    <option value="">— Select Academic Year —</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label required>Date</Label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.meetingDate}
                    onChange={(e) => set("meetingDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label required>Start Time</Label>
                  <input
                    type="time"
                    className={inputCls}
                    value={form.startTime}
                    onChange={(e) => set("startTime", e.target.value)}
                  />
                </div>
                <div>
                  <Label required>End Time</Label>
                  <input
                    type="time"
                    className={inputCls}
                    value={form.endTime}
                    onChange={(e) => set("endTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════ STEP 2 — Venue ════════ */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <StepHeader
                step={2}
                title="Meeting Place"
                subtitle="Where will this meeting be held?"
              />

              <div className="grid grid-cols-2 gap-3">
                {VENUE_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      set("venueType", value);
                      set("venueDetail", "");
                      set("meetingLink", "");
                    }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                      form.venueType === value
                        ? "border-[#384959] bg-[#384959]/5 text-[#384959]"
                        : "border-[#BDDDFC] hover:border-[#88BDF2] text-[#6A89A7]"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={
                        form.venueType === value
                          ? "text-[#384959]"
                          : "text-[#6A89A7]"
                      }
                    />
                    <span className="text-sm font-medium">{label}</span>
                    {form.venueType === value && (
                      <CheckCircle2
                        size={14}
                        className="ml-auto text-[#384959]"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Conditional detail input */}
              {selectedVenue?.detail === "room" && (
                <div>
                  <Label>Room Number</Label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Room 204, Lab 3"
                    value={form.venueDetail}
                    onChange={(e) => set("venueDetail", e.target.value)}
                  />
                </div>
              )}
              {selectedVenue?.detail === "link" && (
                <div>
                  <Label>Meeting Link</Label>
                  <input
                    className={inputCls}
                    placeholder="https://meet.google.com/…"
                    value={form.meetingLink}
                    onChange={(e) => set("meetingLink", e.target.value)}
                  />
                </div>
              )}
              {selectedVenue?.detail === "text" && (
                <div>
                  <Label>Specify Location</Label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Principal's Office"
                    value={form.venueDetail}
                    onChange={(e) => set("venueDetail", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ════════ STEP 3 — Class Section + Teacher / Coordinator ════════ */}
          {step === 3 &&
            (() => {
              // Group classSections by grade
              const gradeMap = {};
              classSections.forEach((cs) => {
                const g = cs.grade ?? "Other";
                if (!gradeMap[g]) gradeMap[g] = [];
                gradeMap[g].push(cs);
              });
              const sortedGrades = Object.keys(gradeMap).sort((a, b) => {
                const na = parseInt(a, 10),
                  nb = parseInt(b, 10);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return a.localeCompare(b);
              });

              // Currently expanded grade's sections
              const currentSections = activeGrade
                ? (gradeMap[activeGrade] ?? [])
                : [];
              const allGradeSectionIds = currentSections.map((cs) => cs.id);
              const selectedInGrade = allGradeSectionIds.filter((id) =>
                form.classSectionIds.includes(id),
              );
              const allSelected =
                allGradeSectionIds.length > 0 &&
                allGradeSectionIds.every((id) =>
                  form.classSectionIds.includes(id),
                );

              // For the active section's teacher panel
              const activeTeachers = activeSectionId
                ? (sectionData[activeSectionId]?.teachers ?? null)
                : null;
              const activeLoading = activeSectionId
                ? (sectionData[activeSectionId]?.loading ?? false)
                : false;

              // Same-coordinator mode for current grade
              const gradeCoordKey = `grade_${activeGrade}`;
              const sameCoord = gradeSameCoordinator[activeGrade] ?? null; // null=not chosen, true/false
              const gradeSharedCoordUserId =
                gradeSharedCoordinator[activeGrade] ?? "";

              // teachers for "same coordinator" picker — union of all selected sections in this grade
              const allGradeTeachers = [];
              const seenUids = new Set();
              selectedInGrade.forEach((sid) => {
                (sectionData[sid]?.teachers ?? []).forEach((t) => {
                  if (!seenUids.has(t.userId)) {
                    seenUids.add(t.userId);
                    allGradeTeachers.push(t);
                  }
                });
              });

              return (
                <div className="flex flex-col gap-5">
                  <StepHeader
                    step={3}
                    title="Class & Coordinator"
                    subtitle="Pick a grade, select sections, then set coordinators"
                  />

                  {/* ── Grade dropdown ── */}
                  {loadingCS ? (
                    <div className="text-xs text-[#6A89A7]">
                      Loading sections…
                    </div>
                  ) : (
                    <div>
                      <Label>Grade</Label>
                      <select
                        className={inputCls}
                        value={activeGrade}
                        onChange={(e) => {
                          const g = e.target.value;
                          setActiveGrade(g);
                          setActiveSectionId(null);
                          // load teachers for already-selected sections of this grade
                          if (g) {
                            (gradeMap[g] ?? []).forEach((cs) => {
                              if (form.classSectionIds.includes(cs.id))
                                loadTeachersForSection(cs.id);
                            });
                          }
                        }}
                      >
                        <option value="">— Select Grade —</option>
                        {sortedGrades.map((g) => {
                          const selCount = (gradeMap[g] ?? []).filter((cs) =>
                            form.classSectionIds.includes(cs.id),
                          ).length;
                          return (
                            <option key={g} value={g}>
                              Grade {g}
                              {selCount > 0 ? ` (${selCount} selected)` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* ── Sections for selected grade ── */}
                  {activeGrade && currentSections.length > 0 && (
                    <div className="border border-[#BDDDFC] rounded-xl overflow-hidden">
                      {/* Header with Select All */}
                      <div className="bg-[#BDDDFC]/30 px-4 py-2.5 flex items-center justify-between">
                        <p className="text-xs font-bold text-[#384959] uppercase tracking-wide">
                          Grade {activeGrade} — Sections
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (allSelected) {
                              // deselect all in this grade
                              setForm((f) => {
                                const newIds = f.classSectionIds.filter(
                                  (id) => !allGradeSectionIds.includes(id),
                                );
                                const newCoords = { ...f.sectionCoordinators };
                                const newParts = { ...f.sectionParticipants };
                                allGradeSectionIds.forEach((id) => {
                                  delete newCoords[id];
                                  delete newParts[id];
                                });
                                return {
                                  ...f,
                                  classSectionIds: newIds,
                                  sectionCoordinators: newCoords,
                                  sectionParticipants: newParts,
                                };
                              });
                              setActiveSectionId(null);
                              setGradeSameCoordinator((prev) => {
                                const n = { ...prev };
                                delete n[activeGrade];
                                return n;
                              });
                              setGradeSharedCoordinator((prev) => {
                                const n = { ...prev };
                                delete n[activeGrade];
                                return n;
                              });
                            } else {
                              // select all in this grade
                              const toAdd = allGradeSectionIds.filter(
                                (id) => !form.classSectionIds.includes(id),
                              );
                              setForm((f) => ({
                                ...f,
                                classSectionIds: [
                                  ...f.classSectionIds,
                                  ...toAdd,
                                ],
                              }));
                              toAdd.forEach((id) => loadTeachersForSection(id));
                            }
                          }}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            allSelected
                              ? "bg-[#384959] text-white border-[#384959]"
                              : "bg-white text-[#384959] border-[#BDDDFC] hover:border-[#88BDF2]"
                          }`}
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      {/* Section chips */}
                      <div className="p-3 flex flex-wrap gap-2">
                        {currentSections.map((cs) => {
                          const isSelected = form.classSectionIds.includes(
                            cs.id,
                          );
                          const hasCoord =
                            !!form.sectionCoordinators[cs.id] ||
                            (gradeSameCoordinator[activeGrade] === true &&
                              !!gradeSharedCoordUserId);
                          return (
                            <button
                              key={cs.id}
                              type="button"
                              onClick={() => {
                                if (!isSelected) {
                                  // select
                                  setForm((f) => ({
                                    ...f,
                                    classSectionIds: [
                                      ...f.classSectionIds,
                                      cs.id,
                                    ],
                                  }));
                                  loadTeachersForSection(cs.id);
                                  setActiveSectionId(cs.id);
                                } else {
                                  // deselect
                                  setForm((f) => {
                                    const newIds = f.classSectionIds.filter(
                                      (id) => id !== cs.id,
                                    );
                                    const newCoords = {
                                      ...f.sectionCoordinators,
                                    };
                                    const newParts = {
                                      ...f.sectionParticipants,
                                    };
                                    delete newCoords[cs.id];
                                    delete newParts[cs.id];
                                    return {
                                      ...f,
                                      classSectionIds: newIds,
                                      sectionCoordinators: newCoords,
                                      sectionParticipants: newParts,
                                    };
                                  });
                                  if (activeSectionId === cs.id)
                                    setActiveSectionId(null);
                                }
                              }}
                              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                                isSelected
                                  ? "border-[#384959] bg-[#384959]/5 text-[#384959]"
                                  : "border-[#BDDDFC] bg-white text-[#6A89A7] hover:border-[#88BDF2]"
                              }`}
                            >
                              {isSelected ? (
                                <CheckCircle2
                                  size={13}
                                  className="text-emerald-500"
                                />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#BDDDFC]" />
                              )}
                              Section {cs.section}
                              {isSelected && hasCoord && (
                                <Star
                                  size={10}
                                  fill="currentColor"
                                  className="text-amber-400 ml-0.5"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Coordinator mode selector (only when ≥1 section selected in this grade) ── */}
                  {activeGrade && selectedInGrade.length > 0 && (
                    <div className="border border-[#BDDDFC] rounded-xl overflow-hidden">
                      <div className="bg-[#BDDDFC]/30 px-4 py-2.5">
                        <p className="text-xs font-bold text-[#384959] uppercase tracking-wide">
                          Coordinator — Grade {activeGrade}
                        </p>
                        <p className="text-xs text-[#6A89A7] mt-0.5">
                          Same coordinator for all {selectedInGrade.length}{" "}
                          selected section
                          {selectedInGrade.length > 1 ? "s" : ""}?
                        </p>
                      </div>

                      {/* Yes / No toggle */}
                      <div className="flex gap-0 border-b border-[#BDDDFC]">
                        {[
                          { val: true, label: "Same for all" },
                          { val: false, label: "Different per section" },
                        ].map(({ val, label }) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => {
                              setGradeSameCoordinator((prev) => ({
                                ...prev,
                                [activeGrade]: val,
                              }));
                              if (!val) {
                                // clear shared, set active to first selected section
                                setGradeSharedCoordinator((prev) => ({
                                  ...prev,
                                  [activeGrade]: "",
                                }));
                                setActiveSectionId(selectedInGrade[0]);
                                loadTeachersForSection(selectedInGrade[0]);
                              } else {
                                // load all teachers for union
                                selectedInGrade.forEach((id) =>
                                  loadTeachersForSection(id),
                                );
                                setActiveSectionId(null);
                              }
                            }}
                            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                              sameCoord === val
                                ? "bg-[#384959] text-white"
                                : "bg-white text-[#6A89A7] hover:bg-[#BDDDFC]/30"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* ── Same coordinator: pick from union of all selected sections' teachers ── */}
                      {sameCoord === true && (
                        <div className="p-3 flex flex-col gap-2">
                          {allGradeTeachers.length === 0 ? (
                            <p className="text-xs text-[#6A89A7] italic py-1">
                              No teachers found in selected sections.
                            </p>
                          ) : (
                            allGradeTeachers.map((t) => {
                              const uid = t.userId;
                              const isCoord = gradeSharedCoordUserId === uid;
                              // check if added as participant in any selected section of this grade
                              const isParticipant = selectedInGrade.some(
                                (sid) =>
                                  (
                                    form.sectionParticipants[sid] ?? []
                                  ).includes(uid),
                              );
                              const isAdded = isCoord || isParticipant;
                              return (
                                <div
                                  key={uid}
                                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                                    isCoord
                                      ? "border-amber-400 bg-amber-50"
                                      : isAdded
                                        ? "border-[#88BDF2] bg-[#BDDDFC]/20"
                                        : "border-[#BDDDFC] bg-white hover:border-[#88BDF2]"
                                  }`}
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-[#384959]">
                                      {t.name}
                                    </p>
                                    <p className="text-xs text-[#6A89A7]">
                                      {t.subjects?.join(", ")}
                                    </p>
                                  </div>
                                  {/* In-charge / Coordinator star */}
                                  <div className="flex flex-col items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newUid = isCoord ? "" : uid;
                                        setGradeSharedCoordinator((prev) => ({
                                          ...prev,
                                          [activeGrade]: newUid,
                                        }));
                                        setForm((f) => {
                                          const newCoords = {
                                            ...f.sectionCoordinators,
                                          };
                                          selectedInGrade.forEach((sid) => {
                                            newCoords[sid] = newUid;
                                          });
                                          return {
                                            ...f,
                                            sectionCoordinators: newCoords,
                                          };
                                        });
                                      }}
                                      className={`p-1.5 rounded-lg transition-colors ${isCoord ? "text-amber-500 bg-amber-100" : "text-[#BDDDFC] hover:text-amber-400"}`}
                                    >
                                      <Star
                                        size={14}
                                        fill={isCoord ? "currentColor" : "none"}
                                      />
                                    </button>
                                    <span className="text-[9px] text-[#6A89A7] leading-none">
                                      In-charge
                                    </span>
                                  </div>
                                  {/* Add / Attendee — applied to ALL selected sections in this grade */}
                                  <div className="flex flex-col items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setForm((f) => {
                                          const newParts = {
                                            ...f.sectionParticipants,
                                          };
                                          selectedInGrade.forEach((sid) => {
                                            const current = newParts[sid] ?? [];
                                            newParts[sid] = isParticipant
                                              ? current.filter((x) => x !== uid)
                                              : current.includes(uid)
                                                ? current
                                                : [...current, uid];
                                          });
                                          return {
                                            ...f,
                                            sectionParticipants: newParts,
                                          };
                                        });
                                      }}
                                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                        isAdded
                                          ? "bg-[#384959] text-white border-[#384959]"
                                          : "bg-white text-[#384959] border-[#BDDDFC] hover:border-[#88BDF2]"
                                      }`}
                                    >
                                      {isAdded ? "Added" : "Add"}
                                    </button>
                                    <span className="text-[9px] text-[#6A89A7] leading-none">
                                      Attendee
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          {gradeSharedCoordUserId && (
                            <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                              ✓ Applied as coordinator for all{" "}
                              {selectedInGrade.length} sections in Grade{" "}
                              {activeGrade}
                            </p>
                          )}
                        </div>
                      )}

                      {/* ── Different coordinator: section tab switcher ── */}
                      {sameCoord === false && (
                        <div>
                          {/* Section tabs */}
                          <div className="flex gap-0 border-b border-[#BDDDFC] overflow-x-auto">
                            {selectedInGrade.map((sid) => {
                              const cs = classSections.find(
                                (c) => c.id === sid,
                              );
                              const hasCoord = !!form.sectionCoordinators[sid];
                              return (
                                <button
                                  key={sid}
                                  type="button"
                                  onClick={() => {
                                    setActiveSectionId(sid);
                                    loadTeachersForSection(sid);
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                                    activeSectionId === sid
                                      ? "border-[#384959] text-[#384959] bg-white"
                                      : "border-transparent text-[#6A89A7] hover:text-[#384959] bg-white"
                                  }`}
                                >
                                  {hasCoord && (
                                    <Star
                                      size={9}
                                      fill="currentColor"
                                      className="text-amber-400"
                                    />
                                  )}
                                  {cs?.name ?? sid}
                                </button>
                              );
                            })}
                          </div>

                          {/* Teacher list for active tab */}
                          <div className="p-3 flex flex-col gap-2">
                            {!activeSectionId ||
                            !selectedInGrade.includes(activeSectionId) ? (
                              <p className="text-xs text-[#6A89A7] italic py-1">
                                Select a section tab above.
                              </p>
                            ) : activeLoading ? (
                              <div className="flex items-center gap-2 text-xs text-[#6A89A7] py-2">
                                <Loader2 size={13} className="animate-spin" />{" "}
                                Loading teachers…
                              </div>
                            ) : !activeTeachers ||
                              activeTeachers.length === 0 ? (
                              <p className="text-xs text-[#6A89A7] italic py-2">
                                No teachers assigned.
                              </p>
                            ) : (
                              activeTeachers.map((t) => {
                                const uid = t.userId;
                                const isCoord =
                                  form.sectionCoordinators[activeSectionId] ===
                                  uid;
                                const isParticipant = (
                                  form.sectionParticipants[activeSectionId] ??
                                  []
                                ).includes(uid);
                                const isAdded = isCoord || isParticipant;
                                return (
                                  <div
                                    key={uid}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                                      isCoord
                                        ? "border-amber-400 bg-amber-50"
                                        : isAdded
                                          ? "border-[#88BDF2] bg-[#BDDDFC]/20"
                                          : "border-[#BDDDFC] bg-white hover:border-[#88BDF2]"
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-[#384959]">
                                        {t.name}
                                      </p>
                                      <p className="text-xs text-[#6A89A7]">
                                        {t.subjects?.join(", ")}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <button
                                        type="button"
                                        title="Set as coordinator"
                                        onClick={() =>
                                          setSectionCoordinator(
                                            activeSectionId,
                                            uid,
                                          )
                                        }
                                        className={`p-1.5 rounded-lg transition-colors ${isCoord ? "text-amber-500 bg-amber-100" : "text-[#BDDDFC] hover:text-amber-400"}`}
                                      >
                                        <Star
                                          size={14}
                                          fill={
                                            isCoord ? "currentColor" : "none"
                                          }
                                        />
                                      </button>
                                      <span className="text-[9px] text-[#6A89A7] leading-none">
                                        In-charge
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSectionTeacher(
                                            activeSectionId,
                                            uid,
                                          )
                                        }
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                          isAdded
                                            ? "bg-[#384959] text-white border-[#384959]"
                                            : "bg-white text-[#384959] border-[#BDDDFC] hover:border-[#88BDF2]"
                                        }`}
                                      >
                                        {isAdded ? "Added" : "Add"}
                                      </button>
                                      <span className="text-[9px] text-[#6A89A7] leading-none">
                                        Attendee
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── All selected sections summary (across all grades) ── */}
                  {form.classSectionIds.length > 0 && (
                    <div className="bg-[#BDDDFC]/10 border border-[#BDDDFC] rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-[#384959] mb-2">
                        All Selected Sections
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.classSectionIds.map((id) => {
                          const cs = classSections.find((c) => c.id === id);
                          const hasCoord = !!form.sectionCoordinators[id];
                          return (
                            <span
                              key={id}
                              className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#BDDDFC] rounded-full text-xs text-[#384959]"
                            >
                              {hasCoord && (
                                <Star
                                  size={9}
                                  fill="currentColor"
                                  className="text-amber-400"
                                />
                              )}
                              {cs?.name ?? id}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── External / Other participant ── */}
                  <div>
                    <Label>Add External / Other Participant</Label>
                    <div className="flex gap-2">
                      <input
                        className={`${inputCls} flex-1`}
                        placeholder="Name (optional)"
                        value={extName}
                        onChange={(e) => setExtName(e.target.value)}
                      />
                      <input
                        className={`${inputCls} flex-1`}
                        placeholder="Email"
                        value={extEmail}
                        onChange={(e) => setExtEmail(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={addExternal}
                        className="px-3 py-2 bg-[#384959] text-white rounded-lg text-sm hover:bg-[#6A89A7] transition-colors"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {form.externalParticipants.map((ep, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-[#BDDDFC]/30 rounded-lg px-3 py-1.5 text-xs text-[#384959]"
                        >
                          <span>
                            {ep.name && <strong>{ep.name} — </strong>}
                            {ep.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeExternal(i)}
                            className="text-rose-400 hover:text-rose-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto-invite parents toggle (only for PARENT type) */}
                  {form.type === "PARENT" &&
                    form.classSectionIds.length > 0 && (
                      <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-purple-800">
                            Auto-invite Parents
                          </p>
                          <p className="text-xs text-purple-600">
                            Automatically add all parents of enrolled students
                            in selected classes
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            set("autoInviteParents", !form.autoInviteParents)
                          }
                          className={`relative w-10 h-5 rounded-full transition-colors ${form.autoInviteParents ? "bg-purple-500" : "bg-gray-200"}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.autoInviteParents ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </button>
                      </div>
                    )}
                </div>
              );
            })()}

          {/* ════════ STEP 4 — Agenda / Description ════════ */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <StepHeader
                step={4}
                title="Topic & Agenda"
                subtitle="Describe the purpose and agenda for this meeting"
              />

              <div>
                <Label>Topic / Agenda</Label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={7}
                  placeholder="Enter meeting agenda, discussion points, or any relevant notes for participants…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* ════════ STEP 5 — Review & Confirm ════════ */}
          {step === 5 && (
            <div className="flex flex-col gap-4">
              <StepHeader
                step={5}
                title="Review & Confirm"
                subtitle="Double-check all details before scheduling"
              />

              <div className="flex flex-col gap-3">
                {/* Title / Type / Status */}
                <div className="bg-[#BDDDFC]/20 rounded-xl p-4 border border-[#BDDDFC]">
                  <p className="text-base font-bold text-[#384959]">
                    {form.title || "—"}
                  </p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#384959] text-white text-xs rounded-full font-medium">
                      {form.type}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      {form.status}
                    </span>
                    {academicYears.find(
                      (y) => y.id === form.academicYearId,
                    ) && (
                      <span className="px-2 py-0.5 bg-[#BDDDFC] text-[#384959] text-xs rounded-full font-medium">
                        {
                          academicYears.find(
                            (y) => y.id === form.academicYearId,
                          )?.name
                        }
                      </span>
                    )}
                  </div>
                </div>

                {/* Date / Time / Venue */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-[#BDDDFC] rounded-xl p-3 flex items-start gap-2">
                    <CalendarDays
                      size={15}
                      className="text-[#6A89A7] mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-[10px] text-[#6A89A7] font-semibold uppercase">
                        Date
                      </p>
                      <p className="text-sm text-[#384959] font-medium">
                        {form.meetingDate
                          ? new Date(form.meetingDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-[#BDDDFC] rounded-xl p-3 flex items-start gap-2">
                    <Clock4
                      size={15}
                      className="text-[#6A89A7] mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-[10px] text-[#6A89A7] font-semibold uppercase">
                        Time
                      </p>
                      <p className="text-sm text-[#384959] font-medium">
                        {form.startTime} – {form.endTime}
                      </p>
                    </div>
                  </div>
                  {form.venueType && (
                    <div className="bg-white border border-[#BDDDFC] rounded-xl p-3 flex items-start gap-2">
                      <MapPin
                        size={15}
                        className="text-[#6A89A7] mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-[10px] text-[#6A89A7] font-semibold uppercase">
                          Venue
                        </p>
                        <p className="text-sm text-[#384959] font-medium">
                          {
                            VENUE_TYPES.find((v) => v.value === form.venueType)
                              ?.label
                          }
                          {form.venueDetail ? ` — ${form.venueDetail}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {form.classSectionIds.length > 0 && (
                    <div className="bg-white border border-[#BDDDFC] rounded-xl p-3 flex items-start gap-2">
                      <BookOpen
                        size={15}
                        className="text-[#6A89A7] mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-[10px] text-[#6A89A7] font-semibold uppercase">
                          Classes ({form.classSectionIds.length})
                        </p>
                        <p className="text-sm text-[#384959] font-medium">
                          {form.classSectionIds
                            .map(
                              (id) =>
                                classSections.find((c) => c.id === id)?.name ??
                                id,
                            )
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Per-section coordinators */}
                {(() => {
                  // Build a flat userId → name map from ALL loaded section teacher data
                  const userNameMap = {};
                  Object.values(sectionData).forEach(({ teachers = [] }) => {
                    (teachers || []).forEach((t) => {
                      if (t.userId) userNameMap[t.userId] = t.name;
                    });
                  });
                  // Deduplicate — if multiple sections share same coordinator, show one card
                  const seen = new Set();
                  const entries = Object.entries(
                    form.sectionCoordinators,
                  ).filter(([, uid]) => uid);
                  return entries.map(([sectionId, uid]) => {
                    const sectionName =
                      classSections.find((c) => c.id === sectionId)?.name ??
                      sectionId;
                    const teacherName = userNameMap[uid] ?? uid;
                    const isDuplicate = seen.has(uid);
                    seen.add(uid);
                    return (
                      <div
                        key={sectionId}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2"
                      >
                        <Star
                          size={14}
                          className="text-amber-500"
                          fill="currentColor"
                        />
                        <div>
                          <p className="text-[10px] text-amber-700 font-semibold uppercase">
                            Coordinator — {sectionName}
                          </p>
                          <p className="text-sm text-amber-900 font-medium">
                            {teacherName}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Participants summary */}
                <div className="bg-white border border-[#BDDDFC] rounded-xl p-3 flex items-center gap-2">
                  <Users size={15} className="text-[#6A89A7]" />
                  <div>
                    <p className="text-[10px] text-[#6A89A7] font-semibold uppercase">
                      Participants
                    </p>
                    <p className="text-sm text-[#384959] font-medium">
                      {Object.values(form.sectionParticipants).reduce(
                        (acc, ids) => acc + ids.length,
                        0,
                      ) +
                        Object.values(form.sectionCoordinators).filter(Boolean)
                          .length}{" "}
                      staff
                      {form.externalParticipants.length > 0 &&
                        `, ${form.externalParticipants.length} external`}
                      {form.autoInviteParents && ", + parents auto-added"}
                    </p>
                  </div>
                </div>

                {/* Agenda preview */}
                {form.description && (
                  <div className="bg-white border border-[#BDDDFC] rounded-xl p-3">
                    <p className="text-[10px] text-[#6A89A7] font-semibold uppercase mb-1">
                      Agenda
                    </p>
                    <p className="text-sm text-[#384959] line-clamp-3 whitespace-pre-line">
                      {form.description}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#BDDDFC] bg-white">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((s) => s - 1) : onClose())}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#6A89A7] hover:text-[#384959] transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              disabled={!canProceed()}
              onClick={() => {
                setError("");
                setStep((s) => s + 1);
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#384959] text-white text-sm font-semibold rounded-xl hover:bg-[#6A89A7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#384959] text-white text-sm font-semibold rounded-xl hover:bg-[#6A89A7] transition-colors disabled:opacity-60 shadow-sm"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Schedule Meeting"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
