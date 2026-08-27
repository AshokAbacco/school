// client/src/admin/pages/Exams/components/BulkReportDownloadModal.jsx
// "Download Reports" modal — lets an admin pick a PDF colour theme, optionally
// add month-wise attendance and remarks (applied to every selected student's
// PDF), then downloads the Marks & Report Card PDF for each selected student
// one after another, reusing the exact same fetch + PDF-generation logic as
// StudentReportModal.jsx (single-student view).

import { useState } from "react";
import {
  X, Download, Loader2, Check, AlertCircle, Users,
  Plus, Trash2, CalendarDays, MessageSquare,
} from "lucide-react";
import { getToken } from "../../../../auth/storage.js";
import { useSchoolLogo } from "../../../../hooks/useSchoolLogo.js";
import { PDF_THEMES, downloadReportPDF } from "../../../../student/pages/marks/utils/downloadPDF.js";

const API_URL = import.meta.env.VITE_API_URL;
const authHdr = () => ({ Authorization: `Bearer ${getToken()}` });
const THEME_LIST = Object.values(PDF_THEMES);

let rowIdSeq = 0;
const newRow = () => ({ id: ++rowIdSeq, month: "", total: "", present: "" });

async function fetchStudentReport(studentId, assessmentGroupId, subAssessmentGroupId) {
  const url = new URL(`${API_URL}/api/results/report/${studentId}/${assessmentGroupId}`);
  if (subAssessmentGroupId) url.searchParams.set("subAssessmentGroupId", subAssessmentGroupId);
  const r = await fetch(url, { headers: authHdr() });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(j.message || `HTTP ${r.status}`);
  return j.data;
}

