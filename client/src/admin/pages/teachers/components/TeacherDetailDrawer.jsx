// client/src/admin/pages/teachers/components/TeacherDetailDrawer.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTeacherDetail } from "../hooks/useTeacherDetail.js";
import AssignmentsList from "./AssignmentsList.jsx";
import {
  updateTeacher, uploadTeacherProfileImage, fetchTeacherProfileImage,
  uploadTeacherDocument, fetchTeacherDocumentUrl,
} from "../api/teachersApi.js";
import {
  X, Edit, Check, Loader2, Eye, Download, ExternalLink,
  RefreshCw, Clock, File as FileIcon, AlertCircle, Camera, ChevronDown, ChevronUp,
} from "lucide-react";

const F = { fontFamily: "'Inter', sans-serif" };

const STATUS_MAP = {
  ACTIVE:     { dot: "#22c55e", label: "Active",     color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  ON_LEAVE:   { dot: "#f59e0b", label: "On Leave",   color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  RESIGNED:   { dot: "#9ca3af", label: "Resigned",   color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb" },
  TERMINATED: { dot: "#ef4444", label: "Terminated", color: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
};

const DOC_LABELS = {
  ID_PROOF:"ID Proof", ADDRESS_PROOF:"Address Proof",
  DEGREE_CERTIFICATE:"Degree Certificate", EXPERIENCE_CERTIFICATE:"Experience Certificate",
  CONTRACT_DOCUMENT:"Contract Document", PAN_CARD:"PAN Card",
  AADHAR_CARD:"Aadhaar Card", PHOTO:"Photo", CUSTOM:"Custom",
};
const DOC_ICONS = {
  DEGREE_CERTIFICATE:"🎓", EXPERIENCE_CERTIFICATE:"💼", ID_PROOF:"🪪",
  ADDRESS_PROOF:"🏠", PAN_CARD:"💳", AADHAR_CARD:"🪪", PHOTO:"📷",
  CONTRACT_DOCUMENT:"📑", CUSTOM:"📎",
};
const BLOOD_LABELS = { A_POS:"A+", A_NEG:"A−", B_POS:"B+", B_NEG:"B−", O_POS:"O+", O_NEG:"O−", AB_POS:"AB+", AB_NEG:"AB−" };
const STATUS_ACTIONS = {
  ACTIVE:     [{ to:"ON_LEAVE", label:"Set On Leave" }, { to:"RESIGNED", label:"Mark Resigned" }],
  ON_LEAVE:   [{ to:"ACTIVE",   label:"Mark Active"  }, { to:"RESIGNED", label:"Mark Resigned" }],
  RESIGNED:   [{ to:"ACTIVE",   label:"Re-Join (Active)" }],
  TERMINATED: [{ to:"ACTIVE",   label:"Re-Join (Active)" }],
};

const initials = (f, l) => `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();
const formatSize = (b) => !b ? "" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

function useIsMobile(bp = 640) {
  const [v, setV] = React.useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp-1}px)`);
    const h = (e) => setV(e.matches);
    mq.addEventListener("change", h); return () => mq.removeEventListener("change", h);
  }, [bp]);
  return v;
}

// ── InfoRow ───────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #EDF3FA" }}>
      <span style={{ fontSize: 11, color: "#9BBACF", ...F, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#1a2733", ...F, textAlign: "right", marginLeft: 16, wordBreak: "break-all", maxWidth: "58%" }}>{value}</span>
    </div>
  );
}

