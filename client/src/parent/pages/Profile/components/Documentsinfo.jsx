// client/src/student/pages/profile/components/DocumentsInfo.jsx
import React, { useState, useEffect, useRef } from "react";
import {
    FileText, ExternalLink, X, Loader2, AlertCircle,
    CheckCircle, Clock, RefreshCw, Download, Eye,
    Image as ImageIcon, File as FileIcon, ZoomIn, ZoomOut,
} from "lucide-react";
import { SectionHeading, Loading, ErrorMsg, Empty, StatusPill, DOC_LABELS, fmtDate, fmtSize, C } from "./shared.jsx";
import { getToken } from "../../../../auth/storage.js";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const DOC_PRIORITY = [
    "AADHAR_CARD", "BIRTH_CERTIFICATE", "PHOTO", "TRANSFER_CERTIFICATE",
    "MARKSHEET", "CASTE_CERTIFICATE", "INCOME_CERTIFICATE",
    "MIGRATION_CERTIFICATE", "CHARACTER_CERTIFICATE",
    "MEDICAL_CERTIFICATE", "PASSPORT", "PASSBOOK", "CUSTOM",
];

// ─── File type icon ───────────────────────────────────────────────────────────
function FileTypeIcon({ fileType, size = 15 }) {
    if (fileType?.startsWith("image/")) return <ImageIcon size={size} color={C.light} />;
    if (fileType?.includes("pdf")) return <FileText size={size} color={C.mid} />;
    return <FileIcon size={size} color={C.pale} />;
}

