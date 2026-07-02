// shared/components/GalleryVideos.jsx
//
// Standalone top-level "Videos" section (separate from photo albums).
// Plays YouTube videos in an embedded, on-site modal player — clicking a
// video never navigates the user away to youtube.com.

import { useState, useEffect, useCallback } from "react";
import { PlayCircle, X, Video } from "lucide-react";
import { getToken } from "../../auth/storage";

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

/* ── On-site embedded player modal ── */
function VideoPlayerModal({ video, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(20,28,36,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 860 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} color="#fff" />
          </button>
        </div>
        <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: 16, overflow: "hidden", background: "#000", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
        <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: "14px 2px 2px" }}>{video.title}</p>
        {video.description && (
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12.5, margin: "4px 2px 0" }}>{video.description}</p>
        )}
      </div>
    </div>
  );
}

/* ── Video card (thumbnail from YouTube's own CDN, no API key needed) ── */
function VideoCard({ video, onClick }) {
  return (
    <div onClick={() => onClick(video)} style={{ borderRadius: 18, overflow: "hidden", border: `1.5px solid ${C.borderLight}`, background: C.white, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(56,73,89,0.06)" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(56,73,89,0.13)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(56,73,89,0.06)"; }}>
      <div style={{ position: "relative", aspectRatio: "16/9", background: C.deep }}>
        <img
          src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
          alt={video.title}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,28,36,0.18)" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlayCircle size={26} color={C.deep} strokeWidth={1.6} />
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.title}</p>
      </div>
    </div>
  );
}

export default function GalleryVideos() {
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

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

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 30px", fontFamily: "'Inter', sans-serif", backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)` }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
          <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
          <h1 style={{ margin: 0, fontSize: "clamp(20px,4vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.6px" }}>Videos</h1>
        </div>
        <p style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
          {videos.length} video{videos.length !== 1 ? "s" : ""}
        </p>
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
            <p style={{ margin: "5px 0 0", fontSize: 12, color: C.textLight }}>Check back once the school adds videos</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {videos.map((v) => <VideoCard key={v.id} video={v} onClick={setPlaying} />)}
          </div>
        )}
      </div>

      {playing && <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}