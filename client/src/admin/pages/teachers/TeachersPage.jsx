// client/src/admin/pages/teachers/TeachersPage.jsx
// ─── MAIN ENTRY — import this in your Routes ────────────────
import React, { useState, useCallback } from "react";
import PageLayout from "../../components/PageLayout";
import TeachersHeader from "./components/TeachersHeader";
import TeachersFilters from "./components/TeachersFilters";
import TeachersGrid from "./components/TeachersGrid";
import TeacherDetailDrawer from "./components/TeacherDetailDrawer";
import AddTeacherModal from "./components/AddTeacherModal";
import { useTeachers } from "./hooks/useTeachers";

export default function TeachersPage() {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    department: "",
    employmentType: "",
    page: 1,
    limit: 20,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const { teachers, meta, loading, error, refetch } = useTeachers(filters);

  const onChange = useCallback((key, value) => {
    setFilters((p) => ({ ...p, [key]: value, page: 1 }));
  }, []);

  const onPageChange = useCallback((page) => {
    setFilters((p) => ({ ...p, page }));
  }, []);

  return (
    <PageLayout>
      <div
        className="min-h-screen"
        style={{ background: "#f8fbff", fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Google Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <TeachersHeader
          total={meta?.total ?? 0}
          onAdd={() => setShowAdd(true)}
        />

        <TeachersFilters filters={filters} onChange={onChange} />

        <TeachersGrid
          teachers={teachers}
          loading={loading}
          error={error}
          meta={meta}
          onSelect={setSelectedId}
          onPageChange={onPageChange}
        />

        {selectedId && (
          <TeacherDetailDrawer
            teacherId={selectedId}
            onClose={() => setSelectedId(null)}
            onUpdate={refetch}
          />
        )}

        {showAdd && (
          <AddTeacherModal
            onClose={() => setShowAdd(false)}
            onSuccess={() => {
              setShowAdd(false);
              refetch();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}
