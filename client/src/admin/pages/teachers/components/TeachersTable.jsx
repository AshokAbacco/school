// client/src/admin/pages/teachers/components/TeachersTable.jsx
import React, { memo, useRef, useState, useLayoutEffect, useCallback, useEffect } from "react";
import { Users } from "lucide-react";
import Pagination from "./Pagination";

const STATUS = {
  ACTIVE:     { dot: "#22c55e", label: "Active",     color: "#166534", bg: "#dcfce7" },
  ON_LEAVE:   { dot: "#f59e0b", label: "On Leave",   color: "#92400e", bg: "#fef3c7" },
  RESIGNED:   { dot: "#6b7280", label: "Resigned",   color: "#6b7280", bg: "#f3f4f6" },
  TERMINATED: { dot: "#ef4444", label: "Terminated", color: "#991b1b", bg: "#fee2e2" },
};

const EMP_TYPE = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT:  "Contract",
  TEMPORARY: "Temporary",
};

const initials = (f, l) => `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();
const font = { fontFamily: "Inter, sans-serif" };

// ── useBreakpoint ─────────────────────────────────────────────
// Returns: "mobile" | "tablet" | "desktop"
function useBreakpoint() {
  const get = () => {
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1100) return "tablet";
    return "desktop";
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const h = () => setBp(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

// Col widths: tablet hides Dept/Desig detail, desktop shows all
// [Teacher, Dept/Desig, Status, Type, Exp, Assignments, Arrow]
const COL_WIDTHS_DESKTOP = [200, 185, 110, 90, 58, null, 36];
const COL_WIDTHS_TABLET  = [180, 160, 105, 85, 52, 80,   32];

// ── Canvas text measurer ──────────────────────────────────────
let _canvas = null;
function measureText(text, fontSize = 10, fontWeight = 600) {
  if (!_canvas) _canvas = document.createElement("canvas");
  const ctx = _canvas.getContext("2d");
  ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
  return ctx.measureText(text).width;
}

const TAG_PAD_H  = 18;
const TAG_GAP    = 4;
const COUNT_PILL = 38;

// ── AssignmentCountBadge — always-visible count pill ─────────
function AssignmentCountBadge({ total }) {
  if (!total) return <span style={{ fontSize: 11, color: "#6A89A7", ...font }}>—</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{
        fontSize: 11, fontWeight: 700,
        padding: "4px 10px", borderRadius: 20,
        background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
        color: "#fff", whiteSpace: "nowrap", ...font,
        boxShadow: "0 1px 4px rgba(136,189,242,0.35)",
      }}>
        {total} class{total !== 1 ? "es" : ""}
      </span>
    </div>
  );
}

// ── AssignmentTags (fluid, measures container) — desktop only ─
function AssignmentTags({ assignments }) {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(assignments.length);

  const compute = useCallback(() => {
    const el = containerRef.current;
    if (!el || !assignments.length) return;
    const budget = el.offsetWidth - COUNT_PILL - TAG_GAP;
    if (budget <= 0) { setVisible(0); return; }
    let used = 0, fits = 0;
    for (let i = 0; i < assignments.length; i++) {
      const label = `${assignments[i].subject?.name ?? ""} · ${assignments[i].classSection?.name ?? ""}`;
      const tagW  = measureText(label, 10, 600) + TAG_PAD_H;
      const space = fits === 0 ? tagW : TAG_GAP + tagW;
      if (used + space > budget) break;
      used += space; fits++;
    }
    setVisible(Math.max(0, fits));
  }, [assignments]);

  useLayoutEffect(() => {
    compute();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compute]);

  const total  = assignments.length;
  const hidden = total - visible;
  const shown  = assignments.slice(0, visible);

  if (!total) return <span style={{ fontSize: 11, color: "#6A89A7", ...font }}>—</span>;

  return (
    <div ref={containerRef} style={{ display: "flex", alignItems: "center", gap: TAG_GAP, width: "100%", overflow: "hidden", minWidth: 0 }}>
      {shown.map((a, i) => (
        <span key={i} style={{
          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, flexShrink: 0,
          background: "rgba(189,221,252,0.55)", color: "#384959", border: "1px solid #C8DCF0",
          whiteSpace: "nowrap", ...font,
        }}>
          {a.subject?.name} · {a.classSection?.name}
        </span>
      ))}
      <span title={`${total} assignment${total !== 1 ? "s" : ""} total`} style={{
        fontSize: 10, fontWeight: 700, flexShrink: 0,
        padding: "3px 8px", borderRadius: 20,
        minWidth: COUNT_PILL - 6, textAlign: "center",
        background: hidden > 0 ? "linear-gradient(135deg, #88BDF2, #6A89A7)" : "#EDF3FA",
        color:  hidden > 0 ? "#fff" : "#6A89A7",
        border: hidden > 0 ? "none" : "1px solid #DDE9F5",
        ...font,
      }}>
        {hidden > 0 ? `+${hidden}` : total}
      </span>
    </div>
  );
}

// ── AssignmentTagsWrapped (mobile — wraps freely) ─────────────
function AssignmentTagsWrapped({ assignments }) {
  const total = assignments.length;
  if (!total) return <span style={{ fontSize: 11, color: "#6A89A7", ...font }}>No assignments</span>;
  const show = assignments.slice(0, 4);
  const rest = total - show.length;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {show.map((a, i) => (
        <span key={i} style={{
          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
          background: "rgba(189,221,252,0.55)", color: "#384959",
          border: "1px solid #C8DCF0", whiteSpace: "nowrap", ...font,
        }}>
          {a.subject?.name} · {a.classSection?.name}
        </span>
      ))}
      {rest > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
          background: "linear-gradient(135deg, #88BDF2, #6A89A7)", color: "#fff", ...font,
        }}>+{rest}</span>
      )}
    </div>
  );
}

// ── Avatar bubble ─────────────────────────────────────────────
function Avatar({ teacher, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.33, overflow: "hidden",
      border: "2px solid #EDF3FA",
    }}>
      {teacher.profileImage
        ? <img src={teacher.profileImage} alt={teacher.firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        : initials(teacher.firstName, teacher.lastName)
      }
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status, compact }) {
  const st = STATUS[status] ?? STATUS.ACTIVE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: compact ? 4 : 5,
      fontSize: compact ? 10 : 11, fontWeight: 700,
      padding: compact ? "2px 7px" : "3px 10px", borderRadius: 20,
      color: st.color, background: st.bg, whiteSpace: "nowrap", ...font,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, flexShrink: 0, display: "inline-block" }} />
      {st.label}
    </span>
  );
}

// ── Mobile card ───────────────────────────────────────────────
function MobileCard({ teacher, onSelect, isEven }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onClick={() => onSelect(teacher.id)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: "14px 16px",
        background: pressed ? "#EDF3FA" : isEven ? "#f8fbff" : "#ffffff",
        borderBottom: "1px solid #EDF3FA",
        cursor: "pointer", transition: "background 0.1s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Row 1: avatar + name + status + arrow */}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar teacher={teacher} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#243340", ...font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teacher.firstName} {teacher.lastName}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6A89A7", ...font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teacher.department} · {teacher.designation}
          </p>
        </div>
        <StatusBadge status={teacher.status} />
        <span style={{ color: "#C8DCF0", fontSize: 18, flexShrink: 0 }}>›</span>
      </div>

      {/* Row 2: meta chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingLeft: 51 }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#EDF3FA", color: "#384959", border: "1px solid #DDE9F5", ...font }}>
          {teacher.employeeCode}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#EDF3FA", color: "#384959", border: "1px solid #DDE9F5", ...font }}>
          {EMP_TYPE[teacher.employmentType] ?? teacher.employmentType ?? "—"}
        </span>
        {teacher.experienceYears != null && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(136,189,242,0.15)", color: "#384959", border: "1px solid #C8DCF0", ...font }}>
            {teacher.experienceYears}y exp
          </span>
        )}
      </div>

      {/* Row 3: assignments */}
      {teacher.assignments?.length > 0 && (
        <div style={{ paddingLeft: 51 }}>
          <AssignmentTagsWrapped assignments={teacher.assignments} />
        </div>
      )}
    </div>
  );
}

// ── Mobile skeleton card ──────────────────────────────────────
function MobileSkeletonCard() {
  const Pulse = ({ w = "100%", h = 11 }) => (
    <div className="animate-pulse" style={{ width: w, height: h, borderRadius: 6, background: "rgba(189,221,252,0.55)" }} />
  );
  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid #EDF3FA", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div className="animate-pulse" style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(189,221,252,0.55)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Pulse w="55%" /><Pulse w="40%" h={9} />
        </div>
        <Pulse w={60} h={22} />
      </div>
      <div style={{ paddingLeft: 51, display: "flex", gap: 6 }}>
        <Pulse w={60} h={20} /><Pulse w={70} h={20} /><Pulse w={50} h={20} />
      </div>
      <div style={{ paddingLeft: 51, display: "flex", gap: 6 }}>
        <Pulse w="45%" h={20} /><Pulse w="35%" h={20} />
      </div>
    </div>
  );
}

// ── Desktop skeleton row ──────────────────────────────────────
function SkeletonRow() {
  const Pulse = ({ w = "80%" }) => (
    <div className="animate-pulse" style={{ width: w, height: 11, borderRadius: 6, background: "rgba(189,221,252,0.55)" }} />
  );
  return (
    <tr style={{ borderBottom: "1px solid #EDF3FA" }}>
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="animate-pulse" style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(189,221,252,0.55)", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <Pulse w="65%" /><Pulse w="45%" />
          </div>
        </div>
      </td>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} style={{ padding: "14px 16px" }}><Pulse w={i === 5 ? "50%" : "70%"} /></td>
      ))}
    </tr>
  );
}

// ── Desktop teacher row ───────────────────────────────────────
function TeacherRow({ teacher, onSelect, isEven, bp }) {
  const st = STATUS[teacher.status] ?? STATUS.ACTIVE;
  const isTablet = bp === "tablet";
  return (
    <tr
      onClick={() => onSelect(teacher.id)}
      style={{ cursor: "pointer", background: isEven ? "#f8fbff" : "#ffffff", transition: "background 0.12s", borderBottom: "1px solid #EDF3FA" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#EDF3FA"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isEven ? "#f8fbff" : "#ffffff"; }}
    >
      <td style={{ padding: isTablet ? "12px 10px" : "13px 16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar teacher={teacher} size={isTablet ? 30 : 36} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: isTablet ? 12 : 13, fontWeight: 700, color: "#243340", ...font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teacher.firstName} {teacher.lastName}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#88BDF2", fontWeight: 600, ...font }}>
              {teacher.employeeCode}
            </p>
          </div>
        </div>
      </td>
      <td style={{ padding: isTablet ? "12px 10px" : "13px 16px", overflow: "hidden" }}>
        <p style={{ margin: 0, fontSize: isTablet ? 11 : 12, fontWeight: 600, color: "#243340", ...font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.department}</p>
        <p style={{ margin: "2px 0 0", fontSize: 10, color: "#6A89A7", ...font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.designation}</p>
      </td>
      <td style={{ padding: isTablet ? "12px 8px" : "13px 16px" }}>
        <StatusBadge status={teacher.status} compact={isTablet} />
      </td>
      <td style={{ padding: isTablet ? "12px 8px" : "13px 16px" }}>
        <span style={{ fontSize: isTablet ? 10 : 11, fontWeight: 600, color: "#384959", whiteSpace: "nowrap", ...font }}>
          {EMP_TYPE[teacher.employmentType] ?? teacher.employmentType ?? "—"}
        </span>
      </td>
      <td style={{ padding: isTablet ? "12px 8px" : "13px 16px", textAlign: "center" }}>
        <span style={{ fontSize: isTablet ? 11 : 12, fontWeight: 700, color: "#243340", whiteSpace: "nowrap", ...font }}>
          {teacher.experienceYears != null ? `${teacher.experienceYears}y` : "—"}
        </span>
      </td>
      {/* Assignments — always visible: tags on desktop, count badge on tablet */}
      <td style={{ padding: isTablet ? "12px 8px" : "13px 16px" }}>
        {isTablet
          ? <AssignmentCountBadge total={teacher.assignments?.length ?? 0} />
          : <AssignmentTags assignments={teacher.assignments ?? []} />
        }
      </td>
      <td style={{ padding: isTablet ? "12px 6px" : "13px 16px", textAlign: "center" }}>
        <span style={{ color: "#C8DCF0", fontSize: 18, lineHeight: 1 }}>›</span>
      </td>
    </tr>
  );
}

// ── Column header ─────────────────────────────────────────────
function ColHeader({ label, style }) {
  return (
    <th style={{
      padding: "11px 16px", textAlign: "left",
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
      color: "#6A89A7", background: "#EDF3FA", borderBottom: "1.5px solid #DDE9F5",
      whiteSpace: "nowrap", ...font, ...style,
    }}>
      {label}
    </th>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 0", gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(136,189,242,0.18)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(136,189,242,0.30)" }}>
        <Users size={24} color="#88BDF2" strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#384959", margin: 0, ...font }}>No teachers match your filters</p>
      <p style={{ fontSize: 11, color: "#6A89A7", margin: 0, ...font }}>Try adjusting your search or filter criteria</p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
const TeachersTable = memo(function TeachersTable({ teachers, loading, error, meta, onSelect, onPageChange }) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const colWidths = isTablet ? COL_WIDTHS_TABLET : COL_WIDTHS_DESKTOP;

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
        <p style={{ fontSize: 13, color: "#b91c1c", ...font }}>⚠ {error}</p>
      </div>
    );
  }

  return (
    <div
      className="fade-up"
      style={{ animationDelay: "80ms", display: "flex", flexDirection: "column", gap: 16, paddingLeft: isMobile ? 12 : 32, paddingRight: isMobile ? 12 : 32 }}
    >
      <div style={{
        borderRadius: isMobile ? 14 : 18, overflow: "hidden",
        border: "1.5px solid #DDE9F5",
        boxShadow: "0 2px 16px rgba(56,73,89,0.06)",
        background: "#fff",
      }}>

        {/* ── MOBILE: card list ── */}
        {isMobile && (
          <div>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <MobileSkeletonCard key={i} />)
              : teachers.map((t, i) => (
                  <MobileCard key={t.id} teacher={t} onSelect={onSelect} isEven={i % 2 === 0} />
                ))
            }
            {!loading && teachers.length === 0 && <EmptyState />}
          </div>
        )}

        {/* ── TABLET + DESKTOP: table ── */}
        {!isMobile && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                {colWidths.map((w, i) => (
                  <col key={i} style={w ? { width: w } : undefined} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <ColHeader label="Teacher" />
                  <ColHeader label="Department / Designation" />
                  <ColHeader label="Status" />
                  <ColHeader label="Type" />
                  <ColHeader label="Exp." style={{ textAlign: "center" }} />
                  <ColHeader label="Assignments" style={{ textAlign: isTablet ? "center" : "left" }} />
                  <ColHeader label="" />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                  : teachers.map((t, i) => (
                      <TeacherRow key={t.id} teacher={t} onSelect={onSelect} isEven={i % 2 === 0} bp={bp} />
                    ))
                }
              </tbody>
            </table>
            {!loading && teachers.length === 0 && <EmptyState />}
          </div>
        )}
      </div>

      {!loading && meta && meta.totalPages > 1 && (
        <Pagination meta={meta} onPageChange={onPageChange} />
      )}
    </div>
  );
});

export default TeachersTable;