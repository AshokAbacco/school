import {
    Search, CalendarDays, FileText, Pencil, Trash2, History, Eye,
    GraduationCap, TrendingUp, TrendingDown, ClipboardList, Banknote,
    Landmark, Star, Building2, Minus, Briefcase, ShieldAlert, HandCoins,
    CheckCircle2, Send, Printer, ListOrdered
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function GroupASalary() {
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
    const [allSalaryHistory, setAllSalaryHistory] = useState([]);
    const pdfRef = useRef();

    const tok = () => localStorage.getItem("token");

    const downloadPayslip = async () => {
        if (!selectedSalary) return;
        const element = pdfRef.current;
        if (!element) { alert("Payslip template not loaded"); return; }
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pw = pdf.internal.pageSize.getWidth();
        pdf.addImage(imgData, "PNG", 0, 10, pw, (canvas.height * pw) / canvas.width);
        pdf.save(`Payslip-${selectedSalary.teacher?.firstName}.pdf`);
    };

    const openEditModal = (salary) => {
        setSelectedSalary({ id: salary.id, teacherId: salary.teacher?.id });
        setBonus(salary.bonus ?? 0); setDeduction(salary.deductions ?? 0); setEditModal(true);
    };
    const openDeleteModal = (salary) => { setSelectedSalary({ id: salary.id }); setDeleteModal(true); };
    const openHistoryModal = async (salary) => {
        setSelectedSalary(salary);
        const res = await fetch(`http://localhost:5000/api/teachers/salary/history/${salary.teacher?.id}`, { headers: { Authorization: `Bearer ${tok()}` } });
        setSalaryHistory(await res.json()); setHistoryModal(true);
    };
    const openSlipModal = (salary) => { setSelectedSalary(salary); setSlipModal(true); };

    const updateSalary = async () => {
        if (!selectedSalary?.id) return;
        const res = await fetch(`http://localhost:5000/api/teachers/salary/update/${selectedSalary.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
            body: JSON.stringify({ bonus, deductions: deduction })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        alert("Salary Updated Successfully"); setEditModal(false);
        await refreshTeachers(schoolId); await fetchAllSalaryHistory(schoolId);
    };

    const deleteSalary = async () => {
        if (!selectedSalary?.id) return;
        const res = await fetch(`http://localhost:5000/api/teachers/salary/delete/${selectedSalary.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${tok()}` } });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        alert("Salary Deleted Successfully"); setDeleteModal(false);
        await refreshTeachers(schoolId); await fetchAllSalaryHistory(schoolId);
    };

    const createSalary = async () => {
        if (!selectedTeacher) { alert("Please select teacher"); return; }
        const res = await fetch("http://localhost:5000/api/teachers/salary/create", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
            body: JSON.stringify({ teacherId: selectedTeacher, month: new Date().getMonth() + 1, year: new Date().getFullYear(), bonus, deductions: deduction })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        alert("Salary Created Successfully");
        setSelectedTeacher(""); setBonus(0); setDeduction(0); setShowModal(false);
        await refreshTeachers(schoolId); await fetchAllSalaryHistory(schoolId);
    };

    const fetchSchools = async () => {
        const res = await fetch("http://localhost:5000/api/teachers/salary/schools", { headers: { Authorization: `Bearer ${tok()}` } });
        const data = await res.json(); setSchools(data);
    };

    const fetchTeachersBySchool = async (id) => {
        const res = await fetch(`http://localhost:5000/api/teachers/salary/teachers-by-school/${id}`, { headers: { Authorization: `Bearer ${tok()}` } });
        if (!res.ok) { setDropdownTeachers([]); return; }
        setDropdownTeachers(await res.json());
    };

    const payTeacherSalary = async (salaryId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/teachers/salary/pay/${salaryId}`, { method: "PATCH", headers: { Authorization: `Bearer ${tok()}` } });
            const data = await res.json();
            if (!res.ok) { alert(data.message); return; }
            alert("Salary Paid Successfully");
            await refreshTeachers(schoolId); await fetchAllSalaryHistory(schoolId);
        } catch (e) { console.log(e); }
    };

    useEffect(() => { fetchSchools(); }, []);
    useEffect(() => {
        const savedSchoolId = localStorage.getItem("selectedSchoolId");
        if (savedSchoolId) { setSchoolId(savedSchoolId); refreshTeachers(savedSchoolId); fetchTeachersBySchool(savedSchoolId); }
    }, []);
    useEffect(() => {
        const shouldRefresh = localStorage.getItem("refreshSalaryPage");
        if (shouldRefresh === "true" && schoolId) { refreshTeachers(schoolId); localStorage.removeItem("refreshSalaryPage"); }
    }, [schoolId]);

    const refreshTeachers = async (id) => {
        if (!id) return;
        try {
            const res = await fetch(`http://localhost:5000/api/teachers/salary/list/${id}`, { headers: { Authorization: `Bearer ${tok()}` } });
            if (!res.ok) { setSchoolTeachers([]); return; }
            const data = await res.json();
            setSchoolTeachers(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchAllSalaryHistory = async (id) => {
        const res = await fetch(`http://localhost:5000/api/teachers/salary/history-by-school/${id}`, { headers: { Authorization: `Bearer ${tok()}` } });
        const data = await res.json(); setAllSalaryHistory(data);
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

    return (
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
                        <input className="tsm-search-inp" placeholder="Search teacher name or email…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className="tsm-add-btn" onClick={() => setShowModal(true)}>+ Add Teacher</button>
                </div>
            </div>

            {/* ── KPI CARDS ── */}
            <div className="tsm-cards">
                {[
                    { lbl: "Monthly Gross Payout", val: "₹4,50,000", color: "#3c5d74" },
                    { lbl: "Net Salaries Paid", val: "₹4,20,000", color: "#3c5d74" },
                    { lbl: "Total Deductions", val: "₹30,000", color: "#2b4557" },
                    { lbl: "Pending Approvals", val: "3 Salaries", color: "#B08000" },
                ].map((c, i) => (
                    <div key={i} className="tsm-card" style={{ "--card-accent": c.color }}>
                        <div className="tsm-card-lbl">{c.lbl}</div>
                        <div className="tsm-card-val">{c.val}</div>
                        <div className="tsm-card-ico" />
                    </div>
                ))}
            </div>

            {/* ── SALARY STRUCTURE + DEDUCTIONS ── */}
            <div className="tsm-two">
                <div className="tsm-panel">
                    <div className="tsm-panel-head"><Banknote size={15} color="#fff" /><p className="tsm-panel-title">💵 Salary Structure</p></div>
                    <div className="tsm-panel-body" style={{ paddingTop: 14 }}>
                        {[
                            { label: "Basic Pay", amount: 30000, icon: Landmark, color: "#3c5d74", pct: 50 },
                            { label: "HRA", amount: 10000, icon: Building2, color: "#527a91", pct: 17 },
                            { label: "DA", amount: 8000, icon: TrendingUp, color: "#3c5d74", pct: 13 },
                            { label: "Bonus", amount: 7000, icon: Star, color: "#B08000", pct: 12 },
                            { label: "Incentives", amount: 5000, icon: HandCoins, color: "#527a91", pct: 8 },
                        ].map((item, i) => (
                            <div key={i} style={{ marginBottom: 14 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 9, background: item.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><item.icon size={15} color={item.color} /></div>
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
                        <div style={{ background: "linear-gradient(135deg,#3c5d74,#2b4557)", borderRadius: 10, padding: "12px 16px", marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 600 }}>Total Gross Earnings</span>
                            <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>₹{(30000 + 10000 + 8000 + 7000 + 5000).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="tsm-panel">
                    <div className="tsm-panel-head red"><Minus size={15} color="#fff" /><p className="tsm-panel-title">➖ Deductions</p></div>
                    <div className="tsm-panel-body" style={{ paddingTop: 14 }}>
                        {[
                            { label: "PF (Provident Fund)", amount: 2000, icon: Landmark, color: "#3c5d74" },
                            { label: "Tax (TDS)", amount: 2000, icon: Briefcase, color: "#2b4557" },
                            { label: "Leave Deduction", amount: 500, icon: CalendarDays, color: "#B08000" },
                            { label: "Late Penalty", amount: 1000, icon: ShieldAlert, color: "#8B3020" },
                            { label: "Loan Deduction", amount: 3000, icon: Banknote, color: "#527a91" },
                        ].map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #E4EFF6" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 9, background: item.color + "14", display: "flex", alignItems: "center", justifyContent: "center" }}><item.icon size={15} color={item.color} /></div>
                                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1C3445" }}>{item.label}</span>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#2b4557" }}>− ₹{item.amount.toLocaleString()}</span>
                            </div>
                        ))}
                        <div style={{ background: "rgba(176,58,46,.08)", borderRadius: 10, padding: "12px 16px", marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1.5px solid rgba(176,58,46,.2)" }}>
                            <span style={{ color: "#2b4557", fontSize: 13, fontWeight: 700 }}>Total Deductions</span>
                            <span style={{ color: "#2b4557", fontSize: 18, fontWeight: 700 }}>₹{(2000 + 2000 + 500 + 1000 + 3000).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SALARY PROCESSING ── */}
            <div className="tsm-panel">
                <div className="tsm-panel-head"><Send size={15} color="#fff" /><p className="tsm-panel-title">💳 Salary Processing</p></div>
                <div className="tsm-panel-body" style={{ paddingTop: 20, paddingBottom: 24 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 28 }}>
                        {[
                            { step: "01", label: "Monthly Salary\nCalculation", icon: ListOrdered, color: "#3c5d74", done: true },
                            { step: "02", label: "Salary\nApproval", icon: CheckCircle2, color: "#3c5d74", done: true },
                            { step: "03", label: "Bank\nTransfer", icon: Send, color: "#527a91", done: true },
                            { step: "04", label: "Payslip\nGeneration", icon: Printer, color: "#B08000", done: false },
                            { step: "05", label: "Salary\nHistory", icon: ClipboardList, color: "#527a91", done: false },
                        ].map((s, i, arr) => (
                            <div key={i} style={{ textAlign: "center", position: "relative" }}>
                                {i < arr.length - 1 && <div style={{ position: "absolute", top: 22, left: "60%", width: "80%", height: 2, background: s.done ? "#3c5d74" : "#D6E6F0", zIndex: 0 }} />}
                                <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.done ? `linear-gradient(135deg,${s.color},${s.color}cc)` : "#EAF3F9", border: `2px solid ${s.done ? s.color : "#C4D8E4"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", position: "relative", zIndex: 1, boxShadow: s.done ? `0 3px 10px ${s.color}44` : "none" }}>
                                    <s.icon size={18} color={s.done ? "#fff" : "#A8C4D6"} />
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: s.done ? s.color : "#A8C4D6", letterSpacing: ".5px", marginBottom: 4 }}>STEP {s.step}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: s.done ? "#1C3445" : "#8AAFC0", lineHeight: 1.45, whiteSpace: "pre-line" }}>{s.label}</div>
                                {s.done && <div style={{ marginTop: 6 }}><span style={{ background: "rgba(60,93,116,.12)", color: "#3c5d74", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>✓ Done</span></div>}
                            </div>
                        ))}
                    </div>

                    <div className="tsm-panel">
                        <div className="tsm-panel-body">
                            <table className="tsm-tbl">
                                <thead><tr>{["Name", "Email", "Subject", "Basic Salary", "Bonus", "Deductions", "Net Salary", "Status", "Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={9} style={{ textAlign: "center", color: "#6A9AB0", padding: "30px 0" }}>No teachers found</td></tr>
                                    ) : filtered.map(t => (
                                        <tr key={t.id || t.teacherId}>
                                            <td style={{ fontWeight: 600 }}>{t.teacher?.firstName} {t.teacher?.lastName}</td>
                                            <td style={{ color: "#5A7A8F" }}>{t.teacher?.user?.email}</td>
                                            <td><span className="tsm-badge tsm-badge-dept">{t.teacher?.department || "—"}</span></td>
                                            <td style={{ fontWeight: 600, color: "#3c5d74" }}>₹{Number(t.basicSalary || 0).toLocaleString()}</td>
                                            <td style={{ color: "#3c5d74", fontWeight: 600 }}>₹{Number(t.bonus || 0).toLocaleString()}</td>
                                            <td style={{ color: "#2b4557", fontWeight: 600 }}>₹{Number(t.deductions || 0).toLocaleString()}</td>
                                            <td className="tsm-amt-pos">₹{Number(t.netSalary || 0).toLocaleString()}</td>
                                            <td>{t.status === "PAID" ? <span className="tsm-badge tsm-badge-paid">Paid</span> : <button className="tsm-btn-confirm" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => payTeacherSalary(t.salaryId)}>Pay</button>}</td>
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

            <div className="tsm-footer">
                <button className="tsm-btn-primary"><Send size={14} style={{ marginRight: 5 }} />Process Bank Transfer</button>
            </div>

            {/* ════ MODALS ════ */}
            {showModal && (
                <div className="tsm-overlay" onClick={() => setShowModal(false)}>
                    <div className="tsm-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head"><p className="tsm-modal-title">Create Teacher Salary</p><button className="tsm-modal-close" onClick={() => setShowModal(false)}>✕</button></div>
                        <div className="tsm-modal-body">
                            <label className="tsm-label">School</label>
                            <select className="tsm-select" value={schoolId} onChange={e => { const id = e.target.value; setSchoolId(id); localStorage.setItem("selectedSchoolId", id); setSelectedTeacher(""); if (id) { fetchTeachersBySchool(id); refreshTeachers(id); fetchAllSalaryHistory(id); } }}>
                                <option value="">Select School</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <label className="tsm-label">Teacher</label>
                            <select className="tsm-select" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                                <option value="">Select Teacher</option>
                                {dropdownTeachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                            </select>
                            <div className="tsm-grid2">
                                <div><label className="tsm-label">Bonus (₹)</label><input className="tsm-input" type="number" placeholder="0" onChange={e => setBonus(Number(e.target.value))} /></div>
                                <div><label className="tsm-label">Deduction (₹)</label><input className="tsm-input" type="number" placeholder="0" onChange={e => setDeduction(Number(e.target.value))} /></div>
                            </div>
                        </div>
                        <div className="tsm-modal-foot"><button className="tsm-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button><button className="tsm-btn-confirm" onClick={createSalary} disabled={!selectedTeacher}>Create Salary</button></div>
                    </div>
                </div>
            )}
            {editModal && (
                <div className="tsm-overlay" onClick={() => setEditModal(false)}>
                    <div className="tsm-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head"><p className="tsm-modal-title">Edit Teacher Salary</p><button className="tsm-modal-close" onClick={() => setEditModal(false)}>✕</button></div>
                        <div className="tsm-modal-body">
                            <div className="tsm-grid2">
                                <div><label className="tsm-label">Bonus (₹)</label><input className="tsm-input" type="number" value={bonus} onChange={e => setBonus(Number(e.target.value))} /></div>
                                <div><label className="tsm-label">Deduction (₹)</label><input className="tsm-input" type="number" value={deduction} onChange={e => setDeduction(Number(e.target.value))} /></div>
                            </div>
                        </div>
                        <div className="tsm-modal-foot"><button className="tsm-btn-cancel" onClick={() => setEditModal(false)}>Cancel</button><button className="tsm-btn-confirm" onClick={updateSalary}>Update Salary</button></div>
                    </div>
                </div>
            )}
            {deleteModal && (
                <div className="tsm-overlay" onClick={() => setDeleteModal(false)}>
                    <div className="tsm-modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head danger"><p className="tsm-modal-title">Confirm Deletion</p><button className="tsm-modal-close" onClick={() => setDeleteModal(false)}>✕</button></div>
                        <div className="tsm-modal-body" style={{ textAlign: "center", padding: "28px 24px" }}>
                            <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
                            <p style={{ color: "#3D4F5C", lineHeight: 1.6, margin: 0 }}>Are you sure you want to delete this salary record?<br />This action cannot be undone.</p>
                        </div>
                        <div className="tsm-modal-foot"><button className="tsm-btn-cancel" onClick={() => setDeleteModal(false)}>Cancel</button><button className="tsm-btn-confirm danger" onClick={deleteSalary}>Delete Record</button></div>
                    </div>
                </div>
            )}
            {historyModal && (
                <div className="tsm-overlay" onClick={() => setHistoryModal(false)}>
                    <div className="tsm-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head"><p className="tsm-modal-title">Salary Details</p><button className="tsm-modal-close" onClick={() => setHistoryModal(false)}>✕</button></div>
                        <div className="tsm-modal-body">
                            <p style={{ fontWeight: 700, marginBottom: 15 }}>{selectedSalary?.teacher?.firstName} {selectedSalary?.teacher?.lastName}</p>
                            {salaryHistory.length === 0 ? <p style={{ textAlign: "center", color: "#6A9AB0" }}>No salary history found</p> : (
                                <table className="tsm-tbl">
                                    <thead><tr><th>Month</th><th>Year</th><th>Basic</th><th>Bonus</th><th>Deductions</th><th>Net Salary</th><th>Status</th></tr></thead>
                                    <tbody>{salaryHistory.map(s => (<tr key={s.id}><td>{new Date(0, s.month - 1).toLocaleString("default", { month: "long" })}</td><td>{s.year}</td><td>₹{Number(s.basicSalary).toLocaleString()}</td><td style={{ color: "#3c5d74" }}>₹{Number(s.bonus).toLocaleString()}</td><td style={{ color: "#2b4557" }}>₹{Number(s.deductions).toLocaleString()}</td><td className="tsm-amt-pos">₹{Number(s.netSalary).toLocaleString()}</td><td><span className="tsm-badge tsm-badge-paid">Success</span></td></tr>))}</tbody>
                                </table>
                            )}
                        </div>
                        <div className="tsm-modal-foot"><button className="tsm-btn-cancel" onClick={() => setHistoryModal(false)}>Close</button></div>
                    </div>
                </div>
            )}
            {slipModal && (
                <div className="tsm-overlay" onClick={() => setSlipModal(false)}>
                    <div className="tsm-modal slip-modal-wrap" onClick={e => e.stopPropagation()}>
                        <div className="tsm-modal-head" style={{ padding: "14px 22px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}><FileText size={16} color="#fff" /><p className="tsm-modal-title">Payslip Preview</p></div>
                            <button className="tsm-modal-close" onClick={() => setSlipModal(false)}>✕</button>
                        </div>
                        <div className="slip-preview">
                            <div className="slip-letterhead">
                                <div className="slip-lh-top">
                                    <div><p className="slip-school-name">ABC International School</p><p className="slip-school-addr">Bengaluru, Karnataka — India</p></div>
                                    <div className="slip-payslip-label"><p className="slip-payslip-title">Salary Slip</p><p className="slip-payslip-period">{new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</p></div>
                                </div>
                                <div className="slip-divider-line" />
                                <div className="slip-lh-bottom"><span className="slip-emp-id">Generated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span><span className="slip-confidential">Confidential</span></div>
                            </div>
                            <div className="slip-emp-strip">
                                <div><div className="slip-emp-key">Employee Name</div><div className="slip-emp-val">{selectedSalary?.teacher?.firstName} {selectedSalary?.teacher?.lastName}</div></div>
                                <div><div className="slip-emp-key">Department</div><div className="slip-emp-val">{selectedSalary?.teacher?.department || "—"}</div></div>
                                <div><div className="slip-emp-key">Pay Period</div><div className="slip-emp-val">{new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</div></div>
                                <div style={{ gridColumn: "1/-1" }}><div className="slip-emp-key">Email</div><div className="slip-emp-val" style={{ fontWeight: 500, color: "#4A6878" }}>{selectedSalary?.teacher?.user?.email}</div></div>
                            </div>
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
                                        <div className="slip-col-subtotal slip-subtotal-earn"><span>Gross Earnings</span><span>₹{(Number(selectedSalary?.basicSalary || 0) + Number(selectedSalary?.bonus || 0)).toLocaleString("en-IN")}</span></div>
                                    </div>
                                    <div>
                                        <div className="slip-col-head dedu"><TrendingDown size={13} color="#fff" /><span className="slip-section-title">Deductions</span></div>
                                        <div className="slip-col-rows">
                                            <div className="slip-col-row"><span className="slip-row-label">Total Deductions</span><span className="slip-row-val-dedu">₹{Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">PF (Provident Fund)</span><span className="slip-row-val-dedu">₹0</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">Tax (TDS)</span><span className="slip-row-val-dedu">₹0</span></div>
                                            <div className="slip-col-row"><span className="slip-row-label">Other</span><span className="slip-row-val-dedu">₹0</span></div>
                                        </div>
                                        <div className="slip-col-subtotal slip-subtotal-dedu"><span>Total Deductions</span><span>₹{Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}</span></div>
                                    </div>
                                </div>
                                <div className="slip-net-bar">
                                    <div><div className="slip-net-label">Net Salary Payable</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>For {new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</div></div>
                                    <div style={{ textAlign: "right" }}><div className="slip-net-amount">₹{Number(selectedSalary?.netSalary || 0).toLocaleString("en-IN")}</div>{selectedSalary?.status === "PAID" && <div style={{ marginTop: 6 }}><span className="slip-net-status">✓ Paid</span></div>}</div>
                                </div>
                            </div>
                            <div className="slip-sig-strip">{["Employee Signature", "HR Department", "Principal / Director"].map((lbl, i) => (<div key={i} className="slip-sig-item"><div className="slip-sig-line" /><div className="slip-sig-label">{lbl}</div></div>))}</div>
                            <div className="slip-footer-note">This is a system-generated payslip and does not require a physical signature.</div>
                        </div>
                        <div className="tsm-modal-foot"><button className="tsm-btn-cancel" onClick={() => setSlipModal(false)}>Close</button><button className="tsm-btn-confirm" onClick={downloadPayslip}><Printer size={13} style={{ marginRight: 6 }} />Download PDF</button></div>
                    </div>
                </div>
            )}

            {/* HIDDEN PDF */}
            <div ref={pdfRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
                <div style={{ width: "794px", background: "#fff", fontFamily: "'Inter',Arial,sans-serif" }}>
                    <div style={{ background: "linear-gradient(135deg,#1c3040,#3c5d74,#527a91)", padding: "32px 40px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                            <div><div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>ABC International School</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Bengaluru, Karnataka — India</div></div>
                            <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 5 }}>Salary Slip</div><div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</div></div>
                        </div>
                        <div style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "0 0 14px" }} />
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>Generated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.2)", padding: "3px 12px", borderRadius: 3 }}>Confidential</span>
                        </div>
                    </div>
                    <div style={{ background: "#eaf1f6", borderBottom: "1px solid #d4e4ee", padding: "20px 40px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                        {[{ key: "Employee Name", val: `${selectedSalary?.teacher?.firstName || ""} ${selectedSalary?.teacher?.lastName || ""}` }, { key: "Department", val: selectedSalary?.teacher?.department || "—" }, { key: "Pay Period", val: `${new Date().toLocaleString("default", { month: "long" })} ${new Date().getFullYear()}` }, { key: "Email", val: selectedSalary?.teacher?.user?.email || "—" }].map((f, i) => (<div key={i}><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#527a91", marginBottom: 3 }}>{f.key}</div><div style={{ fontSize: 13, fontWeight: 600, color: "#1c3040", wordBreak: "break-all" }}>{f.val}</div></div>))}
                    </div>
                    <div style={{ padding: "28px 40px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                            <div>
                                <div style={{ background: "linear-gradient(135deg,#2b4557,#3c5d74)", padding: "9px 14px", borderRadius: "8px 8px 0 0" }}><span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#fff", letterSpacing: "1px" }}>Earnings</span></div>
                                <div style={{ border: "1px solid #d4e4ee", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                                    {[{ label: "Basic Salary", val: `₹${Number(selectedSalary?.basicSalary || 0).toLocaleString("en-IN")}` }, { label: "Bonus", val: `₹${Number(selectedSalary?.bonus || 0).toLocaleString("en-IN")}` }, { label: "HRA", val: "₹0" }, { label: "Other", val: "₹0" }].map((row, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", fontSize: 13, background: i % 2 === 1 ? "#f8fbfd" : "#fff", borderBottom: "1px solid #eef5fa" }}><span style={{ color: "#4A6878" }}>{row.label}</span><span style={{ color: "#3c5d74", fontWeight: 600 }}>{row.val}</span></div>))}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 13, fontWeight: 700, borderTop: "2px solid #d4e4ee", background: "#eaf1f6" }}><span style={{ color: "#3c5d74" }}>Gross Earnings</span><span style={{ color: "#3c5d74" }}>₹{(Number(selectedSalary?.basicSalary || 0) + Number(selectedSalary?.bonus || 0)).toLocaleString("en-IN")}</span></div>
                                </div>
                            </div>
                            <div>
                                <div style={{ background: "linear-gradient(135deg,#1c3040,#2b4557)", padding: "9px 14px", borderRadius: "8px 8px 0 0" }}><span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#fff", letterSpacing: "1px" }}>Deductions</span></div>
                                <div style={{ border: "1px solid #d4e4ee", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                                    {[{ label: "Total Deductions", val: `₹${Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}` }, { label: "PF", val: "₹0" }, { label: "Tax (TDS)", val: "₹0" }, { label: "Other", val: "₹0" }].map((row, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", fontSize: 13, background: i % 2 === 1 ? "#f8fbfd" : "#fff", borderBottom: "1px solid #eef5fa" }}><span style={{ color: "#4A6878" }}>{row.label}</span><span style={{ color: "#2b4557", fontWeight: 600 }}>{row.val}</span></div>))}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 13, fontWeight: 700, borderTop: "2px solid #d4e4ee", background: "#eaf1f6" }}><span style={{ color: "#2b4557" }}>Total Deductions</span><span style={{ color: "#2b4557" }}>₹{Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}</span></div>
                                </div>
                            </div>
                        </div>
                        <div style={{ background: "linear-gradient(135deg,#1c3040,#3c5d74,#527a91)", borderRadius: 12, padding: "22px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                            <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 4 }}>Net Salary Payable</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>For {new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}</div></div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>₹{Number(selectedSalary?.netSalary || 0).toLocaleString("en-IN")}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                            {["Employee Signature", "HR Department", "Principal / Director"].map((label, i) => (<div key={i} style={{ textAlign: "center" }}><div style={{ width: 130, height: 1, background: "#B8CCD8", margin: "50px auto 10px" }} /><div style={{ fontSize: 10.5, fontWeight: 600, color: "#527a91", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div></div>))}
                        </div>
                    </div>
                    <div style={{ background: "#eaf1f6", borderTop: "1px solid #d4e4ee", padding: "12px 40px", fontSize: 10.5, color: "#527a91", textAlign: "center", fontStyle: "italic" }}>This is a system-generated payslip and does not require a physical signature.</div>
                </div>
            </div>

            {/* ── SALARY HISTORY ── */}
            <div className="tsm-panel">
                <div className="tsm-panel-head" style={{ justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ClipboardList size={15} color="#fff" /><p className="tsm-panel-title">Teacher Salary History</p></div>
                    <div className="tsm-search-wrap"><Search size={14} className="tsm-search-ico" /><input className="tsm-search-inp" placeholder="Search teacher name or email..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ width: 260, background: "rgba(255,255,255,.95)" }} /></div>
                </div>
                <div className="tsm-panel-body">
                    <table className="tsm-tbl">
                        <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Month</th><th>Bonus</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {filteredHistory.length === 0 ? (
                                <tr><td colSpan={9} style={{ textAlign: "center", padding: "30px 0", color: "#6A9AB0" }}>No salary records found</td></tr>
                            ) : filteredHistory.map(t => (
                                <tr key={t.id || t.teacherId}>
                                    <td style={{ fontWeight: 600 }}>{t.teacher?.firstName} {t.teacher?.lastName}</td>
                                    <td style={{ color: "#5A7A8F" }}>{t.teacher?.user?.email}</td>
                                    <td><span className="tsm-badge tsm-badge-dept">{t.teacher?.department || "—"}</span></td>
                                    <td>{new Date(0, t.month - 1).toLocaleString("default", { month: "short" })} {t.year}</td>
                                    <td style={{ color: "#3c5d74", fontWeight: 600 }}>₹{t.bonus || 0}</td>
                                    <td style={{ color: "#2b4557", fontWeight: 600 }}>₹{t.deductions || 0}</td>
                                    <td><div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontWeight: 600 }}>₹{Number(t.netSalary || 0).toLocaleString()}</span>{t.status !== "PAID" ? <button className="tsm-btn-confirm" style={{ padding: "4px 12px", fontSize: 12 }} disabled={!t.id} onClick={() => payTeacherSalary(t.salaryId)}>Pay</button> : <span className="tsm-badge tsm-badge-paid">Paid</span>}</div></td>
                                    <td><span className="tsm-badge tsm-badge-paid">Success</span></td>
                                    <td><div className="tsm-actions"><button className="tsm-act tsm-act-edit" onClick={() => openEditModal(t)}><Pencil size={13} /></button><button className="tsm-act tsm-act-del" onClick={() => openDeleteModal(t)}><Trash2 size={13} /></button><button className="tsm-act tsm-act-hist" onClick={() => openHistoryModal(t)}><History size={13} /></button><button className="tsm-act tsm-act-view" onClick={() => openSlipModal(t)}><Eye size={13} /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}