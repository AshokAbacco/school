// client/src/student/pages/marks/Marks.jsx
// Stormy Morning palette · Inter font · fully responsive

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, AlertCircle, FileText,
  EyeOff, Loader2, Download, Lock, X, Send,
} from "lucide-react";

import { getToken }        from "../../../auth/storage.js";
import { C, FONT, GLOBAL_CSS } from "./tokens.js";
import SummaryCards from "./components/SummaryCards.jsx";
import SubjectTable from "./components/SubjectTable.jsx";
import PerformanceInsights from "./components/PerformanceInsights.jsx";
import { downloadReportPDF } from "./utils/downloadPDF.js";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    ...options,
  });
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json"))
    throw new Error(`Server error (${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Unknown error");
  return json.data;
}

function useWindowWidth() {
  const [w, setW] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handle = () => setW(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return w;
}

/* ── Revaluation Modal ── */
function RevaluationModal({ subject, studentId, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!reason.trim()) { setError("Please provide a reason."); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch("/revaluation", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          markId:       subject.markId,
          subjectId:    subject.subjectId,
          currentMarks: subject.marksObtained,
          reason:       reason.trim(),
        }),
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(36,51,64,0.55)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
      animation: "fadeUp 0.2s ease",
    }}>
      <div className="mrk-card" style={{
        width: "100%", maxWidth: 420,
        padding: 0, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
          borderBottom: `1.5px solid rgba(136,189,242,0.20)`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: C.dark, fontFamily: FONT.sans }}>
              Apply for Revaluation
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.mid, fontWeight: 500 }}>
              {subject.subjectName}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.mid, padding: 4, borderRadius: 6,
            display: "flex", alignItems: "center",
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "18px 20px" }}>
          {/* Current marks pill */}
          <div style={{
            display: "flex", gap: 8, marginBottom: 16,
          }}>
            {[
              { label: "Obtained", value: subject.marksObtained ?? "—" },
              { label: "Max",      value: subject.maxMarks ?? "—" },
              { label: "Pass",     value: subject.passingMarks ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                flex: 1, textAlign: "center",
                background: `${C.bg}`,
                border: `1.5px solid rgba(136,189,242,0.22)`,
                borderRadius: 10, padding: "8px 6px",
              }}>
                <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.dark, fontFamily: FONT.sans }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Reason textarea */}
          <label style={{ fontSize: 11, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
            Reason for Revaluation
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="Explain why you believe your marks should be reviewed…"
            style={{
              width: "100%", boxSizing: "border-box",
              border: `1.5px solid ${error ? C.red : C.borderLight}`,
              borderRadius: 11, padding: "10px 13px",
              fontSize: 13, fontFamily: FONT.sans,
              color: C.text, background: C.white,
              outline: "none", resize: "vertical",
              lineHeight: 1.6,
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = C.light}
            onBlur={e => e.target.style.borderColor = error ? C.red : C.borderLight}
          />

          {error && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: C.red, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <AlertCircle size={11} /> {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "10px", borderRadius: 10,
              border: `1.5px solid ${C.borderLight}`,
              background: C.white, color: C.mid,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: FONT.sans,
            }}>
              Cancel
            </button>
            <button onClick={submit} disabled={loading} style={{
              flex: 1, padding: "10px", borderRadius: 10,
              border: "none",
              background: loading ? C.mid : C.dark,
              color: C.white,
              fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: FONT.sans,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "background 0.15s",
            }}>
              {loading
                ? <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />
                : <Send size={13} />}
              {loading ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Not published state ── */
function NotPublished({ isMobile }) {
  return (
    <div className="mrk-card" style={{
      padding: isMobile ? "40px 20px" : "60px 32px",
      textAlign: "center",
      animation: "fadeUp 0.4s ease",
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: "50%",
        background: `linear-gradient(135deg, rgba(189,221,252,0.45), rgba(136,189,242,0.22))`,
        border: `2px dashed rgba(136,189,242,0.50)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 18px",
      }}>
        <EyeOff size={26} color={C.mid} />
      </div>
      <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: C.dark, margin: "0 0 8px", fontFamily: FONT.sans }}>
        Results Not Published Yet
      </h2>
      <p style={{ fontSize: 13, color: C.mid, maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.65, fontWeight: 500 }}>
        Marks have not been released for this exam yet. Check back once your teacher publishes the results.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 260, margin: "0 auto 18px" }}>
        <div style={{ flex: 1, height: 1, background: "rgba(136,189,242,0.28)" }} />
        <span style={{ fontSize: 9, color: C.mid, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          What to Expect
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(136,189,242,0.28)" }} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "0 auto" }}>
        {[
          { icon: "📋", text: "Subject-wise marks" },
          { icon: "📊", text: "Grade & percentage" },
          { icon: "🏆", text: "Class rank" },
          { icon: "📄", text: "PDF report card" },
        ].map(({ icon, text }) => (
          <div key={text} style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(237,243,250,0.80)", borderRadius: 10, padding: "8px 14px",
            border: `1.5px solid rgba(136,189,242,0.22)`,
          }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontSize: 11, color: C.mid, fontWeight: 600, fontFamily: FONT.sans }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Error banner ── */
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.28)",
      borderRadius: 13, padding: "13px 16px", marginBottom: 16,
      display: "flex", gap: 10, alignItems: "flex-start",
      animation: "fadeUp 0.3s ease",
    }}>
      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ color: "#b91c1c", fontWeight: 700, fontSize: 13, margin: 0, fontFamily: FONT.sans }}>
          Unable to load results
        </p>
        <p style={{ color: "#ef4444", fontSize: 12, margin: "3px 0 0" }}>{message}</p>
      </div>
    </div>
  );
}

