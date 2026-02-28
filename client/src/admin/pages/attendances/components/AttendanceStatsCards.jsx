// client/src/admin/pages/attendances/components/AttendanceStatsCards.jsx
import React, { useMemo } from "react";
import { Users, UserCheck, UserX } from "lucide-react";

const C = {
  primary: "#384959",
  secondary: "#6A89A7",
  border: "rgba(136,189,242,0.30)",
};

const STAT_CARDS_CONFIG = [
  {
    key: "total",
    label: "Total Students",
    icon: Users,
    bar: "#6A89A7", // neutral secondary
  },
  {
    key: "present",
    label: "Present",
    icon: UserCheck,
    bar: "#88BDF2", // accent blue
  },
  {
    key: "absent",
    label: "Absent",
    icon: UserX,
    bar: "#384959", // primary dark
  },
];

export default function AttendanceStatsCards({ attendance }) {
  const stats = useMemo(() => {
    if (!attendance || attendance.length === 0)
      return { total: 0, present: 0, absent: 0 };

    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "PRESENT").length;
    const absent = total - present;

    return { total, present, absent };
  }, [attendance]);

  if (!attendance || attendance.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {STAT_CARDS_CONFIG.map(({ key, label, icon: Icon, bar }) => (
        <div
          key={key}
          className="relative overflow-hidden rounded-2xl bg-white shadow-sm"
          style={{ border: `1px solid ${C.border}` }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{ background: bar }}
          />
          <div className="px-5 pt-5 pb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${bar}22` }}
            >
              <Icon
                size={16}
                style={{ color: bar === "#BDDDFC" ? "#6A89A7" : bar }}
              />
            </div>
            <p className="text-2xl font-bold" style={{ color: C.primary }}>
              {(stats[key] || 0).toLocaleString()}
            </p>
            <p
              className="text-xs font-semibold mt-0.5"
              style={{ color: C.secondary }}
            >
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
