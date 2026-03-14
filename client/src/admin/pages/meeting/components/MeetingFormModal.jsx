// client/src/admin/pages/meeting/components/MeetingFormModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, ChevronRight, ChevronLeft, CheckCircle2,
  MapPin, Clock4, CalendarDays, Users, BookOpen, Wifi,
  Building2, MicVocal, HelpCircle, Star, Plus, Trash2,
} from "lucide-react";
import {
  createMeeting, updateMeeting, fetchAcademicYears,
  fetchClassSections, fetchTeachersByClassSection,
} from "../api/meetingsApi";

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2",
  deep: "#384959", bg: "#EDF3FA", white: "#FFFFFF",
  border: "#C8DCF0", borderLight: "#DDE9F5", text: "#243340", textLight: "#6A89A7",
};

const MEETING_TYPES    = ["STAFF", "PARENT", "STUDENT", "GENERAL", "BOARD", "CUSTOM"];
const MEETING_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"];
const VENUE_TYPES = [
  { value: "CLASSROOM",  label: "Classroom",   icon: BookOpen,   detail: "room" },
  { value: "AUDITORIUM", label: "Auditorium",   icon: MicVocal,  detail: null },
  { value: "STAFFROOM",  label: "Staff Room",   icon: Building2, detail: null },
  { value: "ONLINE",     label: "Online",       icon: Wifi,       detail: "link" },
  { value: "OTHER",      label: "Other",        icon: HelpCircle, detail: "text" },
];
const TOTAL_STEPS = 5;

const INITIAL_FORM = {
  title: "", meetingDate: "", startTime: "", endTime: "",
  venueType: "", venueDetail: "", meetingLink: "",
  type: "GENERAL", status: "SCHEDULED", academicYearId: "",
  classSectionId: "", classSectionIds: [],
  sectionCoordinators: {}, sectionParticipants: {},
  coordinatorUserId: "", participantUserIds: [],
  externalParticipants: [], autoInviteParents: false, description: "",
};

/* ── Shared input/select style ── */
const inp = (extra = {}) => ({
  width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10,
  padding: "9px 12px", fontSize: 13, color: C.text, background: C.bg,
  outline: "none",  fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
  transition: "border-color 0.15s", ...extra,
});

function Label({ children, required }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children} {required && <span style={{ color: "#F43F5E", fontWeight: 400, textTransform: "none" }}>*</span>}
    </label>
  );
}

function StepHeader({ step, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {step}
        </span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>{title}</h3>
      </div>
      {subtitle && <p style={{ margin: 0, fontSize: 12, color: C.textLight, paddingLeft: 36 }}>{subtitle}</p>}
    </div>
  );
}

