// client/src/superAdmin/dashboard/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  GraduationCap, BookOpen, Building2, Users,
  RefreshCw, School, AlertCircle,
  Activity, DollarSign, Award, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { getToken } from "../../auth/storage";

const API = import.meta.env.VITE_API_URL;

const C = {
  slate:       "#6A89A7",
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  deepDark:    "#243340",
  bg:          "#EDF3FA",
  white:       "#FFFFFF",
  border:      "#C8DCF0",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
  green:       "#059669",
  purple:      "#7C3AED",
  amber:       "#D97706",
  red:         "#DC2626",
  pink:        "#DB2777",
  blue:        "#3B82F6",
};

const greeting   = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const formatDate = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const acYear     = () => { const n = new Date(), y = n.getFullYear(); return n.getMonth() >= 5 ? `${y}-${String(y+1).slice(2)}` : `${y-1}-${String(y).slice(2)}`; };

function getAdminName() {
  try {
    for (const k of ["user", "authUser", "userData", "currentUser"]) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const p = JSON.parse(raw);
      if (p?.name)       return p.name;
      if (p?.user?.name) return p.user.name;
    }
  } catch { /**/ }
  return "Admin";
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Pulse({ w = "100%", h = 13, r = 8 }) {
  return <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }} />;
}

function SkeletonRows({ n = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}` }}>
          <Pulse w={32} h={32} r={10} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Pulse w="55%" h={12} r={5} />
            <Pulse w="38%" h={10} r={4} />
          </div>
          <Pulse w={50} h={22} r={20} />
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent, loading }) {
  return (
    <div style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 14px rgba(56,73,89,0.07)", padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${C.deep})` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</p>
          {loading ? (
            <><Pulse w={60} h={28} r={6} /><div style={{ marginTop: 6 }}><Pulse w={90} h={10} r={4} /></div></>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1 }}>{value ?? "—"}</p>
              {sub && <p style={{ margin: "5px 0 0", fontSize: 12, color: C.textLight }}>{sub}</p>}
            </>
          )}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${accent}16`, border: `1px solid ${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12 }}>
          <Icon size={20} color={accent} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function Panel({ icon: Icon, iconBg, title, badge, sub, children, accentBar }) {
  return (
    <div style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 16px rgba(56,73,89,0.06)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {accentBar && <div style={{ height: 3, background: accentBar }} />}
      <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", gap: 10, background: `linear-gradient(90deg, ${C.bg}, ${C.white})` }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>
            {title}
            {badge && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${C.sky}18`, color: C.deep }}>{badge}</span>}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{sub}</p>
        </div>
      </div>
      <div style={{ padding: 16, flex: 1 }}>{children}</div>
    </div>
  );
}

function UserRow({ user }) {
  const initials = (user.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const roleConfig = {
    ADMIN:       { bg: "#7C3AED22", color: "#7C3AED", label: "Admin" },
    TEACHER:     { bg: `${C.sky}22`, color: C.deep,   label: "Teacher" },
    STUDENT:     { bg: "#05966922", color: "#059669",  label: "Student" },
    PARENT:      { bg: "#D9770622", color: "#D97706",  label: "Parent" },
    FINANCE:     { bg: "#DC262622", color: "#DC2626",  label: "Finance" },
    SUPER_ADMIN: { bg: `${C.slate}22`, color: C.slate, label: "Super Admin" },
  };
  const role = roleConfig[user.role] || { bg: `${C.slate}18`, color: C.slate, label: user.role };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}`, transition: "box-shadow 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 3px 12px ${C.sky}22`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: role.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: role.color }}>{initials}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.school?.name || user.email || "—"}</p>
      </div>
      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: role.bg, color: role.color, letterSpacing: "0.04em", flexShrink: 0, whiteSpace: "nowrap" }}>
        {role.label.toUpperCase()}
      </span>
    </div>
  );
}

