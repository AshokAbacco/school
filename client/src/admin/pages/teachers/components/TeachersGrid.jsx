// client/src/admin/pages/teachers/components/TeachersGrid.jsx
import React, { memo, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import TeacherCard from "./TeacherCard";
import TeacherCardSkeleton from "./TeacherCardSkeleton";
import Pagination from "./Pagination";
import { Users, Download } from "lucide-react";

function downloadTemplate() {
  const headers = [
    "First Name", "Last Name", "Email", "Password", "Employee Code",
    "Date of Birth", "Gender", "Phone", "Address", "City", "State", "ZIP",
    "Aadhaar Number", "PAN Number", "Blood Group", "Emergency Contact",
    "Medical Conditions", "Allergies",
    "Department", "Designation", "Qualification", "Experience Years",
    "Joining Date", "Employment Type", "Status",
    "Salary", "Bank Account", "Bank Name", "IFSC Code",
  ];
  const sample = [
    "Priya", "Sharma", "priya.sharma@school.com", "Teacher@123", "EMP001",
    "15-08-1990", "Female", "9876543210", "12 MG Road", "Bengaluru", "Karnataka", "560001",
    "234567890123", "ABCDE1234F", "B+", "9876543211",
    "None", "None",
    "Mathematics", "Senior Teacher", "M.Sc Mathematics", "5",
    "01-06-2024", "Full Time", "Active",
    "50000", "1234567890", "State Bank of India", "SBIN0001234",
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C2 = range.s.c; C2 <= range.e.c; ++C2) {
      const ref = XLSX.utils.encode_cell({ c: C2, r: R });
      if (!ws[ref]) continue;
      ws[ref].t = "s";
      ws[ref].z = "@";
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, "Teachers");
  XLSX.writeFile(wb, "teacher_bulk_import_template.xlsx");
}

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
        meta?.total === 0 ? (
          /* ── Truly empty: no teachers in the system at all ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 0", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, #EDF3FA, #DDE9F5)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #C8DCF0" }}>
              <Users size={30} color="#88BDF2" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#243340", margin: "0 0 6px", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>No teachers yet</p>
              <p style={{ fontSize: 12, color: "#6A89A7", margin: 0, fontFamily: "'Inter', sans-serif" }}>Get started by adding a teacher or bulk importing via Excel.</p>
            </div>
            <button
              onClick={downloadTemplate}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 11, fontSize: 12, fontWeight: 700,
                background: "#f0fdf4", border: "1.5px solid #bbf7d0", color: "#15803d",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#dcfce7"; e.currentTarget.style.borderColor = "#86efac"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#bbf7d0"; }}
            >
              <Download size={14} />
              Download Sample Excel Template
            </button>
          </div>
        ) : (
          /* ── Filtered empty: teachers exist but nothing matches ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "#EDF3FA", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #DDE9F5" }}>
              <Users size={24} color="#88BDF2" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#384959", margin: "0 0 4px", fontFamily: "'Inter', sans-serif" }}>No teachers found</p>
              <p style={{ fontSize: 12, color: "#6A89A7", margin: 0, fontFamily: "'Inter', sans-serif" }}>Try adjusting your search or filter criteria</p>
            </div>
          </div>
        )
      )}

      {!loading && meta && meta.totalPages > 1 && <Pagination meta={meta} onPageChange={onPageChange} />}
    </div>
  );
});

export default TeachersGrid;