export default function MeetingFormModal({ meeting = null, onClose, onSaved }) {
  const isEdit = !!meeting;
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState(INITIAL_FORM);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const [academicYears,  setAcademicYears]  = useState([]);
  const [classSections,  setClassSections]  = useState([]);
  const [sectionData,    setSectionData]    = useState({});
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeGrade,    setActiveGrade]    = useState("");
  const [gradeSameCoord, setGradeSameCoord] = useState({});
  const [gradeSharedCoord, setGradeSharedCoord] = useState({});
  const [loadingAY,      setLoadingAY]      = useState(true);
  const [loadingCS,      setLoadingCS]      = useState(true);
  const [extName,        setExtName]        = useState("");
  const [extEmail,       setExtEmail]       = useState("");

  useEffect(() => {
    fetchAcademicYears()
      .then((res) => {
        const years = Array.isArray(res) ? res : (res?.data ?? res?.academicYears ?? []);
        setAcademicYears(years);
        const active = years.find((y) => y.isActive);
        if (active && !isEdit) setForm((f) => ({ ...f, academicYearId: active.id }));
      }).catch(() => {}).finally(() => setLoadingAY(false));

    fetchClassSections()
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res?.data ?? res?.classSections ?? []);
        setClassSections(arr);
      }).catch(() => {}).finally(() => setLoadingCS(false));
  }, []);

  useEffect(() => {
    if (!meeting) return;
    const sectionIds = meeting.classes?.map((c) => c.classSectionId) ?? [];
    const coordP = meeting.participants?.find((p) => p.isCoordinator);
    const sectionCoordinators = {};
    if (coordP?.userId && sectionIds.length > 0) sectionCoordinators[sectionIds[0]] = coordP.userId;
    const participantIds = meeting.participants?.filter((p) => p.type === "USER" && !p.isCoordinator && p.userId).map((p) => p.userId) ?? [];
    const sectionParticipants = {};
    if (sectionIds.length > 0 && participantIds.length > 0) sectionParticipants[sectionIds[0]] = participantIds;
    setForm({
      title: meeting.title ?? "", meetingDate: meeting.meetingDate ? meeting.meetingDate.split("T")[0] : "",
      startTime: meeting.startTime ?? "", endTime: meeting.endTime ?? "",
      venueType: meeting.venueType ?? "", venueDetail: meeting.venueDetail ?? "",
      meetingLink: meeting.meetingLink ?? "", type: meeting.type ?? "GENERAL",
      status: meeting.status ?? "SCHEDULED", academicYearId: meeting.academicYearId ?? "",
      classSectionId: sectionIds[0] ?? "", classSectionIds: sectionIds,
      sectionCoordinators, sectionParticipants,
      coordinatorUserId: coordP?.userId ?? "", participantUserIds: participantIds,
      externalParticipants: meeting.participants?.filter((p) => p.type === "EXTERNAL").map((p) => ({ name: p.name ?? "", email: p.email ?? "" })) ?? [],
      autoInviteParents: false, description: meeting.description ?? "",
    });
    if (sectionIds.length > 0) setActiveSectionId(sectionIds[0]);
  }, [meeting]);

  const loadTeachersForSection = useCallback(async (sectionId) => {
    if (!sectionId || sectionData[sectionId]?.teachers) return;
    setSectionData((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], loading: true, teachers: prev[sectionId]?.teachers ?? null } }));
    try {
      const res = await fetchTeachersByClassSection(sectionId, form.academicYearId);
      setSectionData((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], loading: false, teachers: res?.teachers ?? [] } }));
    } catch {
      setSectionData((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], loading: false, teachers: [] } }));
    }
  }, [sectionData, form.academicYearId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const selectedVenue = VENUE_TYPES.find((v) => v.value === form.venueType);

  const toggleSectionTeacher = (sectionId, uid) => {
    setForm((f) => {
      const cur = f.sectionParticipants[sectionId] ?? [];
      return { ...f, sectionParticipants: { ...f.sectionParticipants, [sectionId]: cur.includes(uid) ? cur.filter((x) => x !== uid) : [...cur, uid] } };
    });
  };

  const setSectionCoordinator = (sectionId, uid) => {
    setForm((f) => ({ ...f, sectionCoordinators: { ...f.sectionCoordinators, [sectionId]: f.sectionCoordinators[sectionId] === uid ? "" : uid } }));
  };

  const toggleSection = (sectionId) => {
    setForm((f) => {
      const isSelected = f.classSectionIds.includes(sectionId);
      if (isSelected) {
        const newCoords = { ...f.sectionCoordinators }; const newParts = { ...f.sectionParticipants };
        delete newCoords[sectionId]; delete newParts[sectionId];
        return { ...f, classSectionIds: f.classSectionIds.filter((id) => id !== sectionId), sectionCoordinators: newCoords, sectionParticipants: newParts };
      }
      return { ...f, classSectionIds: [...f.classSectionIds, sectionId] };
    });
    if (!form.classSectionIds.includes(sectionId)) { setActiveSectionId(sectionId); loadTeachersForSection(sectionId); }
    else setActiveSectionId((prev) => (prev === sectionId ? null : prev));
  };

  const addExternal = () => {
    if (!extEmail) return;
    set("externalParticipants", [...form.externalParticipants, { name: extName, email: extEmail }]);
    setExtName(""); setExtEmail("");
  };
  const removeExternal = (i) => set("externalParticipants", form.externalParticipants.filter((_, idx) => idx !== i));

  const canProceed = useCallback(() => {
    if (step === 1) return form.title.trim() && form.meetingDate && form.startTime && form.endTime;
    if (step === 2) return !!form.venueType;
    return true;
  }, [step, form]);

  const handleSubmit = async () => {
    if (!form.title || !form.meetingDate || !form.startTime || !form.endTime) { setError("Please fill all required fields."); return; }
    setSaving(true); setError("");
    try {
      const perSectionCoordinators = Object.entries(form.sectionCoordinators).filter(([, uid]) => uid).map(([classSectionId, userId]) => ({ userId, classSectionId }));
      const coordinatorUserIds = [...new Set(perSectionCoordinators.map((e) => e.userId))];
      const allParticipantIds = new Set();
      Object.values(form.sectionParticipants).forEach((ids) => ids.forEach((id) => allParticipantIds.add(id)));
      coordinatorUserIds.forEach((id) => allParticipantIds.delete(id));
      const payload = { ...form, classSectionIds: form.classSectionIds, classSectionId: form.classSectionIds[0] ?? "", coordinatorUserId: coordinatorUserIds[0] ?? "", participantUserIds: [...allParticipantIds], perSectionCoordinators };
      if (isEdit) await updateMeeting(meeting.id, payload); else await createMeeting(payload);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  /* ── STEP 3 grade/section logic (computed once per render) ── */
  const gradeMap = {};
  classSections.forEach((cs) => { const g = cs.grade ?? "Other"; if (!gradeMap[g]) gradeMap[g] = []; gradeMap[g].push(cs); });
  const sortedGrades = Object.keys(gradeMap).sort((a, b) => { const na = parseInt(a), nb = parseInt(b); if (!isNaN(na) && !isNaN(nb)) return na - nb; return a.localeCompare(b); });
  const currentSections = activeGrade ? (gradeMap[activeGrade] ?? []) : [];
  const allGradeSectionIds = currentSections.map((cs) => cs.id);
  const selectedInGrade = allGradeSectionIds.filter((id) => form.classSectionIds.includes(id));
  const allSelected = allGradeSectionIds.length > 0 && allGradeSectionIds.every((id) => form.classSectionIds.includes(id));
  const activeTeachers = activeSectionId ? (sectionData[activeSectionId]?.teachers ?? null) : null;
  const activeLoading  = activeSectionId ? (sectionData[activeSectionId]?.loading ?? false) : false;
  const sameCoord = gradeSameCoord[activeGrade] ?? null;
  const gradeSharedCoordUserId = gradeSharedCoord[activeGrade] ?? "";
  const allGradeTeachers = [];
  const seenUids = new Set();
  selectedInGrade.forEach((sid) => {
    (sectionData[sid]?.teachers ?? []).forEach((t) => { if (!seenUids.has(t.userId)) { seenUids.add(t.userId); allGradeTeachers.push(t); } });
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(56,73,89,0.45)", backdropFilter: "blur(8px)", padding: 16,  fontFamily: "'Inter', sans-serif", }}>
      <div style={{ background: C.white, borderRadius: 24, boxShadow: "0 24px 80px rgba(56,73,89,0.2)", width: "100%", maxWidth: 580, maxHeight: "93vh", display: "flex", flexDirection: "column", border: `1.5px solid ${C.borderLight}`, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${C.bg} 0%, ${C.white} 100%)`, borderBottom: `1.5px solid ${C.borderLight}`, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{isEdit ? "Edit Meeting" : "Schedule Meeting"}</h2>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight }}>Step {step} of {TOTAL_STEPS}</p>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${C.borderLight}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `${C.mist}88`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.bg)}>
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: `${C.mist}66`, width: "100%" }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.sky}, ${C.deep})`, width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 22px", borderBottom: `1px solid ${C.borderLight}`, background: `${C.bg}55`, gap: 0 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <React.Fragment key={s}>
              <button
                onClick={() => s < step && setStep(s)}
                style={{ width: 28, height: 28, borderRadius: "50%", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: s < step ? "pointer" : "default", transition: "all 0.2s",
                  ...(s < step  ? { background: "#22C55E", color: "#fff" } :
                      s === step ? { background: C.deep,   color: "#fff", boxShadow: `0 0 0 3px ${C.mist}` } :
                                   { background: C.white,  color: C.textLight, border: `2px solid ${C.borderLight}` }) }}>
                {s < step ? <CheckCircle2 size={13} /> : s}
              </button>
              {s < TOTAL_STEPS && (
                <div style={{ flex: 1, height: 2, margin: "0 4px", background: s < step ? "#22C55E" : C.borderLight, transition: "background 0.3s" }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px" }}>

          {/* ═══ STEP 1 — Details ═══ */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <StepHeader step={1} title="Meeting Details" subtitle="Give your meeting a clear title and set the schedule" />
              <div>
                <Label required>Meeting Title</Label>
                <input style={inp()} placeholder="e.g. Parent–Teacher Meeting Q1" value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus
                  onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label required>Meeting Type</Label>
                  <select style={inp()} value={form.type} onChange={(e) => set("type", e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)}>
                    {MEETING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select style={inp()} value={form.status} onChange={(e) => set("status", e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)}>
                    {MEETING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label required>Academic Year</Label>
                {loadingAY ? <p style={{ fontSize: 12, color: C.textLight }}>Loading…</p> : (
                  <select style={inp()} value={form.academicYearId} onChange={(e) => set("academicYearId", e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)}>
                    <option value="">— Select Academic Year —</option>
                    {academicYears.map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                  </select>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Date", type: "date", key: "meetingDate" },
                  { label: "Start Time", type: "time", key: "startTime" },
                  { label: "End Time",   type: "time", key: "endTime" },
                ].map(({ label, type, key }) => (
                  <div key={key}>
                    <Label required>{label}</Label>
                    <input type={type} style={inp()} value={form[key]} onChange={(e) => set(key, e.target.value)}
                      onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ STEP 2 — Venue ═══ */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <StepHeader step={2} title="Meeting Place" subtitle="Where will this meeting be held?" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {VENUE_TYPES.map(({ value, label, icon: Icon }) => {
                  const selected = form.venueType === value;
                  return (
                    <button key={value} type="button"
                      onClick={() => { set("venueType", value); set("venueDetail", ""); set("meetingLink", ""); }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, border: `2px solid ${selected ? C.deep : C.border}`, background: selected ? `${C.deep}08` : C.white, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                      onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.borderColor = C.sky; e.currentTarget.style.background = `${C.sky}08`; } }}
                      onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.white; } }}>
                      <Icon size={17} color={selected ? C.deep : C.textLight} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: selected ? C.deep : C.textLight }}>{label}</span>
                      {selected && <CheckCircle2 size={14} color={C.deep} style={{ marginLeft: "auto" }} />}
                    </button>
                  );
                })}
              </div>
              {selectedVenue?.detail === "room" && (
                <div><Label>Room Number</Label>
                  <input style={inp()} placeholder="e.g. Room 204" value={form.venueDetail} onChange={(e) => set("venueDetail", e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} /></div>
              )}
              {selectedVenue?.detail === "link" && (
                <div><Label>Meeting Link</Label>
                  <input style={inp()} placeholder="https://meet.google.com/…" value={form.meetingLink} onChange={(e) => set("meetingLink", e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} /></div>
              )}
              {selectedVenue?.detail === "text" && (
                <div><Label>Specify Location</Label>
                  <input style={inp()} placeholder="e.g. Principal's Office" value={form.venueDetail} onChange={(e) => set("venueDetail", e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} /></div>
              )}
            </div>
          )}

          {/* ═══ STEP 3 — Class & Coordinator ═══ */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <StepHeader step={3} title="Class & Coordinator" subtitle="Pick a grade, select sections, then set coordinators" />

              {loadingCS ? <p style={{ fontSize: 12, color: C.textLight }}>Loading sections…</p> : (
                <div>
                  <Label>Grade</Label>
                  <select style={inp()} value={activeGrade}
                    onChange={(e) => {
                      const g = e.target.value; setActiveGrade(g); setActiveSectionId(null);
                      if (g) (gradeMap[g] ?? []).forEach((cs) => { if (form.classSectionIds.includes(cs.id)) loadTeachersForSection(cs.id); });
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)}>
                    <option value="">— Select Grade —</option>
                    {sortedGrades.map((g) => {
                      const selCount = (gradeMap[g] ?? []).filter((cs) => form.classSectionIds.includes(cs.id)).length;
                      return <option key={g} value={g}>Grade {g}{selCount > 0 ? ` (${selCount} selected)` : ""}</option>;
                    })}
                  </select>
                </div>
              )}

              {/* Sections */}
              {activeGrade && currentSections.length > 0 && (
                <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Grade {activeGrade} — Sections</p>
                    <button type="button"
                      onClick={() => {
                        if (allSelected) {
                          setForm((f) => {
                            const newCoords = { ...f.sectionCoordinators }; const newParts = { ...f.sectionParticipants };
                            allGradeSectionIds.forEach((id) => { delete newCoords[id]; delete newParts[id]; });
                            return { ...f, classSectionIds: f.classSectionIds.filter((id) => !allGradeSectionIds.includes(id)), sectionCoordinators: newCoords, sectionParticipants: newParts };
                          });
                          setActiveSectionId(null);
                          setGradeSameCoord((prev) => { const n = { ...prev }; delete n[activeGrade]; return n; });
                          setGradeSharedCoord((prev) => { const n = { ...prev }; delete n[activeGrade]; return n; });
                        } else {
                          const toAdd = allGradeSectionIds.filter((id) => !form.classSectionIds.includes(id));
                          setForm((f) => ({ ...f, classSectionIds: [...f.classSectionIds, ...toAdd] }));
                          toAdd.forEach((id) => loadTeachersForSection(id));
                        }
                      }}
                      style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 99, cursor: "pointer", border: `1.5px solid ${allSelected ? C.deep : C.borderLight}`, background: allSelected ? C.deep : C.white, color: allSelected ? "#fff" : C.deep, transition: "all 0.15s" }}>
                      {allSelected ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {currentSections.map((cs) => {
                      const isSelected = form.classSectionIds.includes(cs.id);
                      const hasCoord   = !!form.sectionCoordinators[cs.id] || (gradeSameCoord[activeGrade] === true && !!gradeSharedCoordUserId);
                      return (
                        <button key={cs.id} type="button"
                          onClick={() => {
                            if (!isSelected) {
                              setForm((f) => ({ ...f, classSectionIds: [...f.classSectionIds, cs.id] }));
                              loadTeachersForSection(cs.id); setActiveSectionId(cs.id);
                            } else {
                              setForm((f) => {
                                const newCoords = { ...f.sectionCoordinators }; const newParts = { ...f.sectionParticipants };
                                delete newCoords[cs.id]; delete newParts[cs.id];
                                return { ...f, classSectionIds: f.classSectionIds.filter((id) => id !== cs.id), sectionCoordinators: newCoords, sectionParticipants: newParts };
                              });
                              if (activeSectionId === cs.id) setActiveSectionId(null);
                            }
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: `2px solid ${isSelected ? C.deep : C.border}`, background: isSelected ? `${C.deep}08` : C.white, fontSize: 12, fontWeight: 500, color: isSelected ? C.deep : C.textLight, cursor: "pointer", transition: "all 0.15s" }}>
                          {isSelected ? <CheckCircle2 size={12} color="#22C55E" /> : <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${C.border}` }} />}
                          Section {cs.section}
                          {isSelected && hasCoord && <Star size={9} fill="currentColor" color="#F59E0B" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Coordinator mode */}
              {activeGrade && selectedInGrade.length > 0 && (
                <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, padding: "10px 14px" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Coordinator — Grade {activeGrade}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight }}>Same coordinator for all {selectedInGrade.length} section{selectedInGrade.length > 1 ? "s" : ""}?</p>
                  </div>
                  <div style={{ display: "flex", borderBottom: `1px solid ${C.borderLight}` }}>
                    {[{ val: true, label: "Same for all" }, { val: false, label: "Different per section" }].map(({ val, label }) => (
                      <button key={String(val)} type="button"
                        onClick={() => {
                          setGradeSameCoord((prev) => ({ ...prev, [activeGrade]: val }));
                          if (!val) { setGradeSharedCoord((prev) => ({ ...prev, [activeGrade]: "" })); setActiveSectionId(selectedInGrade[0]); loadTeachersForSection(selectedInGrade[0]); }
                          else selectedInGrade.forEach((id) => loadTeachersForSection(id));
                          if (val) setActiveSectionId(null);
                        }}
                        style={{ flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.15s",
                          ...(sameCoord === val ? { background: C.deep, color: "#fff" } : { background: C.white, color: C.textLight }) }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Same coordinator picker */}
                  {sameCoord === true && (
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {allGradeTeachers.length === 0
                        ? <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>No teachers found.</p>
                        : allGradeTeachers.map((t) => {
                            const uid = t.userId;
                            const isCoord  = gradeSharedCoordUserId === uid;
                            const isParticipant = selectedInGrade.some((sid) => (form.sectionParticipants[sid] ?? []).includes(uid));
                            const isAdded  = isCoord || isParticipant;
                            return (
                              <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${isCoord ? "#FDE68A" : isAdded ? C.sky : C.borderLight}`, background: isCoord ? "#FFFBEB" : isAdded ? `${C.sky}10` : C.white, transition: "all 0.15s" }}>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.text }}>{t.name}</p>
                                  <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{t.subjects?.join(", ")}</p>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                  <button type="button"
                                    onClick={() => {
                                      const newUid = isCoord ? "" : uid;
                                      setGradeSharedCoord((prev) => ({ ...prev, [activeGrade]: newUid }));
                                      setForm((f) => { const nc = { ...f.sectionCoordinators }; selectedInGrade.forEach((sid) => { nc[sid] = newUid; }); return { ...f, sectionCoordinators: nc }; });
                                    }}
                                    style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${isCoord ? "#FDE68A" : C.borderLight}`, background: isCoord ? "#FEF3C7" : C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                    <Star size={13} fill={isCoord ? "currentColor" : "none"} color={isCoord ? "#F59E0B" : C.textLight} />
                                  </button>
                                  <span style={{ fontSize: 9, color: C.textLight }}>In-charge</span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                  <button type="button"
                                    onClick={() => {
                                      setForm((f) => {
                                        const np = { ...f.sectionParticipants };
                                        selectedInGrade.forEach((sid) => { const cur = np[sid] ?? []; np[sid] = isParticipant ? cur.filter((x) => x !== uid) : cur.includes(uid) ? cur : [...cur, uid]; });
                                        return { ...f, sectionParticipants: np };
                                      });
                                    }}
                                    style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${isAdded ? C.deep : C.borderLight}`, background: isAdded ? C.deep : C.white, color: isAdded ? "#fff" : C.text, transition: "all 0.15s" }}>
                                    {isAdded ? "Added" : "Add"}
                                  </button>
                                  <span style={{ fontSize: 9, color: C.textLight }}>Attendee</span>
                                </div>
                              </div>
                            );
                          })
                      }
                      {gradeSharedCoordUserId && (
                        <p style={{ fontSize: 11, fontWeight: 500, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 9, padding: "7px 12px" }}>
                          ✓ Applied as coordinator for all {selectedInGrade.length} sections in Grade {activeGrade}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Different coordinator: section tabs */}
                  {sameCoord === false && (
                    <div>
                      <div style={{ display: "flex", borderBottom: `1px solid ${C.borderLight}`, overflowX: "auto" }}>
                        {selectedInGrade.map((sid) => {
                          const cs = classSections.find((c) => c.id === sid);
                          const hasCoord = !!form.sectionCoordinators[sid];
                          const active   = activeSectionId === sid;
                          return (
                            <button key={sid} type="button"
                              onClick={() => { setActiveSectionId(sid); loadTeachersForSection(sid); }}
                              style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", border: "none", borderBottom: `2px solid ${active ? C.deep : "transparent"}`, background: C.white, color: active ? C.deep : C.textLight, transition: "all 0.15s" }}>
                              {hasCoord && <Star size={9} fill="currentColor" color="#F59E0B" />}
                              {cs?.name ?? sid}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {!activeSectionId || !selectedInGrade.includes(activeSectionId)
                          ? <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>Select a section tab above.</p>
                          : activeLoading
                          ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textLight, padding: "8px 0" }}><Loader2 size={13} className="animate-spin" /> Loading teachers…</div>
                          : !activeTeachers || activeTeachers.length === 0
                          ? <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>No teachers assigned.</p>
                          : activeTeachers.map((t) => {
                              const uid = t.userId;
                              const isCoord = form.sectionCoordinators[activeSectionId] === uid;
                              const isParticipant = (form.sectionParticipants[activeSectionId] ?? []).includes(uid);
                              const isAdded = isCoord || isParticipant;
                              return (
                                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${isCoord ? "#FDE68A" : isAdded ? C.sky : C.borderLight}`, background: isCoord ? "#FFFBEB" : isAdded ? `${C.sky}10` : C.white, transition: "all 0.15s" }}>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.text }}>{t.name}</p>
                                    <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{t.subjects?.join(", ")}</p>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                    <button type="button" onClick={() => setSectionCoordinator(activeSectionId, uid)}
                                      style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${isCoord ? "#FDE68A" : C.borderLight}`, background: isCoord ? "#FEF3C7" : C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                      <Star size={13} fill={isCoord ? "currentColor" : "none"} color={isCoord ? "#F59E0B" : C.textLight} />
                                    </button>
                                    <span style={{ fontSize: 9, color: C.textLight }}>In-charge</span>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                    <button type="button" onClick={() => toggleSectionTeacher(activeSectionId, uid)}
                                      style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${isAdded ? C.deep : C.borderLight}`, background: isAdded ? C.deep : C.white, color: isAdded ? "#fff" : C.text, transition: "all 0.15s" }}>
                                      {isAdded ? "Added" : "Add"}
                                    </button>
                                    <span style={{ fontSize: 9, color: C.textLight }}>Attendee</span>
                                  </div>
                                </div>
                              );
                            })
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected sections summary */}
              {form.classSectionIds.length > 0 && (
                <div style={{ background: `${C.bg}66`, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: "10px 14px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>All Selected Sections</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {form.classSectionIds.map((id) => {
                      const cs = classSections.find((c) => c.id === id);
                      const hasCoord = !!form.sectionCoordinators[id];
                      return (
                        <span key={id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, background: C.white, border: `1px solid ${C.borderLight}`, color: C.text, padding: "3px 10px", borderRadius: 99 }}>
                          {hasCoord && <Star size={9} fill="currentColor" color="#F59E0B" />}
                          {cs?.name ?? id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* External participant */}
              <div>
                <Label>Add External Participant</Label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={inp({ flex: 1 })} placeholder="Name (optional)" value={extName} onChange={(e) => setExtName(e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
                  <input style={inp({ flex: 1 })} placeholder="Email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
                  <button type="button" onClick={addExternal}
                    style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {form.externalParticipants.map((ep, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: `${C.mist}55`, borderRadius: 9, padding: "8px 12px", fontSize: 12, color: C.text }}>
                      <span>{ep.name && <strong>{ep.name} — </strong>}{ep.email}</span>
                      <button type="button" onClick={() => removeExternal(i)} style={{ background: "none", border: "none", color: "#F43F5E", cursor: "pointer", display: "flex" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-invite parents toggle */}
              {form.type === "PARENT" && form.classSectionIds.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F5F3FF", border: "1.5px solid #DDD6FE", borderRadius: 12, padding: "12px 16px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#5B21B6" }}>Auto-invite Parents</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#7C3AED" }}>Automatically add parents of enrolled students</p>
                  </div>
                  <button type="button" onClick={() => set("autoInviteParents", !form.autoInviteParents)}
                    style={{ width: 40, height: 22, borderRadius: 99, border: "none", background: form.autoInviteParents ? "#7C3AED" : "#DDD6FE", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                    <span style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s", left: form.autoInviteParents ? 21 : 3 }} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 4 — Agenda ═══ */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <StepHeader step={4} title="Topic & Agenda" subtitle="Describe the purpose and agenda for this meeting" />
              <div>
                <Label>Topic / Agenda</Label>
                <textarea style={{ ...inp(), resize: "none", lineHeight: 1.6 }} rows={8}
                  placeholder="Enter meeting agenda, discussion points, or relevant notes…"
                  value={form.description} onChange={(e) => set("description", e.target.value)} autoFocus
                  onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
              </div>
            </div>
          )}

          {/* ═══ STEP 5 — Review ═══ */}
          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <StepHeader step={5} title="Review & Confirm" subtitle="Double-check all details before scheduling" />

              {/* Title / badges */}
              <div style={{ background: `${C.bg}88`, borderRadius: 14, padding: "14px 16px", border: `1.5px solid ${C.borderLight}` }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{form.title || "—"}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {[
                    { label: form.type,   bg: C.deep,        color: "#fff" },
                    { label: form.status, bg: "#EFF6FF",      color: "#2563EB" },
                    ...(academicYears.find((y) => y.id === form.academicYearId) ? [{ label: academicYears.find((y) => y.id === form.academicYearId)?.name, bg: C.mist, color: C.deep }] : []),
                  ].map((b, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: b.bg, color: b.color }}>{b.label}</span>
                  ))}
                </div>
              </div>

              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { Icon: CalendarDays, label: "Date",  val: form.meetingDate ? new Date(form.meetingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                  { Icon: Clock4,       label: "Time",  val: `${form.startTime} – ${form.endTime}` },
                  ...(form.venueType ? [{ Icon: MapPin, label: "Venue", val: `${VENUE_TYPES.find((v) => v.value === form.venueType)?.label}${form.venueDetail ? ` — ${form.venueDetail}` : ""}` }] : []),
                  ...(form.classSectionIds.length > 0 ? [{ Icon: BookOpen, label: `Classes (${form.classSectionIds.length})`, val: form.classSectionIds.map((id) => classSections.find((c) => c.id === id)?.name ?? id).join(", ") }] : []),
                ].map(({ Icon, label, val }) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 14px" }}>
                    <Icon size={14} color={C.textLight} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 500, color: C.text }}>{val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coordinators */}
              {(() => {
                const userNameMap = {};
                Object.values(sectionData).forEach(({ teachers = [] }) => (teachers || []).forEach((t) => { if (t.userId) userNameMap[t.userId] = t.name; }));
                const seen = new Set();
                return Object.entries(form.sectionCoordinators).filter(([, uid]) => uid).map(([sectionId, uid]) => {
                  const sName = classSections.find((c) => c.id === sectionId)?.name ?? sectionId;
                  const isDup = seen.has(uid); seen.add(uid);
                  return (
                    <div key={sectionId} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "10px 14px" }}>
                      <Star size={13} fill="currentColor" color="#F59E0B" />
                      <div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>Coordinator — {sName}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#92400E" }}>{userNameMap[uid] ?? uid}</p>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Participants count */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 14px" }}>
                <Users size={14} color={C.textLight} />
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Participants</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: C.text }}>
                    {Object.values(form.sectionParticipants).reduce((acc, ids) => acc + ids.length, 0) + Object.values(form.sectionCoordinators).filter(Boolean).length} staff
                    {form.externalParticipants.length > 0 && `, ${form.externalParticipants.length} external`}
                    {form.autoInviteParents && ", + parents auto-added"}
                  </p>
                </div>
              </div>

              {/* Agenda preview */}
              {form.description && (
                <div style={{ background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Agenda</p>
                  <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", whiteSpace: "pre-line" }}>
                    {form.description}
                  </p>
                </div>
              )}

              {error && (
                <p style={{ margin: 0, fontSize: 12, color: "#E11D48", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 9, padding: "9px 12px" }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderTop: `1.5px solid ${C.borderLight}`, background: C.white }}>
          <button type="button" onClick={() => step > 1 ? setStep((s) => s - 1) : onClose()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, color: C.textLight, background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.text)} onMouseLeave={(e) => (e.currentTarget.style.color = C.textLight)}>
            <ChevronLeft size={15} /> {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < TOTAL_STEPS ? (
            <button type="button" disabled={!canProceed()} onClick={() => { setError(""); setStep((s) => s + 1); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 11, border: "none", background: canProceed() ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : `${C.deep}44`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: canProceed() ? "pointer" : "not-allowed", boxShadow: canProceed() ? `0 4px 14px ${C.deep}33` : "none" }}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button type="button" disabled={saving} onClick={handleSubmit}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 24px", borderRadius: 11, border: "none", background: saving ? `${C.deep}66` : `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : `0 4px 14px ${C.deep}33` }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Schedule Meeting"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}