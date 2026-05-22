// client/src/parent/pages/Marksresults/Marks.jsx
// Stormy Morning palette · Inter font · fully responsive
// Parent portal: shows marks for a selected child.

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, AlertCircle, FileText,
  EyeOff, Loader2, Download, X, Send,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

import { C, FONT, GLOBAL_CSS } from "./tokens.js";

import SummaryCards from "../../../student/pages/marks/components/SummaryCards.jsx";
import SubjectTable from "../../../student/pages/marks/components/SubjectTable.jsx";
import PerformanceInsights from "../../../student/pages/marks/components/PerformanceInsights.jsx";
import ExamTabs from "../../../student/pages/marks/components/ExamTabs.jsx";
import { downloadReportPDF } from "../../../student/pages/marks/utils/downloadPDF.js";

import ChildSelector from "./components/ChildSelector.jsx";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

// ── Typed fetch helper that validates JSON and checks success flag ──
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
  const [error, setError]   = useState(null);

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
      background: "rgba(36,51,64,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "fadeUp 0.2s ease",
    }}>
      <div className="mrk-card" style={{ width: "100%", maxWidth: 420, padding: 0, overflow: "hidden" }}>
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
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.mid }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Obtained", value: subject.marksObtained ?? "—" },
              { label: "Max",      value: subject.maxMarks ?? "—" },
              { label: "Pass",     value: subject.passingMarks ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                flex: 1, textAlign: "center",
                background: C.bg, border: `1.5px solid rgba(136,189,242,0.22)`,
                borderRadius: 10, padding: "8px 6px",
              }}>
                <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.dark, fontFamily: FONT.sans }}>{value}</div>
              </div>
            ))}
          </div>

          <label style={{ fontSize: 11, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
            Reason for Revaluation
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="Explain why you believe your child's marks should be reviewed…"
            style={{
              width: "100%", boxSizing: "border-box",
              border: `1.5px solid ${error ? C.red : C.borderLight}`,
              borderRadius: 11, padding: "10px 13px",
              fontSize: 13, fontFamily: FONT.sans,
              color: C.text, background: C.white,
              outline: "none", resize: "vertical", lineHeight: 1.6,
            }}
          />
          {error && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: C.red, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <AlertCircle size={11} /> {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "10px", borderRadius: 10,
              border: `1.5px solid ${C.borderLight}`, background: C.white,
              color: C.mid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.sans,
            }}>Cancel</button>
            <button onClick={submit} disabled={loading} style={{
              flex: 1, padding: "10px", borderRadius: 10,
              border: "none", background: loading ? C.mid : C.dark,
              color: C.white, fontSize: 13, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT.sans,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}>
              {loading ? <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} /> : <Send size={13} />}
              {loading ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
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

function NotPublished({ isMobile }) {
  return (
    <div className="mrk-card" style={{ padding: isMobile ? "40px 20px" : "60px 32px", textAlign: "center" }}>
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
      <p style={{ fontSize: 13, color: C.mid, maxWidth: 360, margin: "0 auto", lineHeight: 1.65, fontWeight: 500 }}>
        Marks have not been released for this exam. Check back once the teacher publishes the results.
      </p>
    </div>
  );
}

function PageHeader({ isMobile, childName }) {
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
          fontWeight: 800, color: C.dark, letterSpacing: "-0.5px", fontFamily: FONT.sans,
        }}>
          Marks &amp; Report Card
        </h1>
        {childName && (
          <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight, fontWeight: 500 }}>
            Viewing results for {childName}
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   MAIN — ParentMarks
═══════════════════════════════ */
export default function ParentMarks() {
  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  // ── Child selection ──
  const [children,    setChildren]    = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);

  // ── Exam groups ──
  const [examGroups,      setExamGroups]      = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // ── Report ──
  const [reportData,    setReportData]    = useState(null);
  const [notPublished,  setNotPublished]  = useState(false);

  // ── Loading / error ──
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingGroups,   setLoadingGroups]   = useState(false);
  const [loadingReport,   setLoadingReport]   = useState(false);
  const [errorChildren,   setErrorChildren]   = useState(null);
  const [errorGroups,     setErrorGroups]     = useState(null);
  const [errorReport,     setErrorReport]     = useState(null);

  // ── Revaluation modal ──
  const [revalSubject, setRevalSubject] = useState(null);
  const [successMsg,   setSuccessMsg]   = useState(null);

  // ─── 1. Load parent's children ───────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingChildren(true); setErrorChildren(null);
      try {
        // GET /parent/children  → { success, data: [{ studentId, name, className, profileImage }] }
        const data = await apiFetch("/parent/children");
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
        if (list.length > 0) setSelectedChildId(list[0].studentId);
      } catch (e) { setErrorChildren(e.message); }
      finally { setLoadingChildren(false); }
    })();
  }, []);

  // ─── 2. Load exam groups for selected child ──────────────────
  useEffect(() => {
    if (!selectedChildId) return;
    setExamGroups([]); setSelectedGroupId(null);
    setReportData(null); setNotPublished(false);
    setErrorGroups(null);

    (async () => {
      setLoadingGroups(true);
      try {
        // GET /parent/marks/exam-groups?studentId=xxx
        const data = await apiFetch(`/parent/marks/exam-groups?studentId=${selectedChildId}`);
        const groups = data.examGroups ?? [];
        setExamGroups(groups);

        if (groups.length > 0) {
          const published = groups.filter((g) => g.isPublished);
          const def = published.length > 0
            ? published[published.length - 1]
            : groups[groups.length - 1];
          setSelectedGroupId(def.id);
        }
      } catch (e) { setErrorGroups(e.message); }
      finally { setLoadingGroups(false); }
    })();
  }, [selectedChildId]);

  // ─── 3. Load report for selected group ──────────────────────
  useEffect(() => {
    if (!selectedGroupId || !selectedChildId) return;
    setReportData(null); setNotPublished(false); setErrorReport(null);

    (async () => {
      setLoadingReport(true);
      try {
        // GET /parent/marks/report/:groupId?studentId=xxx
        const data = await apiFetch(`/parent/marks/report/${selectedGroupId}?studentId=${selectedChildId}`);
        setReportData(data);
      } catch (e) {
        if (e.message?.toLowerCase().includes("not") && e.message?.toLowerCase().includes("publish"))
          setNotPublished(true);
        else setErrorReport(e.message);
      } finally { setLoadingReport(false); }
    })();
  }, [selectedGroupId, selectedChildId]);

  const selectedChild = children.find((c) => c.studentId === selectedChildId);
  const selectedGroup = examGroups.find((g) => g.id === selectedGroupId);
  const showReport    = !loadingReport && !!reportData;

  const publishedGroups   = examGroups.filter((g) => g.isPublished);
  const unpublishedGroups = examGroups.filter((g) => !g.isPublished);

  const applyRevaluation = useCallback((subject) => {
    setSuccessMsg(null);
    setRevalSubject(subject);
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {revalSubject && (
        <RevaluationModal
          subject={revalSubject}
          studentId={selectedChildId}
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
          <PageHeader isMobile={isMobile} childName={selectedChild?.name} />

          {/* Exam group selector */}
          {!loadingGroups && examGroups.length > 0 && (
            <div style={{ position: "relative" }}>
              <select
                className="mrk-select"
                value={selectedGroupId ?? ""}
                onChange={(e) => setSelectedGroupId(e.target.value)}
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
        </div>

        {/* ─── CHILD SELECTOR ─── */}
        {!loadingChildren && (
          <ChildSelector
            children={children}
            selectedId={selectedChildId}
            onChange={(id) => setSelectedChildId(id)}
          />
        )}

        {/* ─── ERRORS ─── */}
        <ErrorBanner message={errorChildren} />
        <ErrorBanner message={errorGroups} />
        <ErrorBanner message={errorReport} />

        {/* ─── NO EXAMS ─── */}
        {!loadingGroups && examGroups.length === 0 && !errorGroups && selectedChildId && (
          <div className="mrk-card" style={{ padding: isMobile ? "40px 20px" : "56px 24px", textAlign: "center" }}>
            <FileText size={44} color="rgba(136,189,242,0.35)" style={{ margin: "0 auto 14px", display: "block" }} />
            <p style={{ color: C.dark, fontWeight: 700, fontSize: 16, margin: "0 0 6px", fontFamily: FONT.sans }}>
              No Exams Available
            </p>
            <p style={{ color: C.mid, fontSize: 13, margin: 0 }}>
              No published exam results for this child.
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
          </div>
        )}

      </div>
    </>
  );
}