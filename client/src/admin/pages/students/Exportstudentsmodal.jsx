// admin/pages/students/ExportStudentsModal.jsx
// Export students to Excel — All / Multi-Class checkboxes / Selected rows
import React, { useState, useEffect, useRef } from "react";
import {
  X, Download, FileSpreadsheet, Loader2, CheckCircle,
  Users, GraduationCap, Check, Search,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  deepDark: "#243340", bg: "#EDF3FA", white: "#FFFFFF",
  border: "#C8DCF0", borderLight: "#DDE9F5", text: "#243340", textLight: "#6A89A7",
};

/* ── Fetch students for one or more section IDs ── */
async function fetchStudentsForSections(sectionIds, academicYearId) {
  if (!sectionIds || sectionIds.length === 0) return [];
  const results = await Promise.all(
    sectionIds.map(async (csId) => {
      const params = new URLSearchParams({ page: 1, limit: 9999 });
      params.set("classSectionId", csId);
      if (academicYearId) params.set("academicYearId", academicYearId);
      const res = await fetch(`${API_URL}/api/students?${params}`, { headers: authHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.students || [];
    })
  );
  return results.flat();
}

async function fetchAllStudents(academicYearId) {
  const params = new URLSearchParams({ page: 1, limit: 9999 });
  if (academicYearId) params.set("academicYearId", academicYearId);
  const res = await fetch(`${API_URL}/api/students?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch students");
  const data = await res.json();
  return data.students || [];
}

/* ── Row builder ── */
function toRow(s, idx) {
  const pi = s.personalInfo || {};
  const enroll = s.enrollments?.[0] || {};
  const sectionName = enroll.classSection?.name || s.classSection?.name || "";
  return [
    idx,
    enroll.admissionNumber || "",
    pi.firstName || "", pi.lastName || "",
    pi.gender || "",
    pi.dateOfBirth ? new Date(pi.dateOfBirth).toLocaleDateString("en-IN") : "",
    s.email || "", pi.phone || "",
    sectionName, enroll.rollNumber || "",
    enroll.academicYear?.name || "",
    enroll.status || "",
    pi.address || "", pi.city || "", pi.state || "", pi.zipCode || "",
    pi.bloodGroup || "",
    pi.nationality || "", pi.religion || "", pi.casteCategory || "",
    pi.aadhaarNumber || "", pi.satsNumber || "", pi.panNumber || "",
    pi.parentName || "", pi.parentPhone || "", pi.parentEmail || "", pi.parentName ? "FATHER" : "",
    pi.parentName || "", pi.parentPhone || "",
    pi.motherName || "", pi.motherPhone || "",
    pi.emergencyContact || "",
    pi.medicalConditions || "", pi.allergies || "",
    enroll.previousSchoolName || "",
    enroll.previousSchoolBoard || "",
    enroll.udiseCode || "",
  ];
}

const HEADERS = [
  "S.No", "Admission No", "First Name", "Last Name", "Gender", "Date of Birth",
  "Email", "Phone", "Class / Section", "Roll No", "Academic Year", "Status",
  "Address", "City", "State", "ZIP", "Blood Group", "Nationality",
  "Religion", "Caste Category", "Aadhaar No", "SATS No", "PAN No",
  "Parent Name", "Parent Phone", "Parent Email", "Parent Relation",
  "Father Name", "Father Phone", "Mother Name", "Mother Phone",
  "Emergency Contact", "Medical Conditions", "Allergies",
  "Previous School", "Previous Board", "UDISE Code",
];

async function exportXlsx({ students, schoolName, scopeLabel }) {
  const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString("en-IN");

  const applyStyle = (ws) => {
    ws["!cols"] = HEADERS.map((_, i) => i === 0 ? { wch: 5 } : i <= 3 ? { wch: 18 } : { wch: 20 });
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    for (let R = range.s.r; R <= range.e.r; ++R)
      for (let CC = range.s.c; CC <= range.e.c; ++CC) {
        const ref = XLSX.utils.encode_cell({ c: CC, r: R });
        if (ws[ref]) { ws[ref].t = "s"; ws[ref].z = "@"; }
      }
  };

  // Sheet 1 — All selected students combined
  const allWs = XLSX.utils.aoa_to_sheet([
    [`${schoolName} — Student Export`],
    [`Generated: ${now}   |   Total: ${students.length} students`],
    [], HEADERS,
    ...students.map((s, i) => toRow(s, i + 1)),
  ]);
  applyStyle(allWs);
  XLSX.utils.book_append_sheet(wb, allWs, "All Students");

  // One sheet per class section
  const classMap = {};
  students.forEach((s) => {
    const name = s.enrollments?.[0]?.classSection?.name || s.classSection?.name || "Unknown";
    if (!classMap[name]) classMap[name] = [];
    classMap[name].push(s);
  });
  Object.keys(classMap).sort().forEach((name) => {
    const rows = classMap[name];
    const ws = XLSX.utils.aoa_to_sheet([
      [`${schoolName} — ${name}`],
      [`Generated: ${now}   |   Total: ${rows.length} students`],
      [], HEADERS,
      ...rows.map((s, i) => toRow(s, i + 1)),
    ]);
    applyStyle(ws);
    XLSX.utils.book_append_sheet(wb, ws, name.replace(/[\\/:*?[\]]/g, "").substring(0, 31));
  });

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${schoolName.replace(/\s+/g, "_")}_${scopeLabel}_${date}.xlsx`);
}

/* ════════════════ MODAL ════════════════ */
export default function ExportStudentsModal({
  onClose,
  classSections = [],
  selectedSection = null,
  selectedStudents = [],
  academicYears = [],
  schoolName = "School",
}) {
  const [scope, setScope] = useState(
    selectedStudents.length > 0 ? "selected" : "all"
  );

  const activeYear = academicYears.find((y) => y.isActive) || academicYears[0];
  const [yearId, setYearId] = useState(activeYear?.id || "");

  // Multi-class selection
  const [checkedIds, setCheckedIds] = useState(() =>
    selectedSection ? new Set([selectedSection.id]) : new Set()
  );
  const [classSearch, setClassSearch] = useState("");

  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState(null);

  // Sort sections naturally: "1-A" < "2-A" < "10-A"
  const sortedSections = [...classSections].sort((a, b) => {
    const na = parseInt(a.name), nb = parseInt(b.name);
    return isNaN(na) || isNaN(nb) ? a.name.localeCompare(b.name) : na - nb || a.name.localeCompare(b.name);
  });

  const filteredSections = classSearch.trim()
    ? sortedSections.filter((cs) => cs.name.toLowerCase().includes(classSearch.toLowerCase()))
    : sortedSections;

  const allChecked = filteredSections.length > 0 && filteredSections.every((cs) => checkedIds.has(cs.id));
  const someChecked = filteredSections.some((cs) => checkedIds.has(cs.id));

  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked && !allChecked;
  }, [someChecked, allChecked]);

  const toggleSection = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) filteredSections.forEach((cs) => next.delete(cs.id));
      else filteredSections.forEach((cs) => next.add(cs.id));
      return next;
    });
  };

  // Live count preview
  useEffect(() => {
    setCount(null);
    if (scope === "selected") { setCount(selectedStudents.length); return; }
    if (scope === "classwise" && checkedIds.size === 0) { setCount(0); return; }
    let cancelled = false;
    (async () => {
      try {
        if (scope === "all") {
          const params = new URLSearchParams({ page: 1, limit: 1 });
          if (yearId) params.set("academicYearId", yearId);
          const res = await fetch(`${API_URL}/api/students?${params}`, { headers: authHeaders() });
          const data = await res.json();
          if (!cancelled) setCount(data.total || 0);
        } else {
          // fetch count for each checked section
          const totals = await Promise.all(
            [...checkedIds].map(async (csId) => {
              const params = new URLSearchParams({ page: 1, limit: 1, classSectionId: csId });
              if (yearId) params.set("academicYearId", yearId);
              const res = await fetch(`${API_URL}/api/students?${params}`, { headers: authHeaders() });
              const data = await res.json();
              return data.total || 0;
            })
          );
          if (!cancelled) setCount(totals.reduce((a, b) => a + b, 0));
        }
      } catch { if (!cancelled) setCount(null); }
    })();
    return () => { cancelled = true; };
  }, [scope, checkedIds, yearId, selectedStudents.length]);

  const doExport = async () => {
    setExporting(true);
    setError("");
    try {
      let students = [];
      let scopeLabel = "Export";

      if (scope === "selected") {
        students = selectedStudents;
        scopeLabel = "Selected_Students";
      } else if (scope === "all") {
        students = await fetchAllStudents(yearId || null);
        scopeLabel = "All_Students";
      } else {
        // classwise — multi
        students = await fetchStudentsForSections([...checkedIds], yearId || null);
        const names = [...checkedIds]
          .map((id) => classSections.find((cs) => cs.id === id)?.name || "")
          .filter(Boolean);
        scopeLabel = names.length === 1 ? names[0].replace(/\s+/g, "_") : `${names.length}_Classes`;
      }

      if (!students.length) throw new Error("No students found for this selection.");
      await exportXlsx({ students, schoolName, scopeLabel });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const canExport = !exporting && count !== 0 &&
    !(scope === "classwise" && checkedIds.size === 0);

  /* ── Scope tab ── */
  function ScopeTab({ value, label, sublabel, icon: Icon }) {
    const active = scope === value;
    return (
      <button
        onClick={() => { setScope(value); setDone(false); setError(""); }}
        style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          gap: 6, padding: "13px 8px", borderRadius: 14,
          border: `2px solid ${active ? C.sky : C.borderLight}`,
          background: active ? `${C.sky}14` : C.bg,
          cursor: "pointer", transition: "all 0.15s", position: "relative",
        }}
      >
        {active && (
          <span style={{
            position: "absolute", top: 6, right: 6, width: 18, height: 18,
            borderRadius: "50%", background: C.sky,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Check size={11} color="#fff" strokeWidth={3} />
          </span>
        )}
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: active ? `${C.sky}22` : `${C.deep}08`,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${active ? C.sky + "44" : C.borderLight}`,
        }}>
          <Icon size={16} color={active ? C.deep : C.textLight} />
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: active ? C.deep : C.textLight, fontFamily: "'Inter',sans-serif" }}>{label}</p>
        {sublabel && <p style={{ margin: 0, fontSize: 10, color: C.textLight, fontFamily: "'Inter',sans-serif" }}>{sublabel}</p>}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(36,51,64,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: C.white, borderRadius: 22, width: "100%", maxWidth: 540,
        boxShadow: "0 24px 60px rgba(36,51,64,0.22)",
        border: `1.5px solid ${C.borderLight}`,
        fontFamily: "'Inter',sans-serif",
        display: "flex", flexDirection: "column",
        maxHeight: "90vh",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "18px 22px 16px",
          background: `linear-gradient(90deg,${C.bg},${C.white})`,
          borderBottom: `1.5px solid ${C.borderLight}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: `${C.sky}20`, border: `1.5px solid ${C.sky}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FileSpreadsheet size={17} color={C.deep} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>Export Students</p>
              <p style={{ margin: 0, fontSize: 11, color: C.textLight, marginTop: 1 }}>{schoolName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            border: `1px solid ${C.borderLight}`, background: C.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.textLight,
          }}>
            <X size={14} />
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

          {done ? (
            /* ── Done ── */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 10, padding: "28px 0", textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: "#f0fdf4", border: "1.5px solid #bbf7d0",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle size={28} color="#16a34a" />
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#15803d" }}>Export complete!</p>
              <p style={{ margin: 0, fontSize: 12, color: C.textLight }}>
                Your Excel file has been downloaded with one sheet per class.
              </p>
              <button
                onClick={() => { setDone(false); setError(""); }}
                style={{
                  marginTop: 8, padding: "8px 20px", borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: C.bg,
                  color: C.textLight, fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                Export again
              </button>
            </div>
          ) : (
            <>
              {/* ── Scope tabs ── */}
              <div>
                <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  What to export
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <ScopeTab value="all" label="All Students" sublabel="Entire school" icon={Users} />
                  <ScopeTab value="classwise" label="By Class" sublabel="Pick sections" icon={GraduationCap} />
                  {selectedStudents.length > 0 && (
                    <ScopeTab value="selected" label="Selected" sublabel={`${selectedStudents.length} checked`} icon={Check} />
                  )}
                </div>
              </div>

              {/* ── Multi-class checkbox list ── */}
              {scope === "classwise" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      Select classes
                    </p>
                    {checkedIds.size > 0 && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: C.deep,
                        background: `${C.sky}22`, borderRadius: 20,
                        padding: "2px 10px", border: `1px solid ${C.sky}44`,
                      }}>
                        {checkedIds.size} selected
                      </span>
                    )}
                  </div>

                  {/* Search box */}
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <Search size={13} color={C.textLight} style={{
                      position: "absolute", left: 11, top: "50%",
                      transform: "translateY(-50%)", pointerEvents: "none",
                    }} />
                    <input
                      type="text"
                      placeholder="Search class…"
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        border: `1.5px solid ${C.border}`, borderRadius: 10,
                        padding: "8px 12px 8px 30px",
                        fontSize: 12, fontWeight: 500, color: C.text,
                        background: C.bg, outline: "none", fontFamily: "'Inter',sans-serif",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = C.sky)}
                      onBlur={(e) => (e.target.style.borderColor = C.border)}
                    />
                  </div>

                  {/* List */}
                  <div style={{
                    border: `1.5px solid ${C.borderLight}`, borderRadius: 13,
                    overflow: "hidden", maxHeight: 240, overflowY: "auto",
                  }}>
                    {/* Select All row */}
                    <label style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", cursor: "pointer",
                      background: `${C.bg}`,
                      borderBottom: `1.5px solid ${C.borderLight}`,
                      userSelect: "none",
                    }}>
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        style={{ width: 15, height: 15, accentColor: C.sky, cursor: "pointer", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.deep }}>
                        Select all {classSearch ? "filtered" : ""} classes
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: C.textLight }}>
                        {filteredSections.length} class{filteredSections.length !== 1 ? "es" : ""}
                      </span>
                    </label>

                    {/* Individual class rows */}
                    {filteredSections.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", fontSize: 12, color: C.textLight }}>
                        No classes match "{classSearch}"
                      </div>
                    ) : (
                      filteredSections.map((cs, idx) => {
                        const checked = checkedIds.has(cs.id);
                        return (
                          <label
                            key={cs.id}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "9px 14px", cursor: "pointer",
                              background: checked ? `${C.sky}12` : idx % 2 === 0 ? C.white : `${C.mist}18`,
                              borderBottom: idx < filteredSections.length - 1 ? `1px solid ${C.borderLight}` : "none",
                              transition: "background 0.1s",
                              userSelect: "none",
                            }}
                            onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = `${C.sky}08`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = checked ? `${C.sky}12` : idx % 2 === 0 ? C.white : `${C.mist}18`; }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSection(cs.id)}
                              style={{ width: 15, height: 15, accentColor: C.sky, cursor: "pointer", flexShrink: 0 }}
                            />
                            <div style={{
                              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                              background: checked ? `${C.sky}22` : `${C.deep}08`,
                              border: `1px solid ${checked ? C.sky + "44" : C.borderLight}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <GraduationCap size={13} color={checked ? C.deep : C.textLight} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: checked ? C.deep : C.text, flex: 1 }}>
                              {cs.name}
                            </span>
                            {cs.grade && cs.grade !== cs.name && (
                              <span style={{ fontSize: 10, color: C.textLight, fontWeight: 500 }}>{cs.grade}</span>
                            )}
                            {checked && (
                              <span style={{
                                width: 18, height: 18, borderRadius: "50%",
                                background: C.sky, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <Check size={10} color="#fff" strokeWidth={3} />
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ── Academic year ── */}
              {scope !== "selected" && (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Academic year
                  </p>
                  <div style={{ position: "relative" }}>
                    <select
                      value={yearId}
                      onChange={(e) => setYearId(e.target.value)}
                      style={{
                        width: "100%", appearance: "none",
                        border: `1.5px solid ${C.border}`, borderRadius: 12,
                        padding: "10px 36px 10px 14px",
                        fontSize: 13, fontWeight: 600, color: C.text,
                        background: C.bg, outline: "none", fontFamily: "'Inter',sans-serif", cursor: "pointer",
                      }}
                    >
                      <option value="">All years</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>{y.name}{y.isActive ? " (Active)" : ""}</option>
                      ))}
                    </select>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.5" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              )}

              {/* ── Count summary bar ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 14px", borderRadius: 12,
                background: count === 0 ? "#fff8f0" : `${C.sky}10`,
                border: `1px solid ${count === 0 ? "#fed7aa" : C.sky + "33"}`,
              }}>
                <FileSpreadsheet size={15} color={count === 0 ? "#f97316" : C.slate} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>
                  {count === null ? "Calculating…"
                    : count === 0 ? "No students match — adjust your selection"
                    : <>
                        Will export <strong>{count}</strong> student{count !== 1 ? "s" : ""}
                        {scope === "classwise" && checkedIds.size > 0 &&
                          <> across <strong>{checkedIds.size}</strong> class{checkedIds.size !== 1 ? "es" : ""}</>
                        }
                      </>
                  }
                </p>
                <span style={{ fontSize: 10, color: C.textLight, fontWeight: 600, whiteSpace: "nowrap" }}>
                  .xlsx · per-class sheets
                </span>
              </div>

              {error && (
                <p style={{ margin: 0, fontSize: 12, color: "#b91c1c", padding: "10px 14px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fca5a5" }}>
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!done && (
          <div style={{
            padding: "14px 22px",
            background: C.bg, borderTop: `1.5px solid ${C.borderLight}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              padding: "9px 18px", borderRadius: 11,
              border: `1.5px solid ${C.borderLight}`, background: C.white,
              color: C.textLight, fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
            }}>
              Cancel
            </button>
            <button
              onClick={doExport}
              disabled={!canExport}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 22px", borderRadius: 11, border: "none",
                background: canExport ? `linear-gradient(135deg,${C.slate},${C.deep})` : "#9ca3af",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: canExport ? "pointer" : "not-allowed",
                fontFamily: "'Inter',sans-serif",
                boxShadow: canExport ? `0 4px 14px ${C.deep}33` : "none",
                transition: "all 0.2s",
              }}
            >
              {exporting
                ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
                : <>
                    <Download size={14} />
                    Export{scope === "classwise" && checkedIds.size > 1 ? ` ${checkedIds.size} Classes` : " Excel"}
                  </>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}