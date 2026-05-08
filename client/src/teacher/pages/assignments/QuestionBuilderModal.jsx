// client/src/teacher/pages/assignments/QuestionBuilderModal.jsx

import React, { useEffect, useState } from "react";
import {
  Trophy,
  AlertCircle,
  Loader2,
  X,
  CheckSquare,
  Type,
} from "lucide-react";

import { v4 as uuidv4 } from "uuid";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

// ── Same palette as AssignmentsPage ────────────────────────────
const C = {
  slate: "#6A89A7",
  mist: "#BDDDFC",
  sky: "#88BDF2",
  deep: "#384959",
  deepDark: "#243340",
  bg: "#EDF3FA",
  white: "#FFFFFF",
  border: "#C8DCF0",
  borderLight: "#DDE9F5",
  text: "#243340",
  textLight: "#6A89A7",
};

// ── Helpers ────────────────────────────────────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: `${C.mist}55`,
      }}
    />
  );
}

function fmtDate(dt) {
  if (!dt) return "—";

  return new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(36,51,64,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 20,
          border: `1.5px solid ${C.borderLight}`,
          boxShadow: `0 24px 64px rgba(56,73,89,0.22)`,
          width: "100%",
          maxWidth: wide ? 760 : 560,
          padding: "22px 24px",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              color: C.text,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {title}
          </h2>

          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bg,
              cursor: "pointer",
              fontSize: 16,
              color: C.textLight,
            }}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 6,
        fontSize: 12,
        fontWeight: 600,
        color: C.text,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 12,
        border: `1.5px solid ${C.border}`,
        background: C.bg,
        outline: "none",
        fontSize: 13,
        color: C.text,
        fontFamily: "'Inter', sans-serif",
        ...(props.style || {}),
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
//  QUESTION BUILDER MODAL
// ═══════════════════════════════════════════════════════════════