// ── EditField ─────────────────────────────────────────────────
function EditField({ label, value, onChange, type="text", as="input", options, placeholder }) {
  const base = {
    ...F, fontSize: 12, color: "#1a2733",
    background: "#f5f9fd", border: "1.5px solid #DDE9F5",
    borderRadius: 9, padding: "7px 10px", width: "100%",
    outline: "none", transition: "border-color 0.15s, box-shadow 0.15s", boxSizing: "border-box",
    letterSpacing: "-0.01em",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: "#9BBACF", ...F, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>
      {as === "select" ? (
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={{ ...base, cursor: "pointer", appearance: "none", WebkitAppearance: "none", paddingRight: 28 }}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : as === "textarea" ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
          style={{ ...base, resize: "none" }}
          onFocus={(e) => { e.target.style.borderColor="#88BDF2"; e.target.style.boxShadow="0 0 0 3px rgba(136,189,242,0.12)"; }}
          onBlur={(e)  => { e.target.style.borderColor="#DDE9F5"; e.target.style.boxShadow="none"; }} />
      ) : (
        <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={base}
          onFocus={(e) => { e.target.style.borderColor="#88BDF2"; e.target.style.boxShadow="0 0 0 3px rgba(136,189,242,0.12)"; }}
          onBlur={(e)  => { e.target.style.borderColor="#DDE9F5"; e.target.style.boxShadow="none"; }} />
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────
function Section({ title, children, defaultOpen=true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 14, borderBottom: "1.5px solid #EDF3FA", paddingBottom: 12 }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", background:"none", border:"none", cursor:"pointer", padding:"0 0 8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#9BBACF", ...F }}>{title}</span>
          {badge != null && (
            <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99, background:"#EDF3FA", color:"#384959", border:"1px solid #C8DCF0", ...F }}>{badge}</span>
          )}
        </div>
        <span style={{ color:"#C8DCF0", display:"flex" }}>
          {open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ── TeacherAvatar ─────────────────────────────────────────────
function TeacherAvatar({ teacher, editMode, onUpload, uploading, signedUrl }) {
  const fileInputRef = useRef(null);
  return (
    <div style={{ position:"relative", width:64, height:64, flexShrink:0 }}>
      <div style={{
        width:64, height:64, borderRadius:"50%", overflow:"hidden",
        display:"flex", alignItems:"center", justifyContent:"center",
        background:"linear-gradient(135deg, #88BDF2, #6A89A7)",
        color:"#fff", fontWeight:800, fontSize:22,
        border:"2.5px solid #EDF3FA", boxShadow:"0 2px 10px rgba(106,137,167,0.22)",
      }}>
        {uploading ? <Loader2 size={22} className="animate-spin" color="#fff" />
          : signedUrl ? <img src={signedUrl} alt={teacher.firstName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : initials(teacher.firstName, teacher.lastName)
        }
      </div>
      {editMode && !uploading && (
        <button onClick={() => fileInputRef.current?.click()} title="Change photo"
          style={{ position:"absolute", bottom:0, right:0, width:24, height:24, borderRadius:"50%", background:"#243340", border:"2.5px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0, boxShadow:"0 1px 4px rgba(36,51,64,0.25)" }}>
          <Camera size={10} color="#fff" />
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }}
        onChange={(e) => { const f=e.target.files[0]; if(f) onUpload(f); e.target.value=""; }} />
    </div>
  );
}

// ── DocViewerModal ────────────────────────────────────────────
function DocViewerModal({ doc, teacherId, onClose }) {
  const [state, setState] = useState("loading");
  const [url, setUrl] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const timerRef = useRef(null);
  const EXPIRY = 300;

  const fetchUrl = useCallback(async () => {
    setState("loading"); setErrMsg(""); clearInterval(timerRef.current);
    try {
      const data = await fetchTeacherDocumentUrl(teacherId, doc.id);
      setUrl(data.url); setTimeLeft(data.expiresIn ?? EXPIRY); setState("ready");
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => { if (t <= 1) { clearInterval(timerRef.current); setState("expired"); return 0; } return t - 1; });
      }, 1000);
    } catch (e) { setState("error"); setErrMsg(e.message); }
  }, [doc.id, teacherId]);

  useEffect(() => { fetchUrl(); return () => clearInterval(timerRef.current); }, [fetchUrl]);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const label = doc.customLabel || DOC_LABELS[doc.documentType] || doc.documentType;
  const isImage = ["jpg","jpeg","png","webp"].includes(doc.fileType?.toLowerCase());
  const isPdf = doc.fileType?.toLowerCase() === "pdf";
  const fmtTime = (s) => s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(36,51,64,0.75)", backdropFilter:"blur(5px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width:"100%", maxWidth:860, maxHeight:"90vh", background:"#fff", borderRadius:18, overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 32px 80px rgba(36,51,64,0.28)", border:"1px solid #E4EEF8" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:"#1a2733", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:11, background:"rgba(189,221,252,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
              {DOC_ICONS[doc.documentType] ?? "📎"}
            </div>
            <div>
              <p style={{ margin:0, fontWeight:700, fontSize:13, color:"#fff", ...F, letterSpacing:"-0.01em" }}>{label}</p>
              <p style={{ margin:0, fontSize:11, color:"#88BDF2", ...F }}>
                {doc.fileType?.toUpperCase()}{doc.fileSizeBytes ? ` · ${formatSize(doc.fileSizeBytes)}` : ""}
              </p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {state === "ready" && timeLeft !== null && (
              <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, background:timeLeft < 30 ? "rgba(239,68,68,0.22)" : "rgba(136,189,242,0.15)", fontSize:11, fontWeight:600, color:timeLeft < 30 ? "#fca5a5" : "#BDDDFC", ...F }}>
                <Clock size={11}/> {fmtTime(timeLeft)}
              </div>
            )}
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"none", background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#BDDDFC" }}>
              <X size={15}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, background:"#f5f9fd" }}>
          {state === "loading" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"60px 0" }}>
              <Loader2 size={32} className="animate-spin" style={{ color:"#88BDF2" }}/>
              <p style={{ fontSize:13, color:"#6A89A7", ...F }}>Generating secure link…</p>
            </div>
          )}
          {state === "error" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, padding:"60px 24px", textAlign:"center" }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"rgba(239,68,68,0.08)", border:"1px solid #fecaca", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <AlertCircle size={26} style={{ color:"#ef4444" }}/>
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:13, color:"#1a2733", margin:"0 0 4px", ...F }}>Failed to load document</p>
                <p style={{ fontSize:12, color:"#6A89A7", margin:0, ...F }}>{errMsg}</p>
              </div>
              <button onClick={fetchUrl} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", borderRadius:10, background:"#243340", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", ...F }}>
                <RefreshCw size={13}/> Retry
              </button>
            </div>
          )}
          {state === "expired" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, padding:"60px 24px", textAlign:"center" }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"#EDF3FA", border:"1px solid #C8DCF0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Clock size={26} style={{ color:"#9BBACF" }}/>
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:13, color:"#1a2733", margin:"0 0 4px", ...F }}>Secure link expired</p>
                <p style={{ fontSize:12, color:"#6A89A7", margin:0, ...F }}>Links expire after {EXPIRY}s for security</p>
              </div>
              <button onClick={fetchUrl} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", borderRadius:10, background:"#243340", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", ...F }}>
                <RefreshCw size={13}/> Generate New Link
              </button>
            </div>
          )}
          {state === "ready" && url && (
            <div style={{ width:"100%", flex:1, display:"flex", flexDirection:"column" }}>
              {isImage ? (
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
                  <img src={url} alt={label} style={{ maxWidth:"100%", maxHeight:"60vh", objectFit:"contain", borderRadius:12, boxShadow:"0 4px 24px rgba(36,51,64,0.12)", border:"1px solid #E4EEF8" }}/>
                </div>
              ) : isPdf ? (
                <iframe src={url} title={label} style={{ width:"100%", flex:1, minHeight:500, border:"none" }}/>
              ) : (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:"60px 24px", textAlign:"center" }}>
                  <div style={{ width:56, height:56, borderRadius:18, background:"#EDF3FA", border:"1px solid #C8DCF0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <FileIcon size={28} style={{ color:"#9BBACF" }}/>
                  </div>
                  <p style={{ fontSize:13, fontWeight:600, color:"#384959", margin:0, ...F }}>Preview not available for this file type</p>
                  <a href={url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", borderRadius:10, background:"#243340", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none", ...F }}>
                    <Download size={13}/> Download File
                  </a>
                </div>
              )}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 20px", borderTop:"1px solid #E4EEF8", background:"#fff", flexShrink:0 }}>
                <p style={{ fontSize:11, color:"#9BBACF", margin:0, ...F }}>🔒 Secure signed URL</p>
                <div style={{ display:"flex", gap:8 }}>
                  <a href={url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:9, background:"#f5f9fd", border:"1px solid #E4EEF8", color:"#384959", fontSize:11, fontWeight:600, textDecoration:"none", ...F }}>
                    <ExternalLink size={11}/> Open in Tab
                  </a>
                  {/* <button onClick={async () => {
                    try {
                      const res = await fetch(url);
                      const blob = await res.blob();
                      // Force octet-stream so browser always saves, never opens PDF viewer
                      const forceBlob = new Blob([blob], { type: "application/octet-stream" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(forceBlob);
                      a.download = `${label}.${doc.fileType || "file"}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(a.href);
                    } catch { window.open(url, "_blank"); }
                  }} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:9, background:"#243340", border:"none", color:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", ...F }}>
                    <Download size={11}/> Download
                  </button> */}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DocRow ────────────────────────────────────────────────────
function DocRow({ doc, teacherId, editMode, onView, onReplaced }) {
  const fileRef = useRef(null);
  const [replacing, setReplacing] = useState(false);
  const [replaceErr, setReplaceErr] = useState("");

  const handleReplace = async (file) => {
    setReplacing(true); setReplaceErr("");
    try { await uploadTeacherDocument(teacherId, file, doc.documentType, doc.customLabel||""); onReplaced(); }
    catch (e) { setReplaceErr(e.message||"Failed"); }
    finally { setReplacing(false); }
  };

  const label = doc.customLabel || DOC_LABELS[doc.documentType] || doc.documentType;

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 13px", borderRadius:11, background:"#f5f9fd", border:"1.5px solid #E4EEF8", gap:8, transition:"border-color 0.12s" }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor="#C8DCF0"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor="#E4EEF8"}>
      <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, flex:1 }}>
        <span style={{ fontSize:16, flexShrink:0 }}>{DOC_ICONS[doc.documentType]??"📎"}</span>
        <div style={{ minWidth:0 }}>
          <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#1a2733", ...F, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:"-0.01em" }}>{label}</p>
          <p style={{ margin:"2px 0 0", fontSize:10, color:"#9BBACF", ...F }}>
            {doc.fileType?.toUpperCase()}{doc.fileSizeBytes ? ` · ${formatSize(doc.fileSizeBytes)}` : ""}
          </p>
          {replaceErr && <p style={{ margin:"2px 0 0", fontSize:10, color:"#b91c1c", ...F }}>⚠ {replaceErr}</p>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, ...F,
          color:doc.isVerified?"#166534":"#92400e", background:doc.isVerified?"#f0fdf4":"#fffbeb",
          border:`1px solid ${doc.isVerified?"#86efac":"#fde68a"}` }}>
          {doc.isVerified ? "✓ Verified" : "Pending"}
        </span>
        {!editMode && (
          <button onClick={() => onView(doc)}
            style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:8, background:"#243340", border:"none", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", ...F }}>
            <Eye size={11}/> View
          </button>
        )}
        {editMode && (
          <>
            <button onClick={() => fileRef.current?.click()} disabled={replacing}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:8, background:replacing?"#EDF3FA":"linear-gradient(135deg,#6A89A7,#384959)", border:"none", color:replacing?"#6A89A7":"#fff", fontSize:11, fontWeight:700, cursor:replacing?"not-allowed":"pointer", ...F }}>
              {replacing ? <><Loader2 size={11} className="animate-spin"/> Replacing…</> : "↻ Replace"}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }}
              onChange={(e) => { const f=e.target.files[0]; if(f) handleReplace(f); e.target.value=""; }}/>
          </>
        )}
      </div>
    </div>
  );
}

