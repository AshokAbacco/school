// client/src/admin/pages/meeting/components/MeetingFormModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  X, Loader2, ChevronRight, ChevronLeft, CheckCircle2,
  MapPin, Clock4, CalendarDays, Users, BookOpen, Wifi,
  Building2, MicVocal, HelpCircle, Star, Plus, Trash2,
  GraduationCap, Briefcase, UserCheck, Baby,
} from "lucide-react";
import {
  createMeeting, updateMeeting, fetchAcademicYears,
  fetchClassSections, fetchTeachersByClassSection,
  fetchNonTeachingStaff, fetchParentsByClassSection,
} from "../api/meetingsApi";

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2",
  deep: "#384959", bg: "#EDF3FA", white: "#FFFFFF",
  border: "#C8DCF0", borderLight: "#DDE9F5", text: "#243340", textLight: "#6A89A7",
};

/* ── Meeting types with UI labels and icons ── */
const MEETING_TYPES = [
  { value: "TEACHING_STAFF",     label: "Teaching Staff",        icon: GraduationCap, color: "#2563EB", bg: "#EFF6FF", hint: "Teachers selected by subject & class section" },
  { value: "NON_TEACHING_STAFF", label: "Non-Teaching Staff",    icon: Briefcase,     color: "#7C3AED", bg: "#F5F3FF", hint: "Administrative & support staff"  },
  { value: "PARENTS",            label: "Parents",               icon: Baby,          color: "#059669", bg: "#ECFDF5", hint: "Parents grouped by child's class section" },
  { value: "STUDENTS",           label: "Students",              icon: Users,         color: "#DC2626", bg: "#FEF2F2", hint: "Whole class sections — no individual selection" },
  // { value: "GENERAL",            label: "General",               icon: UserCheck,     color: "#D97706", bg: "#FFFBEB", hint: "Open meeting for all staff" },
  // { value: "BOARD",              label: "Board",                 icon: Building2,     color: "#0F172A", bg: "#F8FAFC", hint: "Board / management level meeting" },
];

const MEETING_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"];
const VENUE_TYPES = [
  { value: "CLASSROOM",  label: "Classroom",  icon: BookOpen,   detail: "room" },
  { value: "AUDITORIUM", label: "Auditorium", icon: MicVocal,   detail: null },
  { value: "STAFFROOM",  label: "Staff Room", icon: Building2,  detail: null },
  { value: "ONLINE",     label: "Online",     icon: Wifi,       detail: "link" },
  { value: "OTHER",      label: "Other",      icon: HelpCircle, detail: "text" },
];
const TOTAL_STEPS = 5;

const INITIAL_FORM = {
  title: "", meetingDate: "", startTime: "", endTime: "",
  venueType: "", venueDetail: "", meetingLink: "",
  type: "TEACHING_STAFF", status: "SCHEDULED", academicYearId: "",
  // class-section based
  classSectionIds: [],
  sectionCoordinators: {}, sectionParticipants: {},
  // non-teaching / general / board
  nonTeachingStaffIds: [],
  // parents (stored as classSectionIds — backend auto-resolves parents by class)
  parentClassSectionIds: [],
  // legacy single fields (kept for backend compat)
  classSectionId: "", coordinatorUserId: "", participantUserIds: [],
  externalParticipants: [], autoInviteParents: false, description: "",
  contactNumber: "", 
};

const inp = (extra = {}) => ({
  width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10,
  padding: "9px 12px", fontSize: 13, color: C.text, background: C.bg,
  outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
  transition: "border-color 0.15s", ...extra,
});

function Label({ children, required }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}{required && <span style={{ color: "#F43F5E", fontWeight: 400, textTransform: "none" }}> *</span>}
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

