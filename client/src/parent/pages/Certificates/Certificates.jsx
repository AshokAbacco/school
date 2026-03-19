// client/src/parent/pages/Certificates.jsx
// ═══════════════════════════════════════════════════════════════
//  Parent Portal — Certificates
//  Design: 1:1 copy of student CertificatesPage.jsx
//  Differences from student version:
//    1. No <PageLayout> wrapper (Routes.jsx handles layout)
//    2. Fetches children from /api/parent/students on mount
//    3. ChildSelector shown when parent has > 1 child
//    4. All data fetched from /api/parent/certificates?studentId=
//    5. Re-fetches everything when selected child changes
//    6. Reuses CertificateDesign directly from student folder
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import { CertificateDesign } from "./Certificatedesigns";
import { getToken } from "../../../auth/storage.js";
import { Medal, X, Search, Loader2, AlertCircle, Download, FileText } from "lucide-react";

// ─── Design tokens (identical to student) ────────────────────
const C = {
    dark: "#384959",
    mid: "#6A89A7",
    light: "#88BDF2",
    pale: "#BDDDFC",
    bg: "#EDF3FA",
    white: "#ffffff",
    border: "rgba(136,189,242,0.30)",
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

// ─── Filter constants (identical to student) ─────────────────
const SOURCES = ["All", "Teacher Award", "Activity Award", "Achievement"];
const CATEGORIES = ["All", "Academic", "Attendance", "Sports", "Cultural", "Discipline", "Leadership", "Special"];
const SOURCE_MAP = { "Teacher Award": "MANUAL", "Activity Award": "EVENT", "Achievement": "CALCULATED" };
const CAT_MAP = {
    Academic: "ACADEMIC", Attendance: "ATTENDANCE", Sports: "SPORTS",
    Cultural: "CULTURAL", Discipline: "DISCIPLINE", Leadership: "LEADERSHIP", Special: "SPECIAL",
};
const CAT_STYLE = {
    ACADEMIC: { bg: "#EFF6FF", color: "#1D4ED8", icon: "🎓" },
    ATTENDANCE: { bg: "#F0FDF4", color: "#16A34A", icon: "✅" },
    SPORTS: { bg: "#FFF7ED", color: "#EA580C", icon: "🏆" },
    CULTURAL: { bg: "#FDF4FF", color: "#9333EA", icon: "🎭" },
    DISCIPLINE: { bg: "#F8FAFC", color: "#475569", icon: "🛡️" },
    LEADERSHIP: { bg: "#FFFBEB", color: "#B45309", icon: "👑" },
    SPECIAL: { bg: "#F5F3FF", color: "#7C3AED", icon: "⭐" },
};
const SRC_STYLE = {
    MANUAL: { bg: "#F0FDF4", color: "#15803D", label: "Teacher Award", icon: "👨‍🏫" },
    EVENT: { bg: "#FFF7ED", color: "#C2410C", label: "Activity Award", icon: "🏅" },
    CALCULATED: { bg: "#EFF6FF", color: "#1D4ED8", label: "Achievement", icon: "⭐" },
};
const RESULT_LABEL = {
    WINNER: "🥇 1st Place", RUNNER_UP: "🥈 2nd Place", THIRD_PLACE: "🥉 3rd Place",
    PARTICIPATED: "🎖️ Participated", SPECIAL_AWARD: "🏅 Special",
};

// ─── CSS (identical to student) ──────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .cert-root, .cert-root * { font-family: 'Inter', sans-serif !important; box-sizing: border-box; }

  @keyframes cert-spin  { to { transform: rotate(360deg); } }
  @keyframes cert-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.45; } }
  @keyframes spin       { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

  .cert-sk { animation: cert-pulse 1.5s ease-in-out infinite; background: ${C.pale}; border-radius: 7px; }

  .cert-card {
    transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
    cursor: pointer;
  }
  .cert-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(56,73,89,0.12) !important;
    border-color: rgba(136,189,242,0.55) !important;
  }

  .cert-pill {
    transition: background 0.13s, color 0.13s, border-color 0.13s;
    cursor: pointer; border: none;
  }
  .cert-pill:hover { opacity: 0.82; }

  .cert-btn {
    transition: opacity 0.13s;
    cursor: pointer; border: none;
    font-family: 'Inter', sans-serif !important;
  }
  .cert-btn:hover { opacity: 0.85; }
  .cert-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .cert-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 1100px) { .cert-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 620px)  { .cert-grid { grid-template-columns: 1fr; gap: 12px; } }

  .cert-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  @media (max-width: 900px) { .cert-stat-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px) { .cert-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }

  .cert-page { padding: 24px 28px; }
  @media (max-width: 768px) { .cert-page { padding: 16px; } }
  @media (max-width: 480px) { .cert-page { padding: 12px 10px; } }

  .cert-filters-row { display: flex; flex-wrap: wrap; gap: 6px; }

  .cert-search {
    display: flex; align-items: center; gap: 8px;
    background: ${C.white}; border: 1.5px solid ${C.border};
    border-radius: 10px; padding: 0 13px; height: 38px;
    width: 100%;
  }
  .cert-search input {
    border: none; outline: none; background: transparent;
    font-size: 13px; color: ${C.dark}; width: 100%;
    font-family: 'Inter', sans-serif !important;
  }
  .cert-search input::placeholder { color: ${C.mid}; }

  .cert-line-clamp2 {
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }

  /* Child selector scrollbar */
  .child-scroll::-webkit-scrollbar { display: none; }
  .child-scroll { scrollbar-width: none; }