// ── DrawerDocUpload ───────────────────────────────────────────
function DrawerDocUpload({ teacherId, onUploaded }) {
  const fileRef = useRef(null);
  const [docType, setDocType] = useState("DEGREE_CERTIFICATE");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = async (file) => {
    setUploading(true); setErr("");
    try { await uploadTeacherDocument(teacherId, file, docType); onUploaded(); }
    catch (e) { setErr(e.message||"Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:10 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <select value={docType} onChange={(e) => setDocType(e.target.value)}
          style={{ flex:1, padding:"8px 10px", borderRadius:9, border:"1.5px solid #DDE9F5", background:"#f5f9fd", color:"#1a2733", fontSize:12, ...F, outline:"none", cursor:"pointer" }}>
          <option value="DEGREE_CERTIFICATE">🎓 Degree Certificate</option>
          <option value="EXPERIENCE_CERTIFICATE">💼 Experience Certificate</option>
          <option value="ID_PROOF">🪪 ID Proof</option>
          <option value="ADDRESS_PROOF">🏠 Address Proof</option>
          <option value="PAN_CARD">💳 PAN Card</option>
          <option value="AADHAR_CARD">🪪 Aadhaar Card</option>
          <option value="CONTRACT_DOCUMENT">📑 Contract Document</option>
          <option value="CUSTOM">📎 Other / Custom</option>
        </select>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:9, border:"none", background:uploading?"#EDF3FA":"#243340", color:uploading?"#6A89A7":"#fff", fontSize:12, fontWeight:700, cursor:uploading?"not-allowed":"pointer", ...F, flexShrink:0 }}>
          {uploading ? <><Loader2 size={12} className="animate-spin"/> Uploading…</> : <>📎 Upload</>}
        </button>
      </div>
      {err && <p style={{ fontSize:11, color:"#b91c1c", ...F, margin:0 }}>⚠ {err}</p>}
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }}
        onChange={(e) => { const f=e.target.files[0]; if(f) handleFile(f); e.target.value=""; }}/>
    </div>
  );
}

