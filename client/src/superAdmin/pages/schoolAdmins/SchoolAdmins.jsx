// client/src/superAdmin/pages/schoolAdmins/SchoolAdmins.jsx
import React, { useState, useEffect } from "react";
import {
  Plus, Search, Edit, Trash2, UserCog,
  ShieldCheck, ShieldX, Mail, RefreshCw, Building2,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import AddSchoolAdminModal from "./AddScholAdmin";
import { getSchoolAdmins, deleteSchoolAdmin } from "./components/schoolAdminApi";

const font = { fontFamily: "'DM Sans', sans-serif" };

const SCHOOL_TYPE_LABELS = {
  PRIMARY: "Primary", UPPER_PRIMARY: "Upper Primary",
  HIGH_SCHOOL: "High School", PUC: "PUC",
  DEGREE: "Degree", POSTGRADUATE: "Postgraduate", OTHER: "Other",
};

export default function SchoolAdmins() {
  const [admins, setAdmins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSchoolAdmins();
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load admins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreated = (newAdmin) => {
    setAdmins((prev) => [newAdmin, ...prev]);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Deactivate this admin?")) return;
    try {
      await deleteSchoolAdmin(id);
      setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, isActive: false } : a));
    } catch {
      alert("Failed to deactivate admin.");
    }
  };

  const filtered = admins.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.school?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    total:    admins.length,
    active:   admins.filter((a) => a.isActive).length,
    inactive: admins.filter((a) => !a.isActive).length,
  };

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 min-h-screen bg-[#EFF6FD]" style={font}>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#384959] flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#88BDF2] to-[#6A89A7] flex items-center justify-center shadow shadow-[#88BDF2]/40 flex-shrink-0">
                <UserCog size={15} color="#fff" />
              </div>
              School Admins
            </h1>
            <p className="text-xs text-[#6A89A7] mt-1 ml-10">Manage admin accounts across all schools</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchAdmins}
              className="p-2.5 rounded-xl border border-[#BDDDFC] bg-white text-[#6A89A7] hover:text-[#384959] hover:border-[#88BDF2] transition-all"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#384959] hover:bg-[#6A89A7] shadow-md shadow-[#384959]/30 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all border-0 cursor-pointer"
              style={font}
            >
              <Plus size={16} /> Add Admin
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Admins", value: totals.total,    color: "from-[#88BDF2] to-[#6A89A7]", shadow: "shadow-[#88BDF2]/30", icon: UserCog     },
            { label: "Active",       value: totals.active,   color: "from-[#88BDF2] to-[#6A89A7]", shadow: "shadow-[#88BDF2]/30",  icon: ShieldCheck },
            { label: "Inactive",     value: totals.inactive, color: "from-red-400 to-red-500",         shadow: "shadow-red-200",      icon: ShieldX     },
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
            placeholder="Search by name, email or school…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm outline-none text-[#384959] placeholder-[#6A89A7]/60"
            style={font}
          />
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#88BDF2] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#6A89A7]" style={font}>Loading admins…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 text-red-600 text-sm flex items-center justify-between" style={font}>
            <span>{error}</span>
            <button onClick={fetchAdmins} className="text-xs font-semibold underline">Retry</button>
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
                      {["Admin", "Email", "School", "Type", "Status", "Actions"].map((h) => (
                        <th key={h} className={`px-4 py-3 font-semibold ${h === "Admin" ? "text-left" : "text-center"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((admin, i) => (
                      <tr
                        key={admin.id}
                        className="border-b border-[#EFF6FD] hover:bg-[#BDDDFC]/10 transition-colors"
                        style={{ animation: `fadeUp .3s ${i * 0.04}s both` }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#BDDDFC]/50 flex items-center justify-center flex-shrink-0 text-[#384959] font-bold text-xs">
                              {admin.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#384959] text-[13px]">{admin.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="flex items-center justify-center gap-1 text-[#6A89A7] text-[12px]">
                            <Mail size={12} className="text-[#88BDF2]" />{admin.email}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="flex items-center justify-center gap-1 text-[#6A89A7] text-[12px]">
                            <Building2 size={12} className="text-[#88BDF2]" />
                            {admin.school?.name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[11px] bg-[#BDDDFC]/40 text-[#384959] border border-[#88BDF2]/30 px-2 py-0.5 rounded-full font-medium">
                            {SCHOOL_TYPE_LABELS[admin.school?.type] || admin.school?.type || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {admin.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <ShieldCheck size={11} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-500 border border-red-200">
                              <ShieldX size={11} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button className="p-1.5 rounded-lg hover:bg-[#BDDDFC]/50 text-[#88BDF2] hover:text-[#384959] transition-colors" title="Edit">
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeactivate(admin.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-300 hover:text-red-500 transition-colors"
                              title="Deactivate"
                              disabled={!admin.isActive}
                              style={{ opacity: admin.isActive ? 1 : 0.4 }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-[#6A89A7] text-sm" style={font}>
                          {search ? `No admins matching "${search}".` : "No school admins created yet."}
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
                  {search ? `No admins matching "${search}".` : "No school admins created yet."}
                </div>
              )}
              {filtered.map((admin, i) => (
                <div
                  key={admin.id}
                  className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm p-4"
                  style={{ animation: `fadeUp .3s ${i * 0.04}s both` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#BDDDFC]/50 flex items-center justify-center flex-shrink-0 text-[#384959] font-bold text-sm">
                        {admin.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#384959] text-[13px]">{admin.name}</p>
                        <p className="text-[11px] text-[#6A89A7] flex items-center gap-1">
                          <Mail size={10} className="text-[#88BDF2]" /> {admin.email}
                        </p>
                      </div>
                    </div>
                    {admin.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <ShieldCheck size={9} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
                        <ShieldX size={9} /> Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#6A89A7] mb-3">
                    <Building2 size={11} className="text-[#88BDF2]" />
                    <span>{admin.school?.name || "—"}</span>
                    {admin.school?.type && (
                      <span className="ml-auto text-[11px] bg-[#BDDDFC]/40 text-[#384959] border border-[#88BDF2]/30 px-2 py-0.5 rounded-full font-medium">
                        {SCHOOL_TYPE_LABELS[admin.school?.type] || admin.school?.type}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 rounded-lg hover:bg-[#BDDDFC]/50 text-[#88BDF2] hover:text-[#384959] transition-colors">
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeactivate(admin.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-300 hover:text-red-500 transition-colors"
                      disabled={!admin.isActive}
                      style={{ opacity: admin.isActive ? 1 : 0.4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Footer ── */}
        {!loading && !error && (
          <p className="text-xs text-[#6A89A7] mt-3 text-right" style={font}>
            Showing {filtered.length} of {admins.length} admins
          </p>
        )}
      </div>

      {modal && (
        <AddSchoolAdminModal
          onClose={() => setModal(false)}
          onSuccess={handleCreated}
        />
      )}

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </PageLayout>
  );
}