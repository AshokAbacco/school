import { Search, IndianRupee, CalendarDays, FileText, Pencil, Trash2, History, Eye, GraduationCap, TrendingUp, TrendingDown, Users, ClipboardList, Banknote, Landmark, Star, Building2, Minus, Briefcase, ShieldAlert, HandCoins, CheckCircle2, Send, Printer, ListOrdered, CalendarCheck, BarChart3, Plus, X, Check, ChevronDown, ChevronUp, Wrench, Package, Zap, Droplets, Monitor, BookOpen, Layers, Wallet, Bus, Receipt } from "lucide-react";
import PageLayout from "../../components/PageLayout";
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import GroupASalary from "./GroupASalary";
import GroupBSalary from "./GroupBSalary";
import GroupCSalary from "./GroupCSalary";
import GroupDSalary from "./GroupDSalary";


// ── EXPENSE MODAL HELPERS ────────────────────────────────────────────────────
const fmtExp = (n) => "₹" + Number(n).toLocaleString("en-IN");

const iconOptions = [
    { key: "Wrench", icon: Wrench }, { key: "Package", icon: Package }, { key: "Zap", icon: Zap },
    { key: "Droplets", icon: Droplets }, { key: "Monitor", icon: Monitor }, { key: "FileText", icon: FileText },
    { key: "Users", icon: Users }, { key: "BookOpen", icon: BookOpen }, { key: "Building2", icon: Building2 },
    { key: "Layers", icon: Layers }, { key: "GraduationCap", icon: GraduationCap }, { key: "Wallet", icon: Wallet },
];


