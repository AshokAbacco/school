// client/src/admin/pages/teachers/components/Pagination.jsx
import React from "react";

export default function Pagination({ meta, onPageChange }) {
  const { page, totalPages } = meta;
  const delta = 2;

  const pages = [];
  for (
    let i = Math.max(1, page - delta);
    i <= Math.min(totalPages, page + delta);
    i++
  ) {
    pages.push(i);
  }

  const btnBase = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    border: "1.5px solid #BDDDFC",
    borderRadius: 8,
    background: "#fff",
    color: "#384959",
    padding: "6px 14px",
    cursor: "pointer",
    transition: "all 0.15s",
  };

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap pb-2">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        style={{
          ...btnBase,
          opacity: page <= 1 ? 0.4 : 1,
          cursor: page <= 1 ? "default" : "pointer",
        }}
        onMouseEnter={(e) =>
          page > 1 && (e.target.style.background = "#BDDDFC")
        }
        onMouseLeave={(e) => (e.target.style.background = "#fff")}
      >
        ‹ Prev
      </button>

      {pages[0] > 1 && (
        <>
          <button
            style={btnBase}
            onClick={() => onPageChange(1)}
            onMouseEnter={(e) => (e.target.style.background = "#BDDDFC")}
            onMouseLeave={(e) => (e.target.style.background = "#fff")}
          >
            1
          </button>
          {pages[0] > 2 && (
            <span style={{ color: "#6A89A7", padding: "0 4px" }}>…</span>
          )}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          style={{
            ...btnBase,
            background: p === page ? "#384959" : "#fff",
            borderColor: p === page ? "#384959" : "#BDDDFC",
            color: p === page ? "#fff" : "#384959",
            fontWeight: p === page ? 700 : 500,
          }}
        >
          {p}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span style={{ color: "#6A89A7", padding: "0 4px" }}>…</span>
          )}
          <button
            style={btnBase}
            onClick={() => onPageChange(totalPages)}
            onMouseEnter={(e) => (e.target.style.background = "#BDDDFC")}
            onMouseLeave={(e) => (e.target.style.background = "#fff")}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        style={{
          ...btnBase,
          opacity: page >= totalPages ? 0.4 : 1,
          cursor: page >= totalPages ? "default" : "pointer",
        }}
        onMouseEnter={(e) =>
          page < totalPages && (e.target.style.background = "#BDDDFC")
        }
        onMouseLeave={(e) => (e.target.style.background = "#fff")}
      >
        Next ›
      </button>
    </div>
  );
}
