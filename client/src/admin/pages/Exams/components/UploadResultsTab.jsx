// client/src/admin/pages/Exams/components/UploadResultsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, School, CheckCircle2, Clock, Search, X, Loader2,
  AlertCircle, UploadCloud, ChevronRight, BookOpen,
} from "lucide-react";
import { fetchUploadOverview } from "./uploadResultsApi.js";
import AdminUploadResultModal from "./AdminUploadResultModal.jsx";

/* ── Stat Card (matches ExamsList.jsx StatCard) ── */
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3.5 shadow-sm">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + "18" }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 m-0">{label}</p>
        <p className="text-[22px] font-extrabold text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

/* ── Class-wise progress card ── */
function ClassProgressCard({ cls, onUpload }) {
  const [hov, setHov] = useState(false);
  const total = cls.totalSchedules || 0;
  const done  = cls.uploadedSchedules || 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor = pct === 100 ? "#059669" : pct >= 50 ? "#3b82f6" : pct > 0 ? "#d97706" : "#cbd5e1";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="bg-white rounded-2xl border p-4.5 flex flex-col gap-3 transition-all"
      style={{
        borderColor: hov ? "#88BDF255" : "#f1f5f9",
        boxShadow: hov ? "0 6px 20px rgba(56,73,89,0.10)" : "none",
        padding: 18,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#384959,#6A89A7)" }}>
            <School size={15} color="#fff" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-800 m-0">
              Grade {cls.grade}{cls.section ? ` – ${cls.section}` : ""}
            </p>
            <p className="text-[11px] text-slate-400 m-0 mt-0.5">{cls.studentCount} students · {cls.examCount} exam{cls.examCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {total > 0 && (
          <span
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{
              background: pct === 100 ? "#ecfdf5" : pct > 0 ? "#eff6ff" : "#f8fafc",
              color: pct === 100 ? "#059669" : pct > 0 ? "#2563eb" : "#94a3b8",
              border: `1px solid ${pct === 100 ? "#a7f3d0" : pct > 0 ? "#bfdbfe" : "#e2e8f0"}`,
            }}
          >
            {pct}% done
          </span>
        )}
      </div>

      {total > 0 ? (
        <>
          <div>
            <div className="h-[6px] rounded-full bg-slate-100 overflow-hidden">
              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 99, transition: "width .4s ease" }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={11} /> {done} uploaded
              </span>
              {cls.pendingSchedules > 0 && (
                <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                  <Clock size={11} /> {cls.pendingSchedules} pending
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-[11.5px] text-slate-400 italic m-0">No exam schedules found for this class yet.</p>
      )}

      <button
        onClick={() => onUpload(cls)}
        className="flex items-center justify-center gap-1.5 mt-1 py-2 rounded-xl text-[12.5px] font-bold border-none cursor-pointer transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg,#6A89A7,#384959)", color: "#fff" }}
      >
        <UploadCloud size={13} />
        Upload Results
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

/* ── Main Component ── */
export default function UploadResultsTab({ academicYearLabel }) {
  const [stats, setStats]         = useState({ totalClasses: 0, totalStudents: 0, uploadedResults: 0, pendingResults: 0 });
  const [classWise, setClassWise] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [presetClass, setPresetClass] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const j = await fetchUploadOverview();
      setStats(j.stats || {});
      setClassWise(j.classWise || []);
    } catch (e) {
      setError(e.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = !q ? classWise : classWise.filter((c) =>
      String(c.grade).toLowerCase().includes(q) ||
      String(c.section || "").toLowerCase().includes(q) ||
      String(c.name || "").toLowerCase().includes(q)
    );
    return [...list].sort((a, b) =>
      (parseInt(a.grade) || 0) - (parseInt(b.grade) || 0) ||
      String(a.section || "").localeCompare(String(b.section || ""))
    );
  }, [classWise, search]);

  const openUpload = (cls = null) => { setPresetClass(cls); setShowModal(true); };
  const closeUpload = () => { setShowModal(false); setPresetClass(null); };
  const handleSaved = () => { closeUpload(); load(); };

  return (
    <div>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <p className="text-[12.5px] text-slate-400 font-medium m-0">
          {academicYearLabel ? `Upload results for any class · ${academicYearLabel}` : "Upload exam results for any class and student"}
        </p>
        <button
          onClick={() => openUpload(null)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-none bg-gradient-to-br from-[#6A89A7] to-[#384959] text-white text-[13px] font-bold cursor-pointer hover:opacity-90 transition-all shadow-sm"
        >
          <UploadCloud size={14} />
          Upload Results
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))" }}>
        <StatCard icon={School}       label="Total Classes"    value={loading ? "–" : stats.totalClasses}    accent="#384959" />
        <StatCard icon={Users}        label="Total Students"   value={loading ? "–" : stats.totalStudents}   accent="#3b82f6" />
        <StatCard icon={CheckCircle2} label="Uploaded Results" value={loading ? "–" : stats.uploadedResults} accent="#059669" />
        <StatCard icon={Clock}        label="Pending Results"  value={loading ? "–" : stats.pendingResults}  accent="#d97706" />
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 mb-5 max-w-xs">
        <Search size={13} className="text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search classes…"
          className="border-none outline-none bg-transparent text-[13px] text-slate-700 flex-1 placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 flex">
            <X size={12} />
          </button>
        )}
      </div>

      {/* ── Class-wise grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-[30vh] text-slate-400 gap-2.5 text-[13px]">
          <Loader2 size={18} className="animate-spin" /> Loading class-wise results…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[13px]">
          <AlertCircle size={15} /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-14">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
            <BookOpen size={20} className="text-slate-300" />
          </div>
          <p className="text-[13px] font-bold text-slate-600 m-0">No classes found</p>
          <p className="text-[12px] text-slate-400 m-0">{search ? "Try a different search term." : "Create a class to get started."}</p>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))" }}>
          {filtered.map((cls) => (
            <ClassProgressCard key={cls.classSectionId} cls={cls} onUpload={openUpload} />
          ))}
        </div>
      )}

      {/* ── Add Result Modal ── */}
      {showModal && (
        <AdminUploadResultModal
          presetClass={presetClass}
          onClose={closeUpload}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}