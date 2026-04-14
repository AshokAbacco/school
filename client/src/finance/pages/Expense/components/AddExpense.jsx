import React, { useState, useEffect } from "react";
import {
  TrendingDown, BarChart3, X, Plus, Check, Pencil,
  GraduationCap, Bus, BookOpen, Users, Building2,
  Wrench, Package, Zap, Droplets, Utensils, Monitor,
  ChevronDown, ChevronUp, FileText, Layers,
} from "lucide-react";

// ── Shared utils ──────────────────────────────────────────────────────────────
export const iconMap = {
  Wrench, Package, Zap, Droplets, Monitor, FileText,
  Users, BookOpen, Building2, Layers, Utensils, GraduationCap, Bus,
};

export const iconOptions = [
  { key: "Wrench", icon: Wrench },
  { key: "Package", icon: Package },
  { key: "Zap", icon: Zap },
  { key: "Droplets", icon: Droplets },
  { key: "Monitor", icon: Monitor },
  { key: "FileText", icon: FileText },
  { key: "Users", icon: Users },
  { key: "BookOpen", icon: BookOpen },
  { key: "Building2", icon: Building2 },
  { key: "Layers", icon: Layers },
  { key: "Utensils", icon: Utensils },
  { key: "GraduationCap", icon: GraduationCap },
];

export const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

