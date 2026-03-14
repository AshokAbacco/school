// client/src/student/pages/profile/profile.jsx
import React, { useState, useEffect, useCallback } from "react";
import { User, BookOpen, Heart, FileText, RefreshCw, WifiOff } from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { getToken } from "../../../auth/storage.js";
import { C, PROFILE_CSS } from "./components/shared.jsx";
import ProfileSidebar from "./components/ProfileSidebar.jsx";
import PersonalInfo   from "./components/PersonalInfo.jsx";
import AcademicInfo   from "./components/AcademicInfo.jsx";
import HealthInfo     from "./components/HealthInfo.jsx";
import DocumentsInfo  from "./components/DocumentsInfo.jsx";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

// ─── API helper with retry ────────────────────────────────────────────────────
async function apiFetch(path, retries = 3, delayMs = 600) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${API}${path}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${getToken()}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Unknown error");
      return json;
    } catch (e) {
      lastError = e;
      if (e.name === "AbortError") { lastError = new Error("Request timed out"); break; }
      if (attempt < retries) await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
  throw lastError;
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: "personal",  label: "Personal",  icon: User     },
  { key: "academic",  label: "Academic",  icon: BookOpen },
  { key: "health",    label: "Health",    icon: Heart    },
  { key: "documents", label: "Documents", icon: FileText },
];

// ─── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, flexWrap: "wrap",
      background: "#fef2f2", border: "1.5px solid #fca5a5",
      borderRadius: 14, padding: "13px 16px",
      color: "#b91c1c", fontSize: 12, marginBottom: 14,
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <WifiOff size={15} /> {message}
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 14px", borderRadius: 20, border: "none",
          background: "#b91c1c", color: "#fff",
          fontWeight: 700, fontSize: 11, cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
        }}>
          <RefreshCw size={11} /> Retry
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Profile() {
  const [activeTab, setActiveTab] = useState("personal");

  const [profileData,    setProfileData]    = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError,   setProfileError]   = useState(null);
  const [retryCount,     setRetryCount]     = useState(0);

  const [docs,        setDocs]        = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError,   setDocsError]   = useState(null);
  const [docsFetched, setDocsFetched] = useState(false);

  // ── Fetch profile ─────────────────────────────────────────────────────────
  const fetchProfile = useCallback(() => {
    setProfileLoading(true);
    setProfileError(null);
    apiFetch("/profile/me")
      .then(json => {
        if (!json.student) throw new Error("No student data returned");
        setProfileData(json.student);
      })
      .catch(e => setProfileError(e.message))
      .finally(() => setProfileLoading(false));
  }, [retryCount]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Fetch docs lazily ─────────────────────────────────────────────────────
  const fetchDocs = useCallback(() => {
    if (activeTab !== "documents") return;
    setDocsLoading(true); setDocsError(null);
    apiFetch("/profile/documents")
      .then(json => { setDocs(json.documents ?? []); setDocsFetched(true); })
      .catch(e => setDocsError(e.message))
      .finally(() => setDocsLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "documents" && !docsFetched) fetchDocs();
  }, [activeTab, docsFetched, fetchDocs]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const enrollment = profileData?.enrollments?.find(e => e.academicYear?.isActive)
                  ?? profileData?.enrollments?.[0];
  const parents    = profileData?.parentLinks ?? [];
  const pi         = profileData?.personalInfo;
  const fullName   = pi
    ? `${pi.firstName}${pi.lastName ? " " + pi.lastName : ""}`
    : profileData?.name ?? "Student";

  return (
    <PageLayout>
      <style>{PROFILE_CSS}</style>

      <div className="pf-page">

        {/* ── PAGE HEADER ── */}
        <div className="a1" style={{ marginBottom: 18 }}>
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12,
          }}>
            {/* Left: accent bar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 4, height: 30, borderRadius: 99, flexShrink: 0,
                background: `linear-gradient(180deg, ${C.light} 0%, ${C.dark} 100%)`,
              }} />
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: "clamp(18px,4vw,25px)",
                  fontWeight: 900, color: C.dark, letterSpacing: "-0.5px",
                  fontFamily: "'Sora', sans-serif",
                }}>
                  {profileLoading ? "Loading…" : fullName}
                </h1>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: C.mid, fontWeight: 500 }}>
                  {enrollment?.classSection?.name ?? "Student Profile"}
                  {enrollment?.admissionNumber ? ` · ${enrollment.admissionNumber}` : ""}
                </p>
              </div>
            </div>

            {/* Tab bar (top-right on wide screens) */}
            <div style={{
              display: "flex", gap: 4,
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(12px)",
              border: "1.5px solid rgba(136,189,242,0.22)",
              borderRadius: 15, padding: "4px",
              overflowX: "auto", scrollbarWidth: "none",
              maxWidth: "100%",
            }}>
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`pf-tab${activeTab === key ? " active" : ""}`}
                  onClick={() => setActiveTab(key)}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {profileError && !profileLoading && (
          <ErrorBanner message={profileError} onRetry={() => setRetryCount(c => c+1)} />
        )}

        {/* ── Main card: sidebar + content ── */}
        <div className="a2 pf-card pf-layout">

          {/* Sidebar */}
          <ProfileSidebar
            profileData={profileData}
            enrollment={enrollment}
            parents={parents}
            loading={profileLoading}
          />

          {/* Tab content */}
          <div className="pf-content">
            {activeTab === "personal" && (
              <PersonalInfo
                profileData={profileData}
                enrollment={enrollment}
                loading={profileLoading}
                error={profileError}
              />
            )}
            {activeTab === "academic" && (
              <AcademicInfo
                profileData={profileData}
                loading={profileLoading}
                error={profileError}
              />
            )}
            {activeTab === "health" && (
              <HealthInfo
                profileData={profileData}
                loading={profileLoading}
                error={profileError}
              />
            )}
            {activeTab === "documents" && (
              <DocumentsInfo
                docs={docs}
                loading={docsLoading}
                error={docsError}
                onRetry={() => setDocsFetched(false)}
              />
            )}
          </div>
        </div>

      </div>
    </PageLayout>
  );
}