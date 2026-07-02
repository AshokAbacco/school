// admin/pages/gallery/GalleryVideosAdmin.jsx
//
// Admin-only counterpart to the shared GalleryVideos.jsx viewer. Lets the
// admin paste a YouTube link + title, validates it server-side, and lists /
// deletes existing videos. Wire this up as its own top-level route in the
// admin panel, e.g. "/admin/gallery-videos", separate from the photo
// Gallery.jsx page — matching the "separate top-level Videos section" choice.

import { useState, useEffect, useCallback } from "react";
import {
  Video, Plus, Trash2, X, Check, Loader2,
  PlayCircle, AlertCircle, RefreshCw,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL     = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

function Pulse({ h = 160, r = 12 }) {
  return <div className="animate-pulse" style={{ width: "100%", height: h, borderRadius: r, background: `${C.mist}55` }} />;
}

/* ── Add Video Modal ── */
function AddVideoModal({ onClose, onAdded }) {
  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [url, setUrl]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const submit = async () => {
    if (!title.trim()) return setError("Title is required");
    if (!url.trim()) return setError("YouTube link is required");
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/api/gallery/videos`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add video");
      onAdded(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 20px 60px rgba(56,73,89,0.18)", width: "100%", maxWidth: 460 }}>
        <div style={{ padding: "18px 22px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.sky}22`, border: `1.5px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Video size={15} color={C.sky} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.text }}>Add Video</p>
              <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>Paste a YouTube link</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 12 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {[
            { label: "Video Title *", value: title, set: setTitle, ph: "e.g. Annual Day 2025 Highlights", tag: "input" },
            { label: "YouTube Link *", value: url, set: setUrl, ph: "https://www.youtube.com/watch?v=…", tag: "input" },
            { label: "Description (optional)", value: description, set: setDesc, ph: "Brief description…", tag: "textarea" },
          ].map(({ label, value, set, ph, tag }) => (
            <div key={label}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textLight, display: "block", marginBottom: 6 }}>{label}</label>
              {tag === "input" ? (
                <input value={value} onChange={(e) => set(e.target.value)} placeholder={ph} onKeyDown={(e) => e.key === "Enter" && submit()}
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "10px 14px", fontSize: 13, color: C.text, background: C.bg, outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
              ) : (
                <textarea value={value} onChange={(e) => set(e.target.value)} placeholder={ph} rows={3}
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "10px 14px", fontSize: 13, color: C.text, background: C.bg, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  onFocus={(e) => (e.target.style.borderColor = C.sky)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1.5px solid ${C.borderLight}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Add Video
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video, onDelete }) {
  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: `1.5px solid ${C.borderLight}`, background: C.white, boxShadow: "0 2px 8px rgba(56,73,89,0.06)" }}>
      <div style={{ position: "relative", aspectRatio: "16/9", background: C.deep }}>
        <img src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`} alt={video.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,28,36,0.18)" }}>
          <PlayCircle size={30} color="#fff" strokeWidth={1.4} />
        </div>
        <button onClick={() => onDelete(video.id)} title="Delete video"
          style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Trash2 size={13} color="#dc2626" />
        </button>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.title}</p>
      </div>
    </div>
  );
}

export default function GalleryVideosAdmin() {
  const [videos, setVideos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAddModal, setShowAdd]  = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/gallery/videos`, { headers: authHeaders() });
      const data = await res.json();
      setVideos(data.videos || []);
    } catch { setVideos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleAdded = (video) => {
    setShowAdd(false);
    setVideos((prev) => [video, ...prev]);
  };

  const handleDelete = async (videoId) => {
    if (!confirm("Delete this video?")) return;
    try {
      await fetch(`${API_URL}/api/gallery/videos/${videoId}`, { method: "DELETE", headers: authHeaders() });
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch { alert("Failed to delete video."); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 30px", fontFamily: "'Inter', sans-serif", backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)` }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: "clamp(20px,4vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.6px" }}>Gallery Videos</h1>
          </div>
          <p style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: C.textLight, fontWeight: 500 }}>{videos.length} video{videos.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchVideos} style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 13, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${C.deep}44` }}>
            <Plus size={15} /> Add Video
          </button>
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, padding: 18, boxShadow: "0 2px 20px rgba(56,73,89,0.07)" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {[...Array(6)].map((_, i) => <Pulse key={i} h={160} />)}
          </div>
        ) : videos.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Video size={40} color={C.sky} strokeWidth={1.2} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.text }}>No videos yet</p>
            <p style={{ margin: "5px 0 14px", fontSize: 12, color: C.textLight }}>Add a YouTube link to get started</p>
            <button onClick={() => setShowAdd(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Plus size={14} /> Add First Video
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {videos.map((v) => <VideoCard key={v.id} video={v} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      {showAddModal && <AddVideoModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
    </div>
  );
}