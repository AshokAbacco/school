// client/src/teacher/pages/Certificates/CertificatesUploadPage.jsx
//
// Teacher Certificate Upload Page
// - Upload certificates for students (PDF / image)
// - View, preview, and delete uploaded certificates
// - Stored in Cloudflare R2

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, X, Search, Loader2, AlertCircle, CheckCircle2,
  FileText, Trash2, Eye, Medal, CloudUpload, ImageIcon,
  ChevronDown, GraduationCap, Trophy, Users, Shield, Star, User,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

// ─── Design tokens (matches existing teacher app) ────────────────────────────
const C = {
  dark:   "#384959",
  mid:    "#6A89A7",
  light:  "#88BDF2",
  pale:   "#BDDDFC",
  bg:     "#EDF3FA",
  white:  "#ffffff",
  border: "rgba(136,189,242,0.30)",
};

const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}`;

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "ACADEMIC",   label: "Academic",   icon: GraduationCap, color: "#1D4ED8", bg: "#EFF6FF" },
  { value: "SPORTS",     label: "Sports",     icon: Trophy,        color: "#EA580C", bg: "#FFF7ED" },
  { value: "CULTURAL",   label: "Cultural",   icon: Users,         color: "#9333EA", bg: "#FDF4FF" },
  { value: "ATTENDANCE", label: "Attendance", icon: CheckCircle2,  color: "#16A34A", bg: "#F0FDF4" },
  { value: "DISCIPLINE", label: "Discipline", icon: Shield,        color: "#475569", bg: "#F8FAFC" },
  { value: "LEADERSHIP", label: "Leadership", icon: Star,          color: "#B45309", bg: "#FFFBEB" },
  { value: "SPECIAL",    label: "Special",    icon: Medal,         color: "#7C3AED", bg: "#F5F3FF" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

// ─── Scoped CSS ───────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .tc-root, .tc-root * { font-family: 'DM Sans', sans-serif !important; box-sizing: border-box; }

  @keyframes tc-spin    { to { transform: rotate(360deg); } }
  @keyframes tc-pulse   { 0%,100%{opacity:1;} 50%{opacity:.45;} }
  @keyframes tc-fadein  { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
  @keyframes tc-shake   { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-4px);} 40%,80%{transform:translateX(4px);} }

  .tc-sk { animation: tc-pulse 1.5s ease-in-out infinite; background: ${C.pale}; border-radius: 7px; }

  .tc-card-wrap {
    transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
  }
  .tc-card-wrap:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(56,73,89,0.11) !important;
    border-color: rgba(136,189,242,0.55) !important;
  }
  .tc-card-wrap .tc-del-btn { opacity: 0; transition: opacity 0.15s; }
  .tc-card-wrap:hover .tc-del-btn { opacity: 1; }

  .tc-btn {
    transition: opacity 0.13s, transform 0.1s;
    cursor: pointer; border: none;
    font-family: 'DM Sans', sans-serif !important;
  }
  .tc-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
  .tc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .tc-input {
    width: 100%; border: 1.5px solid ${C.border}; border-radius: 10px;
    padding: 0 13px; height: 40px; font-size: 13px; color: ${C.dark};
    background: ${C.white}; outline: none;
    font-family: 'DM Sans', sans-serif !important;
    transition: border-color 0.15s;
  }
  .tc-input:focus { border-color: ${C.light}; }
  .tc-input::placeholder { color: ${C.mid}; }

  .tc-select {
    width: 100%; border: 1.5px solid ${C.border}; border-radius: 10px;
    padding: 0 13px; height: 40px; font-size: 13px; color: ${C.dark};
    background: ${C.white}; outline: none; cursor: pointer; appearance: none;
    font-family: 'DM Sans', sans-serif !important;
    transition: border-color 0.15s;
  }
  .tc-select:focus { border-color: ${C.light}; }

  .tc-drop {
    border: 2px dashed ${C.border}; border-radius: 14px; background: ${C.bg};
    transition: border-color 0.2s, background 0.2s; cursor: pointer;
  }
  .tc-drop:hover, .tc-drop.over { border-color: ${C.light}; background: rgba(136,189,242,0.07); }
  .tc-drop.has-file { border-color: #22c55e; background: #f0fdf4; }

  .tc-pill {
    transition: background 0.13s, color 0.13s, border-color 0.13s;
    cursor: pointer; border: none;
    font-family: 'DM Sans', sans-serif !important;
  }
  .tc-pill:hover { opacity: 0.82; }

  .tc-search {
    display: flex; align-items: center; gap: 8px;
    background: ${C.white}; border: 1.5px solid ${C.border};
    border-radius: 10px; padding: 0 13px; height: 38px;
  }
  .tc-search input {
    border: none; outline: none; background: transparent;
    font-size: 13px; color: ${C.dark}; width: 100%;
    font-family: 'DM Sans', sans-serif !important;
  }
  .tc-search input::placeholder { color: ${C.mid}; }

  .tc-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  }
  @media (max-width: 1100px) { .tc-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px)  { .tc-grid { grid-template-columns: 1fr; gap: 12px; } }

  .tc-page { padding: 24px 28px; }
  @media (max-width: 768px) { .tc-page { padding: 16px; } }
  @media (max-width: 480px) { .tc-page { padding: 12px 10px; } }

  .tc-backdrop {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(56,73,89,0.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .tc-modal {
    background: ${C.white}; border-radius: 18px;
    width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 24px 64px rgba(56,73,89,0.22);
    animation: tc-fadein 0.2s ease;
  }
  .tc-lbl {
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: ${C.mid}; margin-bottom: 6px; display: block;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Sk = ({ h = 14, w = "100%", r = 6 }) => (
  <div className="tc-sk" style={{ height: h, width: w, borderRadius: r }} />
);

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  const isOk = type === "success";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 12, maxWidth: 320,
      background: isOk ? "#f0fdf4" : "#fef2f2",
      border: `1.5px solid ${isOk ? "#86efac" : "#fca5a5"}`,
      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
      animation: "tc-fadein 0.2s ease",
    }}>
      {isOk
        ? <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
        : <AlertCircle  size={16} color="#ef4444" style={{ flexShrink: 0 }} />
      }
      <p style={{ fontSize: 13, fontWeight: 600, color: isOk ? "#166534" : "#991b1b", margin: 0 }}>{msg}</p>
    </div>
  );
}

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertCard({ cert, onDelete, onView }) {
  const cat     = CAT_MAP[cert.category] ?? { label: cert.category, color: C.mid, bg: C.bg, icon: Medal };
  const CatIcon = cat.icon;
  const isImage = cert.fileType?.startsWith("image/");
  const date    = cert.issuedDate
    ? new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="tc-card-wrap" style={{
      background: C.white, borderRadius: 12,
      border: `1px solid ${C.border}`,
      boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
      overflow: "hidden",
    }}>
      <div style={{ height: 4, background: cat.color }} />
      <div style={{ padding: "14px 16px" }}>

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700,
            background: cat.bg, color: cat.color,
          }}>
            <CatIcon size={10} /> {cat.label}
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700,
            background: "#F0FDF4", color: "#15803D",
          }}>
            {isImage ? <ImageIcon size={10} /> : <FileText size={10} />}
            {isImage ? "Image" : "PDF"}
          </span>
        </div>

        {/* Title */}
        <p style={{
          fontSize: 14, fontWeight: 700, color: C.dark, margin: "0 0 4px", lineHeight: 1.35,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {cert.title || cert.achievementText || "Untitled Certificate"}
        </p>

        <p style={{ fontSize: 12, color: C.mid, margin: "0 0 3px", fontWeight: 500 }}>
          👤 {cert.studentName}
        </p>
        <p style={{ fontSize: 11, color: C.mid, margin: 0 }}>
          📅 {date} &nbsp;·&nbsp; {cert.academicYear}
        </p>
        {cert.uploadedBy?.name && (
          <p style={{ fontSize: 10, color: C.mid, margin: "4px 0 0" }}>
            Uploaded by {cert.uploadedBy.name}
          </p>
        )}

        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="tc-btn"
            onClick={() => onView(cert)}
            style={{
              flex: 1, height: 34, borderRadius: 9, fontSize: 12, fontWeight: 600,
              background: C.bg, color: C.dark,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Eye size={13} /> View
          </button>
          <button
            className="tc-btn tc-del-btn"
            onClick={() => onDelete(cert)}
            style={{
              width: 34, height: 34, borderRadius: 9,
              background: "#FEF2F2", color: "#EF4444",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess, token }) {
  const [step, setStep] = useState(1); // 1=form  2=uploading  3=done
  const [form, setForm] = useState({
    studentId:   "",
    studentName: "",
    title:       "",
    category:    "ACADEMIC",
    issuedDate:  new Date().toISOString().split("T")[0],
    description: "",
  });
  const [file,             setFile]             = useState(null);
  const [students,         setStudents]         = useState([]);
  const [studentSearch,    setStudentSearch]    = useState("");
  const [dropOpen,         setDropOpen]         = useState(false);
  const [loadingStudents,  setLoadingStudents]  = useState(false);
  const [formError,        setFormError]        = useState("");
  const [progress,         setProgress]         = useState(0);
  const fileInputRef = useRef();
  const dropRef      = useRef();
  const dragRef      = useRef(false);

  // Debounced student search
  useEffect(() => {
    if (!studentSearch.trim()) { setStudents([]); return; }
    setLoadingStudents(true);
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(
          `${API_BASE}/api/teacher/certificates/students?search=${encodeURIComponent(studentSearch)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setStudents(data.students ?? []);
      } catch { setStudents([]); }
      finally  { setLoadingStudents(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [studentSearch, token]);

  const validateFile = (f) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type))      { setFormError("Only PDF, JPG, PNG, or WebP files are allowed."); return; }
    if (f.size > 10 * 1024 * 1024)     { setFormError("File must be under 10 MB."); return; }
    setFile(f); setFormError("");
  };

  const handleSubmit = async () => {
    if (!form.studentId)   { setFormError("Please select a student.");         return; }
    if (!form.title.trim()){ setFormError("Certificate title is required.");   return; }
    if (!file)             { setFormError("Please upload a certificate file."); return; }

    setFormError(""); setStep(2); setProgress(10);
    try {
      const fd = new FormData();
      fd.append("file",        file);
      fd.append("studentId",   form.studentId);
      fd.append("title",       form.title.trim());
      fd.append("category",    form.category);
      fd.append("issuedDate",  form.issuedDate);
      fd.append("description", form.description.trim());

      const tick = setInterval(() => setProgress(p => Math.min(p + 8, 85)), 300);
      const res  = await fetch(`${API_BASE}/api/teacher/certificates/upload`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      clearInterval(tick);
      setProgress(100);
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Upload failed"); }
      setStep(3);
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (e) {
      setStep(1); setProgress(0);
      setFormError(e.message ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="tc-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tc-modal tc-root">

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: C.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CloudUpload size={17} color={C.light} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: 0 }}>Upload Certificate</p>
              <p style={{ fontSize: 11, color: C.mid, margin: 0 }}>Attach a certificate file to a student</p>
            </div>
          </div>
          {step !== 2 && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={18} color={C.mid} />
            </button>
          )}
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* ── Step 2: Uploading ── */}
          {step === 2 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", background: C.bg,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <Loader2 size={26} color={C.light} style={{ animation: "tc-spin 0.8s linear infinite" }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>Uploading certificate…</p>
              <p style={{ fontSize: 12, color: C.mid, margin: "0 0 20px" }}>Please wait</p>
              <div style={{ background: C.bg, borderRadius: 99, height: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: `linear-gradient(90deg, ${C.light}, ${C.mid})`,
                  width: `${progress}%`, transition: "width 0.3s ease",
                }} />
              </div>
              <p style={{ fontSize: 11, color: C.mid, marginTop: 8 }}>{progress}%</p>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", background: "#F0FDF4",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <CheckCircle2 size={26} color="#22c55e" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>Uploaded successfully!</p>
            </div>
          )}

          {/* ── Step 1: Form ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Error */}
              {formError && (
                <div style={{
                  background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10,
                  padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
                  animation: "tc-shake 0.35s ease",
                }}>
                  <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#991b1b", margin: 0 }}>{formError}</p>
                </div>
              )}

              {/* Student selector */}
              <div style={{ position: "relative" }}>
                <label className="tc-lbl">Student *</label>
                {form.studentId ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0 13px", height: 40, borderRadius: 10,
                    border: "1.5px solid #86efac", background: "#f0fdf4",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <User size={13} color="#16a34a" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>{form.studentName}</span>
                    </div>
                    <button
                      onClick={() => setForm(f => ({ ...f, studentId: "", studentName: "" }))}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                    >
                      <X size={13} color="#16a34a" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="tc-search">
                      <Search size={13} color={C.mid} style={{ flexShrink: 0 }} />
                      <input
                        value={studentSearch}
                        onChange={e => { setStudentSearch(e.target.value); setDropOpen(true); }}
                        onFocus={() => setDropOpen(true)}
                        placeholder="Search student by name or roll number…"
                      />
                      {loadingStudents && (
                        <Loader2 size={13} color={C.mid} style={{ animation: "tc-spin 0.7s linear infinite", flexShrink: 0 }} />
                      )}
                    </div>
                    {dropOpen && students.length > 0 && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                        background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(56,73,89,0.12)", maxHeight: 200, overflowY: "auto",
                      }}>
                        {students.map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setForm(f => ({ ...f, studentId: s.id, studentName: s.name }));
                              setStudentSearch(""); setDropOpen(false);
                            }}
                            style={{
                              padding: "9px 13px", cursor: "pointer",
                              borderBottom: `1px solid ${C.border}`,
                              display: "flex", alignItems: "center", gap: 10,
                              transition: "background 0.12s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = C.bg}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                              background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 700, color: C.white,
                            }}>
                              {s.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: C.dark, margin: 0 }}>{s.name}</p>
                              <p style={{ fontSize: 10, color: C.mid, margin: 0 }}>
                                {s.classSection}{s.rollNumber ? ` · Roll ${s.rollNumber}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {dropOpen && studentSearch && !loadingStudents && students.length === 0 && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                        background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10,
                        padding: "12px", textAlign: "center",
                        boxShadow: "0 8px 24px rgba(56,73,89,0.12)",
                      }}>
                        <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>No students found</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="tc-lbl">Certificate Title *</label>
                <input
                  className="tc-input"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Best Student Award, State Level Chess Winner…"
                />
              </div>

              {/* Category + Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <label className="tc-lbl">Category *</label>
                  <select
                    className="tc-select"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} color={C.mid} style={{
                    position: "absolute", right: 12, top: "calc(50% + 11px)",
                    transform: "translateY(-50%)", pointerEvents: "none",
                  }} />
                </div>
                <div>
                  <label className="tc-lbl">Issue Date *</label>
                  <input
                    className="tc-input"
                    type="date"
                    value={form.issuedDate}
                    onChange={e => setForm(f => ({ ...f, issuedDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="tc-lbl">
                  Description / Remarks <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  className="tc-input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Any additional notes about this certificate…"
                  style={{ height: "auto", padding: "10px 13px", resize: "vertical", minHeight: 72 }}
                />
              </div>

              {/* Drop zone */}
              <div>
                <label className="tc-lbl">
                  Certificate File * <span style={{ textTransform: "none", fontWeight: 400 }}>(PDF, JPG, PNG — max 10 MB)</span>
                </label>
                <div
                  ref={dropRef}
                  className={`tc-drop ${file ? "has-file" : ""}`}
                  style={{ padding: "24px 20px", textAlign: "center" }}
                  onDragOver={e => { e.preventDefault(); if (!dragRef.current) { dragRef.current = true; dropRef.current?.classList.add("over"); } }}
                  onDragLeave={() => { dragRef.current = false; dropRef.current?.classList.remove("over"); }}
                  onDrop={e => {
                    e.preventDefault(); dragRef.current = false;
                    dropRef.current?.classList.remove("over");
                    const f = e.dataTransfer.files[0];
                    if (f) validateFile(f);
                  }}
                  onClick={() => !file && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: "none" }}
                    onChange={e => { const f = e.target.files[0]; if (f) validateFile(f); }}
                  />
                  {file ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: "#DCFCE7",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {file.type.startsWith("image/")
                          ? <ImageIcon size={18} color="#16A34A" />
                          : <FileText  size={18} color="#16A34A" />
                        }
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#166534", margin: 0 }}>{file.name}</p>
                        <p style={{ fontSize: 11, color: "#16a34a", margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); }}
                        style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", padding: 4 }}
                      >
                        <X size={14} color="#16a34a" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: C.white, border: `1.5px solid ${C.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
                      }}>
                        <CloudUpload size={20} color={C.mid} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: "0 0 3px" }}>
                        Drop file here or <span style={{ color: C.light }}>browse</span>
                      </p>
                      <p style={{ fontSize: 11, color: C.mid, margin: 0 }}>PDF, JPG, PNG, WebP up to 10 MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                className="tc-btn"
                onClick={handleSubmit}
                style={{
                  width: "100%", height: 44, borderRadius: 11, fontSize: 14, fontWeight: 700,
                  background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
                  color: C.white,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginTop: 4,
                }}
              >
                <CloudUpload size={16} /> Upload Certificate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ cert, onConfirm, onClose, loading }) {
  return (
    <div className="tc-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tc-root" style={{
        background: C.white, borderRadius: 16, width: "100%", maxWidth: 380,
        padding: "24px", boxShadow: "0 24px 64px rgba(56,73,89,0.22)",
        animation: "tc-fadein 0.2s ease",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: "#FEF2F2",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
          }}>
            <Trash2 size={20} color="#EF4444" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>Delete Certificate?</p>
          <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>
            This will permanently delete <strong style={{ color: C.dark }}>{cert?.title}</strong>{" "}
            for <strong style={{ color: C.dark }}>{cert?.studentName}</strong>. This cannot be undone.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="tc-btn"
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1, height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600, background: C.bg, color: C.dark }}
          >
            Cancel
          </button>
          <button
            className="tc-btn"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: "#EF4444", color: C.white,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: "tc-spin 0.7s linear infinite" }} />
              : <Trash2 size={14} />
            }
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ cert, onClose }) {
  const isImage = cert?.fileType?.startsWith("image/");
  return (
    <div className="tc-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tc-root" style={{
        background: C.white, borderRadius: 18, width: "100%", maxWidth: 680,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(56,73,89,0.22)", animation: "tc-fadein 0.2s ease",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>{cert.title}</p>
            <p style={{ fontSize: 11, color: C.mid, margin: 0 }}>{cert.studentName} · {cert.academicYear}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color={C.mid} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {cert.fileUrl ? (
            isImage
              ? <img src={cert.fileUrl} alt={cert.title} style={{ width: "100%", borderRadius: 10, objectFit: "contain" }} />
              : <iframe src={cert.fileUrl} title={cert.title} style={{ width: "100%", height: 480, border: "none", borderRadius: 10 }} />
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <FileText size={32} color={C.mid} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: C.mid, margin: 0 }}>Preview not available</p>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <a
            href={cert.fileUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: C.bg, color: C.dark, textDecoration: "none",
            }}
          >
            <FileText size={14} /> Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CertificatesUploadPage() {
  const token = getToken();

  const [certs,        setCerts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [pageError,    setPageError]    = useState("");
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("All");
  const [showUpload,   setShowUpload]   = useState(false);
  const [deletingCert, setDeletingCert] = useState(null);
  const [deleteLoad,   setDeleteLoad]   = useState(false);
  const [viewingCert,  setViewingCert]  = useState(null);
  const [toast,        setToast]        = useState(null);

  const fetchCerts = useCallback(async () => {
    setLoading(true); setPageError("");
    try {
      const res  = await fetch(`${API_BASE}/api/teacher/certificates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load certificates");
      const data = await res.json();
      setCerts(data.data ?? []);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const handleDelete = async () => {
    if (!deletingCert) return;
    setDeleteLoad(true);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/certificates/${deletingCert.id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setCerts(c => c.filter(x => x.id !== deletingCert.id));
      setToast({ msg: "Certificate deleted.", type: "success" });
      setDeletingCert(null);
    } catch (e) {
      setToast({ msg: e.message, type: "error" });
    } finally {
      setDeleteLoad(false);
    }
  };

  // Filter
  const filtered = certs.filter(c => {
    const matchSearch = !search
      || c.studentName?.toLowerCase().includes(search.toLowerCase())
      || c.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || c.category === catFilter;
    return matchSearch && matchCat;
  });

  // Stats
  const stats = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = certs.filter(c => c.category === cat.value).length;
    return acc;
  }, {});

  return (
    <>
      <style>{STYLE}</style>
      <div className="tc-root tc-page" style={{ background: C.bg, minHeight: "100vh" }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          marginBottom: 22, flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Medal size={20} color={C.white} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: C.dark, margin: 0, letterSpacing: -0.3 }}>
                Certificates
              </h1>
              <p style={{ fontSize: 12, color: C.mid, margin: "3px 0 0", fontWeight: 500 }}>
                Upload and manage student certificates
              </p>
            </div>
          </div>
          <button
            className="tc-btn"
            onClick={() => setShowUpload(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "0 18px", height: 40, borderRadius: 11, fontSize: 13, fontWeight: 700,
              background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
              color: C.white,
            }}
          >
            <CloudUpload size={15} /> Upload Certificate
          </button>
        </div>

        {/* ── Page Error ── */}
        {pageError && (
          <div style={{
            background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10,
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
          }}>
            <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", margin: 0 }}>{pageError}</p>
          </div>
        )}

        {/* ── Stats ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 12, marginBottom: 20,
        }}>
          <div style={{ background: C.white, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.light}` }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.mid, margin: "0 0 8px" }}>Total</p>
            {loading ? <Sk h={28} w="50%" /> : <p style={{ fontSize: 28, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1 }}>{certs.length}</p>}
          </div>
          {CATEGORIES.slice(0, 3).map(cat => (
            <div key={cat.value} style={{ background: C.white, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, borderLeft: `4px solid ${cat.color}` }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.mid, margin: "0 0 8px" }}>{cat.label}</p>
              {loading ? <Sk h={28} w="40%" /> : <p style={{ fontSize: 28, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1 }}>{stats[cat.value] ?? 0}</p>}
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{
          background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
          padding: "14px 16px", marginBottom: 18,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div className="tc-search">
            <Search size={13} color={C.mid} style={{ flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by student name or certificate title…"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={13} color={C.mid} />
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["All", ...CATEGORIES.map(c => c.value)].map(v => {
              const active = catFilter === v;
              return (
                <button
                  key={v}
                  className="tc-pill"
                  onClick={() => setCatFilter(v)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: active ? C.dark : C.white,
                    color:      active ? C.white : C.mid,
                    border:     `1.5px solid ${active ? C.dark : C.border}`,
                  }}
                >
                  {v === "All" ? "All" : CAT_MAP[v]?.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Result count ── */}
        {!loading && !pageError && (
          <p style={{ fontSize: 12, fontWeight: 600, color: C.mid, margin: "0 0 14px" }}>
            Showing {filtered.length} of {certs.length} certificate{certs.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="tc-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div className="tc-sk" style={{ height: 4, borderRadius: 0 }} />
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 6 }}><Sk h={20} w={70} r={20} /><Sk h={20} w={50} r={20} /></div>
                  <Sk h={16} w="75%" /><Sk h={11} w="55%" /><Sk h={11} w="40%" />
                  <div style={{ height: 1, background: C.border }} />
                  <Sk h={34} r={9} />
                </div>
              </div>
            ))}
          </div>

        ) : !pageError && filtered.length === 0 ? (
          <div style={{
            background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
            padding: "64px 20px", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: C.bg, border: `1.5px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
            }}>
              <Medal size={22} color={C.mid} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>
              {certs.length === 0 ? "No Certificates Uploaded Yet" : "No Certificates Found"}
            </p>
            <p style={{ fontSize: 12, color: C.mid, margin: "0 0 20px" }}>
              {search || catFilter !== "All"
                ? "Try adjusting your search or filters."
                : "Upload a certificate to get started."}
            </p>
            {certs.length === 0 && (
              <button
                className="tc-btn"
                onClick={() => setShowUpload(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "0 20px", height: 40, borderRadius: 11, fontSize: 13, fontWeight: 700,
                  background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
                  color: C.white,
                }}
              >
                <CloudUpload size={15} /> Upload First Certificate
              </button>
            )}
          </div>

        ) : (
          <div className="tc-grid">
            {filtered.map(cert => (
              <CertCard
                key={cert.id}
                cert={cert}
                onDelete={setDeletingCert}
                onView={setViewingCert}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showUpload && (
        <UploadModal
          token={token}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            fetchCerts();
            setToast({ msg: "Certificate uploaded successfully!", type: "success" });
          }}
        />
      )}
      {deletingCert && (
        <DeleteModal
          cert={deletingCert}
          loading={deleteLoad}
          onConfirm={handleDelete}
          onClose={() => setDeletingCert(null)}
        />
      )}
      {viewingCert && (
        <ViewModal cert={viewingCert} onClose={() => setViewingCert(null)} />
      )}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </>
  );
}