// ─── Document card ────────────────────────────────────────────────────────────
function DocCard({ doc, onView }) {
    const label = doc.customLabel || DOC_LABELS[doc.documentName] || doc.documentName;

    return (
        <div style={{
            background: "rgba(248,251,255,0.95)",
            border: `1.5px solid ${C.pale}`,
            borderRadius: 16,
            overflow: "hidden",
            display: "flex", flexDirection: "column",
            transition: "border-color 0.18s, box-shadow 0.18s",
        }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(136,189,242,0.50)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(136,189,242,0.14)";
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.pale;
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            {/* Top accent */}
            <div style={{ height: 3, background: doc.isVerified ? "#16a34a" : "#d97706" }} />

            <div style={{ padding: "13px 13px 11px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Icon + name */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <FileTypeIcon fileType={doc.fileType} size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, lineHeight: 1.3, wordBreak: "break-word" }}>
                            {label}
                        </div>
                        <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>
                            {fmtDate(doc.uploadedAt)}
                            {doc.fileSizeBytes ? ` · ${fmtSize(doc.fileSizeBytes)}` : ""}
                            {doc.fileType ? ` · ${doc.fileType.split("/")[1]?.toUpperCase()}` : ""}
                        </div>
                    </div>
                </div>

                {/* Status */}
                <StatusPill verified={doc.isVerified} />
                {doc.isVerified && doc.verifiedAt && (
                    <div style={{ fontSize: 10, color: C.mid, marginTop: -4 }}>
                        Verified {fmtDate(doc.verifiedAt)}
                    </div>
                )}

                {/* View button */}
                <button className="pf-view-btn" onClick={() => onView(doc)}>
                    <Eye size={11} /> View Document
                </button>
            </div>
        </div>
    );
}

// ─── Document Modal ───────────────────────────────────────────────────────────
function DocumentModal({ doc, onClose }) {
    const [state, setState] = useState("loading");
    const [url, setUrl] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [errMsg, setErrMsg] = useState("");
    const [zoom, setZoom] = useState(1);
    const timerRef = useRef(null);

    const label = doc.customLabel || DOC_LABELS[doc.documentName] || doc.documentName;
    const isImage = doc.fileType?.startsWith("image/");
    const isPdf = doc.fileType?.includes("pdf");

    const startCountdown = (s) => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timerRef.current); setState("expired"); return 0; }
                return t - 1;
            });
        }, 1000);
    };

    const fetchUrl = async () => {
        setState("loading"); setErrMsg(""); setZoom(1);
        try {
            if (doc.url) {
                setUrl(doc.url); setTimeLeft(3600); setState("ready"); startCountdown(3600);
            } else {
                const res = await fetch(`${API}/profile/documents`, {
                    credentials: "include",
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.message ?? "Failed");
                const fresh = json.documents?.find(d => d.id === doc.id);
                if (!fresh?.url) throw new Error("Document URL unavailable");
                setUrl(fresh.url); setTimeLeft(3600); setState("ready"); startCountdown(3600);
            }
        } catch (e) { setState("error"); setErrMsg(e.message); }
    };

    useEffect(() => {
        fetchUrl();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [doc.id]);

    const fmtTime = (s) => {
        if (s == null) return "";
        if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
        if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
        return `${s}s`;
    };
    const timerWarn = timeLeft !== null && timeLeft < 300;

    const iconBtn = {
        width: 30, height: 30, borderRadius: 8, border: "none",
        background: "rgba(189,221,252,0.18)", color: "#fff",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s",
    };
    const retryBtn = {
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 18px", borderRadius: 12, border: "none",
        background: C.dark, color: "#fff", fontWeight: 700, fontSize: 12,
        cursor: "pointer", fontFamily: "'Inter', sans-serif",
    };

    // Close on backdrop click
    const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

    return (
        <div
            onClick={onBackdrop}
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(56,73,89,0.76)", backdropFilter: "blur(7px)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                padding: 0,
            }}
        >
            <style>{`
        @media (min-width: 640px) {
          .pf-modal-wrap {
            align-self: center !important;
            border-radius: 20px !important;
            max-height: 90vh !important;
            width: min(900px,95vw) !important;
          }
        }
        @keyframes slideUp { from { transform:translateY(40px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        .pf-modal-inner { animation: slideUp 0.28s cubic-bezier(.22,.68,0,1.2) both; }
      `}</style>

            <div
                className="pf-modal-wrap pf-modal-inner"
                style={{
                    width: "100%",
                    maxHeight: "96dvh",
                    background: C.white,
                    borderRadius: "20px 20px 0 0",
                    boxShadow: "0 -8px 60px rgba(56,73,89,0.30), 0 24px 80px rgba(56,73,89,0.20)",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                {/* Header */}
                <div style={{
                    background: `linear-gradient(90deg, ${C.dark} 0%, ${C.mid} 100%)`,
                    padding: "13px 14px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, flexShrink: 0,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                            background: "rgba(189,221,252,0.20)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <FileTypeIcon fileType={doc.fileType} size={15} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {label}
                            </div>
                            <div style={{ fontSize: 10, color: C.pale, marginTop: 1 }}>
                                {doc.fileSizeBytes ? fmtSize(doc.fileSizeBytes) : ""}
                                {doc.fileType ? ` · ${doc.fileType.split("/")[1]?.toUpperCase()}` : ""}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                        {/* Timer */}
                        {state === "ready" && timeLeft != null && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 4,
                                padding: "4px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                                background: timerWarn ? "rgba(239,68,68,0.22)" : "rgba(136,189,242,0.20)",
                                color: timerWarn ? "#fca5a5" : C.pale,
                            }}>
                                <Clock size={9} /> {fmtTime(timeLeft)}
                            </div>
                        )}
                        {/* Zoom — hidden on small screens */}
                        {state === "ready" && isImage && (
                            <div style={{ display: "flex", gap: 4 }}>
                                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={iconBtn}>
                                    <ZoomOut size={12} />
                                </button>
                                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} style={iconBtn}>
                                    <ZoomIn size={12} />
                                </button>
                            </div>
                        )}
                        {/* Download */}
                        {state === "ready" && url && (
                            <a href={url} download target="_blank" rel="noreferrer" style={{
                                display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20,
                                background: "rgba(189,221,252,0.18)", color: C.pale,
                                fontSize: 11, fontWeight: 700, textDecoration: "none",
                                border: "1px solid rgba(189,221,252,0.25)",
                            }}>
                                <Download size={11} />
                                <span style={{ display: "none" }} className="pf-dl-label">Download</span>
                            </a>
                        )}
                        <button onClick={onClose} style={{ ...iconBtn, marginLeft: 2 }}>
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{
                    flex: 1, overflow: "auto", display: "flex",
                    flexDirection: "column", alignItems: "center", justifyContent: "center",
                    minHeight: 280, background: "#f3f7fc",
                }}>
                    {state === "loading" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 56, color: C.mid }}>
                            <Loader2 size={30} style={{ animation: "spin 1s linear infinite" }} />
                            <div style={{ fontSize: 13, fontWeight: 600 }}>Preparing document…</div>
                        </div>
                    )}

                    {state === "error" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "36px 24px", textAlign: "center" }}>
                            <div style={{ width: 50, height: 50, borderRadius: 14, background: "rgba(239,68,68,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <AlertCircle size={24} color="#dc2626" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>Failed to load</div>
                                <div style={{ fontSize: 12, color: C.mid, marginTop: 4 }}>{errMsg}</div>
                            </div>
                            <button onClick={fetchUrl} style={retryBtn}><RefreshCw size={12} /> Try Again</button>
                        </div>
                    )}

                    {state === "expired" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "36px 24px", textAlign: "center" }}>
                            <div style={{ width: 50, height: 50, borderRadius: 14, background: `${C.pale}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Clock size={24} color={C.mid} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>Link expired</div>
                                <div style={{ fontSize: 12, color: C.mid, marginTop: 4 }}>Secure links expire after 1 hour.</div>
                            </div>
                            <button onClick={fetchUrl} style={retryBtn}><RefreshCw size={12} /> Refresh</button>
                        </div>
                    )}

                    {state === "ready" && url && isImage && (
                        <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflow: "auto" }}>
                            <img src={url} alt={label} style={{
                                maxWidth: "100%", maxHeight: "60vh",
                                objectFit: "contain", borderRadius: 12,
                                boxShadow: "0 8px 32px rgba(56,73,89,0.14)",
                                border: `1px solid ${C.pale}`,
                                transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform .2s",
                            }} />
                        </div>
                    )}

                    {state === "ready" && url && isPdf && (
                        <iframe
                            src={url} title={label}
                            style={{ width: "100%", flex: 1, minHeight: 440, border: "none", display: "block" }}
                        />
                    )}

                    {state === "ready" && url && !isImage && !isPdf && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "36px 24px", textAlign: "center" }}>
                            <div style={{ width: 54, height: 54, borderRadius: 14, background: `${C.pale}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <FileIcon size={26} color={C.mid} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>No preview available</div>
                                <div style={{ fontSize: 12, color: C.mid, marginTop: 4 }}>This file type cannot be previewed.</div>
                            </div>
                            <a href={url} download target="_blank" rel="noreferrer" style={{ ...retryBtn, textDecoration: "none" }}>
                                <Download size={13} /> Download File
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {state === "ready" && url && (
                    <div style={{
                        padding: "9px 14px", borderTop: `1px solid ${C.pale}`,
                        background: C.bg, display: "flex", alignItems: "center",
                        justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: 6,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.mid }}>
                            {doc.isVerified
                                ? <><CheckCircle size={11} color="#16a34a" /><span style={{ color: "#16a34a", fontWeight: 700 }}>Verified</span></>
                                : <><Clock size={11} color="#d97706" /><span style={{ color: "#d97706", fontWeight: 700 }}>Pending Verification</span></>
                            }
                        </div>
                        <a href={url} target="_blank" rel="noreferrer" style={{
                            display: "flex", alignItems: "center", gap: 5,
                            fontSize: 11, fontWeight: 700, color: C.mid, textDecoration: "none",
                        }}>
                            <ExternalLink size={10} /> Open in new tab
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DocumentsInfo({ docs, loading, error, onRetry }) {
    const [viewingDoc, setViewingDoc] = useState(null);

    if (loading) return <Loading />;
    if (error) return <ErrorMsg msg={error} onRetry={onRetry} />;
    if (!docs.length) return <Empty message="No documents have been uploaded yet." />;

    const sorted = [...docs].sort((a, b) => {
        const ai = DOC_PRIORITY.indexOf(a.documentName);
        const bi = DOC_PRIORITY.indexOf(b.documentName);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const verified = sorted.filter(d => d.isVerified);
    const pending = sorted.filter(d => !d.isVerified);

    return (
        <div>
            <SectionHeading icon={FileText} title={`Documents (${docs.length})`} />

            {/* Summary pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                <span className="pf-badge" style={{
                    background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                    padding: "4px 12px", fontSize: 12,
                }}>
                    <CheckCircle size={10} /> {verified.length} Verified
                </span>
                {pending.length > 0 && (
                    <span className="pf-badge" style={{
                        background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a",
                        padding: "4px 12px", fontSize: 12,
                    }}>
                        <Clock size={10} /> {pending.length} Pending
                    </span>
                )}
            </div>

            {verified.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                    <div style={{
                        fontSize: 10, fontWeight: 800, color: C.mid, textTransform: "uppercase",
                        letterSpacing: ".07em", marginBottom: 10,
                        display: "flex", alignItems: "center", gap: 6,
                    }}>
                        <div style={{ width: 3, height: 11, borderRadius: 99, background: "#16a34a" }} />
                        Verified Documents
                    </div>
                    <div className="pf-doc-grid">
                        {verified.map(doc => <DocCard key={doc.id} doc={doc} onView={setViewingDoc} />)}
                    </div>
                </div>
            )}

            {pending.length > 0 && (
                <div>
                    <div style={{
                        fontSize: 10, fontWeight: 800, color: C.mid, textTransform: "uppercase",
                        letterSpacing: ".07em", marginBottom: 10,
                        display: "flex", alignItems: "center", gap: 6,
                    }}>
                        <div style={{ width: 3, height: 11, borderRadius: 99, background: "#d97706" }} />
                        Pending Verification
                    </div>
                    <div className="pf-doc-grid">
                        {pending.map(doc => <DocCard key={doc.id} doc={doc} onView={setViewingDoc} />)}
                    </div>
                </div>
            )}

            {viewingDoc && (
                <DocumentModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />
            )}
        </div>
    );
}