/* ── Reusable person-row for non-teaching staff / parents ── */
function PersonRow({ name, sub, isSelected, onToggle, isCoord, onToggleCoord, showCoord = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${isCoord ? "#FDE68A" : isSelected ? C.sky : C.borderLight}`, background: isCoord ? "#FFFBEB" : isSelected ? `${C.sky}10` : C.white, transition: "all 0.15s" }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.text }}>{name}</p>
        {sub && <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{sub}</p>}
      </div>
      {showCoord && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <button type="button" onClick={onToggleCoord}
            style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${isCoord ? "#FDE68A" : C.borderLight}`, background: isCoord ? "#FEF3C7" : C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Star size={13} fill={isCoord ? "currentColor" : "none"} color={isCoord ? "#F59E0B" : C.textLight} />
          </button>
          <span style={{ fontSize: 9, color: C.textLight }}>In-charge</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <button type="button" onClick={onToggle}
          style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${isSelected ? C.deep : C.borderLight}`, background: isSelected ? C.deep : C.white, color: isSelected ? "#fff" : C.text, transition: "all 0.15s" }}>
          {isSelected ? "Added" : "Add"}
        </button>
        <span style={{ fontSize: 9, color: C.textLight }}>Attendee</span>
      </div>
    </div>
  );
}

export default function MeetingFormModal({ meeting = null, onClose, onSaved }) {
  const isEdit = !!meeting;
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState(INITIAL_FORM);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // Dropdown data
  const [academicYears, setAcademicYears] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [loadingAY, setLoadingAY] = useState(true);
  const [loadingCS, setLoadingCS] = useState(true);

  // Teaching staff (per section)
  const [sectionData,     setSectionData]     = useState({});
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeGrade,     setActiveGrade]     = useState("");
  const [gradeSameCoord,  setGradeSameCoord]  = useState({});
  const [gradeSharedCoord,setGradeSharedCoord]= useState({});

  // Non-teaching staff
  const [nonTeachingList,    setNonTeachingList]    = useState([]);
  const [loadingNonTeaching, setLoadingNonTeaching] = useState(false);
  const [ntCoordinatorId,    setNtCoordinatorId]    = useState("");

  // Parents (per class section selected)
  const [parentSectionData,    setParentSectionData]    = useState({});   // { [sectionId]: { loading, parents: [] } }
  const [activeParentSectionId,setActiveParentSectionId]= useState(null);
  const [activeParentGrade,    setActiveParentGrade]    = useState("");
  const [selectedParentIds,    setSelectedParentIds]    = useState([]);   // parentUserId[]
  const [parentCoordinatorId,  setParentCoordinatorId]  = useState("");

  // External
  const [extName,  setExtName]  = useState("");
  const [extEmail, setExtEmail] = useState("");

  /* ─── Derived helpers ─── */
  const meetingTypeMeta = MEETING_TYPES.find((m) => m.value === form.type) ?? MEETING_TYPES[0];
  const isTeachingType    = form.type === "TEACHING_STAFF";
  const isNonTeachingType = form.type === "NON_TEACHING_STAFF";
  const isParentsType     = form.type === "PARENTS";
  const isStudentsType    = form.type === "STUDENTS";
  const isGenericType     = ["GENERAL", "BOARD"].includes(form.type);

  /* ─── Bootstrap data ─── */
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

  /* ─── Load non-teaching staff when type switches ─── */
  useEffect(() => {
    if (!isNonTeachingType || nonTeachingList.length > 0) return;
    setLoadingNonTeaching(true);
    fetchNonTeachingStaff()
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res?.data ?? res?.staff ?? []);
        setNonTeachingList(arr);
      }).catch(() => {}).finally(() => setLoadingNonTeaching(false));
  }, [form.type]);

  /* ─── Populate form when editing ─── */
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
      meetingLink: meeting.meetingLink ?? "", type: meeting.type ?? "TEACHING_STAFF",
      status: meeting.status ?? "SCHEDULED", academicYearId: meeting.academicYearId ?? "",
      classSectionId: sectionIds[0] ?? "", classSectionIds: sectionIds,
      sectionCoordinators, sectionParticipants,
      coordinatorUserId: coordP?.userId ?? "", participantUserIds: participantIds,
      nonTeachingStaffIds: [], parentClassSectionIds: sectionIds,
      externalParticipants: meeting.participants?.filter((p) => p.type === "EXTERNAL").map((p) => ({ name: p.name ?? "", email: p.email ?? "" })) ?? [],
      autoInviteParents: false, description: meeting.description ?? "",
      contactNumber: meeting.contactNumber ?? "",
    });
    if (sectionIds.length > 0) setActiveSectionId(sectionIds[0]);
  }, [meeting]);

  /* ─── Teaching staff loader ─── */
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

  /* ─── Parents loader ─── */
  const loadParentsForSection = useCallback(async (sectionId) => {
    if (!sectionId || parentSectionData[sectionId]?.parents) return;
    setParentSectionData((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], loading: true } }));
    try {
      const res = await fetchParentsByClassSection(sectionId, form.academicYearId);
      const arr = Array.isArray(res) ? res : (res?.data ?? res?.parents ?? []);
      setParentSectionData((prev) => ({ ...prev, [sectionId]: { loading: false, parents: arr } }));
    } catch {
      setParentSectionData((prev) => ({ ...prev, [sectionId]: { loading: false, parents: [] } }));
    }
  }, [parentSectionData, form.academicYearId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  /* ─── Teaching staff helpers ─── */
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
      if (f.classSectionIds.includes(sectionId)) {
        const nc = { ...f.sectionCoordinators }; const np = { ...f.sectionParticipants };
        delete nc[sectionId]; delete np[sectionId];
        return { ...f, classSectionIds: f.classSectionIds.filter((id) => id !== sectionId), sectionCoordinators: nc, sectionParticipants: np };
      }
      return { ...f, classSectionIds: [...f.classSectionIds, sectionId] };
    });
    if (!form.classSectionIds.includes(sectionId)) { setActiveSectionId(sectionId); loadTeachersForSection(sectionId); }
    else setActiveSectionId((prev) => (prev === sectionId ? null : prev));
  };

  /* ─── Non-teaching staff helpers ─── */
  const toggleNonTeaching = (uid) => {
    setForm((f) => ({
      ...f,
      nonTeachingStaffIds: f.nonTeachingStaffIds.includes(uid)
        ? f.nonTeachingStaffIds.filter((x) => x !== uid)
        : [...f.nonTeachingStaffIds, uid],
    }));
    if (ntCoordinatorId === uid) setNtCoordinatorId("");
  };

  /* ─── Parent section helpers ─── */
  const toggleParentSection = (sectionId) => {
    setForm((f) => {
      const already = f.parentClassSectionIds.includes(sectionId);
      return { ...f, parentClassSectionIds: already ? f.parentClassSectionIds.filter((id) => id !== sectionId) : [...f.parentClassSectionIds, sectionId] };
    });
    if (!form.parentClassSectionIds.includes(sectionId)) {
      setActiveParentSectionId(sectionId);
      loadParentsForSection(sectionId);
    }
  };
  const toggleParentId = (uid) => {
    setSelectedParentIds((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);
    if (parentCoordinatorId === uid) setParentCoordinatorId("");
  };

  /* ─── Student section helpers (select whole sections) ─── */
  const toggleStudentSection = (sectionId) => {
    setForm((f) => {
      const already = f.classSectionIds.includes(sectionId);
      return { ...f, classSectionIds: already ? f.classSectionIds.filter((id) => id !== sectionId) : [...f.classSectionIds, sectionId] };
    });
  };

  /* ─── External ─── */
  const addExternal = () => {
    if (!extEmail) return;
    set("externalParticipants", [...form.externalParticipants, { name: extName, email: extEmail }]);
    setExtName(""); setExtEmail("");
  };
  const removeExternal = (i) => set("externalParticipants", form.externalParticipants.filter((_, idx) => idx !== i));

  /* ─── Grade maps ─── */
  const gradeMap = {};
  classSections.forEach((cs) => { const g = cs.grade ?? "Other"; if (!gradeMap[g]) gradeMap[g] = []; gradeMap[g].push(cs); });
  const sortedGrades = Object.keys(gradeMap).sort((a, b) => { const na = parseInt(a), nb = parseInt(b); return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b); });

  /* Teaching staff derived */
  const currentSections    = activeGrade ? (gradeMap[activeGrade] ?? []) : [];
  const allGradeSectionIds = currentSections.map((cs) => cs.id);
  const selectedInGrade    = allGradeSectionIds.filter((id) => form.classSectionIds.includes(id));
  const allSelected        = allGradeSectionIds.length > 0 && allGradeSectionIds.every((id) => form.classSectionIds.includes(id));
  const activeTeachers     = activeSectionId ? (sectionData[activeSectionId]?.teachers ?? null) : null;
  const activeLoading      = activeSectionId ? (sectionData[activeSectionId]?.loading ?? false) : false;
  const sameCoord          = gradeSameCoord[activeGrade] ?? null;
  const gradeSharedCoordUserId = gradeSharedCoord[activeGrade] ?? "";
  const allGradeTeachers   = [];
  const seenUids = new Set();
  selectedInGrade.forEach((sid) => {
    (sectionData[sid]?.teachers ?? []).forEach((t) => { if (!seenUids.has(t.userId)) { seenUids.add(t.userId); allGradeTeachers.push(t); } });
  });

  /* Parent derived */
  const parentCurrentSections = activeParentGrade ? (gradeMap[activeParentGrade] ?? []) : [];
  const activeParents  = activeParentSectionId ? (parentSectionData[activeParentSectionId]?.parents ?? null) : null;
  const parentLoading  = activeParentSectionId ? (parentSectionData[activeParentSectionId]?.loading ?? false) : false;

  /* ─── Validation ─── */
  const canProceed = useCallback(() => {
    if (step === 1) return form.title.trim() && form.meetingDate && form.startTime && form.endTime;
    if (step === 2) return !!form.venueType;
    return true;
  }, [step, form]);

  const getMissingFields = () => {
    const missing = [];
    if (!form.title.trim())   missing.push({ label: "Meeting Title",    step: 1 });
    if (!form.academicYearId) missing.push({ label: "Academic Year",    step: 1 });
    if (!form.meetingDate)    missing.push({ label: "Meeting Date",      step: 1 });
    if (!form.startTime)      missing.push({ label: "Start Time",        step: 1 });
    if (!form.endTime)        missing.push({ label: "End Time",          step: 1 });
    if (!form.venueType)      missing.push({ label: "Venue / Location",  step: 2 });
    if (!form.contactNumber.trim()) {
      missing.push({ label: "Contact Number", step: 1 });
    }

    if (
      form.contactNumber &&
      !/^\91\s[6-9]\d{9}$/.test(form.contactNumber)
    ) {
      missing.push({ label: "Valid Indian Contact Number", step: 1 });
    }
    return missing;
  };

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    const _missing = getMissingFields();
    if (_missing.length > 0) { setError("Please complete all required fields highlighted below."); return; }
    setSaving(true); setError("");
    try {
      let payload = { ...form };

      if (isTeachingType) {
        const perSectionCoordinators = Object.entries(form.sectionCoordinators).filter(([, uid]) => uid).map(([classSectionId, userId]) => ({ userId, classSectionId }));
        const coordinatorUserIds = [...new Set(perSectionCoordinators.map((e) => e.userId))];
        const allParticipantIds = new Set();
        Object.values(form.sectionParticipants).forEach((ids) => ids.forEach((id) => allParticipantIds.add(id)));
        coordinatorUserIds.forEach((id) => allParticipantIds.delete(id));
        payload = { ...payload, classSectionIds: form.classSectionIds, classSectionId: form.classSectionIds[0] ?? "", coordinatorUserId: coordinatorUserIds[0] ?? "", participantUserIds: [...allParticipantIds], perSectionCoordinators };
      } else if (isNonTeachingType) {
          payload = {
            ...payload,
            classSectionIds: [],
            classSectionId: "",
            coordinatorUserId: null,

            perSectionCoordinators: ntCoordinatorId
              ? [{ staffId: ntCoordinatorId, type: "STAFF" }]
              : [],

            participantUserIds: form.nonTeachingStaffIds
              .filter((id) => id !== ntCoordinatorId)
              .map((id) => ({ staffId: id, type: "STAFF" })),
          };
        } else if (isParentsType) {
        payload = { ...payload, classSectionIds: form.parentClassSectionIds, classSectionId: form.parentClassSectionIds[0] ?? "", coordinatorUserId: parentCoordinatorId, participantUserIds: selectedParentIds.filter((id) => id !== parentCoordinatorId), autoInviteParents: true, perSectionCoordinators: [] };
      } else if (isStudentsType) {
        payload = { ...payload, classSectionIds: form.classSectionIds, classSectionId: form.classSectionIds[0] ?? "", coordinatorUserId: "", participantUserIds: [], perSectionCoordinators: [] };
      } else {
        // GENERAL / BOARD / CUSTOM
        const perSectionCoordinators = Object.entries(form.sectionCoordinators).filter(([, uid]) => uid).map(([classSectionId, userId]) => ({ userId, classSectionId }));
        const coordinatorUserIds = [...new Set(perSectionCoordinators.map((e) => e.userId))];
        const allParticipantIds = new Set();
        Object.values(form.sectionParticipants).forEach((ids) => ids.forEach((id) => allParticipantIds.add(id)));
        coordinatorUserIds.forEach((id) => allParticipantIds.delete(id));
        payload = { ...payload, classSectionIds: form.classSectionIds, classSectionId: form.classSectionIds[0] ?? "", coordinatorUserId: coordinatorUserIds[0] ?? "", participantUserIds: [...allParticipantIds], perSectionCoordinators };
      }

      if (isEdit) await updateMeeting(meeting.id, payload);
      else await createMeeting(payload);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  const selectedVenue = VENUE_TYPES.find((v) => v.value === form.venueType);

  /* ═══════════════════════════════════════════════════════════════
     Step 3 — sub-renders per meeting type
  ═══════════════════════════════════════════════════════════════ */

  /* ── Teaching Staff (original section+teacher picker) ── */
  const renderTeachingStaffPicker = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

      {activeGrade && currentSections.length > 0 && (
        <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Grade {activeGrade} — Sections</p>
            <button type="button"
              onClick={() => {
                if (allSelected) {
                  setForm((f) => {
                    const nc = { ...f.sectionCoordinators }; const np = { ...f.sectionParticipants };
                    allGradeSectionIds.forEach((id) => { delete nc[id]; delete np[id]; });
                    return { ...f, classSectionIds: f.classSectionIds.filter((id) => !allGradeSectionIds.includes(id)), sectionCoordinators: nc, sectionParticipants: np };
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
                    if (!isSelected) { setForm((f) => ({ ...f, classSectionIds: [...f.classSectionIds, cs.id] })); loadTeachersForSection(cs.id); setActiveSectionId(cs.id); }
                    else {
                      setForm((f) => { const nc = { ...f.sectionCoordinators }; const np = { ...f.sectionParticipants }; delete nc[cs.id]; delete np[cs.id]; return { ...f, classSectionIds: f.classSectionIds.filter((id) => id !== cs.id), sectionCoordinators: nc, sectionParticipants: np }; });
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

      {activeGrade && selectedInGrade.length > 0 && (
        <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Teachers — Grade {activeGrade}</p>
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
                style={{ flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.15s", ...(sameCoord === val ? { background: C.deep, color: "#fff" } : { background: C.white, color: C.textLight }) }}>
                {label}
              </button>
            ))}
          </div>

          {sameCoord === true && (
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {allGradeTeachers.length === 0
                ? <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>No teachers found.</p>
                : allGradeTeachers.map((t) => {
                    const uid = t.userId;
                    const isCoord       = gradeSharedCoordUserId === uid;
                    const isParticipant = selectedInGrade.some((sid) => (form.sectionParticipants[sid] ?? []).includes(uid));
                    const isAdded       = isCoord || isParticipant;
                    return (
                      <PersonRow key={uid}
                        name={t.name} sub={t.subjects?.join(", ")}
                        isSelected={isAdded} isCoord={isCoord} showCoord
                        onToggleCoord={() => {
                          const newUid = isCoord ? "" : uid;
                          setGradeSharedCoord((prev) => ({ ...prev, [activeGrade]: newUid }));
                          setForm((f) => { const nc = { ...f.sectionCoordinators }; selectedInGrade.forEach((sid) => { nc[sid] = newUid; }); return { ...f, sectionCoordinators: nc }; });
                        }}
                        onToggle={() => {
                          setForm((f) => {
                            const np = { ...f.sectionParticipants };
                            selectedInGrade.forEach((sid) => { const cur = np[sid] ?? []; np[sid] = isParticipant ? cur.filter((x) => x !== uid) : cur.includes(uid) ? cur : [...cur, uid]; });
                            return { ...f, sectionParticipants: np };
                          });
                        }}
                      />
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

          {sameCoord === false && (
            <div>
              <div style={{ display: "flex", borderBottom: `1px solid ${C.borderLight}`, overflowX: "auto" }}>
                {selectedInGrade.map((sid) => {
                  const cs = classSections.find((c) => c.id === sid);
                  const active = activeSectionId === sid;
                  return (
                    <button key={sid} type="button"
                      onClick={() => { setActiveSectionId(sid); loadTeachersForSection(sid); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", border: "none", borderBottom: `2px solid ${active ? C.deep : "transparent"}`, background: C.white, color: active ? C.deep : C.textLight, transition: "all 0.15s" }}>
                      {!!form.sectionCoordinators[sid] && <Star size={9} fill="currentColor" color="#F59E0B" />}
                      {cs?.name ?? sid}
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {!activeSectionId || !selectedInGrade.includes(activeSectionId)
                  ? <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>Select a section tab above.</p>
                  : activeLoading
                  ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textLight }}><Loader2 size={13} className="animate-spin" /> Loading teachers…</div>
                  : !activeTeachers || activeTeachers.length === 0
                  ? <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>No teachers assigned to this section.</p>
                  : activeTeachers.map((t) => {
                      const uid = t.userId;
                      const isCoord       = form.sectionCoordinators[activeSectionId] === uid;
                      const isParticipant = (form.sectionParticipants[activeSectionId] ?? []).includes(uid);
                      const isAdded       = isCoord || isParticipant;
                      return (
                        <PersonRow key={uid}
                          name={t.name} sub={t.subjects?.join(", ")}
                          isSelected={isAdded} isCoord={isCoord} showCoord
                          onToggleCoord={() => setSectionCoordinator(activeSectionId, uid)}
                          onToggle={() => toggleSectionTeacher(activeSectionId, uid)}
                        />
                      );
                    })
                }
              </div>
            </div>
          )}
        </div>
      )}

      {form.classSectionIds.length > 0 && (
        <div style={{ background: `${C.bg}66`, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>All Selected Sections</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {form.classSectionIds.map((id) => {
              const cs = classSections.find((c) => c.id === id);
              return (
                <span key={id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, background: C.white, border: `1px solid ${C.borderLight}`, color: C.text, padding: "3px 10px", borderRadius: 99 }}>
                  {!!form.sectionCoordinators[id] && <Star size={9} fill="currentColor" color="#F59E0B" />}
                  {cs?.name ?? id}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ── Non-Teaching Staff picker ── */
  const renderNonTeachingPicker = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#F5F3FF", border: "1.5px solid #DDD6FE", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#5B21B6" }}>
        <strong>Non-Teaching Staff</strong> — administrative, support, and operations personnel.
        Select attendees and optionally mark one as the meeting in-charge.
      </div>

      {loadingNonTeaching ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textLight }}><Loader2 size={13} className="animate-spin" /> Loading staff…</div>
      ) : nonTeachingList.length === 0 ? (
        <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>No non-teaching staff found.</p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Label>Select Staff Members</Label>
            <button type="button"
              onClick={() => {
                const allIds = nonTeachingList.map((s) => s.userId ?? s.staffId);
                const allSelected = allIds.every((id) => form.nonTeachingStaffIds.includes(id));
                setForm((f) => ({ ...f, nonTeachingStaffIds: allSelected ? [] : allIds }));
                if (allSelected) setNtCoordinatorId("");
              }}
              style={{ fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 99, cursor: "pointer", border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.deep }}>
              {nonTeachingList.every((s) => form.nonTeachingStaffIds.includes(s.userId ?? s.id)) ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
            {nonTeachingList.map((s) => {
              const uid = s.userId ?? s.staffId;
              const isSelected = form.nonTeachingStaffIds.includes(uid);
              const isCoord    = ntCoordinatorId === uid;
              return (
                <PersonRow key={uid}
                  name={s.name ?? s.staffName ?? uid}
                  sub={s.designation ?? s.role ?? s.department ?? ""}
                  isSelected={isSelected} isCoord={isCoord} showCoord={isSelected}
                  onToggle={() => toggleNonTeaching(uid)}
                  onToggleCoord={() => setNtCoordinatorId(isCoord ? "" : uid)}
                />
              );
            })}
          </div>
          {form.nonTeachingStaffIds.length > 0 && (
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 9, padding: "7px 12px" }}>
              ✓ {form.nonTeachingStaffIds.length} staff member{form.nonTeachingStaffIds.length > 1 ? "s" : ""} selected
              {ntCoordinatorId ? ` · 1 in-charge set` : ""}
            </p>
          )}
        </>
      )}
    </div>
  );

  /* ── Parents picker ── */
  const renderParentsPicker = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#ECFDF5", border: "1.5px solid #BBF7D0", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#065F46" }}>
        <strong>Parents Meeting</strong> — select class sections to invite all parents of enrolled students.
        You can also pick individual parents per section.
      </div>

      {loadingCS ? <p style={{ fontSize: 12, color: C.textLight }}>Loading sections…</p> : (
        <div>
          <Label>Grade</Label>
          <select style={inp()} value={activeParentGrade}
            onChange={(e) => { setActiveParentGrade(e.target.value); setActiveParentSectionId(null); }}
            onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)}>
            <option value="">— Select Grade —</option>
            {sortedGrades.map((g) => {
              const selCount = (gradeMap[g] ?? []).filter((cs) => form.parentClassSectionIds.includes(cs.id)).length;
              return <option key={g} value={g}>Grade {g}{selCount > 0 ? ` (${selCount} selected)` : ""}</option>;
            })}
          </select>
        </div>
      )}

      {activeParentGrade && parentCurrentSections.length > 0 && (
        <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Grade {activeParentGrade} — Sections</p>
            <button type="button"
              onClick={() => {
                const ids = parentCurrentSections.map((cs) => cs.id);
                const all = ids.every((id) => form.parentClassSectionIds.includes(id));
                setForm((f) => ({
                  ...f,
                  parentClassSectionIds: all
                    ? f.parentClassSectionIds.filter((id) => !ids.includes(id))
                    : [...f.parentClassSectionIds, ...ids.filter((id) => !f.parentClassSectionIds.includes(id))],
                }));
                if (!all) ids.forEach((id) => loadParentsForSection(id));
              }}
              style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 99, cursor: "pointer", border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.deep }}>
              {parentCurrentSections.every((cs) => form.parentClassSectionIds.includes(cs.id)) ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {parentCurrentSections.map((cs) => {
              const isSelected = form.parentClassSectionIds.includes(cs.id);
              return (
                <button key={cs.id} type="button"
                  onClick={() => { toggleParentSection(cs.id); if (!isSelected) setActiveParentSectionId(cs.id); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: `2px solid ${isSelected ? "#059669" : C.border}`, background: isSelected ? "#ECFDF5" : C.white, fontSize: 12, fontWeight: 500, color: isSelected ? "#065F46" : C.textLight, cursor: "pointer", transition: "all 0.15s" }}>
                  {isSelected ? <CheckCircle2 size={12} color="#059669" /> : <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${C.border}` }} />}
                  Section {cs.section}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Show parent list for active section */}
      {form.parentClassSectionIds.length > 0 && (
        <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Select Parents (Optional)</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight }}>If you don't select individually, all parents of selected sections are auto-invited.</p>
          </div>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.borderLight}`, overflowX: "auto" }}>
            {form.parentClassSectionIds.map((sid) => {
              const cs = classSections.find((c) => c.id === sid);
              const active = activeParentSectionId === sid;
              return (
                <button key={sid} type="button"
                  onClick={() => { setActiveParentSectionId(sid); loadParentsForSection(sid); }}
                  style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", border: "none", borderBottom: `2px solid ${active ? "#059669" : "transparent"}`, background: C.white, color: active ? "#059669" : C.textLight, transition: "all 0.15s" }}>
                  {cs?.name ?? sid}
                </button>
              );
            })}
          </div>
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {!activeParentSectionId ? (
              <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>Select a section tab to view parents.</p>
            ) : parentLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textLight }}><Loader2 size={13} className="animate-spin" /> Loading parents…</div>
            ) : !activeParents || activeParents.length === 0 ? (
              <p style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>No parent records found for this section.</p>
            ) : (
              activeParents.map((p) => {
                const uid = p.userId ?? p.id;
                const isSelected = selectedParentIds.includes(uid);
                const isCoord    = parentCoordinatorId === uid;
                return (
                  <PersonRow key={uid}
                    name={p.name ?? p.parentName ?? uid}
                    sub={`Parent of: ${p.studentName ?? p.childName ?? "—"}`}
                    isSelected={isSelected} isCoord={isCoord} showCoord={isSelected}
                    onToggle={() => toggleParentId(uid)}
                    onToggleCoord={() => setParentCoordinatorId(isCoord ? "" : uid)}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {form.parentClassSectionIds.length > 0 && (
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#065F46", background: "#ECFDF5", border: "1px solid #BBF7D0", borderRadius: 9, padding: "7px 12px" }}>
          ✓ {form.parentClassSectionIds.length} section{form.parentClassSectionIds.length > 1 ? "s" : ""} selected
          {selectedParentIds.length > 0 ? ` · ${selectedParentIds.length} parents individually picked` : " · All parents auto-invited"}
        </p>
      )}
    </div>
  );

  /* ── Students picker (whole class sections only) ── */
  const renderStudentsPicker = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#7F1D1D" }}>
        <strong>Students Meeting</strong> — select the class sections that will attend.
        Individual student selection is not required here.
      </div>

      {loadingCS ? <p style={{ fontSize: 12, color: C.textLight }}>Loading sections…</p> : (
        <div>
          <Label>Grade</Label>
          <select style={inp()} value={activeGrade}
            onChange={(e) => { setActiveGrade(e.target.value); }}
            onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)}>
            <option value="">— Select Grade —</option>
            {sortedGrades.map((g) => {
              const selCount = (gradeMap[g] ?? []).filter((cs) => form.classSectionIds.includes(cs.id)).length;
              return <option key={g} value={g}>Grade {g}{selCount > 0 ? ` (${selCount} selected)` : ""}</option>;
            })}
          </select>
        </div>
      )}

      {activeGrade && currentSections.length > 0 && (
        <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Grade {activeGrade} — Sections</p>
            <button type="button"
              onClick={() => {
                const all = allGradeSectionIds.every((id) => form.classSectionIds.includes(id));
                setForm((f) => ({
                  ...f,
                  classSectionIds: all
                    ? f.classSectionIds.filter((id) => !allGradeSectionIds.includes(id))
                    : [...f.classSectionIds, ...allGradeSectionIds.filter((id) => !f.classSectionIds.includes(id))],
                }));
              }}
              style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 99, cursor: "pointer", border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.deep }}>
              {allGradeSectionIds.every((id) => form.classSectionIds.includes(id)) ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {currentSections.map((cs) => {
              const isSelected = form.classSectionIds.includes(cs.id);
              return (
                <button key={cs.id} type="button" onClick={() => toggleStudentSection(cs.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: `2px solid ${isSelected ? "#DC2626" : C.border}`, background: isSelected ? "#FEF2F2" : C.white, fontSize: 12, fontWeight: 500, color: isSelected ? "#7F1D1D" : C.textLight, cursor: "pointer", transition: "all 0.15s" }}>
                  {isSelected ? <CheckCircle2 size={12} color="#DC2626" /> : <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${C.border}` }} />}
                  Section {cs.section}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {form.classSectionIds.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#7F1D1D", textTransform: "uppercase", letterSpacing: "0.06em" }}>Selected Sections</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {form.classSectionIds.map((id) => {
              const cs = classSections.find((c) => c.id === id);
              return (
                <span key={id} style={{ fontSize: 11, fontWeight: 500, background: "#fff", border: "1px solid #FECACA", color: "#7F1D1D", padding: "3px 10px", borderRadius: 99 }}>
                  {cs?.name ?? id}
                </span>
              );
            })}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#DC2626" }}>
            ✓ All students in the above sections will be included.
          </p>
        </div>
      )}
    </div>
  );

  /* ─── Participant summary for review step ─── */
  const getParticipantSummary = () => {
    if (isTeachingType || isGenericType) {
      const total = Object.values(form.sectionParticipants).reduce((a, ids) => a + ids.length, 0) + Object.values(form.sectionCoordinators).filter(Boolean).length;
      return `${total} teaching staff`;
    }
    if (isNonTeachingType) return `${form.nonTeachingStaffIds.length} non-teaching staff${ntCoordinatorId ? " · 1 in-charge" : ""}`;
    if (isParentsType) {
      if (selectedParentIds.length > 0) return `${selectedParentIds.length} parents (manual selection)`;
      return `All parents of ${form.parentClassSectionIds.length} section(s) — auto-invited`;
    }
    if (isStudentsType) return `${form.classSectionIds.length} section(s) — all students included`;
    return "—";
  };

  /* ─── Step 3 title / subtitle ─── */
  const step3Meta = {
    TEACHING_STAFF:     { title: "Class & Teaching Staff",    sub: "Pick grade → sections → assign teachers & coordinator" },
    NON_TEACHING_STAFF: { title: "Non-Teaching Staff",        sub: "Select administrative & support staff for this meeting" },
    PARENTS:            { title: "Parents by Class Section",   sub: "Pick sections — all parents of enrolled students will be invited" },
    STUDENTS:           { title: "Student Sections",           sub: "Select which class sections attend — no individual selection needed" },
    GENERAL:            { title: "Class & Coordinator",        sub: "Pick sections and assign staff participants" },
    BOARD:              { title: "Class & Coordinator",        sub: "Pick sections and assign board-level participants" },
    CUSTOM:             { title: "Class & Coordinator",        sub: "Freely select sections and participants" },
  };
  const s3 = step3Meta[form.type] ?? step3Meta.GENERAL;

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(56,73,89,0.45)", backdropFilter: "blur(8px)", padding: 16, fontFamily: "'Inter', sans-serif" }}>
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
                  ...(s < step ? { background: "#22C55E", color: "#fff" } : s === step ? { background: C.deep, color: "#fff", boxShadow: `0 0 0 3px ${C.mist}` } : { background: C.white, color: C.textLight, border: `2px solid ${C.borderLight}` }) }}>
                {s < step ? <CheckCircle2 size={13} /> : s}
              </button>
              {s < TOTAL_STEPS && <div style={{ flex: 1, height: 2, margin: "0 4px", background: s < step ? "#22C55E" : C.borderLight, transition: "background 0.3s" }} />}
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

              {/* Meeting Type — card picker */}
              <div>
                <Label required>Meeting Type</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {MEETING_TYPES.map(({ value, label, icon: Icon, color, bg, hint }) => {
                    const selected = form.type === value;
                    return (
                      <button key={value} type="button"
                        onClick={() => {
                          set("type", value);
                          // Reset participant-related state when type changes
                          setForm((f) => ({ ...f, type: value, classSectionIds: [], sectionCoordinators: {}, sectionParticipants: {}, nonTeachingStaffIds: [], parentClassSectionIds: [] }));
                          setActiveSectionId(null); setActiveGrade(""); setGradeSameCoord({}); setGradeSharedCoord({});
                          setNtCoordinatorId(""); setSelectedParentIds([]); setParentCoordinatorId("");
                          setActiveParentGrade(""); setActiveParentSectionId(null);
                        }}
                        style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, border: `2px solid ${selected ? color : C.border}`, background: selected ? bg : C.white, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                        onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.borderColor = color + "88"; e.currentTarget.style.background = bg + "55"; } }}
                        onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.white; } }}>
                        <Icon size={15} color={selected ? color : C.textLight} style={{ marginTop: 1, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: selected ? color : C.text }}>{label}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 10, color: selected ? color + "bb" : C.textLight, lineHeight: 1.4 }}>{hint}</p>
                        </div>
                        {selected && <CheckCircle2 size={13} color={color} style={{ flexShrink: 0, marginTop: 1 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label>Status</Label>
                  <select style={inp()} value={form.status} onChange={(e) => set("status", e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)}>
                    {MEETING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label required>Academic Year</Label>
                  {loadingAY ? <p style={{ fontSize: 12, color: C.textLight }}>Loading…</p> : (
                    <select style={inp()} value={form.academicYearId} onChange={(e) => set("academicYearId", e.target.value)}
                      onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)}>
                      <option value="">— Select Year —</option>
                      {academicYears.map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                    </select>
                  )}
                </div>
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

          {/* ═══ STEP 3 — Participants (type-aware) ═══ */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <StepHeader step={3} title={s3.title} subtitle={s3.sub} />

              {/* Type badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: meetingTypeMeta.bg, border: `1.5px solid ${meetingTypeMeta.color}22`, borderRadius: 10, padding: "8px 14px" }}>
                {React.createElement(meetingTypeMeta.icon, { size: 14, color: meetingTypeMeta.color })}
                <span style={{ fontSize: 12, fontWeight: 600, color: meetingTypeMeta.color }}>{meetingTypeMeta.label}</span>
                <span style={{ fontSize: 11, color: meetingTypeMeta.color + "aa", marginLeft: 4 }}>{meetingTypeMeta.hint}</span>
              </div>

              {isTeachingType    && renderTeachingStaffPicker()}
              {isNonTeachingType && renderNonTeachingPicker()}
              {isParentsType     && renderParentsPicker()}
              {isStudentsType    && renderStudentsPicker()}
              {isGenericType     && renderTeachingStaffPicker()}

              {/* External participant — always available */}
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
                <div>
                  <Label required>Contact Number</Label>

                  <input
                    type="tel"
                    required
                    pattern="^\+91\s[6-9]\d{9}$"
                    title="Enter valid Indian number like 91 7412589636"
                    placeholder="91 7412589636"
                    value={form.contactNumber}
                    onChange={(e) => {
                      let value = e.target.value;

                      // Always keep +91
                      if (!value.startsWith("91")) {
                        value = "91 ";
                      }

                      // Allow only numbers after +91
                      const numbers = value.replace("91 ", "").replace(/\D/g, "");

                      // Limit to 10 digits
                      set("contactNumber", `91 ${numbers.slice(0, 10)}`);
                    }}
                    style={inp()}
                    onFocus={(e) => (e.target.style.borderColor = C.sky)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />

                  <p
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: C.textLight,
                    }}
                  >
                    Format: 91 7412589636
                  </p>
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
                    { label: meetingTypeMeta.label, bg: meetingTypeMeta.color, color: "#fff" },
                    { label: form.status, bg: "#EFF6FF", color: "#2563EB" },
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
                  { Icon: Users, label: "Participants", val: getParticipantSummary() },
                  ...(isTeachingType || isStudentsType || isGenericType ? form.classSectionIds.length > 0 ? [{ Icon: BookOpen, label: `Sections (${form.classSectionIds.length})`, val: form.classSectionIds.map((id) => classSections.find((c) => c.id === id)?.name ?? id).join(", ") }] : [] : []),
                  ...(isParentsType ? form.parentClassSectionIds.length > 0 ? [{ Icon: BookOpen, label: `Sections (${form.parentClassSectionIds.length})`, val: form.parentClassSectionIds.map((id) => classSections.find((c) => c.id === id)?.name ?? id).join(", ") }] : [] : []),
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

              {/* Coordinators summary */}
              {(isTeachingType || isGenericType) && (() => {
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
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>In-charge — {sName}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#92400E" }}>{userNameMap[uid] ?? uid}</p>
                      </div>
                    </div>
                  );
                });
              })()}

              {isNonTeachingType && ntCoordinatorId && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "10px 14px" }}>
                  <Star size={13} fill="currentColor" color="#F59E0B" />
                  <div>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>In-charge</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#92400E" }}>{nonTeachingList.find((s) => (s.userId ?? s.id) === ntCoordinatorId)?.name ?? ntCoordinatorId}</p>
                  </div>
                </div>
              )}

              {isParentsType && parentCoordinatorId && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "10px 14px" }}>
                  <Star size={13} fill="currentColor" color="#F59E0B" />
                  <div>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>In-charge (Parent Representative)</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#92400E" }}>
                      {activeParents?.find((p) => (p.userId ?? p.id) === parentCoordinatorId)?.name ?? parentCoordinatorId}
                    </p>
                  </div>
                </div>
              )}

              {/* Agenda preview */}
              {form.description && (
                <div style={{ background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Agenda</p>
                  <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", whiteSpace: "pre-line" }}>
                    {form.description}
                  </p>
                </div>
              )}

              {/* Missing fields */}
              {(() => {
                const missing = getMissingFields();
                if (!missing.length) return null;
                return (
                  <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "12px 16px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#B45309" }}>⚠ Please complete these required fields before scheduling:</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {missing.map((m) => (
                        <div key={m.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />
                            {m.label}
                          </span>
                          <button type="button" onClick={() => { setError(""); setStep(m.step); }}
                            style={{ fontSize: 11, fontWeight: 600, color: "#B45309", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 7, padding: "3px 10px", cursor: "pointer" }}>
                            Go to Step {m.step}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
            <button type="button" onClick={() => { setError(""); setStep((s) => s + 1); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 14px ${C.deep}33` }}>
              Next <ChevronRight size={15} />
            </button>
          ) : (() => {
            const _m = getMissingFields();
            const _hasErrors = _m.length > 0;
            return (
              <button type="button" disabled={saving} onClick={handleSubmit}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 24px", borderRadius: 11, border: "none", background: saving ? `${C.deep}66` : _hasErrors ? "#F59E0B" : `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : `0 4px 14px ${C.deep}33` }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {_hasErrors ? `Complete ${_m.length} Required Field${_m.length > 1 ? "s" : ""}` : isEdit ? "Save Changes" : "Schedule Meeting"}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}