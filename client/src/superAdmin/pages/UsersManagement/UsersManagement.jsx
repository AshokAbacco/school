// client/src/superAdmin/pages/users/UsersManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Users, ShieldCheck, ShieldX,
  Mail, Building2, RefreshCw,
  ChevronLeft, ChevronRight, UserCog,
  GraduationCap, Users2, BookOpen,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { getAllUsers } from "./api/usersApi";

const font = { fontFamily: "'DM Sans', sans-serif" };

const ROLE_OPTIONS = [
  { value: "ALL",         label: "All Roles"    },
  { value: "SUPER_ADMIN", label: "Super Admin"  },
  { value: "ADMIN",       label: "School Admin" },
  { value: "TEACHER",     label: "Teacher"      },
  { value: "STUDENT",     label: "Student"      },
  { value: "PARENT",      label: "Parent"       },
];

const STATUS_OPTIONS = [
  { value: "ALL",      label: "All Status" },
  { value: "ACTIVE",   label: "Active"     },
  { value: "INACTIVE", label: "Inactive"   },
];

const ROLE_BADGE = {
  SUPER_ADMIN: { label: "Super Admin",  bg: "#BDDDFC", color: "#384959"  },
  ADMIN:       { label: "School Admin", bg: "#BDDDFC", color: "#6A89A7"  },
  TEACHER:     { label: "Teacher",      bg: "#dcfce7", color: "#16a34a"  },
  STUDENT:     { label: "Student",      bg: "#fef9c3", color: "#ca8a04"  },
  PARENT:      { label: "Parent",       bg: "#fce7f3", color: "#db2777"  },
};

