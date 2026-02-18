// client/src/admin/pages/teachers/components/TeachersGrid.jsx
import React, { memo } from "react";
import TeacherCard from "./TeacherCard";
import TeacherCardSkeleton from "./TeacherCardSkeleton";
import Pagination from "./Pagination";

const TeachersGrid = memo(function TeachersGrid({
  teachers,
  loading,
  error,
  meta,
  onSelect,
  onPageChange,
}) {
  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p
          className="text-sm"
          style={{ color: "#991b1b", fontFamily: "'DM Sans', sans-serif" }}
        >
          ⚠ {error}
        </p>
      </div>
    );
  }

  return (
    <div className="px-8 flex flex-col gap-6">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))" }}
      >
        {loading
          ? Array.from({ length: 12 }).map((_, i) => (
              <TeacherCardSkeleton key={i} />
            ))
          : teachers.map((t) => (
              <TeacherCard key={t.id} teacher={t} onSelect={onSelect} />
            ))}
      </div>

      {!loading && teachers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="#BDDDFC" strokeWidth="2" />
            <path
              d="M14 20h12M20 14v12"
              stroke="#6A89A7"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p
            className="text-sm"
            style={{ color: "#6A89A7", fontFamily: "'DM Sans', sans-serif" }}
          >
            No teachers match your filters
          </p>
        </div>
      )}

      {!loading && meta && meta.totalPages > 1 && (
        <Pagination meta={meta} onPageChange={onPageChange} />
      )}
    </div>
  );
});

export default TeachersGrid;
