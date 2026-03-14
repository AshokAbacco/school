// client/src/admin/pages/exams/Examspage.jsx
import { useState, useEffect } from "react";
import ExamsList from "./ExamsList.jsx";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

export default function ExamsPage() {
  const [academicYearId, setAcademicYearId]     = useState(null);
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [yearLoading, setYearLoading]             = useState(true);
  const [yearError, setYearError]                 = useState("");

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/api/academic-years`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        // pick the active year, or fall back to the first one
        const years = Array.isArray(data) ? data : (data.academicYears || []);
        const active = years.find(y => y.isActive) || years[0];
        if (active) {
          setAcademicYearId(active.id);
          setAcademicYearLabel(active.name || active.year || "");
        } else {
          setYearError("No academic year found. Please create one first.");
        }
      })
      .catch(() => setYearError("Failed to load academic year."))
      .finally(() => setYearLoading(false));
  }, []);

  if (yearLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh",  fontFamily: "'Inter', sans-serif", color: "#6A89A7", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (yearError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh",  fontFamily: "'Inter', sans-serif", color: "#dc2626", fontSize: 14 }}>
        {yearError}
      </div>
    );
  }

  return (
    <ExamsList
      academicYearId={academicYearId}
      academicYearLabel={academicYearLabel}
    />
  );
}