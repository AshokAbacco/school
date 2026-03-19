// client/src/parent/pages/Profile.jsx
// ═══════════════════════════════════════════════════════════════
//  Parent Portal — Child Profile
//  Design: 1:1 copy of student profile.jsx
//  Differences from student version:
//    1. No <PageLayout> wrapper (Routes.jsx handles layout)
//    2. Fetches children from /api/parent/students on mount
//    3. ChildSelector shown when parent has > 1 child
//    4. Profile fetched from /api/parent/profile?studentId=
//    5. Documents fetched from /api/parent/profile/documents?studentId=
//    6. Re-fetches everything when selected child changes
//    7. All sub-components reused directly from student folder (zero duplication)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import { User, BookOpen, Heart, FileText, RefreshCw, WifiOff, Loader2 } from "lucide-react";
import { getToken } from "../../../auth/storage.js";

// ── Reuse ALL student sub-components without any modification ──
import { C, PROFILE_CSS, initials } from "../../../student/pages/profile/components/shared.jsx";
import ProfileSidebar from "../../../student/pages/profile/components/ProfileSidebar.jsx";
import PersonalInfo from "../../../student/pages/profile/components/PersonalInfo.jsx";
import AcademicInfo from "../../../student/pages/profile/components/AcademicInfo.jsx";
import HealthInfo from "../../../student/pages/profile/components/HealthInfo.jsx";
import DocumentsInfo from "../../../student/pages/profile/components/DocumentsInfo.jsx";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

// ── API helper with retry ─────────────────────────────────────
async function apiFetch(path, retries = 3, delayMs = 600) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);
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

// ── Tab config (identical to student) ────────────────────────
const TABS = [
    { key: "personal", label: "Personal", icon: User },
    { key: "academic", label: "Academic", icon: BookOpen },
    { key: "health", label: "Health", icon: Heart },
    { key: "documents", label: "Documents", icon: FileText },
];

// ── Error banner (identical to student) ──────────────────────
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

// ── Child Selector ────────────────────────────────────────────
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
            <div style={{
                display: "flex", gap: 9, overflowX: "auto", paddingBottom: 3,
                scrollbarWidth: "none",
            }}>
                {children.map((child) => {
                    const active = child.studentId === selectedId;
                    return (
                        <button
                            key={child.studentId}
                            onClick={() => onChange(child.studentId)}
                            style={{
                                flexShrink: 0, display: "flex", alignItems: "center", gap: 9,
                                padding: "8px 13px", borderRadius: 13, outline: "none", cursor: "pointer",
                                border: active ? `1.5px solid ${C.light}` : `1.5px solid ${C.pale}`,
                                background: active ? `rgba(136,189,242,0.14)` : C.white,
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
                                color: active ? C.white : C.mid,
                                overflow: "hidden",
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
                                    <p style={{ margin: 0, fontSize: 10, color: C.mid, fontWeight: 500 }}>
                                        {child.className}
                                    </p>
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
//  MAIN — No <PageLayout> (Routes.jsx wraps all pages)
// ═══════════════════════════════════════════════════════════════
export default function ParentProfile() {
    const [activeTab, setActiveTab] = useState("personal");

    // ── Children ─────────────────────────────────────────────────
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [loadingChildren, setLoadingChildren] = useState(true);
    const [errorChildren, setErrorChildren] = useState(null);

    // ── Profile data ──────────────────────────────────────────────
    const [profileData, setProfileData] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // ── Documents ─────────────────────────────────────────────────
    const [docs, setDocs] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [docsError, setDocsError] = useState(null);
    const [docsFetched, setDocsFetched] = useState(false);

    // 1. Load children on mount
    useEffect(() => {
        (async () => {
            setLoadingChildren(true); setErrorChildren(null);
            try {
                const res = await apiFetch("/api/parent/students");
                const raw = Array.isArray(res.data) ? res.data : (res.data?.students ?? []);
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

    // 2. Fetch profile whenever selected child or retryCount changes
    const fetchProfile = useCallback(() => {
        if (!selectedChild) return;
        setProfileLoading(true); setProfileError(null);
        setProfileData(null); setDocs([]); setDocsFetched(false);

        apiFetch(`/api/parent/profile?studentId=${selectedChild}`)
            .then(json => {
                if (!json.student) throw new Error("No student data returned");
                setProfileData(json.student);
            })
            .catch(e => setProfileError(e.message))
            .finally(() => setProfileLoading(false));
    }, [selectedChild, retryCount]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    // 3. Fetch documents lazily when documents tab is opened
    const fetchDocs = useCallback(() => {
        if (activeTab !== "documents" || !selectedChild) return;
        setDocsLoading(true); setDocsError(null);
        apiFetch(`/api/parent/profile/documents?studentId=${selectedChild}`)
            .then(json => { setDocs(json.documents ?? []); setDocsFetched(true); })
            .catch(e => setDocsError(e.message))
            .finally(() => setDocsLoading(false));
    }, [activeTab, selectedChild]);

    useEffect(() => {
        if (activeTab === "documents" && !docsFetched) fetchDocs();
    }, [activeTab, docsFetched, fetchDocs]);

    // Reset docs when child changes
    useEffect(() => {
        setDocs([]); setDocsFetched(false); setDocsError(null);
        setActiveTab("personal");
    }, [selectedChild]);

    // ── Derived ───────────────────────────────────────────────────
    const enrollment = profileData?.enrollments?.find(e => e.academicYear?.isActive)
        ?? profileData?.enrollments?.[0];
    const parents = profileData?.parentLinks ?? [];
    const pi = profileData?.personalInfo;
    const fullName = pi
        ? `${pi.firstName}${pi.lastName ? " " + pi.lastName : ""}`
        : profileData?.name ?? "Student";

    return (
        <>
            <style>{PROFILE_CSS}</style>

            <div className="pf-page">

                {/* ── Loading children ── */}
                {loadingChildren && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                        <Loader2 size={28} color={C.mid} style={{ animation: "spin 1s linear infinite" }} />
                    </div>
                )}

                {/* ── Error loading children ── */}
                {!loadingChildren && errorChildren && (
                    <ErrorBanner message={errorChildren} />
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
                                textAlign: "center", padding: "60px 20px",
                                background: "rgba(255,255,255,0.82)",
                                borderRadius: 20, border: `1.5px solid ${C.pale}`,
                            }}>
                                <User size={36} color={C.pale} style={{ display: "block", margin: "0 auto 12px" }} />
                                <p style={{ fontWeight: 700, color: C.dark, margin: "0 0 6px", fontSize: 15 }}>No Child Selected</p>
                                <p style={{ color: C.mid, fontSize: 13, margin: 0 }}>Select a child above to view their profile.</p>
                            </div>
                        )}

                        {selectedChild && (
                            <>
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
                                                    fontFamily: "'Inter', sans-serif",
                                                }}>
                                                    {profileLoading ? "Loading…" : fullName}
                                                </h1>
                                                <p style={{ margin: "3px 0 0", fontSize: 11, color: C.mid, fontWeight: 500 }}>
                                                    {enrollment?.classSection?.name ?? "Student Profile"}
                                                    {enrollment?.admissionNumber ? ` · ${enrollment.admissionNumber}` : ""}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tab bar */}
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

                                {/* ── Profile error banner ── */}
                                {profileError && !profileLoading && (
                                    <ErrorBanner
                                        message={profileError}
                                        onRetry={() => setRetryCount(c => c + 1)}
                                    />
                                )}

                                {/* ── Main card: sidebar + tab content ── */}
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
                            </>
                        )}
                    </>
                )}

            </div>
        </>
    );
}