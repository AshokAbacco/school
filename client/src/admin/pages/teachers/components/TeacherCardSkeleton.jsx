// client/src/admin/pages/teachers/components/TeacherCardSkeleton.jsx
import React from "react";

function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "rgba(189,221,252,0.55)",
        flexShrink: 0,
      }}
    />
  );
}

export default function TeacherCardSkeleton() {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        border: "1.5px solid #DDE9F5",
        background: "#FFFFFF",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* top stripe */}
      <div
        className="animate-pulse"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(189,221,252,0.55)",
          borderRadius: "18px 18px 0 0",
        }}
      />

      <div
        style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}
      >
        <Pulse w={44} h={44} r="50%" />
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}
        >
          <Pulse w="65%" h={13} />
          <Pulse w="45%" h={10} />
          <Pulse w="35%" h={9} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          paddingTop: 10,
          borderTop: "1.5px solid #DDE9F5",
        }}
      >
        <Pulse h={32} r={10} />
        <Pulse h={32} r={10} />
        <Pulse h={32} r={10} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Pulse w="45%" h={22} r={20} />
        <Pulse w="35%" h={22} r={20} />
      </div>
    </div>
  );
}
