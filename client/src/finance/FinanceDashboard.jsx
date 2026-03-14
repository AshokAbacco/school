import React, { useState, useEffect } from "react";
import PageLayout from "./components/PageLayout";
import {
  IndianRupee, TrendingUp, TrendingDown, AlertCircle,
  PiggyBank, BarChart3, School, ArrowUpRight, ArrowDownRight,
  GraduationCap, Bus, BookOpen, Users, Receipt,
  ChevronRight, CreditCard, Building2, Wallet,
  Wrench, Package, Zap, Droplets, Utensils, Monitor,
  ChevronDown, ChevronUp, DollarSign, BadgeIndianRupee,
  Layers, FileText, PlusCircle, MinusCircle, X, Plus, Check
} from "lucide-react";
const iconMap = {
  Wrench,
  Package,
  Zap,
  Droplets,
  Monitor,
  FileText,
  Users,
  BookOpen,
  Building2,
  Layers,
  Utensils,
  GraduationCap,
  Bus
};
// ── STATIC BASE REVENUE STREAMS (non-tuition fees) ────────────────────────────
const baseRevenueStreams = [
  { label: "Tuition Fees", amount: 0, pct: 0, color: "#3c5d74", icon: GraduationCap, trend: "+8%", up: true },
  { label: "Transport Fees", amount: 42000, pct: 14, color: "#2b4557", icon: Bus, trend: "+3%", up: true },
  { label: "Library & Books", amount: 18000, pct: 6, color: "#527a91", icon: BookOpen, trend: "-2%", up: false },
  { label: "Exam Fees", amount: 24000, pct: 8, color: "#1c3040", icon: FileText, trend: "+5%", up: true },
  { label: "Miscellaneous", amount: 26000, pct: 10, color: "#6a93a8", icon: Wallet, trend: "+1%", up: true },
];

// ── EXPENSE SECTIONS ──────────────────────────────────────────────────────────
const initialExpenseSections = [
  {
    key: "transport",
    label: "Bus & Transport",
    icon: Bus,
    color: "#3c5d74",
    total: 38500,
    items: [
      { label: "Fuel & Diesel", amount: 14000, icon: Zap },
      { label: "Driver Salaries", amount: 12000, icon: Users },
      { label: "Bus Maintenance", amount: 7500, icon: Wrench },
      { label: "Tyre & Spare Parts", amount: 3000, icon: Package },
      { label: "Insurance & Permits", amount: 2000, icon: FileText },
    ],
  },
  {
    key: "stationery",
    label: "Stationery & Supplies",
    icon: BookOpen,
    color: "#3c5d74",
    total: 22400,
    items: [
      { label: "Notebooks & Paper", amount: 6000, icon: FileText },
      { label: "Pens & Pencils", amount: 2400, icon: Layers },
      { label: "Art & Craft Supplies", amount: 5000, icon: Package },
      { label: "Exam Stationery", amount: 4500, icon: BookOpen },
      { label: "Printer Ink & Toner", amount: 4500, icon: Monitor },
    ],
  },
  {
    key: "maintenance",
    label: "Maintenance & Repairs",
    icon: Wrench,
    color: "#2b4557",
    total: 31000,
    items: [
      { label: "Building Repairs", amount: 10000, icon: Building2 },
      { label: "Electrical Work", amount: 6000, icon: Zap },
      { label: "Plumbing & Water", amount: 4000, icon: Droplets },
      { label: "Furniture Repairs", amount: 5000, icon: Layers },
      { label: "Computer/Lab Repairs", amount: 6000, icon: Monitor },
    ],
  },
  {
    key: "material",
    label: "Teaching Materials",
    icon: Monitor,
    color: "#3c5d74",
    total: 19500,
    items: [
      { label: "Textbooks & Workbooks", amount: 7000, icon: BookOpen },
      { label: "Lab Equipment", amount: 5000, icon: Package },
      { label: "Digital Resources", amount: 3500, icon: Monitor },
      { label: "Sports Equipment", amount: 2500, icon: Layers },
      { label: "Library Books", amount: 1500, icon: FileText },
    ],
  },
  {
    key: "salaries",
    label: "Staff Salaries",
    icon: Users,
    color: "#3c5d74",
    total: 95000,
    items: [
      { label: "Teaching Staff", amount: 55000, icon: GraduationCap },
      { label: "Administrative Staff", amount: 18000, icon: FileText },
      { label: "Support Staff", amount: 12000, icon: Users },
      { label: "Security Personnel", amount: 6000, icon: Package },
      { label: "Canteen Staff", amount: 4000, icon: Utensils },
    ],
  },
];

const recentActivity = [
  { desc: "Fee collected – Grade 5", type: "credit", amount: 4500, date: "Today, 10:32 AM", icon: GraduationCap },
  { desc: "Bus maintenance payment", type: "debit", amount: 7500, date: "Yesterday, 3:15 PM", icon: Bus },
  { desc: "Stationery purchase", type: "debit", amount: 2200, date: "24 Feb, 11:00 AM", icon: BookOpen },
  { desc: "Staff salary – Feb 2026", type: "debit", amount: 45000, date: "24 Feb, 9:00 AM", icon: Users },
  { desc: "Fee collected – Grade 3", type: "credit", amount: 6000, date: "23 Feb, 2:45 PM", icon: Receipt },
];

const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

// Icon map for modal selector
const iconOptions = [
  { key: "Wrench", icon: Wrench }, { key: "Package", icon: Package }, { key: "Zap", icon: Zap },
  { key: "Droplets", icon: Droplets }, { key: "Monitor", icon: Monitor }, { key: "FileText", icon: FileText },
  { key: "Users", icon: Users }, { key: "BookOpen", icon: BookOpen }, { key: "Building2", icon: Building2 },
  { key: "Layers", icon: Layers }, { key: "Utensils", icon: Utensils }, { key: "GraduationCap", icon: GraduationCap },
];