export default function QuestionBuilderModal({
  assignment,
  onClose,
}) {
  const grade =
    parseInt(
      assignment.sections?.[0]?.classSection?.grade,
      10
    ) || 0;

  const allowMCQ = grade === 0 || grade <= 10;
  const allowWritten = grade === 0 || grade >= 8;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewSubs, setViewSubs] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/assignments/${assignment.id}/questions`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await res.json();

      if (data.data?.length) {
        setQuestions(
          data.data.map((q) => ({
            ...q,
            _key: q.id,
          }))
        );
      } else {
        setQuestions([newQuestion("MCQ")]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function newQuestion(type = "MCQ") {
    return {
      _key: uuidv4(),
      type,
      questionText: "",
      marks: 1,
      options:
        type === "MCQ"
          ? ["", "", "", ""]
          : [],
      correctIndex:
        type === "MCQ"
          ? 0
          : null,
    };
  }

  function addQuestion(type) {
    setQuestions((prev) => [
      ...prev,
      newQuestion(type),
    ]);
  }

  function removeQuestion(idx) {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== idx)
    );
  }

  function updateQuestion(idx, patch) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === idx
          ? { ...q, ...patch }
          : q
      )
    );
  }

  function updateOption(qIdx, oIdx, val) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;

        const opts = [...q.options];
        opts[oIdx] = val;

        return {
          ...q,
          options: opts,
        };
      })
    );
  }

  function addOption(qIdx) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: [...q.options, ""],
            }
          : q
      )
    );
  }

  function removeOption(qIdx, oIdx) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;

        const opts = q.options.filter(
          (_, j) => j !== oIdx
        );

        const ci =
          q.correctIndex >= opts.length
            ? 0
            : q.correctIndex;

        return {
          ...q,
          options: opts,
          correctIndex: ci,
        };
      })
    );
  }

  async function handleSave() {
    setError("");

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!q.questionText.trim()) {
        return setError(
          `Question ${i + 1} text is empty`
        );
      }

      if (q.type === "MCQ") {
        if (
          q.options.some(
            (o) => !o.trim()
          )
        ) {
          return setError(
            `All options in Q${i + 1} must be filled`
          );
        }

        if (
          q.correctIndex === null
        ) {
          return setError(
            `Set correct answer for Q${i + 1}`
          );
        }
      }
    }

    try {
      setSaving(true);

      const res = await fetch(
        `${API_URL}/api/assignments/${assignment.id}/questions`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questions,
          }),
        }
      );

      if (!res.ok) {
        const d = await res.json();
        throw new Error(
          d.message || "Failed"
        );
      }

      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (viewSubs) {
    return (
      <SubmissionsModal
        assignment={assignment}
        onBack={() => setViewSubs(false)}
        onClose={onClose}
      />
    );
  }

  const totalMarks = questions.reduce(
    (s, q) =>
      s +
      (parseFloat(q.marks) || 0),
    0
  );

  const mcqCount =
    questions.filter(
      (q) => q.type === "MCQ"
    ).length;

  const wrCount =
    questions.filter(
      (q) => q.type === "WRITTEN"
    ).length;

  return (
    <Modal
      title={`Questions — ${assignment.title}`}
      onClose={onClose}
      wide
    >
      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {[
          {
            label: "Questions",
            value: questions.length,
            color: C.deep,
          },
          {
            label: "MCQ",
            value: mcqCount,
            color: "#1a6fa8",
          },
          {
            label: "Written",
            value: wrCount,
            color: "#7c3aed",
          },
          {
            label: "Total Marks",
            value: totalMarks,
            color: "#1a7a1a",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              minWidth: 80,
              padding: "8px 12px",
              borderRadius: 10,
              background: C.bg,
              border: `1.5px solid ${C.borderLight}`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: s.color,
              }}
            >
              {s.value}
            </div>

            <div
              style={{
                fontSize: 10,
                color: C.textLight,
                fontWeight: 600,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}

        <button
          onClick={() => setViewSubs(true)}
          style={{
            flex: 1,
            minWidth: 100,
            padding: "8px 12px",
            borderRadius: 10,
            border: `1.5px solid ${C.sky}`,
            background: `${C.mist}55`,
            color: C.deep,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Trophy size={13} />
          Submissions
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "#fee8e8",
            border: "1px solid #f5b0b0",
            marginBottom: 14,
            fontSize: 12,
            color: "#8b1c1c",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Questions */}
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {[1, 2].map((i) => (
            <Pulse
              key={i}
              h={80}
              r={12}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxHeight: "50vh",
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {questions.map((q, qIdx) => (
            <QuestionEditor
              key={q._key || qIdx}
              q={q}
              qIdx={qIdx}
              allowWritten={allowWritten}
              onChange={(patch) =>
                updateQuestion(qIdx, patch)
              }
              onUpdateOption={(oIdx, val) =>
                updateOption(
                  qIdx,
                  oIdx,
                  val
                )
              }
              onAddOption={() =>
                addOption(qIdx)
              }
              onRemoveOption={(oIdx) =>
                removeOption(
                  qIdx,
                  oIdx
                )
              }
              onRemove={() =>
                removeQuestion(qIdx)
              }
              total={questions.length}
            />
          ))}
        </div>
      )}

      {/* Add Buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 14,
        }}
      >
        {allowMCQ && (
          <button
            onClick={() =>
              addQuestion("MCQ")
            }
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: `1.5px dashed ${C.sky}`,
              background: `${C.mist}33`,
              color: C.slate,
              cursor: "pointer",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <CheckSquare size={13} />
            Add MCQ
          </button>
        )}

        {allowWritten && (
          <button
            onClick={() =>
              addQuestion("WRITTEN")
            }
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: `1.5px dashed #a78bfa`,
              background: "#f5f0ff",
              color: "#7c3aed",
              cursor: "pointer",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Type size={13} />
            Add Written
          </button>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 16,
        }}
      >
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "11px",
            borderRadius: 12,
            border: `1.5px solid ${C.border}`,
            background: C.white,
            color: C.textLight,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2,
            padding: "11px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {saving ? (
            <>
              <Loader2
                size={14}
                className="animate-spin"
              />
              Saving...
            </>
          ) : (
            "Save Questions"
          )}
        </button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
//  QUESTION EDITOR
// ═══════════════════════════════════════════════════════════════

