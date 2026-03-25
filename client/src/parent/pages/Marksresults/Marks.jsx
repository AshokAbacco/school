// client/src/parent/pages/Marksresults/Marks.jsx
// ═══════════════════════════════════════════════════════════════
//  Parent Portal — Marks & Report Card
//  FIX: Removed <PageLayout> wrapper — Routes.jsx already wraps
//       all child routes inside <Route element={<PageLayout />}>
//       so importing PageLayout here caused a double sidebar/header.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
    ChevronDown, AlertCircle, FileText,
    EyeOff, Loader2, Download,
} from "lucide-react";

import { getToken } from "../../../auth/storage.js";

import { C, FONT, GLOBAL_CSS } from "./tokens.js";

import SummaryCards from "../../../student/pages/marks/components/SummaryCards.jsx";
import SubjectTable from "../../../student/pages/marks/components/SubjectTable.jsx";
import PerformanceInsights from "../../../student/pages/marks/components/PerformanceInsights.jsx";
import ExamTabs from "../../../student/pages/marks/components/ExamTabs.jsx";
import { downloadReportPDF } from "../../../student/pages/marks/utils/downloadPDF.js";

import ChildSelector from "./components/ChildSelector.jsx";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function apiFetch(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json"))
        throw new Error(`Server error (${res.status})`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? "Unknown error");
    return json.data;
}

function useWindowWidth() {
    const [w, setW] = useState(
        typeof window !== "undefined" ? window.innerWidth : 1024
    );
    useEffect(() => {
        const handle = () => setW(window.innerWidth);
        window.addEventListener("resize", handle);
        return () => window.removeEventListener("resize", handle);
    }, []);
    return w;
}

