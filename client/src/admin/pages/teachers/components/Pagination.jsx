// client/src/admin/pages/teachers/components/Pagination.jsx
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ meta, onPageChange }) {
  const { page, totalPages } = meta;
  const [isMobile, setIsMobile] = React.useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const h = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const delta = isMobile ? 1 : 2;
  const pages = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) pages.push(i);

  const font = { fontFamily: "'Inter', sans-serif" };

  const navBtn = (disabled, onClick, children, title) => (
    <button
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={{
        ...font,
        display: "flex", alignItems: "center", justifyContent: "center",
        width: isMobile ? 40 : 34, height: isMobile ? 40 : 34,
        borderRadius: 10,
        border: "1.5px solid #DDE9F5",
        background: disabled ? "#f8fbff" : "#fff",
        color: disabled ? "#C8DCF0" : "#384959",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.borderColor = "#88BDF2", e.currentTarget.style.background = "#EDF3FA")}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.borderColor = "#DDE9F5", e.currentTarget.style.background = "#fff")}
    >
      {children}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, paddingBottom: 8 }}>
      {navBtn(page <= 1, () => onPageChange(page - 1), <ChevronLeft size={15} />, "Previous")}

      {pages[0] > 1 && (
        <>
          <PageBtn p={1} current={page} isMobile={isMobile} onPageChange={onPageChange} />
          {pages[0] > 2 && <span style={{ color: "#C8DCF0", fontSize: 14, padding: "0 2px" }}>···</span>}
        </>
      )}

      {pages.map((p) => <PageBtn key={p} p={p} current={page} isMobile={isMobile} onPageChange={onPageChange} />)}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span style={{ color: "#C8DCF0", fontSize: 14, padding: "0 2px" }}>···</span>}
          <PageBtn p={totalPages} current={page} isMobile={isMobile} onPageChange={onPageChange} />
        </>
      )}

      {navBtn(page >= totalPages, () => onPageChange(page + 1), <ChevronRight size={15} />, "Next")}
    </div>
  );
}

function PageBtn({ p, current, isMobile, onPageChange }) {
  const active = p === current;
  return (
    <button
      onClick={() => onPageChange(p)}
      style={{
        fontFamily: "'Inter', sans-serif",
        width: isMobile ? 40 : 34, height: isMobile ? 40 : 34,
        borderRadius: 10, fontSize: 12, fontWeight: active ? 700 : 500,
        border: active ? "1.5px solid #384959" : "1.5px solid #DDE9F5",
        background: active ? "#384959" : "#fff",
        color: active ? "#fff" : "#384959",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.borderColor = "#88BDF2", e.currentTarget.style.background = "#EDF3FA")}
      onMouseLeave={(e) => !active && (e.currentTarget.style.borderColor = "#DDE9F5", e.currentTarget.style.background = "#fff")}
    >
      {p}
    </button>
  );
}