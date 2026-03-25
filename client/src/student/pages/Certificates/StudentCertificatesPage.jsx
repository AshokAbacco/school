// client/src/student/pages/Certificates/StudentCertificatesPage.jsx
//
// A NEW separate certificates page for students.
// Route: /student/my-certificates
// The original commented-out CertificatesPage is preserved — this is independent.

import React, { useState, useEffect, useCallback } from "react";
import {
  Medal, Download, Eye, Search, X, FileText, ImageIcon,
  GraduationCap, Trophy, Users, CheckCircle2, Shield, Star,
  AlertCircle, Filter, Calendar, Award, ChevronRight, Sparkles,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}`;

const C = {
  dark:   "#384959",
  mid:    "#6A89A7",
  light:  "#88BDF2",
  pale:   "#BDDDFC",
  bg:     "#EDF3FA",
  white:  "#ffffff",
  border: "rgba(136,189,242,0.28)",
};

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

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .scp-root, .scp-root * { font-family:'DM Sans',sans-serif!important; box-sizing:border-box; }

  @keyframes scp-spin   { to{transform:rotate(360deg);} }
  @keyframes scp-fadein { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
  @keyframes scp-pulse  { 0%,100%{opacity:1;}50%{opacity:.4;} }
  @keyframes scp-float  { 0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);} }
  @keyframes scp-shine  { from{transform:translateX(-100%);}to{transform:translateX(100%);} }

  .scp-sk { animation:scp-pulse 1.5s ease-in-out infinite; background:${C.pale}; border-radius:7px; }

  .scp-card {
    transition: box-shadow .18s, transform .18s, border-color .18s;
    animation: scp-fadein .25s ease both;
  }
  .scp-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 36px rgba(56,73,89,.13)!important;
    border-color: rgba(136,189,242,.55)!important;
  }
  .scp-card .scp-actions { opacity:0; transition:opacity .15s; }
  .scp-card:hover .scp-actions { opacity:1; }

  .scp-btn {
    transition: opacity .13s, transform .1s;
    cursor:pointer; border:none;
    font-family:'DM Sans',sans-serif!important;
  }
  .scp-btn:hover:not(:disabled){ opacity:.87; transform:translateY(-1px); }
  .scp-btn:disabled{ opacity:.5; cursor:not-allowed; }

  .scp-pill {
    transition: background .13s, color .13s, border-color .13s;
    cursor:pointer; border:none;
    font-family:'DM Sans',sans-serif!important;
  }
  .scp-pill:hover{ opacity:.82; }

  .scp-search {
    display:flex; align-items:center; gap:8px;
    background:${C.white}; border:1.5px solid ${C.border};
    border-radius:10px; padding:0 13px; height:40px;
    transition:border-color .15s;
  }
  .scp-search:focus-within{ border-color:${C.light}; }
  .scp-search input{
    border:none; outline:none; background:transparent;
    font-size:13px; color:${C.dark}; width:100%;
    font-family:'DM Sans',sans-serif!important;
  }
  .scp-search input::placeholder{ color:${C.mid}; }

  .scp-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:16px;
  }
  @media(max-width:1100px){ .scp-grid{ grid-template-columns:repeat(2,1fr); } }
  @media(max-width:640px) { .scp-grid{ grid-template-columns:1fr; gap:12px; } }

  .scp-page{ padding:24px 28px; }
  @media(max-width:768px){ .scp-page{ padding:16px; } }
  @media(max-width:480px){ .scp-page{ padding:12px 10px; } }

  .scp-backdrop{
    position:fixed; inset:0; z-index:999;
    background:rgba(56,73,89,.6); backdrop-filter:blur(5px);
    display:flex; align-items:center; justify-content:center; padding:20px;
  }
  .scp-modal{
    background:${C.white}; border-radius:20px;
    width:100%; max-width:680px; max-height:92vh;
    display:flex; flex-direction:column;
    box-shadow:0 32px 80px rgba(56,73,89,.25);
    animation:scp-fadein .22s ease;
  }

  .scp-hero-badge{
    position:relative; overflow:hidden;
  }
  .scp-hero-badge::after{
    content:'';
    position:absolute; inset:0;
    background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%);
    animation:scp-shine 3s ease-in-out infinite;
  }

  .scp-float{ animation:scp-float 3.5s ease-in-out infinite; }
`;