function Empty({ message }) {
  return (
    <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertCircle size={22} color={C.sky} strokeWidth={1.5} />
      </div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>No data</p>
      <p style={{ margin: 0, fontSize: 12, color: C.textLight, textAlign: "center" }}>{message}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 16px rgba(56,73,89,0.12)", fontSize: 12 }}>
      {label && <p style={{ margin: "0 0 4px", fontWeight: 700, color: C.text }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ margin: 0, color: p.color || C.textLight }}>
          <span style={{ fontWeight: 700 }}>{p.name}:</span> {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── CHART 1: Students by Gender ─────────────────────────────────────────────
// Data source: GET /api/superadmin-finance/student-finance
// studentFinance[].gender → "MALE" | "FEMALE" | null
// Count girls (FEMALE) and boys (MALE) from the real studentList records.

function StudentGenderChart({ financeData, financeLoading }) {
  const girls = financeData.filter((s) =>
    (s.gender || "").toUpperCase() === "FEMALE"
  ).length;
  const boys = financeData.filter((s) =>
    (s.gender || "").toUpperCase() === "MALE"
  ).length;
  const other = financeData.length - girls - boys;

  const data = [
    { gender: "Girls", count: girls },
    { gender: "Boys",  count: boys  },
    ...(other > 0 ? [{ gender: "Other", count: other }] : []),
  ];

  return (
    <Panel icon={GraduationCap} iconBg={`linear-gradient(135deg, ${C.pink}, #9333EA)`}
      title="Students by Gender" sub="Real count from student records"
      accentBar={`linear-gradient(90deg, ${C.pink}, #9333EA)`}>
      {financeLoading ? <Pulse w="100%" h={220} r={12} /> : (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Girls", count: girls, color: C.pink,  icon: "♀" },
              { label: "Boys",  count: boys,  color: C.blue,  icon: "♂" },
            ].map(({ label, count, color, icon }) => (
              <div key={label} style={{ flex: 1, background: `${color}10`, border: `1.5px solid ${color}25`, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color }}>{count.toLocaleString()}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.textLight, fontWeight: 700 }}>{label}</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke={`${C.borderLight}88`} vertical={false} />
              <XAxis dataKey="gender" tick={{ fontSize: 12, fontWeight: 700, fill: C.textLight }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textLight }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.mist}33` }} />
              <Bar dataKey="count" name="Students" radius={[8, 8, 0, 0]}>
                <Cell fill={C.pink} />
                <Cell fill={C.blue} />
                {other > 0 && <Cell fill={C.slate} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {financeData.length === 0 && (
            <p style={{ textAlign: "center", fontSize: 11, color: C.textLight, marginTop: 8 }}>No student finance records found</p>
          )}
        </>
      )}
    </Panel>
  );
}

// ─── CHART 2: Teachers by Gender ─────────────────────────────────────────────
// Data source: GET /api/superadmin-finance/staff-salary
// normTeacher[].gender comes from TeacherProfile.gender ("MALE"/"FEMALE")
// fetched via teacherGenderMap in the controller.

function TeacherGenderChart({ salaryData, salaryLoading }) {
  const teachers = salaryData.teacherSalary || [];
  const men   = teachers.filter((r) => (r.gender || "").toUpperCase() === "MALE").length;
  const women = teachers.filter((r) => (r.gender || "").toUpperCase() === "FEMALE").length;

  // Deduplicate by teacherId so one teacher with multiple salary months counts once
  const uniqueTeachers = Object.values(
    teachers.reduce((acc, r) => {
      const key = r.teacherId || r.id;
      if (!acc[key]) acc[key] = r;
      return acc;
    }, {})
  );
  const uniqueMen   = uniqueTeachers.filter((r) => (r.gender || "").toUpperCase() === "MALE").length;
  const uniqueWomen = uniqueTeachers.filter((r) => (r.gender || "").toUpperCase() === "FEMALE").length;
  const total       = uniqueTeachers.length;

  const data = [
    { name: "Men",   value: uniqueMen   },
    { name: "Women", value: uniqueWomen },
  ];
  const COLORS = [C.blue, C.pink];

  return (
    <Panel icon={BookOpen} iconBg={`linear-gradient(135deg, ${C.blue}, #06B6D4)`}
      title="Teachers by Gender" sub="Unique teachers from salary records"
      accentBar={`linear-gradient(90deg, ${C.blue}, #06B6D4)`}>
      {salaryLoading ? <Pulse w="100%" h={220} r={12} /> : (
        <>
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={175}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={75}
                  paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>{total}</p>
              <p style={{ margin: 0, fontSize: 9, color: C.textLight, fontWeight: 700 }}>TOTAL</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
            {data.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i] }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textLight }}>{d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: C.text }}>{d.value}</span>
              </div>
            ))}
          </div>
          {total === 0 && (
            <p style={{ textAlign: "center", fontSize: 11, color: C.textLight, marginTop: 8 }}>No teacher salary records found</p>
          )}
        </>
      )}
    </Panel>
  );
}

