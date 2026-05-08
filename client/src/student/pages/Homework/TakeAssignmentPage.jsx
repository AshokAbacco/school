// client/src/student/pages/Homework/TakeAssignmentPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, X, Loader2, AlertCircle, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

// ── Debounce helper ──────────────────────────────────────────────
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// ── Timer display ────────────────────────────────────────────────
function TimerBar({ secondsLeft, totalSeconds }) {
  if (secondsLeft === null) return null;

  const pct     = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));
  const mins    = Math.floor(Math.abs(secondsLeft) / 60);
  const secs    = Math.abs(secondsLeft) % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const urgent  = secondsLeft <= 60;
  const warning = secondsLeft <= 300;

  const barColor = urgent  ? "#dc2626"
                 : warning ? "#d97706"
                 :            C.slate;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: urgent ? "#fef2f2" : warning ? "#fffbeb" : C.white,
      border: `1.5px solid ${urgent ? "#fca5a5" : warning ? "#fde68a" : C.border}`,
      borderRadius: 14, padding: "10px 16px", marginBottom: 16,
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: urgent ? "0 0 0 3px rgba(220,38,38,0.15)" : "0 2px 8px rgba(56,73,89,0.08)",
      transition: "all 0.3s",
    }}>
      <Clock size={16} color={barColor} />
      <span style={{
        fontSize: 18, fontWeight: 800, color: barColor,
        fontFamily: "'Inter', monospace", letterSpacing: "0.05em",
        animation: urgent ? "pulse 1s ease-in-out infinite" : "none",
      }}>
        {display}
      </span>
      {urgent && (
        <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>
          ⚠ Submitting soon!
        </span>
      )}
      <div style={{ flex: 1, height: 6, background: C.borderLight, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: barColor, borderRadius: 99,
          transition: "width 1s linear, background 0.3s",
        }} />
      </div>
    </div>
  );
}

// ── Saving indicator ─────────────────────────────────────────────
function SavingIndicator({ saving, lastSaved }) {
  if (saving) return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textLight }}>
      <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Saving…
    </div>
  );
  if (lastSaved) return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#16a34a" }}>
      <CheckCircle2 size={11} /> Saved
    </div>
  );
  return null;
}

