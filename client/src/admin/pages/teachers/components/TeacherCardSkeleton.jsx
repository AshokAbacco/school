// client/src/admin/pages/teachers/components/TeacherCardSkeleton.jsx
import React from "react";

function Pulse({ w = "100%", h = 12, r = 7 }) {
  return (
    <div className="skel-pulse" style={{ width: w, height: h, borderRadius: r, background: "#EDF3FA", flexShrink: 0 }} />
  );
}

export default function TeacherCardSkeleton() {
  return (
    <>
      <style>{`
        @keyframes skelShimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skel-pulse {
          background: linear-gradient(90deg, #EDF3FA 25%, #e0ecf8 50%, #EDF3FA 75%) !important;
          background-size: 800px 100% !important;
          animation: skelShimmer 1.4s ease-in-out infinite;
        }
      `}</style>
      <div style={{ borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14, border: "1.5px solid #E8F0F9", background: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5 }} className="skel-pulse" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <Pulse w={44} h={44} r={14} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <Pulse w="60%" h={13} />
            <Pulse w="42%" h={10} />
            <Pulse w="32%" h={9} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid #F0F6FD" }}>
          <Pulse h={30} r={9} />
          <Pulse h={30} r={9} />
          <Pulse h={30} r={9} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Pulse w="44%" h={22} r={20} />
          <Pulse w="34%" h={22} r={20} />
        </div>
      </div>
    </>
  );
}