// ── AddExpense Modal ──────────────────────────────────────────────────────────
// Props:
//   expenseSections  – full list of sections
//   onClose          – close modal
//   onAdd            – called when adding a new expense
//   onEdit           – called when updating an existing expense
//   editItem         – { id, label, amount, icon } — when set, opens in edit mode
export default function AddExpense({ expenseSections = [], onClose, onAdd, onEdit, editItem = null }) {
  const isEditMode = !!editItem;

  const [tab, setTab] = useState(isEditMode ? "add" : "view");
  const [selectedSection, setSelectedSection] = useState(expenseSections[0]?.key || "");
  const [customLabel, setCustomLabel] = useState(isEditMode ? editItem.label : "");
  const [customAmount, setCustomAmount] = useState(isEditMode ? String(editItem.amount) : "");
  const [customNewSection, setCustomNewSection] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(isEditMode ? (editItem.icon || "Package") : "Package");
  const [success, setSuccess] = useState(false);
  const [expandedSec, setExpandedSec] = useState(null);

  // Sync if editItem changes externally
  useEffect(() => {
    if (editItem) {
      setTab("add");
      setCustomLabel(editItem.label || "");
      setCustomAmount(String(editItem.amount || ""));
      setSelectedIcon(editItem.icon || "Package");
      setSuccess(false);
    }
  }, [editItem]);

  const totalExpenses = expenseSections.reduce((s, e) => s + e.total, 0);

  const canSubmit =
    customLabel.trim() &&
    customAmount &&
    (!customNewSection || newSectionLabel.trim());

  const handleSubmit = () => {
    const amount = parseInt(customAmount.replace(/,/g, ""), 10);
    if (!customLabel.trim() || isNaN(amount) || amount <= 0) return;

    if (isEditMode) {
      onEdit({
        id: editItem.id,
        label: customLabel.trim(),
        amount,
        icon: selectedIcon,
      });
    } else {
      if (customNewSection && !newSectionLabel.trim()) return;
      onAdd({
        isNewSection: customNewSection,
        sectionKey: customNewSection ? null : selectedSection,
        newSectionLabel: newSectionLabel.trim(),
        label: customLabel.trim(),
        amount,
        icon: selectedIcon,
      });
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      if (!isEditMode) {
        setCustomLabel("");
        setCustomAmount("");
        setCustomNewSection(false);
        setNewSectionLabel("");
        setTab("view");
      } else {
        onClose();
      }
    }, 1400);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-[#142332]/60 backdrop-blur-md z-[1000] flex items-center justify-center p-3 sm:p-5"
        style={{ animation: "aeModalFadeIn .2s ease" }}
        onClick={onClose}
      >
        {/* Box */}
        <div
          className="bg-white rounded-2xl w-full max-w-[580px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
          style={{ animation: "aeModalSlideUp .25s ease" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="bg-gradient-to-br from-[#1c3040] to-[#2b4557] px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/[0.14] border border-white/[0.22] flex items-center justify-center flex-shrink-0">
                {isEditMode ? <Pencil size={16} color="#fff" /> : <TrendingDown size={16} color="#fff" />}
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-white m-0">
                  {isEditMode ? "Edit Expense" : "Expense Manager"}
                </p>
                <p className="text-[10px] sm:text-[11.5px] text-white/55 m-0 hidden xs:block">
                  {isEditMode ? `Editing: ${editItem.label}` : "View all expenses or add a new one"}
                </p>
              </div>
            </div>
            <button
              className="w-8 h-8 rounded-lg bg-white/[0.12] border border-white/20 text-white/75 flex items-center justify-center hover:bg-white/[0.22] hover:text-white transition-colors"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Tabs (hidden in edit mode) ── */}
          {!isEditMode && (
            <div className="flex bg-[#f5f9fc] border-b border-[#e4eff6] flex-shrink-0">
              {[
                { key: "view", label: "All Expenses", Icon: BarChart3 },
                { key: "add", label: "Add New Expense", Icon: Plus },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-[12px] sm:text-[13px] font-semibold border-b-[2.5px] transition-all
                    ${tab === key
                      ? "text-[#2b4557] border-[#2b4557] bg-[#2b4557]/[0.04]"
                      : "text-[#5A7A90] border-transparent hover:text-[#3c5d74] hover:bg-[#3c5d74]/[0.04]"
                    }`}
                  onClick={() => setTab(key)}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Body ── */}
          <div className="overflow-y-auto p-4 sm:p-5 flex-1">

            {/* ── VIEW TAB ── */}
            {tab === "view" && !isEditMode && (
              <div>
                <div className="bg-gradient-to-br from-[#2b4557] to-[#1c3040] rounded-xl px-4 py-3 sm:py-3.5 flex justify-between items-center mb-4">
                  <span className="text-[11px] sm:text-[12px] text-white/60 font-bold uppercase tracking-wider">Total Expenses</span>
                  <span className="text-lg sm:text-xl text-white font-bold">{fmt(totalExpenses)}</span>
                </div>

                {expenseSections.length === 0 && (
                  <p className="text-center text-sm text-[#5A7A90] py-8">No expense data available.</p>
                )}

                {expenseSections.map((sec) => {
                  const SIcon = iconMap[sec.icon] || Package;
                  const pct = totalExpenses > 0 ? Math.round((sec.total / totalExpenses) * 100) : 0;
                  return (
                    <div key={sec.key} className="bg-[#f8fafc] rounded-xl mb-2.5 overflow-hidden border border-[#e4eff6]">
                      <button
                        className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-[#3c5d74]/[0.04] transition-colors"
                        onClick={() => setExpandedSec(expandedSec === sec.key ? null : sec.key)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: sec.color + "20", color: sec.color }}
                          >
                            <SIcon size={13} />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-[12px] sm:text-[13px] font-bold text-[#1c3040] m-0 truncate">{sec.label}</p>
                            <div className="w-20 sm:w-28 h-1 bg-[#eaf1f6] rounded-full overflow-hidden mt-1">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sec.color }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className="text-[12px] sm:text-[13px] font-bold" style={{ color: sec.color }}>{fmt(sec.total)}</span>
                          {expandedSec === sec.key
                            ? <ChevronUp size={13} color={sec.color} />
                            : <ChevronDown size={13} color="#5A7A90" />}
                        </div>
                      </button>

                      {expandedSec === sec.key && (
                        <div className="px-3 sm:px-4 pb-3 border-t border-[#eaf1f6]">
                          {sec.items.map((item, i) => {
                            const IIcon = iconMap[item.icon] || Package;
                            const iPct = sec.total > 0 ? Math.round((item.amount / sec.total) * 100) : 0;
                            return (
                              <div key={i} className="flex items-center justify-between py-2 border-b border-[#eaf1f6] last:border-none">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: sec.color + "18", color: sec.color }}
                                  >
                                    <IIcon size={11} />
                                  </div>
                                  <span className="text-[12px] sm:text-[13px] font-medium text-[#2E3F50] truncate">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <div className="hidden sm:block w-14 h-1 bg-[#eaf1f6] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full opacity-60" style={{ width: `${iPct}%`, background: sec.color }} />
                                  </div>
                                  <span className="text-[12px] sm:text-[12.5px] font-bold text-[#1c3040] text-right">{fmt(item.amount)}</span>
                                </div>
                              </div>
                            );
                          })}
                          <div
                            className="flex justify-between px-2.5 sm:px-3 py-2 mt-1.5 rounded-lg text-[12px] sm:text-[12.5px] font-bold"
                            style={{ background: sec.color + "14", color: sec.color }}
                          >
                            <span>Section Total</span>
                            <span>{fmt(sec.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── ADD / EDIT TAB ── */}
            {tab === "add" && (
              <div className="flex flex-col gap-4">
                {success ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-14">
                    <div
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3c5d74] to-[#2b4557] flex items-center justify-center shadow-lg"
                      style={{ animation: "aePopIn .3s ease" }}
                    >
                      <Check size={28} color="#fff" />
                    </div>
                    <p className="text-base font-bold text-[#1c3040]">
                      {isEditMode ? "Expense Updated Successfully!" : "Expense Added Successfully!"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Category toggle — only show when adding */}
                    {!isEditMode && (
                      <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3.5">
                        <span className="text-[11px] font-bold text-[#5A7A90] uppercase tracking-[.7px]">Add to</span>
                        <div className="flex bg-[#eaf1f6] rounded-xl p-1 gap-1 w-fit">
                          {[
                            { label: "Existing Category", val: false },
                            { label: "New Category", val: true },
                          ].map(({ label, val }) => (
                            <button
                              key={label}
                              className={`rounded-lg px-2.5 sm:px-3.5 py-1.5 text-[11.5px] sm:text-[12.5px] font-semibold transition-all whitespace-nowrap
                                ${customNewSection === val
                                  ? "bg-white text-[#2b4557] shadow-sm"
                                  : "text-[#5A7A90] hover:text-[#2b4557]"
                                }`}
                              onClick={() => setCustomNewSection(val)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isEditMode && !customNewSection && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-[#5A7A90] uppercase tracking-[.7px]">Select Category</label>
                        <select
                          className="border-[1.5px] border-[#d4e4ee] rounded-xl px-3 sm:px-3.5 py-2.5 text-sm text-[#1c3040] outline-none bg-white focus:border-[#3c5d74] cursor-pointer w-full"
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                        >
                          {expenseSections.map((s) => (
                            <option key={s.key} value={s.key}>{s.label} — {fmt(s.total)}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isEditMode && customNewSection && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-[#5A7A90] uppercase tracking-[.7px]">New Category Name</label>
                        <input
                          className="border-[1.5px] border-[#d4e4ee] rounded-xl px-3 sm:px-3.5 py-2.5 text-sm text-[#1c3040] outline-none bg-white focus:border-[#3c5d74] w-full"
                          placeholder="e.g. Events & Activities"
                          value={newSectionLabel}
                          onChange={(e) => setNewSectionLabel(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[#5A7A90] uppercase tracking-[.7px]">Expense Description</label>
                      <input
                        className="border-[1.5px] border-[#d4e4ee] rounded-xl px-3 sm:px-3.5 py-2.5 text-sm text-[#1c3040] outline-none bg-white focus:border-[#3c5d74] w-full"
                        placeholder="e.g. Annual Day Decorations"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[#5A7A90] uppercase tracking-[.7px]">Amount (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-bold text-[#5A7A90] pointer-events-none">₹</span>
                        <input
                          className="border-[1.5px] border-[#d4e4ee] rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-[#1c3040] outline-none bg-white focus:border-[#3c5d74] w-full"
                          placeholder="0"
                          value={customAmount}
                          type="number"
                          min="1"
                          onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[#5A7A90] uppercase tracking-[.7px]">Icon</label>
                      <div className="flex flex-wrap gap-2">
                        {iconOptions.map(({ key, icon: Icon }) => (
                          <button
                            key={key}
                            title={key}
                            className={`w-9 h-9 rounded-xl border-[1.5px] flex items-center justify-center transition-all
                              ${selectedIcon === key
                                ? "border-[#2b4557] bg-[#2b4557] text-white"
                                : "border-[#d4e4ee] bg-[#f8fafc] text-[#5A7A90] hover:border-[#3c5d74] hover:text-[#3c5d74]"
                              }`}
                            onClick={() => setSelectedIcon(key)}
                          >
                            <Icon size={15} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="flex items-center justify-center gap-2 bg-gradient-to-br from-[#2b4557] to-[#1c3040] text-white rounded-xl py-3 text-sm font-bold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 mt-1"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                    >
                      {isEditMode ? <><Pencil size={15} /> Update Expense</> : <><Plus size={15} /> Add Expense</>}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aeModalFadeIn  { from { opacity: 0 }                          to { opacity: 1 } }
        @keyframes aeModalSlideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes aePopIn        { from { transform: scale(.5); opacity: 0 }    to { transform: scale(1); opacity: 1 } }
      `}</style>
    </>
  );
}