function NotPublished({ isMobile }) {
    return (
        <div className="mrk-card" style={{
            padding: isMobile ? "40px 20px" : "60px 32px",
            textAlign: "center",
            animation: "fadeUp 0.4s ease",
        }}>

            <div style={{
                width: 68, height: 68, borderRadius: "50%",
                background: `linear-gradient(135deg, rgba(189,221,252,0.45), rgba(136,189,242,0.22))`,
                border: `2px dashed rgba(136,189,242,0.50)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 18px",
            }}>
                <EyeOff size={26} color={C.mid} />
            </div>
            <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: C.dark, margin: "0 0 8px", fontFamily: FONT.sans }}>
                Results Not Published Yet
            </h2>
            <p style={{ fontSize: 13, color: C.mid, maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.65, fontWeight: 500 }}>
                Marks have not been released for this exam yet. Check back once the teacher publishes the results.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 260, margin: "0 auto 18px" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(136,189,242,0.28)" }} />
                <span style={{ fontSize: 9, color: C.mid, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>What to Expect</span>
                <div style={{ flex: 1, height: 1, background: "rgba(136,189,242,0.28)" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "0 auto" }}>
                {[
                    { icon: "📋", text: "Subject-wise marks" },
                    { icon: "📊", text: "Grade & percentage" },
                    { icon: "🏆", text: "Class rank" },
                    { icon: "📄", text: "PDF report card" },
                ].map(({ icon, text }) => (
                    <div key={text} style={{
                        display: "flex", alignItems: "center", gap: 7,
                        background: "rgba(237,243,250,0.80)", borderRadius: 10, padding: "8px 14px",
                        border: `1.5px solid rgba(136,189,242,0.22)`,
                    }}>
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        <span style={{ fontSize: 11, color: C.mid, fontWeight: 600, fontFamily: FONT.sans }}>{text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ErrorBanner({ message }) {
    if (!message) return null;
    return (
        <div style={{
            background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.28)",
            borderRadius: 13, padding: "13px 16px", marginBottom: 16,
            display: "flex", gap: 10, alignItems: "flex-start",
            animation: "fadeUp 0.3s ease",
        }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
                <p style={{ color: "#b91c1c", fontWeight: 700, fontSize: 13, margin: 0, fontFamily: FONT.sans }}>Unable to load results</p>
                <p style={{ color: "#ef4444", fontSize: 12, margin: "3px 0 0" }}>{message}</p>
            </div>
        </div>
    );
}

function PageHeader({ loading, enrollment, childName, isMobile }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
                width: 4, height: isMobile ? 26 : 32, borderRadius: 99, flexShrink: 0,
                background: `linear-gradient(180deg, ${C.light} 0%, ${C.dark} 100%)`,
            }} />
            <div>
                <h1 style={{
                    margin: 0,
                    fontSize: isMobile ? "clamp(17px,5vw,20px)" : "clamp(20px,3vw,26px)",
                    fontWeight: 800, color: C.dark, letterSpacing: "-0.5px",
                    fontFamily: FONT.sans,
                }}>
                    Marks &amp; Report Card
                </h1>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight, fontWeight: 500 }}>
                    {loading
                        ? "Loading…"
                        : childName && enrollment
                            ? `${childName} · ${enrollment.className} · ${enrollment.academicYearName}`
                            : childName
                                ? childName
                                : "Select a child to view results"}
                </p>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
export default function ParentMarks() {
    const width = useWindowWidth();
    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;

    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [loadingChildren, setLoadingChildren] = useState(true);
    const [errorChildren, setErrorChildren] = useState(null);

    const [examGroups, setExamGroups] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [loadingReport, setLoadingReport] = useState(false);
    const [errorGroups, setErrorGroups] = useState(null);
    const [errorReport, setErrorReport] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [notPublished, setNotPublished] = useState(false);

    // 1. Load children
    useEffect(() => {
        (async () => {
            setLoadingChildren(true); setErrorChildren(null);
            try {
                const data = await apiFetch("/api/parent/students");
                const list = (Array.isArray(data) ? data : data.students ?? data ?? []).map((s) => ({
                    studentId: s.id,
                    name: s.personalInfo
                        ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`.trim()
                        : s.name,
                    className: s.enrollments?.[0]?.classSection?.name
                        ?? s.enrollment?.className
                        ?? s.classSection?.name
                        ?? null,
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

    // 2. Load exam groups on child change
    useEffect(() => {
        if (!selectedChild) return;
        setExamGroups([]); setSelectedId(null);
        setReportData(null); setEnrollment(null);
        setLoadingGroups(true); setErrorGroups(null);

        (async () => {
            try {
                const data = await apiFetch(`/api/parent/marks/exam-groups?studentId=${selectedChild}`);
                setExamGroups(data.examGroups ?? []);
                setEnrollment(data.enrollment ?? null);
                if (data.examGroups?.length > 0)
                    setSelectedId(data.examGroups[data.examGroups.length - 1].id);
            } catch (e) {
                setErrorGroups(e.message);
            } finally {
                setLoadingGroups(false);
            }
        })();
    }, [selectedChild]);

    // 3. Load report on exam tab change
    useEffect(() => {
        if (!selectedId || !selectedChild) return;
        setLoadingReport(true); setErrorReport(null);
        setReportData(null); setNotPublished(false);

        (async () => {
            try {
                const data = await apiFetch(`/api/parent/marks/report/${selectedId}?studentId=${selectedChild}`);
                setReportData(data);
            } catch (e) {
                if (e.message?.toLowerCase().includes("not") && e.message?.toLowerCase().includes("publish"))
                    setNotPublished(true);
                else
                    setErrorReport(e.message);
            } finally {
                setLoadingReport(false);
            }
        })();
    }, [selectedId, selectedChild]);

    const selectedGroup = examGroups.find((g) => g.id === selectedId);
    const showReport = !loadingReport && !!reportData;
    const activeChild = children.find((c) => c.studentId === selectedChild);

    const handleDownload = useCallback(() => {
        if (!reportData) return;
        setPdfLoading(true);
        const enriched = {
            ...reportData,
            enrollment: { ...reportData.enrollment, schoolName: enrollment?.schoolName ?? "School" },
        };
        try { downloadReportPDF(enriched); }
        finally { setTimeout(() => setPdfLoading(false), 600); }
    }, [reportData, enrollment]);

    // ─────────────────────────────────────────────────────────────
    // Return bare JSX — NO <PageLayout> wrapper.
    // Routes.jsx handles the layout via:
    //   <Route element={<PageLayout />}>
    //     <Route path="marks" element={<Marks />} />
    //   </Route>
    // ─────────────────────────────────────────────────────────────
    return (
        <>
            <style>{GLOBAL_CSS}</style>

            <div className="mrk-page">

                {loadingChildren && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                        <Loader2 size={28} color={C.mid} style={{ animation: "spin 0.9s linear infinite" }} />
                    </div>
                )}

                {!loadingChildren && errorChildren && (
                    <ErrorBanner message={errorChildren} />
                )}

                {!loadingChildren && !errorChildren && (
                    <>
                        <div className="anim-1">
                            <ChildSelector
                                children={children}
                                selectedId={selectedChild}
                                onChange={(id) => setSelectedChild(id)}
                            />
                        </div>

                        {/* Header row */}
                        <div className="anim-1" style={{
                            display: "flex",
                            alignItems: isMobile ? "flex-start" : "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap", gap: 12,
                            marginBottom: isMobile ? 14 : 20,
                        }}>
                            <PageHeader
                                loading={loadingGroups}
                                enrollment={enrollment}
                                childName={activeChild?.name}
                                isMobile={isMobile}
                            />

                            <div style={{
                                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                                width: isMobile ? "100%" : "auto",
                            }}>
                                {!loadingGroups && examGroups.length > 0 && (
                                    <div style={{ position: "relative", flex: isMobile ? "1" : "unset" }}>
                                        <select
                                            className="mrk-select"
                                            value={selectedId ?? ""}
                                            onChange={(e) => setSelectedId(e.target.value)}
                                            style={{ width: isMobile ? "100%" : "auto" }}
                                        >
                                            {examGroups.map((g) => (
                                                <option key={g.id} value={g.id}>
                                                    {g.term ? `${g.term.name}: ` : ""}{g.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={13} color={C.textLight} style={{
                                            position: "absolute", right: 11, top: "50%",
                                            transform: "translateY(-50%)", pointerEvents: "none",
                                        }} />
                                    </div>
                                )}
                                {showReport && (
                                    <button
                                        className="mrk-dl-btn"
                                        onClick={handleDownload}
                                        disabled={pdfLoading}
                                        style={{ flex: isMobile ? "1" : "unset" }}
                                    >
                                        {pdfLoading
                                            ? <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />
                                            : <Download size={13} />}
                                        {pdfLoading ? "Preparing…" : "Download PDF"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Exam tabs */}
                        {!loadingGroups && examGroups.length > 0 && (
                            <div className="anim-1" style={{ marginBottom: isMobile ? 14 : 20 }}>
                                <ExamTabs
                                    examGroups={examGroups}
                                    selectedGroupId={selectedId}
                                    onChange={setSelectedId}
                                    isMobile={isMobile}
                                />
                            </div>
                        )}

                        <ErrorBanner message={errorGroups} />
                        <ErrorBanner message={errorReport} />

                        {!selectedChild && (
                            <div className="mrk-card" style={{ padding: isMobile ? "40px 20px" : "56px 24px", textAlign: "center" }}>
                                <FileText size={44} color="rgba(136,189,242,0.35)" style={{ margin: "0 auto 14px", display: "block" }} />
                                <p style={{ color: C.dark, fontWeight: 700, fontSize: 16, margin: "0 0 6px", fontFamily: FONT.sans }}>No Child Selected</p>
                                <p style={{ color: C.mid, fontSize: 13, margin: 0 }}>Select a child above to view their marks and report card.</p>
                            </div>
                        )}

                        {selectedChild && !loadingGroups && examGroups.length === 0 && !errorGroups && (
                            <div className="mrk-card" style={{ padding: isMobile ? "40px 20px" : "56px 24px", textAlign: "center" }}>
                                <FileText size={44} color="rgba(136,189,242,0.35)" style={{ margin: "0 auto 14px", display: "block" }} />
                                <p style={{ color: C.dark, fontWeight: 700, fontSize: 16, margin: "0 0 6px", fontFamily: FONT.sans }}>No Exams Available</p>
                                <p style={{ color: C.mid, fontSize: 13, margin: 0 }}>No published exam results for {activeChild?.name ?? "this student"}.</p>
                            </div>
                        )}

                        {!loadingReport && notPublished && <NotPublished isMobile={isMobile} />}

                        {(loadingReport || showReport) && (
                            <div style={{ animation: showReport ? "fadeUp 0.4s ease" : "none" }}>
                                <SummaryCards
                                    summary={reportData?.summary}
                                    loading={loadingReport}
                                    isMobile={isMobile}
                                    isTablet={isTablet}
                                />
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 284px",
                                    gap: isMobile ? 12 : 18,
                                    alignItems: "start",
                                }}>
                                    <SubjectTable
                                        subjects={reportData?.subjectResults}
                                        summary={reportData?.summary}
                                        loading={loadingReport}
                                        isLocked={selectedGroup?.isLocked}
                                        isMobile={isMobile}
                                    />
                                    <PerformanceInsights
                                        subjects={reportData?.subjectResults}
                                        summary={reportData?.summary}
                                        loading={loadingReport}
                                        isMobile={isMobile}
                                    />
                                </div>

                                {showReport && (
                                    <div className="mrk-card" style={{
                                        marginTop: isMobile ? 12 : 18,
                                        padding: isMobile ? "14px 16px" : "16px 22px",
                                        display: "flex",
                                        alignItems: isMobile ? "flex-start" : "center",
                                        justifyContent: "space-between",
                                        flexDirection: isMobile ? "column" : "row",
                                        gap: 12,
                                        animation: "fadeUp 0.5s ease",
                                    }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 700, color: C.dark, fontSize: isMobile ? 13 : 14, fontFamily: FONT.sans }}>
                                                {reportData?.exam?.name}
                                                {reportData?.exam?.term ? ` — ${reportData.exam.term.name}` : ""}
                                            </p>
                                            <p style={{ margin: "3px 0 0", color: C.textLight, fontSize: 11, fontWeight: 500 }}>
                                                {reportData?.student?.name && `${reportData.student.name} · `}
                                                {reportData?.enrollment?.className}
                                                {reportData?.student?.rollNumber ? ` · Roll No: ${reportData.student.rollNumber}` : ""}
                                                {reportData?.enrollment?.academicYear ? ` · ${reportData.enrollment.academicYear}` : ""}
                                            </p>
                                        </div>
                                        <button
                                            className="mrk-dl-btn"
                                            onClick={handleDownload}
                                            disabled={pdfLoading}
                                            style={{ padding: "10px 22px", fontSize: 13, width: isMobile ? "100%" : "auto" }}
                                        >
                                            {pdfLoading
                                                ? <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />
                                                : <Download size={14} />}
                                            {pdfLoading ? "Preparing PDF…" : "Print / Download Report Card"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}