// admin/pages/students/components/StudentPagination.jsx

export default function StudentPagination({
  page,
  totalPages,
  total,
  showing,
  onPageChange,
}) {
  const pages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, i) => i + 1,
  );

  const BtnBase = ({ children, onClick, disabled, active }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: active ? "#384959" : "white",
        color: active ? "white" : "#6A89A7",
        border: `1px solid ${active ? "#384959" : "rgba(136,189,242,0.35)"}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active)
          e.currentTarget.style.background = "rgba(189,221,252,0.25)";
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = "white";
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4"
      style={{ borderTop: "1px solid rgba(136,189,242,0.20)" }}
    >
      <p className="text-sm" style={{ color: "#6A89A7" }}>
        Showing{" "}
        <span className="font-bold" style={{ color: "#384959" }}>
          {showing}
        </span>{" "}
        of{" "}
        <span className="font-bold" style={{ color: "#384959" }}>
          {total}
        </span>{" "}
        students
      </p>
      <div className="flex items-center gap-1.5">
        <BtnBase onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          ← Prev
        </BtnBase>
        {pages.map((p) => (
          <BtnBase key={p} onClick={() => onPageChange(p)} active={page === p}>
            {p}
          </BtnBase>
        ))}
        <BtnBase
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next →
        </BtnBase>
      </div>
    </div>
  );
}
