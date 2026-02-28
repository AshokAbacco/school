import { Search, IndianRupee, CalendarDays, FileText, Pencil, Trash2, History, Eye, GraduationCap, TrendingUp, TrendingDown, Users, ClipboardList, Banknote, Landmark, Star, Building2, Minus, Briefcase, ShieldAlert, HandCoins, CheckCircle2, Send, Printer, ListOrdered, CalendarCheck } from "lucide-react";
import PageLayout from "../../components/PageLayout";
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";

// ── COLOR PALETTE (from screenshot – steel/slate blue) ──────────────────────
//   Dark navy  : #2E4A5F
//   Primary    : #3D5F75
//   Mid        : #4A6F87
//   Accent     : #6A9AB0
//   Light bg   : #D6E6F0
//   Page bg    : #E8F0F6
//   White      : #FFFFFF
// ────────────────────────────────────────────────────────────────────────────

export default function TeacherSalaryManagement() {
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
    const pdfRef = useRef();       // ONLY for hidden PDF template
    const [allSalaryHistory, setAllSalaryHistory] = useState([]);
    const downloadPayslip = async () => {
        if (!selectedSalary) return;

        const element = pdfRef.current;
        if (!element) {
            alert("Payslip template not loaded");
            return;
        }

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true
        });

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

        const res = await fetch(
            `http://localhost:5000/api/teachers/salary/history/${salary.id}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

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
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/teachers/salary/list/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setSchoolTeachers(data);
    };

    const filtered = schoolTeachers.filter(t =>
        `${t.teacher?.firstName} ${t.teacher?.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
        t.teacher?.user?.email
            ?.toLowerCase()
            .includes(search.toLowerCase())
    );
    const filteredHistory = allSalaryHistory.filter(t =>
        `${t.teacher?.firstName} ${t.teacher?.lastName}`
            .toLowerCase()
            .includes(historySearch.toLowerCase()) ||
        t.teacher?.user?.email
            ?.toLowerCase()
            .includes(historySearch.toLowerCase())
    );
    const fetchAllSalaryHistory = async (id) => {
        const token = localStorage.getItem("token");

        const res = await fetch(
            `http://localhost:5000/api/teachers/salary/history-by-school/${id}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        const data = await res.json();
        setAllSalaryHistory(data);
    };
    useEffect(() => {
        const savedSchoolId = localStorage.getItem("selectedSchoolId");
        if (savedSchoolId) {
            setSchoolId(savedSchoolId);
            refreshTeachers(savedSchoolId);
            fetchTeachersBySchool(savedSchoolId);

            // 🔥 ADD THIS
            fetchAllSalaryHistory(savedSchoolId);
        }
    }, []);
    return (
        <PageLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

                .tsm-wrap * { box-sizing: border-box; font-family: 'Inter', sans-serif; }

                .tsm-wrap {
                    background: linear-gradient(145deg, #dde9f2 0%, #c8dce9 40%, #b8cfe0 100%);
                    min-height: 100vh;
                    padding: 28px 32px;
                }

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
                    background: linear-gradient(135deg, #3D5F75, #2E4A5F);
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 14px rgba(46,74,95,0.38);
                    font-size: 22px;
                }
                .tsm-h1 { margin: 0; font-size: 22px; font-weight: 700; color: #1C3445; letter-spacing: -0.3px; }
                .tsm-sub { margin: 0; font-size: 12px; color: #5A7A8F; font-style: italic; }

                .tsm-search-wrap { position: relative; }
                .tsm-search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #6A9AB0; pointer-events: none; }
                .tsm-search-inp {
                    padding: 9px 14px 9px 36px;
                    border: 1.5px solid #A8C4D6;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.82);
                    font-size: 13px;
                    color: #1C3445;
                    width: 250px;
                    outline: none;
                }
                .tsm-search-inp:focus { border-color: #3D5F75; background: #fff; }

                .tsm-add-btn {
                    background: linear-gradient(135deg, #3D5F75, #2E4A5F);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    padding: 9px 20px;
                    font-size: 13.5px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 3px 12px rgba(46,74,95,0.3);
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
                    box-shadow: 0 2px 12px rgba(46,74,95,0.1);
                    border-left: 5px solid var(--card-accent);
                    position: relative; overflow: hidden;
                }
                .tsm-card::after {
                    content: '';
                    position: absolute; right: -18px; top: -18px;
                    width: 80px; height: 80px;
                    border-radius: 50%;
                    background: var(--card-accent);
                    opacity: .08;
                }
                .tsm-card-lbl { font-size: 11px; font-weight: 700; color: #6A9AB0; text-transform: uppercase; letter-spacing: .9px; margin-bottom: 6px; }
                .tsm-card-val { font-size: 22px; font-weight: 700; color: #1C3445; }
                .tsm-card-ico {
                    position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
                    width: 38px; height: 38px; border-radius: 10px;
                    background: var(--card-accent);
                    opacity: .18;
                }

                /* ── PANEL ── */
                .tsm-panel {
                    background: rgba(255,255,255,0.93);
                    border-radius: 16px;
                    box-shadow: 0 2px 12px rgba(46,74,95,0.09);
                    margin-bottom: 18px;
                    overflow: hidden;
                }
                .tsm-panel-head {
                    background: linear-gradient(135deg, #3D5F75, #2E4A5F);
                    padding: 13px 22px;
                    display: flex; align-items: center; gap: 9px;
                }
                .tsm-panel-head.red { background: linear-gradient(135deg, #7A3030, #5C2020); }
                .tsm-panel-title { color: #fff; font-size: 14px; font-weight: 700; margin: 0; }
                .tsm-panel-body { padding: 4px 22px 18px; }

                /* ── TWO COL ── */
                .tsm-two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }

                /* ── TABLE ── */
                .tsm-tbl { width: 100%; border-collapse: collapse; font-size: 13.5px; }
                .tsm-tbl th {
                    text-align: left;
                    padding: 14px 0 9px;
                    border-bottom: 2px solid #D6E6F0;
                    color: #6A9AB0;
                    font-size: 11px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: .7px;
                }
                .tsm-tbl td {
                    padding: 11px 0;
                    border-bottom: 1px solid #E4EFF6;
                    color: #1C3445;
                    vertical-align: middle;
                }
                .tsm-tbl tr:last-child td { border-bottom: none; }
                .tsm-tbl tr:hover td { background: #f4f9fc; }

                .tsm-amt-pos { font-weight: 600; color: #2E7D52; }
                .tsm-amt-neg { font-weight: 700; color: #B03A2E; }
                .tsm-amt-pri { font-weight: 600; color: #3D5F75; }

                .tsm-badge {
                    display: inline-block; padding: 3px 11px;
                    border-radius: 20px; font-size: 11.5px; font-weight: 600;
                }
                .tsm-badge-dept { color: #3D5F75; background: rgba(61,95,117,.12); }
                .tsm-badge-paid { color: #2E7D52; background: rgba(46,125,82,.14); }

                /* ── ACTION ICONS ── */
                .tsm-actions { display: flex; gap: 6px; }
                .tsm-act {
                    width: 30px; height: 30px; border-radius: 8px; border: none;
                    display: inline-flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: opacity .15s;
                }
                .tsm-act:hover { opacity: .75; }
                .tsm-act-edit { background: rgba(61,95,117,.15); color: #3D5F75; }
                .tsm-act-del  { background: rgba(176,58,46,.12);  color: #B03A2E; }
                .tsm-act-hist { background: rgba(180,130,0,.12);   color: #B08000; }
                .tsm-act-view { background: rgba(46,125,82,.12);   color: #2E7D52; }

                /* ── FOOTER BTNS ── */
                .tsm-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 4px; }
                .tsm-btn-outline {
                    border: 1.5px solid #A8C4D6; background: rgba(255,255,255,.8);
                    color: #3D5F75; border-radius: 10px; padding: 9px 18px;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    display: flex; align-items: center; gap: 6px; transition: all .15s;
                }
                .tsm-btn-outline:hover { background: #fff; border-color: #3D5F75; }
                .tsm-btn-primary {
                    background: linear-gradient(135deg, #3D5F75, #2E4A5F);
                    border: none; color: #fff; border-radius: 10px;
                    padding: 9px 24px; font-size: 13px; font-weight: 600;
                    cursor: pointer; box-shadow: 0 3px 10px rgba(46,74,95,.24); transition: opacity .15s;
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
                    box-shadow: 0 24px 70px rgba(18,35,48,.32);
                    position: relative;
                    overflow: hidden;
                    animation: tsm-pop .18s ease;
                }
                @keyframes tsm-pop {
                    from { transform: scale(.93); opacity: 0; }
                    to   { transform: scale(1);   opacity: 1; }
                }
                .tsm-modal-head {
                    background: linear-gradient(135deg, #3D5F75, #2E4A5F);
                    padding: 16px 22px;
                    display: flex; align-items: center; justify-content: space-between;
                }
                .tsm-modal-head.danger { background: linear-gradient(135deg, #8B3020, #6A2018); }
                .tsm-modal-title { color: #fff; font-size: 16px; font-weight: 700; margin: 0; }
                .tsm-modal-close {
                    background: rgba(255,255,255,.18); border: none; color: #fff;
                    border-radius: 7px; width: 30px; height: 30px; cursor: pointer;
                    font-size: 15px; display: flex; align-items: center; justify-content: center;
                }
                .tsm-modal-body { padding: 22px 24px; }
                .tsm-modal-foot {
                    padding: 14px 24px;
                    border-top: 1px solid #E4EFF6;
                    display: flex; justify-content: flex-end; gap: 10px;
                }

                .tsm-label { font-size: 11.5px; font-weight: 700; color: #6A9AB0; text-transform: uppercase; letter-spacing: .6px; display: block; margin-bottom: 5px; }
                .tsm-input, .tsm-select {
                    width: 100%; padding: 10px 13px;
                    border: 1.5px solid #B8D0DE; border-radius: 9px;
                    font-size: 13.5px; color: #1C3445;
                    background: #EAF3F9; outline: none;
                    margin-bottom: 14px; transition: border-color .15s;
                }
                .tsm-input:focus, .tsm-select:focus { border-color: #3D5F75; background: #fff; }

                .tsm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

                .tsm-btn-cancel {
                    background: transparent; border: 1.5px solid #B8D0DE;
                    color: #6A9AB0; border-radius: 9px; padding: 8px 18px;
                    font-size: 13px; cursor: pointer; transition: all .15s;
                }
                .tsm-btn-cancel:hover { border-color: #6A9AB0; color: #3D5F75; }
                .tsm-btn-confirm {
                    background: linear-gradient(135deg, #3D5F75, #2E4A5F);
                    border: none; color: #fff; border-radius: 9px;
                    padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s;
                }
                .tsm-btn-confirm:hover { opacity: .88; }
                .tsm-btn-confirm.danger { background: linear-gradient(135deg, #B03A2E, #8B2E22); }
                .tsm-btn-confirm:disabled { opacity: .5; cursor: not-allowed; }

                /* payslip preview */
                .tsm-slip-bar {
                    background: linear-gradient(135deg, #3D5F75, #2E4A5F);
                    border-radius: 10px; padding: 12px 18px;
                    display: flex; justify-content: space-between; align-items: center;
                    margin-top: 14px;
                }
            `}</style>

            <div className="tsm-wrap">

                {/* ── HEADER ── */}
                <div className="tsm-header">
                    <div className="tsm-title-row">
                        <div className="tsm-icon-box"><GraduationCap size={24} color="#fff" /></div>
                        <div>
                            <p className="tsm-h1">Teacher Salary Management</p>
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
                <div className="tsm-cards" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                    {[
                        { lbl: "Monthly Gross Payout", val: "₹4,50,000", color: "#3D5F75" },
                        { lbl: "Net Salaries Paid", val: "₹4,20,000", color: "#2E7D52" },
                        { lbl: "Total Deductions", val: "₹30,000", color: "#B03A2E" },
                        { lbl: "Pending Approvals", val: "3 Salaries", color: "#B08000" },
                    ].map((c, i) => (
                        <div key={i} className="tsm-card" style={{ "--card-accent": c.color }}>
                            <div className="tsm-card-lbl">{c.lbl}</div>
                            <div className="tsm-card-val">{c.val}</div>
                            <div className="tsm-card-ico" />
                        </div>
                    ))}
                </div>
                {/* ── TEACHERS LIST ── */}

                {/* ── ROW: SALARY STRUCTURE + DEDUCTIONS ── */}
                <div className="tsm-two">

                    {/* 💵 SALARY STRUCTURE */}
                    <div className="tsm-panel">
                        <div className="tsm-panel-head">
                            <Banknote size={15} colorff="#f" />
                            <p className="tsm-panel-title">💵 Salary Structure</p>
                        </div>
                        <div className="tsm-panel-body" style={{ paddingTop: 14 }}>
                            {[
                                { label: "Basic Pay", amount: 30000, icon: Landmark, color: "#3D5F75", pct: 50 },
                                { label: "HRA", amount: 10000, icon: Building2, color: "#5A8FA8", pct: 17 },
                                { label: "DA", amount: 8000, icon: TrendingUp, color: "#2E7D52", pct: 13 },
                                { label: "Bonus", amount: 7000, icon: Star, color: "#B08000", pct: 12 },
                                { label: "Incentives", amount: 5000, icon: HandCoins, color: "#6A9AB0", pct: 8 },
                            ].map((item, i) => (
                                <div key={i} style={{ marginBottom: 14 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 9, background: item.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <item.icon size={15} color={item.color} />
                                            </div>
                                            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1C3445" }}>{item.label}</span>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>₹{item.amount.toLocaleString()}</span>
                                            <span style={{ fontSize: 11, color: "#6A9AB0", marginLeft: 5 }}>({item.pct}%)</span>
                                        </div>
                                    </div>
                                    <div style={{ height: 7, background: "#D6E6F0", borderRadius: 8, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${item.pct}%`, borderRadius: 8, background: `linear-gradient(90deg,${item.color},${item.color}88)`, transition: "width .5s" }} />
                                    </div>
                                </div>
                            ))}
                            <div style={{ background: "linear-gradient(135deg,#3D5F75,#2E4A5F)", borderRadius: 10, padding: "12px 16px", marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 600 }}>Total Gross Earnings</span>
                                <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>₹{(30000 + 10000 + 8000 + 7000 + 5000).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* ➖ DEDUCTIONS */}
                    <div className="tsm-panel">
                        <div className="tsm-panel-head red">
                            <Minus size={15} colorff="#f" />
                            <p className="tsm-panel-title">➖ Deductions</p>
                        </div>
                        <div className="tsm-panel-body" style={{ paddingTop: 14 }}>
                            {[
                                { label: "PF (Provident Fund)", amount: 2000, icon: Landmark, color: "#3D5F75" },
                                { label: "Tax (TDS)", amount: 2000, icon: Briefcase, color: "#B03A2E" },
                                { label: "Leave Deduction", amount: 500, icon: CalendarDays, color: "#B08000" },
                                { label: "Late Penalty", amount: 1000, icon: ShieldAlert, color: "#8B3020" },
                                { label: "Loan Deduction", amount: 3000, icon: Banknote, color: "#5A8FA8" },
                            ].map((item, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #E4EFF6" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 34, height: 34, borderRadius: 9, background: item.color + "14", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <item.icon size={15} color={item.color} />
                                        </div>
                                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1C3445" }}>{item.label}</span>
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#B03A2E" }}>− ₹{item.amount.toLocaleString()}</span>
                                </div>
                            ))}
                            <div style={{ background: "rgba(176,58,46,.08)", borderRadius: 10, padding: "12px 16px", marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(176,58,46,.2)" }}>
                                <span style={{ color: "#B03A2E", fontSize: 13, fontWeight: 700 }}>Total Deductions</span>
                                <span style={{ color: "#B03A2E", fontSize: 18, fontWeight: 700 }}>₹{(2000 + 2000 + 500 + 1000 + 3000).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 💳 SALARY PROCESSING — 5 STEPS */}
                <div className="tsm-panel">
                    <div className="tsm-panel-head">
                        <Send size={15} color="#fff" />
                        <p className="tsm-panel-title">💳 Salary Processing</p>
                    </div>
                    <div className="tsm-panel-body" style={{ paddingTop: 20, paddingBottom: 24 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
                            {[
                                { step: "01", label: "Monthly Salary\nCalculation", icon: ListOrdered, color: "#3D5F75", done: true },
                                { step: "02", label: "Salary\nApproval", icon: CheckCircle2, color: "#2E7D52", done: true },
                                { step: "03", label: "Bank\nTransfer", icon: Send, color: "#5A8FA8", done: true },
                                { step: "04", label: "Payslip\nGeneration", icon: Printer, color: "#B08000", done: false },
                                { step: "05", label: "Salary\nHistory", icon: ClipboardList, color: "#6A9AB0", done: false },
                            ].map((s, i, arr) => (
                                <React.Fragment key={i}>
                                    <div style={{ textAlign: "center", position: "relative" }}>
                                        {/* connector line */}
                                        {i < arr.length - 1 && (
                                            <div style={{ position: "absolute", top: 22, left: "60%", width: "80%", height: 2, background: s.done ? "#3D5F75" : "#D6E6F0", zIndex: 0 }} />
                                        )}
                                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.done ? `linear-gradient(135deg,${s.color},${s.color}cc)` : "#EAF3F9", border: `2px solid ${s.done ? s.color : "#C4D8E4"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", position: "relative", zIndex: 1, boxShadow: s.done ? `0 3px 10px ${s.color}44` : "none" }}>
                                            <s.icon size={18} color={s.done ? "#fff" : "#A8C4D6"} />
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: s.done ? s.color : "#A8C4D6", letterSpacing: ".5px", marginBottom: 4 }}>STEP {s.step}</div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: s.done ? "#1C3445" : "#8AAFC0", lineHeight: 1.45, whiteSpace: "pre-line" }}>{s.label.replace("\n", "\n")}</div>
                                        {s.done && (
                                            <div style={{ marginTop: 6 }}>
                                                <span style={{ background: "rgba(46,125,82,.12)", color: "#2E7D52", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>✓ Done</span>
                                            </div>
                                        )}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* SALARY HISTORY TABLE */}
                        <div className="tsm-panel">

                            <div className="tsm-panel-body">

                                <div style={{ marginBottom: 16 }}>

                                </div>
                                <table className="tsm-tbl">
                                    <thead>
                                        <tr>
                                            {["Name", "Email", "Subject", "Basic Salary", "Bonus", "Deductions", "Net Salary", "Actions"]
                                                .map(h => (
                                                    <th key={h}>{h}</th>
                                                ))
                                            }
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    style={{ textAlign: "center", color: "#6A9AB0", padding: "30px 0" }}
                                                >
                                                    No teachers found
                                                </td>
                                            </tr>
                                        ) : filtered.map(t => (
                                            <tr key={t.id}>
                                                {/* NAME */}
                                                <td style={{ fontWeight: 600 }}>
                                                    {t.teacher?.firstName} {t.teacher?.lastName}
                                                </td>

                                                {/* EMAIL */}
                                                <td style={{ color: "#5A7A8F" }}>
                                                    {t.teacher?.user?.email}
                                                </td>

                                                {/* SUBJECT */}
                                                <td>
                                                    <span className="tsm-badge tsm-badge-dept">
                                                        {t.teacher?.department || "—"}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 600, color: "#3D5F75" }}>
                                                    ₹{Number(t.basicSalary || 0).toLocaleString()}
                                                </td>
                                                {/* BONUS */}
                                                <td style={{ color: "#2E7D52", fontWeight: 600 }}>
                                                    ₹{Number(t.bonus || 0).toLocaleString()}
                                                </td>

                                                {/* DEDUCTIONS */}
                                                <td style={{ color: "#B03A2E", fontWeight: 600 }}>
                                                    ₹{Number(t.deductions || 0).toLocaleString()}
                                                </td>

                                                {/* NET SALARY */}
                                                <td className="tsm-amt-pos">
                                                    ₹{Number(t.netSalary || 0).toLocaleString()}
                                                </td>

                                                {/* ACTIONS */}
                                                <td>
                                                    <div className="tsm-actions">
                                                        <button className="tsm-act tsm-act-edit" onClick={() => openEditModal(t)}>
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button className="tsm-act tsm-act-del" onClick={() => openDeleteModal(t)}>
                                                            <Trash2 size={13} />
                                                        </button>
                                                        <button className="tsm-act tsm-act-hist" onClick={() => openHistoryModal(t)}>
                                                            <History size={13} />
                                                        </button>
                                                        <button className="tsm-act tsm-act-view" onClick={() => openSlipModal(t)}>
                                                            <Eye size={13} />
                                                        </button>
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
                    <button className="tsm-btn-outline"><FileText size={14} /> Generate Payslip</button>

                    <button className="tsm-btn-primary"><Send size={14} style={{ marginRight: 5 }} /> Process Bank Transfer</button>
                </div>

            </div>

            {/* ════════════════════════════════════
                    MODALS
            ════════════════════════════════════ */}

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
                                if (id) {
                                    fetchTeachersBySchool(id);
                                    refreshTeachers(id);
                                    fetchAllSalaryHistory(id);  // 🔥 ADD THIS
                                }
                            }}>
                                <option value="">Select School</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <label className="tsm-label">Teacher</label>
                            <select className="tsm-select" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                                <option value="">Select Teacher</option>
                                {dropdownTeachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
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

                            <p style={{ fontWeight: 700, marginBottom: 15 }}>
                                {selectedSalary?.teacher?.firstName} {selectedSalary?.teacher?.lastName}
                            </p>

                            {salaryHistory.length === 0 ? (
                                <p style={{ textAlign: "center", color: "#6A9AB0" }}>
                                    No salary history found
                                </p>
                            ) : (
                                <table className="tsm-tbl">
                                    <thead>
                                        <tr>
                                            <th>Month</th>
                                            <th>Year</th>
                                            <th>Basic</th>
                                            <th>Bonus</th>
                                            <th>Deductions</th>
                                            <th>Net Salary</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salaryHistory.map(s => (
                                            <tr key={s.id}>
                                                <td>
                                                    {new Date(0, s.month - 1).toLocaleString("default", { month: "long" })}
                                                </td>
                                                <td>{s.year}</td>
                                                <td>₹{Number(s.basicSalary).toLocaleString()}</td>
                                                <td style={{ color: "#2E7D52" }}>
                                                    ₹{Number(s.bonus).toLocaleString()}
                                                </td>
                                                <td style={{ color: "#B03A2E" }}>
                                                    ₹{Number(s.deductions).toLocaleString()}
                                                </td>
                                                <td className="tsm-amt-pos">
                                                    ₹{Number(s.netSalary).toLocaleString()}
                                                </td>
                                                <td>
                                                    <span className="tsm-badge tsm-badge-paid">
                                                        Success
                                                    </span>
                                                </td>
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
                    <div className="tsm-modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head">
                            <p className="tsm-modal-title">Payslip Preview</p>
                            <button className="tsm-modal-close" onClick={() => setSlipModal(false)}>✕</button>
                        </div>
                        <div className="tsm-modal-body">
                            <div style={{ border: "2px solid #B8D0DE", borderRadius: 12, overflow: "hidden" }}>
                                {/* slip header */}
                                <div style={{ background: "linear-gradient(135deg,#3D5F75,#2E4A5F)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <p style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 14 }}>ABC International School</p>
                                        <p style={{ color: "rgba(255,255,255,.65)", margin: 0, fontSize: 12 }}>Hyderabad, Telangana</p>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <p style={{ color: "#fff", fontWeight: 700, margin: 0 }}>PAYSLIP</p>
                                        <p style={{ color: "rgba(255,255,255,.65)", margin: 0, fontSize: 12 }}>
                                            {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
                                        </p>
                                    </div>
                                </div>
                                {/* slip body */}
                                <div style={{ padding: 18, background: "#EAF3F9" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14, fontSize: 13 }}>
                                        <div><span style={{ color: "#6A9AB0" }}>Teacher: </span><strong>{selectedSalary?.teacher?.firstName} {selectedSalary?.teacher?.lastName}</strong></div>
                                        <div><span style={{ color: "#6A9AB0" }}>Dept: </span><strong>{selectedSalary?.teacher?.department}</strong></div>
                                        <div style={{ gridColumn: "1/-1", fontSize: 12 }}><span style={{ color: "#6A9AB0" }}>Email: </span><strong>{selectedSalary?.teacher?.user?.email}</strong></div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px" }}>
                                            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#6A9AB0", textTransform: "uppercase", margin: "0 0 7px" }}>Earnings</p>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                                <span>Bonus</span><strong style={{ color: "#2E7D52" }}>₹{selectedSalary?.bonus || 0}</strong>
                                            </div>
                                        </div>
                                        <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px" }}>
                                            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#6A9AB0", textTransform: "uppercase", margin: "0 0 7px" }}>Deductions</p>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                                <span>Total</span><strong style={{ color: "#B03A2E" }}>₹{selectedSalary?.deductions || 0}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="tsm-slip-bar">
                                        <span style={{ color: "rgba(255,255,255,.8)", fontWeight: 600 }}>NET SALARY</span>
                                        <span style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>₹{Number(selectedSalary?.netSalary).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="tsm-modal-foot">
                            <button className="tsm-btn-cancel" onClick={() => setSlipModal(false)}>Close</button>
                            <button className="tsm-btn-confirm" onClick={downloadPayslip}>Download PDF</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PDF TEMPLATE */}
            <div ref={pdfRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div style={{ width: '800px', padding: '30px', background: '#fff', fontFamily: 'Arial', border: '2px solid #000' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ margin: 0 }}>ABC INTERNATIONAL SCHOOL</h2>
                            <p style={{ margin: 0, fontSize: '12px' }}>Hyderabad, Telangana</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h3 style={{ margin: 0 }}>PAYSLIP</h3>
                            <p style={{ margin: 0, fontSize: '12px' }}>Month: {new Date().toLocaleString('default', { month: 'long' })}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div>
                            <p><b>Name :</b> {selectedSalary?.teacher?.firstName}</p>
                            <p><b>Email :</b> {selectedSalary?.teacher?.user?.email}</p>
                        </div>
                        <div>
                            <p><b>Department :</b> {selectedSalary?.teacher?.department}</p>
                            <p><b>Year :</b> {new Date().getFullYear()}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #000' }}>
                        <div style={{ width: '50%', borderRight: '1px solid #000' }}>
                            <div style={{ background: '#f0f0f0', padding: '8px', fontWeight: 'bold', borderBottom: '1px solid #000' }}>EARNINGS</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>
                                <span>Bonus</span><span>₹{selectedSalary?.bonus || 0}</span>
                            </div>
                        </div>
                        <div style={{ width: '50%' }}>
                            <div style={{ background: '#f0f0f0', padding: '8px', fontWeight: 'bold', borderBottom: '1px solid #000' }}>DEDUCTIONS</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}>
                                <span>PF</span><span>₹{selectedSalary?.deductions || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '25px', padding: '15px', border: '2px solid #000', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                        NET SALARY : ₹{selectedSalary?.netSalary}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
                        <div>
                            <p>Employee Signature</p>
                            <div style={{ width: '200px', borderBottom: '1px solid #000', marginTop: '30px' }} />
                        </div>
                        <div>
                            <p>Authorized Signature</p>
                            <div style={{ width: '200px', borderBottom: '1px solid #000', marginTop: '30px' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── TEACHER SALARY HISTORY ── */}
            <div className="tsm-panel">

                <div className="tsm-panel-head" style={{ justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ClipboardList size={15} color="#fff" />
                        <p className="tsm-panel-title">Teacher Salary History</p>
                    </div>

                    <div className="tsm-search-wrap">
                        <Search size={14} className="tsm-search-ico" />
                        <input
                            className="tsm-search-inp"
                            placeholder="Search teacher name or email..."
                            value={historySearch}
                            onChange={e => setHistorySearch(e.target.value)}
                            style={{ width: 260, background: "rgba(255,255,255,.95)" }}
                        />
                    </div>
                </div>

                <div className="tsm-panel-body">

                    <table className="tsm-tbl">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Month</th>
                                <th>Bonus</th>
                                <th>Deductions</th>
                                <th>Net Salary</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: "center", padding: "30px 0", color: "#6A9AB0" }}>
                                        No salary records found
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((t) => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {t.teacher?.firstName} {t.teacher?.lastName}
                                        </td>
                                        <td style={{ color: "#5A7A8F" }}>
                                            {t.teacher?.user?.email}
                                        </td>
                                        <td>
                                            <span className="tsm-badge tsm-badge-dept">
                                                {t.teacher?.department || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            {new Date(0, t.month - 1).toLocaleString("default", { month: "short" })} {t.year}
                                        </td>
                                        <td style={{ color: "#2E7D52", fontWeight: 600 }}>
                                            ₹{t.bonus || 0}
                                        </td>
                                        <td style={{ color: "#B03A2E", fontWeight: 600 }}>
                                            ₹{t.deductions || 0}
                                        </td>
                                        <td className="tsm-amt-pos">
                                            ₹{Number(t.netSalary).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className="tsm-badge tsm-badge-paid">
                                                Success
                                            </span>
                                        </td>
                                        <td>
                                            <div className="tsm-actions">
                                                <button className="tsm-act tsm-act-edit" onClick={() => openEditModal(t)}>
                                                    <Pencil size={13} />
                                                </button>
                                                <button className="tsm-act tsm-act-del" onClick={() => openDeleteModal(t)}>
                                                    <Trash2 size={13} />
                                                </button>
                                                <button className="tsm-act tsm-act-hist" onClick={() => openHistoryModal(t)}>
                                                    <History size={13} />
                                                </button>
                                                <button className="tsm-act tsm-act-view" onClick={() => openSlipModal(t)}>
                                                    <Eye size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                </div>
            </div>
        </PageLayout>
    );
}