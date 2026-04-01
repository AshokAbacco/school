// client/src/teacher/pages/Certificates/CertificatesUploadPage.jsx
//
// Teacher Certificate Upload Page — redesigned to match OnlineClassesPage style
// - Upload certificates for students (PDF / image)
// - View, preview, and delete uploaded certificates
// - Stored in Cloudflare R2

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, X, Search, Loader2, AlertCircle, CheckCircle2,
  FileText, Trash2, Eye, Medal, CloudUpload, ImageIcon,
  ChevronDown, GraduationCap, Trophy, Users, Shield, Star,
  User, Plus, ExternalLink,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

// ─── Design tokens (mirrors OnlineClassesPage exactly) ───────────────────────
const C = {
  slate:       "#6A89A7",
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  deepDark:    "#243340",
  bg:          "#EDF3FA",
  white:       "#FFFFFF",
  border:      "#C8DCF0",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
};

const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}`;

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "ACADEMIC",    label: "Academic",    icon: GraduationCap, color: "#1D4ED8", bg: "#EFF6FF" },
  { value: "SPORTS",      label: "Sports",      icon: Trophy,        color: "#EA580C", bg: "#FFF7ED" },
  { value: "CULTURAL",    label: "Cultural",    icon: Users,         color: "#9333EA", bg: "#FDF4FF" },
  { value: "ATTENDANCE",  label: "Attendance",  icon: CheckCircle2,  color: "#16A34A", bg: "#F0FDF4" },
  { value: "DISCIPLINE",  label: "Discipline",  icon: Shield,        color: "#475569", bg: "#F8FAFC" },
  { value: "LEADERSHIP",  label: "Leadership",  icon: Star,          color: "#B45309", bg: "#FFFBEB" },
  { value: "SPECIAL",     label: "Special",     icon: Medal,         color: "#7C3AED", bg: "#F5F3FF" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

// ─── Global styles (mirrors OnlineClassesPage pattern) ────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes pulse-bg { 0%,100%{opacity:1;} 50%{opacity:.5;} }
  @keyframes shake    { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-4px);} 40%,80%{transform:translateX(4px);} }
  @keyframes fadein   { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
  .fade-up   { animation: fadeUp 0.45s ease forwards; }
  .cert-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 640px)  { .cert-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .cert-grid { grid-template-columns: repeat(3, 1fr); } }
  .cert-card { transition: transform 0.2s, box-shadow 0.2s; }
  .cert-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(56,73,89,0.12) !important; }
  .cert-del-btn { opacity: 0; transition: opacity 0.15s; }
  .cert-card:hover .cert-del-btn { opacity: 1; }
  .filter-btn { transition: all 0.15s; }
  .cert-btn { transition: opacity 0.13s, transform 0.1s; cursor: pointer; border: none; font-family: 'Inter', sans-serif; }
  .cert-btn:hover:not(:disabled) { opacity: 0.85; }
  .cert-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cert-input {
    width: 100%; padding: 10px 14px; border-radius: 12px;
    border: 1.5px solid #C8DCF0; font-family: 'Inter', sans-serif;
    font-size: 13px; color: #243340; background: #EDF3FA; outline: none;
    transition: border-color 0.15s;
  }
  .cert-input:focus { border-color: #88BDF2; }
  .cert-input::placeholder { color: #6A89A7; }
  .cert-drop {
    border: 2px dashed #C8DCF0; border-radius: 14px; background: #EDF3FA;
    transition: border-color 0.2s, background 0.2s; cursor: pointer;
  }
  .cert-drop:hover, .cert-drop.over { border-color: #88BDF2; background: rgba(136,189,242,0.07); }
  .cert-drop.has-file { border-color: #22c55e; background: #f0fdf4; }
  .cert-backdrop {
    position: fixed; inset: 0; background: rgba(36,51,64,0.45);
    backdrop-filter: blur(4px); display: flex; align-items: center;
    justify-content: center; z-index: 1000; padding: 16px;
  }
  .cert-modal {
    background: #FFFFFF; border-radius: 20px; border: 1.5px solid #DDE9F5;
    box-shadow: 0 24px 64px rgba(56,73,89,0.22); width: 100%; max-width: 520px;
    max-height: 90vh; overflow-y: auto; padding: 22px;
    animation: fadein 0.2s ease;
  }
  .cert-sk { animation: pulse-bg 1.5s ease-in-out infinite; background: #BDDDFC55; border-radius: 8px; }
  .cert-lbl {
    font-size: 12px; font-weight: 600; color: #243340;
    display: block; margin-bottom: 6px; font-family: 'Inter', sans-serif;
  }
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ h = 13, w = "100%", r = 8 }) {
  return <div className="cert-sk" style={{ height: h, width: w, borderRadius: r }} />;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  const ok = type === "success";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 12, maxWidth: 320,
      background: ok ? "#f0fdf4" : "#fef2f2",
      border: `1.5px solid ${ok ? "#86efac" : "#fca5a5"}`,
      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
      animation: "fadein 0.2s ease",
      fontFamily: "'Inter', sans-serif",
    }}>
      {ok
        ? <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
        : <AlertCircle  size={16} color="#ef4444" style={{ flexShrink: 0 }} />
      }
      <p style={{ fontSize: 13, fontWeight: 600, color: ok ? "#166534" : "#991b1b", margin: 0 }}>{msg}</p>
    </div>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────
function CatBadge({ value }) {
  const cat = CAT_MAP[value] ?? { label: value, color: C.slate, bg: C.bg, icon: Medal };
  const Icon = cat.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: cat.bg, color: cat.color, fontFamily: "'Inter', sans-serif",
    }}>
      <Icon size={10} /> {cat.label}
    </span>
  );
}

// ─── Status-style badge for file type ─────────────────────────────────────────
function FileBadge({ isImage }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: "#F0F9FF", color: "#0369A1", fontFamily: "'Inter', sans-serif",
    }}>
      {isImage ? <ImageIcon size={10} /> : <FileText size={10} />}
      {isImage ? "Image" : "PDF"}
    </span>
  );
}

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertCard({ cert, onDelete, onView }) {
  const cat = CAT_MAP[cert.category] ?? { color: C.slate };
  const isImage = cert.fileType?.startsWith("image/");
  const date = cert.issuedDate
    ? new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="cert-card" style={{
      background: C.white, borderRadius: 16,
      border: `1.5px solid ${C.borderLight}`,
      padding: 18, display: "flex", flexDirection: "column", gap: 12,
      boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
      borderTop: `3px solid ${cat.color}`,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: `${C.mist}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Medal size={18} color={C.slate} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 800, color: C.text,
              fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {cert.title || cert.achievementText || "Untitled Certificate"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
              {cert.studentName}
            </p>
          </div>
        </div>
        <CatBadge value={cert.category} />
      </div>

      {/* Meta rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <MetaRow label={`📅 ${date}  ·  ${cert.academicYear}`} />
        <MetaRow label={isImage ? "📎 Image file" : "📄 PDF file"} />
        {cert.uploadedBy?.name && <MetaRow label={`👤 Uploaded by ${cert.uploadedBy.name}`} />}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: C.borderLight }} />

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="cert-btn"
          onClick={() => onView(cert)}
          style={{
            flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px", borderRadius: 10,
            background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: C.white, fontSize: 12, fontWeight: 700,
          }}
        >
          <Eye size={13} /> View
        </button>
        <button
          className="cert-btn cert-del-btn"
          onClick={() => onDelete(cert)}
          style={{
            flex: 1, padding: "8px", borderRadius: 10,
            border: "1.5px solid #f5b0b0", background: "#fff5f5",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Trash2 size={13} color="#c0392b" />
        </button>
      </div>
    </div>
  );
}

function MetaRow({ label }) {
  return (
    <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>{label}</span>
  );
}

// ─── Modal wrapper (identical to OnlineClassesPage) ───────────────────────────
function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="cert-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cert-modal">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 800, color: C.text }}>
              {title}
            </h2>
            {subtitle && <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.textLight, fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess, token }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    studentId: "", studentName: "", title: "",
    category: "ACADEMIC",
    issuedDate: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [file, setFile]                   = useState(null);
  const [students, setStudents]           = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [dropOpen, setDropOpen]           = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [formError, setFormError]         = useState("");
  const [progress, setProgress]           = useState(0);
  const fileInputRef = useRef();
  const dropRef      = useRef();
  const dragRef      = useRef(false);

  useEffect(() => {
    if (!studentSearch.trim()) { setStudents([]); return; }
    setLoadingStudents(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/teacher/certificates/students?search=${encodeURIComponent(studentSearch)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setStudents(data.students ?? []);
      } catch { setStudents([]); }
      finally { setLoadingStudents(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [studentSearch, token]);

  const validateFile = (f) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) { setFormError("Only PDF, JPG, PNG, or WebP files are allowed."); return; }
    if (f.size > 10 * 1024 * 1024) { setFormError("File must be under 10 MB."); return; }
    setFile(f); setFormError("");
  };

  const handleSubmit = async () => {
    if (!form.studentId)      { setFormError("Please select a student."); return; }
    if (!form.title.trim())   { setFormError("Certificate title is required."); return; }
    if (!file)                { setFormError("Please upload a certificate file."); return; }
    setFormError(""); setStep(2); setProgress(10);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("studentId", form.studentId);
      fd.append("title", form.title.trim());
      fd.append("category", form.category);
      fd.append("issuedDate", form.issuedDate);
      fd.append("description", form.description.trim());
      const tick = setInterval(() => setProgress(p => Math.min(p + 8, 85)), 300);
      const res = await fetch(`${API_BASE}/api/teacher/certificates/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
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

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="cert-backdrop" onClick={e => e.target === e.currentTarget && step !== 2 && onClose()}>
      <div className="cert-modal">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 800, color: C.text }}>
              Upload Certificate
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
              Attach a certificate file to a student
            </p>
          </div>
          {step !== 2 && (
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: C.textLight, fontSize: 16, fontWeight: 700, flexShrink: 0,
            }}>×</button>
          )}
        </div>

        {/* Step 2 – uploading */}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: `${C.mist}55`,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <Loader2 size={24} color={C.slate} style={{ animation: "spin 0.8s linear infinite" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 6px", fontFamily: "'Inter', sans-serif" }}>Uploading certificate…</p>
            <p style={{ fontSize: 12, color: C.textLight, margin: "0 0 20px", fontFamily: "'Inter', sans-serif" }}>Please wait</p>
            <div style={{ background: C.bg, borderRadius: 99, height: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: `linear-gradient(90deg, ${C.sky}, ${C.deep})`,
                width: `${progress}%`, transition: "width 0.3s ease",
              }} />
            </div>
            <p style={{ fontSize: 11, color: C.textLight, marginTop: 8, fontFamily: "'Inter', sans-serif" }}>{progress}%</p>
          </div>
        )}

        {/* Step 3 – done */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "#F0FDF4",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <CheckCircle2 size={24} color="#22c55e" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, fontFamily: "'Inter', sans-serif" }}>Uploaded successfully!</p>
          </div>
        )}

        {/* Step 1 – form */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Error */}
            {formError && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                borderRadius: 10, background: "#fee8e8", border: "1px solid #f5b0b0",
                fontSize: 12, color: "#8b1c1c", animation: "shake 0.35s ease",
                fontFamily: "'Inter', sans-serif",
              }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} /><span>{formError}</span>
              </div>
            )}

            {/* Student */}
            <div style={{ position: "relative" }}>
              <label className="cert-lbl">Student *</label>
              {form.studentId ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 12,
                  border: "1.5px solid #86efac", background: "#f0fdf4",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <User size={13} color="#16a34a" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>{form.studentName}</span>
                  </div>
                  <button onClick={() => set("studentId", "") || set("studentName", "")}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                    <X size={13} color="#16a34a" />
                  </button>
                </div>
              ) : (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: C.bg, border: `1.5px solid ${C.border}`,
                    borderRadius: 12, padding: "0 14px", height: 42,
                  }}>
                    <Search size={13} color={C.textLight} style={{ flexShrink: 0 }} />
                    <input
                      value={studentSearch}
                      onChange={e => { setStudentSearch(e.target.value); setDropOpen(true); }}
                      onFocus={() => setDropOpen(true)}
                      placeholder="Search student by name or roll number…"
                      style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: C.text, width: "100%", fontFamily: "'Inter', sans-serif" }}
                    />
                    {loadingStudents && <Loader2 size={13} color={C.textLight} style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
                  </div>
                  {dropOpen && students.length > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                      background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12,
                      boxShadow: "0 8px 24px rgba(56,73,89,0.12)", maxHeight: 200, overflowY: "auto",
                    }}>
                      {students.map(s => (
                        <div
                          key={s.id}
                          onClick={() => { setForm(f => ({ ...f, studentId: s.id, studentName: s.name })); setStudentSearch(""); setDropOpen(false); }}
                          style={{
                            padding: "9px 14px", cursor: "pointer",
                            borderBottom: `1px solid ${C.borderLight}`,
                            display: "flex", alignItems: "center", gap: 10,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = C.bg}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{
                            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                            background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: C.white, fontFamily: "'Inter', sans-serif",
                          }}>
                            {s.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0, fontFamily: "'Inter', sans-serif" }}>{s.name}</p>
                            <p style={{ fontSize: 10, color: C.textLight, margin: 0, fontFamily: "'Inter', sans-serif" }}>
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
                      background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12,
                      padding: "12px", textAlign: "center",
                      boxShadow: "0 8px 24px rgba(56,73,89,0.12)",
                    }}>
                      <p style={{ fontSize: 12, color: C.textLight, margin: 0, fontFamily: "'Inter', sans-serif" }}>No students found</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="cert-lbl">Certificate Title *</label>
              <input className="cert-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Best Student Award, State Level Chess Winner…" />
            </div>

            {/* Category + Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="cert-lbl">Category *</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.category}
                    onChange={e => set("category", e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 12,
                      border: `1.5px solid ${C.border}`, fontFamily: "'Inter', sans-serif",
                      fontSize: 13, color: C.text, background: C.bg, outline: "none", cursor: "pointer", appearance: "none",
                    }}
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <ChevronDown size={12} color={C.textLight} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </div>
              <div>
                <label className="cert-lbl">Issue Date *</label>
                <input className="cert-input" type="date" value={form.issuedDate} onChange={e => set("issuedDate", e.target.value)} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="cert-lbl">Description <span style={{ fontWeight: 400, color: C.textLight }}>(optional)</span></label>
              <textarea
                className="cert-input"
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Any additional notes about this certificate…"
                rows={2}
                style={{ height: "auto", padding: "10px 14px", resize: "vertical", minHeight: 68 }}
              />
            </div>

            {/* Drop zone */}
            <div>
              <label className="cert-lbl">
                Certificate File * <span style={{ fontWeight: 400, color: C.textLight }}>(PDF, JPG, PNG — max 10 MB)</span>
              </label>
              <div
                ref={dropRef}
                className={`cert-drop ${file ? "has-file" : ""}`}
                style={{ padding: "22px 18px", textAlign: "center" }}
                onDragOver={e => { e.preventDefault(); if (!dragRef.current) { dragRef.current = true; dropRef.current?.classList.add("over"); } }}
                onDragLeave={() => { dragRef.current = false; dropRef.current?.classList.remove("over"); }}
                onDrop={e => { e.preventDefault(); dragRef.current = false; dropRef.current?.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) validateFile(f); }}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) validateFile(f); }} />
                {file ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {file.type.startsWith("image/") ? <ImageIcon size={16} color="#16A34A" /> : <FileText size={16} color="#16A34A" />}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#166534", margin: 0, fontFamily: "'Inter', sans-serif" }}>{file.name}</p>
                      <p style={{ fontSize: 11, color: "#16a34a", margin: 0, fontFamily: "'Inter', sans-serif" }}>{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", padding: 4 }}>
                      <X size={13} color="#16a34a" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: C.white, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                      <CloudUpload size={18} color={C.textLight} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 3px", fontFamily: "'Inter', sans-serif" }}>
                      Drop file here or <span style={{ color: C.sky }}>browse</span>
                    </p>
                    <p style={{ fontSize: 11, color: C.textLight, margin: 0, fontFamily: "'Inter', sans-serif" }}>PDF, JPG, PNG, WebP up to 10 MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${C.border}`,
                background: C.white, color: C.textLight, fontFamily: "'Inter', sans-serif",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleSubmit} style={{
                flex: 2, padding: "10px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                color: C.white, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <CloudUpload size={14} /> Upload Certificate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ cert, onConfirm, onClose, loading }) {
  return (
    <Modal title="Delete Certificate?" onClose={onClose}>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
        This will permanently delete <strong style={{ color: C.text }}>{cert?.title}</strong>{" "}
        for <strong style={{ color: C.text }}>{cert?.studentName}</strong>. This cannot be undone.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} disabled={loading} style={{
          flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${C.border}`,
          background: C.white, color: C.textLight, fontFamily: "'Inter', sans-serif",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Keep</button>
        <button onClick={onConfirm} disabled={loading} style={{
          flex: 1, padding: "10px", borderRadius: 12, border: "none",
          background: "#c0392b", color: C.white, fontFamily: "'Inter', sans-serif",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {loading ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> : <Trash2 size={14} />}
          Delete
        </button>
      </div>
    </Modal>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ cert, onClose }) {
  const isImage = cert?.fileType?.startsWith("image/");
  return (
    <div className="cert-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`,
        width: "100%", maxWidth: 680, maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(56,73,89,0.22)", animation: "fadein 0.2s ease",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${C.borderLight}`, flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0, fontFamily: "'Inter', sans-serif" }}>{cert.title}</p>
            <p style={{ fontSize: 11, color: C.textLight, margin: 0, fontFamily: "'Inter', sans-serif" }}>{cert.studentName} · {cert.academicYear}</p>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.textLight, fontSize: 16, fontWeight: 700,
          }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {cert.fileUrl ? (
            isImage
              ? <img src={cert.fileUrl} alt={cert.title} style={{ width: "100%", borderRadius: 12, objectFit: "contain" }} />
              : <iframe src={cert.fileUrl} title={cert.title} style={{ width: "100%", height: 480, border: "none", borderRadius: 12 }} />
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <FileText size={32} color={C.textLight} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: C.textLight, margin: 0, fontFamily: "'Inter', sans-serif" }}>Preview not available</p>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.borderLight}`, flexShrink: 0 }}>
          <a
            href={cert.fileUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
              color: C.white, textDecoration: "none", fontFamily: "'Inter', sans-serif",
            }}
          >
            <ExternalLink size={13} /> Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CertificatesUploadPage() {
  const token = getToken();

  const [certs, setCerts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pageError, setPageError]   = useState("");
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("ALL");
  const [showUpload, setShowUpload] = useState(false);
  const [deletingCert, setDeletingCert] = useState(null);
  const [deleteLoad, setDeleteLoad] = useState(false);
  const [viewingCert, setViewingCert] = useState(null);
  const [toast, setToast]           = useState(null);

  const fetchCerts = useCallback(async () => {
    setLoading(true); setPageError("");
    try {
      const res = await fetch(`${API_BASE}/api/teacher/certificates`, {
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
        method: "DELETE",
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

  const filtered = certs.filter(c => {
    const matchSearch = !search
      || c.studentName?.toLowerCase().includes(search.toLowerCase())
      || c.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "ALL" || c.category === catFilter;
    return matchSearch && matchCat;
  });

  // Stats
  const stats = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = certs.filter(c => c.category === cat.value).length;
    return acc;
  }, {});

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{STYLES}</style>

      <div style={{
        padding: "clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)",
        minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── Header (mirrors OnlineClassesPage exactly) ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 4, height: 28, borderRadius: 99,
                background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0,
              }} />
              <div>
                <h1 style={{
                  margin: 0, fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 800,
                  color: C.text, letterSpacing: "-0.5px",
                }}>
                  Certificates
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                  Upload and manage student certificates
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
                borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                color: C.white, fontFamily: "'Inter', sans-serif",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              <Plus size={15} /> Upload Certificate
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {pageError && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
            borderRadius: 12, background: "#fee8e8", border: "1px solid #f5b0b0",
            marginBottom: 16, fontSize: 13, color: "#8b1c1c",
            fontFamily: "'Inter', sans-serif",
          }}>
            <AlertCircle size={14} /><span>{pageError}</span>
          </div>
        )}

        {/* ── Stats row ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 12, marginBottom: 20,
        }} className="fade-up">
          {/* Total */}
          <div style={{
            background: C.white, borderRadius: 14, padding: "14px 16px",
            border: `1.5px solid ${C.borderLight}`, borderLeft: `4px solid ${C.sky}`,
            boxShadow: "0 2px 8px rgba(56,73,89,0.05)",
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textLight, margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>Total</p>
            {loading ? <Sk h={28} w="50%" /> : <p style={{ fontSize: 26, fontWeight: 900, color: C.text, margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>{certs.length}</p>}
          </div>
          {CATEGORIES.slice(0, 3).map(cat => (
            <div key={cat.value} style={{
              background: C.white, borderRadius: 14, padding: "14px 16px",
              border: `1.5px solid ${C.borderLight}`, borderLeft: `4px solid ${cat.color}`,
              boxShadow: "0 2px 8px rgba(56,73,89,0.05)",
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textLight, margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>{cat.label}</p>
              {loading ? <Sk h={28} w="40%" /> : <p style={{ fontSize: 26, fontWeight: 900, color: C.text, margin: 0, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>{stats[cat.value] ?? 0}</p>}
            </div>
          ))}
        </div>

        {/* ── Search bar ── */}
        <div style={{
          background: C.white, borderRadius: 12, border: `1.5px solid ${C.borderLight}`,
          padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8,
        }} className="fade-up">
          <Search size={13} color={C.textLight} style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name or certificate title…"
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 13, color: C.text, width: "100%", fontFamily: "'Inter', sans-serif",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
              <X size={13} color={C.textLight} />
            </button>
          )}
        </div>

        {/* ── Filter tabs (identical pattern to OnlineClassesPage) ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }} className="fade-up">
          {["ALL", ...CATEGORIES.map(c => c.value)].map(v => (
            <button
              key={v}
              className="filter-btn"
              onClick={() => setCatFilter(v)}
              style={{
                padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${catFilter === v ? C.deep : C.border}`,
                background: catFilter === v ? C.deep : C.white,
                color: catFilter === v ? C.white : C.textLight,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              {v === "ALL" ? "All" : CAT_MAP[v]?.label}
            </button>
          ))}
        </div>

        {/* ── Result count ── */}
        {!loading && !pageError && (
          <p style={{ fontSize: 12, fontWeight: 600, color: C.textLight, margin: "0 0 14px", fontFamily: "'Inter', sans-serif" }}>
            Showing {filtered.length} of {certs.length} certificate{certs.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="cert-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`,
                padding: 18, display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <Sk h={42} w={42} r={12} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <Sk h={13} w="65%" /><Sk h={10} w="45%" />
                  </div>
                </div>
                <Sk h={10} w="80%" /><Sk h={10} w="60%" /><Sk h={10} w="50%" />
                <div style={{ height: 1, background: C.borderLight }} />
                <Sk h={36} r={10} />
              </div>
            ))}
          </div>

        ) : !pageError && filtered.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "60px 0", gap: 12,
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18, background: `${C.mist}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Medal size={26} color={C.slate} />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.deep, fontFamily: "'Inter', sans-serif" }}>
              {certs.length === 0 ? "No certificates yet" : "No certificates found"}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
              {search || catFilter !== "ALL"
                ? "Try adjusting your search or filters."
                : "Upload a certificate to get started."}
            </p>
            {certs.length === 0 && (
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "10px 20px",
                  borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                  color: C.white, fontFamily: "'Inter', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4,
                }}
              >
                <Plus size={15} /> Upload First Certificate
              </button>
            )}
          </div>

        ) : (
          <div className="cert-grid fade-up">
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