// components/StudentFormSidebar.jsx
// Mobile-first redesign: collapses to horizontal scrollable tab bar on mobile
import { useState } from "react";
import {
  User,
  GraduationCap,
  BookOpen,
  Phone,
  Activity,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
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
  const [previewOpen, setPreviewOpen] = useState(false);

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
    <>
      {/* ── MOBILE: horizontal tab bar at top ──────────────────────────────── */}
      <div
        className="flex md:hidden flex-col w-full border-b"
        style={{ borderColor: COLORS.border, background: COLORS.bgSoft }}
      >
        {/* Photo + name row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button
            onClick={onPhotoClick}
            className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow"
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
              <User
                size={18}
                className="text-white/80 absolute inset-0 m-auto"
              />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-bold truncate"
              style={{ color: COLORS.primary }}
            >
              {studentName || "New Student"}
            </p>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: sc.bg,
                  color: sc.text,
                  border: `1px solid ${sc.border}`,
                }}
              >
                {status || "ACTIVE"}
              </span>
              {cls && cls !== "—" && (
                <span
                  className="text-[10px]"
                  style={{ color: COLORS.secondary }}
                >
                  {cls}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            className="p-1.5 rounded-lg transition-all"
            style={{
              border: `1px solid ${COLORS.border}`,
              background: "white",
              color: COLORS.secondary,
            }}
          >
            {previewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Collapsible preview */}
        {previewOpen && (
          <div
            className="mx-4 mb-3 rounded-xl p-3 grid grid-cols-2 gap-x-4 gap-y-2"
            style={{
              background: "white",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {previewRows.map(({ l, v, I }) => (
              <div key={l} className="flex items-center gap-1.5 min-w-0">
                <I
                  size={10}
                  className="shrink-0"
                  style={{ color: COLORS.secondary }}
                />
                <div className="min-w-0">
                  <p
                    className="text-[9px] leading-none"
                    style={{ color: COLORS.secondary }}
                  >
                    {l}
                  </p>
                  <p
                    className="text-[11px] font-semibold truncate"
                    style={{ color: COLORS.primary }}
                  >
                    {v}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Horizontal scrollable tab bar */}
        <div className="flex gap-1 px-3 pb-3 overflow-x-auto scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon }) => {
            const hasErr = tabHasError?.(id);
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                style={{
                  background: isActive
                    ? hasErr
                      ? "#dc2626"
                      : COLORS.primary
                    : hasErr
                      ? "rgba(220,38,38,0.07)"
                      : "white",
                  color: isActive
                    ? "white"
                    : hasErr
                      ? "#dc2626"
                      : COLORS.secondary,
                  border: `1px solid ${isActive ? (hasErr ? "#dc2626" : COLORS.primary) : hasErr ? "rgba(220,38,38,0.20)" : COLORS.border}`,
                }}
              >
                <Icon size={12} />
                {label}
                {hasErr && !isActive && (
                  <span
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: "#dc2626" }}
                  >
                    !
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP: vertical sidebar ──────────────────────────────────────── */}
      <div
        className="hidden md:flex w-56 shrink-0 border-r flex-col gap-4 overflow-y-auto"
        style={{ borderColor: COLORS.border, background: COLORS.bgSoft }}
      >
        {/* Inner content with padding */}
        <div className="p-4 flex flex-col gap-4 h-full">
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
                  <span className="text-[9px] font-bold text-white">
                    Update
                  </span>
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
      </div>
    </>
  );
}
