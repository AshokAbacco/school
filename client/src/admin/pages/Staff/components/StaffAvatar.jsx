// client/src/admin/pages/Staff/components/StaffAvatar.jsx
// Shows the staff profile photo; falls back to the existing initials
// avatar when there is no photo or the image fails to load.

import { useEffect, useState } from "react";

const C = { sky: "#88BDF2", deep: "#384959" };

export default function StaffAvatar({
  staff,
  size = 34,
  radius = "50%",
  fontSize = 11,
  style = {},          // extra styles for the initials fallback / frame
  imgStyle = {},       // extra styles applied to the <img>
}) {
  const src = staff?.profileImage || null;
  const [failed, setFailed] = useState(false);

  // A new signed URL (after edit / reload) gets a fresh chance to load
  useEffect(() => { setFailed(false); }, [src]);

  const initials = `${staff?.firstName?.[0] || ""}${staff?.lastName?.[0] || ""}`.toUpperCase();

  const frame = {
    width: size, height: size, borderRadius: radius, flexShrink: 0,
    boxShadow: `0 3px 8px ${C.sky}44`, overflow: "hidden",
  };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${staff?.firstName || ""} ${staff?.lastName || ""}`.trim() || "Staff photo"}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ ...frame, objectFit: "cover", display: "block", background: "#EDF3FA", ...style, ...imgStyle }}
      />
    );
  }

  return (
    <div
      style={{
        ...frame,
        background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize, fontWeight: 700,
        ...style,
      }}
    >
      {initials || "?"}
    </div>
  );
}