function AddExpensesModal({ expenseSections, onClose, onAdd }) {
    const [tab, setTab] = useState("view");
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
        onAdd({ isNewSection: customNewSection, sectionKey: customNewSection ? null : selectedSection, newSectionLabel: newSectionLabel.trim(), label: customLabel.trim(), amount, icon: iconObj.icon });
        setSuccess(true);
        setTimeout(() => { setSuccess(false); setCustomLabel(""); setCustomAmount(""); setCustomNewSection(false); setNewSectionLabel(""); setTab("view"); }, 1400);
    };

    const totalExp = expenseSections.reduce((s, e) => s + e.total, 0);

    return (
        <div className="aem-overlay" onClick={onClose}>
            <div className="aem-box" onClick={e => e.stopPropagation()}>
                <div className="aem-head">
                    <div className="aem-head-left">
                        <div className="aem-head-ico"><TrendingDown size={18} color="#fff" /></div>
                        <div>
                            <div className="aem-head-title">Expense Manager</div>
                            <div className="aem-head-sub">View all expenses or add a new one</div>
                        </div>
                    </div>
                    <button className="aem-close-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="aem-tabs">
                    <button className={`aem-tab ${tab === "view" ? "active" : ""}`} onClick={() => setTab("view")}><BarChart3 size={14} /> All Expenses</button>
                    <button className={`aem-tab ${tab === "add" ? "active" : ""}`} onClick={() => setTab("add")}><Plus size={14} /> Add New Expense</button>
                </div>
                <div className="aem-body">
                    {tab === "view" && (
                        <div>
                            <div className="aem-total-pill">
                                <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px" }}>Total Expenses</span>
                                <span style={{ fontSize: 20, color: "#fff", fontWeight: 700 }}>{fmtExp(totalExp)}</span>
                            </div>
                            {expenseSections.map(sec => (
                                <div key={sec.key} className="aem-sec">
                                    <button className="aem-sec-head" onClick={() => setExpandedSec(expandedSec === sec.key ? null : sec.key)}>
                                        <div className="aem-sec-left">
                                            <div className="aem-sec-ico" style={{ background: sec.color + "20", color: sec.color }}><sec.icon size={15} /></div>
                                            <span className="aem-sec-label">{sec.label}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span className="aem-sec-amt">{fmtExp(sec.total)}</span>
                                            <span className="aem-sec-pct">{Math.round((sec.total / totalExp) * 100)}%</span>
                                            {expandedSec === sec.key ? <ChevronUp size={14} color="#5A7A90" /> : <ChevronDown size={14} color="#5A7A90" />}
                                        </div>
                                    </button>
                                    {expandedSec === sec.key && (
                                        <div className="aem-sec-items">
                                            {sec.items.map((item, i) => (
                                                <div key={i} className="aem-item-row">
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div className="aem-item-dot" style={{ background: sec.color }} />
                                                        <div className="aem-item-ico" style={{ color: sec.color }}><item.icon size={12} /></div>
                                                        <span className="aem-item-label">{item.label}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div className="aem-item-bar-wrap"><div className="aem-item-bar" style={{ width: `${Math.round((item.amount / sec.total) * 100)}%`, background: sec.color }} /></div>
                                                        <span className="aem-item-amt">{fmtExp(item.amount)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="aem-sec-total"><span>Section Total</span><span style={{ color: sec.color }}>{fmtExp(sec.total)}</span></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === "add" && (
                        <div className="aem-form">
                            {success ? (
                                <div className="aem-success">
                                    <div className="aem-success-ico"><Check size={28} color="#fff" /></div>
                                    <div className="aem-success-msg">Expense Added Successfully!</div>
                                </div>
                            ) : (
                                <>
                                    <div className="aem-toggle-row">
                                        <span className="aem-field-label">Add to</span>
                                        <div className="aem-toggle">
                                            <button className={`aem-toggle-btn ${!customNewSection ? "active" : ""}`} onClick={() => setCustomNewSection(false)}>Existing Category</button>
                                            <button className={`aem-toggle-btn ${customNewSection ? "active" : ""}`} onClick={() => setCustomNewSection(true)}>New Category</button>
                                        </div>
                                    </div>
                                    {!customNewSection ? (
                                        <div className="aem-field">
                                            <label className="aem-field-label">Select Category</label>
                                            <select className="aem-select" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
                                                {expenseSections.map(s => <option key={s.key} value={s.key}>{s.label} — {fmtExp(s.total)}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="aem-field">
                                            <label className="aem-field-label">New Category Name</label>
                                            <input className="aem-input" placeholder="e.g. Events & Activities" value={newSectionLabel} onChange={e => setNewSectionLabel(e.target.value)} />
                                        </div>
                                    )}
                                    <div className="aem-field">
                                        <label className="aem-field-label">Expense Description</label>
                                        <input className="aem-input" placeholder="e.g. Annual Day Decorations" value={customLabel} onChange={e => setCustomLabel(e.target.value)} />
                                    </div>
                                    <div className="aem-field">
                                        <label className="aem-field-label">Amount (₹)</label>
                                        <div style={{ position: "relative" }}>
                                            <span className="aem-rupee">₹</span>
                                            <input className="aem-input aem-input-money" placeholder="0" value={customAmount} onChange={e => setCustomAmount(e.target.value.replace(/[^0-9]/g, ""))} type="number" min="1" />
                                        </div>
                                    </div>
                                    <div className="aem-field">
                                        <label className="aem-field-label">Icon</label>
                                        <div className="aem-icon-grid">
                                            {iconOptions.map(({ key, icon: Icon }) => (
                                                <button key={key} className={`aem-icon-btn ${selectedIcon === key ? "active" : ""}`} onClick={() => setSelectedIcon(key)} title={key}><Icon size={16} /></button>
                                            ))}
                                        </div>
                                    </div>
                                    <button className="aem-submit-btn" onClick={handleAdd} disabled={!customLabel.trim() || !customAmount || (customNewSection && !newSectionLabel.trim())}>
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

export default function TeacherSalaryManagement() {
    const [activeGroup, setActiveGroup] = useState("A");

    const [search, setSearch] = useState("");
    const [schoolTeachers, setSchoolTeachers] = useState([]);
    const [dropdownTeachers, setDropdownTeachers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [bonus, setBonus] = useState(0);
    const [deduction, setDeduction] = useState(0);
    const [schools, setSchools] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState("");
    const [editModal, setEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [historyModal, setHistoryModal] = useState(false);
    const [slipModal, setSlipModal] = useState(false);
    const [selectedSalary, setSelectedSalary] = useState(null);
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [historySearch, setHistorySearch] = useState("");
    const pdfRef = useRef();
    const [allSalaryHistory, setAllSalaryHistory] = useState([]);

    const downloadPayslip = async () => {
        if (!selectedSalary) return;
        const element = pdfRef.current;
        if (!element) { alert("Payslip template not loaded"); return; }
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
        pdf.save(`Payslip-${selectedSalary.teacher.firstName}.pdf`);
    };

    const openEditModal = (salary) => {
        setSelectedSalary({ id: salary.id, teacherId: salary.teacher?.id });
        setBonus(salary.bonus ?? 0);
        setDeduction(salary.deductions ?? 0);
        setEditModal(true);
    };
    const openDeleteModal = (salary) => { setSelectedSalary({ id: salary.id }); setDeleteModal(true); };
    const openHistoryModal = async (salary) => {
        setSelectedSalary(salary);
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/teachers/salary/history/${salary.teacher?.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setSalaryHistory(data);
        setHistoryModal(true);
    };
    const openSlipModal = (salary) => { setSelectedSalary(salary); setSlipModal(true); };

    const updateSalary = async () => {
        if (!selectedSalary?.id) return;
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/teachers/salary/update/${selectedSalary.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ bonus, deductions: deduction })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        alert("Salary Updated Successfully");
        setEditModal(false);
        await refreshTeachers(schoolId);
        await fetchAllSalaryHistory(schoolId);
    };

    const deleteSalary = async () => {
        if (!selectedSalary?.id) return;
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/teachers/salary/delete/${selectedSalary.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        alert("Salary Deleted Successfully");
        setDeleteModal(false);
        await refreshTeachers(schoolId);
        await fetchAllSalaryHistory(schoolId);
    };

    const createSalary = async () => {
        if (!selectedTeacher) { alert("Please select teacher"); return; }
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/api/teachers/salary/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                teacherId: selectedTeacher,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                bonus,
                deductions: deduction
            })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        alert("Salary Created Successfully");
        setSelectedTeacher(""); setBonus(0); setDeduction(0); setShowModal(false);
        await refreshTeachers(schoolId);
        await fetchAllSalaryHistory(schoolId);
    };


    const fetchSchools = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/api/teachers/salary/schools", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setSchools(data);
    };

    const fetchTeachersBySchool = async (id) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/teachers/salary/teachers-by-school/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { setDropdownTeachers([]); return; }
        const data = await res.json();
        setDropdownTeachers(data);
    };

    const payTeacherSalary = async (salaryId) => {

        const token = localStorage.getItem("token");

        const res = await fetch(
            `http://localhost:5000/api/teachers/salary/pay/${salaryId}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        alert("Salary Paid Successfully");

        await refreshTeachers(schoolId);
        await fetchAllSalaryHistory(schoolId);
    };

    useEffect(() => { fetchSchools(); }, []);
    useEffect(() => {
        const savedSchoolId = localStorage.getItem("selectedSchoolId");
        if (savedSchoolId) {
            setSchoolId(savedSchoolId);
            refreshTeachers(savedSchoolId);
            fetchTeachersBySchool(savedSchoolId);
        }
    }, []);
    useEffect(() => {
        const shouldRefresh = localStorage.getItem("refreshSalaryPage");
        if (shouldRefresh === "true" && schoolId) {
            refreshTeachers(schoolId);
            localStorage.removeItem("refreshSalaryPage");
        }
    }, [schoolId]);

    const refreshTeachers = async (id) => {
        if (!id) { console.log("School ID missing"); return; }
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/api/teachers/salary/list/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) { console.error("API Error:", res.status); setSchoolTeachers([]); return; }
            const data = await res.json();
            console.log("Teachers API Response:", data);
            setSchoolTeachers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    const filtered = schoolTeachers.filter(t =>
        `${t.teacher?.firstName} ${t.teacher?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        t.teacher?.user?.email?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredHistory = allSalaryHistory
        .filter(t => t.status === "PAID")
        .filter(t =>
            `${t.teacher?.firstName} ${t.teacher?.lastName}`.toLowerCase().includes(historySearch.toLowerCase()) ||
            t.teacher?.user?.email?.toLowerCase().includes(historySearch.toLowerCase())
        );

    const fetchAllSalaryHistory = async (id) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/teachers/salary/history-by-school/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setAllSalaryHistory(data);
    };

    const filteredDropdownTeachers = dropdownTeachers;

    const groups = [
        { id: "A", label: "Group A Staff", subtitle: "Senior Faculty" },
        { id: "B", label: "Group B Staff", subtitle: "Junior Faculty" },
        { id: "C", label: "Group C Staff", subtitle: "Support Staff" },
        { id: "D", label: "Group D Staff", subtitle: "Administrative" },
    ];

    return (
        <PageLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

                :root {
                    --b:  #27435B;
                    --bd: #1C3044;
                    --bp: #162535;
                    --bl: #4A6B80;
                    --bm: #EAF1F6;
                    --bf: #C8DCEC;
                }

                .tsm-wrap * { box-sizing: border-box; font-family: 'Inter', sans-serif; }

                .tsm-wrap {
                    background: linear-gradient(145deg, #dde9f2 0%, #c8dce9 40%, #b8cfe0 100%);
                    min-height: 100vh;
                    padding: 28px 32px;
                }

                /* ── GROUP TABS ── */
                .tsm-tabs-bar {
                    display: flex;
                    gap: 0;
                    margin-bottom: 24px;
                    background: rgba(255,255,255,0.55);
                    border-radius: 16px;
                    padding: 6px;
                    box-shadow: 0 2px 12px rgba(39,67,91,0.1);
                    width: fit-content;
                }
                .tsm-tab {
                    padding: 10px 28px;
                    border: none;
                    border-radius: 11px;
                    background: transparent;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--bl);
                    transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    min-width: 120px;
                    position: relative;
                }
                .tsm-tab:hover:not(.tsm-tab-active) {
                    background: rgba(39,67,91,0.08);
                    color: var(--b);
                }
                .tsm-tab-active {
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    color: #fff !important;
                    box-shadow: 0 4px 14px rgba(39,67,91,0.28);
                }
                .tsm-tab-label { font-size: 13px; font-weight: 700; }
                .tsm-tab-sub {
                    font-size: 10px;
                    font-weight: 500;
                    opacity: 0.75;
                    letter-spacing: 0.3px;
                }
                .tsm-tab-active .tsm-tab-sub { opacity: 0.7; color: #fff; }

                /* ── HEADER ── */
                .tsm-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 26px;
                    flex-wrap: wrap;
                    gap: 14px;
                }
                .tsm-title-row { display: flex; align-items: center; gap: 14px; }
                .tsm-icon-box {
                    width: 48px; height: 48px; border-radius: 13px;
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 14px rgba(39,67,91,0.38);
                }
                .tsm-h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--bp); letter-spacing: -0.3px; }
                .tsm-sub { margin: 0; font-size: 12px; color: var(--bl); font-style: italic; }

                .tsm-search-wrap { position: relative; }
                .tsm-search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--bl); pointer-events: none; }
                .tsm-search-inp {
                    padding: 9px 14px 9px 36px;
                    border: 1.5px solid var(--bf);
                    border-radius: 10px;
                    background: rgba(255,255,255,0.82);
                    font-size: 13px;
                    color: var(--bp);
                    width: 250px;
                    outline: none;
                }
                .tsm-search-inp:focus { border-color: var(--b); background: #fff; }

                .tsm-add-btn {
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    padding: 9px 20px;
                    font-size: 13.5px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 3px 12px rgba(39,67,91,0.3);
                    display: flex; align-items: center; gap: 7px;
                    transition: opacity .15s;
                }
                .tsm-add-btn:hover { opacity: .88; }

                /* ── STAT CARDS ── */
                .tsm-cards { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 22px; }
                .tsm-card {
                    background: rgba(255,255,255,0.92);
                    border-radius: 16px;
                    padding: 18px 20px;
                    box-shadow: 0 2px 12px rgba(39,67,91,0.1);
                    border-left: 5px solid #27435B;
                    position: relative; overflow: hidden;
                }
                .tsm-card::after {
                    content: '';
                    position: absolute; right: -18px; top: -18px;
                    width: 80px; height: 80px;
                    border-radius: 50%;
                    background: #27435B;
                    opacity: .08;
                }
                .tsm-card-lbl { font-size: 11px; font-weight: 700; color: var(--bl); text-transform: uppercase; letter-spacing: .9px; margin-bottom: 6px; }
                .tsm-card-val { font-size: 22px; font-weight: 700; color: var(--bp); }
                .tsm-card-ico {
                    position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
                    width: 38px; height: 38px; border-radius: 10px;
                    background: #27435B;
                    opacity: .18;
                }

                /* ── PANEL ── */
                .tsm-panel {
                    background: rgba(255,255,255,0.93);
                    border-radius: 16px;
                    box-shadow: 0 2px 12px rgba(39,67,91,0.09);
                    margin-bottom: 18px;
                    overflow: hidden;
                }
                .tsm-panel-head {
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    padding: 13px 22px;
                    display: flex; align-items: center; gap: 9px;
                }
                .tsm-panel-head.red { background: linear-gradient(135deg, #27435B, #1C3044); }
                .tsm-panel-title { color: #fff; font-size: 14px; font-weight: 700; margin: 0; }
                .tsm-panel-body { padding: 4px 22px 18px; }

                /* ── TWO COL ── */
                .tsm-two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }

                /* ── TABLE ── */
                .tsm-tbl { width: 100%; border-collapse: collapse; font-size: 13.5px; }
                .tsm-tbl th {
                    text-align: left;
                    padding: 14px 0 9px;
                    border-bottom: 2px solid var(--bf);
                    color: var(--bl);
                    font-size: 11px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: .7px;
                }
                .tsm-tbl td {
                    padding: 11px 0;
                    border-bottom: 1px solid var(--bm);
                    color: var(--bp);
                    vertical-align: middle;
                }
                .tsm-tbl tr:last-child td { border-bottom: none; }
                .tsm-tbl tr:hover td { background: #f4f9fc; }

                .tsm-amt-pos { font-weight: 600; color: #27435B; }
                .tsm-amt-neg { font-weight: 700; color: #27435B; }
                .tsm-amt-pri { font-weight: 600; color: var(--b); }

                .tsm-badge {
                    display: inline-block; padding: 3px 11px;
                    border-radius: 20px; font-size: 11.5px; font-weight: 600;
                }
                .tsm-badge-dept { color: var(--b); background: rgba(39,67,91,.12); }
                .tsm-badge-paid { color: var(--b); background: rgba(39,67,91,.12); }

                /* ── ACTION ICONS ── */
                .tsm-actions { display: flex; gap: 6px; }
                .tsm-act {
                    width: 30px; height: 30px; border-radius: 8px; border: none;
                    display: inline-flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: opacity .15s;
                }
                .tsm-act:hover { opacity: .75; }
                .tsm-act-edit { background: rgba(39,67,91,.15); color: var(--b); }
                .tsm-act-del  { background: rgba(39,67,91,.18); color: var(--bd); }
                .tsm-act-hist { background: rgba(39,67,91,.12); color: var(--b); }
                .tsm-act-view { background: rgba(39,67,91,.10); color: var(--bl); }

                /* ── FOOTER BTNS ── */
                .tsm-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 4px; }
                .tsm-btn-outline {
                    border: 1.5px solid var(--bf); background: rgba(255,255,255,.8);
                    color: var(--b); border-radius: 10px; padding: 9px 18px;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    display: flex; align-items: center; gap: 6px; transition: all .15s;
                }
                .tsm-btn-outline:hover { background: #fff; border-color: var(--b); }
                .tsm-btn-primary {
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    border: none; color: #fff; border-radius: 10px;
                    padding: 9px 24px; font-size: 13px; font-weight: 600;
                    cursor: pointer; box-shadow: 0 3px 10px rgba(39,67,91,.24); transition: opacity .15s;
                }
                .tsm-btn-primary:hover { opacity: .88; }

                /* ── MODAL ── */
                .tsm-overlay {
                    position: fixed; inset: 0;
                    background: rgba(18,35,48,.58);
                    backdrop-filter: blur(5px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                }
                .tsm-modal {
                    background: #fff;
                    border-radius: 20px;
                    box-shadow: 0 24px 70px rgba(39,67,91,.32);
                    position: relative;
                    overflow: hidden;
                    animation: tsm-pop .18s ease;
                }
                @keyframes tsm-pop {
                    from { transform: scale(.93); opacity: 0; }
                    to   { transform: scale(1);   opacity: 1; }
                }
                .tsm-modal-head {
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    padding: 16px 22px;
                    display: flex; align-items: center; justify-content: space-between;
                }
                .tsm-modal-head.danger { background: linear-gradient(135deg, #27435B, #1C3044); }
                .tsm-modal-title { color: #fff; font-size: 16px; font-weight: 700; margin: 0; }
                .tsm-modal-close {
                    background: rgba(255,255,255,.18); border: none; color: #fff;
                    border-radius: 7px; width: 30px; height: 30px; cursor: pointer;
                    font-size: 15px; display: flex; align-items: center; justify-content: center;
                }
                .tsm-modal-body { padding: 22px 24px; }
                .tsm-modal-foot {
                    padding: 14px 24px;
                    border-top: 1px solid var(--bm);
                    display: flex; justify-content: flex-end; gap: 10px;
                }

                .tsm-label { font-size: 11.5px; font-weight: 700; color: var(--bl); text-transform: uppercase; letter-spacing: .6px; display: block; margin-bottom: 5px; }
                .tsm-input, .tsm-select {
                    width: 100%; padding: 10px 13px;
                    border: 1.5px solid var(--bf); border-radius: 9px;
                    font-size: 13.5px; color: var(--bp);
                    background: var(--bm); outline: none;
                    margin-bottom: 14px; transition: border-color .15s;
                }
                .tsm-input:focus, .tsm-select:focus { border-color: var(--b); background: #fff; }

                .tsm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

                .tsm-btn-cancel {
                    background: transparent; border: 1.5px solid var(--bf);
                    color: var(--bl); border-radius: 9px; padding: 8px 18px;
                    font-size: 13px; cursor: pointer; transition: all .15s;
                }
                .tsm-btn-cancel:hover { border-color: var(--bl); color: var(--b); }
                .tsm-btn-confirm {
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    border: none; color: #fff; border-radius: 9px;
                    padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s;
                }
                .tsm-btn-confirm:hover { opacity: .88; }
                .tsm-btn-confirm.danger { background: linear-gradient(135deg, #27435B, #1C3044); }
                .tsm-btn-confirm:disabled { opacity: .5; cursor: not-allowed; }

                /* ── PAYSLIP MODAL ── */
                .slip-modal-wrap { width: 600px; max-height: 90vh; overflow-y: auto; }
                .slip-preview { margin: 0; background: #fff; font-family: 'Inter', sans-serif; }

                .slip-letterhead {
                    background: linear-gradient(135deg, #1C3044 0%, #27435B 55%, #3A5E78 100%);
                    padding: 28px 32px 22px;
                    position: relative; overflow: hidden;
                }
                .slip-letterhead::before {
                    content: '';
                    position: absolute; top: -30px; right: -30px;
                    width: 140px; height: 140px; border-radius: 50%;
                    background: rgba(255,255,255,0.06);
                }
                .slip-letterhead::after {
                    content: '';
                    position: absolute; bottom: -40px; left: 60px;
                    width: 100px; height: 100px; border-radius: 50%;
                    background: rgba(255,255,255,0.04);
                }
                .slip-lh-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
                .slip-school-name { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.3px; margin: 0 0 3px; }
                .slip-school-addr { font-size: 12px; color: rgba(255,255,255,0.65); margin: 0; }
                .slip-payslip-label { text-align: right; }
                .slip-payslip-title { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.6); margin: 0 0 4px; }
                .slip-payslip-period { font-size: 16px; font-weight: 700; color: #fff; margin: 0; }
                .slip-divider-line { height: 1px; background: rgba(255,255,255,0.2); margin: 18px 0 14px; position: relative; z-index: 1; }
                .slip-lh-bottom { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; }
                .slip-emp-id { font-size: 11px; color: rgba(255,255,255,0.55); font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
                .slip-confidential { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 3px; }

                .slip-emp-strip {
                    background: var(--bm);
                    border-bottom: 1px solid var(--bf);
                    padding: 18px 32px;
                    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
                }
                .slip-emp-key { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--bl); margin-bottom: 3px; }
                .slip-emp-val { font-size: 13px; font-weight: 600; color: var(--bp); }

                .slip-body { padding: 24px 32px; }
                .slip-section-title { font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #fff; margin: 0; }
                .slip-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                .slip-col-head { padding: 9px 14px; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 7px; }
                .slip-col-head.earn { background: linear-gradient(135deg, #27435B, #1C3044); }
                .slip-col-head.dedu { background: linear-gradient(135deg, #1C3044, #27435B); }
                .slip-col-rows { border: 1px solid var(--bf); border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; }
                .slip-col-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 14px; font-size: 13px; border-bottom: 1px solid var(--bm); }
                .slip-col-row:last-child { border-bottom: none; }
                .slip-col-row:nth-child(even) { background: #f8fbfd; }
                .slip-row-label { color: #4A6878; font-weight: 500; }
                .slip-row-val-earn { color: #27435B; font-weight: 600; }
                .slip-row-val-dedu { color: #1C3044; font-weight: 600; }
                .slip-col-subtotal { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; font-size: 12.5px; font-weight: 700; border-top: 2px solid var(--bf); background: var(--bm); }
                .slip-subtotal-earn { color: #27435B; }
                .slip-subtotal-dedu { color: #1C3044; }

                .slip-net-bar {
                    background: linear-gradient(135deg, #1C3044, #27435B, #3A5E78);
                    border-radius: 12px; padding: 20px 28px;
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 20px; position: relative; overflow: hidden;
                }
                .slip-net-bar::before { content: ''; position: absolute; right: -20px; top: -20px; width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.07); }
                .slip-net-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7); letter-spacing: 1.5px; text-transform: uppercase; }
                .slip-net-amount { font-size: 30px; font-weight: 800; color: #fff; letter-spacing: -1px; }
                .slip-net-status { background: rgba(39,67,91,0.3); border: 1px solid rgba(39,67,91,0.5); color: #A8C8DC; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 5px 14px; border-radius: 20px; }

                .slip-sig-strip { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px solid var(--bf); padding: 16px 32px 20px; background: #fafcfe; }
                .slip-sig-item { text-align: center; }
                .slip-sig-line { width: 120px; height: 1px; background: var(--bf); margin: 28px auto 8px; }
                .slip-sig-label { font-size: 10.5px; font-weight: 600; color: var(--bl); text-transform: uppercase; letter-spacing: 0.8px; }
                .slip-footer-note { background: var(--bm); border-top: 1px solid var(--bf); padding: 10px 32px; font-size: 10.5px; color: var(--bl); text-align: center; font-style: italic; }

                .tsm-slip-bar {
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    border-radius: 10px; padding: 12px 18px;
                    display: flex; justify-content: space-between; align-items: center;
                    margin-top: 14px;
                }

                /* group tag badge on page */
                .tsm-group-tag {
                    display: inline-flex; align-items: center; gap: 7px;
                    background: linear-gradient(135deg, var(--b), var(--bd));
                    color: #fff; border-radius: 20px;
                    padding: 4px 14px 4px 10px;
                    font-size: 12px; font-weight: 700;
                    letter-spacing: 0.4px;
                    box-shadow: 0 2px 8px rgba(39,67,91,0.2);
                }
                .tsm-group-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: rgba(255,255,255,0.6);
                }

                /* ── EXPENSE MODAL ── */
                .aem-overlay { position:fixed; inset:0; background:rgba(18,35,48,.58); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; z-index:1100; padding:20px; animation:aemFade .2s ease; }
                @keyframes aemFade { from{opacity:0} to{opacity:1} }
                .aem-box { background:#fff; border-radius:20px; width:100%; max-width:560px; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 24px 70px rgba(39,67,91,.32); animation:aemSlide .22s ease; overflow:hidden; }
                @keyframes aemSlide { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
                .aem-head { background:linear-gradient(135deg,#1c3040,#2b4557); padding:17px 22px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
                .aem-head-left { display:flex; align-items:center; gap:13px; }
                .aem-head-ico { width:40px; height:40px; border-radius:11px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
                .aem-head-title { font-size:15px; font-weight:700; color:#fff; margin:0 0 2px; }
                .aem-head-sub { font-size:11.5px; color:rgba(255,255,255,.55); margin:0; }
                .aem-close-btn { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:rgba(255,255,255,.75); display:flex; align-items:center; justify-content:center; cursor:pointer; }
                .aem-close-btn:hover { background:rgba(255,255,255,.22); color:#fff; }
                .aem-tabs { display:flex; background:#f5f9fc; border-bottom:1px solid #e4eff6; flex-shrink:0; }
                .aem-tab { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:12px; font-size:13px; font-weight:600; color:#5A7A90; background:none; border:none; cursor:pointer; border-bottom:2.5px solid transparent; transition:all .15s; font-family:'Inter',sans-serif; }
                .aem-tab.active { color:#27435B; border-bottom-color:#27435B; background:rgba(39,67,91,.04); }
                .aem-body { overflow-y:auto; padding:18px 22px 22px; flex:1; }
                .aem-total-pill { background:linear-gradient(135deg,#27435B,#1C3044); border-radius:12px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
                .aem-sec { background:#f8fafc; border-radius:12px; margin-bottom:10px; overflow:hidden; border:1px solid #e4eff6; }
                .aem-sec-head { width:100%; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:13px 16px; font-family:'Inter',sans-serif; }
                .aem-sec-head:hover { background:rgba(39,67,91,.04); }
                .aem-sec-left { display:flex; align-items:center; gap:10px; }
                .aem-sec-ico { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; }
                .aem-sec-label { font-size:13.5px; font-weight:700; color:#1C3044; }
                .aem-sec-amt { font-size:14px; font-weight:700; color:#27435B; }
                .aem-sec-pct { font-size:11px; font-weight:700; color:#5A7A90; background:#eaf1f6; padding:2px 8px; border-radius:20px; }
                .aem-sec-items { padding:4px 16px 14px; border-top:1px solid #e4eff6; }
                .aem-item-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f5f9; }
                .aem-item-row:last-child { border-bottom:none; }
                .aem-item-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
                .aem-item-ico { width:24px; height:24px; border-radius:6px; background:#f0f5f9; display:flex; align-items:center; justify-content:center; }
                .aem-item-label { font-size:13px; font-weight:500; color:#2E3F50; }
                .aem-item-bar-wrap { width:60px; height:4px; background:#eaf1f6; border-radius:3px; overflow:hidden; }
                .aem-item-bar { height:100%; border-radius:3px; opacity:.6; }
                .aem-item-amt { font-size:12.5px; font-weight:700; color:#1C3044; min-width:72px; text-align:right; }
                .aem-sec-total { display:flex; justify-content:space-between; padding:8px 12px; margin-top:6px; background:#eaf1f6; border-radius:8px; font-size:12.5px; font-weight:700; color:#27435B; }
                .aem-form { display:flex; flex-direction:column; gap:16px; }
                .aem-field { display:flex; flex-direction:column; gap:6px; }
                .aem-field-label { font-size:11.5px; font-weight:700; color:#5A7A90; text-transform:uppercase; letter-spacing:.7px; }
                .aem-input { border:1.5px solid #C8DCEC; border-radius:10px; padding:10px 14px; font-size:14px; font-family:'Inter',sans-serif; color:#1C3044; outline:none; background:#fff; width:100%; }
                .aem-input:focus { border-color:#27435B; }
                .aem-input-money { padding-left:32px; }
                .aem-rupee { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:15px; font-weight:700; color:#5A7A90; pointer-events:none; }
                .aem-select { border:1.5px solid #C8DCEC; border-radius:10px; padding:10px 14px; font-size:14px; font-family:'Inter',sans-serif; color:#1C3044; outline:none; background:#fff; cursor:pointer; width:100%; }
                .aem-select:focus { border-color:#27435B; }
                .aem-toggle-row { display:flex; align-items:center; gap:14px; }
                .aem-toggle { display:flex; background:#eaf1f6; border-radius:9px; padding:3px; gap:3px; }
                .aem-toggle-btn { background:none; border:none; border-radius:7px; padding:7px 14px; font-size:12.5px; font-weight:600; color:#5A7A90; cursor:pointer; font-family:'Inter',sans-serif; transition:all .15s; }
                .aem-toggle-btn.active { background:#fff; color:#27435B; box-shadow:0 1px 6px rgba(39,67,91,.12); }
                .aem-icon-grid { display:flex; flex-wrap:wrap; gap:8px; }
                .aem-icon-btn { width:38px; height:38px; border-radius:9px; border:1.5px solid #C8DCEC; background:#f8fafc; color:#5A7A90; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
                .aem-icon-btn.active { border-color:#27435B; background:#27435B; color:#fff; }
                .aem-submit-btn { display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg,#27435B,#1C3044); color:#fff; border:none; border-radius:11px; padding:13px; font-size:14px; font-weight:700; font-family:'Inter',sans-serif; cursor:pointer; box-shadow:0 4px 14px rgba(39,67,91,.25); margin-top:4px; }
                .aem-submit-btn:hover:not(:disabled) { opacity:.88; }
                .aem-submit-btn:disabled { opacity:.45; cursor:not-allowed; }
                .aem-success { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:48px 20px; }
                .aem-success-ico { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#27435B,#1C3044); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(39,67,91,.35); animation:aemPop .3s ease; }
                @keyframes aemPop { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
                .aem-success-msg { font-size:16px; font-weight:700; color:#1C3044; }
            `}</style>

            <div className="tsm-wrap">

                {/* ── GROUP TABS ── */}
                <div className="tsm-tabs-bar">
                    {groups.map(g => (
                        <button
                            key={g.id}
                            className={`tsm-tab ${activeGroup === g.id ? "tsm-tab-active" : ""}`}
                            onClick={() => setActiveGroup(g.id)}
                        >
                            <span className="tsm-tab-label">{g.label}</span>
                            <span className="tsm-tab-sub">{g.subtitle}</span>
                        </button>
                    ))}
                </div>

                {/* ── GROUP B / C / D rendered inline ── */}
                {activeGroup === "B" && <GroupBSalary />}
                {activeGroup === "C" && <GroupCSalary />}
                {activeGroup === "D" && <GroupDSalary />}

                {/* ── GROUP A CONTENT ── */}
                {activeGroup === "A" && (<>

                    {/* ── HEADER ── */}
                    <div className="tsm-header">
                        <div className="tsm-title-row">
                            <div className="tsm-icon-box"><GraduationCap size={24} color="#fff" /></div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                    <p className="tsm-h1">Group A - Salary Management</p>
                                    <span className="tsm-group-tag">
                                        <span className="tsm-group-dot" />
                                        Group {activeGroup} Staff
                                    </span>
                                </div>
                                <p className="tsm-sub">Payroll &amp; Compensation Records</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <div className="tsm-search-wrap">
                                <Search size={15} className="tsm-search-ico" />
                                <input
                                    className="tsm-search-inp"
                                    placeholder="Search teacher name or email…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            <button className="tsm-add-btn" onClick={() => setShowModal(true)}>
                                + Add Teacher
                            </button>
                        </div>
                    </div>

                    {/* ── KPI STRIP ── */}
                    <div className="tsm-cards">
                        {[
                            { lbl: "Monthly Gross Payout", val: "₹4,50,000" },
                            { lbl: "Net Salaries Paid", val: "₹4,20,000" },
                            { lbl: "Total Deductions", val: "₹30,000" },
                            { lbl: "Pending Approvals", val: "3 Salaries" },
                        ].map((c, i) => (
                            <div key={i} className="tsm-card">
                                <div className="tsm-card-lbl">{c.lbl}</div>
                                <div className="tsm-card-val">{c.val}</div>
                                <div className="tsm-card-ico" />
                            </div>
                        ))}
                    </div>

                    {/* ── ROW: SALARY STRUCTURE + DEDUCTIONS ── */}
                    <div className="tsm-two">
                        {/* 💵 SALARY STRUCTURE */}
                        <div className="tsm-panel">
                            <div className="tsm-panel-head">
                                <Banknote size={15} color="#fff" />
                                <p className="tsm-panel-title">💵 Salary Structure</p>
                            </div>
                            <div className="tsm-panel-body" style={{ paddingTop: 14 }}>
                                {[
                                    { label: "Basic Pay", amount: 30000, icon: Landmark, pct: 50 },
                                    { label: "HRA", amount: 10000, icon: Building2, pct: 17 },
                                    { label: "DA", amount: 8000, icon: TrendingUp, pct: 13 },
                                    { label: "Bonus", amount: 7000, icon: Star, pct: 12 },
                                    { label: "Incentives", amount: 5000, icon: HandCoins, pct: 8 },
                                ].map((item, i) => (
                                    <div key={i} style={{ marginBottom: 14 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(39,67,91,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <item.icon size={15} color="#27435B" />
                                                </div>
                                                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#162535" }}>{item.label}</span>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: "#27435B" }}>₹{item.amount.toLocaleString()}</span>
                                                <span style={{ fontSize: 11, color: "#4A6B80", marginLeft: 5 }}>({item.pct}%)</span>
                                            </div>
                                        </div>
                                        <div style={{ height: 7, background: "#C8DCEC", borderRadius: 8, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${item.pct}%`, borderRadius: 8, background: "linear-gradient(90deg,#27435B,#3A5E78)", transition: "width .5s" }} />
                                        </div>
                                    </div>
                                ))}
                                <div style={{ background: "linear-gradient(135deg,#27435B,#1C3044)", borderRadius: 10, padding: "12px 16px", marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 600 }}>Total Gross Earnings</span>
                                    <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>₹{(30000 + 10000 + 8000 + 7000 + 5000).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* ➖ DEDUCTIONS */}
                        <div className="tsm-panel">
                            <div className="tsm-panel-head red">
                                <Minus size={15} color="#fff" />
                                <p className="tsm-panel-title">➖ Deductions</p>
                            </div>
                            <div className="tsm-panel-body" style={{ paddingTop: 14 }}>
                                {[
                                    { label: "PF (Provident Fund)", amount: 2000, icon: Landmark },
                                    { label: "Tax (TDS)", amount: 2000, icon: Briefcase },
                                    { label: "Leave Deduction", amount: 500, icon: CalendarDays },
                                    { label: "Late Penalty", amount: 1000, icon: ShieldAlert },
                                    { label: "Loan Deduction", amount: 3000, icon: Banknote },
                                ].map((item, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #E4EFF6" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(39,67,91,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <item.icon size={15} color="#27435B" />
                                            </div>
                                            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#162535" }}>{item.label}</span>
                                        </div>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1C3044" }}>− ₹{item.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                                <div style={{ background: "rgba(39,67,91,.08)", borderRadius: 10, padding: "12px 16px", marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(39,67,91,.18)" }}>
                                    <span style={{ color: "#27435B", fontSize: 13, fontWeight: 700 }}>Total Deductions</span>
                                    <span style={{ color: "#27435B", fontSize: 18, fontWeight: 700 }}>₹{(2000 + 2000 + 500 + 1000 + 3000).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 💳 SALARY PROCESSING */}
                    <div className="tsm-panel">
                        <div className="tsm-panel-head">
                            <Send size={15} color="#fff" />
                            <p className="tsm-panel-title">💳 Salary Processing</p>
                        </div>
                        <div className="tsm-panel-body" style={{ paddingTop: 20, paddingBottom: 24 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
                                {[
                                    { step: "01", label: "Monthly Salary\nCalculation", icon: ListOrdered, done: true },
                                    { step: "02", label: "Salary\nApproval", icon: CheckCircle2, done: true },
                                    { step: "03", label: "Bank\nTransfer", icon: Send, done: true },
                                    { step: "04", label: "Payslip\nGeneration", icon: Printer, done: false },
                                    { step: "05", label: "Salary\nHistory", icon: ClipboardList, done: false },
                                ].map((s, i, arr) => (
                                    <React.Fragment key={i}>
                                        <div style={{ textAlign: "center", position: "relative" }}>
                                            {i < arr.length - 1 && (
                                                <div style={{ position: "absolute", top: 22, left: "60%", width: "80%", height: 2, background: s.done ? "#27435B" : "#C8DCEC", zIndex: 0 }} />
                                            )}
                                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.done ? "linear-gradient(135deg,#27435B,#1C3044)" : "#EAF3F9", border: `2px solid ${s.done ? "#27435B" : "#C4D8E4"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", position: "relative", zIndex: 1, boxShadow: s.done ? "0 3px 10px rgba(39,67,91,0.35)" : "none" }}>
                                                <s.icon size={18} color={s.done ? "#fff" : "#A8C4D6"} />
                                            </div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: s.done ? "#27435B" : "#A8C4D6", letterSpacing: ".5px", marginBottom: 4 }}>STEP {s.step}</div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: s.done ? "#162535" : "#8AAFC0", lineHeight: 1.45, whiteSpace: "pre-line" }}>{s.label}</div>
                                            {s.done && (
                                                <div style={{ marginTop: 6 }}>
                                                    <span style={{ background: "rgba(39,67,91,.12)", color: "#27435B", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>✓ Done</span>
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* SALARY TABLE */}
                            <div className="tsm-panel">
                                <div className="tsm-panel-body">
                                    <div style={{ marginBottom: 16 }} />
                                    <table className="tsm-tbl">
                                        <thead>
                                            <tr>
                                                {["Name", "Email", "Subject", "Basic Salary", "Bonus", "Deductions", "Net Salary", "Status", "Actions"].map(h => (
                                                    <th key={h}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.length === 0 ? (
                                                <tr><td colSpan={9} style={{ textAlign: "center", color: "#4A6B80", padding: "30px 0" }}>No teachers found</td></tr>
                                            ) : filtered.map(t => (
                                                <tr key={t.id || t.teacherId}>
                                                    <td style={{ fontWeight: 600 }}>{t.teacher?.firstName} {t.teacher?.lastName}</td>
                                                    <td style={{ color: "#4A6B80" }}>{t.teacher?.user?.email}</td>
                                                    <td><span className="tsm-badge tsm-badge-dept">{t.teacher?.department || "—"}</span></td>
                                                    <td style={{ fontWeight: 600, color: "#27435B" }}>₹{Number(t.basicSalary || 0).toLocaleString()}</td>
                                                    <td style={{ color: "#27435B", fontWeight: 600 }}>₹{Number(t.bonus || 0).toLocaleString()}</td>
                                                    <td style={{ color: "#1C3044", fontWeight: 600 }}>₹{Number(t.deductions || 0).toLocaleString()}</td>
                                                    <td className="tsm-amt-pos">₹{Number(t.netSalary || 0).toLocaleString()}</td>
                                                    <td>
                                                        {t.status === "PAID" ? (
                                                            <span className="tsm-badge tsm-badge-paid">Paid</span>
                                                        ) : (
                                                            <button className="tsm-btn-confirm" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => payTeacherSalary(t.salaryId)}>Pay</button>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="tsm-actions">
                                                            <button className="tsm-act tsm-act-edit" onClick={() => openEditModal(t)}><Pencil size={13} /></button>
                                                            <button className="tsm-act tsm-act-del" onClick={() => openDeleteModal(t)}><Trash2 size={13} /></button>
                                                            <button className="tsm-act tsm-act-hist" onClick={() => openHistoryModal(t)}><History size={13} /></button>
                                                            <button className="tsm-act tsm-act-view" onClick={() => openSlipModal(t)}><Eye size={13} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Finance Actions Footer */}
                    <div className="tsm-footer">
                        <button className="tsm-btn-primary"><Send size={14} style={{ marginRight: 5 }} /> Process Bank Transfer</button>
                    </div>

                </>)} {/* end activeGroup === "A" */}

            </div>

            {/* ════ MODALS ════ */}

            {/* CREATE */}
            {showModal && (
                <div className="tsm-overlay" onClick={() => setShowModal(false)}>
                    <div className="tsm-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head">
                            <p className="tsm-modal-title">Create Teacher Salary</p>
                            <button className="tsm-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="tsm-modal-body">
                            <label className="tsm-label">School</label>
                            <select className="tsm-select" value={schoolId} onChange={e => {
                                const id = e.target.value; setSchoolId(id);
                                localStorage.setItem("selectedSchoolId", id);
                                setSelectedTeacher("");
                                if (id) { fetchTeachersBySchool(id); refreshTeachers(id); fetchAllSalaryHistory(id); }
                            }}>
                                <option value="">Select School</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <label className="tsm-label">Teacher</label>
                            <select className="tsm-select" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                                <option value="">Select Teacher</option>
                                {filteredDropdownTeachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                            </select>
                            <div className="tsm-grid2">
                                <div>
                                    <label className="tsm-label">Bonus (₹)</label>
                                    <input className="tsm-input" type="number" placeholder="0" onChange={e => setBonus(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="tsm-label">Deduction (₹)</label>
                                    <input className="tsm-input" type="number" placeholder="0" onChange={e => setDeduction(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                        <div className="tsm-modal-foot">
                            <button className="tsm-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="tsm-btn-confirm" onClick={createSalary} disabled={!selectedTeacher}>Create Salary</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT */}
            {editModal && (
                <div className="tsm-overlay" onClick={() => setEditModal(false)}>
                    <div className="tsm-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head">
                            <p className="tsm-modal-title">Edit Teacher Salary</p>
                            <button className="tsm-modal-close" onClick={() => setEditModal(false)}>✕</button>
                        </div>
                        <div className="tsm-modal-body">
                            <div className="tsm-grid2">
                                <div>
                                    <label className="tsm-label">Bonus (₹)</label>
                                    <input className="tsm-input" type="number" value={bonus} onChange={e => setBonus(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="tsm-label">Deduction (₹)</label>
                                    <input className="tsm-input" type="number" value={deduction} onChange={e => setDeduction(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                        <div className="tsm-modal-foot">
                            <button className="tsm-btn-cancel" onClick={() => setEditModal(false)}>Cancel</button>
                            <button className="tsm-btn-confirm" onClick={updateSalary}>Update Salary</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE */}
            {deleteModal && (
                <div className="tsm-overlay" onClick={() => setDeleteModal(false)}>
                    <div className="tsm-modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head danger">
                            <p className="tsm-modal-title">Confirm Deletion</p>
                            <button className="tsm-modal-close" onClick={() => setDeleteModal(false)}>✕</button>
                        </div>
                        <div className="tsm-modal-body" style={{ textAlign: "center", padding: "28px 24px" }}>
                            <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
                            <p style={{ color: "#3D4F5C", lineHeight: 1.6, margin: 0 }}>
                                Are you sure you want to delete this salary record?<br />This action cannot be undone.
                            </p>
                        </div>
                        <div className="tsm-modal-foot">
                            <button className="tsm-btn-cancel" onClick={() => setDeleteModal(false)}>Cancel</button>
                            <button className="tsm-btn-confirm danger" onClick={deleteSalary}>Delete Record</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY */}
            {historyModal && (
                <div className="tsm-overlay" onClick={() => setHistoryModal(false)}>
                    <div className="tsm-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head">
                            <p className="tsm-modal-title">Salary Details</p>
                            <button className="tsm-modal-close" onClick={() => setHistoryModal(false)}>✕</button>
                        </div>
                        <div className="tsm-modal-body">
                            <p style={{ fontWeight: 700, marginBottom: 15 }}>{selectedSalary?.teacher?.firstName} {selectedSalary?.teacher?.lastName}</p>
                            {salaryHistory.length === 0 ? (
                                <p style={{ textAlign: "center", color: "#4A6B80" }}>No salary history found</p>
                            ) : (
                                <table className="tsm-tbl">
                                    <thead>
                                        <tr>
                                            <th>Month</th><th>Year</th><th>Basic</th><th>Bonus</th><th>Deductions</th><th>Net Salary</th><th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salaryHistory.map(s => (
                                            <tr key={s.id}>
                                                <td>{new Date(0, s.month - 1).toLocaleString("default", { month: "long" })}</td>
                                                <td>{s.year}</td>
                                                <td>₹{Number(s.basicSalary).toLocaleString()}</td>
                                                <td style={{ color: "#27435B" }}>₹{Number(s.bonus).toLocaleString()}</td>
                                                <td style={{ color: "#1C3044" }}>₹{Number(s.deductions).toLocaleString()}</td>
                                                <td className="tsm-amt-pos">₹{Number(s.netSalary).toLocaleString()}</td>
                                                <td><span className="tsm-badge tsm-badge-paid">Success</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="tsm-modal-foot">
                            <button className="tsm-btn-cancel" onClick={() => setHistoryModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYSLIP VIEW */}
            {slipModal && (
                <div className="tsm-overlay" onClick={() => setSlipModal(false)}>
                    <div className="tsm-modal slip-modal-wrap" onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head" style={{ padding: "14px 22px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <FileText size={16} color="#fff" />
                                <p className="tsm-modal-title">Payslip Preview</p>
                            </div>
                            <button className="tsm-modal-close" onClick={() => setSlipModal(false)}>✕</button>
                        </div>

                        <div className="slip-preview">
                            {/* Letterhead */}
                            <div className="slip-letterhead">
                                <div className="slip-lh-top">
                                    <div>
                                        <p className="slip-school-name">ABC International School</p>
                                        <p className="slip-school-addr">Bengaluru, Karnataka — India</p>
                                    </div>
                                    <div className="slip-payslip-label">
                                        <p className="slip-payslip-title">Salary Slip</p>
                                        <p className="slip-payslip-period">{new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</p>
                                    </div>
                                </div>
                                <div className="slip-divider-line" />
                                <div className="slip-lh-bottom">
                                    <span className="slip-emp-id">Generated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                    <span className="slip-confidential">Confidential</span>
                                </div>
                            </div>

                            {/* Employee Strip */}
                            <div className="slip-emp-strip">
                                <div><div className="slip-emp-key">Employee Name</div><div className="slip-emp-val">{selectedSalary?.teacher?.firstName} {selectedSalary?.teacher?.lastName}</div></div>
                                <div><div className="slip-emp-key">Department</div><div className="slip-emp-val">{selectedSalary?.teacher?.department || "—"}</div></div>
                                <div><div className="slip-emp-key">Pay Period</div><div className="slip-emp-val">{new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</div></div>
                                <div style={{ gridColumn: "1 / -1" }}><div className="slip-emp-key">Email</div><div className="slip-emp-val" style={{ fontWeight: 500, color: "#4A6878" }}>{selectedSalary?.teacher?.user?.email}</div></div>
                            </div>

                            {/* Earnings + Deductions */}
                            <div className="slip-body">
                                <div className="slip-cols">
                                    <div>
                                        <div className="slip-col-head earn"><TrendingUp size={13} color="#fff" /><span className="slip-section-title">Earnings</span></div>
                                        <div className="slip-col-rows">
                                            <div className="slip-col-row"><span className="slip-row-label">Basic Salary</span><span className="slip-row-val-earn">₹{Number(selectedSalary?.basicSalary || 0).toLocaleString("en-IN")}</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">Bonus</span><span className="slip-row-val-earn">₹{Number(selectedSalary?.bonus || 0).toLocaleString("en-IN")}</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">HRA</span><span className="slip-row-val-earn">₹0</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">Other Allowances</span><span className="slip-row-val-earn">₹0</span></div>
                                        </div>
                                        <div className="slip-col-subtotal slip-subtotal-earn">
                                            <span>Gross Earnings</span>
                                            <span>₹{(Number(selectedSalary?.basicSalary || 0) + Number(selectedSalary?.bonus || 0)).toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="slip-col-head dedu"><TrendingDown size={13} color="#fff" /><span className="slip-section-title">Deductions</span></div>
                                        <div className="slip-col-rows">
                                            <div className="slip-col-row"><span className="slip-row-label">Total Deductions</span><span className="slip-row-val-dedu">₹{Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">PF (Provident Fund)</span><span className="slip-row-val-dedu">₹0</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">Tax (TDS)</span><span className="slip-row-val-dedu">₹0</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">Other</span><span className="slip-row-val-dedu">₹0</span></div>
                                        </div>
                                        <div className="slip-col-subtotal slip-subtotal-dedu">
                                            <span>Total Deductions</span>
                                            <span>₹{Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Salary Bar */}
                                <div className="slip-net-bar">
                                    <div>
                                        <div className="slip-net-label">Net Salary Payable</div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>For {new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div className="slip-net-amount">₹{Number(selectedSalary?.netSalary || 0).toLocaleString("en-IN")}</div>
                                        {selectedSalary?.status === "PAID" && <div style={{ marginTop: 6 }}><span className="slip-net-status">✓ Paid</span></div>}
                                    </div>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="slip-sig-strip">
                                {["Employee Signature", "HR Department", "Principal / Director"].map((lbl, i) => (
                                    <div key={i} className="slip-sig-item"><div className="slip-sig-line" /><div className="slip-sig-label">{lbl}</div></div>
                                ))}
                            </div>

                            <div className="slip-footer-note">
                                This is a system-generated payslip and does not require a physical signature. For queries, contact the HR department.
                            </div>
                        </div>

                        <div className="tsm-modal-foot">
                            <button className="tsm-btn-cancel" onClick={() => setSlipModal(false)}>Close</button>
                            <button className="tsm-btn-confirm" onClick={downloadPayslip}><Printer size={13} style={{ marginRight: 6 }} />Download PDF</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PDF TEMPLATE */}
            <div ref={pdfRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
                <div style={{ width: "794px", background: "#fff", fontFamily: "'Inter', Arial, sans-serif", color: "#162535" }}>
                    <div style={{ background: "linear-gradient(135deg, #1C3044 0%, #27435B 55%, #3A5E78 100%)", padding: "32px 40px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4 }}>ABC International School</div>
                                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Bengaluru, Karnataka — India</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 5 }}>Salary Slip</div>
                                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</div>
                            </div>
                        </div>
                        <div style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "0 0 14px" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.8px", textTransform: "uppercase" }}>Generated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.2)", padding: "3px 12px", borderRadius: 3 }}>Confidential</span>
                        </div>
                    </div>
                    <div style={{ background: "#EAF1F6", borderBottom: "1px solid #C8DCEC", padding: "20px 40px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                        {[
                            { key: "Employee Name", val: `${selectedSalary?.teacher?.firstName || ""} ${selectedSalary?.teacher?.lastName || ""}` },
                            { key: "Department", val: selectedSalary?.teacher?.department || "—" },
                            { key: "Pay Period", val: `${new Date().toLocaleString("default", { month: "long" })} ${new Date().getFullYear()}` },
                            { key: "Email", val: selectedSalary?.teacher?.user?.email || "—" },
                        ].map((f, i) => (
                            <div key={i}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: "#4A6B80", marginBottom: 3 }}>{f.key}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#1C3044", wordBreak: "break-all" }}>{f.val}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: "28px 40px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                            <div>
                                <div style={{ background: "linear-gradient(135deg,#27435B,#1C3044)", padding: "9px 14px", borderRadius: "8px 8px 0 0" }}><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#fff" }}>Earnings</span></div>
                                <div style={{ border: "1px solid #C8DCEC", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                                    {[
                                        { label: "Basic Salary", val: `₹${Number(selectedSalary?.basicSalary || 0).toLocaleString("en-IN")}` },
                                        { label: "Bonus", val: `₹${Number(selectedSalary?.bonus || 0).toLocaleString("en-IN")}` },
                                        { label: "HRA", val: "₹0" },
                                        { label: "Other", val: "₹0" },
                                    ].map((row, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", fontSize: 13, background: i % 2 === 1 ? "#f8fbfd" : "#fff", borderBottom: "1px solid #eef5fa" }}>
                                            <span style={{ color: "#4A6878" }}>{row.label}</span>
                                            <span style={{ color: "#27435B", fontWeight: 600 }}>{row.val}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 13, fontWeight: 700, borderTop: "2px solid #C8DCEC", background: "#EAF1F6" }}>
                                        <span style={{ color: "#27435B" }}>Gross Earnings</span>
                                        <span style={{ color: "#27435B" }}>₹{(Number(selectedSalary?.basicSalary || 0) + Number(selectedSalary?.bonus || 0)).toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div style={{ background: "linear-gradient(135deg,#1C3044,#27435B)", padding: "9px 14px", borderRadius: "8px 8px 0 0" }}><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#fff" }}>Deductions</span></div>
                                <div style={{ border: "1px solid #C8DCEC", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                                    {[
                                        { label: "Total Deductions", val: `₹${Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}` },
                                        { label: "PF", val: "₹0" },
                                        { label: "Tax (TDS)", val: "₹0" },
                                        { label: "Other", val: "₹0" },
                                    ].map((row, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", fontSize: 13, background: i % 2 === 1 ? "#f8fbfd" : "#fff", borderBottom: "1px solid #eef5fa" }}>
                                            <span style={{ color: "#4A6878" }}>{row.label}</span>
                                            <span style={{ color: "#1C3044", fontWeight: 600 }}>{row.val}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 13, fontWeight: 700, borderTop: "2px solid #C8DCEC", background: "rgba(39,67,91,.06)" }}>
                                        <span style={{ color: "#1C3044" }}>Total Deductions</span>
                                        <span style={{ color: "#1C3044" }}>₹{Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ background: "linear-gradient(135deg,#1C3044,#27435B,#3A5E78)", borderRadius: 12, padding: "22px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 4 }}>Net Salary Payable</div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>For {new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</div>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>₹{Number(selectedSalary?.netSalary || 0).toLocaleString("en-IN")}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, paddingTop: 8 }}>
                            {["Employee Signature", "HR Department", "Principal / Director"].map((label, i) => (
                                <div key={i} style={{ textAlign: "center" }}>
                                    <div style={{ width: 130, height: 1, background: "#C8DCEC", margin: "50px auto 10px" }} />
                                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#4A6B80", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ background: "#EAF1F6", borderTop: "1px solid #C8DCEC", padding: "12px 40px", fontSize: 10.5, color: "#4A6B80", textAlign: "center", fontStyle: "italic" }}>
                        This is a system-generated payslip and does not require a physical signature. For queries, contact the HR department.
                    </div>
                </div>
            </div>

            {/* ── TEACHER SALARY HISTORY (Group A only) ── */}
            {activeGroup === "A" && <div className="tsm-panel">
                <div className="tsm-panel-head" style={{ justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ClipboardList size={15} color="#fff" />
                        <p className="tsm-panel-title">Teacher Salary History</p>
                    </div>
                    <div className="tsm-search-wrap">
                        <Search size={14} className="tsm-search-ico" />
                        <input className="tsm-search-inp" placeholder="Search teacher name or email..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ width: 260, background: "rgba(255,255,255,.95)" }} />
                    </div>
                </div>
                <div className="tsm-panel-body">
                    <table className="tsm-tbl">
                        <thead>
                            <tr>
                                <th>Name</th><th>Email</th><th>Department</th><th>Month</th><th>Bonus</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.length === 0 ? (
                                <tr><td colSpan={9} style={{ textAlign: "center", padding: "30px 0", color: "#4A6B80" }}>No salary records found</td></tr>
                            ) : filteredHistory.map(t => (
                                <tr key={t.id || t.teacherId}>
                                    <td style={{ fontWeight: 600 }}>{t.teacher?.firstName} {t.teacher?.lastName}</td>
                                    <td style={{ color: "#4A6B80" }}>{t.teacher?.user?.email}</td>
                                    <td><span className="tsm-badge tsm-badge-dept">{t.teacher?.department || "—"}</span></td>
                                    <td>{new Date(0, t.month - 1).toLocaleString("default", { month: "short" })} {t.year}</td>
                                    <td style={{ color: "#27435B", fontWeight: 600 }}>₹{t.bonus || 0}</td>
                                    <td style={{ color: "#1C3044", fontWeight: 600 }}>₹{t.deductions || 0}</td>
                                    <td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            <span style={{ fontWeight: 600 }}>₹{Number(t.netSalary || 0).toLocaleString()}</span>
                                            {t.status !== "PAID" ? (
                                                <button className="tsm-btn-confirm" style={{ padding: "4px 12px", fontSize: 12 }} disabled={!t.id} onClick={() => payTeacherSalary(t.id)}>Pay</button>
                                            ) : (
                                                <span className="tsm-badge tsm-badge-paid">Paid</span>
                                            )}
                                        </div>
                                    </td>
                                    <td><span className="tsm-badge tsm-badge-paid">Success</span></td>
                                    <td>
                                        <div className="tsm-actions">
                                            <button className="tsm-act tsm-act-edit" onClick={() => openEditModal(t)}><Pencil size={13} /></button>
                                            <button className="tsm-act tsm-act-del" onClick={() => openDeleteModal(t)}><Trash2 size={13} /></button>
                                            <button className="tsm-act tsm-act-hist" onClick={() => openHistoryModal(t)}><History size={13} /></button>
                                            <button className="tsm-act tsm-act-view" onClick={() => openSlipModal(t)}><Eye size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>}


        </PageLayout>
    );
}