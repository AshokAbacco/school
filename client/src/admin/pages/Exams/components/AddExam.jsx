// client/src/admin/pages/exams/components/AddExam.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList, Calendar, X, Check, Loader2, Info,
  Plus, Trash2, AlertCircle, Users, User, Layers,
  ChevronRight, ChevronLeft, Clock, BookOpen, GraduationCap,
  Settings, CheckCircle2,
} from "lucide-react";
import {
  fetchSchedulesAdmin, deleteSchedule,
  createGroup, updateGroup, createSchedule,
  fetchClassSections, fetchClassSectionById,fetchTerms,
} from "./examsApi";

/* ── Design tokens ── */
const F = { fontFamily: "'Inter', sans-serif" };
const C = {
  dark: "#243340",
  navy: "#384959",
  mid: "#6A89A7",
  light: "#BDDDFC",
  border: "#C8DCF0",
  hover: "#EDF3FA",
  green: "#059669",
  red: "#dc2626",
  accent: "#384959",
  accentDark: "#243340",
  bg: "#EDF3FA",
  cardBg: "#ffffff",
};

/* ── Stepper config ── */
const STEPS = [
  { id: 1, label: "Configure Timings", sub: "Date range & slots", icon: Clock },
  { id: 2, label: "Select Classes", sub: "Grades & sections", icon: GraduationCap },
  { id: 3, label: "Build Schedule", sub: "Assign subjects", icon: BookOpen },
  { id: 4, label: "Review & Save", sub: "Confirm & publish", icon: CheckCircle2 },
];

/* ── Helpers ── */
const emptyIndividual = () => ({
  _key: Date.now() + Math.random(),
  grade: "", classSectionId: "", subjectId: "",
  maxMarks: "", passingMarks: "", examDate: "",
  startTime: "", endTime: "", slotKey: "",
  markPresetId: "",
  _saved: false, _savedId: null,
});

const fmtDate = (date) => {
  if (!date) return { dateNum: "—", month: "", day: "" };
  const d = new Date(date + "T00:00:00");
  return {
    dateNum: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    full: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
  };
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
};

/* ── Primitives ── */
const Label = ({ children, required }) => (
  <label style={{ ...F, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.mid }}>
    {children}{required && <span style={{ color: C.red }}> *</span>}
  </label>
);

const ErrMsg = ({ msg }) => !msg ? null : (
  <span style={{ ...F, fontSize: 11, color: C.red, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
    <AlertCircle size={10} />{msg}
  </span>
);

const FieldWrap = ({ children, error }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {children}<ErrMsg msg={error} />
  </div>
);

function InputBase({ value, onChange, type = "text", placeholder, disabled, min, max, error }) {
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled} min={min} max={max}
      style={{
        padding: "10px 14px", borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box",
        border: `1.5px solid ${error ? "#fca5a5" : focus ? C.accent : C.border}`,
        ...F, color: C.dark, background: disabled ? "#f8fafc" : "#fff",
        outline: "none", cursor: disabled ? "not-allowed" : "text",
        boxShadow: focus && !disabled ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
        transition: "border-color .15s, box-shadow .15s",
      }}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
    />
  );
}

function SelectBase({ value, onChange, children, disabled, error, loading }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        disabled={disabled || loading}
        style={{
          padding: "10px 34px 10px 14px", borderRadius: 10, fontSize: 13, width: "100%",
          border: `1.5px solid ${error ? "#fca5a5" : focus ? C.accent : C.border}`,
          ...F, color: value ? C.dark : C.light,
          background: (disabled || loading) ? "#f8fafc" : "#fff",
          outline: "none", cursor: (disabled || loading) ? "not-allowed" : "pointer",
          appearance: "none", boxSizing: "border-box",
          boxShadow: focus && !disabled ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
          transition: "border-color .15s, box-shadow .15s",
        }}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}>
        {children}
      </select>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        {loading
          ? <Loader2 size={13} color={C.mid} style={{ animation: "ae-spin .8s linear infinite" }} />
          : <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.mid} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        }
      </div>
    </div>
  );
}

const FInput = ({ label, required, error, ...rest }) => (
  <FieldWrap error={error}>
    <Label required={required}>{label}</Label>
    <InputBase error={error} {...rest} />
  </FieldWrap>
);