function QuestionEditor({
  q,
  qIdx,
  allowWritten,
  onChange,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onRemove,
  total,
}) {
  const isMCQ =
    q.type === "MCQ";

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: `1.5px solid ${
          isMCQ
            ? C.borderLight
            : "#e9d5ff"
        }`,
        background: isMCQ
          ? C.bg
          : "#faf5ff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            padding: "3px 9px",
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 700,
            background: isMCQ
              ? `${C.mist}66`
              : "#ede9fe",
            color: isMCQ
              ? C.deep
              : "#7c3aed",
          }}
        >
          Q{qIdx + 1} ·{" "}
          {isMCQ
            ? "MCQ"
            : "Written"}
        </div>

        <input
          type="number"
          min={0.5}
          step={0.5}
          value={q.marks}
          onChange={(e) =>
            onChange({
              marks:
                parseFloat(
                  e.target.value
                ) || 1,
            })
          }
          style={{
            width: 54,
            padding: "4px 8px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}
        />

        <span
          style={{
            fontSize: 10,
            color: C.textLight,
          }}
        >
          marks
        </span>

        {allowWritten && (
          <button
            onClick={() =>
              onChange({
                type: isMCQ
                  ? "WRITTEN"
                  : "MCQ",
                options: isMCQ
                  ? []
                  : [
                      "",
                      "",
                      "",
                      "",
                    ],
                correctIndex:
                  isMCQ
                    ? null
                    : 0,
              })
            }
            style={{
              marginLeft: "auto",
              fontSize: 10,
              padding: "3px 9px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Switch to{" "}
            {isMCQ
              ? "Written"
              : "MCQ"}
          </button>
        )}

        {total > 1 && (
          <button
            onClick={onRemove}
            style={{
              padding: "3px 7px",
              borderRadius: 8,
              border:
                "1px solid #f5b0b0",
              background: "#fff5f5",
              cursor: "pointer",
            }}
          >
            <X
              size={11}
              color="#c0392b"
            />
          </button>
        )}
      </div>

      <textarea
        value={q.questionText}
        onChange={(e) =>
          onChange({
            questionText:
              e.target.value,
          })
        }
        placeholder={
          isMCQ
            ? "Enter your MCQ question here..."
            : "Enter written question..."
        }
        rows={2}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1.5px solid ${C.border}`,
          resize: "vertical",
          outline: "none",
          marginBottom: isMCQ
            ? 12
            : 0,
        }}
      />

      {isMCQ && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {q.options.map(
            (opt, oIdx) => (
              <div
                key={oIdx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button
                  onClick={() =>
                    onChange({
                      correctIndex:
                        oIdx,
                    })
                  }
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 99,
                    border: `2px solid ${
                      q.correctIndex ===
                      oIdx
                        ? "#16a34a"
                        : C.border
                    }`,
                    background:
                      q.correctIndex ===
                      oIdx
                        ? "#16a34a"
                        : "#fff",
                    cursor: "pointer",
                  }}
                />

                <input
                  value={opt}
                  onChange={(e) =>
                    onUpdateOption(
                      oIdx,
                      e.target.value
                    )
                  }
                  placeholder={`Option ${String.fromCharCode(
                    65 + oIdx
                  )}`}
                  style={{
                    flex: 1,
                    padding:
                      "8px 10px",
                    borderRadius: 9,
                    border: `1.5px solid ${
                      q.correctIndex ===
                      oIdx
                        ? "#86efac"
                        : C.border
                    }`,
                  }}
                />

                {q.options.length >
                  2 && (
                  <button
                    onClick={() =>
                      onRemoveOption(
                        oIdx
                      )
                    }
                    style={{
                      background:
                        "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <X
                      size={11}
                      color="#c0392b"
                    />
                  </button>
                )}
              </div>
            )
          )}

          {q.options.length <
            6 && (
            <button
              onClick={onAddOption}
              style={{
                alignSelf:
                  "flex-start",
                padding:
                  "5px 10px",
                borderRadius: 8,
                border: `1px dashed ${C.border}`,
                background:
                  "transparent",
                cursor: "pointer",
                fontSize: 11,
                color:
                  C.textLight,
              }}
            >
              + Add option
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SUBMISSIONS MODAL
// ═══════════════════════════════════════════════════════════════

function SubmissionsModal({
  assignment,
  onBack,
  onClose,
}) {
  return (
    <Modal
      title={`Submissions — ${assignment.title}`}
      onClose={onClose}
      wide
    >
      <button
        onClick={onBack}
        style={{
          marginBottom: 16,
          border: "none",
          background: "none",
          cursor: "pointer",
          color: C.slate,
          fontWeight: 600,
        }}
      >
        ← Back to Questions
      </button>

      <div
        style={{
          textAlign: "center",
          padding: "60px 0",
          color: C.textLight,
        }}
      >
        Submission UI Ready
      </div>
    </Modal>
  );
}