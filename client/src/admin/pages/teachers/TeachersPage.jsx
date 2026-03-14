// client/src/admin/pages/teachers/TeachersPage.jsx
import React, { useState, useCallback, useRef } from "react";
import PageLayout from "../../components/PageLayout";
import TeachersHeader from "./components/TeachersHeader";
import TeachersFilters from "./components/TeachersFilters";
import TeachersGrid from "./components/TeachersGrid";
import TeachersTable from "./components/TeachersTable";
import TeacherDetailDrawer from "./components/TeacherDetailDrawer";
import AddTeacherModal from "./components/AddTeacherModal";
import { useTeachers } from "./hooks/useTeachers";

export default function TeachersPage() {
  const [filters, setFilters] = useState({
    search: "", status: "", department: "", employmentType: "", page: 1, limit: 20,
  });
  const [selectedId, setSelectedId]   = useState(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [viewMode, setViewMode]       = useState("grid"); // "grid" | "table"

  const { teachers, meta, loading, error, refetch } = useTeachers(filters);

  const onChange     = useCallback((key, value) => setFilters((p) => ({ ...p, [key]: value, page: 1 })), []);
  const onPageChange = useCallback((page) => setFilters((p) => ({ ...p, page })), []);

  const [spinning, setSpinning] = useState(false);
  const handleRefresh = useCallback(() => {
    setSpinning(true);
    refetch();
    setTimeout(() => setSpinning(false), 700);
  }, [refetch]);

  return (
    <PageLayout>
      {/* Inter font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        * { font-family: 'Inter', sans-serif; }
        .tpage-result { padding: 0 32px 8px; font-family: 'Inter', sans-serif; }
        .tpage-mode-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:9px; border:1.5px solid #E4EEF8; background:#fff; cursor:pointer; color:#9BBACF; transition:all 0.13s; font-family:'Inter',sans-serif; }
        .tpage-mode-btn.active { background:#243340 !important; border-color:#243340 !important; color:#fff !important; }
        .tpage-mode-btn:hover { background:#EDF3FA; border-color:#C8DCF0; color:#384959; }
        @keyframes tpage-spin { to { transform: rotate(360deg); } }
        .tpage-spin { animation: tpage-spin 0.7s linear; }
        @media(max-width:767px) { .tpage-result { padding: 0 16px 8px; } .tpage-view-toggle { display:none !important; } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f4f8fc", fontFamily: "'Inter', sans-serif" }}>

        <TeachersHeader total={meta?.total ?? 0} onAdd={() => setShowAdd(true)} />
        <TeachersFilters filters={filters} onChange={onChange} />

        {/* Result count + view toggle */}
        {!loading && (
          <div className="tpage-result" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <p style={{ fontSize:11, color:"#9BBACF", margin:0, fontFamily:"'Inter',sans-serif" }}>
              {meta?.total != null
                ? `Showing ${teachers.length} of ${meta.total} teacher${meta.total !== 1 ? "s" : ""}`
                : `${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}`}
            </p>
            <div className="tpage-view-toggle" style={{ display:"flex", gap:5 }}>
              {/* Refresh */}
              <button className="tpage-mode-btn" onClick={handleRefresh} title="Refresh" disabled={loading}>
                <svg className={spinning ? "tpage-spin" : ""} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
              </button>
              {/* Grid icon */}
              <button className={`tpage-mode-btn${viewMode === "grid" ? " active" : ""}`}
                onClick={() => setViewMode("grid")} title="Grid view">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
                  <rect x="0" y="0" width="5.5" height="5.5" rx="1.5"/>
                  <rect x="7.5" y="0" width="5.5" height="5.5" rx="1.5"/>
                  <rect x="0" y="7.5" width="5.5" height="5.5" rx="1.5"/>
                  <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.5"/>
                </svg>
              </button>
              {/* Table icon */}
              <button className={`tpage-mode-btn${viewMode === "table" ? " active" : ""}`}
                onClick={() => setViewMode("table")} title="Table view">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
                  <rect x="0" y="0" width="13" height="3" rx="1.5"/>
                  <rect x="0" y="5" width="13" height="2" rx="1"/>
                  <rect x="0" y="9" width="13" height="2" rx="1"/>
                  <rect x="0" y="12" width="8" height="1.5" rx="1"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          {viewMode === "grid" ? (
            <TeachersGrid teachers={teachers} loading={loading} error={error} meta={meta} onSelect={setSelectedId} onPageChange={onPageChange} />
          ) : (
            <TeachersTable teachers={teachers} loading={loading} error={error} meta={meta} onSelect={setSelectedId} onPageChange={onPageChange} />
          )}
        </div>

        {selectedId && (
          <TeacherDetailDrawer teacherId={selectedId} onClose={() => setSelectedId(null)} onUpdate={refetch} />
        )}

        {showAdd && (
          <AddTeacherModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); refetch(); }} />
        )}
      </div>
    </PageLayout>
  );
}