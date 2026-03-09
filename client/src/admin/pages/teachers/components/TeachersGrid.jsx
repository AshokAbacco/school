// client/src/admin/pages/teachers/components/TeachersGrid.jsx
import React, { memo, useState, useEffect } from "react";
import TeacherCard from "./TeacherCard";
import TeacherCardSkeleton from "./TeacherCardSkeleton";
import Pagination from "./Pagination";
import { Users } from "lucide-react";

function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const h = (e) => setV(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [bp]);
  return v;
}

const TeachersGrid = memo(function TeachersGrid({ teachers, loading, error, meta, onSelect, onPageChange }) {
  const isMobile = useIsMobile(768);

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
        <p style={{ fontSize: 13, color: "#b91c1c", fontFamily: "Inter, sans-serif" }}>⚠ {error}</p>
      </div>
    );
  }

  return (
    <div
      className="fade-up"
      style={{
        animationDelay: "80ms",
        display: "flex", flexDirection: "column", gap: 24,
        paddingLeft: isMobile ? 12 : 32,
        paddingRight: isMobile ? 12 : 32,
      }}
    >
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(270px, 100%), 1fr))" }}>
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <TeacherCardSkeleton key={i} />)
          : teachers.map((t) => <TeacherCard key={t.id} teacher={t} onSelect={onSelect} />)
        }
      </div>

      {!loading && teachers.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 0", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(136,189,242,0.18)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(136,189,242,0.30)" }}>
            <Users size={26} color="#88BDF2" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#384959", margin: 0, fontFamily: "Inter, sans-serif" }}>No teachers match your filters</p>
          <p style={{ fontSize: 11, color: "#6A89A7", margin: 0, fontFamily: "Inter, sans-serif" }}>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {!loading && meta && meta.totalPages > 1 && (
        <Pagination meta={meta} onPageChange={onPageChange} />
      )}
    </div>
  );
});

export default TeachersGrid;