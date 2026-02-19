// components/StudentFormSidebar.jsx
// ✅ No logic changes needed — grade/cls are passed as display strings from parent
// Parent now passes selectedSection.grade and selectedSection.name instead of f.grade/f.cls
import {
  User,
  GraduationCap,
  BookOpen,
  Phone,
  Activity,
  BadgeCheck,
} from "lucide-react";
import { COLORS } from "./FormFields";

export default function StudentFormSidebar({
  tabs,
  activeTab,
  setTab,
  tabHasError,
  photoUrl,
  onPhotoClick,
  studentName,
  grade,
  cls,
  phone,
  gender,
  dob,
  blood,
  status,
}) {
  const previewRows = [
    { l: "Name", v: studentName || "—", I: User },
    { l: "Class", v: cls || "—", I: GraduationCap },
    { l: "Grade", v: grade || "—", I: BookOpen },
    { l: "Phone", v: phone || "—", I: Phone },
    { l: "Gender", v: gender || "—", I: User },
    { l: "DOB", v: dob || "—", I: BadgeCheck },
    { l: "Blood", v: blood || "—", I: Activity },
  ];

  const statusColors = {
    ACTIVE: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    INACTIVE: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
    SUSPENDED: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
    GRADUATED: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  };
  const sc = statusColors[status] || statusColors.ACTIVE;

  return (
    <div
      className="w-56 shrink-0 border-r p-4 flex flex-col gap-4 overflow-y-auto"
      style={{ borderColor: COLORS.border, background: `${COLORS.bgSoft}` }}
    >
      {/* Photo card */}
      <div
        className="bg-white rounded-xl p-4"
        style={{ border: `1px solid ${COLORS.border}` }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: COLORS.secondary }}
        >
          Profile Photo
        </p>
        <div className="flex flex-col items-center gap-2">
          <div
            className="relative w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center shadow-md"
            style={{
              background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.primary})`,
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={26} className="text-white/80" />
            )}
            <button
              onClick={onPhotoClick}
              className="absolute inset-0 bg-black/25 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <span className="text-[9px] font-bold text-white">Update</span>
            </button>
          </div>
          <button
            onClick={onPhotoClick}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
            style={{
              border: `1px solid ${COLORS.border}`,
              color: COLORS.secondary,
              background: "white",
            }}
          >
            → {photoUrl ? "Change" : "Upload Photo"}
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="space-y-0.5">
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
          style={{ color: COLORS.secondary }}
        >
          Sections
        </p>
        {tabs.map(({ id, label, icon: Icon }) => {
          const hasErr = tabHasError?.(id);
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: isActive
                  ? hasErr
                    ? "#dc2626"
                    : COLORS.primary
                  : hasErr
                    ? "rgba(220,38,38,0.07)"
                    : "transparent",
                color: isActive
                  ? "white"
                  : hasErr
                    ? "#dc2626"
                    : COLORS.secondary,
              }}
            >
              <Icon size={14} />
              <span className="flex-1 text-left">{label}</span>
              {hasErr && !isActive && (
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ background: "#dc2626" }}
                >
                  !
                </span>
              )}
              {hasErr && isActive && (
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    color: "white",
                  }}
                >
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Preview card */}
      <div
        className="bg-white rounded-xl p-4 flex-1"
        style={{ border: `1px solid ${COLORS.border}` }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: COLORS.secondary }}
        >
          Preview
        </p>
        <div className="space-y-2.5">
          {previewRows.map(({ l, v, I }) => (
            <div key={l} className="flex items-start gap-2">
              <I
                size={11}
                className="mt-0.5 shrink-0"
                style={{ color: COLORS.secondary }}
              />
              <div className="min-w-0">
                <p
                  className="text-[9px] leading-none mb-0.5"
                  style={{ color: COLORS.secondary }}
                >
                  {l}
                </p>
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: COLORS.primary }}
                >
                  {v}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status badge */}
      <div
        className="rounded-xl px-3 py-2 text-center text-xs font-bold"
        style={{
          background: sc.bg,
          color: sc.text,
          border: `1px solid ${sc.border}`,
        }}
      >
        {status || "ACTIVE"}
      </div>
    </div>
  );
}
