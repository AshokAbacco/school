// admin/pages/students/components/DocumentViewer.jsx
import { useState } from "react";
import {
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Loader2,
  AlertCircle,
  Clock,
  ExternalLink,
  Download,
  Eye,
  RefreshCw,
  Shield,
} from "lucide-react";
import { getToken, getUser } from "../../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

// Role-based expiry mirrors the backend fileAccessPolicy
const ROLE_EXPIRY = {
  SUPER_ADMIN: 600,
  ADMIN: 300,
  TEACHER: 180,
  PARENT: 120,
  STUDENT: 60,
};

function formatDocName(name, customLabel) {
  if (name === "CUSTOM") return customLabel || "Custom Document";
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function FileTypeIcon({ fileType, size = 16 }) {
  if (fileType?.startsWith("image/"))
    return <ImageIcon size={size} style={{ color: "#6A89A7" }} />;
  if (fileType?.includes("pdf"))
    return <FileText size={size} style={{ color: "#384959" }} />;
  return <FileIcon size={size} style={{ color: "#88BDF2" }} />;
}

// ── Single document row with view button ──────────────────────────────────
function DocumentRow({ doc, studentId, onView }) {
  const label = formatDocName(doc.documentName, doc.customLabel);
  const isImage = doc.fileType?.startsWith("image/");

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all group"
      style={{
        background: "rgba(189,221,252,0.10)",
        border: "1px solid rgba(136,189,242,0.20)",
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(136,189,242,0.15)" }}
      >
        <FileTypeIcon fileType={doc.fileType} size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "#384959" }}
        >
          {label}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.fileSizeBytes && (
            <span className="text-[10px]" style={{ color: "#6A89A7" }}>
              {formatSize(doc.fileSizeBytes)}
            </span>
          )}
          {doc.isVerified && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(136,189,242,0.20)", color: "#384959" }}
            >
              ✓ Verified
            </span>
          )}
          <span className="text-[10px]" style={{ color: "#88BDF2" }}>
            {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              },
            )}
          </span>
        </div>
      </div>

      {/* View button */}
      <button
        onClick={() => onView(doc)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{
          background: "#384959",
          color: "white",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#6A89A7")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#384959")}
      >
        <Eye size={12} />
        View
      </button>
    </div>
  );
}

