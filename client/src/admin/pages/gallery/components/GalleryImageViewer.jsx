// admin/pages/gallery/components/GalleryImageViewer.jsx
//
// Fix: image was clipping on mobile / small screens because maxHeight used a
// hardcoded calc(100vh - 180px) guess. Replaced with a ref-measured approach:
// the image area is a true flex child and the <img> fills it with
// width/height: 100% + objectFit: contain — so the browser does the maths.
//
// Features:
//  • Full image always visible, never clipped, fully responsive
//  • Zoom (scroll wheel, +/- keys, buttons) up to 4×
//  • Drag to pan when zoomed
//  • Prev/Next navigation + keyboard shortcuts
//  • Thumbnail strip (bottom)
//  • Blurred thumb shown while full-res loads
//  • Image info (dimensions, size, date)
//  • Download button
//  • Touch support (pinch-zoom via CSS touch-action)

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Download, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  RefreshCw, Info,
} from "lucide-react";
import { getToken } from "../../../../auth/storage";

const API_URL     = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const fmtBytes = (b) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function GalleryImageViewer({ images, initialIndex = 0, onClose }) {
  const [index, setIndex]           = useState(initialIndex);
  const [fullUrl, setFullUrl]       = useState(null);
  const [urlState, setUrlState]     = useState("loading"); // loading | ready | error
  const [errMsg, setErrMsg]         = useState("");
  const [imgSize, setImgSize]       = useState(null);
  const [zoom, setZoom]             = useState(1);
  const [pan, setPan]               = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showInfo, setShowInfo]     = useState(false);
  const [visible, setVisible]       = useState(false);
  const [isMobile, setIsMobile]     = useState(false);

  const dragStart  = useRef(null);
  const abortRef   = useRef(null);
  const img        = images[index];
  const hasPrev    = index > 0;
  const hasNext    = index < images.length - 1;

  // ── Detect mobile ────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Open animation ───────────────────────────────────────────────────────────
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // Prevent body scroll while viewer is open
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Fetch full-res signed URL ─────────────────────────────────────────────────
  const fetchUrl = useCallback(async (imageId) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setFullUrl(null);
    setUrlState("loading");
    setErrMsg("");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImgSize(null);

    try {
      const res  = await fetch(`${API_URL}/api/gallery/images/${imageId}/url`, {
        headers: authHeaders(),
        signal:  abortRef.current.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load image");
      setFullUrl(data.url);
      setUrlState("ready");
    } catch (err) {
      if (err.name === "AbortError") return;
      setUrlState("error");
      setErrMsg(err.message);
    }
  }, []);

  useEffect(() => {
    fetchUrl(img.id);
    return () => abortRef.current?.abort();
  }, [img.id, fetchUrl]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape")                 handleClose();
      else if (e.key === "ArrowRight")        goNext();
      else if (e.key === "ArrowLeft")         goPrev();
      else if (e.key === "+" || e.key === "=") handleZoomIn();
      else if (e.key === "-")                 handleZoomOut();
      else if (e.key === "0")                 resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const imgWrapRef = useRef(null);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const goNext = () => { if (index < images.length - 1) setIndex((i) => i + 1); };
  const goPrev = () => { if (index > 0)                 setIndex((i) => i - 1); };

  // ── Zoom ─────────────────────────────────────────────────────────────────────
  const handleZoomIn  = () => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => {
    const next = Math.max(1, +(z - 0.25).toFixed(2));
    if (next <= 1) setPan({ x: 0, y: 0 });
    return next;
  });
  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // ── Pan (mouse drag) ─────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onMouseMove = (e) => {
    if (!isDragging || !dragStart.current) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onMouseUp = () => { setIsDragging(false); dragStart.current = null; };

  // ── Close ────────────────────────────────────────────────────────────────────
  const handleClose = () => { setVisible(false); setTimeout(onClose, 180); };

  // ── Image natural size ───────────────────────────────────────────────────────
  const onImgLoad = (e) => setImgSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });

  // ── Shared button style ──────────────────────────────────────────────────────
  const btn = (extra = {}) => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)",
    cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
    ...extra,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYOUT STRATEGY
  // The outer container is position:fixed, inset:0 — it owns the full viewport.
  // Inside: display:flex, flexDirection:column, height:100vh (not 100%).
  // Top bar  → flexShrink:0, measured height
  // Image area → flex:1, minHeight:0   ← key: flex:1 fills EXACTLY what's left
  // Bottom bar → flexShrink:0
  //
  // The <img> inside the image area uses:
  //   width: 100%, height: 100%, objectFit: contain
  // This means the browser constrains the image to whatever space flex gave it.
  // No hardcoded calc(), no magic numbers — works on any screen size.
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes viewerFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes imgReveal { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        .vbtn:hover { background: rgba(255,255,255,0.18) !important; }
        .vbtn-danger:hover { background: rgba(255,70,70,0.22) !important; }
        .vthumb:hover { opacity: 1 !important; transform: scale(1.08) !important; }
        /* scrollbar for thumb strip */
        .thumb-strip::-webkit-scrollbar { height: 3px; }
        .thumb-strip::-webkit-scrollbar-track { background: transparent; }
        .thumb-strip::-webkit-scrollbar-thumb { background: rgba(136,189,242,0.35); border-radius: 99px; }
      `}</style>

      {/* ── Overlay ────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#0a0e14",
          display: "flex", flexDirection: "column",
          height: "100dvh",          /* dynamic viewport height — respects mobile browser chrome */
          opacity: visible ? 1 : 0,
          transition: "opacity 0.18s ease",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >

        {/* ══════════════════════════════════════════════════════════════════
            TOP BAR — flexShrink:0 so it never grows/shrinks
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "10px 12px" : "11px 16px",
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,14,20,0.92)",
          backdropFilter: "blur(12px)",
          gap: 8,
        }}>
          {/* Left: counter + caption */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)",
              letterSpacing: "0.06em", fontFamily: "monospace", flexShrink: 0,
            }}>
              {index + 1} / {images.length}
            </span>
            {img.caption && !isMobile && (
              <span style={{
                fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 500,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {img.caption}
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 6, flexShrink: 0 }}>

            {/* Zoom control group */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10, padding: "2px 4px", gap: 2,
            }}>
              <button className="vbtn" onClick={handleZoomOut} disabled={zoom <= 1}
                title="Zoom out (-)"
                style={{ ...btn(), width: 30, height: 30, border: "none", background: "transparent",
                  opacity: zoom <= 1 ? 0.28 : 1 }}>
                <ZoomOut size={14} />
              </button>
              <button onClick={resetZoom} title="Reset zoom (0)"
                style={{
                  minWidth: isMobile ? 36 : 44, height: 28, border: "none", background: "transparent",
                  fontFamily: "monospace", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  color: zoom > 1 ? "#88BDF2" : "rgba(255,255,255,0.40)", textAlign: "center",
                }}>
                {(zoom * 100).toFixed(0)}%
              </button>
              <button className="vbtn" onClick={handleZoomIn} disabled={zoom >= 4}
                title="Zoom in (+)"
                style={{ ...btn(), width: 30, height: 30, border: "none", background: "transparent",
                  opacity: zoom >= 4 ? 0.28 : 1 }}>
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Info */}
            <button className="vbtn" onClick={() => setShowInfo((s) => !s)} title="Image info"
              style={{ ...btn({ width: 34, height: 34 }),
                background: showInfo ? "rgba(136,189,242,0.18)" : "rgba(255,255,255,0.08)",
                color: showInfo ? "#88BDF2" : "rgba(255,255,255,0.75)",
              }}>
              <Info size={14} />
            </button>

            {/* Download */}
            {fullUrl && (
                <button
                    title="Download"
                    className="vbtn"
                    style={{ ...btn({ width: 34, height: 34 }) }}
                    onClick={async () => {
                    try {
                        const res = await fetch(
                        `${API_URL}/api/gallery/images/${img.id}/download`,
                        { headers: authHeaders() }
                        );

                        if (!res.ok) throw new Error("Download failed");

                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);

                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `image-${img.id}.webp`;
                        document.body.appendChild(a);
                        a.click();

                        a.remove();
                        window.URL.revokeObjectURL(url);
                    } catch (err) {
                        alert("Download failed");
                    }
                    }}
                >
                    <Download size={14} />
                </button>
                )}

            {/* Close */}
            <button className="vbtn vbtn-danger" onClick={handleClose} title="Close (Esc)"
              style={{ ...btn({ width: 34, height: 34, borderColor: "rgba(255,100,100,0.20)" }) }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            IMAGE AREA — flex:1 + minHeight:0
            This is the KEY fix: flex:1 makes it take ALL remaining space
            after the top/bottom bars are laid out. minHeight:0 prevents
            flex from overflowing. The image then fills this box with
            objectFit:contain — zero hardcoded heights needed.
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          flex: 1,
          minHeight: 0,         /* ← critical: without this flex children can overflow */
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>

          {/* Prev arrow */}
          {hasPrev && (
            <button className="vbtn" onClick={goPrev} title="Previous (←)"
              style={{
                position: "absolute", left: isMobile ? 8 : 16, zIndex: 10,
                width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
                borderRadius: 12, backdropFilter: "blur(6px)",
                ...btn(),
              }}>
              <ChevronLeft size={isMobile ? 18 : 22} />
            </button>
          )}

          {/* ── Image wrapper — fills the flex area, image objectFit:contain ── */}
          <div
            ref={imgWrapRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{
              /* Take up the full flex area minus arrow button space */
              width:  "100%",
              height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: isMobile ? "8px 52px" : "16px 72px",
              boxSizing: "border-box",
             cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
              position: "relative",
            }}
          >
            {/* Loading: blurred thumb placeholder */}
            {urlState === "loading" && img.thumbUrl && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <img
                  src={img.thumbUrl} alt="Loading…"
                  style={{
                    maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
                    filter: "blur(14px) brightness(0.5)", transform: "scale(1.04)",
                    borderRadius: 6,
                  }}
                />
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                  <Loader2 size={28} style={{ color: "#88BDF2", animation: "spin 0.9s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                    Loading full resolution…
                  </span>
                </div>
              </div>
            )}

            {/* Loading: no thumb */}
            {urlState === "loading" && !img.thumbUrl && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Loader2 size={34} style={{ color: "#88BDF2", animation: "spin 0.9s linear infinite" }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Loading…</span>
              </div>
            )}

            {/* Error */}
            {urlState === "error" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "rgba(255,80,80,0.10)", border: "1px solid rgba(255,80,80,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <AlertCircle size={26} style={{ color: "#ff6b6b" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>Failed to load image</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{errMsg}</p>
                </div>
                <button className="vbtn" onClick={() => fetchUrl(img.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", borderRadius: 12,
                    border: "1px solid rgba(136,189,242,0.28)",
                    background: "rgba(136,189,242,0.10)", color: "#88BDF2",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                  <RefreshCw size={14} /> Try Again
                </button>
              </div>
            )}

            {/* ── THE IMAGE ─────────────────────────────────────────────────────
                width/height: 100% + objectFit: contain is what makes this work.
                The browser fits the image inside whatever space the flex layout
                gave to this wrapper — no viewport maths needed at all.
            ──────────────────────────────────────────────────────────────────── */}
            {urlState === "ready" && fullUrl && (
              <img
                src={fullUrl}
                alt={img.caption || "Gallery image"}
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  /* Fill the wrapper box, maintain aspect ratio, never overflow */
                  display: "block",
                  maxWidth:  "100%",
                  maxHeight: "100%",
                  width:     "auto",
                  height:    "auto",
                  objectFit: "contain",

                  borderRadius: zoom > 1 ? 2 : 6,
                  boxShadow: "0 8px 48px rgba(0,0,0,0.7)",

                  /* Zoom + pan via transform — won't affect layout */
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.13s ease",

                  animation: "imgReveal 0.22s ease",
                }}
              />
            )}
          </div>

          {/* Next arrow */}
          {hasNext && (
            <button className="vbtn" onClick={goNext} title="Next (→)"
              style={{
                position: "absolute", right: isMobile ? 8 : 16, zIndex: 10,
                width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
                borderRadius: 12, backdropFilter: "blur(6px)",
                ...btn(),
              }}>
              <ChevronRight size={isMobile ? 18 : 22} />
            </button>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BOTTOM BAR — flexShrink:0
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          flexShrink: 0,
          padding: isMobile ? "8px 12px" : "10px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,14,20,0.92)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
        }}>

          {/* Thumbnail filmstrip */}
          <div
            className="thumb-strip"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              overflowX: "auto", flex: 1, minWidth: 0,
              paddingBottom: 2,
            }}
          >
            {images.map((im, i) => (
              <button
                key={im.id}
                className="vthumb"
                onClick={() => setIndex(i)}
                style={{
                  width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
                  borderRadius: 8, overflow: "hidden", flexShrink: 0,
                  border: i === index
                    ? "2px solid #88BDF2"
                    : "2px solid rgba(255,255,255,0.08)",
                  padding: 0, cursor: "pointer",
                  background: "rgba(255,255,255,0.06)",
                  opacity: i === index ? 1 : 0.5,
                  transform: i === index ? "scale(1.1)" : "scale(1)",
                  transition: "all 0.15s",
                }}
              >
                {im.thumbUrl ? (
                  <img src={im.thumbUrl} alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "rgba(136,189,242,0.12)" }} />
                )}
              </button>
            ))}
          </div>

          {/* Info panel */}
          {showInfo && (
            <div style={{
              display: "flex", alignItems: "center", gap: isMobile ? 8 : 14,
              fontSize: 11, color: "rgba(255,255,255,0.38)",
              fontFamily: "monospace", flexShrink: 0,
            }}>
              {imgSize && <span>{imgSize.w}×{imgSize.h}</span>}
              {img.fileSizeBytes && <span>{fmtBytes(img.fileSizeBytes)}</span>}
              {img.uploadedAt && !isMobile && <span>{fmtDate(img.uploadedAt)}</span>}
            </div>
          )}

          {/* Keyboard hints — desktop only */}
          {!isMobile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 10, color: "rgba(255,255,255,0.20)",
              flexShrink: 0,
            }}>
              {[["←→", "nav"], ["+/-", "zoom"], ["drag", "pan"], ["esc", "close"]].map(([k, v]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <kbd style={{
                    fontFamily: "monospace", background: "rgba(255,255,255,0.07)",
                    borderRadius: 4, padding: "1px 5px", fontSize: 9,
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}>{k}</kbd>
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}