// shared/components/GalleryViewer.jsx
//
// Read-only gallery: same visual language as the admin Gallery.jsx, but with
// no upload / delete / create-album affordances. Drop this into any role's
// route tree — student, parent, teacher, finance, superAdmin — unchanged.
//
// Only dependency assumption: getToken() exists at ../../auth/storage
// relative to wherever you place this file. Adjust the import path per role
// folder if your auth storage helper lives elsewhere.

import { useState, useEffect, useCallback } from "react";
import {
  Images, FolderOpen, Image as ImageIcon,
  ChevronLeft, Eye, RefreshCw,
} from "lucide-react";
import { getToken }        from "../../auth/storage";
import GalleryImageViewer  from "../../admin/pages/gallery/components/GalleryImageViewer";

const API_URL     = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

function Pulse({ w = "100%", h = 13, r = 8 }) {
  return <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }} />;
}

/* ── Album Card ── */
function AlbumCard({ album, onClick }) {
  return (
    <div onClick={() => onClick(album)} style={{ borderRadius: 18, overflow: "hidden", border: `1.5px solid ${C.borderLight}`, background: C.white, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(56,73,89,0.06)" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(56,73,89,0.13)`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(56,73,89,0.06)"; }}>
      <div style={{ height: 140, background: album.coverImageUrl ? "transparent" : `linear-gradient(135deg, ${C.mist}55, ${C.sky}33)`, position: "relative", overflow: "hidden" }}>
        {album.coverImageUrl ? (
          <img src={album.coverImageUrl} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Images size={34} color={C.sky} strokeWidth={1.2} />
          </div>
        )}
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(36,51,64,0.75)", borderRadius: 8, padding: "3px 8px", fontSize: 11, color: "#fff", fontWeight: 600 }}>
          {album._count?.images ?? 0} photos
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight }}>{fmtDate(album.createdAt)}</p>
      </div>
    </div>
  );
}

/* ── Album Detail — view only ── */
function AlbumDetail({ album, onBack }) {
  const [images, setImages]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor]   = useState(null);
  const [hasMore, setHasMore]         = useState(false);
  const [viewer, setViewer]           = useState(null);

  const fetchImages = useCallback(async (cursor = null, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (cursor) params.set("cursor", cursor);
      const res  = await fetch(`${API_URL}/api/gallery/albums/${album.id}/images?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setImages((prev) => append ? [...prev, ...(data.images || [])] : (data.images || []));
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch { /* silently handled */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [album.id]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const openViewer = (img) => {
    const idx = images.findIndex((i) => i.id === img.id);
    setViewer({ index: idx >= 0 ? idx : 0 });
  };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 11, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <ChevronLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.textLight }}>{images.length} photo{images.length !== 1 ? "s" : ""} loaded</span>
      </div>

      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, padding: 18, boxShadow: "0 2px 20px rgba(56,73,89,0.07)" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {[...Array(12)].map((_, i) => <Pulse key={i} h={160} r={12} />)}
          </div>
        ) : images.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <ImageIcon size={40} color={C.sky} strokeWidth={1.2} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.text }}>No photos yet</p>
            <p style={{ margin: "5px 0 0", fontSize: 12, color: C.textLight }}>Check back once the school adds photos</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {images.map((img) => (
                <div key={img.id} onClick={() => openViewer(img)} style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${C.borderLight}`, position: "relative", background: `${C.mist}30`, aspectRatio: "1", cursor: "pointer" }}>
                  <img src={img.thumbUrl} alt={img.caption || "Gallery photo"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div className="img-overlay" style={{ position: "absolute", inset: 0, background: "rgba(36,51,64,0)", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 8, transition: "background 0.18s", opacity: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(36,51,64,0.35)"; e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(36,51,64,0)"; e.currentTarget.style.opacity = "0"; }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Eye size={13} color={C.deep} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button onClick={() => fetchImages(nextCursor, true)} disabled={loadingMore}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 24px", borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: loadingMore ? "not-allowed" : "pointer", opacity: loadingMore ? 0.7 : 1 }}>
                  {loadingMore ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {loadingMore ? "Loading…" : "Load More Photos"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {viewer && (
        <GalleryImageViewer images={images} initialIndex={viewer.index} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}

/* ── Main viewer page ── */
export default function GalleryViewer() {
  const [albums, setAlbums]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/gallery/albums`, { headers: authHeaders() });
      const data = await res.json();
      setAlbums(data.albums || data || []);
    } catch { setAlbums([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease both; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 30px", fontFamily: "'Inter', sans-serif", backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)` }}>
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: "clamp(20px,4vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.6px" }}>
              {selectedAlbum ? selectedAlbum.title : "Gallery"}
            </h1>
          </div>
          <p style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
            {selectedAlbum ? selectedAlbum.description || "Photo album" : `${albums.length} album${albums.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {selectedAlbum ? (
          <AlbumDetail album={selectedAlbum} onBack={() => setSelectedAlbum(null)} />
        ) : (
          <div className="fade-up" style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 20px rgba(56,73,89,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", gap: 10, background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.sky}22`, border: `1.5px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FolderOpen size={15} color={C.sky} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>All Albums</p>
                <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{albums.length} album{albums.length !== 1 ? "s" : ""} total</p>
              </div>
            </div>
            <div style={{ padding: 18 }}>
              {loading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ borderRadius: 18, overflow: "hidden", border: `1.5px solid ${C.borderLight}` }}>
                      <Pulse h={140} r={0} /> <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}><Pulse h={14} w="70%" /><Pulse h={10} w="50%" /></div>
                    </div>
                  ))}
                </div>
              ) : albums.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: 18, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Images size={26} color={C.sky} strokeWidth={1.5} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.text }}>No albums yet</p>
                  <p style={{ margin: "5px 0 0", fontSize: 12, color: C.textLight }}>The school hasn't added any photos yet</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {albums.map((album) => <AlbumCard key={album.id} album={album} onClick={setSelectedAlbum} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}