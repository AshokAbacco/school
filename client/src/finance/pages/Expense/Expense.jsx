import React, { useState, useEffect, useRef } from "react";
import {
  TrendingDown, PlusCircle, Receipt,
  Package, ChevronDown, ChevronUp, Pencil, Trash2,
  Download, X, Calendar, ChevronRight,
} from "lucide-react";
import AddExpense, { iconMap, fmt } from "./components/AddExpense";
import { downloadExpenseExcel } from "../../../utils/downloadExpenseExcel";

const API_URL = import.meta.env.VITE_API_URL;

// ── Date-filter download modal ────────────────────────────────────────────────
function DownloadModal({ onClose, onDownload }) {
  const [preset, setPreset]       = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");

  const presets = [
    { value: "today",     label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "thisWeek",  label: "This Week" },
    { value: "thisMonth", label: "This Month" },
    { value: "lastMonth", label: "Last Month" },
    { value: "custom",    label: "Custom Range" },
    { value: "all",       label: "All Time" },
  ];

  const handleDownload = () => {
    if (preset === "custom" && (!customFrom || !customTo)) {
      alert("Please select both start and end dates.");
      return;
    }
    if (preset === "custom" && new Date(customFrom) > new Date(customTo)) {
      alert("Start date cannot be after end date.");
      return;
    }
    onDownload({ preset, customFrom, customTo });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1c3040] to-[#2b4557] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.14] border border-white/[0.22] flex items-center justify-center">
              <Download size={15} color="#fff" />
            </div>
            <div>
              <p className="text-sm font-bold text-white m-0">Download Excel</p>
              <p className="text-[10px] text-white/55 m-0">Select date range</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.12] hover:bg-white/[0.22] flex items-center justify-center transition-colors"
          >
            <X size={14} color="#fff" />
          </button>
        </div>

        {/* Preset list */}
        <div className="p-4 space-y-1.5">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                preset === p.value
                  ? "bg-[#1c3040] text-white border-[#1c3040] shadow-sm"
                  : "bg-[#f5f9fc] text-[#2E3F50] border-[#e2edf4] hover:border-[#3c5d74]/40 hover:bg-[#eaf1f6]"
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar size={13} className={preset === p.value ? "opacity-80" : "opacity-40"} />
                {p.label}
              </span>
              {preset === p.value && <ChevronRight size={13} className="opacity-60" />}
            </button>
          ))}

          {/* Custom date inputs */}
          {preset === "custom" && (
            <div className="mt-3 p-3 bg-[#eaf1f6] rounded-xl space-y-2.5 border border-[#d0e1ed]">
              <div>
                <label className="text-[11px] font-bold text-[#3c5d74] uppercase tracking-wide block mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  max={customTo || undefined}
                  className="w-full px-3 py-2 rounded-lg border border-[#d0e1ed] bg-white text-sm text-[#1c3040] font-medium focus:outline-none focus:ring-2 focus:ring-[#3c5d74]/30"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#3c5d74] uppercase tracking-wide block mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  min={customFrom || undefined}
                  className="w-full px-3 py-2 rounded-lg border border-[#d0e1ed] bg-white text-sm text-[#1c3040] font-medium focus:outline-none focus:ring-2 focus:ring-[#3c5d74]/30"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#d0e1ed] text-[#5A7A90] text-sm font-bold hover:bg-[#f5f9fc] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-[#2b4557] to-[#1c3040] text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-md hover:opacity-90 transition-all"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single accordion row ──────────────────────────────────────────────────────
function ExpenseSection({ sec, totalExpenses, onEditItem, onDeleteItem, onEditCategory }) {
  const [open, setOpen] = useState(false);
  const pct = totalExpenses > 0 ? Math.round((sec.total / totalExpenses) * 100) : 0;
  const SIcon = iconMap[sec.icon] || Package;

  return (
    <div
      className="bg-white rounded-xl mb-3 overflow-hidden shadow-sm border-l-4"
      style={{ borderLeftColor: sec.color }}
    >
      {/* Row header */}
      <button
        className="w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-3.5 hover:bg-black/[0.02] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: sec.color + "22", color: sec.color }}
          >
            <SIcon size={14} />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-bold text-[#1c3040] m-0 truncate">
                {sec.label}
              </p>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                const newName = prompt("Edit category name", sec.label);
                if (!newName) return;
                onEditCategory(sec.key, newName);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  const newName = prompt("Edit category name", sec.label);
                  if (!newName) return;
                  onEditCategory(sec.key, newName);
                }
              }}
              className="text-blue-500 text-xs cursor-pointer"
            >
              Edit
            </span>
            </div>
            <div className="w-24 sm:w-36 h-1.5 bg-[#eaf1f6] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sec.color }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0 ml-2">
          <span className="text-xs sm:text-sm font-bold" style={{ color: sec.color }}>{fmt(sec.total)}</span>
          <span className="hidden xs:inline text-[10px] sm:text-[11px] font-bold text-[#5A7A90] bg-[#eaf1f6] px-1.5 sm:px-2 py-0.5 rounded-full">{pct}%</span>
          {open
            ? <ChevronUp size={14} color={sec.color} />
            : <ChevronDown size={14} color="#5A7A90" />}
        </div>
      </button>

      {/* Row body */}
      {open && (
        <div className="bg-[#f5f9fc] px-3 sm:px-4 pl-10 sm:pl-14 pt-1 pb-3 sm:pb-3.5 border-t border-[#eaf1f6]">
          {sec.items.map((item, i) => {
            const IIcon = iconMap[item.icon] || Package;
            const itemPct = sec.total > 0 ? Math.round((item.amount / sec.total) * 100) : 0;
            return (
              <div
                key={i}
                className="flex items-center justify-between py-2 sm:py-2.5 border-b border-[#eaf1f6] last:border-none group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sec.color }} />
                  <div
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: sec.color + "18", color: sec.color }}
                  >
                    <IIcon size={11} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[12px] sm:text-[13px] font-medium text-[#2E3F50] truncate block">{item.label}</span>
                    {item.createdAt && (
                      <span className="text-[10px] text-[#8aabbd]">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <div className="hidden sm:block w-20 h-1 bg-[#eaf1f6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full opacity-60" style={{ width: `${itemPct}%`, background: sec.color }} />
                  </div>
                  <span className="text-[12px] sm:text-[13px] font-bold text-[#1c3040] text-right">{fmt(item.amount)}</span>

                  {item.id && (
                    <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Edit expense"
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[#3c5d74]/10 text-[#3c5d74] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem({ id: item.id, label: item.label, amount: item.amount, icon: item.icon });
                        }}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        title="Delete expense"
                        className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div
            className="flex justify-between mt-2 sm:mt-2.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-[13px] font-bold"
            style={{ background: sec.color + "14", color: sec.color }}
          >
            <span>Section Total</span>
            <span>{fmt(sec.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Expense Page ─────────────────────────────────────────────────────────
export default function Expense() {
  const [expenseSections, setExpenseSections] = useState([]);
  const [salarySections,  setSalarySections]  = useState([]);
  const [showModal,       setShowModal]        = useState(false);
  const [showDownload,    setShowDownload]     = useState(false);
  const [editItem,        setEditItem]         = useState(null);
  const [loading,         setLoading]          = useState(true);

  const getToken = () => {
    try { return JSON.parse(localStorage.getItem("auth"))?.token; }
    catch { return null; }
  };

  const reloadExpenses = async (token) => {
    const t   = token || getToken();
    const res = await fetch(`${API_URL}/api/finance/list`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) setExpenseSections(data);
  };

  useEffect(() => {
    const load = async () => {
      try { await reloadExpenses(getToken()); }
      catch (e) { console.log("Expense fetch error:", e); }
      finally   { setLoading(false); }
    };
    load();
  }, []);

  // ── category edit ─────────────────────────────────────────────────────────
  const handleEditCategory = async (id, name) => {
    try {
      const token = getToken();
      if (!token) { alert("Please login again"); return; }

      const res = await fetch(`${API_URL}/api/finance/category/update/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ name }),
      });

      const data = await res.json();
      if (res.ok) await reloadExpenses(token);
      else alert(data.message || "Update failed");
    } catch (e) { console.log("Category edit error:", e); }
  };

  // ── download handler ──────────────────────────────────────────────────────
  const handleDownload = ({ preset, customFrom, customTo }) => {
    const schoolName =
      JSON.parse(localStorage.getItem("auth") || "{}")?.user?.schoolName || "School";

    downloadExpenseExcel(mergedSections, { preset, customFrom, customTo, schoolName });
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const mergedSections =
    salarySections.length > 0
      ? [...expenseSections.filter((s) => s.key !== "salaries"), ...salarySections]
      : expenseSections;

  const totalExpenses = mergedSections.reduce((s, e) => s + e.total, 0);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleAddExpense = async ({ isNewSection, sectionKey, newSectionLabel, label, amount, icon }) => {
    try {
      const token = getToken();
      if (!token) { alert("Please login again"); return; }

      const res = await fetch(`${API_URL}/api/finance/add`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ isNewSection, sectionKey, newSectionLabel, label, amount, icon }),
      });

      const data = await res.json();
      if (data.success) await reloadExpenses(token);
    } catch (e) { console.log("Add expense error:", e); }
  };

  const handleEditExpense = async ({ id, label, amount, icon }) => {
    try {
      const token = getToken();
      if (!token) { alert("Please login again"); return; }

      const res = await fetch(`${API_URL}/api/finance/update/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ label, amount, icon }),
      });

      if (res.ok) await reloadExpenses(token);
    } catch (e) { console.log("Edit expense error:", e); }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      const token = getToken();
      const res   = await fetch(`${API_URL}/api/finance/delete/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) await reloadExpenses(token);
      else alert(data.message || "Delete failed");
    } catch (e) { console.log("Delete expense error:", e); }
  };

  const openEditModal = (item) => { setEditItem(item); setShowModal(true); };
  const closeModal    = ()     => { setShowModal(false); setEditItem(null); };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#d8e8f0] via-[#c8dce9] to-[#b8cfe0]">

      {/* ── Page Header ── */}
      <div className="bg-gradient-to-br from-[#1c3040] to-[#2b4557] px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.14] border border-white/[0.22] flex items-center justify-center flex-shrink-0">
            <TrendingDown size={17} color="#fff" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white m-0">Expense Details</h1>
            <p className="text-[11px] sm:text-[12px] text-white/55 m-0">All categories · Click any row to expand</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* ── Download button ── */}
          <button
            onClick={() => setShowDownload(true)}
            className="flex items-center gap-2 bg-green-600/90 hover:bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-sm"
          >
            <Download size={14} />
            <span>Download Excel</span>
          </button>

          {totalExpenses > 0 && (
            <div className="text-right">
              <p className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-widest m-0">Total Expenses</p>
              <p className="text-base sm:text-lg font-bold text-white m-0">{fmt(totalExpenses)}</p>
            </div>
          )}

          <button
            className="flex items-center gap-1.5 sm:gap-2 bg-white/[0.14] border border-white/[0.22] text-white rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13.5px] font-bold hover:bg-white/[0.22] transition-all whitespace-nowrap"
            onClick={() => { setEditItem(null); setShowModal(true); }}
          >
            <PlusCircle size={14} /> Add Expense
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-3 sm:p-6 max-w-5xl mx-auto">

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-[#5A7A90]">
            <div className="w-8 h-8 border-[3px] border-[#3c5d74]/30 border-t-[#3c5d74] rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">Loading expenses…</p>
          </div>
        )}

        {!loading && mergedSections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#5A7A90]">
            <Receipt size={44} className="mb-4 opacity-30" />
            <p className="text-base font-semibold mb-1">No expenses recorded yet</p>
            <p className="text-sm opacity-70 mb-5 text-center px-4">Start by adding your first expense category.</p>
            <button
              className="flex items-center gap-2 bg-gradient-to-br from-[#2b4557] to-[#1c3040] text-white rounded-xl px-5 py-2.5 text-sm font-bold shadow-md hover:-translate-y-0.5 transition-all"
              onClick={() => { setEditItem(null); setShowModal(true); }}
            >
              <PlusCircle size={15} /> Add First Expense
            </button>
          </div>
        )}

        {!loading && mergedSections.length > 0 && (
          <>
            {mergedSections.map((sec) => (
              <ExpenseSection
                key={sec.key}
                sec={sec}
                totalExpenses={totalExpenses}
                onEditItem={openEditModal}
                onDeleteItem={handleDeleteExpense}
                onEditCategory={handleEditCategory}
              />
            ))}

            {/* Summary footer card */}
            <div className="mt-4 sm:mt-5 p-4 sm:p-5 bg-white/80 rounded-2xl shadow-md border border-[#3c5d74]/[0.12]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#3c5d74] uppercase tracking-[.7px] m-0">Grand Total — All Expenses</p>
                  <p className="text-[22px] sm:text-[26px] font-bold text-[#1c3040] m-0 mt-0.5">{fmt(totalExpenses)}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {mergedSections.map((s) => (
                    <div key={s.key} className="text-center px-2">
                      <div className="w-2 h-2 rounded-full mx-auto mb-0.5" style={{ background: s.color }} />
                      <p className="text-[10px] text-[#5A7A90] font-semibold m-0 leading-tight max-w-[64px] truncate">{s.label.split(" ")[0]}</p>
                      <p className="text-[11px] font-bold m-0" style={{ color: s.color }}>{fmt(s.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full h-2.5 rounded-full overflow-hidden flex">
                {mergedSections.map((s) => {
                  const w = totalExpenses > 0 ? Math.round((s.total / totalExpenses) * 100) : 0;
                  return (
                    <div
                      key={s.key}
                      title={`${s.label}: ${fmt(s.total)} (${w}%)`}
                      className="h-full transition-all first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${w}%`, background: s.color }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-[10px] text-[#5A7A90] font-semibold m-0">0%</p>
                <p className="text-[10px] text-[#5A7A90] font-semibold m-0">100%</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Download date-range modal ── */}
      {showDownload && (
        <DownloadModal
          onClose={() => setShowDownload(false)}
          onDownload={handleDownload}
        />
      )}

      {/* ── Add / Edit expense modal ── */}
      {showModal && (
        <AddExpense
          expenseSections={mergedSections}
          onClose={closeModal}
          onAdd={handleAddExpense}
          onEdit={handleEditExpense}
          editItem={editItem}
        />
      )}
    </div>
  );
}