/* ── Vertical accent bar header ── */
function PageHeader({ loading, enrollment, isMobile }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{
        width: 4, height: isMobile ? 26 : 32, borderRadius: 99, flexShrink: 0,
        background: `linear-gradient(180deg, ${C.light} 0%, ${C.dark} 100%)`,
      }} />
      <div>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? "clamp(17px,5vw,20px)" : "clamp(20px,3vw,26px)",
          fontWeight: 800, color: C.dark, letterSpacing: "-0.5px",
          fontFamily: FONT.sans,
        }}>
          Marks &amp; Report Card
        </h1>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight, fontWeight: 500 }}>
          {loading ? "Loading enrollment…"
            : enrollment
              ? `${enrollment.className} · ${enrollment.admissionNumber} · ${enrollment.academicYearName}`
              : "No active enrollment"}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   MAIN
═══════════════════════════════ */
export default function Marks() {
  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const [examGroups, setExamGroups] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [errorGroups, setErrorGroups] = useState(null);
  const [errorReport, setErrorReport] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [notPublished, setNotPublished] = useState(false);

  // ── Revaluation modal state ──
  const [revalSubject, setRevalSubject] = useState(null);  // the subject row clicked
  const [studentId,   setStudentId]   = useState(null);
  const [successMsg,  setSuccessMsg]  = useState(null);

  useEffect(() => {
    (async () => {
      setLoadingGroups(true); setErrorGroups(null);
      try {
        const data = await apiFetch("/marks/exam-groups");
        const groups = data.examGroups ?? [];
        setExamGroups(groups);
        setEnrollment(data.enrollment ?? null);
        setStudentId(data.studentId ?? null);

        if (groups.length > 0) {
          const publishedGroups = groups.filter((g) => g.isPublished);
          const defaultGroup =
            publishedGroups.length > 0
              ? publishedGroups[publishedGroups.length - 1]
              : groups[groups.length - 1];
          setSelectedId(defaultGroup.id);
        }
      } catch (e) { setErrorGroups(e.message); }
      finally { setLoadingGroups(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      setLoadingReport(true); setErrorReport(null);
      setReportData(null); setNotPublished(false);
      try {
        const data = await apiFetch(`/marks/report/${selectedId}`);
        setReportData(data);
      } catch (e) {
        if (e.message?.toLowerCase().includes("not") && e.message?.toLowerCase().includes("publish"))
          setNotPublished(true);
        else setErrorReport(e.message);
      } finally { setLoadingReport(false); }
    })();
  }, [selectedId]);

  const selectedGroup = examGroups.find((g) => g.id === selectedId);
  const showReport = !loadingReport && !!reportData;

  const handleDownload = useCallback(() => {
    if (!reportData) return;
    setPdfLoading(true);
    const enriched = {
      ...reportData,
      enrollment: { ...reportData.enrollment, schoolName: enrollment?.schoolName ?? "School" },
    };
    try { downloadReportPDF(enriched); }
    finally { setTimeout(() => setPdfLoading(false), 600); }
  }, [reportData, enrollment]);

  // ── Open revaluation modal ──
  const applyRevaluation = useCallback((subject) => {
    setSuccessMsg(null);
    setRevalSubject(subject);
  }, []);

  const publishedGroups   = examGroups.filter((g) => g.isPublished);
  const unpublishedGroups = examGroups.filter((g) => !g.isPublished);

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* ── Revaluation Modal ── */}
      {revalSubject && (
        <RevaluationModal
          subject={revalSubject}
          studentId={studentId}
          onClose={() => setRevalSubject(null)}
          onSuccess={() => setSuccessMsg(`Revaluation request submitted for ${revalSubject.subjectName}.`)}
        />
      )}

      <div className="mrk-page">

        {/* ─── SUCCESS TOAST ─── */}
        {successMsg && (
          <div style={{
            background: "rgba(5,150,105,0.10)", border: "1.5px solid rgba(5,150,105,0.28)",
            borderRadius: 13, padding: "11px 16px", marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            animation: "fadeUp 0.3s ease",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#065f46", fontWeight: 600, fontFamily: FONT.sans }}>
              ✓ {successMsg}
            </p>
            <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#059669" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ─── HEADER ROW ─── */}
        <div className="anim-1" style={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
          marginBottom: isMobile ? 14 : 20,
        }}>
          <PageHeader loading={loadingGroups} enrollment={enrollment} isMobile={isMobile} />

          {/* Controls */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}>
            {!loadingGroups && examGroups.length > 0 && (
              <div style={{ position: "relative", flex: isMobile ? "1" : "unset" }}>
                <select
                  className="mrk-select"
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  {publishedGroups.length > 0 && (
                    <optgroup label="Results Available">
                      {publishedGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.term ? `${g.term.name}: ` : ""}{g.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {unpublishedGroups.length > 0 && (
                    <optgroup label="Not Yet Published">
                      {unpublishedGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.term ? `${g.term.name}: ` : ""}{g.name} (Pending)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown size={13} color={C.textLight} style={{
                  position: "absolute", right: 11, top: "50%",
                  transform: "translateY(-50%)", pointerEvents: "none",
                }} />
              </div>
            )}

            {showReport && (
              <button
                className="mrk-dl-btn"
                onClick={handleDownload}
                disabled={pdfLoading}
                style={{ flex: isMobile ? "1" : "unset" }}
              >
                {pdfLoading
                  ? <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />
                  : <Download size={13} />}
                {pdfLoading ? "Preparing…" : "Download PDF"}
              </button>
            )}
          </div>
        </div>

        {/* ─── ERRORS ─── */}
        <ErrorBanner message={errorGroups} />
        <ErrorBanner message={errorReport} />

        {/* ─── NO EXAMS ─── */}
        {!loadingGroups && examGroups.length === 0 && !errorGroups && (
          <div className="mrk-card" style={{
            padding: isMobile ? "40px 20px" : "56px 24px",
            textAlign: "center",
          }}>
            <FileText size={44} color="rgba(136,189,242,0.35)" style={{ margin: "0 auto 14px", display: "block" }} />
            <p style={{ color: C.dark, fontWeight: 700, fontSize: 16, margin: "0 0 6px", fontFamily: FONT.sans }}>
              No Exams Available
            </p>
            <p style={{ color: C.mid, fontSize: 13, margin: 0 }}>
              No published exam results for your current enrollment.
            </p>
          </div>
        )}

        {/* ─── NOT PUBLISHED ─── */}
        {!loadingReport && notPublished && <NotPublished isMobile={isMobile} />}

        {/* ─── MAIN REPORT ─── */}
        {(loadingReport || showReport) && (
          <div style={{ animation: showReport ? "fadeUp 0.4s ease" : "none" }}>

            <SummaryCards
              summary={reportData?.summary}
              loading={loadingReport}
              isMobile={isMobile}
              isTablet={isTablet}
            />

            {/* Table + Insights side by side on desktop */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 284px",
              gap: isMobile ? 12 : 18,
              alignItems: "start",
            }}>
              <SubjectTable
                subjects={reportData?.subjectResults}
                summary={reportData?.summary}
                loading={loadingReport}
                isLocked={selectedGroup?.isLocked}
                isMobile={isMobile}
                onApplyRevaluation={applyRevaluation}
              />
              <PerformanceInsights
                subjects={reportData?.subjectResults}
                summary={reportData?.summary}
                loading={loadingReport}
                isMobile={isMobile}
              />
            </div>

            {/* ─── Footer download bar ─── */}
            {showReport && (
              <div className="mrk-card" style={{
                marginTop: isMobile ? 12 : 18,
                padding: isMobile ? "14px 16px" : "16px 22px",
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                justifyContent: "space-between",
                flexDirection: isMobile ? "column" : "row",
                gap: 12,
                animation: "fadeUp 0.5s ease",
              }}>
                <div>
                  <p style={{
                    margin: 0, fontWeight: 700, color: C.dark,
                    fontSize: isMobile ? 13 : 14, fontFamily: FONT.sans,
                  }}>
                    {reportData?.exam?.name}
                    {reportData?.exam?.term ? ` — ${reportData.exam.term.name}` : ""}
                  </p>
                  <p style={{ margin: "3px 0 0", color: C.textLight, fontSize: 11, fontWeight: 500 }}>
                    {reportData?.enrollment?.className}
                    {reportData?.student?.rollNumber ? ` · Roll No: ${reportData.student.rollNumber}` : ""}
                    {reportData?.enrollment?.academicYear ? ` · ${reportData.enrollment.academicYear}` : ""}
                  </p>
                </div>
                <button
                  className="mrk-dl-btn"
                  onClick={handleDownload}
                  disabled={pdfLoading}
                  style={{
                    padding: "10px 22px", fontSize: 13,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  {pdfLoading
                    ? <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />
                    : <Download size={14} />}
                  {pdfLoading ? "Preparing PDF…" : "Print / Download Report Card"}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}