/* ══════════════════════════════════════════════
   TOP STEPPER
══════════════════════════════════════════════ */
function TopStepper({ currentStep, completedSteps }) {
  return (
    <div className="ae-stepper-wrap" style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "18px 32px", background: "#fff", borderBottom: `1px solid ${C.border}`,
      gap: 0, flexShrink: 0,
    }}>
      {STEPS.map((step, i) => {
        const done   = completedSteps.includes(step.id);
        const active = currentStep === step.id;
        const Ic     = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="ae-step-item" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 120 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? C.green : active ? C.navy : `${C.light}44`,
                border: `2px solid ${done ? C.green : active ? C.navy : C.border}`,
                transition: "all .2s",
                boxShadow: active ? "0 0 0 4px rgba(56,73,89,0.18)" : "none",
                flexShrink: 0,
              }}>
                {done
                  ? <Check size={16} color="#fff" strokeWidth={2.5} />
                  : <Ic size={16} color={active ? "#fff" : C.mid} />
                }
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="ae-step-label" style={{ ...F, fontSize: 12, fontWeight: 700, color: active ? C.dark : done ? C.green : C.mid, whiteSpace: "nowrap" }}>
                  {step.label}
                </div>
                <div className="ae-step-sub" style={{ ...F, fontSize: 10, color: C.light, marginTop: 1 }}>{step.sub}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="ae-step-connector" style={{
                flex: 1, height: 2, maxWidth: 60,
                background: completedSteps.includes(step.id) ? C.green : C.border,
                margin: "0 4px", marginTop: -20, transition: "background .2s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEP 1 — Configure Timings
══════════════════════════════════════════════ */
  function StepConfigureTimings({
    data,
    onChange,
    errors,
    terms,
    selectedTermId,
    setSelectedTermId,
  }){
  const [slots, setSlots] = useState(data.timeSlots || []);

  useEffect(() => {
    setSlots(data.timeSlots || []);
  }, [data.timeSlots]);

  const addSlot = () => {
    const newSlots = [...slots, { _key: Date.now() + Math.random(), name: "", startTime: "", endTime: "" }];
    setSlots(newSlots);
    onChange("timeSlots", newSlots);
  };

  const removeSlot = (key) => {
    const newSlots = slots.filter(s => s._key !== key);
    setSlots(newSlots);
    onChange("timeSlots", newSlots);
  };

  const updateSlot = (key, field, val) => {
    const newSlots = slots.map(s => s._key === key ? { ...s, [field]: val } : s);
    setSlots(newSlots);
    onChange("timeSlots", newSlots);
  };

  return (
    <div className="ae-step-padding" style={{ display: "flex", flexDirection: "column", gap: 20, padding: "28px 32px" }}>
      <div>
        <h2 style={{ ...F, fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Configure Exam Timings</h2>
        <p style={{ ...F, fontSize: 13, color: C.mid, marginTop: 6, marginBottom: 0 }}>Set the exam name, date range, and time slots.</p>
      </div>

      {/* Exam Name */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClipboardList size={16} color={C.accent} />
          </div>
          <div>
            <div style={{ ...F, fontSize: 14, fontWeight: 700, color: C.dark }}>Assessment Name</div>
            <div style={{ ...F, fontSize: 12, color: C.mid }}>Name for this exam group</div>
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <FieldWrap error={errors.name}>
            <Label required>Assessment / Exam Name</Label>
            <InputBase
              value={data.name}
              onChange={v => onChange("name", v)}
              placeholder="e.g. Unit Test 1, Mid-Term Exam, Final Exam"
              error={errors.name}
            />
          </FieldWrap>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
  <FieldWrap>
    <Label required>Term</Label>

    <SelectBase
      value={selectedTermId}
      onChange={setSelectedTermId}
      className="text-[#1a2533]"
    >
      <option value="" className="text-[#1a2533]">Select Term</option>

      {terms.map((t) => (
        <option key={t.id} value={t.id} className="text-[#1a2533]">
          {t.name}
        </option>
      ))}
    </SelectBase>
  </FieldWrap>
</div>

      {/* Date Range */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
        <div className="ae-card-header-inner" style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Calendar size={16} color={C.accent} />
          </div>
          <div>
            <div style={{ ...F, fontSize: 14, fontWeight: 700, color: C.dark }}>Exam Date Range</div>
            <div style={{ ...F, fontSize: 12, color: C.mid }}>Start and end of the exam period</div>
          </div>
        </div>
        <div className="ae-grid-2" style={{ padding: "16px 20px", display: "grid", gap: 16 }}>
          <FieldWrap error={errors.fromDate}>
            <Label required>From Date</Label>
            <InputBase type="date" value={data.fromDate || ""} onChange={v => onChange("fromDate", v)} error={errors.fromDate} />
          </FieldWrap>
          <FieldWrap error={errors.toDate}>
            <Label required>To Date</Label>
            <InputBase type="date" value={data.toDate || ""} onChange={v => onChange("toDate", v)} error={errors.toDate} />
          </FieldWrap>
        </div>
      </div>

      {/* Time Slots */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
        <div className="ae-card-header-inner" style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Clock size={16} color="#a855f7" />
          </div>
          <div>
            <div style={{ ...F, fontSize: 14, fontWeight: 700, color: C.dark }}>Time Slots</div>
            <div style={{ ...F, fontSize: 12, color: C.mid }}>Define exam windows (Morning, Afternoon etc.)</div>
          </div>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {slots.length === 0 && (
            <div style={{ ...F, fontSize: 12, color: C.mid, padding: "8px 0", fontStyle: "italic" }}>
              No time slots defined. Add a slot below or enter times manually per exam.
            </div>
          )}
          {slots.map((slot, i) => (
            <div key={slot._key} className="ae-slot-row" style={{ display: "grid", gap: 12, alignItems: "end", background: "#f8fafc", borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}` }}>
              <FInput label="Slot Name" value={slot.name} onChange={v => updateSlot(slot._key, "name", v)} placeholder={`e.g. Morning, Session ${i + 1}`} />
              <FInput label="Start Time" type="time" value={slot.startTime} onChange={v => updateSlot(slot._key, "startTime", v)} />
              <FInput label="End Time" type="time" value={slot.endTime} onChange={v => updateSlot(slot._key, "endTime", v)} />
              <button onClick={() => removeSlot(slot._key)}
                className="ae-slot-del"
                style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "none", cursor: "pointer", color: "#ef4444", marginBottom: 2 }}
                onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button onClick={addSlot}
            style={{ border: `1.5px dashed ${C.border}`, background: "transparent", color: C.accent, cursor: "pointer", ...F, borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, width: "fit-content" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = C.border; }}>
            <Plus size={14} /> Add Time Slot
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEP 2 — Select Classes
══════════════════════════════════════════════ */
function StepSelectClasses({ classSections, classLoading, selectedSections, onToggleSection, onToggleGrade }) {
  const [expandedGrades, setExpandedGrades] = useState({});

  const gradeGroups = useMemo(() => {
    const g = {};
    classSections.forEach(cs => {
      if (!g[cs.grade]) g[cs.grade] = [];
      g[cs.grade].push(cs);
    });
    return g;
  }, [classSections]);

  const grades = Object.keys(gradeGroups).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

  useEffect(() => {
    const init = {};
    grades.forEach(g => { init[g] = true; });
    setExpandedGrades(init);
  }, [classSections.length]);

  if (classLoading) {
    return (
      <div className="ae-step-padding" style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${C.border}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 14, borderRadius: 6, background: `${C.light}55`, width: "40%" }} />
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3].map(j => <div key={j} style={{ height: 36, borderRadius: 10, background: `${C.light}44`, flex: 1 }} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="ae-step-padding" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "28px 32px" }}>
      <div>
        <h2 className="ae-step-heading" style={{ ...F, fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Select Classes</h2>
        <p style={{ ...F, fontSize: 13, color: C.mid, marginTop: 6, marginBottom: 0 }}>
          Choose which grades and sections this exam applies to. ({selectedSections.length} selected)
        </p>
      </div>

      {grades.map(grade => {
        const sections = gradeGroups[grade];
        const allSelected = sections.every(cs => selectedSections.includes(cs.id));
        const someSelected = sections.some(cs => selectedSections.includes(cs.id));
        const expanded = expandedGrades[grade] !== false;

        return (
          <div key={grade} style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${someSelected ? C.accent : C.border}`, overflow: "hidden", transition: "border-color .15s" }}>
            <div className="ae-section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: someSelected ? `${C.accent}08` : "#f8fafc", borderBottom: expanded ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
              onClick={() => setExpandedGrades(p => ({ ...p, [grade]: !expanded }))}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: someSelected ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GraduationCap size={13} color={someSelected ? "#fff" : C.mid} />
                </div>
                <div style={{ ...F, fontSize: 14, fontWeight: 700, color: C.dark }}>Grade {grade}</div>
                <span style={{ ...F, fontSize: 11, color: C.mid }}>({sections.length} section{sections.length !== 1 ? "s" : ""})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button"
                  onClick={e => { e.stopPropagation(); onToggleGrade(grade, sections, !allSelected); }}
                  style={{ ...F, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, border: `1.5px solid ${allSelected ? C.accent : C.border}`, background: allSelected ? C.accent : "transparent", color: allSelected ? "#fff" : C.mid, cursor: "pointer" }}>
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            {expanded && (
              <div style={{ padding: "12px 20px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sections.map(cs => {
                  const sel = selectedSections.includes(cs.id);
                  return (
                    <button key={cs.id} type="button"
                      onClick={() => onToggleSection(cs.id)}
                      style={{
                        ...F, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10,
                        border: `1.5px solid ${sel ? C.accent : C.border}`,
                        background: sel ? C.accent : "#fff",
                        color: sel ? "#fff" : C.mid, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6, transition: "all .15s",
                      }}>
                      {sel && <Check size={12} strokeWidth={3} />}
                      {cs.section ? `Section ${cs.section}` : "Main"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {grades.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0", color: C.light, ...F }}>
          <Users size={32} style={{ opacity: .3 }} />
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No classes found. Please add classes first.</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MARKS PRESET MANAGER
══════════════════════════════════════════════ */
function MarksPresetManager({ presets, onPresetsChange }) {
  const [expanded, setExpanded] = useState(false);

  const addPreset = () => {
    onPresetsChange([...presets, { id: Date.now() + Math.random(), maxMarks: "", passingMarks: "" }]);
    setExpanded(true);
  };
  const removePreset = (id) => onPresetsChange(presets.filter(p => p.id !== id));
  const updatePreset = (id, field, val) => onPresetsChange(presets.map(p => p.id === id ? { ...p, [field]: val } : p));

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
      <div className="ae-preset-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", cursor: "pointer", background: expanded ? "#f8fafc" : "#fff" }}
        onClick={() => setExpanded(p => !p)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Settings size={14} color="#a855f7" />
          </div>
          <div>
            <div style={{ ...F, fontSize: 13, fontWeight: 700, color: C.dark }}>Marks Presets <span style={{ fontSize: 11, color: C.mid, fontWeight: 500 }}>({presets.length})</span></div>
            <div style={{ ...F, fontSize: 11, color: C.mid }}>Reusable Max/Pass marks configurations</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={e => { e.stopPropagation(); addPreset(); }}
            style={{ ...F, fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Plus size={12} /> Add Preset
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ae-preset-body" style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {presets.length === 0 ? (
            <div style={{ ...F, fontSize: 12, color: C.mid, padding: "8px 0", fontStyle: "italic" }}>No presets. Add one above or enter marks manually per exam slot.</div>
          ) : presets.map((p, i) => (
            <div key={p.id} className="ae-preset-row" style={{ display: "grid", gap: 10, alignItems: "end", background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.border}` }}>
              <div className="ae-preset-num" style={{ ...F, fontSize: 11, fontWeight: 700, color: C.light, paddingBottom: 10 }}>#{i + 1}</div>
              <FieldWrap>
                <Label>Max Marks</Label>
                <InputBase type="number" value={p.maxMarks} onChange={v => updatePreset(p.id, "maxMarks", v)} placeholder="100" />
              </FieldWrap>
              <FieldWrap>
                <Label>Passing Marks</Label>
                <InputBase type="number" value={p.passingMarks} onChange={v => updatePreset(p.id, "passingMarks", v)} placeholder="35" />
              </FieldWrap>
              <button onClick={() => removePreset(p.id)}
                className="ae-preset-del"
                style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "none", cursor: "pointer", color: "#ef4444", marginBottom: 2 }}
                onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   EXAM DATE CARD (used in Step 3)
══════════════════════════════════════════════ */
function ExamDateCard({ sc, idx, errors, subjectsMap, onChange, onRemove, timeSlots, examDateOptions, marksPresets, usedSubjectIds }) {
  const err = f => errors[`${sc._key}_${f}`];
  const allSubjects  = subjectsMap[sc.classSectionId];
  const subsLoading  = allSubjects === null;
  const dateInfo     = fmtDate(sc.examDate);

  const availableSubjects = useMemo(() => {
    if (!Array.isArray(allSubjects)) return [];
    return allSubjects.filter(s => !usedSubjectIds.has(s.id) || s.id === sc.subjectId);
  }, [allSubjects, usedSubjectIds, sc.subjectId]);

  /* ✅ FIX: Slot key matching — compare "HH:MM" of startTime/endTime to slot times */
  const resolveSlotKey = (startTime, endTime, slots) => {
    if (!startTime || !slots || slots.length === 0) return "";
    const st = String(startTime).substring(0, 5);
    const et = String(endTime || "").substring(0, 5);
    const match = slots.find(s =>
      String(s.startTime).substring(0, 5) === st &&
      String(s.endTime || "").substring(0, 5) === et
    );
    return match ? String(match._key) : "";
  };

  /* ✅ Compute the effective slotKey for display (either stored or resolved from times) */
  const effectiveSlotKey = useMemo(() => {
    if (sc.slotKey) return String(sc.slotKey);
    return resolveSlotKey(sc.startTime, sc.endTime, timeSlots);
  }, [sc.slotKey, sc.startTime, sc.endTime, timeSlots]);

  const handleSlotSelect = (slotKey) => {
    const slot = timeSlots.find(s => String(s._key) === String(slotKey));
    onChange("slotKey", slotKey);
    if (slot) {
      onChange("startTime", slot.startTime || "");
      onChange("endTime", slot.endTime || "");
    } else {
      // Cleared
      onChange("slotKey", "");
    }
  };

  const handlePresetSelect = (presetId) => {
    onChange("markPresetId", presetId);
    const preset = marksPresets.find(p => String(p.id) === String(presetId));
    if (preset) {
      onChange("maxMarks", preset.maxMarks || "");
      onChange("passingMarks", preset.passingMarks || "");
    }
  };

  return (
    <div style={{ border: `1.5px solid ${sc._isExisting ? "#bfdbfe" : C.border}`, borderRadius: 14, overflow: "hidden", background: "#fafcff" }}>
      {/* Date header */}
      <div className="ae-card-date-header" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: sc._isExisting ? "#eff6ff" : "#f8fafc", borderBottom: `1px solid ${sc._isExisting ? "#bfdbfe" : C.border}` }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: sc._isExisting ? "#3b82f6" : C.accent,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ ...F, fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
            {sc.examDate ? dateInfo.dateNum : idx + 1}
          </span>
          <span style={{ ...F, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>
            {sc.examDate ? dateInfo.month : "NEW"}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...F, fontSize: 13, fontWeight: 700, color: C.dark }}>
            {sc.examDate ? dateInfo.full : `Exam Slot ${idx + 1}`}
          </div>
          <div style={{ ...F, fontSize: 11, color: C.mid }}>
            {sc.examDate ? `${dateInfo.day} · ` : ""}
            {sc.startTime && sc.endTime ? `${fmtTime(sc.startTime)} – ${fmtTime(sc.endTime)}` : "Time not set"}
            {sc._isExisting && (
              <span style={{ marginLeft: 8, padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "#dbeafe", color: "#3b82f6" }}>
                Existing
              </span>
            )}
          </div>
        </div>
        <button onClick={onRemove}
          style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "none", cursor: "pointer", color: "#ef4444", flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
          onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
          <Trash2 size={12} />
        </button>
      </div>

      {/* Fields */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Row 1: Exam Date + Time Slot */}
        <div className="ae-grid-2" style={{ display: "grid", gap: 12 }}>
          <FieldWrap error={err("examDate")}>
            <Label required>Exam Date</Label>
            {examDateOptions.length > 0 ? (
              <SelectBase value={sc.examDate} onChange={v => onChange("examDate", v)} error={err("examDate")}>
                <option value="">— Select Date —</option>
                {examDateOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </SelectBase>
            ) : (
              <InputBase type="date" value={sc.examDate} onChange={v => onChange("examDate", v)} error={err("examDate")} />
            )}
          </FieldWrap>

          <FieldWrap>
            <Label>Time Slot</Label>
            {timeSlots.length > 0 ? (
              /* ✅ FIX: use effectiveSlotKey so existing records show the correct slot name */
              <SelectBase value={effectiveSlotKey} onChange={handleSlotSelect}>
                <option value="">— Select Slot —</option>
                {timeSlots.map(slot => (
                  <option key={slot._key} value={String(slot._key)}>
                    {slot.name || `Slot ${timeSlots.indexOf(slot) + 1}`}
                    {slot.startTime ? ` (${fmtTime(slot.startTime)}${slot.endTime ? ` – ${fmtTime(slot.endTime)}` : ""})` : ""}
                  </option>
                ))}
              </SelectBase>
            ) : (
              <div className="ae-grid-2" style={{ display: "grid", gap: 8 }}>
                <InputBase type="time" value={sc.startTime} onChange={v => onChange("startTime", v)} />
                <InputBase type="time" value={sc.endTime} onChange={v => onChange("endTime", v)} />
              </div>
            )}
          </FieldWrap>
        </div>

        {/* If slot has time but no preset slot, show raw time inputs */}
        {timeSlots.length > 0 && !effectiveSlotKey && (
          <div className="ae-grid-2" style={{ display: "grid", gap: 12 }}>
            <FieldWrap>
              <Label>Start Time (manual)</Label>
              <InputBase type="time" value={sc.startTime} onChange={v => onChange("startTime", v)} />
            </FieldWrap>
            <FieldWrap>
              <Label>End Time (manual)</Label>
              <InputBase type="time" value={sc.endTime} onChange={v => onChange("endTime", v)} />
            </FieldWrap>
          </div>
        )}

        {/* Row 2: Marks Preset + Max + Pass */}
        <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "10px 14px", border: `1px solid #bae6fd` }}>
          <div className="ae-marks-row" style={{ display: "grid", gap: 10, alignItems: "end" }}>
            <FieldWrap>
              <Label>Marks Preset</Label>
              <SelectBase value={sc.markPresetId || ""} onChange={handlePresetSelect}>
                <option value="">— Select Preset or enter manually —</option>
                {marksPresets.filter(p => p.maxMarks).map(p => (
                  <option key={p.id} value={p.id}>Max: {p.maxMarks} · Pass: {p.passingMarks || "—"}</option>
                ))}
              </SelectBase>
            </FieldWrap>
            <FieldWrap error={err("maxMarks")}>
              <Label required>Max Marks</Label>
              <InputBase type="number" value={sc.maxMarks} onChange={v => { onChange("maxMarks", v); onChange("markPresetId", ""); }} placeholder="100" error={err("maxMarks")} />
            </FieldWrap>
            <FieldWrap>
              <Label>Passing Marks</Label>
              <InputBase type="number" value={sc.passingMarks} onChange={v => { onChange("passingMarks", v); onChange("markPresetId", ""); }} placeholder="35" />
            </FieldWrap>
          </div>
        </div>

        {/* Row 3: Subject */}
        <div className="ae-subject-row" style={{ display: "grid", gap: 12, alignItems: "end", background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.border}` }}>
          <div className="ae-subject-label" style={{ ...F, fontSize: 10, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.06em", paddingBottom: 2, whiteSpace: "nowrap" }}>EXAM {idx + 1}</div>
          <FieldWrap error={err("subjectId")}>
            <Label required>Subject</Label>
            <SelectBase value={sc.subjectId} onChange={v => onChange("subjectId", v)} loading={subsLoading} error={err("subjectId")}>
              <option value="">
                {!sc.classSectionId ? "— Select —" : subsLoading ? "Loading…" : availableSubjects.length === 0 ? "All subjects assigned" : "— Select —"}
              </option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectBase>
            {Array.isArray(allSubjects) && usedSubjectIds.size > 0 && (
              <span style={{ ...F, fontSize: 10, color: C.light, marginTop: 2 }}>
                {usedSubjectIds.size} subject{usedSubjectIds.size !== 1 ? "s" : ""} already assigned in other slots
              </span>
            )}
          </FieldWrap>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEP 3 — Build Schedule
══════════════════════════════════════════════ */
function StepBuildSchedule({
  classSections, selectedSections, schedules, setSched, schedErrors, setSchedErrors,
  subjectsMap, classLoading, loadSched, fetchSubjectsFor,
  setSchedField, removeSched, timingData,
}) {
  const selectedCS = classSections.filter(cs => selectedSections.includes(cs.id));

  const [marksPresets, setMarksPresets] = useState([]);
  const [copiedSections, setCopiedSections] = useState({});
  const [dismissedBanners, setDismissedBanners] = useState({});

  const examDateOptions = useMemo(() => {
    if (!timingData.fromDate || !timingData.toDate) return [];
    const dates = [];
    const cur = new Date(timingData.fromDate + "T00:00:00");
    const end = new Date(timingData.toDate + "T00:00:00");
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      const info = fmtDate(iso);
      dates.push({ value: iso, label: `${info.day}, ${info.dateNum} ${info.month} ${y}` });
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [timingData.fromDate, timingData.toDate]);

  const timeSlots = timingData.timeSlots || [];

  const gradeGroups = useMemo(() => {
    const g = {};
    selectedCS.forEach(cs => {
      if (!g[cs.grade]) g[cs.grade] = [];
      g[cs.grade].push(cs);
    });
    return g;
  }, [selectedCS]);

  const copyTimetableTo = (sourceCs, targetCs) => {
    const sourceSlots = schedules.filter(s => s.classSectionId === sourceCs.id);
    if (sourceSlots.length === 0) return;
    setSched(p => {
      const filtered = p.filter(s => s.classSectionId !== targetCs.id);
      const copies = sourceSlots.map(s => ({
        ...s,
        _key: Date.now() + Math.random(),
        _saved: false,
        _savedId: null,
        _isExisting: false,
        classSectionId: targetCs.id,
        grade: targetCs.grade,
      }));
      return [...filtered, ...copies];
    });
    setCopiedSections(p => ({ ...p, [targetCs.id]: sourceCs.id }));
    fetchSubjectsFor(targetCs.id);
  };

  const renderGradeGroup = (grade, sections) => {
    const sourceCs = sections.find(cs => schedules.filter(s => s.classSectionId === cs.id).length > 0) || sections[0];
    const sourceHasSlots = schedules.filter(s => s.classSectionId === sourceCs.id).length > 0;

    return sections.map((cs) => {
      const sectionSchedules = schedules.filter(s => s.classSectionId === cs.id);
      const isSource   = cs.id === sourceCs.id;
      const isCopied   = !!copiedSections[cs.id];
      const isDismissed = !!dismissedBanners[cs.id];
      const showCopyBanner = !isSource && sections.length > 1 && sourceHasSlots
        && sectionSchedules.length === 0 && !isDismissed && !isCopied;

      return (
        <div key={cs.id} style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
          {/* Section header */}
          <div style={{ background: "linear-gradient(135deg, #1e2d3d 0%, #2d4a6e 100%)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ ...F, fontSize: 15, fontWeight: 700, color: "#fff" }}>
                Grade {cs.grade}{cs.section ? ` — Section ${cs.section}` : ""}
              </div>
              {timingData.fromDate && timingData.toDate && (
                <div className="ae-hide-mobile" style={{ ...F, fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>
                  {sectionSchedules.length} slot{sectionSchedules.length !== 1 ? "s" : ""} · {timingData.fromDate} → {timingData.toDate}
                </div>
              )}
            </div>
            {isCopied && (
              <span style={{ ...F, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(16,185,129,0.2)", color: "#6ee7b7", whiteSpace: "nowrap" }}>
                ✓ Copied from {sourceCs.section ? `Section ${sourceCs.section}` : "Section A"}
              </span>
            )}
          </div>

          {/* Same timetable banner */}
          {showCopyBanner && (
            <div className="ae-copy-banner" style={{ margin: "12px 16px 0", padding: "12px 16px", borderRadius: 12, background: "#eff6ff", border: `1.5px solid #bfdbfe`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Layers size={15} color={C.accent} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...F, fontSize: 13, fontWeight: 700, color: C.dark }}>Same timetable as Section {sourceCs.section || "A"}?</div>
                <div style={{ ...F, fontSize: 11, color: C.mid, marginTop: 2 }}>
                  Copy the {schedules.filter(s => s.classSectionId === sourceCs.id).length} exam slot(s) from Section {sourceCs.section || "A"} to this section.
                </div>
              </div>
              <div className="ae-copy-banner-btns" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => copyTimetableTo(sourceCs, cs)}
                  style={{ ...F, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.accentDark}
                  onMouseLeave={e => e.currentTarget.style.background = C.accent}>
                  Yes, Copy
                </button>
                <button type="button" onClick={() => setDismissedBanners(p => ({ ...p, [cs.id]: true }))}
                  style={{ ...F, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: "#fff", color: C.mid, cursor: "pointer", whiteSpace: "nowrap" }}>
                  No, Individual
                </button>
              </div>
            </div>
          )}

          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {loadSched ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.mid, ...F, fontSize: 13, padding: "20px 0" }}>
                <Loader2 size={16} style={{ animation: "ae-spin .8s linear infinite" }} /> Loading schedules…
              </div>
            ) : (
              <>
                {schedules.filter(s => s.classSectionId === cs.id).map((sc, idx) => {
                  const usedSubjectIds = new Set(
                    schedules
                      .filter(s => s.classSectionId === cs.id && s._key !== sc._key && s.subjectId)
                      .map(s => s.subjectId)
                  );
                  return (
                    <ExamDateCard
                      key={sc._key}
                      sc={sc} idx={idx}
                      errors={schedErrors}
                      subjectsMap={subjectsMap}
                      prefilledSection={cs}
                      onChange={(f, v) => setSchedField(sc._key, f, v)}
                      onRemove={() => removeSched(sc)}
                      timeSlots={timeSlots}
                      examDateOptions={examDateOptions}
                      marksPresets={marksPresets}
                      usedSubjectIds={usedSubjectIds}
                    />
                  );
                })}

                <button type="button"
                  onClick={() => {
                    setSched(p => [...p, { ...emptyIndividual(), grade: cs.grade, classSectionId: cs.id }]);
                    fetchSubjectsFor(cs.id);
                  }}
                  style={{ border: `1.5px dashed ${C.border}`, background: "transparent", color: C.accent, cursor: "pointer", ...F, borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = C.border; }}>
                  <Plus size={14} /> Add Exam for this Section
                </button>
              </>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="ae-step-padding" style={{ display: "flex", flexDirection: "column", gap: 20, padding: "28px 32px" }}>
      <div>
        <h2 style={{ ...F, fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Build Exam Schedule</h2>
        <p style={{ ...F, fontSize: 13, color: C.mid, marginTop: 6, marginBottom: 0 }}>Assign subjects and time slots for each exam date.</p>
      </div>

      <MarksPresetManager presets={marksPresets} onPresetsChange={setMarksPresets} />

      {Object.keys(gradeGroups).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).map(grade =>
        renderGradeGroup(grade, gradeGroups[grade])
      )}

      {selectedCS.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0", color: C.light, ...F }}>
          <BookOpen size={32} style={{ opacity: .3 }} />
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No sections selected. Go back to Step 2.</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEP 4 — Review & Save
══════════════════════════════════════════════ */
function StepReview({ timingData, selectedSections, classSections, schedules, academicYearLabel }) {
  const selectedCS   = classSections.filter(cs => selectedSections.includes(cs.id));
  const newSchedules = schedules.filter(s => !s._isExisting);

  return (
    <div className="ae-step-padding" style={{ display: "flex", flexDirection: "column", gap: 20, padding: "28px 32px" }}>
      <div>
        <h2 style={{ ...F, fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Review & Save</h2>
        <p style={{ ...F, fontSize: 13, color: C.mid, marginTop: 6, marginBottom: 0 }}>
          Confirm everything. The exam will be saved as <strong>Scheduled</strong> and visible to students.
        </p>
      </div>

      {/* Summary cards */}
      <div className="ae-review-grid" style={{ display: "grid", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${C.border}`, padding: "16px 18px" }}>
          <div style={{ ...F, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.light, marginBottom: 6 }}>Assessment Name</div>
          <div style={{ ...F, fontSize: 15, fontWeight: 700, color: C.dark }}>{timingData.name || "—"}</div>
          <div style={{ ...F, fontSize: 12, color: C.mid, marginTop: 3 }}>{academicYearLabel}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${C.border}`, padding: "16px 18px" }}>
          <div style={{ ...F, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.light, marginBottom: 6 }}>Date Range</div>
          <div style={{ ...F, fontSize: 15, fontWeight: 700, color: C.dark }}>{timingData.fromDate || "—"} → {timingData.toDate || "—"}</div>
          <div style={{ ...F, fontSize: 12, color: C.mid, marginTop: 3 }}>{(timingData.timeSlots || []).length} time slot(s)</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${C.border}`, padding: "16px 18px" }}>
          <div style={{ ...F, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.light, marginBottom: 6 }}>Selected Classes</div>
          <div style={{ ...F, fontSize: 15, fontWeight: 700, color: C.dark }}>{selectedCS.length} section(s)</div>
          <div style={{ ...F, fontSize: 12, color: C.mid, marginTop: 3 }}>
            {selectedCS.slice(0, 3).map(cs => `Grade ${cs.grade}${cs.section ? `-${cs.section}` : ""}`).join(", ")}
            {selectedCS.length > 3 ? ` +${selectedCS.length - 3} more` : ""}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${C.border}`, padding: "16px 18px" }}>
          <div style={{ ...F, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.light, marginBottom: 6 }}>Schedules</div>
          <div style={{ ...F, fontSize: 15, fontWeight: 700, color: C.dark }}>{newSchedules.length} to create</div>
          <div style={{ ...F, fontSize: 12, color: C.mid, marginTop: 3 }}>{schedules.filter(s => s._isExisting).length} existing (will be updated)</div>
        </div>
      </div>

      {/* Info note */}
      <div style={{ background: "#eff6ff", borderRadius: 12, border: "1.5px solid #bfdbfe", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ ...F, fontSize: 13, color: "#1d4ed8" }}>
          <strong>Auto-Scheduled:</strong> After saving, this exam will be marked as <em>Scheduled</em> and students in the selected classes will see it. Once exams are done, mark it as <em>Completed</em> from the exam list.
        </div>
      </div>

      {/* Schedule list */}
      {newSchedules.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
          <div className="ae-review-list-header" style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, ...F, fontSize: 14, fontWeight: 700, color: C.dark }}>
            Schedules to Create ({newSchedules.length})
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {newSchedules.map((sc, i) => {
              const cs = classSections.find(c => c.id === sc.classSectionId);
              return (
                <div key={sc._key} className="ae-sched-list-row ae-review-list-row" style={{ display: "grid", gap: 14, padding: "11px 20px", borderBottom: i < newSchedules.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", ...F, fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ ...F, fontSize: 13, fontWeight: 600, color: C.dark, minWidth: 0 }}>
                    Grade {sc.grade || cs?.grade}{sc.classSectionId && cs?.section ? ` - ${cs.section}` : ""}
                  </div>
                  <div style={{ ...F, fontSize: 12, color: C.mid }}>{sc.examDate || "—"}</div>
                  <div style={{ ...F, fontSize: 12, color: C.mid }}>Max: {sc.maxMarks || "—"} · Pass: {sc.passingMarks || "—"}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN MODAL
══════════════════════════════════════════════ */
export default function AddExamsModal({
  academicYearId, academicYearLabel = "",
  group = null, onClose, onSuccess,
}) {
  const isEdit = Boolean(group);

  /* ── Wizard state ── */
  const [currentStep, setCurrentStep]       = useState(1);
  const [completedSteps, setCompletedSteps] = useState(isEdit ? [1, 2, 3] : []);

  /* ── Timing data (step 1) ── */
  const [timingData, setTimingData]     = useState({ name: group?.name || "", fromDate: "", toDate: "", timeSlots: [] });
  const setTimingField = (field, value) => {
    setTimingData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setTimingErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };
  const [timingErrors, setTimingErrors] = useState({});

  /* ── Class selection (step 2) ── */
  const [selectedSections, setSelectedSections] = useState([]);

  /* ── Schedules (step 3) ── */
  const [schedules, setSched]     = useState([]);
  const [schedErrors, setSchedErrors] = useState({});

  /* ── Shared ── */
  const [apiError, setApiError]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [loadSched, setLoadSched] = useState(false);
  const [groupId, setGroupId] = useState(group?.id || null);

    const [selectedTermId, setSelectedTermId] = useState(
      group?.termId || ""
    );

const [terms, setTerms] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [classLoading, setClassLoading]   = useState(false);
  const [subjectsMap, setSubjectsMap]     = useState({});

  useEffect(() => {
    if (!academicYearId) return;

    fetchTerms(academicYearId)
      .then(setTerms)
      .catch(console.error);
  }, [academicYearId]);


  /* ── Fetch class sections ── */
  useEffect(() => {
    setClassLoading(true);
    fetchClassSections()
      .then(d => setClassSections(d.classSections || []))
      .catch(console.error)
      .finally(() => setClassLoading(false));
  }, []);

  /* ── Preload subjects for all sections ── */
  useEffect(() => {
    if (classSections.length === 0) return;
    classSections.forEach(cs => {
      if (subjectsMap[cs.id] !== undefined) return;
      setSubjectsMap(p => ({ ...p, [cs.id]: null }));
      fetchClassSectionById(cs.id)
        .then(d => {
          const subs = d.classSection?.classSubjects?.map(x => x.subject) || [];
          setSubjectsMap(p => ({ ...p, [cs.id]: subs }));
        })
        .catch(() => setSubjectsMap(p => ({ ...p, [cs.id]: [] })));
    });
  }, [classSections]);

  /* ── Edit mode: load schedules via ADMIN route ── */
  useEffect(() => {
    if (!isEdit || !group) return;
    setGroupId(group.id);
    setLoadSched(true);

    fetchSchedulesAdmin(group.id)  // ✅ use admin route — no classSectionId filter
      .then(list => {
        const toHHMM = (t) => {
          if (!t) return "";
          const s = String(t);
          // Handle ISO datetime like "2024-01-01T09:00:00.000Z" → "09:00"
          if (s.includes("T")) return s.split("T")[1].substring(0, 5);
          // Handle "HH:MM:SS" or "HH:MM"
          return s.substring(0, 5);
        };

        const loaded = list.map(sc => ({
          _key: sc.id,
          _saved: false,
          _savedId: sc.id,
          _isExisting: true,
          grade: sc.classSection?.grade || "",
          classSectionId: sc.classSectionId || "",
          subjectId: sc.subjectId || "",
          maxMarks: sc.maxMarks ?? "",
          passingMarks: sc.passingMarks ?? "",
          examDate: sc.examDate ? sc.examDate.split("T")[0] : "",
          startTime: toHHMM(sc.startTime),
          endTime: toHHMM(sc.endTime),
          // ✅ slotKey left empty here — ExamDateCard will resolve it via effectiveSlotKey
          slotKey: "",
          markPresetId: "",
        }));

        setSched(loaded);
        const csIds = [...new Set(loaded.map(s => s.classSectionId).filter(Boolean))];
        setSelectedSections(csIds);

        if (loaded.length > 0) {
          const dates    = loaded.map(s => s.examDate).filter(Boolean).sort();
          const fromDate = dates[0] || "";
          const toDate   = dates[dates.length - 1] || "";

          // ✅ Reconstruct time slots from actual schedule times
          // Each unique startTime+endTime combo becomes a slot
          const slotMap = new Map();
          loaded.forEach((s, i) => {
            if (s.startTime && s.endTime) {
              const key = `${s.startTime}|${s.endTime}`;
              if (!slotMap.has(key)) {
                slotMap.set(key, {
                  // ✅ Use the time string as _key so effectiveSlotKey can match via startTime comparison
                  _key: key,
                  name: "",          // Admin can rename; blank by default
                  startTime: s.startTime,
                  endTime: s.endTime,
                });
              }
            }
          });
          const timeSlots = Array.from(slotMap.values());

          setTimingData(p => ({
            ...p,
            name: group.name || "",
            fromDate,
            toDate,
            timeSlots,
          }));
        } else {
          setTimingData(p => ({ ...p, name: group.name || "" }));
        }
      })
      .catch(console.error)
      .finally(() => setLoadSched(false));
  }, [isEdit, group]);

  /* ── Escape key ── */
  useEffect(() => {
    const h = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  /* ── Grade / Section helpers ── */
  const gradeOptions = useMemo(() => {
    const seen = new Set();
    return classSections
      .filter(cs => { if (seen.has(cs.grade)) return false; seen.add(cs.grade); return true; })
      .map(cs => ({ value: cs.grade, label: cs.grade }));
  }, [classSections]);

  const sectionsFor = grade =>
    classSections.filter(cs => cs.grade === grade)
      .map(cs => ({ value: cs.id, label: cs.section ? `Section ${cs.section}` : "Main" }));

  const fetchSubjectsFor = cid => {
    if (!cid || subjectsMap[cid] !== undefined) return;
    setSubjectsMap(p => ({ ...p, [cid]: null }));
    fetchClassSectionById(cid)
      .then(d => {
        const subs = d.classSection?.classSubjects?.map(cs => cs.subject) || [];
        setSubjectsMap(p => ({ ...p, [cid]: subs }));
      })
      .catch(() => setSubjectsMap(p => ({ ...p, [cid]: [] })));
  };

  /* ── Schedule field helpers ── */
  const setSchedField = (key, field, value) => {
    setSched(p => p.map(s => s._key === key ? { ...s, [field]: value } : s));
    setSchedErrors(p => ({ ...p, [`${key}_${field}`]: "" }));
  };

  const removeSched = async sc => {
    if (sc._isExisting && sc._savedId) {
      if (!window.confirm("Remove this schedule from the server?")) return;
      try { await deleteSchedule(sc._savedId); } catch (e) { alert(e.message); return; }
    }
    setSched(p => p.filter(s => s._key !== sc._key));
  };

  /* ── Section toggle ── */
  const toggleSection = (csId) => {
    setSelectedSections(p =>
      p.includes(csId) ? p.filter(id => id !== csId) : [...p, csId]
    );
  };
  const toggleGrade = (grade, sections, select) => {
    setSelectedSections(p => {
      const ids = sections.map(cs => cs.id);
      if (select) return [...new Set([...p, ...ids])];
      return p.filter(id => !ids.includes(id));
    });
  };

  /* ── Step validation ── */
  const validateStep = (step) => {
    if (step === 1) {
      const errs = {};
      if (!timingData.name.trim()) errs.name = "Exam name is required";
      if (Object.keys(errs).length) { setTimingErrors(errs); return false; }
      setTimingErrors({});
    }
    if (step === 2) {
      if (selectedSections.length === 0) {
        alert("Please select at least one section.");
        return false;
      }
    }
    if (step === 3) {
      const sErrs = {};
      schedules.forEach(sc => {
        if (!sc.classSectionId) sErrs[`${sc._key}_classSectionId`] = "Required";
        if (!sc.subjectId)      sErrs[`${sc._key}_subjectId`]      = "Required";
        if (!sc.examDate)       sErrs[`${sc._key}_examDate`]       = "Required";
        if (!sc.maxMarks)       sErrs[`${sc._key}_maxMarks`]       = "Required";
      });
      if (Object.keys(sErrs).length) { setSchedErrors(sErrs); return false; }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCompletedSteps(p => [...new Set([...p, currentStep])]);
    setCurrentStep(s => Math.min(s + 1, 4));
  };

  const goBack = () => setCurrentStep(s => Math.max(s - 1, 1));

  /* ── Final submit ── */
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    setApiError("");
    try {
      let gId = groupId;

      // ✅ FIX: Always include isPublished: true so new exams are "Scheduled" (not Draft)
      const payload = {
        name: timingData.name.trim(),
        academicYearId,
        isPublished: true,   // auto-schedule on create
        isLocked: false,
      };

        if (isEdit && gId) {
        await updateGroup(gId, {
          name: timingData.name.trim(),
          termId: selectedTermId, // ✅ add this
        });
      } else {
        const payload = {
          name: timingData.name.trim(),
          academicYearId,
          weightage: 0,
          termId: selectedTermId, // ✅ REQUIRED
        };

        const r = await createGroup(payload);

        gId = r.id;
        setGroupId(gId);
      }

      const normalizeTime = (t) => {
        if (!t || typeof t !== "string") return "00:00";
        const clean = t.trim().substring(0, 5);
        return /^\d{2}:\d{2}$/.test(clean) ? clean : "00:00";
      };

      // Delete existing schedules that are being re-created
      const existingToUpdate = schedules.filter(sc => sc._isExisting && sc._savedId);
      for (const sc of existingToUpdate) {
        await deleteSchedule(sc._savedId);
      }

      // Create all schedules (new + updated existing)
      for (const sc of schedules) {
        if (!sc.subjectId || !sc.classSectionId || !sc.examDate) continue;
        const scheduleData = {
          assessmentGroupId: gId,
          subjectId:         sc.subjectId,
          classSectionId:    sc.classSectionId,
          maxMarks:          Number(sc.maxMarks) || 0,
          passingMarks:      Number(sc.passingMarks) || 0,
          examDate:          sc.examDate,
          startTime:         normalizeTime(sc.startTime),
          endTime:           normalizeTime(sc.endTime),
        };
        await createSchedule(scheduleData);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setApiError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progressPct = (currentStep / 4) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes modalIn { from{opacity:0;transform:translate(-50%,-47%) scale(.97)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes ae-spin { to { transform:rotate(360deg) } }
        .ae-scroll::-webkit-scrollbar { width:4px }
        .ae-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:8px }

        .ae-modal { width: min(98vw, 920px); max-width: 96vw; max-height: 94vh; border-radius: 24px; }
        @media (max-width: 640px) {
          .ae-modal { width:100vw!important; max-width:100vw!important; height:100vh!important; max-height:100vh!important; border-radius:0!important; top:0!important; left:0!important; transform:none!important; animation:mobileIn .2s ease!important; }
          @keyframes mobileIn { from{opacity:0} to{opacity:1} }
        }
        @media (min-width:641px) and (max-width:1024px) {
          .ae-modal { width:96vw!important; max-width:96vw!important; max-height:96vh!important; }
        }

        .ae-stepper-wrap { padding:18px 32px; overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .ae-stepper-wrap::-webkit-scrollbar { display:none; }
        .ae-step-item { min-width:120px; }
        .ae-step-connector { max-width:60px; }
        @media (max-width:640px) {
          .ae-stepper-wrap { padding:14px 12px; justify-content:flex-start!important; }
          .ae-step-item { min-width:72px; }
          .ae-step-label { font-size:10px!important; letter-spacing:-0.01em; }
          .ae-step-sub { display:none!important; }
          .ae-step-connector { max-width:24px; margin:0 2px!important; }
        }
        @media (min-width:641px) and (max-width:860px) {
          .ae-step-item { min-width:100px; }
          .ae-step-sub { font-size:9px!important; }
          .ae-step-connector { max-width:36px; }
        }

        .ae-step-padding { padding:28px 32px; }
        @media (max-width:640px) { .ae-step-padding { padding:20px 14px; } }
        @media (min-width:641px) and (max-width:1024px) { .ae-step-padding { padding:24px 20px; } }

        .ae-grid-2 { grid-template-columns:1fr 1fr; }
        @media (max-width:640px) { .ae-grid-2 { grid-template-columns:1fr!important; } }

        .ae-slot-row { grid-template-columns:1fr 1fr 1fr auto; }
        @media (max-width:640px) {
          .ae-slot-row { grid-template-columns:1fr 1fr!important; }
          .ae-slot-del { grid-column:1/-1!important; width:100%!important; justify-content:center; }
        }

        .ae-marks-row { grid-template-columns:1fr auto auto; }
        @media (max-width:640px) { .ae-marks-row { grid-template-columns:1fr!important; } }

        .ae-preset-row { grid-template-columns:auto 1fr 1fr auto; }
        @media (max-width:640px) {
          .ae-preset-row { grid-template-columns:1fr 1fr!important; }
          .ae-preset-num { display:none!important; }
          .ae-preset-del { grid-column:1/-1!important; width:100%!important; justify-content:center; }
        }

        .ae-subject-row { grid-template-columns:auto 1fr; }
        @media (max-width:640px) {
          .ae-subject-row { grid-template-columns:1fr!important; }
          .ae-subject-label { display:none!important; }
        }

        .ae-review-grid { grid-template-columns:1fr 1fr; }
        @media (max-width:640px) { .ae-review-grid { grid-template-columns:1fr!important; } }

        .ae-sched-list-row { grid-template-columns:auto 1fr 1fr 1fr; }
        @media (max-width:640px) { .ae-sched-list-row { grid-template-columns:auto 1fr!important; gap:6px!important; } }

        .ae-flex-row { display:flex; gap:24px; align-items:flex-start; }
        @media (max-width:640px) { .ae-flex-row { flex-direction:column!important; gap:16px!important; } .ae-side-panel { width:100%!important; } }

        .ae-copy-banner { flex-direction:row; }
        @media (max-width:580px) {
          .ae-copy-banner { flex-direction:column!important; align-items:flex-start!important; }
          .ae-copy-banner-btns { width:100%; justify-content:flex-end; margin-top:4px; }
        }

        @media (max-width:480px) { .ae-card-header-inner { flex-wrap:wrap; gap:8px!important; } }
        @media (max-width:400px) {
          .ae-card-date-header { gap:10px!important; }
          .ae-card-date-header>div:first-child { width:38px!important; height:38px!important; }
          .ae-card-date-header>div:first-child span:first-child { font-size:15px!important; }
        }

        @media (max-width:640px) { .ae-hide-mobile { display:none!important; } }

        .ae-footer { padding:0 32px 20px; }
        @media (max-width:640px) { .ae-footer { padding:0 14px 14px; } }
        .ae-footer-inner { display:flex; align-items:center; justify-content:space-between; }
        @media (max-width:640px) {
          .ae-footer-inner { flex-direction:column!important; gap:10px!important; align-items:stretch!important; }
          .ae-footer-step-label { text-align:center; }
        }
        .ae-footer-btns { display:flex; gap:10px; }
        @media (max-width:640px) {
          .ae-footer-btns { flex-wrap:wrap; gap:8px!important; }
          .ae-footer-btns button { flex:1 1 0; min-width:0; justify-content:center; padding:10px 12px!important; font-size:12px!important; }
        }

        .ae-modal-header { padding:14px 24px; }
        @media (max-width:640px) { .ae-modal-header { padding:12px 16px; } }
        .ae-api-error { margin:12px 24px 0; }
        @media (max-width:640px) { .ae-api-error { margin:10px 14px 0; } }
        @media (max-width:640px) { .ae-step-heading { font-size:18px!important; } }
      `}</style>

      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }} />

      {/* Modal */}
      <div className="ae-modal" style={{
        position: "fixed", zIndex: 50, top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 32px 80px rgba(15,23,42,0.25), 0 4px 16px rgba(15,23,42,0.1)",
        animation: "modalIn 0.22s ease", ...F,
      }}>

        {/* Header */}
        <div className="ae-modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(135deg, ${C.navy}, ${C.dark})`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ClipboardList size={18} color="#93c5fd" />
            </div>
            <div>
              <div style={{ ...F, fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {isEdit ? "Edit Assessment" : "Exam Setup"}
              </div>
              <div className="ae-hide-mobile" style={{ ...F, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                {academicYearLabel || "New Exam Configuration"}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 8, borderRadius: 9, display: "flex", flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
            <X size={16} />
          </button>
        </div>

        {/* Top Stepper */}
        <TopStepper currentStep={currentStep} completedSteps={completedSteps} />

        {/* API Error */}
        {apiError && (
          <div className="ae-api-error" style={{ padding: "11px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: C.red, fontSize: 13, ...F, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />{apiError}
          </div>
        )}

        {/* Body */}
        <div className="ae-scroll" style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {currentStep === 1 && (
          <StepConfigureTimings
            data={timingData}
            onChange={setTimingField}
            errors={timingErrors}
            terms={terms}
            selectedTermId={selectedTermId}
            setSelectedTermId={setSelectedTermId}
          />
          )}
          {currentStep === 2 && (
            <StepSelectClasses
              classSections={classSections}
              classLoading={classLoading}
              selectedSections={selectedSections}
              onToggleSection={toggleSection}
              onToggleGrade={toggleGrade}
            />
          )}
          {currentStep === 3 && (
            <StepBuildSchedule
              classSections={classSections}
              selectedSections={selectedSections}
              schedules={schedules}
              setSched={setSched}
              schedErrors={schedErrors}
              setSchedErrors={setSchedErrors}
              subjectsMap={subjectsMap}
              classLoading={classLoading}
              loadSched={loadSched}
              fetchSubjectsFor={fetchSubjectsFor}
              setSchedField={setSchedField}
              removeSched={removeSched}
              timingData={timingData}
            />
          )}
          {currentStep === 4 && (
            <StepReview
              timingData={timingData}
              selectedSections={selectedSections}
              classSections={classSections}
              schedules={schedules}
              academicYearLabel={academicYearLabel}
            />
          )}
        </div>

        {/* Footer */}
        <div className="ae-footer" style={{ flexShrink: 0, background: C.bg }}>
          <div style={{ height: 3, background: C.border, borderRadius: 99, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: `linear-gradient(90deg, ${C.navy}, ${C.dark})`, borderRadius: 99, transition: "width .3s ease" }} />
          </div>
          <div className="ae-footer-inner">
            <div className="ae-footer-step-label" style={{ ...F, fontSize: 12, color: C.light }}>Step {currentStep} of 4</div>
            <div className="ae-footer-btns" style={{ display: "flex", gap: 10 }}>
              {currentStep > 1 && (
                <button onClick={goBack}
                  style={{ ...F, border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#fff", color: C.mid, display: "flex", alignItems: "center", gap: 6 }}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              <button onClick={onClose}
                style={{ ...F, border: "none", borderRadius: 11, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#f1f5f9", color: C.mid }}>
                Cancel
              </button>
              {currentStep < 4 ? (
                <button onClick={goNext}
                  style={{ ...F, border: "none", borderRadius: 11, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: `linear-gradient(135deg, ${C.navy}, ${C.dark})`, color: "#fff", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(56,73,89,0.3)" }}>
                  {currentStep === 2 ? "Build Schedule" : "Next"} <ChevronRight size={15} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading}
                  style={{ ...F, border: "none", borderRadius: 11, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", background: loading ? "#a0b5c8" : "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff", display: "flex", alignItems: "center", gap: 6, boxShadow: loading ? "none" : "0 4px 14px rgba(16,185,129,0.3)" }}>
                  {loading
                    ? <><Loader2 size={14} style={{ animation: "ae-spin .8s linear infinite" }} />{isEdit ? "Saving…" : "Scheduling…"}</>
                    : <><Check size={14} />{isEdit ? "Save Changes" : "Create & Schedule"}</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}