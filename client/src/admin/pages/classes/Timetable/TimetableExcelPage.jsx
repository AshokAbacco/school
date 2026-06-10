// client/src/admin/pages/classes/TimetableExcelPage.jsx

import { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Info,
  BookOpen,
  Layers,
  Tag,
} from "lucide-react";
import {
  fetchClassSections,
  fetchAcademicYears,
  downloadAllTimetableTemplate,
  uploadAllTimetableTemplate,
  downloadSingleTimetableTemplate,
  uploadSingleTimetableTemplate,
} from "../api/classesApi.js";

// ─── Design Tokens (matches TimetablePage.jsx) ───────────────────────────────
const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, accent, children }) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(56,73,89,0.06)",
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: accent || C.pale,
        }}
      >
        <Icon size={20} color={C.primary} />
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: C.primary,
            letterSpacing: 0.3,
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ padding: "24px" }}>{children}</div>
    </div>
  );
}

function ActionButton({
  onClick,
  loading,
  icon: Icon,
  label,
  variant = "primary",
  disabled,
}) {
  const styles = {
    primary: {
      background: C.primary,
      color: "#fff",
      border: "none",
    },
    outline: {
      background: "transparent",
      color: C.primary,
      border: `1.5px solid ${C.light}`,
    },
    success: {
      background: "#10b981",
      color: "#fff",
      border: "none",
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles[variant],
        borderRadius: 8,
        padding: "10px 20px",
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {loading ? (
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <Icon size={16} />
      )}
      {label}
    </button>
  );
}

function ClassDropdown({ classes, value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 36px 10px 14px",
          borderRadius: 8,
          border: `1.5px solid ${value ? C.light : C.border}`,
          background: C.card,
          color: value ? C.primary : C.mid,
          fontWeight: value ? 600 : 400,
          fontSize: 14,
          appearance: "none",
          cursor: "pointer",
          outline: "none",
          transition: "border-color 0.15s",
        }}
      >
        <option value="">{placeholder || "Select Class"}</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        color={C.mid}
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      />
    </div>
  );
}

