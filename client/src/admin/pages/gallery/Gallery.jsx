// admin/pages/gallery/Gallery.jsx
// Changes vs original:
//  • AlbumDetail fetches images from the new paginated endpoint
//    GET /gallery/albums/:albumId/images?cursor=&limit=50
//  • "Load more" button appends next page
//  • Images display thumbUrl (thumbnail) in the grid
//  • Full-res URL is fetched on-demand when lightbox opens

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Images, Plus, Upload, Trash2, FolderOpen,
  Image as ImageIcon, X, Check, Loader2,
  ChevronLeft, Eye, Calendar, FileImage,
  AlertCircle, RefreshCw, BookOpen,
} from "lucide-react";
import PageLayout    from "../../components/PageLayout";
import { getToken }        from "../../../auth/storage";
import GalleryImageViewer  from "./components/GalleryImageViewer";

const API_URL     = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

/* ── Design tokens ── */
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

const fmtBytes = (b) =>
  !b ? "" : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

function Pulse({ w = "100%", h = 13, r = 8 }) {
  return <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }} />;
}

/* ── Create Album Modal ── */
function CreateAlbumModal({ onClose, onCreated }) {
  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const submit = async () => {
    if (!title.trim()) return setError("Album title is required");
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/api/gallery/albums`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create album");
      onCreated(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 20px 60px rgba(56,73,89,0.18)", width: "100%", maxWidth: 460 }}>
        <div style={{ padding: "18px 22px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.sky}22`, border: `1.5px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderOpen size={15} color={C.sky} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.text }}>New Album</p>
              <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>Create a photo album</p>
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
            { label: "Album Title *", value: title, set: setTitle, ph: "e.g. Annual Day 2025", tag: "input" },
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
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Create Album
          </button>
        </div>
      </div>
    </div>
  );
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

/* ════════════════════════════════════════
   ALBUM DETAIL — paginated image grid
════════════════════════════════════════ */
function AlbumDetail({ album, onBack, onRefresh }) {
  const [images, setImages]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [viewer, setViewer] = useState(null); // { index }
  const fileRef = useRef();

  // ── Fetch first page ──────────────────────────────────────────────────────
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

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      const res  = await fetch(`${API_URL}/api/gallery/albums/${album.id}/images`, {
        method: "POST", headers: authHeaders(), body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // Prepend newly uploaded images to the top of the grid
      setImages((prev) => [...(Array.isArray(data) ? data : []), ...prev]);
    } catch (err) { alert(err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  // ── Delete image ──────────────────────────────────────────────────────────
  const handleDelete = async (imageId) => {
    if (!confirm("Delete this photo?")) return;
    try {
      await fetch(`${API_URL}/api/gallery/images/${imageId}`, { method: "DELETE", headers: authHeaders() });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch { alert("Failed to delete image."); }
  };

  // ── Open viewer at specific image index ─────────────────────────────────
  const openViewer = (img) => {
    const idx = images.findIndex((i) => i.id === img.id);
    setViewer({ index: idx >= 0 ? idx : 0 });
  };

  return (
    <div className="fade-up">
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 11, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <ChevronLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.textLight }}>{images.length} photo{images.length !== 1 ? "s" : ""} loaded</span>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1 }}>
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Uploading…" : "Upload Photos"}
        </button>
      </div>

      {/* Image grid */}
      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, padding: 18, boxShadow: "0 2px 20px rgba(56,73,89,0.07)" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {[...Array(12)].map((_, i) => <Pulse key={i} h={160} r={12} />)}
          </div>
        ) : images.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <ImageIcon size={40} color={C.sky} strokeWidth={1.2} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.text }}>No photos yet</p>
            <p style={{ margin: "5px 0 0", fontSize: 12, color: C.textLight }}>Upload photos to this album</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {images.map((img) => (
                <div key={img.id} style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${C.borderLight}`, position: "relative", background: `${C.mist}30`, aspectRatio: "1" }}>
                  {/* Thumbnail — uses 300×300 WebP from R2 */}
                  <img
                    src={img.thumbUrl}
                    alt={img.caption || "Gallery photo"}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {/* Hover overlay */}
                  <div className="img-overlay" style={{ position: "absolute", inset: 0, background: "rgba(36,51,64,0)", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 6, padding: 8, transition: "background 0.18s", opacity: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(36,51,64,0.45)"; e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(36,51,64,0)"; e.currentTarget.style.opacity = "0"; }}>
                    <button onClick={() => openViewer(img)} title="View full size"
                      style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Eye size={13} color={C.deep} />
                    </button>
                    <button onClick={() => handleDelete(img.id)} title="Delete photo"
                      style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button onClick={() => fetchImages(nextCursor, true)} disabled={loadingMore}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 24px", borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: loadingMore ? "not-allowed" : "pointer", opacity: loadingMore ? 0.7 : 1 }}>
                  {loadingMore ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {loadingMore ? "Loading…" : "Load More Photos"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Full-featured image viewer */}
      {viewer && (
        <GalleryImageViewer
          images={images}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN GALLERY PAGE
════════════════════════════════════════ */
export default function Gallery() {
  const [albums, setAlbums]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showCreateModal, setShowCreate]  = useState(false);
  const [refreshKey, setRefreshKey]       = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/gallery/albums`, { headers: authHeaders() });
      const data = await res.json();
      setAlbums(data.albums || data || []);
    } catch { setAlbums([]); }
    finally { setLoading(false); }
  }, [refreshKey]); // eslint-disable-line

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const handleAlbumCreated = (album) => {
    setShowCreate(false);
    setAlbums((p) => [album, ...p]);
    setSelectedAlbum(album);
  };

  return (
    <PageLayout>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .img-overlay { pointer-events: all !important; }
        .img-overlay:hover { opacity: 1 !important; background: rgba(36,51,64,0.45) !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 30px", fontFamily: "'Inter', sans-serif", backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)` }}>
        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
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
            {!selectedAlbum && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={refresh} style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${C.mist}55`)} onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}>
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
                <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 13, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${C.deep}44` }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                  <Plus size={15} /> New Album
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedAlbum ? (
          <AlbumDetail album={selectedAlbum} onBack={() => { setSelectedAlbum(null); refresh(); }} onRefresh={refresh} />
        ) : (
          <div className="fade-up" style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 20px rgba(56,73,89,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.sky}22`, border: `1.5px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Images size={15} color={C.sky} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>All Albums</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{albums.length} album{albums.length !== 1 ? "s" : ""} total</p>
                </div>
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
                  <p style={{ margin: "5px 0 14px", fontSize: 12, color: C.textLight }}>Create your first album to start uploading photos</p>
                  <button onClick={() => setShowCreate(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <Plus size={14} /> Create First Album
                  </button>
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

      {showCreateModal && <CreateAlbumModal onClose={() => setShowCreate(false)} onCreated={handleAlbumCreated} />}
    </PageLayout>
  );
}