// ═══════════════════════════════════════════════════════════════
export default function TakeAssignmentPage() {
  const navigate       = useNavigate();
  const { id: assignmentId } = useParams();

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [answers,     setAnswers]     = useState({});   // local state mirror
  const [submitting,  setSubmitting]  = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [lastSaved,   setLastSaved]   = useState(false);

  // Timer
  const [timeLeft,    setTimeLeft]    = useState(null);  // seconds
  const totalSecsRef  = useRef(null);
  const timerRef      = useRef(null);

  // Refs for beacon / visibility
  const autoSubmitted   = useRef(false);
  const dataRef         = useRef(null);
  const answersRef      = useRef({});
  const timeLeftRef     = useRef(null);
  const assignmentIdRef = useRef(assignmentId);

  // ── Fetch assignment + start session ───────────────────────────
  useEffect(() => { init(); }, [assignmentId]);

  async function init() {
    try {
      setLoading(true);
      // 1. Fetch assignment questions
      const res = await fetch(`${API_URL}/api/assignments/${assignmentId}/student`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();

      assignmentIdRef.current = assignmentId;

      const enriched = d.data?.questionsWithAnswers
        ? { ...d.data, assignment: { ...d.data.assignment, questions: d.data.questionsWithAnswers } }
        : d.data;

      // Already submitted?
      if (d.data?.submission) {
        dataRef.current = enriched;
        setData(enriched);
        setResult(d.data.submission);
        setLoading(false);
        return;
      }

      dataRef.current = enriched;
      setData(enriched);

      // 2. Start session — get draft + timeLeft from server
      const startRes = await fetch(`${API_URL}/api/assignments/${assignmentId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const startData = await startRes.json();

      if (startRes.status === 409) {
        // Already submitted — reload result
        setResult(startData.data);
        setLoading(false);
        return;
      }

      if (startData.autoSubmitted) {
        // Time expired while they were away — show result
        setResult(startData.data);
        setLoading(false);
        return;
      }

      if (startData.draft) {
        const restored = startData.draft.answers || {};
        setAnswers(restored);
        answersRef.current = restored;

        const secs = startData.draft.timeLeft;
        if (secs !== null) {
          setTimeLeft(secs);
          timeLeftRef.current = secs;
          if (totalSecsRef.current === null) {
            totalSecsRef.current = (enriched?.assignment?.timeLimitMinutes || 0) * 60;
          }
        }
      }

      // Set total seconds from assignment
      if (enriched?.assignment?.timeLimitMinutes) {
        totalSecsRef.current = enriched.assignment.timeLimitMinutes * 60;
      }

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Countdown timer ────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || result) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        timeLeftRef.current = next;
        if (next <= 0) {
          clearInterval(timerRef.current);
          // Call via ref so we always get the latest version (not a stale closure)
          handleAutoSubmitRef.current?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft !== null, !!result]);

  // ── Save single answer to DB (debounced 600ms) ─────────────────
  const persistAnswer = useCallback(async (qId, patch) => {
    try {
      setSaving(true);
      await fetch(`${API_URL}/api/assignments/${assignmentId}/draft`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionId: qId, ...patch }),
      });
      setLastSaved(true);
      setTimeout(() => setLastSaved(false), 2000);
    } catch (e) {
      // silent — local state still holds the answer
    } finally {
      setSaving(false);
    }
  }, [assignmentId]);

  const debouncedPersist = useDebounce(persistAnswer, 600);

  function setAnswer(qId, patch) {
    setAnswers((prev) => {
      const updated = { ...prev, [qId]: { ...(prev[qId] || {}), ...patch } };
      answersRef.current = updated;
      return updated;
    });
    // MCQ: persist immediately; written text: debounce
    if (patch.selectedIndex !== undefined) {
      persistAnswer(qId, patch);
    } else {
      debouncedPersist(qId, patch);
    }
  }

  // ── Beacon submit (page close) ────────────────────────────────
  const submitUsingBeacon = useCallback(() => {
    if (autoSubmitted.current) return;
    autoSubmitted.current = true;
    try {
      const fd = new FormData();
      fd.append("responses", JSON.stringify(buildResponses()));
      navigator.sendBeacon(`${API_URL}/api/assignments/${assignmentIdRef.current}/submit`, fd);
    } catch (e) { /* silent */ }
  }, []);

  // ── Auto submit when timer hits zero ──────────────────────────
  // Uses a ref so the interval callback always gets the LATEST version,
  // not a stale closure from mount time when data was still null.
  const handleAutoSubmitRef = useRef(null);
  handleAutoSubmitRef.current = async () => {
    if (autoSubmitted.current) return;
    autoSubmitted.current = true;

    const assignment = dataRef.current?.assignment;
    if (!assignment) return;

    try {
      setSubmitting(true);
      setError("");

      const fd = new FormData();
      fd.append("responses", JSON.stringify(buildResponses()));

      const res = await fetch(`${API_URL}/api/assignments/${assignmentIdRef.current}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const d = await res.json();

      if (d.data?.questionsWithAnswers) {
        setData((prev) => ({
          ...prev,
          assignment: { ...prev.assignment, questions: d.data.questionsWithAnswers },
        }));
      }
      setResult(d.data);
    } catch (e) {
      // If submit fails, server will auto-submit on next page load via draft
      console.error("[autoSubmit]", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  function buildResponses() {
    const qs = dataRef.current?.assignment?.questions || [];
    return qs.map((q) => ({
      questionId:    q.id,
      selectedIndex: answersRef.current[q.id]?.selectedIndex ?? null,
      answerText:    answersRef.current[q.id]?.answerText || "",
    }));
  }

  // ── Page-leave / refresh guards ────────────────────────────────
  // NOTE: visibilitychange (tab switch) should NOT submit — student may be checking notes.
  // Only beacon on actual page close (pagehide). Save draft silently on tab hide instead.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !result) {
        // Tab hidden: just trigger a draft save for current answers, don't submit
        const qs = dataRef.current?.assignment?.questions || [];
        for (const q of qs) {
          const ans = answersRef.current[q.id];
          if (!ans) continue;
          const patch = {};
          if (ans.selectedIndex !== undefined) patch.selectedIndex = ans.selectedIndex;
          if (ans.answerText)                  patch.answerText    = ans.answerText;
          if (Object.keys(patch).length === 0) continue;
          fetch(`${API_URL}/api/assignments/${assignmentIdRef.current}/draft`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${getToken()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ questionId: q.id, ...patch }),
          }).catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [result]);

  useEffect(() => {
    const onPageHide = () => submitUsingBeacon();
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  // Block browser refresh with dialog
  useEffect(() => {
    if (result) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Your answers are being saved. Are you sure you want to leave?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [result]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onBack = () => {
      if (result) { navigate("/student/homework"); return; }
      submitUsingBeacon();
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [result]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
        e.preventDefault();
        // Don't submit — answers are already saved in DB
        // Just show a toast warning
        setError("⚠ Refresh is disabled. Your answers are auto-saved.");
        setTimeout(() => setError(""), 3000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Manual / auto submit ───────────────────────────────────────
  async function handleSubmit(isAuto = false) {
    if (!data?.assignment) return;
    const qs = data.assignment.questions;

    // Use answersRef (always current) not the stale `answers` state in closure
    const currentAnswers = answersRef.current;

    if (!isAuto) {
      for (const q of qs) {
        if (q.type === "MCQ" && currentAnswers[q.id]?.selectedIndex === undefined) {
          return setError(`Please answer Question ${(qs.indexOf(q)) + 1} before submitting`);
        }
      }
    }

    try {
      setSubmitting(true);
      setError("");
      clearInterval(timerRef.current);

      const fd = new FormData();
      const responsePayload = qs.map((q) => ({
        questionId:    q.id,
        selectedIndex: currentAnswers[q.id]?.selectedIndex ?? null,
        answerText:    currentAnswers[q.id]?.answerText || null,
      }));
      fd.append("responses", JSON.stringify(responsePayload));

      for (const q of qs) {
        if (q.type === "WRITTEN" && currentAnswers[q.id]?.file) {
          fd.append(q.id, currentAnswers[q.id].file);
        }
      }

      const res = await fetch(`${API_URL}/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed");

      if (d.data?.questionsWithAnswers) {
        setData((prev) => ({
          ...prev,
          assignment: { ...prev.assignment, questions: d.data.questionsWithAnswers },
        }));
      }

      setResult(d.data);
    } catch (e) {
      setError(e.message);
      autoSubmitted.current = false; // allow retry
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ height: 80, borderRadius: 14, background: `${C.mist}55`, animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (error && !data) return (
    <div style={{ padding: 24, color: "#c0392b", fontSize: 13 }}>{error}</div>
  );

  if (result) {
    const isMCQOnly = data?.assignment?.questions?.every((q) => q.type === "MCQ");
    return (
      <ResultScreen
        result={result}
        questions={data?.assignment?.questions || []}
        isMCQOnly={isMCQOnly}
      />
    );
  }

  const { assignment } = data || {};
  if (!assignment) return null;

  const hasTimeLimit = !!assignment.timeLimitMinutes;
  const totalQs     = assignment.questions.length;
  const answeredQs  = assignment.questions.filter((q) => {
    if (q.type === "MCQ")     return answers[q.id]?.selectedIndex !== undefined;
    if (q.type === "WRITTEN") return !!(answers[q.id]?.answerText?.trim() || answers[q.id]?.file);
    return false;
  }).length;
  const progressPct = totalQs > 0 ? Math.round((answeredQs / totalQs) * 100) : 0;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        width: "100%", minHeight: "100vh", background: "#f4f7fb",
        padding: window.innerWidth < 768 ? "10px" : "24px",
      }}>

        {/* ── Assignment header ── */}
        <div style={{
          marginBottom: 16, padding: "18px 20px", borderRadius: 16,
          background: C.white, border: `1.5px solid ${C.borderLight}`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: C.text }}>
                {assignment.title}
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: C.textLight }}>
                {assignment.subject?.name} · Due: {new Date(assignment.dueDate).toLocaleDateString()}
              </p>
              {assignment.description && (
                <p style={{ margin: "10px 0 0", fontSize: 13, color: C.textLight, lineHeight: 1.6 }}>
                  {assignment.description}
                </p>
              )}
            </div>
            <SavingIndicator saving={saving} lastSaved={lastSaved} />
          </div>

          {/* Time limit notice */}
          {hasTimeLimit && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 10,
              background: "#fffbeb", border: "1px solid #fde68a",
              display: "flex", alignItems: "center", gap: 8, fontSize: 12,
            }}>
              <Clock size={13} color="#d97706" />
              <span style={{ color: "#92400e", fontWeight: 600 }}>
                Timed assignment: {assignment.timeLimitMinutes} minutes · Your progress is auto-saved
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textLight }}>
                Progress
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: answeredQs === totalQs ? "#16a34a" : C.deep }}>
                {answeredQs} / {totalQs} answered
              </span>
            </div>
            <div style={{ height: 6, background: C.borderLight, borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${progressPct}%`,
                background: answeredQs === totalQs
                  ? "#16a34a"
                  : `linear-gradient(90deg, ${C.slate}, ${C.deep})`,
                borderRadius: 99,
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        </div>

        {/* ── Countdown timer bar ── */}
        <TimerBar secondsLeft={timeLeft} totalSeconds={totalSecsRef.current} />

        {/* ── Error toast ── */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, background: "#fee8e8",
            border: "1px solid #f5b0b0", marginBottom: 16, fontSize: 12,
            color: "#8b1c1c", display: "flex", gap: 8, alignItems: "center",
          }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        {/* ── Questions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {assignment.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              answer={answers[q.id] || {}}
              onAnswer={(patch) => setAnswer(q.id, patch)}
            />
          ))}
        </div>

        {/* ── Submit button ── */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          style={{
            marginTop: 24, width: "100%", padding: "14px", borderRadius: 14,
            border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 800,
            cursor: submitting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
            : "Submit Assignment"}
        </button>

        <p style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.textLight }}>
          🔒 Answers are automatically saved as you go. Refresh is disabled.
        </p>
      </div>
    </>
  );
}

// ── Question Card ──────────────────────────────────────────────────
function QuestionCard({ q, index, answer, onAnswer }) {
  const fileRef = useRef();

  return (
    <div style={{
      padding: 18, borderRadius: 16,
      border: `1.5px solid ${q.type === "MCQ" ? C.borderLight : "#e9d5ff"}`,
      background: q.type === "MCQ" ? C.white : "#faf5ff",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          padding: "3px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: q.type === "MCQ" ? `${C.mist}66` : "#ede9fe",
          color: q.type === "MCQ" ? C.deep : "#7c3aed",
        }}>
          Q{index + 1} · {q.type === "MCQ" ? "Multiple Choice" : "Written"} · {q.marks} mark{q.marks !== 1 ? "s" : ""}
        </span>

        {/* Answered indicator */}
        {answer.selectedIndex !== undefined && (
          <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
            <CheckCircle2 size={11} /> Answered
          </span>
        )}
      </div>

      <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>
        {q.questionText}
      </p>

      {q.type === "MCQ" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((opt, oIdx) => {
            const selected = answer.selectedIndex === oIdx;
            return (
              <button
                key={oIdx}
                onClick={() => onAnswer({ selectedIndex: oIdx })}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 12, textAlign: "left",
                  border: `2px solid ${selected ? C.deep : C.border}`,
                  background: selected ? `${C.mist}55` : "#fff",
                  cursor: "pointer", width: "100%", transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                  border: `2px solid ${selected ? C.deep : C.border}`,
                  background: selected ? C.deep : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {selected && <div style={{ width: 8, height: 8, borderRadius: 99, background: "#fff" }} />}
                </div>
                <span style={{ fontSize: 13, color: C.text, fontWeight: selected ? 700 : 500 }}>
                  {String.fromCharCode(65 + oIdx)}. {opt}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <textarea
            placeholder="Type your answer here (optional if uploading a file)…"
            value={answer.answerText || ""}
            onChange={(e) => onAnswer({ answerText: e.target.value })}
            rows={4}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontFamily: "'Inter', sans-serif",
              fontSize: 13, color: C.text, background: "#fff",
              resize: "vertical", outline: "none", marginBottom: 10,
            }}
          />
          {answer.file ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
              borderRadius: 10, background: "#e8f0fd", border: "1px solid #b3ccf5",
            }}>
              <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {answer.file.name}
              </span>
              <button onClick={() => onAnswer({ file: null })} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={12} color="#c0392b" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10,
                border: `1.5px dashed ${C.border}`, background: "transparent",
                color: C.textLight, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Upload size={13} /> Upload written answer (image/PDF)
            </button>
          )}
          <input
            ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
            onChange={(e) => onAnswer({ file: e.target.files[0] })}
          />
        </div>
      )}
    </div>
  );
}

// ── Result Screen ──────────────────────────────────────────────────
function ResultScreen({ result, questions, isMCQOnly }) {
  const navigate = useNavigate();
  const pct = result.percentage;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px 32px", fontFamily: "'Inter', sans-serif", textAlign: "center" }}>
      <style>{`@keyframes popIn{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

      {/* ── Back button at top ── */}
      <div style={{ textAlign: "left", marginBottom: 16 }}>
        <button
          onClick={() => navigate("/student/homework")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10,
            border: `1.5px solid ${C.border}`, background: C.white,
            color: C.slate, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
          }}
        >
          ← Back to Homework
        </button>
      </div>

      <div style={{
        padding: 32, borderRadius: 24, background: C.white,
        border: `1.5px solid ${C.borderLight}`, boxShadow: "0 8px 32px rgba(56,73,89,0.10)",
        animation: "popIn 0.4s cubic-bezier(.34,1.56,.64,1) forwards",
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>
          {pct >= 80 ? "🏆" : pct >= 50 ? "✅" : "📝"}
        </div>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: C.text }}>
          {isMCQOnly ? "Results" : "Submitted!"}
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: C.textLight }}>
          {isMCQOnly
            ? "Your answers have been automatically graded."
            : "Your teacher will review written answers soon."}
        </p>

        {pct !== null && (
          <div style={{
            width: 120, height: 120, borderRadius: 99,
            background: `conic-gradient(${pct >= 50 ? "#16a34a" : "#c0392b"} ${pct * 3.6}deg, ${C.bg} 0deg)`,
            margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 90, height: 90, borderRadius: 99, background: "#fff",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{pct?.toFixed(0)}%</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: pct >= 50 ? "#16a34a" : "#c0392b" }}>
                {result.grade}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {result.mcqScore !== null && (
            <InfoBox label="MCQ Score" value={`${result.mcqScore} / ${result.mcqMaxScore}`} />
          )}
          {result.writtenScore !== null && result.writtenMaxScore > 0 && (
            <InfoBox label="Written Score" value={`${result.writtenScore ?? "?"} / ${result.writtenMaxScore}`} />
          )}
          {result.totalScore !== null && (
            <InfoBox label="Total Score" value={`${result.totalScore} / ${result.totalMaxScore}`} />
          )}
          {result.isLate && <InfoBox label="Submitted" value="⏰ Late" />}
        </div>

        {isMCQOnly && result.responses?.length > 0 && (
          <div style={{ textAlign: "left", marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Answer Breakdown</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.responses.map((r) => {
                const fullQ          = questions.find((q) => q.id === r.questionId);
                const marks          = fullQ?.marks ?? "?";
                const questionText   = fullQ?.questionText || "Question";
                const selectedAnswer = r.selectedIndex !== null
                  ? fullQ?.options?.[r.selectedIndex] || `Option ${r.selectedIndex + 1}`
                  : "—";
                const correctAnswer = fullQ?.options?.[fullQ?.correctIndex] || "—";

                return (
                  <div key={r.id} style={{
                    padding: "10px 14px", borderRadius: 10,
                    background: r.isCorrect ? "#f0fdf4" : "#fff5f5",
                    border: `1.5px solid ${r.isCorrect ? "#86efac" : "#f5b0b0"}`,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 16 }}>{r.isCorrect ? "✅" : "❌"}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{questionText}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight }}>
                        Your answer: <strong>{selectedAnswer}</strong>
                        {!r.isCorrect && (
                          <> · Correct: <strong style={{ color: "#16a34a" }}>{correctAnswer}</strong></>
                        )}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.isCorrect ? "#16a34a" : "#c0392b" }}>
                      {r.isCorrect ? `+${marks}` : "0"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result.teacherFeedback && (
          <div style={{
            marginTop: 16, padding: "12px 16px", borderRadius: 12,
            background: `${C.mist}33`, border: `1.5px solid ${C.border}`, textAlign: "left",
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase" }}>
              Teacher Feedback
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.text }}>{result.teacherFeedback}</p>
          </div>
        )}

        <button
          onClick={() => navigate("/student/homework")}
          style={{
            marginTop: 20, padding: "12px 24px", borderRadius: 12,
            border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          Back to Homework
        </button>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}` }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800, color: C.text }}>{value}</p>
    </div>
  );
}