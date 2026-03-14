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

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
      <p style={{ fontSize: 13, color: "#b91c1c", fontFamily: "'Inter', sans-serif" }}>⚠ {error}</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingLeft: isMobile ? 16 : 32, paddingRight: isMobile ? 16 : 32 }}>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(min(272px, 100%), 1fr))" }}>
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <TeacherCardSkeleton key={i} />)
          : teachers.map((t) => <TeacherCard key={t.id} teacher={t} onSelect={onSelect} />)
        }
      </div>

      {!loading && teachers.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "#EDF3FA", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #DDE9F5" }}>
            <Users size={24} color="#88BDF2" strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#384959", margin: "0 0 4px", fontFamily: "'Inter', sans-serif" }}>No teachers found</p>
            <p style={{ fontSize: 12, color: "#6A89A7", margin: 0, fontFamily: "'Inter', sans-serif" }}>Try adjusting your search or filter criteria</p>
          </div>
        </div>
      )}

      {!loading && meta && meta.totalPages > 1 && <Pagination meta={meta} onPageChange={onPageChange} />}
    </div>
  );
});

export default TeachersGrid;