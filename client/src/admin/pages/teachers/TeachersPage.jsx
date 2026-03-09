// client/src/admin/pages/teachers/TeachersPage.jsx
import React, { useState, useCallback } from "react";
import PageLayout from "../../components/PageLayout";
import TeachersHeader from "./components/TeachersHeader";
import TeachersFilters from "./components/TeachersFilters";
import TeachersTable from "./components/TeachersTable";
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
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen" style={{ background: "#f8fbff", fontFamily: "'DM Sans', sans-serif" }}>

        <TeachersHeader total={meta?.total ?? 0} onAdd={() => setShowAdd(true)} />

        <TeachersFilters filters={filters} onChange={onChange} />

        {/* Result count */}
        {!loading && (
          <p style={{
            fontSize: 11, color: "#6A89A7", margin: "0 0 6px",
            fontFamily: "Inter, sans-serif",
            padding: "0 32px",
          }}
            className="responsive-px"
          >
            <style>{`
              .responsive-px { padding-left: 32px !important; padding-right: 32px !important; }
              @media(max-width:767px){ .responsive-px { padding-left: 12px !important; padding-right: 12px !important; }}
            `}</style>
            {meta?.total != null
              ? `Showing ${teachers.length} of ${meta.total} teacher${meta.total !== 1 ? "s" : ""}`
              : `${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}`}
          </p>
        )}

        <TeachersTable
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
            onSuccess={() => { setShowAdd(false); refetch(); }}
          />
        )}
      </div>
    </PageLayout>
  );
}