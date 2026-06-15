// client/src/admin/pages/classes/TimetablePage.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Grid3X3,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Check,
  ArrowLeft,
  Info,
  Trash2,
  Search,
  Download,
  Upload,
  FileSpreadsheet,
  Table2,
} from "lucide-react";
import {
  fetchClassSections,
  fetchTimetableConfig,
  fetchTimetableEntries,
  saveTimetableEntries,
  fetchAcademicYears,
  fetchClassSectionById,
  fetchTeachersForDropdown,
  // ── Excel template downloads (server-built, includes Class Subjects sheet) ──
  downloadAllTimetableTemplate as downloadAllTimetableExcel,
  downloadSingleTimetableTemplate as downloadSingleTimetableExcel,
} from "./api/classesApi.js";

// Trigger a browser download for a Blob returned from the server.
function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
import { getToken } from "../../../auth/storage.js";
const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
};

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const DAY_SHORT = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
};
const COLORS = [
  "#6A89A7",
  "#88BDF2",
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#384959",
];

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl shadow-lg text-sm font-medium z-50"
      style={{
        padding: "12px 18px",
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1.5px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
        color: type === "success" ? "#15803d" : "#dc2626",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}{" "}
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK UPLOAD MODAL
// Shows two Excel format previews + two upload options (single / all classes)
// ─────────────────────────────────────────────────────────────────────────────
// BULK UPLOAD MODAL
// Two Excel template downloads + two upload options (single / all classes)
// ─────────────────────────────────────────────────────────────────────────────
function BulkUploadModal({ selectedClass, slots, subjects, allClasses, allTeachers, onUpload, onBulkUpload, onClose, onDownloadSingle, onDownloadAll, downloading }) {
  const singleRef = useRef();
  const bulkRef = useRef();

  // ── Downloads now come from the server (timetable-excel/download-*) ────────
  // The backend includes each class's `classSubjects` from the DB, so the
  // "Class Subjects" sheet is populated correctly — the previous client-side
  // build used `allClasses` from /class-sections, which doesn't include
  // classSubjects, leaving that sheet empty.

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.50)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "min(560px, 96vw)",
          border: `1px solid ${C.border}`,
          boxShadow: "0 20px 60px rgba(56,73,89,0.18)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: C.pale, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileSpreadsheet size={18} color={C.primary} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.primary, fontFamily: "'Inter', sans-serif" }}>
                Bulk Upload Timetable
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: C.mid, fontFamily: "'Inter', sans-serif" }}>
                Download a template, fill it and upload
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: C.pale, borderRadius: 8, padding: 8, cursor: "pointer", display: "flex" }}>
            <X size={15} color={C.mid} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* ── Step 1: Download template ── */}
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "'Inter', sans-serif" }}>
            Step 1 — Download Template
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>

            {/* Single class download */}
            <button
              onClick={onDownloadSingle}
              disabled={downloading === "single"}
              style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.pale, cursor: downloading === "single" ? "wait" : "pointer", textAlign: "left", transition: "all 0.15s", opacity: downloading === "single" ? 0.6 : 1 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.light; e.currentTarget.style.background = "rgba(136,189,242,0.14)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.pale; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#fff", border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {downloading === "single" ? <Loader2 size={14} color={C.primary} className="animate-spin" /> : <Download size={14} color={C.primary} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.primary, fontFamily: "'Inter', sans-serif" }}>
                  Single Class
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: C.mid, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                Template for <strong>{selectedClass?.name || "this class"}</strong>.
                Includes CLASS NAME row + Class Subjects sheet.
                Class auto-detected on upload.
              </p>
            </button>

            {/* All classes download */}
            <button
              onClick={onDownloadAll}
              disabled={downloading === "all"}
              style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: "rgba(56,73,89,0.04)", cursor: downloading === "all" ? "wait" : "pointer", textAlign: "left", transition: "all 0.15s", opacity: downloading === "all" ? 0.6 : 1 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = "rgba(56,73,89,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(56,73,89,0.04)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#fff", border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {downloading === "all" ? <Loader2 size={14} color={C.primary} className="animate-spin" /> : <Download size={14} color={C.primary} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.primary, fontFamily: "'Inter', sans-serif" }}>
                  All Classes
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: C.mid, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                One workbook for all {(allClasses || []).length} classes.
                Single sheet with CLASS NAME blocks + Class Subjects sheet.
              </p>
            </button>

          </div>

          {/* ── Step 2: Upload filled file ── */}
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "'Inter', sans-serif" }}>
            Step 2 — Upload Filled File
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

            {/* Upload single */}
            <div
              onClick={() => singleRef.current.click()}
              style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "center", background: C.pale, transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.light; e.currentTarget.style.background = "rgba(136,189,242,0.14)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.pale; }}
            >
              <input ref={singleRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); e.target.value = ""; }} />
              <Upload size={20} color={C.primary} style={{ margin: "0 auto 8px" }} />
              <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 13, color: C.primary, fontFamily: "'Inter', sans-serif" }}>Single Class</p>
              <p style={{ margin: 0, fontSize: 11, color: C.mid, fontFamily: "'Inter', sans-serif" }}>Class auto-detected from Excel</p>
            </div>

            {/* Upload all classes */}
            <div
              onClick={() => bulkRef.current.click()}
              style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "center", background: "rgba(56,73,89,0.04)", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = "rgba(56,73,89,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(56,73,89,0.04)"; }}
            >
              <input ref={bulkRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { if (e.target.files?.[0]) onBulkUpload(e.target.files[0]); e.target.value = ""; }} />
              <FileSpreadsheet size={20} color={C.primary} style={{ margin: "0 auto 8px" }} />
              <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 13, color: C.primary, fontFamily: "'Inter', sans-serif" }}>All Classes</p>
              <p style={{ margin: 0, fontSize: 11, color: C.mid, fontFamily: "'Inter', sans-serif" }}>Single sheet — classes detected by CLASS NAME rows</p>
            </div>

          </div>

          {/* Cancel */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{ padding: "9px 20px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "transparent", color: C.mid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedId = location.state?.sectionId ?? null;

  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [slots, setSlots] = useState([]);
  const [satSlots, setSatSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [editCell, setEditCell] = useState(null);
  const [cellForm, setCellForm] = useState({ teacherId: "", subjectId: "" });
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  // "single" | "all" | null — tracks which template is being fetched from the server
  const [downloadingTemplate, setDownloadingTemplate] = useState(null);
  const [toast, setToast] = useState(null);
  const [samePattern, setSamePattern] = useState(null);
  // Class auto-detected from single Excel upload
  const [detectedClassName, setDetectedClassName] = useState(null);

  // ── Load years + classes + all teachers on mount ───────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [yd, cd, td] = await Promise.all([
          fetchAcademicYears(),
          fetchClassSections(),
          fetchTeachersForDropdown(),
        ]);
        const yr = yd.academicYears || [];
        setYears(yr);
        const active = yr.find((y) => y.isActive);
        const activeId = active?.id || "";
        if (activeId) setYearId(activeId);
        const allSections = cd.classSections || [];
        setClasses(allSections);
        setAllTeachers(td.data || []);
        if (preSelectedId) {
          const pre = allSections.find((c) => c.id === preSelectedId);
          if (pre) setSelectedClass(pre);
        } else if (allSections.length > 0) {
          setSelectedClass(allSections[0]);
        }
      } catch (err) {
        setToast({ type: "error", msg: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load timetable config + entries + subjects + extra classes ─────────────
  useEffect(() => {
    if (!selectedClass || !yearId) return;
    setSubjects([]);
    setTimetable({});
    setSamePattern(null);
    setConfigLoading(true);

    Promise.all([
      fetchTimetableConfig({ academicYearId: yearId }),
      fetchTimetableEntries(selectedClass.id, { academicYearId: yearId }),
      fetchClassSectionById(selectedClass.id, { academicYearId: yearId }),
    ])
      .then(([cfgData, entryData, sectionData]) => {
        // ✅ UPDATED: backend returns periodDefinitions (not slots)
        const allSlots = cfgData.config?.periodDefinitions || [];
        // Attach configId to each slot so handleSave can read it
        const configId = cfgData.config?.id || null;
        const taggedSlots = allSlots.map((s) => ({ ...s, configId }));

        setSlots(taggedSlots.filter((s) => s.dayType === "WEEKDAY"));
        setSatSlots(taggedSlots.filter((s) => s.dayType === "SATURDAY"));

        const classSubjects = (
          sectionData.classSection?.classSubjects || []
        ).map((cs) => cs.subject);
        setSubjects(classSubjects);

        const teacherAssignments =
          sectionData.classSection?.teacherAssignments || [];
        const uniqueTeachers = [];
        const seen = new Set();
        teacherAssignments.forEach((ta) => {
          if (!seen.has(ta.teacher.id)) {
            seen.add(ta.teacher.id);
            uniqueTeachers.push(ta.teacher);
          }
        });
        setTeachers(uniqueTeachers);

        const map = {};
        DAYS.forEach((d) => (map[d] = {}));
        (entryData.entries || []).forEach((e) => {
          if (!map[e.day]) map[e.day] = {};
          // ✅ UPDATED: use periodDefinitionId (not periodSlotId)
          map[e.day][e.periodDefinitionId] = {
          teacherId: e.teacherId || e.teacher?.id || "",
          subjectId: e.subjectId || e.subject?.id || "",
          teacherName: e.teacher
            ? `${e.teacher.firstName} ${e.teacher.lastName}`
            : "No teacher",
          subjectName: e.subject?.name || "",
          };
        });
        setTimetable(map);

        const entryList = entryData.entries || [];
      if (entryList.length > 0) {
      const monEntries = entryList.filter(
        (e) => e.day === "MONDAY"
      );

      if (monEntries.length > 0) {
        const monSlots = new Set(
          monEntries.map(
            (e) => `${e.periodDefinitionId}:${e.subjectId}`
          )
        );

        const isSame = [
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
        ].every((day) => {
          const dayEntries = entryList.filter(
            (e) => e.day === day
          );

          const daySlots = new Set(
            dayEntries.map(
              (e) => `${e.periodDefinitionId}:${e.subjectId}`
            )
          );

          return (
            monSlots.size === daySlots.size &&
            [...monSlots].every((s) =>
              daySlots.has(s)
            )
          );
        });

        setSamePattern(isSame);
      } else {
        setSamePattern(false);
      }
    }
      })
      .catch((err) => setToast({ type: "error", msg: err.message }))
      .finally(() => setConfigLoading(false));
  }, [selectedClass, yearId]);

  // ── Timetable helpers ──────────────────────────────────────────────────────
  const getSlotsForDay = (day) => {
    if (day === "SATURDAY") return satSlots; // [] if no Saturday config
    return slots;
  };

  // Build a merged row list for the grid:
  // Start with Monday slots, then insert any Saturday break/non-PERIOD slots
  // that fall at a different periodNumber position than Monday's breaks.
  const mergedGridSlots = (() => {
    if (satSlots.length === 0) return slots;
    const result = [...slots];
    // Find Saturday non-PERIOD slots (breaks) that have no matching periodNumber in Monday slots
    const mondayBreakNumbers = new Set(
      slots.filter((s) => s.slotType !== "PERIOD").map((s) => s.periodNumber),
    );
    const satOnlyBreaks = satSlots.filter(
      (s) => s.slotType !== "PERIOD" && !mondayBreakNumbers.has(s.periodNumber),
    );
    // Insert each sat-only break after its corresponding period row
    satOnlyBreaks.forEach((brk) => {
      // Find the index of the last PERIOD slot with periodNumber <= brk.periodNumber
      let insertAfter = -1;
      result.forEach((s, i) => {
        if (s.slotType === "PERIOD" && s.periodNumber <= brk.periodNumber)
          insertAfter = i;
      });
      result.splice(insertAfter + 1, 0, { ...brk, _satOnly: true });
    });
    return result;
  })();

  // Saturday has different period count or start time → render as separate table
  const isCustomSat =
    satSlots.length > 0 &&
    (satSlots.filter((s) => s.slotType === "PERIOD").length !==
      slots.filter((s) => s.slotType === "PERIOD").length ||
      satSlots[0]?.startTime !== slots[0]?.startTime);

  const subjectColor = (id) => {
    const idx = subjects.findIndex((s) => s.id === id);
    return COLORS[idx >= 0 ? idx % COLORS.length : 0];
  };

  const openCell = (day, slot) => {
    if (slot.slotType !== "PERIOD") return;
    const existing = timetable[day]?.[slot.id] || {};
    setCellForm({
      teacherId: existing.teacherId || "",
      subjectId: existing.subjectId || "",
    });
    setTeacherSearch("");
    setEditCell({ day, slot });
  };

  const saveCell = () => {
    if (!editCell) return;
    const { day, slot } = editCell;
    const foundTeacher = allTeachers.find((t) => t.id === cellForm.teacherId);
const cellData = cellForm.subjectId
  ? {
      teacherId: cellForm.teacherId || null,
      subjectId: cellForm.subjectId,
      teacherName: foundTeacher
        ? `${foundTeacher.firstName} ${foundTeacher.lastName}`
        : "",
      subjectName:
        subjects.find(
          (s) => s.id === cellForm.subjectId
        )?.name || "",
    }
  : undefined;

    setTimetable((prev) => {
      const next = { ...prev };
      if (samePattern) {
        ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].forEach((d) => {
          next[d] = { ...(next[d] || {}) };

          if (cellData) {
            next[d][slot.id] = cellData;
          } else {
            delete next[d][slot.id];
          }
        });

        // Saturday uses its own slot IDs
        const saturdaySlot = satSlots.find(
          (s) =>
            s.periodNumber === slot.periodNumber &&
            s.slotType === "PERIOD"
        );

        if (saturdaySlot) {
          next["SATURDAY"] = {
            ...(next["SATURDAY"] || {}),
          };

          if (cellData) {
            next["SATURDAY"][saturdaySlot.id] = cellData;
          } else {
            delete next["SATURDAY"][saturdaySlot.id];
          }
        }
      }else {
        next[day] = { ...(next[day] || {}) };
        if (cellData) next[day][slot.id] = cellData;
        else delete next[day][slot.id];
      }
      return next;
    });
    setEditCell(null);
  };

  const clearCell = (day, slotId) => {
    setTimetable((t) => {
      const next = { ...(t[day] || {}) };
      delete next[slotId];
      return { ...t, [day]: next };
    });
  };

const downloadTemplate = () => {

  const periodSlots =
    mergedGridSlots.filter(
      (s) => s.slotType === "PERIOD"
    );

  const workbook =
    XLSX.utils.book_new();

  // ───────────────── MAIN SHEET ─────────────────

  const data = [];

  data.push([
    "DAY",
    ...periodSlots.map((p) => p.label),
  ]);

  DAYS.forEach((day) => {

    const row = [day];

    periodSlots.forEach(() => {

      row.push(
        "Maths\nJohn Doe"
      );
    });

    data.push(row);
  });

  const worksheet =
    XLSX.utils.aoa_to_sheet(data);

  // Proper multiline cells
  const range =
    XLSX.utils.decode_range(
      worksheet["!ref"]
    );

  for (
    let R = 1;
    R <= range.e.r;
    ++R
  ) {

    for (
      let C = 1;
      C <= range.e.c;
      ++C
    ) {

      const cell =
        worksheet[
          XLSX.utils.encode_cell({
            r: R,
            c: C,
          })
        ];

      if (cell) {

        cell.s = {
          alignment: {
            wrapText: true,
            vertical: "top",
          },
        };
      }
    }
  }

  worksheet["!cols"] = [
    { wch: 16 },
    ...periodSlots.map(() => ({
      wch: 24,
    })),
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Timetable",
  );
  const hintData = [];

hintData.push([
  "IMPORTANT INSTRUCTIONS",
]);

hintData.push([
  `Use only subjects configured for ${selectedClass?.name || "this class"}`,
]);

hintData.push([
  "First line = Subject Name",
]);

hintData.push([
  "Second line = Teacher Name (Optional)",
]);

hintData.push([
  "Use exact names from Reference sheet",
]);

hintData.push([
  "Do not change DAY or PERIOD headers",
]);

const hintSheet =
  XLSX.utils.aoa_to_sheet(
    hintData
  );

hintSheet["!cols"] = [
  { wch: 70 },
];

XLSX.utils.book_append_sheet(
  workbook,
  hintSheet,
  "Instructions",
);

  // ───────────────── REFERENCE SHEET ─────────────────

  const refData = [];

  refData.push([
    "SUBJECT NAME",
    "TEACHER NAME",
  ]);

  subjects.forEach((subject) => {

    const relatedTeachers =
      allTeachers.filter(
        (t) =>
          t.department
            ?.toLowerCase()
            ?.includes(
              subject.name.toLowerCase()
            )
      );

    if (relatedTeachers.length === 0) {

      refData.push([
        subject.name,
        "",
      ]);

    } else {

      relatedTeachers.forEach(
        (teacher) => {

          refData.push([
            subject.name,
            `${teacher.firstName} ${teacher.lastName}`,
          ]);
        }
      );
    }
  });

  const refSheet =
    XLSX.utils.aoa_to_sheet(
      refData
    );

  refSheet["!cols"] = [
    { wch: 30 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    refSheet,
    "Reference",
  );

  XLSX.writeFile(
    workbook,
    `timetable-template-${selectedClass?.name || "class"}.xlsx`,
  );
};

// const handleBulkUpload = async (file) => {
//   if (!file) return;

//   try {
//     setBulkUploading(true);
//     setShowUploadModal(false);
//     setDetectedClassName(null);

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("academicYearId", yearId);

//     const token = getToken(); // ✅ was: localStorage.getItem("token")
//     const classIdParam = selectedClass?.id || "auto";

//     const response = await fetch(
//       `${import.meta.env.VITE_API_URL}/api/class-sections/${classIdParam}/timetable/bulk-upload`,
//       {
//         method: "POST",
//         headers: { Authorization: `Bearer ${token}` },
//         body: formData,
//       },
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Upload failed");
//     }

//     if (data.detectedClassName) {
//       setDetectedClassName(data.detectedClassName);
//       if (data.detectedClassId && data.detectedClassId !== selectedClass?.id) {
//         const found = classes.find((c) => c.id === data.detectedClassId);
//         if (found) setSelectedClass(found);
//       }
//     }

//     const reloadId = data.detectedClassId || selectedClass?.id;
//     const entryData = await fetchTimetableEntries(reloadId, { academicYearId: yearId });

//     const map = {};
//     DAYS.forEach((d) => (map[d] = {}));

//     (entryData.entries || []).forEach((e) => {
//       if (!map[e.day]) map[e.day] = {};
//       map[e.day][e.periodDefinitionId] = {
//         teacherId: e.teacherId || e.teacher?.id || "",
//         subjectId: e.subjectId || e.subject?.id || "",
//         teacherName: e.teacher ? `${e.teacher.firstName} ${e.teacher.lastName}` : "No teacher",
//         subjectName: e.subject?.name || "",
//       };
//     });

//     setTimetable(map);
//     setToast({
//       type: "success",
//       msg: data.detectedClassName
//         ? `Timetable uploaded for ${data.detectedClassName}`
//         : "Timetable uploaded successfully",
//     });
//   } catch (err) {
//     setToast({ type: "error", msg: err.message });
//   } finally {
//     setBulkUploading(false);
//   }
// };

// // ── Bulk upload: All Classes (single-sheet format) ─────────────────────────
// // Sends to the timetable-excel/upload-all endpoint which handles the
// // single-sheet "All Classes Timetable" format with CLASS NAME marker rows.
// const handleAllClassesUpload = async (file) => {
//   if (!file) return;
//   try {
//     setBulkUploading(true);
//     setShowUploadModal(false);

//     const token = getToken();
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("academicYearId", yearId);
//     // headers: {
//     //   Authorization: `Bearer ${token}`
//     // }
//     const response = await fetch(
//       `${import.meta.env.VITE_API_URL}/api/timetable-excel/upload-all`,
//       {
//         method: "POST",
//         headers: { Authorization: `Bearer ${token}` },
//         body: formData,
//       },
//     );
//     const text = await response.text();

//       console.log("STATUS =", response.status);
//       console.log("RESPONSE =", text);

//       let data = {};

//       try {
//         data = JSON.parse(text);
//       } catch (e) {
//         throw new Error(
//           `Server returned HTML instead of JSON. Status: ${response.status}`
//         );
//       }
//     if (!response.ok) throw new Error(data.message || "Bulk upload failed");

//     setToast({
//       type: "success",
//       msg: `Bulk upload complete: ${data.summary?.classesUpdated || 0} classes updated`,
//     });
//   } catch (err) {
//     setToast({ type: "error", msg: err.message });
//   } finally {
//     setBulkUploading(false);
//   }
// };

// ── Bulk upload: Single Class ──────────────────────────────────────────────
// Parses Excel CLIENT-SIDE → populates timetable state → user clicks Save
const handleBulkUpload = async (file) => {
  if (!file) return;

  try {
    setBulkUploading(true);
    setShowUploadModal(false);
    setDetectedClassName(null);

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rows.length === 0) throw new Error("Excel file is empty");

    // ── Detect CLASS NAME marker + data start row ──────────────
    let detectedName = null;
    let dataStartRow = 2; // default: row 0=header, row 1=timings, row 2+=days

    const firstCell = String(rows[0]?.[0] || "").trim();
    if (firstCell.toUpperCase().startsWith("CLASS NAME:")) {
      detectedName = firstCell.slice("CLASS NAME:".length).trim();
      dataStartRow = 3; // marker=0, header=1, timings=2, days start at 3
    }

    // ── Auto-select class if detected name differs from current ─
    let targetClass = selectedClass;
    if (detectedName) {
      const found = classes.find(
        (c) => c.name.toLowerCase().trim() === detectedName.toLowerCase().trim()
      );
      if (found) {
        targetClass = found;
        if (found.id !== selectedClass?.id) setSelectedClass(found);
        setDetectedClassName(found.name);
      } else {
        throw new Error(
          `Class "${detectedName}" detected in Excel but not found in system`
        );
      }
    }

    // ── Build subject lookup from currently loaded subjects ─────
    // subjects state = class subjects for the selected class
    const subjectMap = new Map(
      subjects.map((s) => [s.name.toLowerCase().trim(), s])
    );

    // ── Build period lookup: periodNumber → slot (weekday & sat) ─
    // slots/satSlots are already loaded in state
    const weekdayPeriods = slots
      .sort((a, b) => a.order - b.order);
    const saturdayPeriods = satSlots
      .sort((a, b) => a.order - b.order);

    if (weekdayPeriods.length === 0)
      throw new Error("No timetable configuration found. Set up school timings first.");

    const VALID_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

    // ── Parse rows into timetable map ───────────────────────────
    const map = {};
    DAYS.forEach((d) => (map[d] = {}));
    const warnings = [];

    for (let rowIdx = dataStartRow; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const day = String(row[0] || "").trim().toUpperCase();
      if (!day || !VALID_DAYS.includes(day)) continue;

      const periodSlots = day === "SATURDAY" && saturdayPeriods.length > 0
        ? saturdayPeriods
        : weekdayPeriods;

      for (let col = 1; col <= periodSlots.length; col++) {
        const slot = periodSlots[col - 1];    // ← move this UP before the raw check
        if (!slot) continue;
        if (slot.slotType !== "PERIOD") continue;  // ← ADD THIS: skip break columns

        const raw = String(row[col] || "").trim();
        if (!raw) continue;

        const lines = raw.split("\n").map((x) => x.trim()).filter(Boolean);
        const subjectName = lines[0];
        if (!subjectName) continue;

        const subject = subjectMap.get(subjectName.toLowerCase().trim());
        if (!subject) {
          warnings.push(`"${subjectName}" on ${day} P${col} — not assigned to this class, skipped`);
          continue;
        }

        map[day][slot.id] = {
          subjectId: subject.id,
          subjectName: subject.name,
          teacherId: "",
          teacherName: "No teacher",
        };
      }
    }

    // ── Update UI state only — no DB write ─────────────────────
    setTimetable(map);

    const totalCells = Object.values(map).reduce(
      (sum, dayMap) => sum + Object.keys(dayMap).length, 0
    );

    if (warnings.length > 0) {
      // Show error so admin notices — list the skipped subjects
      const skippedSubjects = [...new Set(
        warnings.map(w => w.split('"')[1]).filter(Boolean)
      )].join(", ");
      setToast({
        type: "error",
        msg: `${totalCells} periods loaded but ${warnings.length} skipped — subjects not assigned to this class: ${skippedSubjects}. Assign them first, then re-upload.`,
      });
    } else {
      setToast({
        type: "success",
        msg: `Excel loaded — ${totalCells} periods ready. Click "Save Timetable" to save.`,
      });
    }

  } catch (err) {
    setToast({ type: "error", msg: err.message });
  } finally {
    setBulkUploading(false);
  }
};

// ── Bulk upload: All Classes ───────────────────────────────────────────────
// Parses the "All Classes" Excel CLIENT-SIDE.
// Since this spans multiple classes, it saves each class to DB directly
// (the user can't manually save 20 classes one by one) — but shows a
// confirmation toast with a count so they know what happened.
// If you want manual-save for all classes too, that requires a multi-class
// timetable state which is out of scope here.
const handleAllClassesUpload = async (file) => {
  if (!file) return;
  try {
    setBulkUploading(true);
    setShowUploadModal(false);

    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("academicYearId", yearId);

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/timetable-excel/upload-all`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );
    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
    }
    if (!response.ok) throw new Error(data.message || "Bulk upload failed");

    setToast({
      type: "success",
      msg: `All classes uploaded: ${data.summary?.classesUpdated || 0} classes saved.`,
    });
  } catch (err) {
    setToast({ type: "error", msg: err.message });
  } finally {
    setBulkUploading(false);
  }
};

// ── Download: Single Class Template (server-built) ─────────────────────────
// Includes "CLASS NAME: <name>" marker row + "Class Subjects" sheet populated
// from this class's assigned subjects (ClassSubject rows in the DB).
const handleDownloadSingleTemplate = async () => {
  if (!yearId) {
    setToast({ type: "error", msg: "Select an academic year first" });
    return;
  }
  if (!selectedClass) {
    setToast({ type: "error", msg: "Select a class first" });
    return;
  }
  try {
    setDownloadingTemplate("single");
    const blob = await downloadSingleTimetableExcel(yearId, selectedClass.id);
    triggerBlobDownload(blob, `${selectedClass.name}_Timetable_Template.xlsx`);
  } catch (err) {
    setToast({ type: "error", msg: err.message });
  } finally {
    setDownloadingTemplate(null);
  }
};

// ── Download: All Classes Template (server-built) ──────────────────────────
// Single "All Classes Timetable" sheet (CLASS NAME blocks) + a "Class
// Subjects" sheet listing every class's assigned subjects from the DB.
const handleDownloadAllTemplate = async () => {
  if (!yearId) {
    setToast({ type: "error", msg: "Select an academic year first" });
    return;
  }
  try {
    setDownloadingTemplate("all");
    const blob = await downloadAllTimetableExcel(yearId);
    triggerBlobDownload(blob, "All_Classes_Timetable_Template.xlsx");
  } catch (err) {
    setToast({ type: "error", msg: err.message });
  } finally {
    setDownloadingTemplate(null);
  }
};

const handleSave = async () => {
  if (!selectedClass || !yearId) return;

  setSaving(true);

  try {
    // Get configId from loaded slots
    const configId =
      slots[0]?.configId ||
      satSlots[0]?.configId ||
      null;

    const entries = [];

    DAYS.forEach((day) => {
      const daySlots = getSlotsForDay(day);

      daySlots.forEach((slot) => {
        // Skip breaks
        if (slot.slotType !== "PERIOD") return;

        const cell = timetable?.[day]?.[slot.id];

        // Skip empty cells
        if (!cell?.subjectId) return;

        entries.push({
          day,
          periodDefinitionId: slot.id,
          configId,
          subjectId: cell.subjectId,
          teacherId: cell.teacherId || null,
        });
      });
    });

    await saveTimetableEntries(selectedClass.id, {
      academicYearId: yearId,
      entries,
    });

    setToast({
      type: "success",
      msg: "Timetable saved!",
    });
  } catch (err) {
    setToast({
      type: "error",
      msg: err.message,
    });
  } finally {
    setSaving(false);
  }
};

  const activeDays = DAYS; // Mon–Sat always shown

  if (loading)
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <Loader2
            size={22}
            className="animate-spin"
            style={{ color: C.light }}
          />
        </div>
      </>
    );

  return (
    <>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* ── Header ── */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/classes")}
            className="flex items-center gap-1.5 rounded-xl text-sm font-medium mb-3"
            style={{
              padding: "6px 12px",
              border: `1.5px solid ${C.border}`,
              color: C.mid,
              background: "transparent",
              cursor: "pointer",
               fontFamily: "'Inter', sans-serif",
            }}
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-6 rounded-full"
              style={{ background: C.primary }}
            />
            <h1 className="text-xl font-semibold" style={{ color: C.primary }}>
              Timetable Builder
            </h1>
          </div>
          <p className="text-sm ml-3" style={{ color: C.mid }}>
            Assign subjects and teachers to class periods
          </p>
        </div>

        {/* ── Detected class banner (shown after Excel upload auto-detects class) ── */}
        {detectedClassName && (
          <div
            className="flex items-center gap-2 rounded-xl mb-3"
            style={{
              padding: "9px 14px",
              background: "#f0fdf4",
              border: "1.5px solid #bbf7d0",
              display: "inline-flex",
            }}
          >
            <CheckCircle2 size={14} style={{ color: "#16a34a", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#15803d", fontFamily: "'Inter', sans-serif" }}>
              Class detected from Excel:{" "}
              <strong style={{ fontWeight: 700 }}>{detectedClassName}</strong>
            </span>
            <button
              onClick={() => setDetectedClassName(null)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 4px", display: "flex" }}
            >
              <X size={12} color="#16a34a" />
            </button>
          </div>
        )}

        {/* ── Controls row ── */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label
              className="text-xs font-semibold uppercase block mb-1"
              style={{
                color: C.mid,
                letterSpacing: "0.5px",
                 fontFamily: "'Inter', sans-serif",
              }}
            >
              Academic Year
            </label>
            <select
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              className="rounded-xl text-sm font-medium outline-none"
              style={{
                padding: "8px 12px",
                border: `1.5px solid ${C.border}`,
                color: C.primary,
                 fontFamily: "'Inter', sans-serif",
                background: "#fff",
              }}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " ✓" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="text-xs font-semibold uppercase block mb-1"
              style={{
                color: C.mid,
                letterSpacing: "0.5px",
                 fontFamily: "'Inter', sans-serif",
              }}
            >
              Class Section
            </label>
            <select
              value={selectedClass?.id || ""}
              onChange={(e) =>
                setSelectedClass(classes.find((c) => c.id === e.target.value))
              }
              className="rounded-xl text-sm font-medium outline-none"
              style={{
                padding: "8px 12px",
                border: `1.5px solid ${C.border}`,
                color: C.primary,
                 fontFamily: "'Inter', sans-serif",
                background: "#fff",
                minWidth: 160,
              }}
            >
              {(() => {
                const grades = [...new Set(classes.map((c) => c.grade))].sort(
                  (a, b) =>
                    isNaN(a) || isNaN(b)
                      ? a.localeCompare(b)
                      : Number(a) - Number(b),
                );
                return grades.map((grade) => {
                  const sections = classes.filter((c) => c.grade === grade);
                  return (
                    <optgroup key={grade} label={`Grade ${grade}`}>
                      {sections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                });
              })()}
            </select>
          </div>
        </div>

        {/* ── Mon–Fri same pattern question ── */}
        <div
          className="bg-white rounded-2xl shadow-sm mb-4 p-4"
          style={{
            border: `1.5px solid ${samePattern === null ? "#f59e0b" : C.border}`,
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "rgba(245,158,11,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Info size={14} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: C.primary }}>
                Same schedule Monday–Saturday?
              </p>

              <p className="text-xs mt-0.5" style={{ color: C.mid }}>
                If Yes: setting Period 1 on Monday automatically fills the same
                period for Tue–Sat automatically.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { val: true, label: "Yes — same Mon–Sat" },
              { val: false, label: "No — set each day individually" },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                onClick={() => setSamePattern(val)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 9,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  border: `1.5px solid ${
                    samePattern === val ? C.primary : C.border
                  }`,
                  background: samePattern === val ? C.primary : "#fff",
                  color: samePattern === val ? "#fff" : C.mid,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── No subjects warning ── */}
        {!configLoading && selectedClass && subjects.length === 0 && (
          <div
            className="rounded-xl p-4 mb-4 flex items-start gap-3"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <AlertCircle
              size={16}
              style={{ color: "#f59e0b", marginTop: 1, flexShrink: 0 }}
            />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
                No subjects assigned to {selectedClass.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#92400e" }}>
                Assign subjects to this class first via the Subjects page, then
                come back to build the timetable.
              </p>
            </div>
          </div>
        )}

        {/* ── Timetable grid ── */}
        {configLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={22}
              className="animate-spin"
              style={{ color: C.light }}
            />
          </div>
        ) : slots.length === 0 ? (
          <div
            className="bg-white rounded-2xl shadow-sm p-8 text-center mb-4"
            style={{ border: `1px solid ${C.border}` }}
          >
            <Grid3X3
              size={32}
              style={{ color: C.light, margin: "0 auto 12px" }}
            />
            <p className="text-sm font-semibold" style={{ color: C.primary }}>
              No timetable configuration found
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: C.mid }}>
              Set up school timings first to define periods and breaks.
            </p>
            <button
              onClick={() => navigate("/admin/classes/timings")}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                background: C.primary,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                 fontFamily: "'Inter', sans-serif",
              }}
            >
              Set Up School Timings
            </button>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════
             TRANSPOSED TIMETABLE:
             ROWS    = Days (Mon, Tue, Wed, Thu, Fri | Sat)
             COLUMNS = Periods (Period 1, Period 2 … scrolls →)
          ═══════════════════════════════════════════════════════ */
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4"
            style={{ border: `1px solid ${C.border}` }}
          >
            {/* Scrollable table wrapper */}
            <div className="overflow-x-auto">
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  minWidth: `${130 + mergedGridSlots.length * 130}px`,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(189,221,252,0.08)",
                      borderBottom: `1.5px solid ${C.border}`,
                    }}
                  >
                    {/* Day label column header */}
                    <th
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.mid,
                         fontFamily: "'Inter', sans-serif",
                        letterSpacing: "0.4px",
                        minWidth: 90,
                        position: "sticky",
                        left: 0,
                        background: "rgba(244,248,252,0.98)",
                        zIndex: 2,
                        borderRight: `1.5px solid ${C.border}`,
                      }}
                    >
                      DAY
                    </th>
                    {/* One column per period/break slot */}
                    {mergedGridSlots.map((slot) => (
                      <th
                        key={slot.id}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          minWidth: slot.slotType === "PERIOD" ? 130 : 90,
                          maxWidth: slot.slotType === "PERIOD" ? 160 : 100,
                          background:
                            slot.slotType !== "PERIOD"
                              ? "rgba(189,221,252,0.08)"
                              : "rgba(244,248,252,0.98)",
                          borderRight: `1px solid ${C.border}`,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color:
                              slot.slotType === "PERIOD" ? C.primary : C.mid,
                             fontFamily: "'Inter', sans-serif",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {slot.label}
                        </p>
                        <p
                          style={{
                            fontSize: 10,
                            color: C.light,
                             fontFamily: "'Inter', sans-serif",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtTime(slot.startTime)}–{fmtTime(slot.endTime)}
                        </p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* ── All days rows (Mon–Sat) ── */}
                  {activeDays.map(
                    (day, dayIdx) => (
                      <tr
                        key={day}
                        style={{ borderBottom: `1px solid ${C.border}` }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(189,221,252,0.04)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        {/* Sticky day label */}
                        <td
                          style={{
                            padding: "8px 16px",
                            position: "sticky",
                            left: 0,
                            background: "rgba(244,248,252,0.98)",
                            zIndex: 1,
                            borderRight: `1.5px solid ${C.border}`,
                            minWidth: 90,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: C.primary,
                               fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {DAY_SHORT[day]}
                          </p>
                          {samePattern && day !== "MONDAY" && (
                            <span
                              style={{
                                fontSize: 9,
                                color: C.light,
                                 fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              auto
                            </span>
                          )}
                        </td>
                        {/* One cell per period/break */}
                        {day === "SATURDAY" && satSlots.length === 0 ? (
                          <td
                            colSpan={mergedGridSlots.length}
                            style={{
                              padding: "10px 16px",
                              background: "rgba(189,221,252,0.04)",
                            }}
                          >
                            <p style={{ fontSize: 11, color: C.light, fontFamily: "'Inter', sans-serif" }}>
                              Saturday timings not configured — go to{" "}
                              <span
                                onClick={() => navigate("/admin/classes/timings")}
                                style={{ color: C.mid, textDecoration: "underline", cursor: "pointer" }}
                              >
                                School Timings
                              </span>
                              {" "}to enable Saturday.
                            </p>
                          </td>
                        ) : mergedGridSlots.map((slot) => {
                          // For Saturday, resolve the actual Saturday slot by periodNumber
                          const effectiveSlot =
                            day === "SATURDAY" && satSlots.length > 0
                              ? slot._satOnly
                                ? slot
                                : satSlots.find(
                                    (s) =>
                                      s.periodNumber === slot.periodNumber &&
                                      s.slotType === slot.slotType,
                                  )
                              : slot;

                          // Sat-only slots: show dash for weekday rows; show break for Saturday
                          if (slot._satOnly && day !== "SATURDAY") {
                            return (
                              <td
                                key={slot.id}
                                style={{
                                  padding: "6px 8px",
                                  background: "rgba(189,221,252,0.03)",
                                  borderRight: `1px solid ${C.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    minHeight: 48,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <span
                                    style={{ fontSize: 10, color: C.border }}
                                  >
                                    —
                                  </span>
                                </div>
                              </td>
                            );
                          }
                          // Saturday with no matching slot — greyed out
                          if (day === "SATURDAY" && !effectiveSlot) {
                            return (
                              <td
                                key={slot.id}
                                style={{
                                  padding: "5px 6px",
                                  background: "rgba(189,221,252,0.03)",
                                  borderRight: `1px solid ${C.border}`,
                                }}
                              >
                                <div style={{ minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 10, color: "rgba(136,189,242,0.4)" }}>—</span>
                                </div>
                              </td>
                            );
                          }
                          if (effectiveSlot && effectiveSlot.slotType !== "PERIOD") {
                            return (
                              <td
                                key={slot.id}
                                style={{
                                  padding: "6px 10px",
                                  background: day === "SATURDAY"
                                    ? "rgba(136,189,242,0.06)"
                                    : "rgba(189,221,252,0.05)",
                                  borderRight: `1px solid ${C.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    minHeight: 48,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: C.light,
                                       fontFamily: "'Inter', sans-serif",
                                    }}
                                  >
                                    {day === "SATURDAY"
                                      ? effectiveSlot.label.replace(/^(Sat\s)+/i, "")
                                      : effectiveSlot.label}
                                  </span>
                                </div>
                              </td>
                            );
                          }
                          const resolvedSlot = effectiveSlot || slot;
                          const cell = timetable[day]?.[resolvedSlot.id];
                          const color = cell
                            ? subjectColor(cell.subjectId)
                            : null;
                          return (
                            <td
                              key={slot.id}
                              style={{
                                padding: "5px 6px",
                                borderRight: `1px solid ${C.border}`,
                              }}
                            >
                              <div
                                onClick={() => openCell(day, resolvedSlot)}
                                style={{
                                  minHeight: 52,
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  background: cell
                                    ? color + "14"
                                    : day === "SATURDAY"
                                    ? "rgba(136,189,242,0.06)"
                                    : "rgba(189,221,252,0.06)",
                                  border: `1.5px solid ${cell ? color + "44" : day === "SATURDAY" ? "rgba(136,189,242,0.3)" : C.border}`,
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = cell
                                    ? color + "22"
                                    : C.pale)
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = cell
                                    ? color + "14"
                                    : day === "SATURDAY"
                                    ? "rgba(136,189,242,0.06)"
                                    : "rgba(189,221,252,0.06)")
                                }
                              >
                                {cell ? (
                                  <>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        marginBottom: 2,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: 2,
                                          background: color,
                                          flexShrink: 0,
                                        }}
                                      />
                                      <p
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: C.primary,
                                           fontFamily: "'Inter', sans-serif",
                                          lineHeight: 1.2,
                                        }}
                                      >
                                        {cell.subjectName}
                                      </p>
                                    </div>
                                    <p
                                      style={{
                                        fontSize: 10,
                                        color: C.mid,
                                         fontFamily: "'Inter', sans-serif",
                                      }}
                                    >
                                      {cell.teacherName || "No teacher"}
                                    </p>
                                  </>
                                ) : (
                                  <p
                                    style={{
                                      fontSize: 10,
                                      color: C.light,
                                       fontFamily: "'Inter', sans-serif",
                                    }}
                                  >
                                    + Assign
                                  </p>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ),
                  )}

                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Save button ── */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
      <div>
        {samePattern !== null && (
          <p className="text-xs" style={{ color: C.mid }}>
            {samePattern
              ? "✓ Same Mon–Sat pattern — editing any period applies to all days"
              : "Each day is configured individually"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">

      

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 rounded-xl text-sm font-semibold"
          style={{
            padding: "10px 18px",
            background: "#fff",
            border: `1.5px solid ${C.border}`,
            color: C.primary,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Upload size={15} />
          {bulkUploading ? "Uploading..." : "Bulk Upload"}
        </button>

        <button
          onClick={handleSave}
          disabled={saving || samePattern === null}
          className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
          style={{
            padding: "10px 24px",
            background:
              samePattern === null
                ? "rgba(106,137,167,0.35)"
                : saving
                  ? "rgba(106,137,167,0.5)"
                  : C.primary,
            border: "none",
            cursor:
              saving || samePattern === null
                ? "not-allowed"
                : "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {saving ? (
            <Loader2
              size={15}
              className="animate-spin"
            />
          ) : (
            <Save size={15} />
          )}

          {saving
            ? "Saving…"
            : "Save Timetable"}
        </button>

      </div>
    </div>

      </div>

      {/* ── Cell edit modal (existing) ── */}
      {editCell && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl"
            style={{
              width: "min(460px,94vw)",
              padding: 24,
              maxHeight: "85vh",
              overflowY: "auto",
              border: `1px solid ${C.border}`,
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: C.primary }}
                >
                  Assign Period
                </h3>
                <p className="text-sm" style={{ color: C.mid }}>
                  {selectedClass?.name} · {DAY_SHORT[editCell.day]} ·{" "}
                  {editCell.slot.label}
                  {samePattern && (
                    <span className="ml-1 text-xs" style={{ color: "#f59e0b" }}>
                      (applies Mon–Sat)
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setEditCell(null)}
                style={{
                  border: "none",
                  background: C.pale,
                  borderRadius: 8,
                  padding: 7,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={15} style={{ color: C.mid }} />
              </button>
            </div>

            {/* Subject picker */}
            <div className="mb-4">
              <p
                className="text-xs font-semibold uppercase mb-2"
                style={{ color: C.mid, letterSpacing: "0.5px" }}
              >
                Subject
              </p>
              {subjects.length === 0 ? (
                <p className="text-sm" style={{ color: C.light }}>
                  No subjects assigned to this class
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {subjects.map((s, i) => {
                    const color = COLORS[i % COLORS.length];
                    const sel = cellForm.subjectId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() =>
                          setCellForm((f) => ({ ...f, subjectId: s.id }))
                        }
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          cursor: "pointer",
                          border: `1.5px solid ${sel ? color : C.border}`,
                          background: sel ? color + "15" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: sel ? color : C.primary }}
                        >
                          {s.name}
                        </span>
                        {sel && (
                          <Check
                            size={12}
                            style={{ color, marginLeft: "auto" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Teacher picker */}
            <div className="mb-5">
              <p
                className="text-xs font-semibold uppercase mb-2"
                style={{ color: C.mid, letterSpacing: "0.5px" }}
              >
                Teacher (Optional)
              </p>
              {allTeachers.length > 0 && (
                <div
                  className="flex items-center gap-2 mb-2 rounded-xl"
                  style={{
                    padding: "7px 11px",
                    border: `1.5px solid ${C.border}`,
                    background: "#fff",
                  }}
                >
                  <Search size={13} style={{ color: C.light, flexShrink: 0 }} />
                  <input
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search by name, department or qualification…"
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: 12,
                      color: C.primary,
                       fontFamily: "'Inter', sans-serif",
                      flex: 1,
                      background: "transparent",
                    }}
                  />
                  {teacherSearch && (
                    <button
                      onClick={() => setTeacherSearch("")}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        display: "flex",
                        padding: 0,
                      }}
                    >
                      <X size={12} style={{ color: C.mid }} />
                    </button>
                  )}
                </div>
              )}

              {allTeachers.length === 0 ? (
                <div
                  className="flex items-center gap-2 rounded-xl text-sm"
                  style={{
                    padding: "10px 12px",
                    background: "#fef9ec",
                    border: "1.5px solid #fde68a",
                    color: "#92400e",
                  }}
                >
                  <AlertCircle size={13} /> No teachers created yet. Add
                  teachers first.
                </div>
              ) : (
                (() => {
                  const q = teacherSearch.toLowerCase();
                  const filtered = allTeachers.filter(
                    (t) =>
                      !q ||
                      `${t.firstName} ${t.lastName}`
                        .toLowerCase()
                        .includes(q) ||
                      t.department?.toLowerCase().includes(q) ||
                      t.designation?.toLowerCase().includes(q) ||
                      t.qualification?.toLowerCase().includes(q),
                  );
                  return filtered.length === 0 ? (
                    <p
                      className="text-xs"
                      style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                    >
                      No teachers match "{teacherSearch}"
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                      <div
  onClick={() =>
    setCellForm((f) => ({
      ...f,
      teacherId: "",
    }))
  }
  style={{
    padding: "9px 12px",
    borderRadius: 10,
    cursor: "pointer",
    border: `1.5px solid ${
      cellForm.teacherId === ""
        ? C.primary
        : C.border
    }`,
    background:
      cellForm.teacherId === ""
        ? C.pale
        : "#fff",
    marginBottom: 6,
  }}
>
  <p
    style={{
      fontSize: 13,
      fontWeight: 600,
      color: C.primary,
      fontFamily: "'Inter', sans-serif",
    }}
  >
    No Teacher
  </p>

  <p
    style={{
      fontSize: 11,
      color: C.mid,
      fontFamily: "'Inter', sans-serif",
    }}
  >
    Save without assigning teacher
  </p>
</div>
                      {filtered.map((t) => {
                        const sel = cellForm.teacherId === t.id;
                        const initials = `${t.firstName?.[0] || ""}${t.lastName?.[0] || ""}`;
                        return (
                          <div
                            key={t.id}
                            onClick={() =>
                              setCellForm((f) => ({ ...f, teacherId: t.id }))
                            }
                            style={{
                              padding: "9px 12px",
                              borderRadius: 10,
                              cursor: "pointer",
                              border: `1.5px solid ${sel ? C.primary : C.border}`,
                              background: sel ? C.pale : "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "all 0.12s",
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                style={{
                                  background: sel
                                    ? "rgba(56,73,89,0.18)"
                                    : "rgba(136,189,242,0.2)",
                                  color: C.primary,
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <p
                                  className="text-sm font-semibold"
                                  style={{
                                    color: C.primary,
                                     fontFamily: "'Inter', sans-serif",
                                  }}
                                >
                                  {t.firstName} {t.lastName}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {t.department && (
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                      style={{
                                        background: "rgba(79,70,229,0.09)",
                                        color: "#4f46e5",
                                         fontFamily: "'Inter', sans-serif",
                                      }}
                                    >
                                      {t.department}
                                    </span>
                                  )}
                                  {t.qualification && (
                                    <span
                                      className="text-xs"
                                      style={{
                                        color: C.mid,
                                         fontFamily: "'Inter', sans-serif",
                                      }}
                                    >
                                      {t.qualification}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {sel && (
                              <Check
                                size={14}
                                style={{ color: C.primary, flexShrink: 0 }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditCell(null)}
                style={{
                  padding: "8px 16px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                   fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              {timetable[editCell.day]?.[editCell.slot.id] && (
                <button
                  onClick={() => {
                    clearCell(editCell.day, editCell.slot.id);
                    setEditCell(null);
                  }}
                  style={{
                    padding: "8px 14px",
                    border: "none",
                    borderRadius: 10,
                    color: "#ef4444",
                    background: "rgba(239,68,68,0.08)",
                    cursor: "pointer",
                     fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              )}
              <button
                onClick={saveCell}
                disabled={!cellForm.subjectId}
                className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
                style={{
                  padding: "8px 18px",
                  background:
                    !cellForm.subjectId
                      ? "rgba(106,137,167,0.4)"
                      : C.primary,
                  border: "none",
                  cursor: "pointer",
                   fontFamily: "'Inter', sans-serif",
                }}
              >
                <Check size={14} /> Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Modal ── */}
      {showUploadModal && (
        <BulkUploadModal
          selectedClass={selectedClass}
          slots={mergedGridSlots}
          subjects={subjects}
          allClasses={classes}
          allTeachers={allTeachers}
          onUpload={handleBulkUpload}
          onBulkUpload={handleAllClassesUpload}
          onDownloadSingle={handleDownloadSingleTemplate}
          onDownloadAll={handleDownloadAllTemplate}
          downloading={downloadingTemplate}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}