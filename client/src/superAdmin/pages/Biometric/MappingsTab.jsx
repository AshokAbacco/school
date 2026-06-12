import React, { useState, useEffect, useRef } from "react";

/**
 * MappingsTab
 * -----------
 * STUDENT flow:
 *   School → Person Type (Student) → Class Dropdown → Student List → Select → Enrollment ID → Assign
 *
 * TEACHER / STAFF / ADMIN / FINANCE flow:
 *   School → Person Type → Search by name/code → Select → Enrollment ID → Assign
 *
 * Props:
 *   isSuperAdmin  {boolean}
 *   schoolId      {string}   pre-set when not super admin
 *   currentUserId {string}   assignedById
 */

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/biometric`;

const PERSON_TYPES = ["STUDENT", "TEACHER", "STAFF", "ADMIN", "FINANCE"];
const PT_LABEL = { STUDENT: "Student", TEACHER: "Teacher", STAFF: "Staff", ADMIN: "School Admin", FINANCE: "Finance Admin" };
const PT_COLOR = {
  STUDENT: { bg: "#EEF2FF", text: "#4338CA", dot: "#6366F1", border: "#C7D2FE" },
  TEACHER: { bg: "#F0FDF4", text: "#166534", dot: "#22C55E", border: "#86EFAC" },
  STAFF:   { bg: "#FFF7ED", text: "#9A3412", dot: "#F97316", border: "#FED7AA" },
  ADMIN:   { bg: "#FDF4FF", text: "#7E22CE", dot: "#A855F7", border: "#E9D5FF" },
  FINANCE: { bg: "#FFF1F2", text: "#9F1239", dot: "#F43F5E", border: "#FECDD3" },
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token || null; }
  catch { return null; }
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(url) {
  const res = await fetch(url, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json;
}
async function apiPost(url, body) {
  const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json.data;
}
async function apiPatch(url) {
  const res = await fetch(url, { method: "PATCH", headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json.data;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Spinner({ size = 16, color = "#6366F1" }) {
  return <span style={{ display: "inline-block", width: size, height: size, border: `2px solid ${color}30`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />;
}

function Badge({ type }) {
  const c = PT_COLOR[type] || { bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF", border: "#E5E7EB" };
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, display: "inline-block", flexShrink: 0 }} />
      {PT_LABEL[type] || type}
    </span>
  );
}
function StatusPill({ active }) {
  return <span style={{ background: active ? "#F0FDF4" : "#F9FAFB", color: active ? "#166534" : "#6B7280", border: `1px solid ${active ? "#86EFAC" : "#E5E7EB"}`, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{active ? "Active" : "Inactive"}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const MappingsTab = ({ isSuperAdmin = true, schoolId: fixedSchoolId = null, currentUserId = null }) => {

  // ── School ──
  const [schools,        setSchools]        = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(fixedSchoolId || "");

  // ── Person type ──
  const [personType, setPersonType] = useState("STUDENT");

  // ── STUDENT: class → student list flow ──
  const [classes,         setClasses]         = useState([]);
  const [classesLoading,  setClassesLoading]  = useState(false);
  const [selectedClass,   setSelectedClass]   = useState("");
  const [classStudents,   setClassStudents]   = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedPerson,  setSelectedPerson]  = useState(null);

  // ── NON-STUDENT: search flow ──
  const [personSearch,   setPersonSearch]   = useState("");
  const [personResults,  setPersonResults]  = useState([]);
  const [personLoading,  setPersonLoading]  = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);

  // ── Device ──
  const [devices,        setDevices]        = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("");

  // ── Enrollment ID ──
  const [enrollmentId, setEnrollmentId] = useState("");

  // ── Form state ──
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // ── Table ──
  const [mappings,     setMappings]     = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError,   setTableError]   = useState("");
  const [filterType,   setFilterType]   = useState("ALL");
  const [filterActive, setFilterActive] = useState("ALL");
  const [deactivating, setDeactivating] = useState(null);

  const dropdownRef = useRef(null);
  const searchTimer = useRef(null);

  // close dropdown on outside click
  useEffect(() => {
    const fn = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // load schools
  useEffect(() => {
    if (!isSuperAdmin) return;
    setSchoolsLoading(true);
    apiFetch(`${BASE}/schools`).then((j) => setSchools(j.data || [])).catch(() => {}).finally(() => setSchoolsLoading(false));
  }, [isSuperAdmin]);

  // school change
  useEffect(() => {
    if (!selectedSchool) { setDevices([]); setMappings([]); setClasses([]); return; }
    // devices
    setDevicesLoading(true);
    apiFetch(`${BASE}/devices?schoolId=${selectedSchool}`).then((j) => setDevices(j.data || [])).catch(() => setDevices([])).finally(() => setDevicesLoading(false));
    // mappings
    loadMappings(selectedSchool, filterType, filterActive);
    // reset form
    resetPersonSelection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool]);

  // load classes when STUDENT type selected + school chosen
  useEffect(() => {
    if (personType !== "STUDENT" || !selectedSchool) return;
    setClassesLoading(true);
    setClasses([]); setSelectedClass(""); setClassStudents([]); setSelectedPerson(null);
    apiFetch(`${BASE}/classes?schoolId=${selectedSchool}`)
      .then((j) => setClasses(j.data || []))
      .catch(() => setClasses([]))
      .finally(() => setClassesLoading(false));
  }, [personType, selectedSchool]);

  // load students when class selected
  useEffect(() => {
    if (!selectedClass || personType !== "STUDENT") return;
    setStudentsLoading(true);
    setClassStudents([]); setSelectedPerson(null);
    apiFetch(`${BASE}/persons?schoolId=${selectedSchool}&personType=STUDENT&classSectionId=${selectedClass}&q=`)
      .then((j) => setClassStudents(j.data || []))
      .catch(() => setClassStudents([]))
      .finally(() => setStudentsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  // filter table
  useEffect(() => {
    if (!selectedSchool) return;
    loadMappings(selectedSchool, filterType, filterActive);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterActive]);

  // person search debounce (non-student)
  useEffect(() => {
    if (personType === "STUDENT" || !selectedSchool) return;
    clearTimeout(searchTimer.current);
    if (!personSearch || personSearch.length < 2) { setPersonResults([]); setShowDropdown(false); return; }
    setPersonLoading(true);
    searchTimer.current = setTimeout(() => {
      apiFetch(`${BASE}/persons?schoolId=${selectedSchool}&personType=${personType}&q=${encodeURIComponent(personSearch)}`)
        .then((j) => { setPersonResults(j.data || []); setShowDropdown(true); })
        .catch(() => setPersonResults([]))
        .finally(() => setPersonLoading(false));
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [personSearch, personType, selectedSchool]);

  // reset on type change
  useEffect(() => {
    resetPersonSelection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personType]);

  function resetPersonSelection() {
    setSelectedPerson(null); setPersonSearch(""); setPersonResults([]);
    setShowDropdown(false); setSelectedClass(""); setClassStudents([]);
    setEnrollmentId(""); setSelectedDevice("");
    setFormError(""); setFormSuccess("");
  }

  function loadMappings(schoolId, pType, activeFilter) {
    setTableLoading(true); setTableError("");
    const p = new URLSearchParams({ schoolId });
    if (pType !== "ALL") p.set("personType", pType);
    if (activeFilter === "ACTIVE")   p.set("isActive", "true");
    if (activeFilter === "INACTIVE") p.set("isActive", "false");
    apiFetch(`${BASE}/mappings?${p}`)
      .then((j) => setMappings(j.data || []))
      .catch((e) => setTableError(e.message || "Failed to load mappings"))
      .finally(() => setTableLoading(false));
  }

  const canSubmit = selectedSchool && selectedPerson && enrollmentId.trim();

  async function handleAssign() {
    if (!canSubmit || submitting) return;
    setSubmitting(true); setFormError(""); setFormSuccess("");
    try {
      await apiPost(`${BASE}/mappings`, {
        schoolId: selectedSchool, personType,
        personId: selectedPerson.id,
        deviceId: selectedDevice || undefined,
        enrollmentId: enrollmentId.trim(),
        assignedById: currentUserId || undefined,
      });
      setFormSuccess(`Enrollment ID "${enrollmentId.trim()}" assigned to ${selectedPerson.name}.`);
      setSelectedPerson(null); setEnrollmentId(""); setSelectedDevice("");
      // keep class selection so admin can quickly assign next student
      loadMappings(selectedSchool, filterType, filterActive);
    } catch (e) {
      setFormError(e.message || "Assignment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(mappingId) {
    if (deactivating) return;
    setDeactivating(mappingId);
    try {
      await apiPatch(`${BASE}/mappings/${mappingId}/deactivate`);
      setMappings((prev) => prev.map((m) => m.id === mappingId ? { ...m, isActive: false, deactivatedAt: new Date().toISOString() } : m));
    } catch (e) { alert(e.message || "Failed to deactivate"); }
    finally { setDeactivating(null); }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const card        = { background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 24px", marginBottom: 20 };
  const lbl         = { display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 };
  const inp         = { width: "100%", padding: "9px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box", background: "#FAFAFA" };
  const sel         = { ...inp, cursor: "pointer", appearance: "auto" };
  const thS         = { padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#6B7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #F3F4F6", whiteSpace: "nowrap", background: "#F9FAFB" };
  const tdS         = { padding: "11px 14px", borderBottom: "1px solid #F3F4F6", verticalAlign: "middle" };

  const selectedPersonChip = (person) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: PT_COLOR[personType]?.bg, color: PT_COLOR[personType]?.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          {person.name[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{person.name}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            {person.code !== "—" && <span>{person.code}</span>}
            {person.extra && <span style={{ color: "#9CA3AF", marginLeft: 6 }}>· {person.extra}</span>}
            {person.rollNumber && <span style={{ color: "#9CA3AF", marginLeft: 6 }}>· Roll: {person.rollNumber}</span>}
          </div>
        </div>
      </div>
      <button onClick={() => setSelectedPerson(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: 18, padding: 0, lineHeight: 1 }}>✕</button>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Enrollment ID Assignment</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Assign biometric card / enrollment IDs to students, teachers, staff, and admins.</p>
      </div>

      {/* ── Assignment Form ── */}
      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 24px" }}>

          {/* School */}
          {isSuperAdmin && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>School</label>
              <div style={{ position: "relative" }}>
                <select style={sel} value={selectedSchool}
                  onChange={(e) => { setSelectedSchool(e.target.value); resetPersonSelection(); }}
                  disabled={schoolsLoading}>
                  <option value="">{schoolsLoading ? "Loading…" : "— Select School —"}</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
                {schoolsLoading && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}><Spinner size={14} /></span>}
              </div>
            </div>
          )}

          {/* Person Type */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}>Person Type</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PERSON_TYPES.map((pt) => {
                const c = PT_COLOR[pt]; const active = personType === pt;
                return (
                  <button key={pt} onClick={() => setPersonType(pt)} style={{ padding: "6px 14px", borderRadius: 8, border: `2px solid ${active ? c.dot : "#E5E7EB"}`, background: active ? c.bg : "#fff", color: active ? c.text : "#374151", fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", transition: "all 0.12s" }}>
                    {PT_LABEL[pt]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── STUDENT FLOW: Class → Student list ── */}
          {personType === "STUDENT" && (
            <>
              {/* Class selector */}
              <div>
                <label style={lbl}>Class / Section</label>
                <div style={{ position: "relative" }}>
                  <select style={sel} value={selectedClass}
                    onChange={(e) => { setSelectedClass(e.target.value); setSelectedPerson(null); }}
                    disabled={!selectedSchool || classesLoading}>
                    <option value="">{classesLoading ? "Loading classes…" : selectedSchool ? "— Select Class —" : "Select school first"}</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.studentCount} students)</option>
                    ))}
                  </select>
                  {classesLoading && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}><Spinner size={14} /></span>}
                </div>
                {selectedSchool && !classesLoading && classes.length === 0 && (
                  <p style={{ fontSize: 11, color: "#F97316", marginTop: 4, marginBottom: 0 }}>No active classes found for this school.</p>
                )}
              </div>

              {/* Device (same row as class) */}
              <div>
                <label style={lbl}>Device <span style={{ color: "#9CA3AF", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                <div style={{ position: "relative" }}>
                  <select style={sel} value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)} disabled={!selectedSchool || devicesLoading}>
                    <option value="">{devicesLoading ? "Loading…" : "— Select Device —"}</option>
                    {devices.map((d) => <option key={d.id} value={d.id}>{d.deviceName || "Unnamed"} ({d.deviceCode} · {d.serialNo})</option>)}
                  </select>
                  {devicesLoading && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}><Spinner size={14} /></span>}
                </div>
              </div>

              {/* Student list from class */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>
                  Student
                  {selectedClass && classStudents.length > 0 && (
                    <span style={{ marginLeft: 8, fontWeight: 400, textTransform: "none", color: "#9CA3AF" }}>
                      {classStudents.length} students in class
                    </span>
                  )}
                </label>

                {!selectedClass ? (
                  <div style={{ padding: "14px 16px", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, color: "#9CA3AF" }}>
                    Select a class first to see students.
                  </div>
                ) : selectedPerson ? (
                  selectedPersonChip(selectedPerson)
                ) : studentsLoading ? (
                  <div style={{ padding: "14px 16px", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#6B7280" }}>
                    <Spinner size={14} /> Loading students…
                  </div>
                ) : classStudents.length === 0 ? (
                  <div style={{ padding: "14px 16px", background: "#FFF7ED", border: "1.5px solid #FED7AA", borderRadius: 8, fontSize: 13, color: "#92400E" }}>
                    No active students found in this class.
                  </div>
                ) : (
                  <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 8, overflow: "hidden", maxHeight: 320, overflowY: "auto" }}>
                    {classStudents.map((s, i) => (
                      <div key={s.id}
                        onClick={() => setSelectedPerson(s)}
                        style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < classStudents.length - 1 ? "1px solid #F3F4F6" : "none", display: "flex", alignItems: "center", gap: 12, background: "transparent", transition: "background 0.1s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDF4"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EEF2FF", color: "#4338CA", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                          {s.name[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                            {s.code !== "—" && <span>{s.code}</span>}
                            {s.rollNumber && <span style={{ marginLeft: 6 }}>· Roll: {s.rollNumber}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>Select →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── NON-STUDENT FLOW: Search ── */}
          {personType !== "STUDENT" && (
            <>
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <label style={lbl}>{PT_LABEL[personType]}</label>
                {selectedPerson ? selectedPersonChip(selectedPerson) : (
                  <>
                    <div style={{ position: "relative" }}>
                      <input style={inp} placeholder={`Search ${PT_LABEL[personType].toLowerCase()} by name or code…`}
                        value={personSearch} onChange={(e) => setPersonSearch(e.target.value)}
                        onFocus={() => personResults.length > 0 && setShowDropdown(true)}
                        disabled={!selectedSchool} />
                      {personLoading && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}><Spinner size={14} /></span>}
                    </div>
                    {!selectedSchool && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, marginBottom: 0 }}>Select a school first.</p>}
                    {showDropdown && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 100, overflow: "hidden" }}>
                        {personResults.length === 0
                          ? <div style={{ padding: "12px 14px", color: "#9CA3AF", fontSize: 13 }}>No results for "{personSearch}"</div>
                          : personResults.map((p) => (
                            <div key={p.id}
                              onMouseDown={() => { setSelectedPerson(p); setShowDropdown(false); setPersonResults([]); setPersonSearch(""); }}
                              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 10 }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                              <div style={{ width: 34, height: 34, borderRadius: "50%", background: PT_COLOR[personType]?.bg, color: PT_COLOR[personType]?.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                {p.name[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: "#6B7280" }}>{p.code}{p.extra ? ` · ${p.extra}` : ""}</div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Device (non-student row) */}
              <div>
                <label style={lbl}>Device <span style={{ color: "#9CA3AF", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                <div style={{ position: "relative" }}>
                  <select style={sel} value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)} disabled={!selectedSchool || devicesLoading}>
                    <option value="">{devicesLoading ? "Loading…" : "— Select Device —"}</option>
                    {devices.map((d) => <option key={d.id} value={d.id}>{d.deviceName || "Unnamed"} ({d.deviceCode} · {d.serialNo})</option>)}
                  </select>
                  {devicesLoading && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}><Spinner size={14} /></span>}
                </div>
              </div>
            </>
          )}

          {/* Enrollment ID */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}>Enrollment / Card ID</label>
            <input style={{ ...inp, maxWidth: 320, fontFamily: "monospace", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}
              placeholder="e.g. 1001" value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)} />
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, marginBottom: 0 }}>The card number programmed on the biometric device.</p>
          </div>

        </div>

        {/* Submit */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={handleAssign} disabled={!canSubmit || submitting}
            style={{ padding: "10px 24px", background: canSubmit && !submitting ? "#4F46E5" : "#C7D2FE", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: canSubmit && !submitting ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8 }}>
            {submitting && <Spinner size={14} color="#fff" />}
            {submitting ? "Assigning…" : "Assign Enrollment ID"}
          </button>
          {formSuccess && <div style={{ padding: "8px 14px", borderRadius: 8, background: "#F0FDF4", color: "#166534", fontSize: 13, fontWeight: 500, border: "1px solid #86EFAC" }}>✓ {formSuccess}</div>}
          {formError   && <div style={{ padding: "8px 14px", borderRadius: 8, background: "#FFF1F2", color: "#9F1239",  fontSize: 13, fontWeight: 500, border: "1px solid #FECDD3" }}>✕ {formError}</div>}
        </div>
      </div>

      {/* ── Mappings Table ── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Existing Mappings</h3>
            {selectedSchool && schools.length > 0 && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>{schools.find((s) => s.id === selectedSchool)?.name || ""}</p>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select style={{ ...sel, width: "auto", fontSize: 13, padding: "6px 10px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="ALL">All Types</option>
              {PERSON_TYPES.map((pt) => <option key={pt} value={pt}>{PT_LABEL[pt]}</option>)}
            </select>
            <select style={{ ...sel, width: "auto", fontSize: 13, padding: "6px 10px" }} value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {!selectedSchool ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 14 }}>Select a school to view mappings.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Enrollment ID", "Person", "Type", "Device", "Assigned On", "Punches", "Status", "Action"].map((h) => <th key={h} style={thS}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0" }}><Spinner size={20} /></td></tr>
                ) : tableError ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px 0", color: "#EF4444", fontSize: 13 }}>{tableError}</td></tr>
                ) : mappings.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>No mappings found. Assign enrollment IDs above.</td></tr>
                ) : mappings.map((m) => (
                  <tr key={m.id} style={{ opacity: m.isActive ? 1 : 0.5 }}>
                    <td style={tdS}><span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>{m.enrollmentId}</span></td>
                    <td style={tdS}>
                      <div style={{ fontWeight: 600 }}>{m.personName}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{m.personCode}{m.personExtra ? ` · ${m.personExtra}` : ""}</div>
                    </td>
                    <td style={tdS}><Badge type={m.personType} /></td>
                    <td style={tdS}>
                      <span style={{ fontSize: 13 }}>{m.deviceName || <span style={{ color: "#D1D5DB" }}>—</span>}</span>
                      {m.deviceCode && <div style={{ fontSize: 11, color: "#9CA3AF" }}>{m.deviceCode}</div>}
                    </td>
                    <td style={{ ...tdS, color: "#6B7280", whiteSpace: "nowrap" }}>
                      {m.assignedAt ? new Date(m.assignedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ ...tdS, textAlign: "center" }}>
                      <span style={{ background: "#EEF2FF", color: "#4338CA", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{m.totalPunches ?? 0}</span>
                    </td>
                    <td style={tdS}><StatusPill active={m.isActive} /></td>
                    <td style={tdS}>
                      {m.isActive && (
                        <button onClick={() => handleDeactivate(m.id)} disabled={deactivating === m.id}
                          style={{ padding: "5px 12px", background: "#FFF1F2", color: "#9F1239", border: "1px solid #FECDD3", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: deactivating === m.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          {deactivating === m.id && <Spinner size={12} color="#9F1239" />}
                          {deactivating === m.id ? "…" : "Deactivate"}
                        </button>
                      )}
                      
                      {!m.isActive && m.deactivatedAt && (
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{new Date(m.deactivatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MappingsTab;