`;

// ─── Primitives ───────────────────────────────────────────────
const Sk = ({ h = 14, w = "100%", r = 6 }) => (
    <div className="cert-sk" style={{ height: h, width: w, borderRadius: r }} />
);

function Pill({ label, active, onClick }) {
    return (
        <button
            className="cert-pill"
            onClick={onClick}
            style={{
                padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: active ? C.dark : C.white,
                color: active ? C.white : C.mid,
                border: `1.5px solid ${active ? C.dark : C.border}`,
            }}
        >
            {label}
        </button>
    );
}

function StatCard({ icon, label, value, color, loading }) {
    return (
        <div style={{
            background: C.white, borderRadius: 12, padding: "16px 18px",
            border: `1px solid ${C.border}`, borderLeftWidth: 4, borderLeftColor: color,
            position: "relative", overflow: "hidden",
        }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.mid, margin: 0 }}>
                    {label}
                </p>
                <span style={{ fontSize: 20, opacity: 0.22, lineHeight: 1 }}>{icon}</span>
            </div>
            <div style={{ marginTop: 10 }}>
                {loading
                    ? <><Sk h={32} w="55%" /><div style={{ marginTop: 7 }}><Sk h={11} w="40%" /></div></>
                    : <p style={{ fontSize: 32, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1 }}>{value}</p>
                }
            </div>
        </div>
    );
}

function CertCard({ cert, onView }) {
    const cat = CAT_STYLE[cert.category] ?? { bg: "#F3F4F6", color: "#6B7280", icon: "🏅" };
    const src = SRC_STYLE[cert.source] ?? { bg: "#F3F4F6", color: "#6B7280", label: cert.source, icon: "📄" };

    return (
        <div
            className="cert-card"
            onClick={() => onView(cert)}
            style={{
                background: C.white, borderRadius: 12,
                border: `1px solid ${C.border}`,
                boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
                overflow: "hidden",
            }}
        >
            <div style={{ height: 4, background: cat.color }} />
            <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: cat.bg, color: cat.color }}>
                        {cat.icon} {cert.category?.charAt(0) + cert.category?.slice(1).toLowerCase()}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: src.bg, color: src.color }}>
                        {src.icon} {src.label}
                    </span>
                    {cert.resultType && cert.resultType !== "PARTICIPATED" && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "#FEF9C3", color: "#92400E" }}>
                            {RESULT_LABEL[cert.resultType] ?? cert.resultType}
                        </span>
                    )}
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.dark, margin: "0 0 5px", lineHeight: 1.3 }}>
                    {cert.title}
                </p>
                {cert.description && (
                    <p className="cert-line-clamp2" style={{ fontSize: 12, color: C.mid, margin: "0 0 7px", lineHeight: 1.5 }}>
                        {cert.description}
                    </p>
                )}
                {cert.eventName && (
                    <p style={{ fontSize: 11, color: C.mid, margin: "0 0 5px" }}>📅 {cert.eventName}</p>
                )}
                <p style={{ fontSize: 11, color: C.mid, margin: "0 0 12px" }}>
                    🗓️ {new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <div style={{ height: 1, background: C.border, margin: "0 0 12px" }} />
                <button
                    className="cert-btn"
                    onClick={e => { e.stopPropagation(); onView(cert); }}
                    style={{
                        width: "100%", padding: "8px 0", borderRadius: 9,
                        background: C.dark, color: C.white,
                        fontSize: 12, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                >
                    <FileText size={12} /> View Certificate
                </button>
            </div>
        </div>
    );
}

// ─── Certificate Modal (identical to student) ─────────────────
function CertificateModal({ selected, student, school, onClose }) {
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        const h = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const handlePrint = useCallback(() => {
        setPrinting(true);
        setTimeout(() => { window.print(); setPrinting(false); }, 150);
    }, []);

    const scale = Math.min(1, (Math.min(window.innerWidth * 0.88, 820)) / 794);

    return (
        <>
            <div id="cert-printable" style={{
                position: "fixed", top: 0, left: 0,
                width: 794, height: 562,
                overflow: "hidden", visibility: "hidden",
                pointerEvents: "none", zIndex: -1,
            }}>
                <CertificateDesign cert={selected} student={student} school={school} />
            </div>

            <div
                style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(20,28,40,0.88)",
                    backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "24px 16px", overflowY: "auto",
                }}
                onClick={onClose}
            >
                <div
                    style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
                    onClick={e => e.stopPropagation()}
                >
                    <button onClick={onClose} style={{
                        position: "absolute", top: -16, right: -16, zIndex: 10,
                        width: 36, height: 36, borderRadius: "50%", background: C.white,
                        border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                    }}>
                        <X size={16} color={C.dark} />
                    </button>

                    <div style={{
                        width: 794 * scale, height: 562 * scale,
                        overflow: "hidden", borderRadius: 8,
                        boxShadow: "0 32px 80px rgba(0,0,0,0.6)", flexShrink: 0,
                    }}>
                        <div style={{ width: 794, height: 562, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
                            <CertificateDesign cert={selected} student={student} school={school} />
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                        <button onClick={handlePrint} disabled={printing} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "10px 24px", borderRadius: 12,
                            background: C.white, color: C.dark, border: "none",
                            cursor: printing ? "not-allowed" : "pointer",
                            fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.3)", opacity: printing ? 0.7 : 1,
                        }}>
                            {printing
                                ? <><Loader2 size={15} style={{ animation: "cert-spin 1s linear infinite" }} /> Preparing…</>
                                : <><Download size={15} /> Download PDF</>}
                        </button>
                        <button onClick={onClose} style={{
                            padding: "10px 20px", borderRadius: 12,
                            background: "rgba(255,255,255,0.08)", color: C.pale,
                            border: "1.5px solid rgba(255,255,255,0.15)",
                            cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
                        }}>
                            Close
                        </button>
                    </div>

                    <p style={{ fontSize: 11, color: "rgba(189,221,252,0.55)", textAlign: "center", maxWidth: 420, fontFamily: "'Inter', sans-serif" }}>
                        In the print dialog → set <strong style={{ color: C.pale }}>Destination: Save as PDF</strong> → enable <strong style={{ color: C.pale }}>Background graphics</strong> → Save
                    </p>
                </div>
            </div>

            <style>{`
        @keyframes cert-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media print {
          * { visibility: hidden !important; }
          #cert-printable, #cert-printable * { visibility: visible !important; }
          #cert-printable {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 794px !important; height: 562px !important;
            overflow: visible !important; z-index: 99999 !important; transform: none !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          @page { size: 794px 562px; margin: 0mm; }
        }
      `}</style>
        </>
    );
}

// ─── Child Selector ───────────────────────────────────────────
function initials(name = "") {
    return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function ChildSelector({ children, selectedId, onChange }) {
    if (!children || children.length <= 1) return null;
    return (
        <div style={{ marginBottom: 18 }}>
            <p style={{
                margin: "0 0 9px", fontSize: 11, fontWeight: 800, color: C.mid,
                textTransform: "uppercase", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif",
            }}>
                Select Child
            </p>
            <div className="child-scroll" style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 3 }}>
                {children.map((child) => {
                    const active = child.studentId === selectedId;
                    return (
                        <button
                            key={child.studentId}
                            onClick={() => onChange(child.studentId)}
                            style={{
                                flexShrink: 0, display: "flex", alignItems: "center", gap: 9,
                                padding: "8px 13px", borderRadius: 13, outline: "none", cursor: "pointer",
                                border: active ? `1.5px solid ${C.light}` : `1.5px solid ${C.border}`,
                                background: active ? "rgba(136,189,242,0.14)" : C.white,
                                transition: "all 0.15s",
                                boxShadow: active ? "0 2px 10px rgba(136,189,242,0.22)" : "none",
                                fontFamily: "'Inter',sans-serif",
                            }}
                        >
                            <div style={{
                                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                                background: active
                                    ? `linear-gradient(135deg, ${C.light}, ${C.dark})`
                                    : `linear-gradient(135deg, ${C.pale}, #c8ddf0)`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 900,
                                color: active ? C.white : C.mid, overflow: "hidden",
                            }}>
                                {child.profileImage
                                    ? <img src={child.profileImage} alt={child.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    : initials(child.name)}
                            </div>
                            <div style={{ textAlign: "left" }}>
                                <p style={{
                                    margin: 0, fontSize: 13, fontWeight: active ? 700 : 500,
                                    color: active ? C.dark : C.mid, whiteSpace: "nowrap",
                                }}>
                                    {child.name}
                                </p>
                                {child.className && (
                                    <p style={{ margin: 0, fontSize: 10, color: C.mid, fontWeight: 500 }}>{child.className}</p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN — No <PageLayout> (Routes.jsx handles layout)
// ═══════════════════════════════════════════════════════════════
export default function ParentCertificates() {
    // ── Children ─────────────────────────────────────────────────
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [loadingChildren, setLoadingChildren] = useState(true);
    const [errorChildren, setErrorChildren] = useState(null);

    // ── Certificates data ─────────────────────────────────────────
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [srcFilter, setSrc] = useState("All");
    const [catFilter, setCat] = useState("All");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);

    // 1. Load children on mount
    useEffect(() => {
        (async () => {
            setLoadingChildren(true); setErrorChildren(null);
            try {
                const res = await fetch(`${API_BASE}/api/parent/students`, {
                    credentials: "include",
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.message ?? "Failed to load students");
                const raw = Array.isArray(json.data) ? json.data : (json.data?.students ?? []);
                const list = raw.map((s) => ({
                    studentId: s.id,
                    name: s.personalInfo
                        ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`.trim()
                        : s.name,
                    className: s.enrollments?.[0]?.classSection?.name
                        ?? s.enrollment?.className ?? null,
                    profileImage: s.personalInfo?.profileImage ?? null,
                }));
                setChildren(list);
                if (list.length > 0) setSelectedChild(list[0].studentId);
            } catch (e) {
                setErrorChildren(e.message);
            } finally {
                setLoadingChildren(false);
            }
        })();
    }, []);

    // 2. Load certificates when child changes
    useEffect(() => {
        if (!selectedChild) return;
        let cancelled = false;
        setLoading(true); setError(null); setPageData(null);
        setSrc("All"); setCat("All"); setSearch("");

        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/parent/certificates?studentId=${selectedChild}`, {
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                if (!res.ok) throw new Error(`Server error ${res.status}`);
                const json = await res.json();
                if (!cancelled) setPageData(json.data);
            } catch (e) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [selectedChild]);

    // ── Derived ───────────────────────────────────────────────────
    const certs = pageData?.certificates ?? [];
    const filtered = certs.filter(c => {
        const srcOk = srcFilter === "All" || c.source === SOURCE_MAP[srcFilter];
        const catOk = catFilter === "All" || c.category === CAT_MAP[catFilter];
        const srchOk = !search.trim()
            || c.title?.toLowerCase().includes(search.toLowerCase())
            || c.description?.toLowerCase().includes(search.toLowerCase())
            || c.eventName?.toLowerCase().includes(search.toLowerCase());
        return srcOk && catOk && srchOk;
    });

    const stats = pageData?.stats ?? {};
    const student = pageData?.student ?? {};
    const school = pageData?.school ?? {};
    const activeChild = children.find(c => c.studentId === selectedChild);

    return (
        <>
            <style>{STYLE}</style>

            <div className="cert-root cert-page" style={{ minHeight: "100vh", background: C.bg }}>

                {/* ── Loading children ── */}
                {loadingChildren && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                        <Loader2 size={28} color={C.mid} style={{ animation: "spin 0.9s linear infinite" }} />
                    </div>
                )}

                {/* ── Error loading children ── */}
                {!loadingChildren && errorChildren && (
                    <div style={{
                        background: "#fef2f2", border: "1.5px solid #fca5a5",
                        borderRadius: 10, padding: "12px 16px",
                        display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
                    }}>
                        <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", margin: 0 }}>{errorChildren}</p>
                    </div>
                )}

                {!loadingChildren && !errorChildren && (
                    <>
                        {/* ── Child Selector ── */}
                        <ChildSelector
                            children={children}
                            selectedId={selectedChild}
                            onChange={(id) => setSelectedChild(id)}
                        />

                        {/* ── No child ── */}
                        {!selectedChild && (
                            <div style={{
                                background: C.white, borderRadius: 12,
                                border: `1px solid ${C.border}`,
                                padding: "64px 20px", textAlign: "center",
                            }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: "50%",
                                    background: C.bg, border: `1.5px solid ${C.border}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    margin: "0 auto 14px",
                                }}>
                                    <Medal size={22} color={C.mid} />
                                </div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>No Child Selected</p>
                                <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>Select a child above to view their certificates.</p>
                            </div>
                        )}

                        {selectedChild && (
                            <>
                                {/* ── Page title ── */}
                                <div style={{
                                    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                    flexWrap: "wrap", gap: 12, marginBottom: 22,
                                }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        <div style={{ width: 4, height: 48, background: C.dark, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.dark, margin: 0, lineHeight: 1.1 }}>
                                                Certificates
                                            </h1>
                                            <p style={{ fontSize: 12, color: C.mid, margin: "4px 0 0", fontWeight: 500 }}>
                                                {loading ? "Loading…" : (
                                                    <>
                                                        {activeChild?.name ?? student.firstName}
                                                        {student.classSection ? ` · ${student.classSection}` : ""}
                                                        {student.academicYear ? ` · ${student.academicYear}` : ""}
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    {loading && (
                                        <Loader2 size={20} color={C.mid} style={{ animation: "cert-spin 0.7s linear infinite", marginTop: 6 }} />
                                    )}
                                </div>

                                {/* ── Error ── */}
                                {error && (
                                    <div style={{
                                        background: "#fef2f2", border: "1.5px solid #fca5a5",
                                        borderRadius: 10, padding: "12px 16px",
                                        display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
                                    }}>
                                        <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                                        <p style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", margin: 0 }}>{error}</p>
                                    </div>
                                )}

                                {/* ── Stat cards ── */}
                                <div className="cert-stat-grid">
                                    <StatCard icon="🏅" label="Total" value={stats.total ?? 0} color={C.light} loading={loading} />
                                    <StatCard icon="👨‍🏫" label="Teacher Awards" value={stats.manual ?? 0} color="#0EA5E9" loading={loading} />
                                    <StatCard icon="🏆" label="Activity Awards" value={stats.event ?? 0} color="#F59E0B" loading={loading} />
                                    <StatCard icon="⭐" label="Achievements" value={stats.calculated ?? 0} color="#a855f7" loading={loading} />
                                </div>

                                {/* ── Filters ── */}
                                <div style={{
                                    background: C.white, borderRadius: 12,
                                    border: `1px solid ${C.border}`,
                                    padding: "16px 18px", marginBottom: 18,
                                    display: "flex", flexDirection: "column", gap: 12,
                                }}>
                                    <div className="cert-search">
                                        <Search size={13} color={C.mid} style={{ flexShrink: 0 }} />
                                        <input
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder="Search certificates…"
                                        />
                                        {search && (
                                            <button
                                                onClick={() => setSearch("")}
                                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                                            >
                                                <X size={13} color={C.mid} />
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.mid, margin: "0 0 7px" }}>
                                            Source
                                        </p>
                                        <div className="cert-filters-row">
                                            {SOURCES.map(s => (
                                                <Pill key={s} label={s} active={srcFilter === s} onClick={() => setSrc(s)} />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.mid, margin: "0 0 7px" }}>
                                            Category
                                        </p>
                                        <div className="cert-filters-row">
                                            {CATEGORIES.map(c => (
                                                <Pill key={c} label={c} active={catFilter === c} onClick={() => setCat(c)} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Result count ── */}
                                {!loading && !error && (
                                    <p style={{ fontSize: 12, fontWeight: 600, color: C.mid, margin: "0 0 14px" }}>
                                        Showing {filtered.length} of {certs.length} certificate{certs.length !== 1 ? "s" : ""}
                                    </p>
                                )}

                                {/* ── Certificate grid ── */}
                                {loading ? (
                                    <div className="cert-grid">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                                                <div className="cert-sk" style={{ height: 4, borderRadius: 0 }} />
                                                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        <Sk h={20} w={80} r={20} /><Sk h={20} w={70} r={20} />
                                                    </div>
                                                    <Sk h={16} w="75%" />
                                                    <Sk h={11} w="55%" />
                                                    <Sk h={11} w="40%" />
                                                    <div style={{ height: 1, background: C.border }} />
                                                    <Sk h={34} r={9} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                ) : !error && filtered.length === 0 ? (
                                    <div style={{
                                        background: C.white, borderRadius: 12,
                                        border: `1px solid ${C.border}`,
                                        padding: "64px 20px", textAlign: "center",
                                    }}>
                                        <div style={{
                                            width: 56, height: 56, borderRadius: "50%",
                                            background: C.bg, border: `1.5px solid ${C.border}`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            margin: "0 auto 14px",
                                        }}>
                                            <Medal size={22} color={C.mid} />
                                        </div>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>No Certificates Found</p>
                                        <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>
                                            {search || srcFilter !== "All" || catFilter !== "All"
                                                ? "Try adjusting your filters or search term."
                                                : "Certificates will appear here once issued."}
                                        </p>
                                        {certs.length === 0 && !search && (
                                            <div style={{ marginTop: 24 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 auto 14px", maxWidth: 260 }}>
                                                    <div style={{ flex: 1, height: 1, background: C.border }} />
                                                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.mid, margin: 0 }}>What to expect</p>
                                                    <div style={{ flex: 1, height: 1, background: C.border }} />
                                                </div>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                                                    {[
                                                        { icon: "👨‍🏫", label: "Teacher Awards" },
                                                        { icon: "🏆", label: "Activity Awards" },
                                                        { icon: "⭐", label: "Achievements" },
                                                        { icon: "📄", label: "PDF Download" },
                                                    ].map(({ icon, label }) => (
                                                        <div key={label} style={{
                                                            display: "flex", alignItems: "center", gap: 6,
                                                            padding: "6px 14px", borderRadius: 10,
                                                            border: `1px solid ${C.border}`, background: C.bg,
                                                            fontSize: 12, color: C.mid, fontWeight: 500,
                                                        }}>
                                                            <span style={{ fontSize: 14 }}>{icon}</span>
                                                            {label}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                ) : !error ? (
                                    <div className="cert-grid">
                                        {filtered.map(cert => (
                                            <CertCard key={cert.id} cert={cert} onView={setSelected} />
                                        ))}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal ── */}
            {selected && (
                <CertificateModal
                    selected={selected}
                    student={student}
                    school={school}
                    onClose={() => setSelected(null)}
                />
            )}
        </>
    );
}