// client/src/admin/pages/meeting/components/MeetingStatsCards.jsx
import React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock4,
  XCircle,
  Users,
  TrendingUp,
} from "lucide-react";

const cards = [
  {
    key: "total",
    label: "Total Meetings",
    icon: CalendarDays,
    bg: "bg-[#BDDDFC]",
    iconColor: "text-[#384959]",
    textColor: "text-[#384959]",
    border: "border-[#88BDF2]",
  },
  {
    key: "scheduled",
    label: "Scheduled",
    icon: Clock4,
    bg: "bg-white",
    iconColor: "text-[#6A89A7]",
    textColor: "text-[#384959]",
    border: "border-[#BDDDFC]",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    bg: "bg-white",
    iconColor: "text-emerald-500",
    textColor: "text-[#384959]",
    border: "border-[#BDDDFC]",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    bg: "bg-white",
    iconColor: "text-rose-400",
    textColor: "text-[#384959]",
    border: "border-[#BDDDFC]",
  },
  {
    key: "totalParticipants",
    label: "Total Participants",
    icon: Users,
    bg: "bg-white",
    iconColor: "text-[#6A89A7]",
    textColor: "text-[#384959]",
    border: "border-[#BDDDFC]",
  },
  {
    key: "thisMonth",
    label: "This Month",
    icon: TrendingUp,
    bg: "bg-white",
    iconColor: "text-[#88BDF2]",
    textColor: "text-[#384959]",
    border: "border-[#BDDDFC]",
  },
];

export default function MeetingStatsCards({ stats = {}, loading = false }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {cards.map(
        ({ key, label, icon: Icon, bg, iconColor, textColor, border }) => (
          <div
            key={key}
            className={`rounded-xl border ${border} ${bg} p-4 flex flex-col gap-2 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${textColor} opacity-70`}>
                {label}
              </span>
              <Icon size={16} className={iconColor} />
            </div>
            {loading ? (
              <div className="h-7 w-12 bg-[#BDDDFC] rounded animate-pulse" />
            ) : (
              <span className={`text-xl font-bold ${textColor}`}>
                {stats[key] ?? 0}
              </span>
            )}
          </div>
        ),
      )}
    </div>
  );
}
