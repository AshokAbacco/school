//client\src\teacher\pages\assignments\SubmissionsViewPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../../../auth/storage";
import {
  ArrowLeft, FileText, Eye, CheckCircle2,
  Clock, Loader2, AlertCircle, User
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

export default function SubmissionsViewPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [grading, setGrading]         = useState({});    // submissionId → { score, feedback }
  const [saving, setSaving]           = useState(null);  // submissionId being saved

  useEffect(() => { fetchSubmissions(); }, [assignmentId]);

  async function fetchSubmissions() {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/assignments/${assignmentId}/submissions`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      setSubmissions(d.data || []);

      // Pre-fill grading state with existing scores
      const init = {};
      for (const sub of d.data || []) {
        init[sub.id] = {
          score:    sub.writtenScore ?? "",
          feedback: sub.teacherFeedback ?? "",
        };
      }
      setGrading(init);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveGrade(submissionId) {
    try {
      setSaving(submissionId);
      const { score, feedback } = grading[submissionId] || {};
      const res = await fetch(
        `${API_URL}/api/assignments/${assignmentId}/submissions/${submissionId}/grade`,
        {
          method:  "PATCH",
          headers: {
            Authorization:  `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            writtenScore:    parseFloat(score) || 0,
            teacherFeedback: feedback || "",
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);

      // Update local state
      setSubmissions((prev) =>
        prev.map((s) => s.id === submissionId ? { ...s, ...d.data } : s)
      );
    } catch (e) {
      alert("Failed to save grade: " + e.message);
    } finally {
      setSaving(null);
    }
  }

  const statusColor = (status) => ({
    SUBMITTED: { bg: "#fef9c3", color: "#854d0e" },
    GRADED:    { bg: "#f0fdf4", color: "#166534" },
    RETURNED:  { bg: "#eff6ff", color: "#1e40af" },
  }[status] || { bg: C.bg, color: C.textLight });

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <Loader2 size={28} color={C.slate} style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: "100vh", fontFamily: "'Inter',sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: C.slate, fontSize: 13, fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Student Submissions</h1>
          <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{submissions.length} total submissions</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fee8e8", border: "1px solid #f5b0b0", marginBottom: 16, fontSize: 12, color: "#8b1c1c", display: "flex", gap: 8 }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {submissions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontSize: 14, color: C.textLight }}>No submissions yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {submissions.map((sub) => {
            const studentName = sub.student?.personalInfo
              ? `${sub.student.personalInfo.firstName} ${sub.student.personalInfo.lastName}`
              : sub.student?.name || "Student";

            const writtenResponses = sub.responses?.filter(
              (r) => r.question?.type === "WRITTEN"
            ) || [];

            const mcqResponses = sub.responses?.filter(
              (r) => r.question?.type === "MCQ"
            ) || [];

            const hasWritten = writtenResponses.length > 0;
            const sc = statusColor(sub.status);

            return (
              <div
                key={sub.id}
                style={{
                  background: C.white, borderRadius: 16,
                  border: `1.5px solid ${C.borderLight}`,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
                }}
              >
                {/* Student header row */}
                <div style={{
                  padding: "14px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderBottom: `1px solid ${C.borderLight}`,
                  background: C.bg,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 99,
                      background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                      {studentName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{studentName}</p>
                      <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>
                        Submitted: {new Date(sub.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        {sub.isLate && <span style={{ color: "#c0392b", marginLeft: 6, fontWeight: 700 }}>· LATE</span>}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Status badge */}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: sc.bg, color: sc.color }}>
                      {sub.status}
                    </span>
                    {/* Score summary */}
                    {sub.totalScore !== null && (
                      <span style={{ fontSize: 12, fontWeight: 800, color: C.deep }}>
                        {sub.totalScore}/{sub.totalMaxScore} · {sub.percentage?.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* MCQ summary */}
                  {mcqResponses.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        MCQ Answers ({sub.mcqScore ?? 0}/{sub.mcqMaxScore ?? 0} marks)
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {mcqResponses.map((r, idx) => (
                          <div key={r.id} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "8px 12px", borderRadius: 8,
                            background: r.isCorrect ? "#f0fdf4" : "#fff5f5",
                            border: `1px solid ${r.isCorrect ? "#86efac" : "#f5b0b0"}`,
                          }}>
                            <span style={{ fontSize: 13 }}>{r.isCorrect ? "✅" : "❌"}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text }}>
                                Q{idx + 1}: {r.question?.questionText || "Question"}
                              </p>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight }}>
                                Selected: <strong>
                                  {r.selectedIndex !== null
                                    ? r.question?.options?.[r.selectedIndex] || `Option ${r.selectedIndex + 1}`
                                    : "—"}
                                </strong>
                                {!r.isCorrect && r.question?.correctIndex !== undefined && (
                                  <> · Correct: <strong style={{ color: "#16a34a" }}>
                                    {r.question?.options?.[r.question.correctIndex] || "—"}
                                  </strong></>
                                )}
                              </p>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: r.isCorrect ? "#16a34a" : "#c0392b" }}>
                              {r.isCorrect ? `+${r.question?.marks ?? 1}` : "0"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Written answers */}
                  {hasWritten && (
                    <div>
                      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Written Answers
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {writtenResponses.map((r, idx) => (
                          <div key={r.id} style={{
                            padding: "12px 14px", borderRadius: 10,
                            border: `1.5px solid ${C.border}`,
                            background: "#fafbff",
                          }}>
                            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: C.text }}>
                              Q: {r.question?.questionText || `Written Question ${idx + 1}`}
                            </p>

                            {/* Text answer */}
                            {r.answerText && (
                              <div style={{
                                padding: "8px 12px", borderRadius: 8,
                                background: C.bg, border: `1px solid ${C.border}`,
                                marginBottom: 8,
                              }}>
                                <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.6 }}>
                                  {r.answerText}
                                </p>
                              </div>
                            )}

                            {/* Uploaded file */}
                            {r.signedUrl && (
                              <a
                                href={r.signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 6,
                                  padding: "7px 14px", borderRadius: 8,
                                  background: C.white, border: `1.5px solid ${C.border}`,
                                  color: C.deep, fontSize: 12, fontWeight: 600,
                                  textDecoration: "none", marginBottom: 8,
                                }}
                              >
                                <FileText size={13} color={C.slate} />
                                View Uploaded Answer
                                <Eye size={12} color={C.slate} />
                              </a>
                            )}

                            {!r.answerText && !r.signedUrl && (
                              <p style={{ margin: 0, fontSize: 11, color: C.textLight, fontStyle: "italic" }}>
                                No answer submitted for this question.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grading section — only show if has written questions */}
                  {hasWritten && (
                    <div style={{
                      padding: "14px 16px", borderRadius: 12,
                      background: "#f8f9ff",
                      border: `1.5px solid ${C.border}`,
                    }}>
                      <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: C.text }}>
                        Grade Written Answers
                        {sub.writtenMaxScore > 0 && (
                          <span style={{ color: C.textLight, fontWeight: 400, marginLeft: 6 }}>
                            (max {sub.writtenMaxScore} marks)
                          </span>
                        )}
                      </p>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, display: "block", marginBottom: 4 }}>
                            Written Score
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={sub.writtenMaxScore || 100}
                            value={grading[sub.id]?.score ?? ""}
                            onChange={(e) => setGrading((prev) => ({
                              ...prev,
                              [sub.id]: { ...prev[sub.id], score: e.target.value },
                            }))}
                            placeholder={`0 – ${sub.writtenMaxScore || "?"}`}
                            style={{
                              width: "120px", padding: "8px 12px", borderRadius: 8,
                              border: `1.5px solid ${C.border}`, fontSize: 13,
                              fontFamily: "'Inter',sans-serif", color: C.text,
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: C.textLight, display: "block", marginBottom: 4 }}>
                            Feedback (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={grading[sub.id]?.feedback ?? ""}
                            onChange={(e) => setGrading((prev) => ({
                              ...prev,
                              [sub.id]: { ...prev[sub.id], feedback: e.target.value },
                            }))}
                            placeholder="Write feedback for the student..."
                            style={{
                              width: "100%", padding: "8px 12px", borderRadius: 8,
                              border: `1.5px solid ${C.border}`, fontSize: 12,
                              fontFamily: "'Inter',sans-serif", color: C.text,
                              resize: "vertical", outline: "none",
                            }}
                          />
                        </div>

                        <button
                          onClick={() => saveGrade(sub.id)}
                          disabled={saving === sub.id}
                          style={{
                            alignSelf: "flex-start",
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "9px 18px", borderRadius: 10, border: "none",
                            background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                            color: "#fff", fontSize: 12, fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {saving === sub.id
                            ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
                            : <><CheckCircle2 size={13} /> Save Grade</>}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}