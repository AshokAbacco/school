// EditPaymentModal.jsx — Edit a previously recorded payment (date-wise)
// Shows the same date-wise payment history as the Invoice page. Pick a date,
// hit Edit, change the amount per fee category and/or the payment mode, save.
import React, { useEffect, useState } from "react";
import { CreditCard, X, Pencil, Save, XCircle, Calendar, Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

function fmtDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
}

// yyyy-mm-dd in IST, for the native <input type="date">
function toDateInput(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

const MODES = ["UPI", "Net Banking", "Cash", "Card", "Cheque"];

// categoryName (as returned by /paymentHistory items) → StudentPaymentLog field
const CATEGORY_FIELD_MAP = {
  "School Fee":    "schoolFeePaid",
  "Tuition Fee":   "tuitionFeePaid",
  "Exam Fee":      "examFeePaid",
  "Transport Fee": "transportFeePaid",
  "Books Fee":     "booksFeePaid",
  "Lab Fee":       "labFeePaid",
  "Miscellaneous": "miscFeePaid",
};

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token; } catch { return null; }
};

export function EditPaymentModal({ student, onClose, onUpdated }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null); // history entry id, e.g. "log_42"

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null); // { paymentDate, paymentMode, fields:{}, custom:{} }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // ── Fetch date-wise payment history (same endpoint the Invoice page uses) ──
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/finance/paymentHistory/${student.id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
          if (data.length > 0) setSelectedId(data[0].id);
        }
      } catch (e) {
        console.error("[EditPaymentModal] history fetch failed:", e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [student.id]);

  const selected = history.find((h) => h.id === selectedId) || null;
  const isLegacy = !!selected?.isLegacy || !selected?.receiptNo;

  // ── Enter edit mode: seed the form from the selected transaction's items ──
  const startEdit = () => {
    if (!selected) return;
    const fields = {
      schoolFeePaid: 0, tuitionFeePaid: 0, examFeePaid: 0,
      transportFeePaid: 0, booksFeePaid: 0, labFeePaid: 0, miscFeePaid: 0,
    };
    const custom = {};

    selected.items.forEach((item) => {
      const field = CATEGORY_FIELD_MAP[item.categoryName];
      if (field) {
        fields[field] = Number(item.amount || 0);
      } else if (item.categoryName && item.categoryName !== "Total Fees") {
        custom[item.categoryName] = Number(item.amount || 0);
      }
    });

    setForm({
      paymentDate: toDateInput(selected.date),
      paymentMode: selected.items[0]?.paymentMode || "Cash",
      fields,
      custom,
    });
    setError("");
    setSavedMsg("");
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setForm(null); setError(""); };

  const updateField = (key, val) => {
    setForm((f) => ({ ...f, fields: { ...f.fields, [key]: val === "" ? 0 : Number(val) } }));
  };
  const updateCustom = (label, val) => {
    setForm((f) => ({ ...f, custom: { ...f.custom, [label]: val === "" ? 0 : Number(val) } }));
  };

  const formTotal = form
    ? Object.values(form.fields).reduce((s, v) => s + Number(v || 0), 0) +
      Object.values(form.custom).reduce((s, v) => s + Number(v || 0), 0)
    : 0;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selected || isLegacy) return;
    if (formTotal <= 0) { setError("Total payment amount must be greater than ₹0."); return; }

    setSaving(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/finance/updatePaymentLog/${selected.receiptNo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          paymentMode: form.paymentMode,
          paymentDate: new Date(form.paymentDate + "T00:00:00+05:30").toISOString(),
          ...form.fields,
          customFeeBreakdown: form.custom,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setSavedMsg("Payment updated successfully.");
      setEditing(false);

      // Refresh history from server so totals/labels reflect the edit.
      const refetch = await fetch(`${API_URL}/api/finance/paymentHistory/${student.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (refetch.ok) setHistory(await refetch.json());

      onUpdated?.(student.id, data.newTotalPaid, data.paymentStatus);
    } catch (e) {
      setError(e.message || "Failed to update payment. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const FIELD_LABELS = [
    { key: "schoolFeePaid",    label: "School Fee" },
    { key: "tuitionFeePaid",   label: "Tuition Fee" },
    { key: "examFeePaid",      label: "Exam Fee" },
    { key: "transportFeePaid", label: "Transport Fee" },
    { key: "booksFeePaid",     label: "Books Fee" },
    { key: "labFeePaid",       label: "Lab Fee" },
    { key: "miscFeePaid",      label: "Miscellaneous" },
  ];

  return (
    <div className="fixed inset-0 bg-[#0f1926]/70 backdrop-blur-sm z-[1200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1C3044] to-[#27435B] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
              <CreditCard size={18} color="#fff" />
            </div>
            <div>
              <div className="text-white font-bold text-[15px]">Edit Payment Record</div>
              <div className="text-white/60 text-[11px]">{student.name} · {student.course}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#4A6B80] text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading payment history…
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#4A6B80]">No payment records found for this student.</div>
          ) : (
            <>
              {/* Date-wise transaction picker — same idea as the Invoice dropdown */}
              <div>
                <div className="text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider mb-2">Select Payment Date</div>
                <div className="flex flex-wrap gap-2">
                  {history.map((txn) => (
                    <button
                      key={txn.id}
                      onClick={() => { setSelectedId(txn.id); cancelEdit(); setSavedMsg(""); }}
                      className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors ${
                        selectedId === txn.id
                          ? "bg-[#1C3044] text-white border-[#1C3044]"
                          : "bg-[#f0f7fc] text-[#1C3044] border-[#c8dff0] hover:bg-[#e4eef8]"
                      }`}
                    >
                      {txn.label}
                    </button>
                  ))}
                </div>
              </div>

              {savedMsg && (
                <div className="bg-[#edf7f1] border border-[#b2dfc6] text-[#1a6e3e] text-[12.5px] font-semibold rounded-lg px-3 py-2">
                  ✓ {savedMsg}
                </div>
              )}

              {selected && !editing && (
                <div className="border border-[#e0eef6] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#f0f7fc] border-b border-[#e0eef6] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider">Transaction</div>
                      <div className="text-sm font-bold text-[#1C3044] flex items-center gap-1.5 mt-0.5">
                        <Calendar size={13} /> {fmtDate(selected.date)}
                      </div>
                    </div>
                    {!isLegacy ? (
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-[#27435B] hover:opacity-90 rounded-lg"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    ) : (
                      <span className="text-[10.5px] text-[#a1670e] bg-[#fef6e7] border border-[#fde68a] rounded-full px-2 py-1">
                        Legacy record — not editable
                      </span>
                    )}
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1C3044]/5">
                        {["Fee Category", "Paid This Transaction", "Mode"].map((h) => (
                          <th key={h} className="px-4 py-2 text-left text-[10.5px] font-bold uppercase tracking-wide text-[#4A6B80]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.filter((it) => it.amount > 0).map((item, i) => (
                        <tr key={i} className="border-t border-[#e8f2f8]">
                          <td className="px-4 py-2 font-semibold text-[#1C3044]">{item.categoryName}</td>
                          <td className="px-4 py-2 font-bold text-[#1a6e3e]">₹{fmt(item.amount)}</td>
                          <td className="px-4 py-2 text-[#4A6B80]">{item.paymentMode || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Edit form */}
              {selected && editing && form && (
                <div className="border border-[#c8dff0] rounded-xl p-4 space-y-4 bg-[#f8fafc]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A6B80] uppercase tracking-wide mb-1">Payment Date</label>
                      <input
                        type="date"
                        value={form.paymentDate}
                        max={toDateInput(new Date().toISOString())}
                        onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
                        className="w-full border border-[#A0C0D4] rounded-lg px-3 py-2 text-[13px] font-semibold text-[#1C3044] outline-none focus:border-[#27435B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A6B80] uppercase tracking-wide mb-1">Payment Mode</label>
                      <select
                        value={form.paymentMode}
                        onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))}
                        className="w-full border border-[#A0C0D4] rounded-lg px-3 py-2 text-[13px] font-semibold text-[#1C3044] outline-none focus:border-[#27435B] bg-white cursor-pointer"
                      >
                        {MODES.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-[#4A6B80] uppercase tracking-wide mb-2">Amount Paid Per Category</div>
                    <div className="space-y-2">
                      {FIELD_LABELS.filter(({ key }) => key in form.fields && (form.fields[key] > 0 || selected.items.some(it => CATEGORY_FIELD_MAP[it.categoryName] === key))).map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <span className="text-[12.5px] font-semibold text-[#1C3044]">{label}</span>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#4A6B80]">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={form.fields[key]}
                              onChange={(e) => updateField(key, e.target.value)}
                              className="w-32 border border-[#A0C0D4] rounded-lg pl-6 pr-2 py-1.5 text-[13px] font-semibold text-[#1C3044] outline-none focus:border-[#27435B] text-right"
                            />
                          </div>
                        </div>
                      ))}

                      {Object.keys(form.custom).map((label) => (
                        <div key={label} className="flex items-center justify-between gap-3">
                          <span className="text-[12.5px] font-semibold text-[#1C3044]">{label}</span>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#4A6B80]">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={form.custom[label]}
                              onChange={(e) => updateCustom(label, e.target.value)}
                              className="w-32 border border-[#A0C0D4] rounded-lg pl-6 pr-2 py-1.5 text-[13px] font-semibold text-[#1C3044] outline-none focus:border-[#27435B] text-right"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#e0eef6] pt-3">
                    <span className="text-[12px] font-bold text-[#4A6B80]">New Total for this Transaction</span>
                    <span className="text-[16px] font-bold text-[#1C3044]">₹{fmt(formTotal)}</span>
                  </div>

                  {error && <div className="text-[#a33030] text-[12px] font-semibold">{error}</div>}

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold text-[#27435B] border border-[#A0C0D4] rounded-lg hover:bg-[#f0f7fc]"
                    >
                      <XCircle size={13} /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold text-white bg-gradient-to-r from-[#27435B] to-[#1C3044] rounded-lg hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-[#e8f2f8] flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 text-[13.5px] font-bold text-[#27435B] border border-[#A0C0D4] rounded-lg hover:bg-[#f0f7fc]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}