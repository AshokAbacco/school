// admin/pages/students/components/StudentStats.jsx
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";

const CARDS = [
  { key: "total", label: "Total Students", icon: Users, bar: "#6A89A7" },
  { key: "active", label: "Active", icon: UserCheck, bar: "#88BDF2" },
  { key: "inactive", label: "Inactive", icon: UserX, bar: "#384959" },
  {
    key: "newThisMonth",
    label: "New This Month",
    icon: TrendingUp,
    bar: "#BDDDFC",
  },
];

export default function StudentStats({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {CARDS.map(({ key, label, icon: Icon, bar }) => (
        <div
          key={key}
          className="relative overflow-hidden rounded-2xl bg-white shadow-sm"
          style={{ border: "1px solid rgba(136,189,242,0.25)" }}
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
            <p className="text-2xl font-bold" style={{ color: "#384959" }}>
              {(stats[key] || 0).toLocaleString()}
            </p>
            <p
              className="text-xs font-semibold mt-0.5"
              style={{ color: "#6A89A7" }}
            >
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