function RoleBadge({ role }) {
  const cfg = ROLE_BADGE[role] || { label: role, bg: "#EFF6FD", color: "#6A89A7" };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color, ...font }}
    >
      {cfg.label}
    </span>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="py-2 pl-3 pr-8 rounded-xl text-sm outline-none cursor-pointer border border-[#BDDDFC] bg-white text-[#384959]"
      style={font}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function UsersManagement() {
  const [users, setUsers]     = useState([]);
  const [counts, setCounts]   = useState({});
  const [meta, setMeta]       = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [search, setSearch]   = useState("");
  const [role, setRole]       = useState("ALL");
  const [status, setStatus]   = useState("ALL");
  const [page, setPage]       = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllUsers({ role, status, search, page, limit: 15 });
      setUsers(data.users || []);
      setCounts(data.counts || {});
      setMeta(data.meta || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [role, status, search, page]);

  useEffect(() => { setPage(1); }, [role, status, search]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const statCards = [
    { label: "Total Users",   value: counts.total   ?? 0, color: "from-[#88BDF2] to-[#6A89A7]",       shadow: "shadow-[#88BDF2]/30",  icon: Users         },
    { label: "School Admins", value: counts.admin   ?? 0, color: "from-[#6A89A7] to-[#384959]",       shadow: "shadow-[#6A89A7]/30",  icon: UserCog       },
    { label: "Teachers",      value: counts.teacher ?? 0, color: "from-[#88BDF2] to-[#6A89A7]",     shadow: "shadow-[#88BDF2]/30",    icon: BookOpen      },
    { label: "Students",      value: counts.student ?? 0, color: "from-[#6A89A7] to-[#384959]",       shadow: "shadow-[#6A89A7]/30",    icon: GraduationCap },
    { label: "Parents",       value: counts.parent  ?? 0, color: "from-[#88BDF2] to-[#6A89A7]",          shadow: "shadow-[#88BDF2]/30",      icon: Users2        },
    { label: "Active",        value: counts.active  ?? 0, color: "from-[#6A89A7] to-[#384959]",         shadow: "shadow-[#6A89A7]/30",    icon: ShieldCheck   },
  ];

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 min-h-screen bg-[#EFF6FD]" style={font}>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#384959] flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#88BDF2] to-[#6A89A7] flex items-center justify-center shadow shadow-[#88BDF2]/40 flex-shrink-0">
                <Users size={15} color="#fff" />
              </div>
              Users Management
            </h1>
            <p className="text-xs text-[#6A89A7] mt-1 ml-10">
              All users across the platform — admins, teachers, students and parents
            </p>
          </div>
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-xl border border-[#BDDDFC] bg-white text-[#6A89A7] hover:text-[#384959] hover:border-[#88BDF2] transition-all self-start sm:self-auto"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statCards.map(({ label, value, color, shadow, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl p-3 border border-[#BDDDFC]/50 shadow-sm flex items-center gap-2.5 hover:shadow-md transition-shadow">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${color} shadow-sm ${shadow}`}>
                <Icon size={15} color="#fff" />
              </div>
              <div>
                <p className="text-xl font-bold text-[#384959]">{value}</p>
                <p className="text-[10px] text-[#6A89A7] leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters + Search ── */}
        <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
          <Search size={15} className="text-[#88BDF2] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[140px] text-sm outline-none text-[#384959] placeholder-[#6A89A7]/60"
            style={font}
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <FilterSelect value={role}   onChange={setRole}   options={ROLE_OPTIONS}   />
            <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#88BDF2] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#6A89A7]" style={font}>Loading users…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 text-red-600 text-sm flex items-center justify-between" style={font}>
            <span>{error}</span>
            <button onClick={fetchUsers} className="text-xs font-semibold underline">Retry</button>
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
                      {["User", "Email", "Role", "School", "Status",].map((h) => (
                        <th key={h} className={`px-4 py-3 font-semibold ${h === "User" ? "text-left" : "text-center"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={`${u.role}-${u.id}`}
                        className="border-b border-[#EFF6FD] hover:bg-[#BDDDFC]/10 transition-colors"
                        style={{ animation: `fadeUp .25s ${i * 0.03}s both` }}
                      >
                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                              style={{
                                background: ROLE_BADGE[u.role]?.bg || "#EFF6FD",
                                color: ROLE_BADGE[u.role]?.color || "#6A89A7",
                              }}
                            >
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#384959] text-[13px]">{u.name}</span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-center">
                          <span className="flex items-center justify-center gap-1 text-[#6A89A7] text-[12px]">
                            <Mail size={11} className="text-[#88BDF2] flex-shrink-0" />
                            {u.email}
                          </span>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3 text-center">
                          <RoleBadge role={u.role} />
                        </td>

                        {/* School */}
                        <td className="px-4 py-3 text-center">
                          {u.school ? (
                            <span className="flex items-center justify-center gap-1 text-[#6A89A7] text-[12px]">
                              <Building2 size={11} className="text-[#88BDF2] flex-shrink-0" />
                              {u.school.name}
                            </span>
                          ) : (
                            <span className="text-[#6A89A7]/40 text-[12px]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <ShieldCheck size={10} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-500 border border-red-200">
                              <ShieldX size={10} /> Inactive
                            </span>
                          )}
                        </td>

                       
                      </tr>
                    ))}

                    {users.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-[#6A89A7] text-sm" style={font}>
                          {search ? `No users matching "${search}".` : "No users found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#EFF6FD]">
                  <p className="text-xs text-[#6A89A7]" style={font}>
                    Showing {(meta.page - 1) * 15 + 1}–{Math.min(meta.page * 15, meta.total)} of {meta.total} users
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={meta.page === 1}
                      className="p-1.5 rounded-lg hover:bg-[#BDDDFC]/40 text-[#6A89A7] hover:text-[#384959] disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - meta.page) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-[#6A89A7]/50 text-xs">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              ...font,
                              background: meta.page === p ? "#384959" : "transparent",
                              color: meta.page === p ? "#BDDDFC" : "#6A89A7",
                            }}
                          >
                            {p}
                          </button>
                        )
                      )}

                    <button
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={meta.page === meta.totalPages}
                      className="p-1.5 rounded-lg hover:bg-[#BDDDFC]/40 text-[#6A89A7] hover:text-[#384959] disabled:opacity-30 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-3">
              {users.length === 0 && (
                <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 py-12 text-center text-[#6A89A7] text-sm">
                  {search ? `No users matching "${search}".` : "No users found."}
                </div>
              )}
              {users.map((u, i) => (
                <div
                  key={`${u.role}-${u.id}`}
                  className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm p-4"
                  style={{ animation: `fadeUp .25s ${i * 0.03}s both` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                        style={{
                          background: ROLE_BADGE[u.role]?.bg || "#EFF6FD",
                          color: ROLE_BADGE[u.role]?.color || "#6A89A7",
                        }}
                      >
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#384959] text-[13px]">{u.name}</p>
                        <p className="text-[11px] text-[#6A89A7] flex items-center gap-1">
                          <Mail size={10} className="text-[#88BDF2]" /> {u.email}
                        </p>
                      </div>
                    </div>
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <ShieldCheck size={9} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
                        <ShieldX size={9} /> Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
                    <RoleBadge role={u.role} />
                    {u.school && (
                      <span className="flex items-center gap-1 text-[#6A89A7] text-[11px]">
                        <Building2 size={10} className="text-[#88BDF2]" /> {u.school.name}
                      </span>
                    )}
                    
                  </div>
                </div>
              ))}

              {/* Mobile Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-2xl border border-[#BDDDFC]/50 px-4 py-3">
                  <p className="text-xs text-[#6A89A7]">
                    {(meta.page - 1) * 15 + 1}–{Math.min(meta.page * 15, meta.total)} of {meta.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={meta.page === 1}
                      className="px-3 py-1.5 rounded-lg bg-[#EFF6FD] text-[#384959] text-xs font-semibold disabled:opacity-30 transition-all"
                    >
                      Prev
                    </button>
                    <span className="px-3 py-1.5 rounded-lg bg-[#384959] text-[#BDDDFC] text-xs font-semibold">
                      {meta.page}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                      disabled={meta.page === meta.totalPages}
                      className="px-3 py-1.5 rounded-lg bg-[#EFF6FD] text-[#384959] text-xs font-semibold disabled:opacity-30 transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Footer count ── */}
        {!loading && !error && meta.totalPages <= 1 && (
          <p className="text-xs text-[#6A89A7] mt-3 text-right" style={font}>
            Showing {users.length} of {meta.total} users
          </p>
        )}
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </PageLayout>
  );
}