export default function BulkReportDownloadModal({
  open, students, assessmentGroupId, subAssessmentGroupId, onClose,
}) {
  const [themeKey, setThemeKey] = useState("default");
  const [attendance, setAttendance] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total, name }
  const [failed, setFailed] = useState([]);
  const [done, setDone] = useState(false);

  const sidebarLogoUrl = useSchoolLogo();

  if (!open) return null;

  const addRow = () => setAttendance((rows) => [...rows, newRow()]);
  const removeRow = (id) => setAttendance((rows) => rows.filter((r) => r.id !== id));
  const updateRow = (id, key, value) =>
    setAttendance((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const handleDownloadAll = async () => {
    setDownloading(true);
    setFailed([]);
    setDone(false);
    const failedNames = [];

    const cleanAttendance = attendance
      .filter((r) => r.month.trim() !== "")
      .map((r) => ({ month: r.month.trim(), total: r.total, present: r.present }));
    const cleanRemarks = remarks.trim();

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      setProgress({ current: i + 1, total: students.length, name: s.studentName });
      try {
        const data = await fetchStudentReport(s.studentId, assessmentGroupId, subAssessmentGroupId);
        const enriched = {
          ...data,
          enrollment: {
            ...data.enrollment,
            schoolLogoUrl: sidebarLogoUrl ?? data?.enrollment?.schoolLogoUrl ?? null,
          },
        };
        await downloadReportPDF(enriched, themeKey, cleanAttendance, cleanRemarks);
        // small pause so each browser "save" completes before the next starts
        await new Promise((res) => setTimeout(res, 500));
      } catch (e) {
        failedNames.push(s.studentName);
      }
    }

    setFailed(failedNames);
    setDownloading(false);
    setProgress(null);
    setDone(true);
  };

  return (
    <div
      onClick={downloading ? undefined : onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2100,
        background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, overflowY: "auto",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 460,
          background: "#ffffff", borderRadius: 18,
          border: "1.5px solid #C8DCF0",
          boxShadow: "0 24px 60px rgba(15,23,42,0.30)",
          padding: 20,
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#243340", display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} /> Download Reports
          </p>
          {!downloading && (
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7", display: "flex", padding: 4 }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <p style={{ margin: "2px 0 16px", fontSize: 12, color: "#6A89A7", fontWeight: 500 }}>
          {students.length} student{students.length !== 1 ? "s" : ""} selected — each will download as a separate PDF.
        </p>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18,
          maxHeight: 84, overflowY: "auto",
        }}>
          {students.map((s) => (
            <span key={s.studentId} style={{
              fontSize: 11.5, fontWeight: 600, color: "#243340",
              background: "#EDF3FA", border: "1px solid #C8DCF0",
              borderRadius: 20, padding: "3px 10px",
            }}>
              {s.studentName}
            </span>
          ))}
        </div>

        {!downloading && !done && (
          <>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "#243340", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Colour Theme
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
              {THEME_LIST.map((t) => {
                const active = themeKey === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setThemeKey(t.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 12,
                      border: `1.5px solid ${active ? t.swatch : "#C8DCF0"}`,
                      background: active ? `${t.swatch}14` : "#ffffff",
                      cursor: "pointer", textAlign: "left",
                      boxShadow: active ? `0 0 0 3px ${t.swatch}22` : "none",
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: t.swatch, border: "1.5px solid rgba(0,0,0,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {active && <Check size={13} color="#fff" strokeWidth={3} />}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#243340" }}>{t.name}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#243340", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarDays size={13} /> Attendance (Optional)
              </p>
              <button
                onClick={addRow}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "#EDF3FA", border: "1.5px solid #C8DCF0",
                  borderRadius: 8, padding: "4px 9px",
                  fontSize: 11, fontWeight: 700, color: "#243340", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Plus size={12} /> Add Month
              </button>
            </div>

            {attendance.length === 0 ? (
              <p style={{ margin: "0 0 20px", fontSize: 11.5, color: "#94a3b8", fontStyle: "italic" }}>
                No months added — the PDFs will skip the Attendance Report section.
              </p>
            ) : (
              <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 74px 74px 26px", gap: 6, padding: "0 2px" }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Month</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Total</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Present</span>
                  <span />
                </div>
                {attendance.map((row) => (
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 74px 74px 26px", gap: 6, alignItems: "center" }}>
                    <input
                      value={row.month}
                      onChange={(e) => updateRow(row.id, "month", e.target.value)}
                      placeholder="e.g. June"
                      style={{
                        padding: "7px 9px", borderRadius: 8, border: "1.5px solid #C8DCF0",
                        fontSize: 12.5, color: "#243340", outline: "none", fontFamily: "'Inter', sans-serif",
                      }}
                    />
                    <input
                      type="number" min="0"
                      value={row.total}
                      onChange={(e) => updateRow(row.id, "total", e.target.value)}
                      placeholder="30"
                      style={{
                        padding: "7px 6px", borderRadius: 8, border: "1.5px solid #C8DCF0",
                        fontSize: 12.5, color: "#243340", outline: "none", textAlign: "center", fontFamily: "'Inter', sans-serif",
                      }}
                    />
                    <input
                      type="number" min="0"
                      value={row.present}
                      onChange={(e) => updateRow(row.id, "present", e.target.value)}
                      placeholder="28"
                      style={{
                        padding: "7px 6px", borderRadius: 8, border: "1.5px solid #C8DCF0",
                        fontSize: 12.5, color: "#243340", outline: "none", textAlign: "center", fontFamily: "'Inter', sans-serif",
                      }}
                    />
                    <button
                      onClick={() => removeRow(row.id)}
                      aria-label="Remove month"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "#243340", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={13} /> Remarks (Optional)
            </p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Good progress this term…"
              rows={3}
              style={{
                width: "100%", resize: "vertical", marginBottom: 20,
                padding: "9px 10px", borderRadius: 10, border: "1.5px solid #C8DCF0",
                fontSize: 12.5, color: "#243340", outline: "none", fontFamily: "'Inter', sans-serif",
                boxSizing: "border-box",
              }}
            />
          </>
        )}

        {downloading && progress && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", borderRadius: 12, marginBottom: 20,
            background: "#EDF3FA", border: "1.5px solid #C8DCF0",
          }}>
            <Loader2 size={16} color="#384959" style={{ animation: "bulkDlSpin 0.9s linear infinite", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#243340" }}>
                Downloading {progress.current} of {progress.total}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#6A89A7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {progress.name}
              </p>
            </div>
          </div>
        )}

        {done && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 14px", borderRadius: 12, marginBottom: 20,
            background: failed.length ? "#fef2f2" : "#ecfdf5",
            border: `1.5px solid ${failed.length ? "#fca5a5" : "#a7f3d0"}`,
          }}>
            {failed.length ? <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} /> : <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />}
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: failed.length ? "#b91c1c" : "#065f46" }}>
              {failed.length
                ? `Downloaded ${students.length - failed.length} of ${students.length}. Failed: ${failed.join(", ")}.`
                : `All ${students.length} report${students.length !== 1 ? "s" : ""} downloaded successfully.`}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            disabled={downloading}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 11,
              border: "1.5px solid #C8DCF0", background: "#ffffff",
              color: "#6A89A7", fontSize: 13, fontWeight: 700,
              cursor: downloading ? "not-allowed" : "pointer", opacity: downloading ? 0.6 : 1,
            }}
          >
            {done ? "Close" : "Cancel"}
          </button>
          {!done && (
            <button
              onClick={handleDownloadAll}
              disabled={downloading || !students.length}
              style={{
                flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 14px", borderRadius: 11, border: "none",
                background: "#243340", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: downloading || !students.length ? "not-allowed" : "pointer",
                opacity: downloading || !students.length ? 0.7 : 1,
              }}
            >
              {downloading
                ? <Loader2 size={14} style={{ animation: "bulkDlSpin 0.9s linear infinite" }} />
                : <Download size={14} />}
              {downloading ? "Downloading…" : `Download All (${students.length})`}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes bulkDlSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}