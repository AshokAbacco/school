// client/src/superAdmin/pages/schools/AllSchools.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Building2, School, Search, MapPin, Phone, Mail, Globe,
  CheckCircle2, XCircle, ChevronRight, ChevronDown, X, RefreshCw,
  GraduationCap, BookOpen, Users2, UserCog, CreditCard, Filter,
  Calendar, Clock, Hash, User, Layers, BookMarked, Link2,
} from "lucide-react";
import { getAnalytics } from "./api/analyticsApi";

const font = { fontFamily: "'DM Sans', sans-serif" };

const C = {
  dark:    "#384959",
  slate:   "#6A89A7",
  sky:     "#88BDF2",
  light:   "#BDDDFC",
  bg:      "#EFF6FD",
  indigo:  "#6366f1",
};

const fmt = (v) =>
  v !== null && v !== undefined ? Number(v).toLocaleString() : "—";

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, color, size = 38 }) {
  const initials = (name || "?")
    .split(" ").slice(0, 2)
    .map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3.5,
      background: color + "20", border: `1.5px solid ${color}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, color, fontSize: size * 0.36, fontWeight: 800,
    }}>
      {initials}
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────
function InfoRow({ Icon, text, color }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.slate }}>
      <Icon size={10} color={color || C.slate} className="flex-shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}

// ─── Tag ──────────────────────────────────────────────────────
function Tag({ text, color }) {
  if (!text) return null;
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide"
      style={{ background: color + "18", color }}>
      {text}
    </span>
  );
}

// ─── Person Card ──────────────────────────────────────────────
function PersonCard({ person, color, role }) {
  return (
    <div className="bg-white rounded-xl p-3.5 border flex flex-col gap-2.5 hover:shadow-md transition-shadow"
      style={{ borderColor: color + "28" }}>
      <div className="flex items-start gap-2.5">
        <Avatar name={person.name} color={color} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold truncate" style={{ color: C.dark }}>{person.name}</p>
          <Tag text={role} color={color} />
        </div>
      </div>
      <div className="space-y-1">
        <InfoRow Icon={Mail}      text={person.email}    />
        <InfoRow Icon={Phone}     text={person.phone}    />
        {person.username   && <InfoRow Icon={User}       text={`@${person.username}`}         color={C.indigo} />}
        {person.grade      && <InfoRow Icon={BookMarked} text={`Grade ${person.grade}`}       color={C.sky}    />}
        {person.className  && <InfoRow Icon={BookMarked} text={`Class: ${person.className}`}  color={C.sky}    />}
        {person.section    && <InfoRow Icon={Hash}       text={`Section ${person.section}`}   color={C.sky}    />}
        {person.rollNumber && <InfoRow Icon={Hash}       text={`Roll No: ${person.rollNumber}`}               />}
        {person.gender     && <InfoRow Icon={User}       text={person.gender}                 color={C.slate}  />}
        {person.dob        && <InfoRow Icon={Calendar}   text={`DOB: ${person.dob}`}          color={C.slate}  />}
        {person.subject    && <InfoRow Icon={BookOpen}   text={person.subject}                color={C.slate}  />}
        {person.joinedAt   && <InfoRow Icon={Calendar}   text={`Joined: ${person.joinedAt}`}                  />}
        {person.lastLogin  && <InfoRow Icon={Clock}      text={`Last login: ${person.lastLogin}`}              />}
        {Array.isArray(person.linkedStudents) && person.linkedStudents.length > 0 && (
          <div className="flex items-start gap-1.5 text-[11px]" style={{ color: C.slate }}>
            <Link2 size={10} color={C.sky} className="flex-shrink-0 mt-0.5" />
            <span className="truncate">{person.linkedStudents.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────
function SectionHeader({ Icon, title, count, color }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
          <Icon size={15} color={color} />
        </div>
        <p className="font-bold text-[14px]" style={{ color: C.dark }}>{title}</p>
      </div>
      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: color + "18", color }}>
        {fmt(count)} total
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function NoData({ Icon, label, color }) {
  return (
    <div className="col-span-full rounded-xl p-8 flex flex-col items-center gap-3 border"
      style={{ background: color + "08", borderColor: color + "28" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: color + "18" }}>
        <Icon size={24} color={color} />
      </div>
      <p className="font-bold text-sm" style={{ color: C.dark }}>No {label} found</p>
      <p className="text-[11px]" style={{ color: C.slate }}>No records available for this school.</p>
    </div>
  );
}

// ─── Expand Panel ─────────────────────────────────────────────
function ExpandPanel({ school, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { key: "overview",  label: "Overview",  Icon: Layers,        count: null             },
    { key: "admins",    label: "Admins",    Icon: UserCog,       count: school.admins    },
    { key: "teachers",  label: "Teachers",  Icon: BookOpen,      count: school.teachers  },
    { key: "students",  label: "Students",  Icon: GraduationCap, count: school.students  },
    { key: "parents",   label: "Parents",   Icon: Users2,        count: school.parents   },
  ];

  const totalPeople =
    (school.students || 0) + (school.teachers || 0) +
    (school.parents  || 0) + (school.admins   || 0);

  return (
    <div className="col-span-full bg-white rounded-2xl border overflow-hidden"
      style={{
        borderColor: C.sky + "70",
        animation:   "expandDown .3s cubic-bezier(0.16,1,0.3,1) both",
        boxShadow:   `0 8px 40px ${C.sky}22`,
      }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-4"
        style={{ background: `linear-gradient(135deg, ${C.dark} 0%, ${C.slate} 100%)` }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} color={C.light} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-[15px] truncate">{school.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-[#BDDDFC]/80 flex items-center gap-1">
                <MapPin size={10} /> {school.city}
              </span>
              {school.isActive
                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"><CheckCircle2 size={8} /> Active</span>
                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-400/20 text-red-300 border border-red-400/30"><XCircle size={8} /> Inactive</span>
              }
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-[#BDDDFC] border border-white/20">
                <CreditCard size={8} /> {school.plan || "No Plan"}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/25 flex items-center justify-center flex-shrink-0 border-0 cursor-pointer transition-colors">
          <X size={14} color={C.light} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: "#e8f3fd" }}>
        {tabs.map(({ key, label, Icon, count }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex items-center gap-1.5 px-5 py-3 text-xs font-semibold whitespace-nowrap border-0 cursor-pointer transition-all flex-shrink-0 border-b-2"
            style={{
              background:  activeTab === key ? C.bg : "white",
              color:       activeTab === key ? C.dark : C.slate,
              borderColor: activeTab === key ? C.sky  : "transparent",
            }}>
            <Icon size={12} />
            {label}
            {count !== null && count !== undefined && (
              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{
                  background: activeTab === key ? C.sky + "30" : "#e8f3fd",
                  color:      activeTab === key ? C.dark : C.slate,
                }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5" style={{ background: C.bg + "50" }}>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-4" style={{ animation: "fadeUp .2s both" }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Students", val: fmt(school.students), Icon: GraduationCap, color: C.sky    },
                { label: "Teachers", val: fmt(school.teachers), Icon: BookOpen,      color: C.slate  },
                { label: "Parents",  val: fmt(school.parents),  Icon: Users2,        color: C.dark   },
                { label: "Admins",   val: fmt(school.admins),   Icon: UserCog,       color: C.indigo },
              ].map(({ label, val, Icon, color }) => (
                <div key={label} className="bg-white rounded-xl p-3.5 flex items-center gap-2.5 border" style={{ borderColor: color + "22" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>
                    <Icon size={15} color={color} />
                  </div>
                  <div>
                    <p className="text-[17px] font-extrabold leading-tight" style={{ color: C.dark }}>{val}</p>
                    <p className="text-[9px] uppercase tracking-wide" style={{ color: C.slate }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: C.sky + "18", border: `1px solid ${C.sky}32` }}>
              <div className="flex items-center gap-2">
                <Users2 size={14} color={C.sky} />
                <span className="text-sm font-semibold" style={{ color: C.dark }}>Total People in School</span>
              </div>
              <span className="text-lg font-extrabold" style={{ color: C.dark }}>{fmt(totalPeople)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(school.email || school.phone || school.website || school.address) && (
                <div className="bg-white rounded-xl p-4 space-y-2 border" style={{ borderColor: "#e8f3fd" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.slate }}>Contact Info</p>
                  {school.email   && <InfoRow Icon={Mail}  text={school.email}  />}
                  {school.phone   && <InfoRow Icon={Phone} text={school.phone}  />}
                  {school.website && (
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.sky }}>
                      <Globe size={10} color={C.sky} />
                      <a href={school.website} target="_blank" rel="noreferrer" className="truncate hover:underline">{school.website}</a>
                    </div>
                  )}
                  {school.address && <InfoRow Icon={MapPin} text={school.address} />}
                </div>
              )}
              {(school.subscriptionStatus || school.subscriptionStart || school.subscriptionEnd) && (
                <div className="bg-white rounded-xl p-4 space-y-2 border" style={{ borderColor: "#e8f3fd" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.slate }}>Subscription</p>
                  {[
                    { label: "Status", val: school.subscriptionStatus },
                    { label: "Start",  val: school.subscriptionStart  },
                    { label: "End",    val: school.subscriptionEnd    },
                  ].filter(r => r.val).map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-[12px]">
                      <span style={{ color: C.slate }}>{label}</span>
                      <span className="font-semibold" style={{ color: C.dark }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: "#e8f3fd" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.slate }}>School ID</p>
              <p className="text-[11px] font-mono break-all" style={{ color: C.dark }}>{school.id || "—"}</p>
            </div>
          </div>
        )}

        {/* Admins */}
        {activeTab === "admins" && (
          <div style={{ animation: "fadeUp .2s both" }}>
            <SectionHeader Icon={UserCog} title="School Administrators" count={school.admins} color={C.indigo} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {school.adminList?.length > 0
                ? school.adminList.map(a => <PersonCard key={a.id} person={a} color={C.indigo} role="Admin" />)
                : <NoData Icon={UserCog} label="admins" color={C.indigo} />}
            </div>
          </div>
        )}

        {/* Teachers */}
        {activeTab === "teachers" && (
          <div style={{ animation: "fadeUp .2s both" }}>
            <SectionHeader Icon={BookOpen} title="Teachers" count={school.teachers} color={C.slate} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {school.teacherList?.length > 0
                ? school.teacherList.map(t => <PersonCard key={t.id} person={t} color={C.slate} role="Teacher" />)
                : <NoData Icon={BookOpen} label="teachers" color={C.slate} />}
            </div>
          </div>
        )}

        {/* Students */}
        {activeTab === "students" && (
          <div style={{ animation: "fadeUp .2s both" }}>
            <SectionHeader Icon={GraduationCap} title="Students" count={school.students} color={C.sky} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {school.studentList?.length > 0
                ? school.studentList.map(s => <PersonCard key={s.id} person={s} color={C.sky} role="Student" />)
                : <NoData Icon={GraduationCap} label="students" color={C.sky} />}
            </div>
          </div>
        )}

        {/* Parents */}
        {activeTab === "parents" && (
          <div style={{ animation: "fadeUp .2s both" }}>
            <SectionHeader Icon={Users2} title="Parents / Guardians" count={school.parents} color={C.dark} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {school.parentList?.length > 0
                ? school.parentList.map(p => <PersonCard key={p.id} person={p} color={C.dark} role="Parent" />)
                : <NoData Icon={Users2} label="parents" color={C.dark} />}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl h-44 border border-[#BDDDFC]/40 animate-pulse" />
      ))}
    </div>
  );
}

// ─── School Card ──────────────────────────────────────────────
function SchoolCard({ school, index, isSelected, onClick }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-lg transition-all duration-200 group"
      style={{
        animation:   `fadeUp .3s ${index * 0.04}s both`,
        borderColor: isSelected ? C.sky : "#BDDDFC80",
        boxShadow:   isSelected ? `0 0 0 2px ${C.sky}, 0 4px 20px ${C.sky}30` : undefined,
      }}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isSelected ? C.sky + "30" : C.bg }}>
            <Building2 size={16} color={isSelected ? C.sky : C.slate} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[13px] truncate leading-tight group-hover:text-[#6A89A7] transition-colors" style={{ color: C.dark }}>
              {school.name || "—"}
            </p>
            <p className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: C.slate }}>
              <MapPin size={9} /> {school.city || "—"}
            </p>
          </div>
        </div>
        {school.isActive
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 flex-shrink-0"><CheckCircle2 size={9} /> Active</span>
          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200 flex-shrink-0"><XCircle size={9} /> Inactive</span>
        }
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { label: "Students", val: fmt(school.students), color: C.sky    },
          { label: "Teachers", val: fmt(school.teachers), color: C.slate  },
          { label: "Parents",  val: fmt(school.parents),  color: C.dark   },
          { label: "Admins",   val: fmt(school.admins),   color: C.indigo },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl py-2 text-center" style={{ background: C.bg }}>
            <p className="text-[12px] font-extrabold" style={{ color }}>{val}</p>
            <p className="text-[8px] uppercase tracking-wide" style={{ color: C.slate }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold"
          style={{ background: C.light + "50", color: C.dark, border: `1px solid ${C.sky}30` }}>
          {school.plan || "No Plan"}
        </span>
        <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: isSelected ? C.sky : C.slate }}>
          {isSelected
            ? <><span>Close</span> <ChevronDown size={10} /></>
            : <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">Details <ChevronRight size={10} /></span>
          }
        </span>
      </div>
    </div>
  );
}

// ─── Grid with inline expand ──────────────────────────────────
function SchoolGrid({ filtered, selectedSchool, setSelectedSchool }) {
  if (filtered.length === 0) {
    return (
      <div className="bg-white rounded-2xl border py-24 flex flex-col items-center gap-3 shadow-sm" style={{ borderColor: C.light + "80" }}>
        <Building2 size={40} color={C.light} />
        <p className="font-semibold" style={{ color: C.dark }}>No schools found</p>
        <p className="text-xs" style={{ color: C.slate }}>Try a different search term or clear the filter.</p>
      </div>
    );
  }

  const COLS         = 3;
  const selectedIdx  = filtered.findIndex(s => s.id === selectedSchool?.id);
  const items        = [];

  for (let i = 0; i < filtered.length; i++) {
    items.push({ type: "card", school: filtered[i], index: i });
    if (selectedIdx !== -1 && selectedSchool) {
      const rowEnd = Math.min(
        Math.floor(selectedIdx / COLS) * COLS + COLS - 1,
        filtered.length - 1
      );
      if (i === rowEnd) {
        items.push({ type: "expand", school: selectedSchool });
      }
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) =>
        item.type === "expand" ? (
          <ExpandPanel
            key="expand-panel"
            school={item.school}
            onClose={() => setSelectedSchool(null)}
          />
        ) : (
          <SchoolCard
            key={item.school.id || item.index}
            school={item.school}
            index={item.index}
            isSelected={selectedSchool?.id === item.school.id}
            onClick={() =>
              setSelectedSchool(
                selectedSchool?.id === item.school.id ? null : item.school
              )
            }
          />
        )
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AllSchools() {
  const [schools,        setSchools]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [search,         setSearch]         = useState("");
  const [filter,         setFilter]         = useState("all");
  const [selectedSchool, setSelectedSchool] = useState(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token  = localStorage.getItem("token");
      const result = await getAnalytics({ range: "all", token });
      setSchools(Array.isArray(result?.topSchools) ? result.topSchools : []);
    } catch (err) {
      setError(err.message || "Failed to load schools.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const filtered = schools.filter((sc) => {
    const matchStatus =
      filter === "all" ||
      (filter === "active" ? sc.isActive : !sc.isActive);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      sc.name?.toLowerCase().includes(q) ||
      sc.city?.toLowerCase().includes(q) ||
      sc.plan?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  useEffect(() => {
    if (selectedSchool && !filtered.find(s => s.id === selectedSchool.id)) {
      setSelectedSchool(null);
    }
  }, [filtered, selectedSchool]);

  const activeCount   = schools.filter(s =>  s.isActive).length;
  const inactiveCount = schools.filter(s => !s.isActive).length;

  return (
    <div>
      <div className="p-4 sm:p-6 min-h-screen" style={{ ...font, background: C.bg }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs flex items-center gap-1 mb-1" style={{ color: C.slate }}>
              SuperAdmin <ChevronRight size={12} />
              <span className="font-semibold" style={{ color: C.sky }}>All Schools</span>
            </p>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2" style={{ color: C.dark }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${C.sky}, ${C.slate})` }}>
                <School size={15} color="#fff" />
              </div>
              All Schools
            </h1>
            <p className="text-xs mt-1 ml-10" style={{ color: C.slate }}>
              Click any school card to view admin, teacher, student &amp; parent details
            </p>
          </div>
          {!loading && !error && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white border rounded-xl px-3 py-2 text-xs font-semibold shadow-sm" style={{ borderColor: C.light + "80", color: C.dark }}>
                <Building2 size={13} color={C.slate} /> {schools.length} Total
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={13} /> {activeCount} Active
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-semibold text-red-500">
                <XCircle size={13} /> {inactiveCount} Inactive
              </div>
              <button onClick={fetchSchools}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border-0 cursor-pointer shadow-sm transition-colors"
                style={{ background: C.dark, color: C.light }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-600 text-sm flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="font-semibold mb-0.5">Failed to load schools</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
            <button onClick={fetchSchools} className="text-xs font-bold underline whitespace-nowrap border-0 bg-transparent cursor-pointer text-red-600">Retry</button>
          </div>
        )}

        {/* Toolbar */}
        {!error && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.slate }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, city or plan…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-white text-sm outline-none shadow-sm"
                style={{ ...font, borderColor: C.light + "80", color: C.dark }}
              />
            </div>
            <div className="flex gap-2 items-center">
              <Filter size={13} color={C.slate} className="flex-shrink-0" />
              {[{ key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "inactive", label: "Inactive" }].map(({ key, label }) => (
                <button key={key} onClick={() => setFilter(key)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    background:  filter === key ? C.dark : "white",
                    color:       filter === key ? C.light : C.slate,
                    borderColor: filter === key ? C.dark  : C.light,
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <span className="self-center text-xs whitespace-nowrap bg-white border rounded-xl px-3 py-2 font-semibold shadow-sm" style={{ borderColor: C.light + "80", color: C.slate }}>
              {filtered.length} school{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Body */}
        {loading ? <Skeleton /> : (
          <SchoolGrid
            filtered={filtered}
            selectedSchool={selectedSchool}
            setSelectedSchool={setSelectedSchool}
          />
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes expandDown {
          from { opacity: 0; transform: scaleY(0.9); transform-origin: top; }
          to   { opacity: 1; transform: scaleY(1);   transform-origin: top; }
        }
      `}</style>
    </div>
  );
}