const Sk = ({ h = 14, w = "100%", r = 6 }) => (
  <div className="scp-sk" style={{ height: h, width: w, borderRadius: r }} />
);

// ─── View / Download Modal ────────────────────────────────────────────────────
function ViewModal({ cert, onClose }) {
  const isImage = cert?.fileType?.startsWith("image/");
  const [imgError, setImgError] = useState(false);

  return (
    <div className="tc-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tc-root" style={{
        background: C.white, borderRadius: 18, width: "100%", maxWidth: 680,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(56,73,89,0.22)", animation: "tc-fadein 0.2s ease",
      }}>
        {/* header unchanged ... */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {cert.fileUrl && !imgError ? (
            isImage ? (
              <img
                src={cert.fileUrl}
                alt={cert.title}
                onError={() => setImgError(true)}
                style={{ width: "100%", borderRadius: 10, objectFit: "contain" }}
              />
            ) : (
              <iframe
                src={cert.fileUrl}
                title={cert.title}
                onError={() => setImgError(true)}
                style={{ width: "100%", height: 480, border: "none", borderRadius: 10 }}
              />
            )
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <FileText size={32} color={C.mid} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: C.mid, margin: "0 0 8px" }}>
                Preview unavailable — the file URL may have expired or be misconfigured.
              </p>
              {cert.fileUrl && (
                <a href={cert.fileUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: C.light }}>
                  Try opening directly →
                </a>
              )}
            </div>
          )}
        </div>
        {/* footer unchanged ... */}
      </div>
    </div>
  );
}

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertCard({ cert, onView, index }) {
  const cat     = CAT_MAP[cert.category] ?? { label: cert.category, color: C.mid, bg: C.bg, icon: Medal };
  const CatIcon = cat.icon;
  const isImage = cert.fileType?.startsWith("image/");
  const date    = cert.issuedDate
    ? new Date(cert.issuedDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
    : "—";

  return (
    <div
      className="scp-card"
      style={{
        background:C.white, borderRadius:14,
        border:`1px solid ${C.border}`,
        boxShadow:"0 2px 8px rgba(56,73,89,.05)",
        overflow:"hidden",
        animationDelay:`${index * 0.05}s`,
        position:"relative",
      }}
    >
      {/* Colour bar */}
      <div style={{ height:4, background:`linear-gradient(90deg,${cat.color},${cat.color}88)` }} />

      <div style={{ padding:"14px 16px" }}>
        {/* Badges */}
        <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:4,
            padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700,
            background:cat.bg, color:cat.color,
          }}>
            <CatIcon size={10} /> {cat.label}
          </span>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:4,
            padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700,
            background: isImage ? "#FFF7ED" : "#F0F9FF",
            color:      isImage ? "#C2410C" : "#0369A1",
          }}>
            {isImage ? <ImageIcon size={10} /> : <FileText size={10} />}
            {isImage ? "Image" : "PDF"}
          </span>
        </div>

        {/* Title */}
        <p style={{
          fontSize:14, fontWeight:700, color:C.dark, margin:"0 0 6px", lineHeight:1.35,
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
        }}>
          {cert.title ?? cert.achievementText ?? "Certificate"}
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:3, marginBottom:12 }}>
          <p style={{ fontSize:11, color:C.mid, margin:0, display:"flex", alignItems:"center", gap:4 }}>
            <Calendar size={10} /> {date}
          </p>
          <p style={{ fontSize:11, color:C.mid, margin:0, display:"flex", alignItems:"center", gap:4 }}>
            <Award size={10} /> {cert.academicYear}
          </p>
          {cert.description && (
            <p style={{
              fontSize:11, color:C.mid, margin:"2px 0 0",
              display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
            }}>
              {cert.description}
            </p>
          )}
        </div>

        <div style={{ height:1, background:C.border, margin:"0 0 12px" }} />

        {/* Actions */}
        <div style={{ display:"flex", gap:8 }}>
          <button
            className="scp-btn"
            onClick={() => onView(cert)}
            style={{
              flex:1, height:34, borderRadius:9, fontSize:12, fontWeight:600,
              background:C.bg, color:C.dark, border:`1.5px solid ${C.border}`,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}
          >
            <Eye size={13} color={C.mid} /> View
          </button>
          {cert.fileUrl && (
            <a
              href={cert.fileUrl}
              download
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                width:34, height:34, borderRadius:9,
                background:`linear-gradient(135deg,${C.light},${C.mid})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                textDecoration:"none", flexShrink:0,
                transition:"opacity .13s, transform .1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity=".85"; e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity="1";   e.currentTarget.style.transform="translateY(0)"; }}
            >
              <Download size={13} color={C.white} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentCertificatesPage() {
  const token = getToken();

  const [certs,       setCerts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("All");
  const [viewingCert, setViewingCert] = useState(null);

  const fetchCerts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/student/certificates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load certificates");
      const data = await res.json();
      setCerts(data.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const filtered = certs.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || c.title?.toLowerCase().includes(q)
      || c.achievementText?.toLowerCase().includes(q)
      || c.academicYear?.toLowerCase().includes(q);
    const matchCat = catFilter === "All" || c.category === catFilter;
    return matchSearch && matchCat;
  });

  const catCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = certs.filter(c => c.category === cat.value).length;
    return acc;
  }, {});

  return (
    <>
      <style>{STYLE}</style>
      <div className="scp-root scp-page" style={{ background:C.bg, minHeight:"100vh" }}>

        {/* ── Header ── */}
        <div style={{
          display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          marginBottom:24, flexWrap:"wrap", gap:12,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div
              className="scp-hero-badge"
              style={{
                width:46, height:46, borderRadius:13,
                background:`linear-gradient(135deg,${C.light},${C.mid})`,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                boxShadow:`0 4px 14px ${C.light}55`,
              }}
            >
              <Medal size={21} color={C.white} />
            </div>
            <div>
              <h1 style={{ fontSize:21, fontWeight:800, color:C.dark, margin:0, letterSpacing:-0.4 }}>
                My Certificates
              </h1>
              <p style={{ fontSize:12, color:C.mid, margin:"3px 0 0", fontWeight:500 }}>
                Your achievements and recognitions
              </p>
            </div>
          </div>

          {!loading && certs.length > 0 && (
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              padding:"6px 14px", borderRadius:20,
              background:`linear-gradient(135deg,${C.light}22,${C.pale}44)`,
              border:`1.5px solid ${C.border}`,
            }}>
              <Sparkles size={12} color={C.light} />
              <span style={{ fontSize:12, fontWeight:700, color:C.mid }}>
                {certs.length} certificate{certs.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:10,
            padding:"12px 16px", display:"flex", alignItems:"center", gap:10, marginBottom:18,
          }}>
            <AlertCircle size={15} color="#ef4444" style={{ flexShrink:0 }} />
            <p style={{ fontSize:13, fontWeight:600, color:"#991b1b", margin:0 }}>{error}</p>
          </div>
        )}

        {/* ── Stats ── */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",
          gap:12, marginBottom:20,
        }}>
          <div style={{
            background:C.white, borderRadius:12, padding:"14px 16px",
            border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.light}`,
          }}>
            <p style={{ fontSize:9, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:C.mid, margin:"0 0 8px" }}>Total</p>
            {loading ? <Sk h={28} w="50%" /> : (
              <p style={{ fontSize:28, fontWeight:900, color:C.dark, margin:0, lineHeight:1 }}>{certs.length}</p>
            )}
          </div>
          {CATEGORIES.slice(0,3).map(cat => (
            <div key={cat.value} style={{
              background:C.white, borderRadius:12, padding:"14px 16px",
              border:`1px solid ${C.border}`, borderLeft:`4px solid ${cat.color}`,
            }}>
              <p style={{ fontSize:9, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:C.mid, margin:"0 0 8px" }}>{cat.label}</p>
              {loading ? <Sk h={28} w="40%" /> : (
                <p style={{ fontSize:28, fontWeight:900, color:C.dark, margin:0, lineHeight:1 }}>{catCounts[cat.value] ?? 0}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{
          background:C.white, borderRadius:12, border:`1px solid ${C.border}`,
          padding:"14px 16px", marginBottom:18,
          display:"flex", flexDirection:"column", gap:10,
        }}>
          <div className="scp-search">
            <Search size={13} color={C.mid} style={{ flexShrink:0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or academic year…"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex" }}>
                <X size={13} color={C.mid} />
              </button>
            )}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
            <Filter size={11} color={C.mid} />
            {["All", ...CATEGORIES.map(c => c.value)].map(v => {
              const active = catFilter === v;
              return (
                <button
                  key={v}
                  className="scp-pill"
                  onClick={() => setCatFilter(v)}
                  style={{
                    padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600,
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

        {/* ── Count ── */}
        {!loading && !error && (
          <p style={{ fontSize:12, fontWeight:600, color:C.mid, margin:"0 0 14px" }}>
            Showing {filtered.length} of {certs.length} certificate{certs.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="scp-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden",
              }}>
                <div className="scp-sk" style={{ height:4, borderRadius:0 }} />
                <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <Sk h={20} w={70} r={20} />
                    <Sk h={20} w={50} r={20} />
                  </div>
                  <Sk h={16} w="80%" />
                  <Sk h={11} w="50%" />
                  <Sk h={11} w="40%" />
                  <div style={{ height:1, background:C.border }} />
                  <Sk h={34} r={9} />
                </div>
              </div>
            ))}
          </div>

        ) : !error && filtered.length === 0 ? (
          <div style={{
            background:C.white, borderRadius:14, border:`1px solid ${C.border}`,
            padding:"72px 20px", textAlign:"center",
          }}>
            <div className="scp-float" style={{
              width:64, height:64, borderRadius:"50%",
              background:`linear-gradient(135deg,${C.bg},${C.pale}55)`,
              border:`1.5px solid ${C.border}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 16px",
            }}>
              <Medal size={26} color={C.mid} />
            </div>
            <p style={{ fontSize:16, fontWeight:700, color:C.dark, margin:"0 0 8px" }}>
              {certs.length === 0 ? "No Certificates Yet" : "No Results Found"}
            </p>
            <p style={{ fontSize:12, color:C.mid, margin:"0 auto", maxWidth:280 }}>
              {search || catFilter !== "All"
                ? "Try clearing your filters to see all certificates."
                : "Certificates awarded to you will appear here once uploaded by your teacher."}
            </p>
            {(search || catFilter !== "All") && (
              <button
                className="scp-btn"
                onClick={() => { setSearch(""); setCatFilter("All"); }}
                style={{
                  marginTop:16, padding:"0 20px", height:38, borderRadius:10,
                  fontSize:12, fontWeight:600, background:C.bg, color:C.dark,
                  border:`1.5px solid ${C.border}`,
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

        ) : (
          <div className="scp-grid">
            {filtered.map((cert, i) => (
              <CertCard
                key={cert.id}
                cert={cert}
                index={i}
                onView={setViewingCert}
              />
            ))}
          </div>
        )}
      </div>

      {viewingCert && (
        <ViewModal cert={viewingCert} onClose={() => setViewingCert(null)} />
      )}
    </>
  );
}