// ── Document Modal — fetches signed URL then renders file ─────────────────
function DocumentModal({ doc, studentId, onClose }) {
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [url, setUrl] = useState(null);
  const [expiresIn, setExpiresIn] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const timerRef = useState(null);

  const user = getUser();
  const role = user?.role || "STUDENT";
  const expiry = ROLE_EXPIRY[role] || 60;

  const fetchSignedUrl = async () => {
    setState("loading");
    setErrMsg("");
    try {
      const res = await fetch(`${API}/api/students/documents/${doc.id}/view`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch document");

      setUrl(data.url);
      setExpiresIn(data.expiresIn);
      setTimeLeft(data.expiresIn);
      setState("ready");

      // countdown timer
      if (timerRef[0]) clearInterval(timerRef[0]);
      timerRef[0] = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef[0]);
            setState("expired");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (e) {
      setState("error");
      setErrMsg(e.message);
    }
  };

  // auto-fetch on mount
  useState(() => {
    fetchSignedUrl();
  }, []);
  // also trigger when component mounts
  if (state === "idle") fetchSignedUrl();

  const label = formatDocName(doc.documentName, doc.customLabel);
  const isImage = doc.fileType?.startsWith("image/");
  const isPdf = doc.fileType?.includes("pdf");

  const fmtTime = (s) => {
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${s}s`;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(56,73,89,0.70)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          maxWidth: "860px",
          maxHeight: "90vh",
          background: "white",
          border: "1px solid rgba(136,189,242,0.30)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            background: "#384959",
            borderBottom: "1px solid rgba(136,189,242,0.20)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(189,221,252,0.20)" }}
            >
              <FileTypeIcon fileType={doc.fileType} size={16} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">{label}</p>
              <p className="text-[11px]" style={{ color: "#88BDF2" }}>
                {formatSize(doc.fileSizeBytes)}
                {doc.fileType &&
                  ` · ${doc.fileType.split("/")[1]?.toUpperCase()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Timer */}
            {state === "ready" && timeLeft !== null && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background:
                    timeLeft < 30
                      ? "rgba(255,100,100,0.20)"
                      : "rgba(136,189,242,0.20)",
                  color: timeLeft < 30 ? "#ff8080" : "#BDDDFC",
                }}
              >
                <Clock size={11} />
                Link expires in {fmtTime(timeLeft)}
              </div>
            )}
            {/* Role badge */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
              style={{ background: "rgba(106,137,167,0.25)", color: "#BDDDFC" }}
            >
              <Shield size={10} />
              {role} · {expiry}s access
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ color: "#BDDDFC" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.10)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-auto flex flex-col items-center justify-center"
          style={{ minHeight: "400px" }}
        >
          {/* Loading */}
          {(state === "idle" || state === "loading") && (
            <div className="flex flex-col items-center gap-3 py-20">
              <Loader2
                size={36}
                className="animate-spin"
                style={{ color: "#88BDF2" }}
              />
              <p className="text-sm font-medium" style={{ color: "#6A89A7" }}>
                Generating secure link…
              </p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,100,100,0.10)" }}
              >
                <AlertCircle size={28} style={{ color: "#e74c3c" }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "#384959" }}>
                  Failed to load document
                </p>
                <p className="text-xs mt-1" style={{ color: "#6A89A7" }}>
                  {errMsg}
                </p>
              </div>
              <button
                onClick={fetchSignedUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#384959" }}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {/* Expired */}
          {state === "expired" && (
            <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(136,189,242,0.15)" }}
              >
                <Clock size={28} style={{ color: "#6A89A7" }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "#384959" }}>
                  Secure link expired
                </p>
                <p className="text-xs mt-1" style={{ color: "#6A89A7" }}>
                  For security, links expire after {expiry}s for your role (
                  {role})
                </p>
              </div>
              <button
                onClick={fetchSignedUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#384959" }}
              >
                <RefreshCw size={14} /> Generate New Link
              </button>
            </div>
          )}

          {/* Ready — show file */}
          {state === "ready" && url && (
            <div className="w-full h-full flex flex-col">
              {isImage ? (
                <div
                  className="flex-1 flex items-center justify-center p-6"
                  style={{ background: "rgba(189,221,252,0.08)" }}
                >
                  <img
                    src={url}
                    alt={label}
                    className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md"
                    style={{ border: "1px solid rgba(136,189,242,0.30)" }}
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={url}
                  title={label}
                  className="w-full flex-1"
                  style={{ minHeight: "500px", border: "none" }}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(136,189,242,0.15)" }}
                  >
                    <FileIcon size={32} style={{ color: "#6A89A7" }} />
                  </div>
                  <p
                    className="font-semibold text-sm"
                    style={{ color: "#384959" }}
                  >
                    Preview not available for this file type
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#384959" }}
                  >
                    <Download size={14} /> Download File
                  </a>
                </div>
              )}

              {/* Footer actions */}
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{
                  borderTop: "1px solid rgba(136,189,242,0.20)",
                  background: "rgba(189,221,252,0.06)",
                }}
              >
                <p className="text-xs" style={{ color: "#6A89A7" }}>
                  🔒 Secure signed URL · Access limited by role
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: "rgba(136,189,242,0.15)",
                      color: "#384959",
                    }}
                  >
                    <ExternalLink size={11} /> Open in Tab
                  </a>
                  <a
                    href={url}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "#384959" }}
                  >
                    <Download size={11} /> Download
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────
export default function DocumentViewer({ documents = [], studentId }) {
  const [activeDoc, setActiveDoc] = useState(null);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ background: "rgba(189,221,252,0.20)" }}
        >
          <FileText size={22} style={{ color: "#6A89A7" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "#384959" }}>
          No documents uploaded
        </p>
        <p className="text-xs mt-1" style={{ color: "#6A89A7" }}>
          Documents will appear here once uploaded
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {documents.map((doc) => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            studentId={studentId}
            onView={setActiveDoc}
          />
        ))}
      </div>

      {activeDoc && (
        <DocumentModal
          doc={activeDoc}
          studentId={studentId}
          onClose={() => setActiveDoc(null)}
        />
      )}
    </>
  );
}