function UploadZone({ onFile, accept = ".xlsx,.xls", loading, label }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onClick={() => !loading && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? C.light : C.border}`,
        borderRadius: 10,
        padding: "28px 20px",
        textAlign: "center",
        cursor: loading ? "not-allowed" : "pointer",
        background: dragging ? C.pale : "transparent",
        transition: "all 0.15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; }}
      />
      {loading ? (
        <Loader2 size={32} color={C.light} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
      ) : (
        <Upload size={32} color={C.light} style={{ margin: "0 auto 8px" }} />
      )}
      <p style={{ color: C.mid, fontSize: 14, margin: 0 }}>
        {label || "Drop Excel file here or click to browse"}
      </p>
      <p style={{ color: C.border, fontSize: 12, marginTop: 4 }}>Supports .xlsx / .xls</p>
    </div>
  );
}

// ── Detected Class Banner ─────────────────────────────────────────────────────
// Shown after a single-class upload when the server auto-detected the class name.
function DetectedClassBanner({ className, onClose }) {
  if (!className) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: 9,
        padding: "10px 14px",
        marginBottom: 12,
      }}
    >
      <Tag size={15} color="#16a34a" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>
          Class detected from Excel:&nbsp;
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#166534",
            background: "#dcfce7",
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {className}
        </span>
      </div>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
      >
        <X size={14} color={C.mid} />
      </button>
    </div>
  );
}

function UploadResult({ result, onClose }) {
  if (!result) return null;
  const isSuccess = !result.error;
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${isSuccess ? "#10b981" : "#ef4444"}`,
        background: isSuccess ? "#f0fdf4" : "#fef2f2",
        padding: "16px 20px",
        position: "relative",
      }}
    >
      <button
        onClick={onClose}
        style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer" }}
      >
        <X size={16} color={C.mid} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {isSuccess ? (
          <CheckCircle2 size={18} color="#10b981" />
        ) : (
          <AlertCircle size={18} color="#ef4444" />
        )}
        <span style={{ fontWeight: 700, fontSize: 14, color: isSuccess ? "#065f46" : "#991b1b" }}>
          {isSuccess ? "Upload Completed Successfully" : "Upload Failed"}
        </span>
      </div>
      {isSuccess && result.summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: 8 }}>
          {[
            { label: "Classes Updated", value: result.summary.classesUpdated, color: "#059669" },
            { label: "Entries Created", value: result.summary.entriesCreated, color: "#2563eb" },
            { label: "Entries Updated", value: result.summary.entriesUpdated, color: "#7c3aed" },
            { label: "Failed Rows", value: result.summary.failedRows, color: result.summary.failedRows > 0 ? "#dc2626" : "#6b7280" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "#fff",
                borderRadius: 8,
                padding: "10px 12px",
                border: `1px solid rgba(0,0,0,0.06)`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value ?? 0}</div>
              <div style={{ fontSize: 12, color: C.mid, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}
      {result.error && (
        <p style={{ color: "#991b1b", fontSize: 13, margin: "4px 0 0" }}>{result.error}</p>
      )}
      {isSuccess && result.summary?.failedDetails?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: "#991b1b", marginBottom: 4 }}>Failed Rows:</p>
          {result.summary.failedDetails.map((d, i) => (
            <div key={i} style={{ fontSize: 12, color: "#7f1d1d", background: "#fee2e2", borderRadius: 6, padding: "4px 8px", marginBottom: 4 }}>
              {d.class} · {d.day} · {d.period}: {d.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimetableExcelPage() {
  const [academicYear, setAcademicYear] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // All Classes section state
  const [allDownloading, setAllDownloading] = useState(false);
  const [allUploading, setAllUploading] = useState(false);
  const [allUploadResult, setAllUploadResult] = useState(null);

  // Single Class section state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [singleDownloading, setSingleDownloading] = useState(false);
  const [singleUploading, setSingleUploading] = useState(false);
  const [singleUploadResult, setSingleUploadResult] = useState(null);
  // Auto-detected class name from single upload
  const [detectedSingleClassName, setDetectedSingleClassName] = useState(null);
  const [detectedSingleClassId, setDetectedSingleClassId] = useState(null);

  // Init: load academic year + classes
  useEffect(() => {
    (async () => {
      try {
        const [yearsData, classesData] = await Promise.all([
          fetchAcademicYears(),
          fetchClassSections({ limit: 200 }),
        ]);
        const active =
          (yearsData.academicYears || yearsData).find((y) => y.isActive) ||
          (yearsData.academicYears || yearsData)[0];
        setAcademicYear(active);
        setClasses(
          (classesData.classSections || classesData).sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true })
          )
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // ── All Classes: Download ─────────────────────────────────────────────────
  const handleDownloadAll = async () => {
    if (!academicYear) return;
    setAllDownloading(true);
    try {
      const blob = await downloadAllTimetableTemplate(academicYear.id);
      triggerDownload(blob, `All_Classes_Timetable_Template_${academicYear.name || "AY"}.xlsx`);
    } catch (e) {
      alert("Download failed: " + e.message);
    } finally {
      setAllDownloading(false);
    }
  };

  // ── All Classes: Upload ───────────────────────────────────────────────────
  const handleUploadAll = async (file) => {
    if (!academicYear) return;
    setAllUploading(true);
    setAllUploadResult(null);
    try {
      const result = await uploadAllTimetableTemplate(academicYear.id, file);
      setAllUploadResult({ summary: result.summary });
    } catch (e) {
      setAllUploadResult({ error: e.message });
    } finally {
      setAllUploading(false);
    }
  };

  // ── Single Class: Download ────────────────────────────────────────────────
  const handleDownloadSingle = async () => {
    if (!academicYear || !selectedClassId) return;
    setSingleDownloading(true);
    try {
      const cls = classes.find((c) => c.id === selectedClassId);
      const blob = await downloadSingleTimetableTemplate(academicYear.id, selectedClassId);
      triggerDownload(blob, `${cls?.name || "Class"}_Timetable_Template.xlsx`);
    } catch (e) {
      alert("Download failed: " + e.message);
    } finally {
      setSingleDownloading(false);
    }
  };

  // ── Single Class: Upload ──────────────────────────────────────────────────
  // The class is auto-detected from the Excel "CLASS NAME:" row.
  // selectedClassId is sent as a fallback URL param (use a placeholder if not selected).
  const handleUploadSingle = async (file) => {
    if (!academicYear) return;
    setSingleUploading(true);
    setSingleUploadResult(null);
    setDetectedSingleClassName(null);
    setDetectedSingleClassId(null);
    try {
      // Use selectedClassId if chosen, otherwise send "auto" — the controller
      // will resolve from the CLASS NAME row inside the Excel.
      const classIdParam = selectedClassId || "auto";
      const result = await uploadSingleTimetableTemplate(academicYear.id, classIdParam, file);
      setSingleUploadResult({ summary: result.summary });
      if (result.detectedClassName) {
        setDetectedSingleClassName(result.detectedClassName);
      }
      if (result.detectedClassId) {
        setDetectedSingleClassId(result.detectedClassId);
        // Auto-select the detected class in the dropdown for visual feedback
        setSelectedClassId(result.detectedClassId);
      }
    } catch (e) {
      setSingleUploadResult({ error: e.message });
    } finally {
      setSingleUploading(false);
    }
  };

  if (loadingInit) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <Loader2 size={36} color={C.light} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: C.mid, fontSize: 14 }}>Loading timetable data…</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 24px" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        button:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: C.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileSpreadsheet size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.primary }}>
              Timetable Excel Management
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: C.mid }}>
              Download templates and upload timetables via Excel
              {academicYear && (
                <span
                  style={{
                    marginLeft: 8,
                    background: C.pale,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.primary,
                  }}
                >
                  {academicYear.name}
                </span>
              )}
            </p>
          </div>
        </div>
        {!academicYear && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: 8,
              padding: "10px 14px",
              marginTop: 12,
            }}
          >
            <AlertCircle size={16} color="#d97706" />
            <span style={{ fontSize: 13, color: "#92400e" }}>
              No active academic year found. Please set one in Academic Year settings.
            </span>
          </div>
        )}
      </div>

      {/* ── Info Banner ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 24,
        }}
      >
        <Info size={16} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 13, color: "#1e40af", lineHeight: 1.6 }}>
          Templates are generated dynamically from your <strong>School Timings Configuration</strong>.
          Each template embeds a <strong>CLASS NAME</strong> identifier so the system can automatically
          detect which class you're uploading — no manual class selection required when uploading.
          Re-download the template if you update school timings.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ══════════════════════════════════════════════
            SECTION 1 — ALL CLASSES TIMETABLE
        ══════════════════════════════════════════════ */}
        <SectionCard title="All Classes Timetable" icon={Layers} accent="rgba(136,189,242,0.12)">
          <p style={{ margin: "0 0 20px", fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
            Download a <strong>single-sheet workbook</strong> — all class timetables appear one after another
            in one sheet, each block labelled with a green <em>CLASS NAME</em> row. A separate
            <strong> Class Subjects</strong> sheet lists every class's assigned subjects for reference.
            Upload the filled workbook to save all class timetables at once — class names are
            auto-detected from the marker rows.
          </p>

          {/* Download */}
          <div
            style={{
              background: C.pale,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: "18px 20px",
              marginBottom: 20,
            }}
          >
            <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13, color: C.primary }}>
              Step 1 — Download Template
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <ActionButton
                onClick={handleDownloadAll}
                loading={allDownloading}
                icon={Download}
                label="Download All Classes Template"
                disabled={!academicYear}
              />
              <span style={{ fontSize: 12, color: C.mid }}>
                {classes.length} classes · single sheet + Class Subjects sheet
              </span>
            </div>
          </div>

          {/* Upload */}
          <div
            style={{
              background: C.pale,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: "18px 20px",
            }}
          >
            <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13, color: C.primary }}>
              Step 2 — Upload Filled Workbook
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                background: "#fffbeb",
                border: "1px solid #fef08a",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 12,
                color: "#713f12",
              }}
            >
              <Info size={13} color="#ca8a04" style={{ marginTop: 1, flexShrink: 0 }} />
              Class names are automatically read from the green <strong>CLASS NAME:</strong> rows —
              no need to select classes manually. Make sure the class names in the Excel
              exactly match the names in the system.
            </div>
            <UploadZone
              onFile={handleUploadAll}
              loading={allUploading}
              label="Drop the filled All Classes workbook here or click to browse"
            />
            {allUploadResult && (
              <div style={{ marginTop: 14 }}>
                <UploadResult result={allUploadResult} onClose={() => setAllUploadResult(null)} />
              </div>
            )}
          </div>
        </SectionCard>

        {/* ══════════════════════════════════════════════
            SECTION 2 — SINGLE CLASS TIMETABLE
        ══════════════════════════════════════════════ */}
        <SectionCard title="Single Class Timetable" icon={BookOpen} accent="rgba(16,185,129,0.06)">
          <p style={{ margin: "0 0 20px", fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
            Select a class to download its personalised template — the template includes a
            <strong> CLASS NAME</strong> identifier row and Excel dropdown validation for subjects.
            When you upload the filled file, the class is <strong>automatically detected</strong> from
            the Excel — no re-selection needed. Only subjects assigned to that class are accepted.
          </p>

          {/* Class Selector (optional — used for targeted download) */}
          <div
            style={{
              background: C.pale,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: "18px 20px",
              marginBottom: 20,
            }}
          >
            <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 13, color: C.primary }}>
              Select Class <span style={{ fontWeight: 400, color: C.mid, fontSize: 12 }}>(for download)</span>
            </p>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: C.mid }}>
              Only needed to download the template. Uploading works without a selection — the class
              is auto-detected from the Excel file.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <ClassDropdown
                classes={classes}
                value={selectedClassId}
                onChange={(id) => {
                  setSelectedClassId(id);
                  setSingleUploadResult(null);
                  setDetectedSingleClassName(null);
                  setDetectedSingleClassId(null);
                }}
                placeholder="— Select a class (optional for upload) —"
              />
              {selectedClassId && (
                <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                  ✓ {classes.find((c) => c.id === selectedClassId)?.name}
                </span>
              )}
            </div>
          </div>

          {/* Download Single */}
          <div
            style={{
              background: C.pale,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: "18px 20px",
              marginBottom: 20,
            }}
          >
            <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 13, color: C.primary }}>
              Step 1 — Download Template
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <ActionButton
                onClick={handleDownloadSingle}
                loading={singleDownloading}
                icon={Download}
                label="Download Selected Class Template"
                variant="outline"
                disabled={!selectedClassId || !academicYear}
              />
              {selectedClassId && (
                <span style={{ fontSize: 12, color: C.mid }}>
                  Includes CLASS NAME row · timetable sheet · Class Subjects sheet with Excel dropdowns
                </span>
              )}
            </div>
            {!selectedClassId && (
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#d97706" }}>
                Select a class above to download its template.
              </p>
            )}
          </div>

          {/* Upload Single */}
          <div
            style={{
              background: C.pale,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: "18px 20px",
            }}
          >
            <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: C.primary }}>
              Step 2 — Upload Filled Template
            </p>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: C.mid }}>
              The class is automatically identified from the <strong>CLASS NAME:</strong> row embedded
              in the template — no need to pre-select a class before uploading.
            </p>

            {/* Show detected class banner if available */}
            {detectedSingleClassName && (
              <DetectedClassBanner
                className={detectedSingleClassName}
                onClose={() => setDetectedSingleClassName(null)}
              />
            )}

            <UploadZone
              onFile={handleUploadSingle}
              loading={singleUploading}
              label={
                selectedClassId
                  ? `Drop the filled ${classes.find((c) => c.id === selectedClassId)?.name || ""} timetable here`
                  : "Drop any single-class timetable Excel here — class auto-detected"
              }
            />
            {singleUploadResult && (
              <div style={{ marginTop: 14 }}>
                <UploadResult result={singleUploadResult} onClose={() => { setSingleUploadResult(null); setDetectedSingleClassName(null); }} />
              </div>
            )}
          </div>
        </SectionCard>

      </div>
    </div>
  );
}