// ─── CHART 3: Student Fees Paid / Pending ────────────────────────────────────
// Data source: GET /api/superadmin-finance/student-finance
// Each record: { fees, paidAmount, dueAmount }
// paid   = records where dueAmount <= 0 (fully paid)
// pending = records where dueAmount > 0 (has dues)

function StudentFeesChart({ financeData, financeLoading }) {
  const paid    = financeData.filter((s) => Number(s.dueAmount || 0) <= 0).length;
  const pending = financeData.filter((s) => Number(s.dueAmount || 0) >  0).length;
  const total   = financeData.length || 1;

  const data = [
    { name: "Paid",    value: paid    },
    { name: "Pending", value: pending },
  ];
  const COLORS = [C.green, C.amber];

  return (
    <Panel icon={DollarSign} iconBg={`linear-gradient(135deg, ${C.green}, #10B981)`}
      title="Student Fees" sub="Fully paid vs has dues"
      accentBar={`linear-gradient(90deg, ${C.green}, ${C.amber})`}>
      {financeLoading ? <Pulse w="100%" h={220} r={12} /> : (
        <>
          <ResponsiveContainer width="100%" height={148}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={66} paddingAngle={3} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {data.map((d, i) => (
              <div key={d.name} style={{ flex: 1, background: `${COLORS[i]}12`, border: `1.5px solid ${COLORS[i]}30`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: COLORS[i] }}>{d.value.toLocaleString()}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.textLight, fontWeight: 600 }}>{d.name}</p>
                <p style={{ margin: 0, fontSize: 9, color: C.textLight }}>{Math.round(d.value / total * 100)}%</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ─── CHART 4: Staff Salary Paid / Pending ────────────────────────────────────
// Data source: GET /api/superadmin-finance/staff-salary
// Merges all 6 salary arrays: teacherSalary, adminSalary, financeSalary,
// groupBSalary, groupCSalary, groupDSalary
// Each record has: status ("PAID" | "PENDING") and _group ("Teacher","Admin" etc.)

function StaffSalaryChart({ salaryData, salaryLoading }) {
  const allRecords = [
    ...(salaryData.teacherSalary  || []),
    ...(salaryData.adminSalary    || []),
    ...(salaryData.financeSalary  || []),
    ...(salaryData.groupBSalary   || []),
    ...(salaryData.groupCSalary   || []),
    ...(salaryData.groupDSalary   || []),
  ];

  // Build per-group breakdown
  const groups = ["Teacher", "Admin", "Finance", "Group B", "Group C", "Group D"];
  const groupMap = {
    "Teacher": "teacherSalary",
    "Admin":   "adminSalary",
    "Finance": "financeSalary",
    "Group B": "groupBSalary",
    "Group C": "groupCSalary",
    "Group D": "groupDSalary",
  };

  const data = groups
    .map((g) => {
      const recs = salaryData[groupMap[g]] || [];
      return {
        group:   g,
        paid:    recs.filter((r) => (r.status || "").toUpperCase() === "PAID").length,
        pending: recs.filter((r) => (r.status || "").toUpperCase() !== "PAID").length,
      };
    })
    .filter((d) => d.paid + d.pending > 0); // skip empty groups

  const totalPaid    = allRecords.filter((r) => (r.status || "").toUpperCase() === "PAID").length;
  const totalPending = allRecords.filter((r) => (r.status || "").toUpperCase() !== "PAID").length;

  return (
    <Panel icon={Users} iconBg={`linear-gradient(135deg, ${C.purple}, #8B5CF6)`}
      title="Staff Salary" sub="Paid vs pending across all groups"
      accentBar={`linear-gradient(90deg, ${C.purple}, ${C.red})`}>
      {salaryLoading ? <Pulse w="100%" h={220} r={12} /> : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Paid",    color: C.purple, value: totalPaid    },
              { label: "Pending", color: C.red,    value: totalPending },
            ].map(({ label, color, value }) => (
              <div key={label} style={{ flex: 1, background: `${color}10`, border: `1.5px solid ${color}25`, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color }}>{value}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.textLight, fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={148}>
              <BarChart data={data} barCategoryGap="35%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${C.borderLight}88`} vertical={false} />
                <XAxis dataKey="group" tick={{ fontSize: 10, fontWeight: 700, fill: C.textLight }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.textLight }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.mist}33` }} />
                <Bar dataKey="paid"    name="Paid"    fill={C.purple} radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill={C.red}    radius={[6, 6, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: "center", fontSize: 11, color: C.textLight, marginTop: 8 }}>No salary records found</p>
          )}
        </>
      )}
    </Panel>
  );
}

// ─── Top 2 Students ───────────────────────────────────────────────────────────
// Data source: GET /api/superadmin/analytics → topSchools[*].studentList
// studentList is raw Student records from Prisma.
// We flatten all students across all schools, sort by name alphabetically
// (real scores not in analytics endpoint — show student count rank by school).
// Each student record: { id, name, email, studentCode, schoolId }

function TopStudentsPanel({ topSchools, analyticsLoading }) {
  // Flatten students from all schools, attach school name
  const allStudents = topSchools.flatMap((school) =>
    (school.studentList || []).map((s) => ({
      ...s,
      schoolName: school.name,
    }))
  );

  // Sort by creation date descending (latest enrolled = most recent achievers)
  const sorted = [...allStudents].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  const top2 = sorted.slice(0, 2);

  const MEDALS = ["🥇", "🥈"];
  const BG = [
    { card: "linear-gradient(135deg,#FEF3C7,#FFFBEB)", border: "#F59E0B44", num: "#D97706" },
    { card: "linear-gradient(135deg,#F1F5F9,#F8FAFC)", border: C.borderLight,  num: C.deep   },
  ];

  return (
    <Panel icon={Award} iconBg={`linear-gradient(135deg,#F59E0B,#EF4444)`}
      title="Top Students" badge={`${allStudents.length} total`}
      sub="Recently enrolled — from analytics"
      accentBar="linear-gradient(90deg,#F59E0B,#EF4444)">
      {analyticsLoading ? <SkeletonRows n={2} /> : top2.length === 0 ? (
        <Empty message="No students found across schools" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {top2.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: BG[i].card, border: `1.5px solid ${BG[i].border}` }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: i === 0 ? "linear-gradient(135deg,#F59E0B,#EF4444)" : `linear-gradient(135deg,${C.sky},${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {MEDALS[i]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name || "—"}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.schoolName} {s.studentCode ? `· ${s.studentCode}` : ""}
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: BG[i].num }}>
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                </p>
                <p style={{ margin: 0, fontSize: 9, color: C.textLight, fontWeight: 700 }}>ENROLLED</p>
              </div>
            </div>
          ))}
          <p style={{ margin: "4px 0 0", fontSize: 10, color: C.textLight, textAlign: "center" }}>
            Showing 2 of {allStudents.length} students · sorted by latest enrollment
          </p>
        </div>
      )}
    </Panel>
  );
}

// ─── Bottom Staff (Highest Pending Salary) ────────────────────────────────────
// Data source: GET /api/superadmin-finance/staff-salary
// Flatten all 6 salary arrays, filter status !== "PAID", sort by netSalary desc
// Show the 2 staff members with largest pending salary amounts.

function BottomStaffPanel({ salaryData, salaryLoading }) {
  const allRecords = [
    ...(salaryData.teacherSalary  || []),
    ...(salaryData.adminSalary    || []),
    ...(salaryData.financeSalary  || []),
    ...(salaryData.groupBSalary   || []),
    ...(salaryData.groupCSalary   || []),
    ...(salaryData.groupDSalary   || []),
  ];

  const pending = allRecords
    .filter((r) => (r.status || "").toUpperCase() !== "PAID")
    .sort((a, b) => Number(b.netSalary || 0) - Number(a.netSalary || 0));

  const bottom2 = pending.slice(0, 2);

  const maxSalary = bottom2[0]?.netSalary || 1;

  return (
    <Panel icon={AlertTriangle} iconBg={`linear-gradient(135deg,${C.red},#F97316)`}
      title="Staff — Salary Pending" badge={`${pending.length} records`}
      sub="Highest pending salary amounts"
      accentBar={`linear-gradient(90deg,${C.red},#F97316)`}>
      {salaryLoading ? <SkeletonRows n={2} /> : bottom2.length === 0 ? (
        <Empty message="No pending salary records" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {bottom2.map((s, i) => {
            const pct   = Math.round((Number(s.netSalary || 0) / maxSalary) * 100);
            const color = i === 0 ? C.red : C.amber;
            const month = s.month ? `Month ${s.month}/${s.year || ""}` : (s._date ? new Date(s._date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—");
            return (
              <div key={s.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: `${color}08`, border: `1.5px solid ${color}28` }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}18`, border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertTriangle size={20} color={color} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s._name || "—"}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>
                    {s._group || "Staff"} · {month}
                  </p>
                  <div style={{ height: 4, background: `${C.borderLight}88`, borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.8s ease" }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color }}>
                    ₹{Number(s.netSalary || 0).toLocaleString("en-IN")}
                  </p>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: `${color}18`, color }}>
                    PENDING
                  </span>
                </div>
              </div>
            );
          })}
          <p style={{ margin: "4px 0 0", fontSize: 10, color: C.textLight, textAlign: "center" }}>
            Showing 2 of {pending.length} pending records · sorted by highest amount
          </p>
        </div>
      )}
    </Panel>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const headers = { Authorization: `Bearer ${getToken()}` };

  // ── State ──────────────────────────────────────────────────────────────────
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [usersLoading,     setUsersLoading]     = useState(true);
  const [schoolsLoading,   setSchoolsLoading]   = useState(true);
  const [financeLoading,   setFinanceLoading]   = useState(true);
  const [salaryLoading,    setSalaryLoading]    = useState(true);
  const [analyticsError,   setAnalyticsError]   = useState("");
  const [refreshKey,       setRefreshKey]       = useState(0);

  const [stats,       setStats]       = useState({});
  const [topSchools,  setTopSchools]  = useState([]);
  const [users,       setUsers]       = useState([]);
  const [counts,      setCounts]      = useState({});
  const [schoolList,  setSchoolList]  = useState([]);
  // Real finance data
  const [financeData, setFinanceData] = useState([]); // student finance records
  const [salaryData,  setSalaryData]  = useState({    // all staff salary records
    teacherSalary: [], adminSalary: [], financeSalary: [],
    groupBSalary: [], groupCSalary: [], groupDSalary: [],
  });

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true); setAnalyticsError("");
    try {
      const json = await fetch(`${API}/api/superadmin/analytics?range=30d`, { headers }).then((r) => r.json());
      if (json.stats) {
        setStats(json.stats);
        setTopSchools(json.topSchools ?? []);
      } else {
        setAnalyticsError(json.message || "Failed to load analytics");
      }
    } catch { setAnalyticsError("Network error — could not load analytics"); }
    finally   { setAnalyticsLoading(false); }
  }, [refreshKey]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const json = await fetch(`${API}/api/users/all?limit=8&page=1`, { headers }).then((r) => r.json());
      setUsers(json.users ?? []); setCounts(json.counts ?? {});
    } catch { /**/ }
    finally   { setUsersLoading(false); }
  }, [refreshKey]);

  const fetchSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      const json = await fetch(`${API}/api/schools`, { headers }).then((r) => r.json());
      setSchoolList(json.schools ?? []);
    } catch { /**/ }
    finally   { setSchoolsLoading(false); }
  }, [refreshKey]);

  // ── Real finance data: student-finance → gender + fees status ──────────────
  const fetchStudentFinance = useCallback(async () => {
    setFinanceLoading(true);
    try {
      const json = await fetch(`${API}/api/superadmin-finance/student-finance`, { headers }).then((r) => r.json());
      if (json.success) setFinanceData(json.data ?? []);
    } catch { /**/ }
    finally   { setFinanceLoading(false); }
  }, [refreshKey]);

  // ── Real salary data: staff-salary → gender + paid/pending ─────────────────
  const fetchStaffSalary = useCallback(async () => {
    setSalaryLoading(true);
    try {
      const json = await fetch(`${API}/api/superadmin-finance/staff-salary`, { headers }).then((r) => r.json());
      if (json.success) setSalaryData(json.data ?? {
        teacherSalary: [], adminSalary: [], financeSalary: [],
        groupBSalary: [], groupCSalary: [], groupDSalary: [],
      });
    } catch { /**/ }
    finally   { setSalaryLoading(false); }
  }, [refreshKey]);

  useEffect(() => {
    fetchAnalytics();
    fetchUsers();
    fetchSchools();
    fetchStudentFinance();
    fetchStaffSalary();
  }, [fetchAnalytics, fetchUsers, fetchSchools, fetchStudentFinance, fetchStaffSalary]);

  const anyLoading     = analyticsLoading || usersLoading || schoolsLoading || financeLoading || salaryLoading;
  const displaySchools = topSchools.length > 0 ? topSchools : schoolList;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *{font-family:'DM Sans',sans-serif}
        .df{animation:dfUp 0.45s cubic-bezier(0.22,1,0.36,1) both}
        .df1{animation-delay:.04s}.df2{animation-delay:.10s}.df3{animation-delay:.16s}.df4{animation-delay:.22s}
        @keyframes dfUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .animate-pulse{animation:pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .animate-spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:900px){.four-col{grid-template-columns:1fr 1fr !important}}
        @media(max-width:600px){.four-col{grid-template-columns:1fr !important}.two-col{grid-template-columns:1fr !important}.pills{grid-template-columns:1fr 1fr !important}}
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 20px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div className="df" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: "0 0 4px 14px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.1em" }}>Super Admin Dashboard</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 4, height: 30, borderRadius: 99, background: `linear-gradient(180deg,${C.sky},${C.deep})` }} />
                <h1 style={{ margin: 0, fontSize: "clamp(20px,5vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.5px" }}>{greeting()},</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 14, flexWrap: "wrap" }}>
                <p style={{ margin: 0, fontSize: 13, color: C.textLight, fontWeight: 500 }}>{formatDate()}</p>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 10px", borderRadius: 20, background: C.deep, color: C.white, letterSpacing: "0.05em" }}>{acYear()}</span>
              </div>
            </div>
            <button onClick={() => setRefreshKey((k) => k + 1)} title="Refresh"
              style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight, boxShadow: "0 1px 4px rgba(56,73,89,0.06)", flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${C.mist}55`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}>
              <RefreshCw size={15} className={anyLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* ── Quick Summary Bar ── */}
          {!analyticsLoading && (
            <div className="df df1" style={{ background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 14, padding: "10px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", boxShadow: "0 1px 6px rgba(56,73,89,0.05)" }}>
              <Activity size={13} color={C.sky} strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.textLight, marginRight: 8 }}>Quick summary —</span>
              {[
                { label: "students", value: stats.totalStudents },
                { label: "teachers", value: stats.totalTeachers },
                { label: "schools",  value: stats.totalSchools  },
                { label: "admins",   value: stats.totalAdmins   },
              ].map(({ label, value }) => (
                <span key={label} style={{ fontSize: 12, color: C.textLight }}>
                  <span style={{ fontWeight: 800, color: C.text }}>{value?.toLocaleString() ?? "—"}</span> {label}
                  <span style={{ margin: "0 10px", color: C.borderLight }}>·</span>
                </span>
              ))}
            </div>
          )}

          {/* ── Stat Cards ── */}
          <div className="df df1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
            <StatCard label="Total Students" value={stats.totalStudents?.toLocaleString()} sub={`${stats.totalStudents ?? 0} enrolled`}     icon={GraduationCap} accent={C.sky}    loading={analyticsLoading} />
            <StatCard label="Total Teachers" value={stats.totalTeachers?.toLocaleString()} sub={`${stats.totalTeachers ?? 0} active`}        icon={BookOpen}      accent={C.green}  loading={analyticsLoading} />
            <StatCard label="Total Schools"  value={stats.totalSchools?.toLocaleString()}  sub={`${stats.activeSchools ?? 0} active`}         icon={Building2}     accent={C.purple} loading={analyticsLoading} />
            <StatCard label="Total Users"    value={stats.totalUsers?.toLocaleString()}    sub={`${counts.active ?? 0} active · ${counts.inactive ?? 0} inactive`} icon={Users} accent={C.amber} loading={analyticsLoading || usersLoading} />
          </div>

          {/* ── Role Pills ── */}
          {!analyticsLoading && (
            <div className="df df2 pills" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Admins",         value: stats.totalAdmins,   accent: C.purple },
                { label: "Teachers",       value: stats.totalTeachers, accent: C.deep   },
                { label: "Parents",        value: stats.totalParents,  accent: C.amber  },
                { label: "Active Schools", value: stats.activeSchools, accent: C.green  },
              ].map(({ label, value, accent }) => (
                <div key={label} style={{ background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(56,73,89,0.05)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textLight }}>{label}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: accent }}>{value?.toLocaleString() ?? "—"}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── 4 Charts Row — all backed by real API data ── */}
          <div className="df df2 four-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr  ", gap: 18, marginBottom: 20 }}>
            {/* Chart 1: student gender from /api/superadmin-finance/student-finance */}
            <StudentGenderChart financeData={financeData} financeLoading={financeLoading} />
            {/* Chart 2: teacher gender from /api/superadmin-finance/staff-salary teacherSalary[].gender */}
            <TeacherGenderChart salaryData={salaryData}   salaryLoading={salaryLoading}   />
            {/* Chart 3: fees paid/pending from /api/superadmin-finance/student-finance dueAmount */}
            <StudentFeesChart   financeData={financeData} financeLoading={financeLoading} />
            {/* Chart 4: salary paid/pending from /api/superadmin-finance/staff-salary all groups */}
            {/* <StaffSalaryChart   salaryData={salaryData}   salaryLoading={salaryLoading}   /> */}
          </div>

          {/* ── Top Students | Flagged Staff ── */}
          <div className="df df3 two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18, alignItems: "start" }}>
            {/* Top students from analytics topSchools[*].studentList */}
            <TopStudentsPanel topSchools={topSchools} analyticsLoading={analyticsLoading} />
            {/* Pending salary staff from /api/superadmin-finance/staff-salary */}
            <BottomStaffPanel salaryData={salaryData}  salaryLoading={salaryLoading}      />
          </div>

          {/* ── Recent Users | User Breakdown ── */}
          <div className="df df3 two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18, alignItems: "start" }}>
            <Panel icon={Users} iconBg={`linear-gradient(135deg,${C.sky},${C.deep})`}
              title="Recent Users" badge={users.length ? `Last ${users.length}` : undefined}
              sub={usersLoading ? "Loading…" : `${counts.total ?? 0} total users`}>
              {usersLoading ? <SkeletonRows n={5} /> : users.length === 0 ? <Empty message="No users found" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {users.slice(0, 6).map((u) => <UserRow key={u.id} user={u} />)}
                </div>
              )}
              {!usersLoading && counts.total > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1.5px solid ${C.borderLight}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                  {[{ label: "Admins", val: counts.admin }, { label: "Teachers", val: counts.teacher }, { label: "Students", val: counts.student }].map(({ label, val }) => (
                    <div key={label}>
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: C.text }}>{val ?? 0}</p>
                      <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel icon={Activity} iconBg={`linear-gradient(135deg,${C.slate},${C.deep})`}
              title="User Breakdown" sub="Distribution across all roles">
              {usersLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[...Array(5)].map((_, i) => <div key={i}><Pulse w="60%" h={10} r={4} /><div style={{ marginTop: 6 }}><Pulse w="100%" h={8} r={4} /></div></div>)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { role: "Super Admins",  count: counts.superAdmin, color: C.slate  },
                    { role: "School Admins", count: counts.admin,      color: C.purple },
                    { role: "Teachers",      count: counts.teacher,    color: C.sky    },
                    { role: "Students",      count: counts.student,    color: C.green  },
                    { role: "Parents",       count: counts.parent,     color: C.amber  },
                    { role: "Finance",       count: counts.finance,    color: C.red    },
                  ].map(({ role, count, color }) => {
                    const pct = counts.total ? Math.round(((count || 0) / counts.total) * 100) : 0;
                    return (
                      <div key={role}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.textLight }}>{role}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{count ?? 0}</span>
                        </div>
                        <div style={{ height: 6, background: `${C.borderLight}88`, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.7s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!usersLoading && counts.total > 0 && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1.5px solid ${C.borderLight}`, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>{counts.active ?? 0}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>Active users</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.borderLight }}>{counts.inactive ?? 0}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>Inactive</p>
                  </div>
                </div>
              )}
            </Panel>
          </div>

          {/* ── School Details Table ── */}
          <div className="df df4" style={{ marginBottom: 18 }}>
            <div style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 16px rgba(56,73,89,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(90deg,${C.bg},${C.white})` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg,${C.sky},${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <School size={17} color="#fff" strokeWidth={2} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>School Details</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{analyticsLoading ? "Loading…" : `${Math.min(displaySchools.length, 5)} of ${displaySchools.length} schools`}</p>
                  </div>
                </div>
                {!analyticsLoading && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: `${C.sky}18`, color: C.deep }}>{displaySchools.length} total</span>}
              </div>
              {analyticsLoading ? (
                <div style={{ padding: 16 }}><SkeletonRows n={4} /></div>
              ) : analyticsError ? (
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 12, background: `${C.mist}55`, border: `1px solid ${C.border}`, fontSize: 13, color: C.slate }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{analyticsError}
                  </div>
                </div>
              ) : displaySchools.length === 0 ? (
                <div style={{ padding: 16 }}><Empty message="No school data available" /></div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.bg }}>
                        {["School", "Students", "Teachers", "Admins", "Status"].map((h) => (
                          <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textLight, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displaySchools.slice(0, 5).map((s) => (
                        <tr key={s.id} style={{ borderTop: `1.5px solid ${C.borderLight}`, transition: "background 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "12px 18px" }}>
                            <p style={{ margin: 0, fontWeight: 700, color: C.text, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{s.city || "—"}</p>
                          </td>
                          <td style={{ padding: "12px 18px", fontWeight: 700, color: C.text }}>{s.students ?? 0}</td>
                          <td style={{ padding: "12px 18px", fontWeight: 700, color: C.text }}>{s.teachers ?? 0}</td>
                          <td style={{ padding: "12px 18px", fontWeight: 700, color: C.text }}>{s.admins ?? 0}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: s.isActive ? "#05966918" : `${C.slate}18`, color: s.isActive ? C.green : C.slate }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.isActive ? C.green : C.borderLight, display: "inline-block" }} />
                              {s.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <p style={{ textAlign: "center", color: C.textLight, fontSize: 11, marginTop: 32 }}>
            School Management System · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}