const G2 = ({ children, sm }) => (
  <div style={{ display:"grid", gridTemplateColumns: sm ? "1fr" : "1fr 1fr", gap:10 }}>{children}</div>
);
const G3 = ({ children, sm }) => (
  <div style={{ display:"grid", gridTemplateColumns: sm ? "1fr" : "1fr 1fr 1fr", gap:10 }}>{children}</div>
);

// ── Main Drawer ───────────────────────────────────────────────
export default function TeacherDetailDrawer({ teacherId, onClose, onUpdate }) {
  const { teacher, loading, error, invalidate } = useTeacherDetail(teacherId);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState(null);
  const [signedImageUrl, setSignedImageUrl] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [viewingDoc, setViewingDoc] = useState(null);
  const isSmall = useIsMobile(480);
  const isMobileDrawer = useIsMobile(640);

  useEffect(() => {
    if (!teacher) return;
    if (teacher.profileImage) fetchTeacherProfileImage(teacherId).then((d) => setSignedImageUrl(d.url)).catch(() => setSignedImageUrl(null));
    else setSignedImageUrl(null);
  }, [teacher?.profileImage, teacherId]);

  useEffect(() => {
    if (teacher) setForm({
      firstName:teacher.firstName??"", lastName:teacher.lastName??"", phone:teacher.phone??"",
      gender:teacher.gender??"", dateOfBirth:teacher.dateOfBirth?teacher.dateOfBirth.split("T")[0]:"",
      employeeCode:teacher.employeeCode??"", department:teacher.department??"",
      designation:teacher.designation??"", qualification:teacher.qualification??"",
      experienceYears:teacher.experienceYears??"", joiningDate:teacher.joiningDate?teacher.joiningDate.split("T")[0]:"",
      employmentType:teacher.employmentType??"FULL_TIME", address:teacher.address??"",
      city:teacher.city??"", state:teacher.state??"", zipCode:teacher.zipCode??"",
      salary:teacher.salary??"", bankName:teacher.bankName??"", bankAccountNo:teacher.bankAccountNo??"",
      ifscCode:teacher.ifscCode??"", panNumber:teacher.panNumber??"", aadhaarNumber:teacher.aadhaarNumber??"",
      bloodGroup:teacher.bloodGroup??"", emergencyContact:teacher.emergencyContact??"",
      medicalConditions:teacher.medicalConditions??"", allergies:teacher.allergies??"",
    });
  }, [teacher]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { if (viewingDoc) { setViewingDoc(null); return; } if (editMode) setEditMode(false); else onClose(); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [editMode, onClose, viewingDoc]);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const handleAvatarUpload = async (file) => {
    setImageUploading(true); setImageError("");
    try { await uploadTeacherProfileImage(teacherId, file); const d = await fetchTeacherProfileImage(teacherId); setSignedImageUrl(d.url); invalidate(); onUpdate(); }
    catch (err) { setImageError(err.message||"Failed to upload"); }
    finally { setImageUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setSaveError("");
    try {
      await updateTeacher(teacherId, {
        ...form,
        experienceYears: form.experienceYears !== "" ? Number(form.experienceYears) : undefined,
        salary: form.salary !== "" ? Number(form.salary) : undefined,
        dateOfBirth: form.dateOfBirth || undefined, bloodGroup: form.bloodGroup || undefined,
        emergencyContact: form.emergencyContact || undefined, medicalConditions: form.medicalConditions || undefined,
        allergies: form.allergies || undefined,
      });
      invalidate(); onUpdate(); setEditMode(false);
    } catch (err) { setSaveError(err.message); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus) => {
    const msg = newStatus === "ACTIVE" && ["RESIGNED","TERMINATED"].includes(teacher.status)
      ? `Re-join ${teacher.firstName} as Active?`
      : `Change status to "${STATUS_MAP[newStatus]?.label}"?`;
    if (!window.confirm(msg)) return;
    try { await updateTeacher(teacherId, { status: newStatus }); invalidate(); onUpdate(); }
    catch (err) { alert(err.message); }
  };

  const st = teacher ? (STATUS_MAP[teacher.status] ?? STATUS_MAP.ACTIVE) : null;
  const actions = teacher ? (STATUS_ACTIONS[teacher.status] ?? []) : [];

  return (
    <>
      <style>{`
        @keyframes tdd-slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        @keyframes tdd-slideUp  { from { transform:translateY(100%); } to { transform:translateY(0); } }
      `}</style>

      {/* Overlay */}
      <div style={{ position:"fixed", inset:0, zIndex:40, background:"rgba(36,51,64,0.28)", backdropFilter:"blur(3px)" }}
        onClick={() => { if (!editMode && !viewingDoc) onClose(); }}/>

      {/* Drawer */}
      <aside style={isMobileDrawer ? {
        position:"fixed", bottom:0, left:0, right:0, zIndex:50, height:"90vh", width:"100%",
        background:"#fff", boxShadow:"0 -8px 48px rgba(36,51,64,0.18)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        borderRadius:"20px 20px 0 0", animation:"tdd-slideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
      } : {
        position:"fixed", top:0, right:0, height:"100%", zIndex:50,
        width:500, maxWidth:"95vw", background:"#fff",
        boxShadow:"-8px 0 48px rgba(36,51,64,0.14)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        animation:"tdd-slideIn 0.22s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {isMobileDrawer && (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:10, flexShrink:0 }}>
            <div style={{ width:40, height:4, borderRadius:99, background:"#DDE9F5" }}/>
          </div>
        )}

        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 20px",
          background:"#fafcff",
          borderBottom:"1.5px solid #E4EEF8", flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:4, height:20, borderRadius:99, background:"linear-gradient(180deg, #88BDF2, #243340)", flexShrink:0 }}/>
            <h2 style={{ margin:0, fontWeight:800, fontSize:14, color:"#1a2733", ...F, letterSpacing:"-0.02em" }}>
              {editMode ? "Edit Teacher" : "Teacher Profile"}
            </h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            {teacher && !editMode && (
              <button onClick={() => setEditMode(true)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:9, background:"#f5f9fd", border:"1.5px solid #E4EEF8", color:"#384959", fontSize:12, fontWeight:600, cursor:"pointer", ...F, transition:"all 0.13s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background="#EDF3FA"; e.currentTarget.style.borderColor="#C8DCF0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background="#f5f9fd"; e.currentTarget.style.borderColor="#E4EEF8"; }}>
                <Edit size={12}/> Edit
              </button>
            )}
            {editMode && (
              <>
                <button onClick={() => { setEditMode(false); setSaveError(""); }}
                  style={{ padding:"6px 12px", borderRadius:9, background:"#f5f9fd", border:"1.5px solid #E4EEF8", color:"#9BBACF", fontSize:12, fontWeight:600, cursor:"pointer", ...F }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:9, background:"#243340", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1, ...F }}>
                  {saving ? <><Loader2 size={12} className="animate-spin"/> Saving…</> : <><Check size={12}/> Save</>}
                </button>
              </>
            )}
            <button onClick={onClose}
              style={{ width:30, height:30, borderRadius:9, border:"1.5px solid #E4EEF8", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#9BBACF" }}
              onMouseEnter={(e) => { e.currentTarget.style.background="#EDF3FA"; e.currentTarget.style.borderColor="#C8DCF0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background="#fff"; e.currentTarget.style.borderColor="#E4EEF8"; }}>
              <X size={13}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 20px" }}>
          {loading && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:192 }}>
              <div className="animate-spin" style={{ width:32, height:32, borderRadius:"50%", border:"3px solid #E4EEF8", borderTopColor:"#384959" }}/>
            </div>
          )}

          {error && <p style={{ fontSize:13, color:"#b91c1c", textAlign:"center", padding:"40px 0", ...F }}>⚠ {error}</p>}

          {(saveError || imageError) && (
            <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:11, background:"#fef2f2", border:"1px solid #fecaca", color:"#b91c1c", fontSize:12, ...F }}>
              ⚠ {saveError || imageError}
            </div>
          )}

          {teacher && form && (
            <>
              {/* Profile Hero */}
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20, paddingBottom:18, borderBottom:"1.5px solid #E4EEF8" }}>
                <TeacherAvatar teacher={teacher} editMode={editMode} onUpload={handleAvatarUpload} uploading={imageUploading} signedUrl={signedImageUrl}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:2 }}>
                    <h3 style={{ margin:0, fontWeight:800, fontSize:15, color:"#1a2733", ...F, letterSpacing:"-0.02em" }}>
                      {teacher.firstName} {teacher.lastName}
                    </h3>
                  </div>
                  <p style={{ margin:0, fontSize:12, color:"#6A89A7", ...F }}>{teacher.designation}</p>
                  <p style={{ margin:"2px 0 0", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#88BDF2", ...F }}>{teacher.department}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:7, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, color:st.color, background:st.bg, border:`1px solid ${st.border}`, ...F, display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:st.dot, flexShrink:0, display:"inline-block" }}/>
                      {st.label}
                    </span>
                    {teacher.bloodGroup && (
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, background:"#fef2f2", color:"#991b1b", border:"1px solid #fecaca", ...F }}>
                        🩸 {BLOOD_LABELS[teacher.bloodGroup] ?? teacher.bloodGroup}
                      </span>
                    )}
                    {teacher.employeeCode && (
                      <span style={{ fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:99, background:"#EDF3FA", color:"#6A89A7", border:"1px solid #DDE9F5", ...F }}>
                        {teacher.employeeCode}
                      </span>
                    )}
                  </div>
                  {editMode && (
                    <p style={{ fontSize:10, color:"#88BDF2", marginTop:5, ...F }}>
                      {imageUploading ? "Uploading photo…" : "Click + on avatar to change photo"}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              {!editMode && actions.length > 0 && (
                <div style={{ marginBottom:14, paddingBottom:12, borderBottom:"1.5px solid #E4EEF8" }}>
                  <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#9BBACF", ...F }}>Status Actions</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                    {actions.map((a) => (
                      <button key={a.to} onClick={() => handleStatusChange(a.to)}
                        style={{ padding:"7px 13px", borderRadius:9, background:"#f5f9fd", border:"1.5px solid #E4EEF8", color:"#384959", fontSize:12, fontWeight:600, cursor:"pointer", ...F, transition:"all 0.13s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background="#243340"; e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="#243340"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background="#f5f9fd"; e.currentTarget.style.color="#384959"; e.currentTarget.style.borderColor="#E4EEF8"; }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Basic Info */}
              <Section title="Basic Information">
                {editMode ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <G2 sm={isSmall}>
                      <EditField label="First Name" value={form.firstName} onChange={set("firstName")}/>
                      <EditField label="Last Name"  value={form.lastName}  onChange={set("lastName")}/>
                    </G2>
                    <G2 sm={isSmall}>
                      <EditField label="Phone" value={form.phone} onChange={set("phone")} placeholder="+91 XXXXX XXXXX"/>
                      <EditField label="Date of Birth" value={form.dateOfBirth} onChange={set("dateOfBirth")} type="date"/>
                    </G2>
                    <EditField label="Gender" value={form.gender} onChange={set("gender")} as="select"
                      options={[{value:"",label:"Select"},{value:"MALE",label:"Male"},{value:"FEMALE",label:"Female"},{value:"OTHER",label:"Other"}]}/>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Employee Code" value={teacher.employeeCode}/>
                    <InfoRow label="Email"         value={teacher.user?.email}/>
                    <InfoRow label="Phone"         value={teacher.phone}/>
                    <InfoRow label="Gender"        value={teacher.gender}/>
                    <InfoRow label="Date of Birth" value={teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString("en-IN") : null}/>
                    <InfoRow label="Last Login"    value={teacher.user?.lastLoginAt ? new Date(teacher.user.lastLoginAt).toLocaleString("en-IN") : "Never"}/>
                  </>
                )}
              </Section>

              {/* Section: Professional */}
              <Section title="Professional Details">
                {editMode ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <G2 sm={isSmall}>
                      <EditField label="Employee Code" value={form.employeeCode} onChange={set("employeeCode")} placeholder="e.g. TCH-001"/>
                      <EditField label="Qualification" value={form.qualification} onChange={set("qualification")} placeholder="e.g. B.Ed"/>
                    </G2>
                    <G2 sm={isSmall}>
                      <EditField label="Department"  value={form.department}  onChange={set("department")}  placeholder="e.g. Science"/>
                      <EditField label="Designation" value={form.designation} onChange={set("designation")} placeholder="e.g. Senior Teacher"/>
                    </G2>
                    <G2 sm={isSmall}>
                      <EditField label="Experience (yrs)" value={form.experienceYears} onChange={set("experienceYears")} type="number" placeholder="e.g. 5"/>
                      <EditField label="Joining Date" value={form.joiningDate} onChange={set("joiningDate")} type="date"/>
                    </G2>
                    <EditField label="Employment Type" value={form.employmentType} onChange={set("employmentType")} as="select"
                      options={[{value:"FULL_TIME",label:"Full Time"},{value:"PART_TIME",label:"Part Time"},{value:"CONTRACT",label:"Contract"},{value:"TEMPORARY",label:"Temporary"}]}/>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Department"      value={teacher.department}/>
                    <InfoRow label="Designation"     value={teacher.designation}/>
                    <InfoRow label="Qualification"   value={teacher.qualification}/>
                    <InfoRow label="Experience"      value={teacher.experienceYears != null ? `${teacher.experienceYears} years` : null}/>
                    <InfoRow label="Joining Date"    value={teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString("en-IN") : null}/>
                    <InfoRow label="Employment Type" value={teacher.employmentType?.replace(/_/g," ")}/>
                    <InfoRow label="Status"          value={st.label}/>
                  </>
                )}
              </Section>

              {/* Section: Address */}
              <Section title="Address" defaultOpen={false}>
                {editMode ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <EditField label="Street Address" value={form.address} onChange={set("address")} placeholder="House no, Street name"/>
                    <G3 sm={isSmall}>
                      <EditField label="City"     value={form.city}    onChange={set("city")}    placeholder="City"/>
                      <EditField label="State"    value={form.state}   onChange={set("state")}   placeholder="State"/>
                      <EditField label="ZIP Code" value={form.zipCode} onChange={set("zipCode")} placeholder="PIN"/>
                    </G3>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Street" value={teacher.address}/>
                    <InfoRow label="City"   value={teacher.city}/>
                    <InfoRow label="State"  value={teacher.state}/>
                    <InfoRow label="ZIP"    value={teacher.zipCode}/>
                    {!teacher.address && !teacher.city && !teacher.state && (
                      <p style={{ fontSize:12, color:"#9BBACF", ...F, padding:"4px 0" }}>No address added.</p>
                    )}
                  </>
                )}
              </Section>

              {/* Section: Payroll */}
              <Section title="Payroll & Banking" defaultOpen={false}>
                {editMode ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <G2 sm={isSmall}>
                      <EditField label="Salary (₹)"  value={form.salary}   onChange={set("salary")}   type="number" placeholder="e.g. 45000"/>
                      <EditField label="Bank Name"   value={form.bankName} onChange={set("bankName")} placeholder="e.g. SBI"/>
                    </G2>
                    <G2 sm={isSmall}>
                      <EditField label="Account No." value={form.bankAccountNo} onChange={set("bankAccountNo")} placeholder="Account number"/>
                      <EditField label="IFSC Code"   value={form.ifscCode}      onChange={set("ifscCode")}      placeholder="e.g. SBIN0001234"/>
                    </G2>
                    <G2 sm={isSmall}>
                      <EditField label="PAN Number"     value={form.panNumber}     onChange={set("panNumber")}     placeholder="e.g. ABCDE1234F"/>
                      <EditField label="Aadhaar Number" value={form.aadhaarNumber} onChange={set("aadhaarNumber")} placeholder="12-digit"/>
                    </G2>
                    <div style={{ padding:"9px 12px", borderRadius:9, background:"#fffbeb", border:"1px solid #fde68a", fontSize:11, color:"#92400e", ...F }}>
                      🔒 Payroll data is sensitive and access-controlled.
                    </div>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Salary"      value={teacher.salary ? `₹ ${Number(teacher.salary).toLocaleString("en-IN")}` : null}/>
                    <InfoRow label="Bank Name"   value={teacher.bankName}/>
                    <InfoRow label="Account No." value={teacher.bankAccountNo}/>
                    <InfoRow label="IFSC"        value={teacher.ifscCode}/>
                    <InfoRow label="PAN Number"  value={teacher.panNumber}/>
                    <InfoRow label="Aadhaar"     value={teacher.aadhaarNumber}/>
                    {!teacher.salary && !teacher.bankName && !teacher.panNumber && (
                      <p style={{ fontSize:12, color:"#9BBACF", ...F, padding:"4px 0" }}>No payroll data added.</p>
                    )}
                  </>
                )}
              </Section>

              {/* Section: Medical */}
              <Section title="Medical & Emergency" defaultOpen={false}>
                {editMode ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <EditField label="Emergency Contact" value={form.emergencyContact} onChange={set("emergencyContact")} type="tel" placeholder="Phone for emergency"/>
                    <EditField label="Blood Group" value={form.bloodGroup} onChange={set("bloodGroup")} as="select"
                      options={[{value:"",label:"Select Blood Group"},{value:"A_POS",label:"A+"},{value:"A_NEG",label:"A−"},{value:"B_POS",label:"B+"},{value:"B_NEG",label:"B−"},{value:"O_POS",label:"O+"},{value:"O_NEG",label:"O−"},{value:"AB_POS",label:"AB+"},{value:"AB_NEG",label:"AB−"}]}/>
                    <EditField label="Medical Conditions" value={form.medicalConditions} onChange={set("medicalConditions")} as="textarea" placeholder="e.g. Diabetes (none if blank)"/>
                    <EditField label="Allergies" value={form.allergies} onChange={set("allergies")} as="textarea" placeholder="e.g. Penicillin (none if blank)"/>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Emergency Contact"  value={teacher.emergencyContact}/>
                    <InfoRow label="Blood Group"        value={teacher.bloodGroup ? (BLOOD_LABELS[teacher.bloodGroup] ?? teacher.bloodGroup) : null}/>
                    <InfoRow label="Medical Conditions" value={teacher.medicalConditions}/>
                    <InfoRow label="Allergies"          value={teacher.allergies}/>
                    {!teacher.emergencyContact && !teacher.bloodGroup && !teacher.medicalConditions && !teacher.allergies && (
                      <p style={{ fontSize:12, color:"#9BBACF", ...F, padding:"4px 0" }}>No medical information added.</p>
                    )}
                  </>
                )}
              </Section>

              {/* Section: Assignments */}
              <Section title="Assignments" badge={teacher.assignments?.length ?? 0}>
                {editMode ? (
                  <div style={{ padding:"10px 14px", borderRadius:11, background:"#f5f9fd", border:"1.5px solid #E4EEF8", fontSize:12, color:"#6A89A7", ...F }}>
                    💡 Save changes first, then manage assignments in view mode.
                  </div>
                ) : (
                  <AssignmentsList assignments={teacher.assignments} teacherId={teacherId}
                    onUpdate={() => { invalidate(); onUpdate(); }}/>
                )}
              </Section>

              {/* Section: Documents */}
              <Section title="Documents" badge={teacher.documents?.length ?? 0} defaultOpen={false}>
                {teacher.documents?.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
                    {teacher.documents.map((doc) => (
                      <DocRow key={doc.id} doc={doc} teacherId={teacherId} editMode={editMode}
                        onView={setViewingDoc} onReplaced={() => { invalidate(); onUpdate(); }}/>
                    ))}
                  </div>
                )}
                <div style={{ borderTop: teacher.documents?.length ? "1.5px solid #E4EEF8" : "none", paddingTop: teacher.documents?.length ? 10 : 0 }}>
                  <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9BBACF", ...F, marginBottom:4 }}>Upload New Document</p>
                  <DrawerDocUpload teacherId={teacherId} onUploaded={() => { invalidate(); onUpdate(); }}/>
                </div>
              </Section>
            </>
          )}
        </div>
      </aside>

      {viewingDoc && <DocViewerModal doc={viewingDoc} teacherId={teacherId} onClose={() => setViewingDoc(null)}/>}
    </>
  );
}