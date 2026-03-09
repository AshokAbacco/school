// client/src/admin/pages/teachers/components/Pagination.jsx
import React from "react";

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
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  const btnBase = {
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    border: "1.5px solid #C8DCF0",
    borderRadius: 10,
    background: "#EDF3FA",
    color: "#384959",
    padding: isMobile ? "10px 16px" : "7px 14px",
    minHeight: isMobile ? 44 : "auto",
    cursor: "pointer",
    transition: "all 0.15s",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", paddingBottom: 8 }}>
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        style={{ ...btnBase, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? "default" : "pointer" }}
        onMouseEnter={(e) => page > 1 && (e.currentTarget.style.background = "#BDDDFC")}
        onMouseLeave={(e) => e.currentTarget.style.background = "#EDF3FA"}
      >
        ‹ Prev
      </button>

      {pages[0] > 1 && (
        <>
          <button style={btnBase} onClick={() => onPageChange(1)}
            onMouseEnter={(e) => e.currentTarget.style.background = "#BDDDFC"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#EDF3FA"}>1</button>
          {pages[0] > 2 && <span style={{ color: "#6A89A7", padding: "0 4px", fontSize: 13 }}>…</span>}
        </>
      )}

      {pages.map((p) => (
        <button key={p} onClick={() => onPageChange(p)}
          style={{
            ...btnBase,
            background: p === page ? "linear-gradient(135deg, #6A89A7, #384959)" : "#EDF3FA",
            borderColor: p === page ? "#384959" : "#C8DCF0",
            color: p === page ? "#fff" : "#384959",
            fontWeight: p === page ? 700 : 600,
          }}>
          {p}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span style={{ color: "#6A89A7", padding: "0 4px", fontSize: 13 }}>…</span>}
          <button style={btnBase} onClick={() => onPageChange(totalPages)}
            onMouseEnter={(e) => e.currentTarget.style.background = "#BDDDFC"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#EDF3FA"}>{totalPages}</button>
        </>
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        style={{ ...btnBase, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? "default" : "pointer" }}
        onMouseEnter={(e) => page < totalPages && (e.currentTarget.style.background = "#BDDDFC")}
        onMouseLeave={(e) => e.currentTarget.style.background = "#EDF3FA"}
      >
        Next ›
      </button>
    </div>
  );
}