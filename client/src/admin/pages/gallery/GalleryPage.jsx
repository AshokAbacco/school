// admin/pages/gallery/GalleryPage.jsx
//
// Single entry point for the admin sidebar: one "Gallery" link that opens
// a Photos/Videos tab switcher, instead of two separate sidebar items.
// Wire ONLY this file into Routes.jsx + Sidebar.jsx — Gallery.jsx and
// GalleryVideosAdmin.jsx stay exactly as they are, just as tab content now.

import { useState } from "react";
import { Images, Video } from "lucide-react";
import Gallery from "./Gallery";
import GalleryVideosAdmin from "./GalleryVideosAdmin";

const C = {
  slate: "#6A89A7", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

const TABS = [
  { key: "photos", label: "Photos", icon: Images },
  { key: "videos", label: "Videos", icon: Video },
];

export default function GalleryPage() {
  const [tab, setTab] = useState("photos");

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Tab strip — sits above whichever page is active */}
      <div style={{ padding: "18px 30px 0", background: C.bg }}>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 14, background: C.white, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 10px rgba(56,73,89,0.06)" }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 18px", borderRadius: 10, border: "none",
                  background: active ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : "transparent",
                  color: active ? "#fff" : C.textLight,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab content — unmounts the other tab, so no stale fetches */}
      {tab === "photos" ? <Gallery /> : <GalleryVideosAdmin />}
    </div>
  );
}