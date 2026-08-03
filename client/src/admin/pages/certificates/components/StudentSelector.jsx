// client/src/admin/pages/certificates/components/StudentSelector.jsx
import { useEffect, useState, useCallback } from "react";
import { Search, Loader2, ChevronRight, User } from "lucide-react";
import { getToken } from "../../../../auth/storage";
import SignedProfileImage from "../../students/components/SignedProfileImage";
import { C, API_URL } from "./theme";

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export default function StudentSelector({
  academicYearId,
  classSectionId,
  onSelect,
  selectedStudentId,
}) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchStudents = useCallback(
    async (pageNum, searchTerm) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "10",
          ...(academicYearId ? { academicYearId } : {}),
          ...(classSectionId ? { classSectionId } : {}),
          ...(searchTerm ? { search: searchTerm } : {}),
        });
        const res = await fetch(`${API_URL}/api/certificates/students?${params}`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        setStudents(data.students || []);
        setPages(data.pages || 1);
      } catch (err) {
        console.error("StudentSelector fetch error:", err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    },
    [academicYearId, classSectionId],
  );

  useEffect(() => {
    setPage(1);
    fetchStudents(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId, classSectionId]);

  useEffect(() => {
    const t = setTimeout(() => fetchStudents(page, search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: C.textLight }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or admission number..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ border: `1px solid ${C.border}`, background: C.white, color: C.text }}
        />
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${C.borderLight}`, minHeight: 220 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin" style={{ color: C.slate }} />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm" style={{ color: C.textLight }}>
            <User size={26} className="mb-2 opacity-50" />
            No students found for the selected filters.
          </div>
        ) : (
          students.map((s) => {
            const enrollment = s.enrollments?.[0];
            const className = enrollment?.classSection?.name ||
              [enrollment?.classSection?.grade, enrollment?.classSection?.section].filter(Boolean).join(" - ");
            const active = s.id === selectedStudentId;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                style={{
                  borderBottom: `1px solid ${C.borderLight}`,
                  background: active ? `${C.sky}22` : C.white,
                }}
              >
                <SignedProfileImage
                  studentId={s.id}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: C.deep }}>
                    {s.personalInfo?.firstName
                      ? `${s.personalInfo.firstName} ${s.personalInfo.lastName || ""}`.trim()
                      : s.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: C.textLight }}>
                    {enrollment?.admissionNumber || "No admission no."} {className ? `• ${className}` : ""}
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: C.textLight }} />
              </button>
            );
          })
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: C.textLight }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded-lg border disabled:opacity-40"
            style={{ borderColor: C.border }}
          >
            Prev
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="px-2.5 py-1 rounded-lg border disabled:opacity-40"
            style={{ borderColor: C.border }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
