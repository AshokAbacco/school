// client/src/superAdmin/pages/schools/Schools.jsx
import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Building2, CheckCircle, Ban, RefreshCw } from "lucide-react";
import PageLayout from "../../components/PageLayout";
import AddSchoolModal from "./AddSchool";
import { getSchools } from "./components/SchoolsApi";

const SCHOOL_TYPE_LABELS = {
  PRIMARY:       "Primary (1–5)",
  UPPER_PRIMARY: "Upper Primary (6–8)",
  HIGH_SCHOOL:   "High School (9–10)",
  PUC:           "PUC (11–12)",
  DEGREE:        "Degree",
  POSTGRADUATE:  "Postgraduate",
  OTHER:         "Other",
};

const StatusBadge = ({ isActive }) => {
  if (isActive) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
      <CheckCircle size={11} /> Active
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-500 border border-red-200">
      <Ban size={11} /> Inactive
    </span>
  );
};

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState(false);

  const fetchSchools = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSchools();
      setSchools(data.schools || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load schools.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchools(); }, []);

  const handleSchoolCreated = (newSchool) => {
    setSchools((prev) => [newSchool, ...prev]);
  };

  const filtered = schools.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || "").toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    total:    schools.length,
    active:   schools.filter((s) => s.isActive).length,
    inactive: schools.filter((s) => !s.isActive).length,
  };

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 min-h-screen bg-[#EFF6FD]">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#384959] flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#88BDF2] to-[#6A89A7] flex items-center justify-center shadow shadow-[#88BDF2]/40 flex-shrink-0">
                <Building2 size={15} color="#fff" />
              </div>
              Schools Management
            </h1>
            <p className="text-xs text-[#6A89A7] mt-1 ml-10">Manage all registered schools on the platform</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchSchools}
              className="p-2.5 rounded-xl border border-[#BDDDFC] bg-white text-[#6A89A7] hover:text-[#384959] hover:border-[#88BDF2] transition-all"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#384959] hover:bg-[#6A89A7] shadow-md shadow-[#384959]/30 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all border-0 cursor-pointer"
            >
              <Plus size={16} /> <span className="hidden xs:inline">Add School</span><span className="xs:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Schools", value: totals.total,    color: "from-[#88BDF2] to-[#6A89A7]", shadow: "shadow-[#88BDF2]/30", icon: Building2   },
            { label: "Active",        value: totals.active,   color: "from-[#88BDF2] to-[#6A89A7]", shadow: "shadow-[#88BDF2]/30", icon: CheckCircle },
            { label: "Inactive",      value: totals.inactive, color: "from-red-400 to-red-500",         shadow: "shadow-red-200",     icon: Ban         },
          ].map(({ label, value, color, shadow, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-[#BDDDFC]/50 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm ${shadow} flex-shrink-0`}>
                <Icon size={17} color="#fff" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#384959]">{value}</p>
                <p className="text-[11px] text-[#6A89A7]">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm px-4 py-3 mb-4 flex items-center gap-3">
          <Search size={15} className="text-[#88BDF2] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by school name or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm outline-none text-[#384959] placeholder-[#6A89A7]/60"
          />
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#88BDF2] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#6A89A7]">Loading schools…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 text-red-600 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchSchools} className="text-xs font-semibold underline">Retry</button>
          </div>
        )}

        {/* ── Table (desktop) / Cards (mobile) ── */}
        {!loading && !error && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#384959] text-[#BDDDFC] text-[11px] uppercase tracking-wider">
                      {["School Name", "City", "Type", "Email", "Phone", "Status", "Actions"].map((h) => (
                        <th key={h} className={`px-4 py-3 font-semibold ${h === "School Name" ? "text-left" : "text-center"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr
                        key={s.id}
                        className="border-b border-[#EFF6FD] hover:bg-[#BDDDFC]/10 transition-colors"
                        style={{ animation: `fadeUp .3s ${i * 0.04}s both` }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#BDDDFC]/40 flex items-center justify-center flex-shrink-0">
                              <Building2 size={13} className="text-[#6A89A7]" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#384959] text-[13px]">{s.name}</p>
                              <p className="text-[11px] text-[#6A89A7]">{s.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-[#6A89A7] text-[13px]">{s.city || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[11px] bg-[#BDDDFC]/40 text-[#384959] border border-[#88BDF2]/30 px-2 py-0.5 rounded-full font-medium">
                            {SCHOOL_TYPE_LABELS[s.type] || s.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-[#6A89A7] text-[12px]">{s.email || "—"}</td>
                        <td className="px-4 py-3 text-center text-[#6A89A7] text-[12px]">{s.phone || "—"}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge isActive={s.isActive} /></td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button className="p-1.5 rounded-lg hover:bg-[#BDDDFC]/50 text-[#88BDF2] hover:text-[#384959] transition-colors">
                              <Edit size={14} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-red-100 text-red-300 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-16 text-center text-[#6A89A7] text-sm">
                          {search ? `No schools matching "${search}".` : "No schools registered yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.length === 0 && (
                <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 py-12 text-center text-[#6A89A7] text-sm">
                  {search ? `No schools matching "${search}".` : "No schools registered yet."}
                </div>
              )}
              {filtered.map((s, i) => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm p-4"
                  style={{ animation: `fadeUp .3s ${i * 0.04}s both` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#BDDDFC]/40 flex items-center justify-center flex-shrink-0">
                        <Building2 size={15} className="text-[#6A89A7]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#384959] text-[13px]">{s.name}</p>
                        <p className="text-[11px] text-[#6A89A7]">{s.code}</p>
                      </div>
                    </div>
                    <StatusBadge isActive={s.isActive} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px] text-[#6A89A7] mb-3">
                    <span><span className="font-medium text-[#384959]">City:</span> {s.city || "—"}</span>
                    <span><span className="font-medium text-[#384959]">Phone:</span> {s.phone || "—"}</span>
                    <span className="col-span-2"><span className="font-medium text-[#384959]">Email:</span> {s.email || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] bg-[#BDDDFC]/40 text-[#384959] border border-[#88BDF2]/30 px-2 py-0.5 rounded-full font-medium">
                      {SCHOOL_TYPE_LABELS[s.type] || s.type}
                    </span>
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-[#BDDDFC]/50 text-[#88BDF2] hover:text-[#384959] transition-colors">
                        <Edit size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-red-100 text-red-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Footer ── */}
        {!loading && !error && (
          <p className="text-xs text-[#6A89A7] mt-3 text-right">
            Showing {filtered.length} of {schools.length} schools
          </p>
        )}
      </div>

      {modal && (
        <AddSchoolModal
          onClose={() => setModal(false)}
          onSuccess={handleSchoolCreated}
        />
      )}

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </PageLayout>
  );
}