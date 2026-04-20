// client/src/student/pages/Certificates/StudentCertificatesPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Medal,
  Download,
  Eye,
  Search,
  X,
  FileText,
  ImageIcon,
  GraduationCap,
  Trophy,
  Users,
  CheckCircle2,
  Shield,
  Star,
  AlertCircle,
  Filter,
  Calendar,
  Award,
  Sparkles,
  Inbox,
  Loader2,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}`;

// ── Design tokens — matches the OnlineClassesPage palette ──────
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

const CATEGORIES = [
  { value: "ACADEMIC", label: "Academic", icon: GraduationCap, color: "#1D4ED8", bg: "#EFF6FF" },
  { value: "SPORTS", label: "Sports", icon: Trophy, color: "#EA580C", bg: "#FFF7ED" },
  { value: "CULTURAL", label: "Cultural", icon: Users, color: "#9333EA", bg: "#FDF4FF" },
  { value: "ATTENDANCE", label: "Attendance", icon: CheckCircle2, color: "#16A34A", bg: "#F0FDF4" },
  { value: "DISCIPLINE", label: "Discipline", icon: Shield, color: "#475569", bg: "#F8FAFC" },
  { value: "LEADERSHIP", label: "Leadership", icon: Star, color: "#B45309", bg: "#FFFBEB" },
  { value: "SPECIAL", label: "Special", icon: Medal, color: "#7C3AED", bg: "#F5F3FF" },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

// ── Helpers ──────────────────────────────────────────────────

function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

function categoryBadge(category) {
  const cat = CAT_MAP[category] || { label: category, color: C.textLight, bg: C.bg };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 99,
        background: cat.bg,
        color: cat.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {cat.label}
    </span>
  );
}

function fileTypeBadge(isImage) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 99,
        background: isImage ? "#FFF7ED" : "#F0F9FF",
        color: isImage ? "#C2410C" : "#0369A1",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {isImage ? "Image" : "PDF"}
    </span>
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

// ── Skeleton card ────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 16,
        border: `1.5px solid ${C.borderLight}`,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <Pulse w={44} h={44} r={12} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Pulse w="60%" h={13} />
          <Pulse w="40%" h={10} />
        </div>
      </div>
      <Pulse w="100%" h={8} r={99} />
      <div style={{ height: 10 }} />
      <Pulse w="80%" h={10} />
    </div>
  );
}

// ── Meta Row helper (matches OnlineClassesPage) ───────────────
function MetaRow({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {icon}
      <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
        {label}
      </span>
    </div>
  );
}

// ── Modal wrapper (matches OnlineClassesPage) ────────────
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
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: `1px solid ${C.borderLight}`,
            flexShrink: 0,
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

// ── View Modal Content ─────────────────────────────────────────────────
function ViewModal({ cert, onClose }) {
  const isImage = cert?.fileType?.startsWith("image/");
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cat = CAT_MAP[cert.category] || {
    label: cert.category,
    color: C.textLight,
    bg: C.bg,
    icon: Medal,
  };
  const CatIcon = cat.icon;

  return (
    <Modal title={cert.title || "Certificate Details"} onClose={onClose}>
      {/* Meta info */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "12px 22px",
          borderBottom: `1px solid ${C.borderLight}`,
          flexWrap: "wrap",
          background: C.bg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {categoryBadge(cert.category)}
        </div>
        <MetaRow icon={<Calendar size={12} color={C.slate} />} label={fmtDate(cert.issuedDate)} />
        {cert.academicYear && (
          <MetaRow icon={<Award size={12} color={C.slate} />} label={cert.academicYear} />
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 22, flex: 1 }}>
        {cert.description && (
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 13,
              color: C.textLight,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {cert.description}
          </p>
        )}

        {cert.fileUrl && !imgErr ? (
          isImage ? (
            <img
              src={cert.fileUrl}
              alt={cert.title}
              onError={() => setImgErr(true)}
              style={{
                width: "100%",
                borderRadius: 10,
                border: `1px solid ${C.borderLight}`,
              }}
            />
          ) : (
            <object
              data={cert.fileUrl}
              type="application/pdf"
              style={{ width: "100%", height: "50vh", borderRadius: 10, border: "none" }}
            >
              <iframe
                src={`${cert.fileUrl}#toolbar=1&view=FitH`}
                title={cert.title}
                style={{ width: "100%", height: "50vh", border: "none" }}
              />
            </object>
          )
        ) : (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              background: C.bg,
              borderRadius: 12,
            }}
          >
            <FileText size={32} color={C.slate} style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: C.text, fontWeight: 600, margin: 0 }}>
              Preview unavailable
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "14px 22px",
          borderTop: `1px solid ${C.borderLight}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "0 18px",
            height: 36,
            borderRadius: 10,
            border: `1.5px solid ${C.border}`,
            background: C.white,
            color: C.text,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close
        </button>
        {cert.fileUrl && (
          <a
            href={cert.fileUrl}
            download
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 18px",
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Download size={13} /> Download
          </a>
        )}
      </div>
    </Modal>
  );
}

// ── Certificate Card ─────────────────────────────────────────────────────────
function CertCard({ cert, onView }) {
  const cat = CAT_MAP[cert.category] || {
    label: cert.category,
    icon: Medal,
    color: C.slate,
    bg: C.bg,
  };
  const CatIcon = cat.icon;
  const isImage = cert.fileType?.startsWith("image/");

  return (
    <div
      className="cert-card"
      style={{
        background: C.white,
        borderRadius: 16,
        border: `1.5px solid ${C.borderLight}`,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: `${C.mist}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CatIcon size={18} color={C.deep} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 800,
                color: C.text,
                fontFamily: "'Inter', sans-serif",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {cert.title || "Certificate"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
              {cert.academicYear || "—"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {categoryBadge(cert.category)}
          {fileTypeBadge(isImage)}
        </div>
      </div>

      {/* Meta rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <MetaRow icon={<Calendar size={12} color={C.slate} />} label={fmtDate(cert.issuedDate)} />
        {cert.description && (
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: C.textLight,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {cert.description}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: C.borderLight }} />

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onView(cert)}
          style={{
            flex: 1,
            height: 34,
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            background: C.bg,
            color: C.deep,
            border: `1.5px solid ${C.border}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Eye size={13} color={C.slate} /> View
        </button>
        {cert.fileUrl && (
          <a
            href={cert.fileUrl}
            download
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Download size={13} color="#fff" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentCertificatesPage() {
  const token = getToken();

  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [viewingCert, setViewingCert] = useState(null);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/student/certificates`, {
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

  useEffect(() => {
    fetchCerts();
  }, [fetchCerts]);

  const filtered = certs.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      c.title?.toLowerCase().includes(q) ||
      c.achievementText?.toLowerCase().includes(q) ||
      c.academicYear?.toLowerCase().includes(q);
    const matchCat = catFilter === "ALL" || c.category === catFilter;
    return matchSearch && matchCat;
  });

  const catCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = certs.filter((c) => c.category === cat.value).length;
    return acc;
  }, {});

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        .cert-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .cert-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .cert-grid { grid-template-columns: repeat(3, 1fr); } }
        .cert-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(56,73,89,0.12) !important; }
        .filter-btn { transition: all 0.15s; }
      `}</style>

      <div style={{ padding: "clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)", minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
                My Certificates
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                Your achievements and recognitions
              </p>
            </div>
          </div>

          {/* Stat pills */}
          {!loading && certs.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 10,
                background: C.white, border: `1px solid ${C.border}`,
                fontSize: 12, color: C.deep, fontWeight: 600,
              }}>
                <Award size={13} color={C.slate} />
                {certs.length} total
              </div>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 12, background: "#fee8e8", border: "1px solid #f5b0b0", marginBottom: 16, fontSize: 13, color: "#8b1c1c" }}>
            <AlertCircle size={14} /><span>{error}</span>
          </div>
        )}

        {/* ── Search & Filters ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexDirection: "column" }} className="fade-up">
          {/* Search Input */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: C.white, border: `1.5px solid ${C.border}`,
            borderRadius: 12, padding: "0 14px", height: 40,
          }}>
            <Search size={14} color={C.textLight} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or year..."
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: 13, color: C.text, width: "100%",
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={14} color={C.textLight} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="filter-btn"
              onClick={() => setCatFilter("ALL")}
              style={{
                padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${catFilter === "ALL" ? C.deep : C.border}`,
                background: catFilter === "ALL" ? C.deep : C.white,
                color: catFilter === "ALL" ? "#fff" : C.textLight,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              All
            </button>
            {CATEGORIES.map((cat) => {
              const active = catFilter === cat.value;
              return (
                <button
                  key={cat.value}
                  className="filter-btn"
                  onClick={() => setCatFilter(cat.value)}
                  style={{
                    padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${active ? C.deep : C.border}`,
                    background: active ? C.deep : C.white,
                    color: active ? "#fff" : C.textLight,
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Loading skeletons ── */}
        {loading ? (
          <div className="cert-grid">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: `${C.mist}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Inbox size={26} color={C.slate} />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.deep }}>No certificates found</p>
            <p style={{ margin: 0, fontSize: 12, color: C.textLight }}>
              {search || catFilter !== "ALL" ? "Try adjusting your filters" : "Your achievements will appear here"}
            </p>
          </div>
        ) : (
          <div className="cert-grid fade-up">
            {filtered.map((cert) => (
              <CertCard key={cert.id} cert={cert} onView={setViewingCert} />
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