// ── ACCORDION EXPENSE SECTION ────────────────────────────────────────────────
function ExpenseSection({ sec, totalExpenses }) {
  const [open, setOpen] = useState(false);
  const pctOfTotal = Math.round((sec.total / totalExpenses) * 100);
  const SectionIcon = iconMap[sec.icon] || Package;

  return (
    <div className="exp-sec" style={{ "--ec": sec.color }}>
      <button className="exp-sec-head" onClick={() => setOpen(o => !o)}>
        <div className="exp-sec-left">
          <div className="exp-sec-ico"><SectionIcon size={16} /></div>
          <div>
            <div className="exp-sec-label">{sec.label}</div>
            <div className="exp-sec-bar-wrap">
              <div className="exp-sec-bar" style={{ width: `${pctOfTotal}%` }} />
            </div>
          </div>
        </div>
        <div className="exp-sec-right">
          <span className="exp-sec-amount">{fmt(sec.total)}</span>
          <span className="exp-sec-pct">{pctOfTotal}%</span>
          {open ? <ChevronUp size={15} color={sec.color} /> : <ChevronDown size={15} color="#5A7A90" />}
        </div>
      </button>

      {open && (
        <div className="exp-sec-body">
          {sec.items.map((item, i) => {
            const IconComp = iconMap[item.icon] || Package;

            return (
              <div key={i} className="exp-item-row">
                <div className="exp-item-left">
                  <div className="exp-item-dot" />
                  <div className="exp-item-ico">
                    <IconComp size={13} />
                  </div>
                  <span className="exp-item-label">{item.label}</span>
                </div>

                <div className="exp-item-right">
                  <div className="exp-item-bar-wrap">
                    <div
                      className="exp-item-bar"
                      style={{ width: `${Math.round((item.amount / sec.total) * 100)}%` }}
                    />
                  </div>
                  <span className="exp-item-amount">{fmt(item.amount)}</span>
                </div>
              </div>
            );
          })}
          <div className="exp-sec-subtotal">
            <span>Section Total</span>
            <span>{fmt(sec.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADD EXPENSES MODAL ───────────────────────────────────────────────────────
function AddExpensesModal({ expenseSections, onClose, onAdd }) {
  const [tab, setTab] = useState("view"); // "view" | "add"
  const [selectedSection, setSelectedSection] = useState(expenseSections[0]?.key || "");
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customNewSection, setCustomNewSection] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Package");
  const [success, setSuccess] = useState(false);
  const [expandedSec, setExpandedSec] = useState(null);

  const handleAdd = () => {
    const amount = parseInt(customAmount.replace(/,/g, ""), 10);
    if (!customLabel.trim() || isNaN(amount) || amount <= 0) return;

    if (customNewSection && !newSectionLabel.trim()) return;

    const iconObj = iconOptions.find(i => i.key === selectedIcon) || iconOptions[0];

    onAdd({
      isNewSection: customNewSection,
      sectionKey: customNewSection ? null : selectedSection,
      newSectionLabel: newSectionLabel.trim(),
      label: customLabel.trim(),
      amount,
      icon: selectedIcon,
    });

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setCustomLabel("");
      setCustomAmount("");
      setCustomNewSection(false);
      setNewSectionLabel("");
      setTab("view");
    }, 1400);
  };

  const totalExpenses = expenseSections.reduce((s, e) => s + e.total, 0);
  useEffect(() => {
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="modal-head">
          <div className="modal-head-left">
            <div className="modal-head-ico"><TrendingDown size={18} color="#fff" /></div>
            <div>
              <div className="modal-head-title">Expense Manager</div>
              <div className="modal-head-sub">View all expenses or add a new one</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button className={`modal-tab ${tab === "view" ? "active" : ""}`} onClick={() => setTab("view")}>
            <BarChart3 size={14} /> All Expenses
          </button>
          <button className={`modal-tab ${tab === "add" ? "active" : ""}`} onClick={() => setTab("add")}>
            <Plus size={14} /> Add New Expense
          </button>
        </div>

        <div className="modal-body">

          {/* ── VIEW TAB ── */}
          {tab === "view" && (
            <div>
              <div className="modal-total-pill">
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px" }}>Total Expenses</span>
                <span style={{ fontSize: 20, color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{fmt(totalExpenses)}</span>
              </div>

              {expenseSections.map(sec => (
                <div key={sec.key} className="modal-sec">
                  <button className="modal-sec-head" onClick={() => setExpandedSec(expandedSec === sec.key ? null : sec.key)}>
                    <div className="modal-sec-left">
                      <div className="modal-sec-ico" style={{ background: sec.color + "20", color: sec.color }}><sec.icon size={15} /></div>
                      <span className="modal-sec-label">{sec.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="modal-sec-amt">{fmt(sec.total)}</span>
                      <span className="modal-sec-pct">{Math.round((sec.total / totalExpenses) * 100)}%</span>
                      {expandedSec === sec.key ? <ChevronUp size={14} color="#5A7A90" /> : <ChevronDown size={14} color="#5A7A90" />}
                    </div>
                  </button>

                  {expandedSec === sec.key && (
                    <div className="modal-sec-items">
                      {sec.items.map((item, i) => (
                        <div key={i} className="modal-item-row">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="modal-item-dot" style={{ background: sec.color }} />
                            <div className="modal-item-ico" style={{ color: sec.color }}><item.icon size={12} /></div>
                            <span className="modal-item-label">{item.label}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="modal-item-bar-wrap">
                              <div className="modal-item-bar" style={{ width: `${Math.round((item.amount / sec.total) * 100)}%`, background: sec.color }} />
                            </div>
                            <span className="modal-item-amt">{fmt(item.amount)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="modal-sec-total">
                        <span>Section Total</span><span style={{ color: sec.color }}>{fmt(sec.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── ADD TAB ── */}
          {tab === "add" && (
            <div className="add-form">
              {success ? (
                <div className="add-success">
                  <div className="add-success-ico"><Check size={28} color="#fff" /></div>
                  <div className="add-success-msg">Expense Added Successfully!</div>
                </div>
              ) : (
                <>
                  {/* Section toggle */}
                  <div className="add-toggle-row">
                    <span className="add-field-label">Add to</span>
                    <div className="add-toggle">
                      <button className={`add-toggle-btn ${!customNewSection ? "active" : ""}`} onClick={() => setCustomNewSection(false)}>Existing Category</button>
                      <button className={`add-toggle-btn ${customNewSection ? "active" : ""}`} onClick={() => setCustomNewSection(true)}>New Category</button>
                    </div>
                  </div>

                  {!customNewSection ? (
                    <div className="add-field">
                      <label className="add-field-label">Select Category</label>
                      <select
                        className="add-select"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                      >
                        {expenseSections.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label} — {fmt(s.total)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="add-field">
                      <label className="add-field-label">New Category Name</label>
                      <input
                        className="add-input"
                        placeholder="e.g. Events & Activities"
                        value={newSectionLabel}
                        onChange={e => setNewSectionLabel(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="add-field">
                    <label className="add-field-label">Expense Description</label>
                    <input
                      className="add-input"
                      placeholder="e.g. Annual Day Decorations"
                      value={customLabel}
                      onChange={e => setCustomLabel(e.target.value)}
                    />
                  </div>

                  <div className="add-field">
                    <label className="add-field-label">Amount (₹)</label>
                    <div style={{ position: "relative" }}>
                      <span className="add-rupee">₹</span>
                      <input
                        className="add-input add-input-money"
                        placeholder="0"
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        type="number"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="add-field">
                    <label className="add-field-label">Icon</label>
                    <div className="add-icon-grid">
                      {iconOptions.map(({ key, icon: Icon }) => (
                        <button
                          key={key}
                          className={`add-icon-btn ${selectedIcon === key ? "active" : ""}`}
                          onClick={() => setSelectedIcon(key)}
                          title={key}
                        >
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    className="add-submit-btn"
                    onClick={handleAdd}
                    disabled={!customLabel.trim() || !customAmount || (customNewSection && !newSectionLabel.trim())}
                  >
                    <Plus size={16} /> Add Expense
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function FinanceHome() {
  const [expenseSections, setExpenseSections] = useState(initialExpenseSections);
  const [showModal, setShowModal] = useState(false);

  // ── BACKEND-FETCHED DATA ────────────────────────────────────────────────────
  const [studentFeesTotal, setStudentFeesTotal] = useState(0);
  const [studentFeesPaid, setStudentFeesPaid] = useState(0);
  const [studentFeesDue, setStudentFeesDue] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [salarySections, setSalarySections] = useState([]);
  const [backendLoaded, setBackendLoaded] = useState(false);
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/finance/list"
        );

        const data = await res.json();

        if (Array.isArray(data)) {
          setExpenseSections(data);
        }
      } catch (err) {
        console.log("Expense fetch error:", err);
      }
    };

    fetchExpenses();
  }, []);
  // Fetch student fees from backend
  useEffect(() => {
    const fetchStudentFees = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/finance/getStudentFinance", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const total = data.reduce((s, s2) => s + Number(s2.fees || 0), 0);
          const paid = data.filter(s2 => s2.status === "PAID" || s2.paid).reduce((s, s2) => s + Number(s2.fees || 0), 0);
          setStudentFeesTotal(total);
          setStudentFeesPaid(paid || total * 0.67); // fallback estimate
          setStudentFeesDue(total - (paid || total * 0.67));
          setStudentCount(data.length);
        }
      } catch (err) { console.log("Student fees fetch:", err); }
    };
    fetchStudentFees();
  }, []);

  // Fetch salary data from ALL groups (Teachers/A, Group B, Group C, Group D)
  useEffect(() => {
    const fetchAllSalaries = async () => {
      try {
        const token = localStorage.getItem("token");
        const savedSchoolId = localStorage.getItem("selectedSchoolId");

        // ── Group A: Teachers salary ──────────────────────────────────────────
        let groupATotal = 0;
        let groupAItems = [];
        if (savedSchoolId && token) {
          try {
            const resA = await fetch(`http://localhost:5000/api/teachers/salary/list/${savedSchoolId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resA.ok) {
              const dataA = await resA.json();
              if (Array.isArray(dataA) && dataA.length > 0) {
                groupATotal = dataA.reduce((s, t) => s + Number(t.netSalary || 0), 0);
                groupAItems = dataA.map(t => ({
                  label: `${t.teacher?.firstName || ""} ${t.teacher?.lastName || ""}`.trim() || "Teacher",
                  amount: Number(t.netSalary || 0),
                  icon: "GraduationCap",
                }));
              }
            }
          } catch (e) { console.log("Group A fetch error:", e); }
        }

        // ── Group B salary ────────────────────────────────────────────────────
        let groupBTotal = 0;
        let groupBItems = [];
        try {
          const resB = await fetch("http://localhost:5000/api/groupb/salary/list/all", { credentials: "include" });
          if (resB.ok) {
            const dataB = await resB.json();
            if (Array.isArray(dataB) && dataB.length > 0) {
              groupBTotal = dataB.reduce((s, t) => s + Number(t.basicSalary || 0) + Number(t.allowances || 0), 0);
              groupBItems = dataB.map(t => ({
                label: t.name || t.designation || "Staff",
                amount: Number(t.basicSalary || 0) + Number(t.allowances || 0),
                icon: "Users",
              }));
            }
          }
        } catch (e) { console.log("Group B fetch error:", e); }

        // ── Group C salary ────────────────────────────────────────────────────
        let groupCTotal = 0;
        let groupCItems = [];
        try {
          const resC = await fetch("http://localhost:5000/api/groupc/salary/list/all", { credentials: "include" });
          if (resC.ok) {
            const dataC = await resC.json();
            if (Array.isArray(dataC) && dataC.length > 0) {
              groupCTotal = dataC.reduce((s, t) => s + Number(t.basicSalary || 0) + Number(t.allowances || 0), 0);
              groupCItems = dataC.map(t => ({
                label: t.name || t.role || "Staff",
                amount: Number(t.basicSalary || 0) + Number(t.allowances || 0),
                icon: "Users",
              }));
            }
          }
        } catch (e) { console.log("Group C fetch error:", e); }

        // ── Group D salary ────────────────────────────────────────────────────
        let groupDTotal = 0;
        let groupDItems = [];
        try {
          const resD = await fetch("http://localhost:5000/api/groupd/salary/list/all", { credentials: "include" });
          if (resD.ok) {
            const dataD = await resD.json();
            if (Array.isArray(dataD) && dataD.length > 0) {
              groupDTotal = dataD.reduce((s, t) => s + Number(t.basicSalary || 0) + Number(t.allowances || 0), 0);
              groupDItems = dataD.map(t => ({
                label: t.name || t.position || "Staff",
                amount: Number(t.basicSalary || 0) + Number(t.allowances || 0),
                icon: "Users",
              }));
            }
          }
        } catch (e) { console.log("Group D fetch error:", e); }

        // ── Build combined salary sections ────────────────────────────────────
        const combined = [];

        if (groupATotal > 0) {
          combined.push({
            key: "salaries_group_a",
            label: "Teaching Staff Salaries",
            icon: "GraduationCap",
            color: "#3c5d74",
            total: groupATotal,
            items: groupAItems,
          });
        }
        if (groupBTotal > 0) {
          combined.push({
            key: "salaries_group_b",
            label: "Group B Staff Salaries",
            icon: "Users",
            color: "#2b4557",
            total: groupBTotal,
            items: groupBItems,
          });
        }
        if (groupCTotal > 0) {
          combined.push({
            key: "salaries_group_c",
            label: "Group C Staff Salaries",
            icon: "Users",
            color: "#527a91",
            total: groupCTotal,
            items: groupCItems,
          });
        }
        if (groupDTotal > 0) {
          combined.push({
            key: "salaries_group_d",
            label: "Group D Staff Salaries",
            icon: "Users",
            color: "#1c3040",
            total: groupDTotal,
            items: groupDItems,
          });
        }

        if (combined.length > 0) {
          setSalarySections(combined);
        }

        setBackendLoaded(true);
      } catch (err) { console.log("Salary fetch error:", err); setBackendLoaded(true); }
    };
    fetchAllSalaries();
  }, []);

  // ── DYNAMIC REVENUE CALCULATION ──────────────────────────────────────────────
  // Replace static tuition fees with real student fees total from backend
  const revenueStreams = baseRevenueStreams.map(r =>
    r.label === "Tuition Fees"
      ? { ...r, amount: studentFeesTotal > 0 ? studentFeesTotal : 180000 }
      : r
  );
  // Recalculate percentages dynamically
  const rawTotal = revenueStreams.reduce((s, r) => s + r.amount, 0);
  const revenueStreamsWithPct = revenueStreams.map(r => ({
    ...r,
    pct: rawTotal > 0 ? Math.round((r.amount / rawTotal) * 100) : r.pct,
  }));
  const totalRevenue = rawTotal;

  // ── DYNAMIC EXPENSE CALCULATION ───────────────────────────────────────────────
  // If backend returned salary data, replace the static salaries section with
  // individual sections for each salary group (A, B, C, D)
  const mergedExpenseSections = salarySections.length > 0
    ? [
      ...expenseSections.filter(sec => sec.key !== "salaries"),
      ...salarySections,
    ]
    : expenseSections;

  const totalExpenses = mergedExpenseSections.reduce((s, e) => s + e.total, 0);
  const net = totalRevenue - totalExpenses;
  const pendingFees = studentFeesDue > 0 ? studentFeesDue : 5000;
  const pendingCount = studentCount > 0 ? Math.ceil(studentCount * 0.13) : 8;

  const handleAddExpense = async ({
    isNewSection,
    sectionKey,
    newSectionLabel,
    label,
    amount,
    icon,
  }) => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/finance/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isNewSection,
            sectionKey,
            newSectionLabel,
            label,
            amount,
            icon,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        const reload = await fetch(
          "http://localhost:5000/api/finance/list"
        );

        const updated = await reload.json();

        setExpenseSections(updated);
      }
    } catch (err) {
      console.log("Add expense error:", err);
    }
  };

  return (
    <PageLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          --navy:#1c3040; --primary:#2b4557; --mid:#3c5d74;
          --accent:#527a91; --pale:#eaf1f6;
          --success:#3c5d74; --danger:#3c5d74; --warn:#527a91;
          --text:#162535; --muted:#5A7A90; --border:#d4e4ee;
        }
        .fh-root * { box-sizing:border-box; }
        .fh-root, .fh-root button { font-family:'DM Sans',sans-serif; }
        .fh-page { background:linear-gradient(150deg,#d8e8f0 0%,#c8dce9 45%,#b8cfe0 100%); min-height:100vh; }

        /* TOP BAR */
        .fh-topbar { background:linear-gradient(135deg,#1c3040,#2b4557); padding:18px 32px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 20px rgba(28,48,64,.38); }
        .fh-brand { display:flex; align-items:center; gap:13px; }
        .fh-logo  { width:46px; height:46px; border-radius:13px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
        .fh-title { margin:0; font-size:19px; font-weight:700; color:#fff; font-family:'DM Sans',sans-serif; }
        .fh-sub   { margin:0; font-size:12px; color:rgba(255,255,255,.55); }
        .fh-datebadge { color:rgba(255,255,255,.7); font-size:12px; background:rgba(255,255,255,.1); padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.18); }

        /* CONTENT */
        .fh-content { padding:24px 32px; }

        /* SECTION TITLE */
        .fh-sec-title { font-family:'DM Sans',sans-serif; font-size:16px; font-weight:700; color:#1c3040; margin:0 0 14px; display:flex; align-items:center; gap:9px; }
        .fh-sec-title span { width:4px; height:19px; background:linear-gradient(135deg,#2b4557,#1c3040); border-radius:4px; display:inline-block; }

        /* KPI STRIP */
        .fh-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:22px; }
        .fh-kpi { background:rgba(255,255,255,.92); border-radius:16px; padding:20px 20px 16px; box-shadow:0 2px 14px rgba(28,48,64,.1); position:relative; overflow:hidden; border-top:4px solid var(--kc); transition:transform .2s; }
        .fh-kpi:hover { transform:translateY(-3px); }
        .fh-kpi-lbl { font-size:11px; font-weight:700; color:#5A7A90; text-transform:uppercase; letter-spacing:.9px; margin-bottom:7px; }
        .fh-kpi-val { font-size:24px; font-weight:700; color:#1c3040; font-family:'DM Sans',sans-serif; line-height:1; }
        .fh-kpi-sub { font-size:11.5px; margin-top:6px; display:flex; align-items:center; gap:4px; font-weight:600; }
        .fh-kpi-ico { position:absolute; right:16px; top:16px; width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; }
        .fh-kpi-glow { position:absolute; right:-18px; bottom:-18px; width:80px; height:80px; border-radius:50%; background:var(--kc); opacity:.07; }

        /* PANEL */
        .fh-panel { background:rgba(255,255,255,.92); border-radius:16px; box-shadow:0 2px 12px rgba(28,48,64,.09); overflow:hidden; margin-bottom:18px; }
        .fh-panel-head { background:linear-gradient(135deg,#2b4557,#1c3040); padding:13px 20px; display:flex; align-items:center; justify-content:space-between; }
        .fh-ph-left { display:flex; align-items:center; gap:9px; }
        .fh-ph-title { color:#fff; font-size:14px; font-weight:700; margin:0; }
        .fh-panel-body { padding:4px 20px 18px; }

        /* TWO COL */
        .fh-two { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px; }

        /* ── REVENUE SECTION ── */
        .rev-grid { display:flex; flex-direction:column; gap:0; }
        .rev-row { display:flex; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid #eaf1f6; }
        .rev-row:last-child { border-bottom:none; }
        .rev-ico  { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .rev-info { flex:1; }
        .rev-label { font-size:13.5px; font-weight:600; color:#1c3040; }
        .rev-bar-wrap { height:5px; background:#eaf1f6; border-radius:4px; margin-top:5px; overflow:hidden; }
        .rev-bar { height:100%; border-radius:4px; transition:width .6s ease; }
        .rev-right { text-align:right; flex-shrink:0; }
        .rev-amount { font-size:14px; font-weight:700; font-family:'DM Sans',sans-serif; color:#1c3040; }
        .rev-trend  { font-size:11px; font-weight:600; margin-top:2px; display:flex; align-items:center; justify-content:flex-end; gap:3px; }
        .rev-total-bar { background:linear-gradient(135deg,#3c5d74,#2b4557); border-radius:12px; padding:16px 20px; margin-top:14px; display:flex; justify-content:space-between; align-items:center; }

        /* ── EXPENSE ACCORDION ── */
        .exp-sec { background:#fff; border-radius:12px; margin-bottom:10px; overflow:hidden; box-shadow:0 1px 6px rgba(28,48,64,.07); border-left:4px solid var(--ec); }
        .exp-sec-head { width:100%; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:14px 16px; transition:background .15s; }
        .exp-sec-head:hover { background:rgba(0,0,0,.025); }
        .exp-sec-left { display:flex; align-items:center; gap:12px; flex:1; }
        .exp-sec-ico  { width:36px; height:36px; border-radius:10px; background:var(--ec); background:color-mix(in srgb,var(--ec) 15%,transparent); color:var(--ec); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .exp-sec-label { font-size:13.5px; font-weight:700; color:#1c3040; text-align:left; margin-bottom:4px; }
        .exp-sec-bar-wrap { width:140px; height:5px; background:#eaf1f6; border-radius:4px; overflow:hidden; }
        .exp-sec-bar  { height:100%; background:var(--ec); border-radius:4px; }
        .exp-sec-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .exp-sec-amount { font-size:14px; font-weight:700; color:var(--ec); font-family:'DM Sans',sans-serif; }
        .exp-sec-pct    { font-size:11px; font-weight:700; color:#5A7A90; background:#eaf1f6; padding:2px 8px; border-radius:20px; }

        .exp-sec-body { background:#f5f9fc; padding:4px 16px 14px 58px; border-top:1px solid #eaf1f6; }
        .exp-item-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid #eaf1f6; }
        .exp-item-row:last-of-type { border-bottom:none; }
        .exp-item-left { display:flex; align-items:center; gap:9px; }
        .exp-item-dot  { width:6px; height:6px; border-radius:50%; background:var(--ec); flex-shrink:0; }
        .exp-item-ico  { width:26px; height:26px; border-radius:7px; background:color-mix(in srgb,var(--ec) 12%,transparent); color:var(--ec); display:flex; align-items:center; justify-content:center; }
        .exp-item-label { font-size:13px; font-weight:500; color:#2E3F50; }
        .exp-item-right { display:flex; align-items:center; gap:10px; }
        .exp-item-bar-wrap { width:80px; height:4px; background:#eaf1f6; border-radius:3px; overflow:hidden; }
        .exp-item-bar { height:100%; background:var(--ec); opacity:.6; border-radius:3px; }
        .exp-item-amount { font-size:13px; font-weight:700; color:#1c3040; min-width:80px; text-align:right; }
        .exp-sec-subtotal { display:flex; justify-content:space-between; margin-top:10px; padding:10px 14px; background:color-mix(in srgb,var(--ec) 8%,transparent); border-radius:9px; font-size:13px; font-weight:700; color:var(--ec); }

        /* ACTIVITY */
        .fh-act-row { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid #eaf1f6; }
        .fh-act-row:last-child { border-bottom:none; }
        .fh-act-dot { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .fh-act-desc { font-size:13px; font-weight:600; color:#1c3040; }
        .fh-act-date { font-size:11px; color:#5A7A90; margin-top:1px; }
        .fh-act-amt  { font-size:14px; font-weight:700; font-family:'DM Sans',sans-serif; white-space:nowrap; }

        /* BOTTOM STRIP */
        .fh-strip { background:linear-gradient(135deg,#2b4557,#1c3040); border-radius:14px; padding:18px 28px; display:flex; align-items:center; justify-content:space-around; margin-top:4px; }
        .fh-strip-item { text-align:center; }
        .fh-strip-lbl  { color:rgba(255,255,255,.55); font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
        .fh-strip-val  { color:#fff; font-size:19px; font-weight:700; font-family:'DM Sans',sans-serif; margin-top:3px; }
        .fh-strip-div  { width:1px; height:36px; background:rgba(255,255,255,.18); }
        .fh-see-all { color:rgba(255,255,255,.7); font-size:12px; display:flex; align-items:center; gap:3px; background:rgba(255,255,255,.12); border:none; border-radius:8px; padding:5px 12px; cursor:pointer; }
        .fh-see-all:hover { background:rgba(255,255,255,.2); color:#fff; }

        /* NET BALANCE CARD */
        .net-card { border-radius:14px; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
        .net-card.surplus  { background:linear-gradient(135deg,rgba(60,93,116,.12),rgba(60,93,116,.06)); border:1.5px solid rgba(60,93,116,.25); }
        .net-card.deficit  { background:linear-gradient(135deg,rgba(60,93,116,.12),rgba(60,93,116,.06)); border:1.5px solid rgba(60,93,116,.25); }
        .net-card-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#5A7A90; }
        .net-card-val   { font-size:28px; font-weight:700; font-family:'DM Sans',sans-serif; margin-top:4px; }

        /* ADD EXPENSE BUTTON */
        .add-exp-btn { display:flex; align-items:center; gap:8px; background:linear-gradient(135deg,#2b4557,#1c3040); color:#fff; border:none; border-radius:10px; padding:10px 20px; font-size:13.5px; font-weight:700; font-family:'DM Sans',sans-serif; cursor:pointer; box-shadow:0 4px 14px rgba(28,48,64,.3); transition:transform .18s, box-shadow .18s; }
        .add-exp-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(28,48,64,.4); }
        .add-exp-btn:active { transform:translateY(0); }

        /* MODAL */
        .modal-overlay { position:fixed; inset:0; background:rgba(20,35,50,.6); backdrop-filter:blur(6px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .2s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal-box { background:#fff; border-radius:20px; width:100%; max-width:580px; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(28,48,64,.3); animation:slideUp .25s ease; overflow:hidden; }
        @keyframes slideUp { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }

        .modal-head { background:linear-gradient(135deg,#1c3040,#2b4557); padding:18px 22px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .modal-head-left { display:flex; align-items:center; gap:13px; }
        .modal-head-ico { width:42px; height:42px; border-radius:12px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
        .modal-head-title { font-size:16px; font-weight:700; color:#fff; font-family:'DM Sans',sans-serif; margin:0 0 2px; }
        .modal-head-sub { font-size:11.5px; color:rgba(255,255,255,.55); margin:0; }
        .modal-close-btn { width:34px; height:34px; border-radius:9px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:rgba(255,255,255,.75); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s; }
        .modal-close-btn:hover { background:rgba(255,255,255,.22); color:#fff; }

        .modal-tabs { display:flex; background:#f5f9fc; border-bottom:1px solid #e4eff6; flex-shrink:0; }
        .modal-tab { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:12px; font-size:13px; font-weight:600; color:#5A7A90; background:none; border:none; cursor:pointer; border-bottom:2.5px solid transparent; transition:all .15s; font-family:'DM Sans',sans-serif; }
        .modal-tab.active { color:#2b4557; border-bottom-color:#2b4557; background:rgba(43,69,87,.04); }
        .modal-tab:hover:not(.active) { color:#3c5d74; background:rgba(60,93,116,.04); }

        .modal-body { overflow-y:auto; padding:18px 22px 22px; flex:1; }

        .modal-total-pill { background:linear-gradient(135deg,#2b4557,#1c3040); border-radius:12px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }

        .modal-sec { background:#f8fafc; border-radius:12px; margin-bottom:10px; overflow:hidden; border:1px solid #e4eff6; }
        .modal-sec-head { width:100%; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:13px 16px; transition:background .15s; font-family:'DM Sans',sans-serif; }
        .modal-sec-head:hover { background:rgba(60,93,116,.04); }
        .modal-sec-left { display:flex; align-items:center; gap:10px; }
        .modal-sec-ico { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; }
        .modal-sec-label { font-size:13.5px; font-weight:700; color:#1c3040; }
        .modal-sec-amt { font-size:14px; font-weight:700; color:#2b4557; font-family:'DM Sans',sans-serif; }
        .modal-sec-pct { font-size:11px; font-weight:700; color:#5A7A90; background:#eaf1f6; padding:2px 8px; border-radius:20px; }

        .modal-sec-items { padding:4px 16px 14px 16px; border-top:1px solid #e4eff6; }
        .modal-item-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f5f9; }
        .modal-item-row:last-child { border-bottom:none; }
        .modal-item-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
        .modal-item-ico { width:24px; height:24px; border-radius:6px; background:#f0f5f9; display:flex; align-items:center; justify-content:center; }
        .modal-item-label { font-size:13px; font-weight:500; color:#2E3F50; }
        .modal-item-bar-wrap { width:60px; height:4px; background:#eaf1f6; border-radius:3px; overflow:hidden; }
        .modal-item-bar { height:100%; border-radius:3px; opacity:.6; }
        .modal-item-amt { font-size:12.5px; font-weight:700; color:#1c3040; min-width:72px; text-align:right; }
        .modal-sec-total { display:flex; justify-content:space-between; padding:8px 12px; margin-top:6px; background:#eaf1f6; border-radius:8px; font-size:12.5px; font-weight:700; color:#2b4557; }

        /* ADD FORM */
        .add-form { display:flex; flex-direction:column; gap:16px; }
        .add-field { display:flex; flex-direction:column; gap:6px; }
        .add-field-label { font-size:12px; font-weight:700; color:#5A7A90; text-transform:uppercase; letter-spacing:.7px; }
        .add-input { border:1.5px solid #d4e4ee; border-radius:10px; padding:10px 14px; font-size:14px; font-family:'DM Sans',sans-serif; color:#1c3040; outline:none; background:#fff; transition:border-color .15s; width:100%; }
        .add-input:focus { border-color:#3c5d74; }
        .add-input-money { padding-left:32px; }
        .add-rupee { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:15px; font-weight:700; color:#5A7A90; pointer-events:none; }
        .add-select { border:1.5px solid #d4e4ee; border-radius:10px; padding:10px 14px; font-size:14px; font-family:'DM Sans',sans-serif; color:#1c3040; outline:none; background:#fff; cursor:pointer; width:100%; }
        .add-select:focus { border-color:#3c5d74; }

        .add-toggle-row { display:flex; align-items:center; gap:14px; }
        .add-toggle { display:flex; background:#eaf1f6; border-radius:9px; padding:3px; gap:3px; }
        .add-toggle-btn { background:none; border:none; border-radius:7px; padding:7px 14px; font-size:12.5px; font-weight:600; color:#5A7A90; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .15s; }
        .add-toggle-btn.active { background:#fff; color:#2b4557; box-shadow:0 1px 6px rgba(28,48,64,.12); }

        .add-icon-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .add-icon-btn { width:38px; height:38px; border-radius:9px; border:1.5px solid #d4e4ee; background:#f8fafc; color:#5A7A90; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
        .add-icon-btn.active { border-color:#2b4557; background:#2b4557; color:#fff; }
        .add-icon-btn:hover:not(.active) { border-color:#3c5d74; color:#3c5d74; }

        .add-submit-btn { display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg,#2b4557,#1c3040); color:#fff; border:none; border-radius:11px; padding:13px; font-size:14px; font-weight:700; font-family:'DM Sans',sans-serif; cursor:pointer; transition:transform .18s, box-shadow .18s; box-shadow:0 4px 14px rgba(28,48,64,.25); margin-top:4px; }
        .add-submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 6px 20px rgba(28,48,64,.35); }
        .add-submit-btn:disabled { opacity:.45; cursor:not-allowed; }

        .add-success { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:48px 20px; }
        .add-success-ico { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#3c5d74,#2b4557); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(60,93,116,.35); animation:popIn .3s ease; }
        @keyframes popIn { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
        .add-success-msg { font-size:16px; font-weight:700; color:#1c3040; font-family:'DM Sans',sans-serif; }
      `}</style>

      <div className="fh-root fh-page">

        {/* TOP BAR */}
        <div className="fh-topbar">
          <div className="fh-brand">
            <div className="fh-logo"><School size={22} color="#fff" /></div>
            <div>
              <p className="fh-title">School Financial Dashboard</p>
              <p className="fh-sub">Complete Financial Overview &amp; Operations</p>
            </div>
          </div>
          <span className="fh-datebadge">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        <div className="fh-content">

          {/* KPI CARDS */}
          <div className="fh-kpi-grid">
            {[
              { label: "Total Revenue", value: fmt(totalRevenue), sub: "+12% this month", up: true, color: "#3c5d74", icon: TrendingUp },
              { label: "Total Expenses", value: fmt(totalExpenses), sub: "+4% this month", up: false, color: "#3c5d74", icon: TrendingDown },
              { label: "Pending Fees", value: fmt(pendingFees), sub: `${pendingCount} students due`, up: false, color: "#527a91", icon: AlertCircle },
              { label: "Net Balance", value: fmt(net), sub: net > 0 ? "Healthy surplus" : "Deficit", up: net > 0, color: "#2b4557", icon: PiggyBank },
            ].map((s, i) => (
              <div key={i} className="fh-kpi" style={{ "--kc": s.color }}>
                <div className="fh-kpi-lbl">{s.label}</div>
                <div className="fh-kpi-val">{s.value}</div>
                <div className="fh-kpi-sub" style={{ color: s.up ? "#3c5d74" : "#3c5d74" }}>
                  {s.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{s.sub}
                </div>
                <div className="fh-kpi-ico" style={{ background: s.color + "18", color: s.color }}><s.icon size={19} /></div>
                <div className="fh-kpi-glow" />
              </div>
            ))}
          </div>

          {/* TWO COL: REVENUE + ACTIVITY */}
          <div className="fh-two">

            {/* ── REVENUE BREAKDOWN ── */}
            <div className="fh-panel">
              <div className="fh-panel-head">
                <div className="fh-ph-left"><TrendingUp size={14} color="#fff" /><p className="fh-ph-title">Revenue Breakdown</p></div>
                <span style={{ color: "rgba(255,255,255,.65)", fontSize: 12 }}>Monthly</span>
              </div>
              <div className="fh-panel-body" style={{ paddingTop: 6 }}>
                <div className="rev-grid">
                  {revenueStreamsWithPct.map((r, i) => (
                    <div key={i} className="rev-row">
                      <div className="rev-ico" style={{ background: r.color + "18", color: r.color }}><r.icon size={16} /></div>
                      <div className="rev-info">
                        <div className="rev-label">{r.label}</div>
                        <div className="rev-bar-wrap">
                          <div className="rev-bar" style={{ width: `${r.pct}%`, background: `linear-gradient(90deg,${r.color},${r.color}88)` }} />
                        </div>
                      </div>
                      <div className="rev-right">
                        <div className="rev-amount">{fmt(r.amount)}</div>
                        <div className="rev-trend" style={{ color: r.up ? "#3c5d74" : "#3c5d74" }}>
                          {r.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{r.trend}
                          <span style={{ color: "#5A7A90", fontWeight: 500, marginLeft: 4 }}>{r.pct}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rev-total-bar">
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px" }}>Total Revenue</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{fmt(totalRevenue)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>This Month</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.85)", fontWeight: 600, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      <ArrowUpRight size={13} />+12% vs last month
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RECENT ACTIVITY ── */}
            <div className="fh-panel">
              <div className="fh-panel-head">
                <div className="fh-ph-left"><CreditCard size={14} color="#fff" /><p className="fh-ph-title">Recent Activity</p></div>
                <button className="fh-see-all">View all <ChevronRight size={13} /></button>
              </div>
              <div className="fh-panel-body">
                {recentActivity.map((a, i) => (
                  <div key={i} className="fh-act-row">
                    <div className="fh-act-dot" style={{ background: a.type === "credit" ? "rgba(60,93,116,.13)" : "rgba(60,93,116,.1)", color: a.type === "credit" ? "#3c5d74" : "#3c5d74" }}><a.icon size={15} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="fh-act-desc">{a.desc}</div>
                      <div className="fh-act-date">{a.date}</div>
                    </div>
                    <div className="fh-act-amt" style={{ color: a.type === "credit" ? "#3c5d74" : "#3c5d74" }}>
                      {a.type === "credit" ? "+" : "−"} {fmt(a.amount)}
                    </div>
                  </div>
                ))}

                {/* Net balance mini card */}
                <div className={`net-card ${net >= 0 ? "surplus" : "deficit"}`} style={{ marginTop: 16, marginBottom: 0 }}>
                  <div>
                    <div className="net-card-label">Net Balance</div>
                    <div className="net-card-val" style={{ color: net >= 0 ? "#3c5d74" : "#3c5d74" }}>{fmt(Math.abs(net))}</div>
                    <div style={{ fontSize: 12, color: "#5A7A90", marginTop: 3 }}>{net >= 0 ? "✓ Surplus this month" : "⚠ Deficit this month"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#5A7A90", marginBottom: 6 }}>Revenue vs Expenses</div>
                    <div style={{ height: 6, width: 140, background: "#eaf1f6", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round((totalRevenue / (totalRevenue + totalExpenses)) * 100)}%`, background: "linear-gradient(90deg,#3c5d74,#3c5d74)", borderRadius: 4 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#5A7A90" }}>
                      <span style={{ color: "#3c5d74", fontWeight: 600 }}>Rev {fmt(totalRevenue)}</span>
                      <span style={{ color: "#3c5d74", fontWeight: 600 }}>Exp {fmt(totalExpenses)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── EXPENSE SECTIONS (Accordion) ── */}
          <div className="fh-panel">
            <div className="fh-panel-head">
              <div className="fh-ph-left"><TrendingDown size={14} color="#fff" /><p className="fh-ph-title">Expense Details — Click to Expand</p></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 600 }}>Total: {fmt(totalExpenses)}</span>
                <button className="add-exp-btn" onClick={() => setShowModal(true)}>
                  <PlusCircle size={15} /> Add Expense
                </button>
              </div>
            </div>
            <div className="fh-panel-body" style={{ paddingTop: 16 }}>
              {mergedExpenseSections.map(sec => (
                <ExpenseSection key={sec.key} sec={sec} totalExpenses={totalExpenses} />
              ))}

              {/* Expense summary bar */}
              <div style={{ marginTop: 16, padding: "14px 16px", background: "linear-gradient(135deg,rgba(60,93,116,.08),rgba(60,93,116,.04))", borderRadius: 12, border: "1.5px solid rgba(60,93,116,.18)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3c5d74", textTransform: "uppercase", letterSpacing: ".7px" }}>Total Expenses</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#3c5d74", fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{fmt(totalExpenses)}</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {mergedExpenseSections.map(s => (
                    <div key={s.key} style={{ textAlign: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, margin: "0 auto 3px" }} />
                      <div style={{ fontSize: 10, color: "#5A7A90", fontWeight: 600, maxWidth: 60, lineHeight: 1.2 }}>{s.label.split(" ")[0]}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{fmt(s.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SUMMARY STRIP */}
          <div className="fh-strip">
            {[
              { lbl: "Total Revenue", val: fmt(totalRevenue) },
              { lbl: "Total Expenses", val: fmt(totalExpenses) },
              { lbl: "Pending Fees", val: fmt(pendingFees) },
              { lbl: "Net Balance", val: fmt(net) },
            ].map((s, i, arr) => (
              <React.Fragment key={i}>
                <div className="fh-strip-item">
                  <div className="fh-strip-lbl">{s.lbl}</div>
                  <div className="fh-strip-val">{s.val}</div>
                </div>
                {i < arr.length - 1 && <div className="fh-strip-div" />}
              </React.Fragment>
            ))}
          </div>

        </div>
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <AddExpensesModal
          expenseSections={mergedExpenseSections}
          onClose={() => setShowModal(false)}
          onAdd={handleAddExpense}
        />
      )}
    </PageLayout>
  );
}