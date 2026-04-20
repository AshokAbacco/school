// client/src/teacher/pages/curriculum/CurriculumPage.jsx
import React, { useState, useEffect } from "react";
import {
  BookOpen,
  AlertCircle,
  Loader2,
  Plus,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

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

function ProgressBar({ completed, total }) {
  const pct = total ? Math.min(Math.round((completed / total) * 100), 100) : 0;
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: C.textLight,
            fontWeight: 500,
          }}
        >
          {completed}/{total} chapters
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: C.deep,
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: 7,
          borderRadius: 99,
          background: `${C.mist}55`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`,
            borderRadius: 99,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function CurriculumPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showSetModal, setShowSetModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showChaptersModal, setShowChaptersModal] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function fetchAssignments() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/teacher/curriculum/assignments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssignments(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const grouped = assignments.reduce((acc, a) => {
    const key = `${a.subjectId}_${a.grade}`;
    if (!acc[key])
      acc[key] = {
        subject: a.subject,
        grade: a.grade,
        syllabus: a.syllabus,
        sections: [],
      };
    acc[key].sections.push(a);
    return acc;
  }, {});

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease forwards; }

        .curr-page { padding: 20px 16px; }
        .curr-subject-header { flex-direction: column; align-items: flex-start !important; gap: 10px !important; }
        .curr-set-btn { width: 100%; justify-content: center; }
        .curr-sections-grid { grid-template-columns: 1fr !important; }
        .curr-section-row { flex-direction: column; align-items: flex-start !important; gap: 10px !important; }
        .curr-section-btn { width: 100%; justify-content: center; }

        @media (min-width: 480px) {
          .curr-page { padding: 20px 20px; }
          .curr-sections-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; }
        }
        @media (min-width: 768px) {
          .curr-page { padding: 24px 28px; }
          .curr-subject-header { flex-direction: row !important; align-items: center !important; }
          .curr-set-btn { width: auto; }
          .curr-section-row { flex-direction: row !important; align-items: center !important; }
          .curr-section-btn { width: auto; }
        }
        @media (min-width: 1024px) {
          .curr-page { padding: 28px 32px; }
        }
      `}</style>

      <div
        className="curr-page"
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: "'Inter', sans-serif",
          backgroundImage: `radial-gradient(circle at 15% 0%, ${C.mist}28 0%, transparent 50%)`,
        }}
      >
        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 4,
                height: 28,
                borderRadius: 99,
                background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
                flexShrink: 0,
              }}
            />
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(18px, 5vw, 26px)",
                fontWeight: 800,
                color: C.text,
                letterSpacing: "-0.5px",
              }}
            >
              Curriculum Progress
            </h1>
          </div>
          <p
            style={{
              margin: 0,
              paddingLeft: 14,
              fontSize: 12,
              color: C.textLight,
              fontWeight: 500,
            }}
          >
            Manage chapter counts and track portion completion per section
          </p>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fee8e8",
              border: "1px solid #f5b0b0",
              marginBottom: 16,
              fontSize: 13,
              color: "#8b1c1c",
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />{" "}
            <span>{error}</span>
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  background: C.white,
                  borderRadius: 16,
                  border: `1.5px solid ${C.borderLight}`,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <Pulse w={40} h={40} r={12} />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <Pulse w="45%" h={14} />
                    <Pulse w="28%" h={10} />
                  </div>
                </div>
                <Pulse w="100%" h={70} r={12} />
              </div>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "50px 0",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: `${C.sky}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${C.sky}33`,
              }}
            >
              <BookOpen size={26} color={C.sky} strokeWidth={1.5} />
            </div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: C.textLight,
                margin: 0,
              }}
            >
              No subjects assigned yet
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.values(grouped).map((group, gi) => (
              <div
                key={gi}
                className="fade-up"
                style={{
                  background: C.white,
                  borderRadius: 18,
                  border: `1.5px solid ${C.borderLight}`,
                  boxShadow: "0 2px 16px rgba(56,73,89,0.06)",
                  overflow: "hidden",
                }}
              >
                {/* ── Subject header ── */}
                <div
                  className="curr-subject-header"
                  style={{
                    padding: "14px 18px",
                    background: `linear-gradient(90deg, ${C.bg}, ${C.white})`,
                    borderBottom: `1.5px solid ${C.borderLight}`,
                    display: "flex",
                  }}
                >
                  {/* left: icon + name */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 4px 10px ${C.sky}44`,
                        flexShrink: 0,
                      }}
                    >
                      <BookOpen size={17} color="#fff" strokeWidth={2} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {group.subject?.name}
                      </p>
                      <p
                        style={{ margin: 0, fontSize: 11, color: C.textLight }}
                      >
                        Grade {group.grade} · {group.subject?.code}
                      </p>
                    </div>
                  </div>

                  {/* right: buttons */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexShrink: 0,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* ── Chapter names button ── */}
                    {group.syllabus && (
                      <button
                        onClick={() => {
                          setSelectedSubject(group);
                          setShowChaptersModal(true);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "8px 13px",
                          borderRadius: 12,
                          background: group.syllabus.chapterNames?.some((n) => n)
                            ? `${C.sky}22`
                            : `${C.mist}44`,
                          border: `1px solid ${
                            group.syllabus.chapterNames?.some((n) => n)
                              ? C.sky
                              : C.border
                          }`,
                          color: group.syllabus.chapterNames?.some((n) => n)
                            ? C.deep
                            : C.textLight,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <BookOpen size={12} />
                        {group.syllabus.chapterNames?.some((n) => n)
                          ? "Edit chapter names"
                          : "Add chapter names"}
                      </button>
                    )}

                    {/* ── Set/Edit total chapters button ── */}
                    <button
                      className="curr-set-btn"
                      onClick={() => {
                        setSelectedSubject(group);
                        setShowSetModal(true);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "8px 14px",
                        borderRadius: 12,
                        background: group.syllabus
                          ? `${C.sky}18`
                          : `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                        border: group.syllabus ? `1px solid ${C.sky}44` : "none",
                        color: group.syllabus ? C.deep : "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {group.syllabus ? (
                        <>
                          <Pencil size={12} /> Edit Chapters (
                          {group.syllabus.totalChapters})
                        </>
                      ) : (
                        <>
                          <Plus size={12} /> Set Total Chapters
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Sections ── */}
                <div
                  className="curr-sections-grid"
                  style={{ padding: "14px 18px", display: "grid", gap: 12 }}
                >
                  {group.sections.map((sec, si) => (
                    <div
                      key={si}
                      style={{
                        borderRadius: 13,
                        border: `1.5px solid ${C.borderLight}`,
                        padding: "14px 16px",
                        background: C.bg,
                        transition: "box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.boxShadow = `0 4px 16px ${C.sky}28`)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.boxShadow = "none")
                      }
                    >
                      {/* section row: name + button */}
                      <div
                        className="curr-section-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 700,
                              color: C.text,
                            }}
                          >
                            {sec.classSection?.name}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 10,
                              color: C.textLight,
                              marginTop: 2,
                            }}
                          >
                            {sec.progress?.updatedAt
                              ? `Updated ${new Date(sec.progress.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                              : "Not started"}
                          </p>
                        </div>
                        <button
                          className="curr-section-btn"
                          onClick={() => {
                            setSelectedSubject({
                              ...group,
                              activeSection: sec,
                            });
                            setShowUpdateModal(true);
                          }}
                          disabled={!group.syllabus}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            padding: "7px 14px",
                            borderRadius: 10,
                            background: group.syllabus
                              ? `linear-gradient(135deg, ${C.slate}, ${C.deep})`
                              : C.border,
                            border: "none",
                            color: group.syllabus ? "#fff" : C.textLight,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: group.syllabus ? "pointer" : "not-allowed",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          <CheckCircle2 size={12} /> Update
                        </button>
                      </div>
                      <ProgressBar
                        completed={sec.progress?.completedChapters ?? 0}
                        total={group.syllabus?.totalChapters ?? 0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSetModal && selectedSubject && (
        <SetChaptersModal
          group={selectedSubject}
          onClose={() => {
            setShowSetModal(false);
            setSelectedSubject(null);
          }}
          onSaved={fetchAssignments}
        />
      )}
      {showUpdateModal && selectedSubject && (
        <UpdateProgressModal
          group={selectedSubject}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedSubject(null);
          }}
          onSaved={fetchAssignments}
        />
      )}

      {showChaptersModal && selectedSubject && (
        <ChapterNamesModal
          group={selectedSubject}
          onClose={() => {
            setShowChaptersModal(false);
            setSelectedSubject(null);
          }}
          onSaved={fetchAssignments}
        />
      )}
    </>
  );
}

/* ── Set Total Chapters Modal ─────────────────────────────── */
function SetChaptersModal({ group, onClose, onSaved }) {
  const [total, setTotal] = useState(group.syllabus?.totalChapters ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const num = Number(total);
    if (!num || num < 1) {
      setError("Please enter a valid number of chapters (minimum 1)");
      return;
    }
    try {
      setSaving(true);
      setError("");

      // ── BUG FIX: use correct endpoint and body ──
      // If syllabus already exists → PUT (update), else → POST (create)
      const method = group.syllabus ? "PUT" : "POST";
      const endpoint = group.syllabus
        ? `${API_URL}/api/teacher/curriculum/syllabus`   // PUT
        : `${API_URL}/api/teacher/curriculum/syllabus`;  // POST

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          subjectId: group.subject.id,
          grade: group.grade,
          totalChapters: num,            // ✅ FIXED: was sending `names` and `chapterNames`
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to save");
      }

      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Set Chapters — ${group.subject?.name}`} onClose={onClose}>
      <p
        style={{
          fontSize: 12,
          color: C.textLight,
          margin: "0 0 16px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Applies to all sections of{" "}
        <strong style={{ color: C.deep }}>Grade {group.grade}</strong>
      </p>
      <label
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: C.text,
          display: "block",
          marginBottom: 6,
        }}
      >
        Total Chapters
      </label>
      <input
        type="number"
        min={1}
        value={total}
        onChange={(e) => setTotal(e.target.value)}
        placeholder="e.g. 15"
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 12,
          border: `1.5px solid ${C.border}`,
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: C.text,
          background: C.bg,
          outline: "none",
        }}
      />
      {error && (
        <p
          style={{
            color: "#c0392b",
            fontSize: 11,
            margin: "8px 0 0",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 12,
            border: `1.5px solid ${C.border}`,
            background: C.white,
            color: C.textLight,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
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
            padding: "10px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </Modal>
  );
}

/* ── Update Progress Modal ────────────────────────────────── */
function UpdateProgressModal({ group, onClose, onSaved }) {
  const total = group.syllabus?.totalChapters ?? 0;
  const chapterNames = group.syllabus?.chapterNames ?? [];
  const hasNames = chapterNames.some((n) => n?.trim());

  const [mode, setMode] = useState(hasNames ? "select" : "number");
  const [completed, setCompleted] = useState(
    group.activeSection?.progress?.completedChapters ?? 0,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [checkedChapters, setCheckedChapters] = useState(() => {
    const savedIndices = new Set(
      group.activeSection?.progress?.completedChapterIndices ?? []
    );
    if (savedIndices.size > 0) {
      return Array.from({ length: total }, (_, i) => savedIndices.has(i));
    }
    const count = group.activeSection?.progress?.completedChapters ?? 0;
    return Array.from({ length: total }, (_, i) => i < count);
  });

  const completedFromChecks = checkedChapters.filter(Boolean).length;

  function toggleChapter(index) {
    setCheckedChapters((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  const effectiveCompleted =
    mode === "select" ? completedFromChecks : Number(completed);
  const pct = total
    ? Math.min(Math.round((effectiveCompleted / total) * 100), 100)
    : 0;

  async function handleSave() {
    const val = effectiveCompleted;
    if (isNaN(val) || val < 0 || val > total) {
      setError(`Enter 0 – ${total}`);
      return;
    }
    try {
      setSaving(true);

      // ── BUG FIX: send completedChapterIndices ──
      const completedChapterIndices =
        mode === "select"
          ? checkedChapters
              .map((checked, i) => (checked ? i : -1))
              .filter((i) => i !== -1)
          : Array.from({ length: val }, (_, i) => i); // number mode: assume serial

      const res = await fetch(`${API_URL}/api/teacher/curriculum/progress`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          subjectId: group.subject.id,
          classSectionId: group.activeSection.classSection.id,
          completedChapters: val,
          completedChapterIndices,        // ✅ FIXED: was missing entirely
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Update — ${group.activeSection?.classSection?.name}`}
      onClose={onClose}
    >
      <p
        style={{
          fontSize: 12,
          color: C.textLight,
          margin: "0 0 12px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <strong style={{ color: C.deep }}>{group.subject?.name}</strong> ·{" "}
        <strong style={{ color: C.deep }}>{total} chapters</strong>
      </p>

      {/* ── Mode toggle (only show if chapter names exist) ── */}
      {hasNames && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 14,
            background: C.bg,
            borderRadius: 10,
            padding: 4,
            border: `1.5px solid ${C.borderLight}`,
          }}
        >
          {[
            { key: "select", label: "By chapter" },
            { key: "number", label: "By number" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMode(opt.key)}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: "none",
                background:
                  mode === opt.key
                    ? `linear-gradient(135deg, ${C.slate}, ${C.deep})`
                    : "transparent",
                color: mode === opt.key ? "#fff" : C.textLight,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Live progress preview ── */}
      <div
        style={{
          margin: "0 0 14px",
          padding: "12px 14px",
          borderRadius: 13,
          background: C.bg,
          border: `1.5px solid ${C.borderLight}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 7,
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: C.textLight,
            }}
          >
            {effectiveCompleted}/{total} chapters · Preview
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 800,
              color: C.deep,
            }}
          >
            {pct}%
          </span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 99,
            background: `${C.mist}55`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`,
              borderRadius: 99,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* ── Select mode: chapter checklist ── */}
      {mode === "select" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 240,
            overflowY: "auto",
            paddingRight: 4,
            marginBottom: 4,
          }}
        >
          {Array.from({ length: total }, (_, i) => {
            const name = chapterNames[i]?.trim() || `Chapter ${i + 1}`;
            const checked = checkedChapters[i] ?? false;
            return (
              <div
                key={i}
                onClick={() => toggleChapter(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${checked ? C.sky : C.borderLight}`,
                  background: checked ? `${C.sky}14` : C.white,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  userSelect: "none",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `2px solid ${checked ? C.deep : C.border}`,
                    background: checked
                      ? `linear-gradient(135deg, ${C.slate}, ${C.deep})`
                      : C.white,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4l3 3 5-6"
                        stroke="#fff"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: checked
                      ? `linear-gradient(135deg, ${C.slate}, ${C.deep})`
                      : `${C.mist}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: checked ? "#fff" : C.textLight,
                    flexShrink: 0,
                    fontFamily: "'Inter', sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    fontWeight: checked ? 700 : 400,
                    color: checked ? C.text : C.textLight,
                    flex: 1,
                    transition: "all 0.15s",
                  }}
                >
                  {name}
                </span>
                {checked && (
                  <CheckCircle2 size={13} color={C.slate} strokeWidth={2.5} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Number mode: plain input ── */}
      {mode === "number" && (
        <>
          <label
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: C.text,
              display: "block",
              marginBottom: 6,
            }}
          >
            Completed Chapters
          </label>
          <input
            type="number"
            min={0}
            max={total}
            value={completed}
            onChange={(e) => setCompleted(e.target.value)}
            placeholder={`0 – ${total}`}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: C.text,
              background: C.bg,
              outline: "none",
            }}
          />
        </>
      )}

      {error && (
        <p
          style={{
            color: "#c0392b",
            fontSize: 11,
            margin: "8px 0 0",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 12,
            border: `1.5px solid ${C.border}`,
            background: C.white,
            color: C.textLight,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
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
            padding: "10px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            "Save Progress"
          )}
        </button>
      </div>
    </Modal>
  );
}

/* ── Generic Modal wrapper ────────────────────────────────── */
function Modal({ title, onClose, children }) {
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
          maxWidth: 420,
          padding: "22px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 800,
              color: C.text,
              flex: 1,
              marginRight: 10,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: C.textLight,
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
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

/* ── Chapter Names Modal ──────────────────────────────────── */
function ChapterNamesModal({ group, onClose, onSaved }) {
  const total = group.syllabus?.totalChapters ?? 0;

  const [names, setNames] = useState(() => {
    const existing = group.syllabus?.chapterNames ?? [];
    return Array.from({ length: total }, (_, i) => existing[i] ?? "");
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(index, value) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  // ── BUG FIX: correct request body for chapter names ──
  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      const res = await fetch(`${API_URL}/api/teacher/curriculum/chapters`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          subjectId: group.subject.id,
          grade: group.grade,             // ✅ FIXED: was using classSectionId + completedChapters
          chapterNames: names,            // ✅ FIXED: correct payload for this endpoint
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to save");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const filledCount = names.filter((n) => n.trim()).length;

  return (
    <Modal
      title={`Chapter names — ${group.subject?.name} · Grade ${group.grade}`}
      onClose={onClose}
    >
      <p
        style={{
          fontSize: 12,
          color: C.textLight,
          margin: "0 0 14px",
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: C.deep }}>
          {filledCount}/{total} named
        </strong>
      </p>

      {/* Scrollable chapter list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 320,
          overflowY: "auto",
          paddingRight: 4,
          marginBottom: 4,
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                background: names[i]?.trim()
                  ? `linear-gradient(135deg, ${C.slate}, ${C.deep})`
                  : `${C.mist}55`,
                border: `1px solid ${names[i]?.trim() ? "transparent" : C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: names[i]?.trim() ? "#fff" : C.textLight,
                flexShrink: 0,
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {i + 1}
            </div>
            <input
              type="text"
              value={names[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder={`Chapter ${i + 1} name…`}
              maxLength={100}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 10,
                border: `1.5px solid ${names[i]?.trim() ? C.sky : C.border}`,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: names[i]?.trim() ? 600 : 400,
                color: C.text,
                background: C.bg,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.sky)}
              onBlur={(e) =>
                (e.target.style.borderColor = names[i]?.trim()
                  ? C.sky
                  : C.border)
              }
            />
          </div>
        ))}
      </div>

      {error && (
        <p
          style={{
            color: "#c0392b",
            fontSize: 11,
            margin: "6px 0 0",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 12,
            border: `1.5px solid ${C.border}`,
            background: C.white,
            color: C.textLight,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
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
            padding: "10px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            "Save chapter names"
          )}
        </button>
      </div>
    </Modal>
  );
}