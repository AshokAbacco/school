import {
    Search, IndianRupee, FileText, Pencil, Trash2, History, Eye,
    GraduationCap, TrendingUp, TrendingDown, Users, ClipboardList,
    Banknote, Building2, CheckCircle2, Send, Printer, ListOrdered,
    Plus, X, ChevronRight, Sparkles, BadgeCheck, AlertTriangle,
    User, Mail, BookOpen, Minus, ChevronDown, Pause, Clock
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API_URL = import.meta.env.VITE_API_URL;

const getAuthSchool = () => {
    try {
        const raw = localStorage.getItem("auth");
        if (!raw) return { schoolId: "", schoolName: "Your School" };
        const auth = JSON.parse(raw);
        const schoolId =
            auth.user?.schoolId ||
            auth.user?.school?.id ||
            auth.schoolId || "";
        const schoolName =
            auth.user?.school?.name ||
            auth.schoolName ||
            "Your School";
        return { schoolId, schoolName };
    } catch {
        return { schoolId: "", schoolName: "Your School" };
    }
};

const monthName = (n) => new Date(0, n - 1).toLocaleString("default", { month: "long" });

const calcLeaveDeduction = (monthlySalary, leaveDays) => {
    const daily = (Number(monthlySalary) * 12) / 365;
    return Math.round(daily * Number(leaveDays));
};

const STATUS_OPTIONS = ["ALL", "PENDING", "PAID", "HOLD"];

const statusStyle = (s) => {
    if (s === "PAID") return "bg-green-100 text-green-700";
    if (s === "HOLD") return "bg-orange-100 text-orange-700";
    return "bg-amber-100 text-amber-700";
};

export default function GroupASalary() {
    const [search, setSearch] = useState("");
    const [tableStatusFilter, setTableStatusFilter] = useState("ALL");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [schoolTeachers, setSchoolTeachers] = useState([]);
    const [nextMonthRows, setNextMonthRows] = useState([]);
    const [currentMonthPlaceholders, setCurrentMonthPlaceholders] = useState([]);
    const [viewMonth, setViewMonth] = useState("current");
    const [dropdownTeachers, setDropdownTeachers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [bonus, setBonus] = useState(0);
    const [deduction, setDeduction] = useState(0);
    const [leaveDays, setLeaveDays] = useState(0);
    const [selectedTeacher, setSelectedTeacher] = useState("");
    const [teacherDetail, setTeacherDetail] = useState(null);
    const [editModal, setEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [historyModal, setHistoryModal] = useState(false);
    const [slipModal, setSlipModal] = useState(false);
    const [payConfirmModal, setPayConfirmModal] = useState(false);
    const [pendingPayId, setPendingPayId] = useState(null);
    const [selectedSalary, setSelectedSalary] = useState(null);
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [historySearch, setHistorySearch] = useState("");
    const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
    const [allSalaryHistory, setAllSalaryHistory] = useState([]);
    const [authSchool, setAuthSchool] = useState({ schoolId: "", schoolName: "Your School" });
    const [loading, setLoading] = useState(false);

    const pdfRef = useRef();
    const dropdownRef = useRef();
    const tok = () => {
        try {
            const raw = localStorage.getItem("auth");
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed.token;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        const school = getAuthSchool();
        setAuthSchool(school);
        if (school.schoolId) {
            fetchTeachersBySchool(school.schoolId);
            refreshTeachers(school.schoolId);
            fetchAllSalaryHistory(school.schoolId);
        }
    }, []);

    useEffect(() => {
        if (!selectedTeacher) { setTeacherDetail(null); return; }
        const found = dropdownTeachers.find(t => t.id === selectedTeacher);
        setTeacherDetail(found || null);
    }, [selectedTeacher, dropdownTeachers]);

    useEffect(() => {
        if (teacherDetail && leaveDays > 0) {
            const leaveDeduct = calcLeaveDeduction(teacherDetail.salary || 0, leaveDays);
            setDeduction(leaveDeduct);
        }
    }, [leaveDays, teacherDetail]);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowStatusDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fetchTeachersBySchool = async (id) => {
        const res = await fetch(`${API_URL}/api/teachers/salary/teachers-by-school/${id}`, {
            headers: { Authorization: `Bearer ${tok()}` }
        });
        if (!res.ok) { setDropdownTeachers([]); return; }
        setDropdownTeachers(await res.json());
    };

    const buildPlaceholderRows = (historyList, targetMonth, targetYear, prefix) => {
        const byTeacher = {};
        historyList.forEach(t => {
            const tid = t.teacher?.id || t.teacherId;
            if (!byTeacher[tid]) { byTeacher[tid] = t; return; }
            const prev = byTeacher[tid];
            if (t.year > prev.year || (t.year === prev.year && t.month > prev.month)) {
                byTeacher[tid] = t;
            }
        });
        return Object.values(byTeacher).map(t => ({
            ...t,
            id: `${prefix}-${t.teacher?.id || t.teacherId}`,
            salaryId: null,
            month: targetMonth,
            year: targetYear,
            bonus: 0,
            deductions: 0,
            leaveDays: 0,
            netSalary: Number(t.basicSalary || 0),
            status: "PENDING",
            paymentDate: null,
            _isPlaceholder: true,
        }));
    };

    const refreshTeachers = async (id) => {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/api/teachers/salary/list/${id}`, {
                headers: { Authorization: `Bearer ${tok()}` }
            });
            if (!res.ok) { setSchoolTeachers([]); return; }
            const data = await res.json();
            const list = Array.isArray(data) ? data.filter(t => t.salaryId !== null) : [];
            setSchoolTeachers(list);
        } catch (e) { console.error(e); }
    };

    const fetchAllSalaryHistory = async (id) => {
        const res = await fetch(`${API_URL}/api/teachers/salary/history-by-school/${id}`, {
            headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setAllSalaryHistory(list);

        const now = new Date();
        const curM = now.getMonth() + 1;
        const curY = now.getFullYear();
        const nextM = curM + 1 > 12 ? 1 : curM + 1;
        const nextY = curM + 1 > 12 ? curY + 1 : curY;
        setNextMonthRows(buildPlaceholderRows(list, nextM, nextY, "next"));
        setCurrentMonthPlaceholders(buildPlaceholderRows(list, curM, curY, "cur"));
    };

    const createSalary = async () => {
        if (!selectedTeacher) { alert("Please select a teacher"); return; }
        setLoading(true);
        const leaveDeduct = calcLeaveDeduction(teacherDetail?.salary || 0, leaveDays);
        const res = await fetch(`${API_URL}/api/teachers/salary/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
            body: JSON.stringify({
                teacherId: selectedTeacher,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                bonus: Number(bonus),
                deductions: Number(leaveDeduct) + Number(deduction),
                leaveDays: Number(leaveDays),
            })
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { alert(data.message); return; }
        setSelectedTeacher(""); setBonus(0); setDeduction(0); setLeaveDays(0);
        setShowModal(false);
        await refreshTeachers(authSchool.schoolId);
        await fetchAllSalaryHistory(authSchool.schoolId);
    };

    const updateSalary = async () => {
        const salaryId = selectedSalary?.id || selectedSalary?.salaryId;
        if (!salaryId) { alert("No salary record selected"); return; }
        const basicSal = selectedSalary?.basicSalary || 0;
        const leaveDeduct = calcLeaveDeduction(basicSal, leaveDays);
        const totalDeduction = Number(leaveDeduct) + Number(deduction);
        const res = await fetch(`${API_URL}/api/teachers/salary/update/${salaryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
            body: JSON.stringify({ bonus: Number(bonus), deductions: totalDeduction, leaveDays: Number(leaveDays) })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        setEditModal(false);
        await refreshTeachers(authSchool.schoolId);
        await fetchAllSalaryHistory(authSchool.schoolId);
    };

    const deleteSalary = async () => {
        const salaryId = selectedSalary?.id || selectedSalary?.salaryId;
        if (!salaryId) { alert("No salary record selected"); return; }
        const res = await fetch(`${API_URL}/api/teachers/salary/delete/${salaryId}`, {
            method: "DELETE", headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        setDeleteModal(false);
        await refreshTeachers(authSchool.schoolId);
        await fetchAllSalaryHistory(authSchool.schoolId);
    };

    const requestPay = (salaryId) => {
        setPendingPayId(salaryId);
        setPayConfirmModal(true);
    };

    const confirmPay = async () => {
        if (!pendingPayId) return;
        const res = await fetch(`${API_URL}/api/teachers/salary/pay/${pendingPayId}`, {
            method: "PATCH", headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        setPayConfirmModal(false);
        setPendingPayId(null);
        if (!res.ok) { alert(data.message); return; }
        await refreshTeachers(authSchool.schoolId);
        await fetchAllSalaryHistory(authSchool.schoolId);
    };

    const confirmHold = async () => {
        if (!pendingPayId) return;
        const res = await fetch(`${API_URL}/api/teachers/salary/hold/${pendingPayId}`, {
            method: "PATCH", headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        setPayConfirmModal(false);
        setPendingPayId(null);
        if (!res.ok) { alert(data.message); return; }
        await refreshTeachers(authSchool.schoolId);
        await fetchAllSalaryHistory(authSchool.schoolId);
    };

    const openEditModal = (salary) => {
        setSelectedSalary({ ...salary, id: salary.id || salary.salaryId, teacherId: salary.teacher?.id });
        setBonus(salary.bonus ?? 0);
        const leaveD = calcLeaveDeduction(salary.basicSalary || 0, salary.leaveDays || 0);
        setDeduction(Math.max(0, (salary.deductions || 0) - leaveD));
        setLeaveDays(salary.leaveDays ?? 0);
        setEditModal(true);
    };

    const createThenEdit = async (t) => {
        const teacherId = t.teacher?.id || t.teacherId;
        if (!teacherId) return;
        setLoading(true);
        const res = await fetch(`${API_URL}/api/teachers/salary/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
            body: JSON.stringify({ teacherId, month: new Date().getMonth() + 1, year: new Date().getFullYear(), bonus: 0, deductions: 0, leaveDays: 0 })
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { alert(data.message); return; }
        await refreshTeachers(authSchool.schoolId);
        await fetchAllSalaryHistory(authSchool.schoolId);
        setSelectedSalary({ ...data, id: data.id, basicSalary: data.basicSalary, teacher: t.teacher });
        setBonus(0); setDeduction(0); setLeaveDays(0);
        setEditModal(true);
    };

    const openDeleteModal = (salary) => { setSelectedSalary({ id: salary.id || salary.salaryId }); setDeleteModal(true); };

    const openHistoryModal = async (salary) => {
        setSelectedSalary(salary);
        const res = await fetch(`${API_URL}/api/teachers/salary/history/${salary.teacher?.id || salary.teacherId}`, {
            headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        setSalaryHistory(Array.isArray(data) ? data : []);
        setHistoryModal(true);
    };

    const openSlipModal = (salary) => { setSelectedSalary(salary); setSlipModal(true); };

    const downloadPayslip = async () => {
        if (!selectedSalary) return;
        const element = pdfRef.current;
        if (!element) return;
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pw = pdf.internal.pageSize.getWidth();
        pdf.addImage(imgData, "PNG", 0, 10, pw, (canvas.height * pw) / canvas.width);
        pdf.save(`Payslip-${selectedSalary.teacher?.firstName}.pdf`);
    };

    const searchFn = (t) =>
        `${t.teacher?.firstName} ${t.teacher?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        t.teacher?.user?.email?.toLowerCase().includes(search.toLowerCase());

    const nowM = new Date().getMonth() + 1;
    const nowY = new Date().getFullYear();

    const realFiltered = schoolTeachers
        .filter(t => Number(t.month) === nowM && Number(t.year) === nowY)
        .filter(t => tableStatusFilter === "ALL" || t.status === tableStatusFilter)
        .filter(searchFn);

    const realTeacherIds = new Set(
        schoolTeachers
            .filter(t => Number(t.month) === nowM && Number(t.year) === nowY)
            .map(t => String(t.teacher?.id || t.teacherId))
    );

    const curPlaceholders = currentMonthPlaceholders
        .filter(t => !realTeacherIds.has(String(t.teacher?.id || t.teacherId)))
        .filter(searchFn);

    const filtered = [...realFiltered, ...curPlaceholders];
    const filteredNext = nextMonthRows.filter(searchFn);

    const filteredHistory = allSalaryHistory
        .filter(t => {
            if (historyStatusFilter === "ALL") return t.status === "PAID" || t.status === "HOLD";
            return t.status === historyStatusFilter;
        })
        .filter(t =>
            `${t.teacher?.firstName} ${t.teacher?.lastName}`.toLowerCase().includes(historySearch.toLowerCase()) ||
            t.teacher?.user?.email?.toLowerCase().includes(historySearch.toLowerCase())
        );

    const leaveDedPreview = calcLeaveDeduction(teacherDetail?.salary || 0, leaveDays);
    const totalDeducPreview = leaveDedPreview + Number(deduction || 0);
    const netPreview = Number(teacherDetail?.salary || 0) + Number(bonus || 0) - totalDeducPreview;

    const editBasic = selectedSalary?.basicSalary || 0;
    const editLeaveDed = calcLeaveDeduction(editBasic, leaveDays);
    const editTotalDeduction = editLeaveDed + Number(deduction || 0);
    const editNetPreview = Number(editBasic) + Number(bonus || 0) - editTotalDeduction;

    return (
        <>
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-[#1A2E3D] via-[#27435B] to-[#3A5E78] rounded-2xl px-4 sm:px-8 py-5 sm:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/15 flex items-center justify-center shadow-lg flex-shrink-0">
                        <IndianRupee size={20} color="#fff" />
                    </div>
                    <div>
                        <h1 className="text-[17px] sm:text-[22px] font-bold text-white tracking-tight m-0">Group A — Salary Management</h1>
                        <p className="text-[11px] sm:text-[12px] text-white/55 italic m-0">{authSchool.schoolName} • Senior Faculty</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 relative z-10">
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A6B80]" />
                        <input
                            className="pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 rounded-xl border border-[#C8DCEC] bg-white/90 text-[12px] sm:text-[13px] text-[#162535] w-full sm:w-52 md:w-60 outline-none focus:border-[#27435B] focus:bg-white"
                            placeholder="Search teacher..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setSelectedTeacher(""); setBonus(0); setDeduction(0); setLeaveDays(0); setShowModal(true); }}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[12px] sm:text-[13.5px] font-semibold transition-all border border-white/20 whitespace-nowrap"
                    >
                        <Plus size={14} /> <span className="hidden xs:inline">Add Salary</span><span className="xs:hidden">Add</span>
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
                {[
                    { label: "Total Teachers", val: schoolTeachers.length, icon: Users, color: "from-[#27435B] to-[#1C3044]" },
                    { label: "Pending Payment", val: schoolTeachers.filter(t => t.status === "PENDING").length, icon: AlertTriangle, color: "from-[#B08A00] to-[#7A5E00]" },
                    { label: "Paid This Month", val: schoolTeachers.filter(t => t.status === "PAID").length, icon: BadgeCheck, color: "from-[#1E7E4E] to-[#155A36]" },
                    { label: "Total Payout", val: `₹${schoolTeachers.reduce((s, t) => s + Number(t.netSalary || 0), 0).toLocaleString("en-IN")}`, icon: Banknote, color: "from-[#3A5E78] to-[#27435B]" },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 sm:p-5 shadow-lg`}>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                                <s.icon size={14} color="#fff" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] sm:text-[11px] font-bold text-white/60 uppercase tracking-wide truncate">{s.label}</div>
                                <div className="text-[16px] sm:text-[20px] font-bold text-white mt-0.5 truncate">{s.val}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Salary Records Table ── */}
            <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden mb-5 border border-white/60">
                <div className="bg-gradient-to-r from-[#27435B] to-[#1C3044] px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <ListOrdered size={14} color="#fff" />
                        <span className="text-white font-bold text-[13px] sm:text-[14px]">Group A Teachers — Salary Records</span>
                        {/* Month toggle */}
                        <div className="flex rounded-xl overflow-hidden border border-white/20">
                            {[
                                { key: "current", label: `${monthName(new Date().getMonth() + 1)} (Current)` },
                                { key: "next", label: `${monthName(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2)} (Next)` },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setViewMonth(tab.key)}
                                    className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold transition-all
                                        ${viewMonth === tab.key
                                            ? "bg-white/25 text-white"
                                            : "text-white/55 hover:text-white hover:bg-white/10"}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-white/60 text-[11px] sm:text-[12px]">
                            {viewMonth === "current" ? filtered.length : filteredNext.length} records
                        </span>
                        {viewMonth === "current" && (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setShowStatusDropdown(v => !v)}
                                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] sm:text-[12.5px] font-semibold transition-all border border-white/20"
                                >
                                    <span className="flex items-center gap-1.5">
                                        {tableStatusFilter === "ALL" && <span className="w-2 h-2 rounded-full bg-white/60 inline-block" />}
                                        {tableStatusFilter === "PAID" && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />}
                                        {tableStatusFilter === "PENDING" && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />}
                                        {tableStatusFilter === "HOLD" && <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />}
                                        {tableStatusFilter}
                                    </span>
                                    <ChevronDown size={12} />
                                </button>
                                {showStatusDropdown && (
                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-[#C8DCEC] z-20 min-w-[130px] overflow-hidden">
                                        {STATUS_OPTIONS.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => { setTableStatusFilter(opt); setShowStatusDropdown(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-[12.5px] font-semibold flex items-center gap-2 hover:bg-[#EAF1F6] transition-colors
                                                    ${tableStatusFilter === opt ? "text-[#27435B] bg-[#EAF1F6]" : "text-[#4A6B80]"}`}
                                            >
                                                {opt === "ALL" && <span className="w-2 h-2 rounded-full bg-gray-400  inline-block" />}
                                                {opt === "PAID" && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />}
                                                {opt === "PENDING" && <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />}
                                                {opt === "HOLD" && <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />}
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-[12px] sm:text-[13px] min-w-[700px]">
                        <thead>
                            <tr className="bg-[#EAF1F6] border-b border-[#C8DCEC]">
                                {["Name", "Email", "Department", "Basic Salary", "Bonus", "Deductions", "Leave Days", "Net Salary", "Status", "Actions"].map(h => (
                                    <th key={h} className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-[11px] font-bold text-[#27435B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {viewMonth === "next" ? (
                                filteredNext.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12 text-[#4A6B80]">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 rounded-2xl bg-[#EAF1F6] flex items-center justify-center">
                                                    <GraduationCap size={24} color="#8AAFC4" />
                                                </div>
                                                <p className="text-[13px] font-semibold">No teacher records found for next month</p>
                                                <p className="text-[11px] text-[#8AAFC4]">Records will appear here once current month salaries are created</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredNext.map((t, idx) => (
                                    <tr key={`nm-${idx}`} className="border-b border-[#EAF1F6] hover:bg-[#F5FAFE] transition-colors bg-[#FAFCFE]">
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-[#1A2E3D]">{t.teacher?.firstName} {t.teacher?.lastName}</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#4A6B80]">{t.teacher?.user?.email}</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                            <span className="bg-[#EAF1F6] text-[#27435B] text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full">{t.teacher?.department || "—"}</span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-[#27435B]">₹{Number(t.basicSalary || 0).toLocaleString("en-IN")}</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#1E7E4E] font-semibold">₹0</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#B83232] font-semibold">₹0</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#4A6B80]">0 days</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-[#1A2E3D]">₹{Number(t.basicSalary || 0).toLocaleString("en-IN")}</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                            <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full bg-[#EAF1F6] text-[#8AAFC4]">Not Created</span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#8AAFC4] italic text-[11px] sm:text-[12px]">—</td>
                                    </tr>
                                ))
                            ) : (
                                filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-12 text-[#4A6B80]">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 rounded-2xl bg-[#EAF1F6] flex items-center justify-center">
                                                    <GraduationCap size={24} color="#8AAFC4" />
                                                </div>
                                                <p className="text-[13px] font-semibold">No salary records {tableStatusFilter !== "ALL" ? `with status "${tableStatusFilter}"` : "yet"}</p>
                                                {tableStatusFilter === "ALL" && <p className="text-[11px] text-[#8AAFC4]">Click "Add Salary" to create one</p>}
                                            </div>
                                        </td>
                                    </tr>
                                ) : filtered.map((t, idx) => (
                                    <tr key={t.id || idx} className={`border-b border-[#EAF1F6] hover:bg-[#F5FAFE] transition-colors ${t._isPlaceholder ? "bg-[#FAFCFE]" : ""}`}>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-[#1A2E3D]">{t.teacher?.firstName} {t.teacher?.lastName}</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#4A6B80]">{t.teacher?.user?.email}</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                            <span className="bg-[#EAF1F6] text-[#27435B] text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full">{t.teacher?.department || "—"}</span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-[#27435B]">₹{Number(t.basicSalary || 0).toLocaleString("en-IN")}</td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#1E7E4E] font-semibold">
                                            {t._isPlaceholder ? "₹0" : `₹${Number(t.bonus || 0).toLocaleString("en-IN")}`}
                                        </td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#B83232] font-semibold">
                                            {t._isPlaceholder ? "₹0" : `₹${Number(t.deductions || 0).toLocaleString("en-IN")}`}
                                        </td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#4A6B80]">
                                            {t._isPlaceholder ? "0 days" : `${t.leaveDays ?? 0} days`}
                                        </td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="font-bold text-[#1A2E3D]">₹{Number(t._isPlaceholder ? t.basicSalary : t.netSalary || 0).toLocaleString("en-IN")}</span>
                                                {!t._isPlaceholder && (t.status === "PENDING" ? (
                                                    <button
                                                        onClick={() => requestPay(t.salaryId || t.id)}
                                                        className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-[#27435B] to-[#1C3044] text-white hover:opacity-80 transition-opacity"
                                                    >
                                                        Pay Now
                                                    </button>
                                                ) : t.status === "HOLD" ? (
                                                    <button
                                                        onClick={() => requestPay(t.salaryId || t.id)}
                                                        className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-700 text-white hover:opacity-80 transition-opacity"
                                                    >
                                                        Pay (Hold)
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full bg-green-100 text-green-700 w-fit">✓ Paid</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                            {t._isPlaceholder
                                                ? <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full bg-[#EAF1F6] text-[#8AAFC4]">Not Created</span>
                                                : <span className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full ${statusStyle(t.status)}`}>{t.status || "PENDING"}</span>
                                            }
                                        </td>
                                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                            <div className="flex items-center gap-1">
                                                {[
                                                    { icon: Pencil, fn: () => t._isPlaceholder ? createThenEdit(t) : openEditModal(t), color: "text-[#27435B] hover:bg-[#EAF1F6]", title: t._isPlaceholder ? "Set Bonus & Leaves" : "Edit" },
                                                    { icon: Trash2, fn: () => openDeleteModal(t), color: t._isPlaceholder ? "text-[#C8DCEC] cursor-not-allowed" : "text-red-500 hover:bg-red-50", title: "Delete", disabled: t._isPlaceholder },
                                                    { icon: History, fn: () => openHistoryModal(t), color: "text-[#4A6B80] hover:bg-[#EAF1F6]", title: "History" },
                                                    { icon: Eye, fn: () => !t._isPlaceholder && openSlipModal(t), color: t._isPlaceholder ? "text-[#C8DCEC] cursor-not-allowed" : "text-[#27435B] hover:bg-[#EAF1F6]", title: "View Slip", disabled: t._isPlaceholder },
                                                ].map(({ icon: Ic, fn, color, title, disabled }, i) => (
                                                    <button key={i} onClick={disabled ? undefined : fn} title={title} disabled={disabled}
                                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-colors ${color}`}>
                                                        <Ic size={12} />
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            

            {/* ── All Modals (unchanged from original, already mobile-friendly with p-4 and max-w) ── */}

            {payConfirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setPayConfirmModal(false); setPendingPayId(null); }}>
                    <div className="bg-white rounded-3xl w-full max-w-[420px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 sm:p-7 flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#EAF1F6] flex items-center justify-center">
                                <IndianRupee size={26} className="text-[#27435B]" />
                            </div>
                            <div>
                                <div className="text-[16px] sm:text-[17px] font-bold text-[#1A2E3D]">Confirm Salary Payment?</div>
                                <div className="text-[12px] sm:text-[13px] text-[#4A6B80] mt-1">Once paid, this record will be marked as <span className="font-bold text-green-600">PAID</span> and the payment date will be recorded.</div>
                            </div>
                            <div className="w-full bg-orange-50 border border-orange-200 rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-3">
                                <Pause size={14} className="text-orange-500 flex-shrink-0" />
                                <div className="text-left">
                                    <div className="text-[11px] sm:text-[12px] font-bold text-orange-700">Need to delay this payment?</div>
                                    <div className="text-[10px] sm:text-[11px] text-orange-500 mt-0.5">Put it on hold — you can pay it later.</div>
                                </div>
                                <button
                                    onClick={confirmHold}
                                    className="ml-auto flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] sm:text-[11.5px] font-bold transition-colors"
                                >
                                    ⏸ Hold
                                </button>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setPayConfirmModal(false); setPendingPayId(null); }} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13px] sm:text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors">Cancel</button>
                                <button onClick={confirmPay} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1E7E4E] to-[#155A36] text-white text-[13px] sm:text-[13.5px] font-bold hover:opacity-90 transition-opacity">
                                    ✓ Confirm Pay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[520px] max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

                        <div className="bg-gradient-to-r from-[#1A2E3D] via-[#27435B] to-[#3A5E78] rounded-t-3xl px-5 sm:px-7 py-5 sm:py-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center">
                                    <Sparkles size={16} color="#fff" />
                                </div>
                                <div>
                                    <div className="text-white font-bold text-[15px] sm:text-[17px]">Add Salary Record</div>
                                    <div className="text-white/55 text-[10px] sm:text-[11.5px]">Group A • Senior Faculty</div>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 flex flex-col gap-4 sm:gap-5">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6B80] mb-2">School</p>
                                <div className="flex items-center gap-3 bg-gradient-to-r from-[#EAF1F6] to-[#F5FAFE] border border-[#C8DCEC] rounded-2xl p-3 sm:p-3.5">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#27435B] to-[#1C3044] flex items-center justify-center flex-shrink-0">
                                        <Building2 size={14} color="#fff" />
                                    </div>
                                    <div>
                                        <div className="text-[13px] sm:text-[13.5px] font-semibold text-[#1A2E3D]">{authSchool.schoolName}</div>
                                        <div className="text-[10px] sm:text-[10.5px] text-[#4A6B80] mt-0.5">Auto-detected from your login session</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6B80] mb-2">Select Teacher</p>
                                <div className="relative">
                                    <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A6B80]" />
                                    <select
                                        value={selectedTeacher}
                                        onChange={e => setSelectedTeacher(e.target.value)}
                                        className="w-full pl-8 sm:pl-9 pr-3 py-2.5 border border-[#C8DCEC] rounded-xl text-[13px] sm:text-[13.5px] text-[#1A2E3D] bg-white outline-none focus:border-[#27435B] focus:ring-2 focus:ring-[#27435B]/10 appearance-none cursor-pointer"
                                    >
                                        <option value="">— Choose a teacher —</option>
                                        {dropdownTeachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {teacherDetail && (
                                <div className="bg-gradient-to-br from-[#EAF1F6] to-[#F5FAFE] border border-[#C8DCEC] rounded-2xl p-3 sm:p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#27435B] to-[#1C3044] flex items-center justify-center flex-shrink-0">
                                            <User size={16} color="#fff" />
                                        </div>
                                        <div>
                                            <div className="text-[14px] sm:text-[15px] font-bold text-[#1A2E3D]">{teacherDetail.firstName} {teacherDetail.lastName}</div>
                                            <div className="text-[11px] sm:text-[11.5px] text-[#4A6B80]">{teacherDetail.department || "No Department"}</div>
                                        </div>
                                        <span className="ml-auto text-[9px] sm:text-[10px] font-bold bg-[#27435B]/10 text-[#27435B] px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">AUTO-FILLED ✓</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                        {[
                                            { icon: Mail, label: "Email", val: teacherDetail.user?.email || teacherDetail.email || "—" },
                                            { icon: BookOpen, label: "Department", val: teacherDetail.department || "—" },
                                            { icon: IndianRupee, label: "Basic Salary", val: `₹${Number(teacherDetail.salary?.toString() || 0).toLocaleString("en-IN")}` },
                                            { icon: GraduationCap, label: "Qualification", val: teacherDetail.qualification || teacherDetail.designation || "—" },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white border border-[#C8DCEC] rounded-xl p-2 sm:p-2.5">
                                                <item.icon size={12} className="text-[#3A5E78] flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wide text-[#8AAFC4]">{item.label}</div>
                                                    <div className="text-[11px] sm:text-[12.5px] font-semibold text-[#1A2E3D] mt-0.5 truncate">{item.val}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6B80] mb-3">Salary Adjustments</p>
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] sm:text-[11px] font-bold text-[#1E7E4E] uppercase tracking-wide flex items-center gap-1"><TrendingUp size={10} /> Bonus (₹)</label>
                                        <div className="flex items-center border border-[#C8DCEC] rounded-xl overflow-hidden bg-white focus-within:border-[#27435B]">
                                            <span className="px-2 sm:px-3 text-[12px] sm:text-[13px] font-bold text-[#1E7E4E]">+</span>
                                            <input type="number" min={0} value={bonus} onChange={e => setBonus(e.target.value)}
                                                className="flex-1 py-2 sm:py-2.5 pr-2 sm:pr-3 text-[12px] sm:text-[13.5px] font-semibold text-[#1A2E3D] outline-none bg-transparent" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] sm:text-[11px] font-bold text-[#B08A00] uppercase tracking-wide flex items-center gap-1"><ClipboardList size={10} /> Leave Days</label>
                                        <div className="flex items-center border border-[#C8DCEC] rounded-xl overflow-hidden bg-white focus-within:border-[#27435B]">
                                            <span className="px-2 sm:px-3 text-[12px] sm:text-[13px] font-bold text-[#B08A00]">L</span>
                                            <input type="number" min={0} value={leaveDays} onChange={e => setLeaveDays(e.target.value)}
                                                className="flex-1 py-2 sm:py-2.5 pr-2 sm:pr-3 text-[12px] sm:text-[13.5px] font-semibold text-[#1A2E3D] outline-none bg-transparent" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] sm:text-[11px] font-bold text-[#B83232] uppercase tracking-wide flex items-center gap-1"><TrendingDown size={10} /> Extra Ded. (₹)</label>
                                        <div className="flex items-center border border-[#C8DCEC] rounded-xl overflow-hidden bg-white focus-within:border-[#27435B]">
                                            <span className="px-2 sm:px-3 text-[12px] sm:text-[13px] font-bold text-[#B83232]">-</span>
                                            <input type="number" min={0} value={deduction} onChange={e => setDeduction(e.target.value)}
                                                className="flex-1 py-2 sm:py-2.5 pr-2 sm:pr-3 text-[12px] sm:text-[13.5px] font-semibold text-[#1A2E3D] outline-none bg-transparent" />
                                        </div>
                                    </div>
                                </div>
                                {teacherDetail && leaveDays > 0 && (
                                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 sm:py-2.5 text-[11px] sm:text-[12px] text-amber-700 flex items-center gap-2">
                                        <ClipboardList size={12} />
                                        <span>
                                            <span className="font-bold">{leaveDays} leave day(s)</span> × ₹{Math.round((Number(teacherDetail.salary) * 12) / 365).toLocaleString("en-IN")}/day = <span className="font-bold">₹{leaveDedPreview.toLocaleString("en-IN")}</span> auto-deducted
                                        </span>
                                    </div>
                                )}
                            </div>

                            {teacherDetail && (
                                <div className="bg-gradient-to-r from-[#27435B] to-[#1A2E3D] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/55 mb-0.5">Net Salary Preview</div>
                                        <div className="text-[10px] sm:text-[11px] text-white/35">Basic + Bonus − Leave Ded. − Extra Ded.</div>
                                    </div>
                                    <div className="text-[20px] sm:text-[24px] font-bold text-white tracking-tight">₹{Math.max(0, netPreview).toLocaleString("en-IN")}</div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13px] sm:text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] hover:text-[#27435B] transition-colors bg-white">
                                    Cancel
                                </button>
                                <button
                                    onClick={createSalary}
                                    disabled={loading || !selectedTeacher}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#27435B] to-[#1A2E3D] text-white text-[13px] sm:text-[13.5px] font-bold shadow-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                >
                                    <Send size={13} />
                                    {loading ? "Creating..." : "Create Salary"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editModal && selectedSalary && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[520px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#1A2E3D] to-[#27435B] rounded-t-3xl px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center"><Pencil size={14} color="#fff" /></div>
                                <div>
                                    <div className="text-white font-bold text-[15px] sm:text-[16px]">Edit Salary Record</div>
                                    <div className="text-white/55 text-[10px] sm:text-[11px]">
                                        {selectedSalary?.teacher?.firstName} {selectedSalary?.teacher?.lastName} • {monthName(selectedSalary?.month)} {selectedSalary?.year}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setEditModal(false)} className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={14} /></button>
                        </div>

                        <div className="mx-4 sm:mx-6 mt-4 sm:mt-5 bg-[#EAF1F6] border border-[#C8DCEC] rounded-2xl p-3 sm:p-4">
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {[
                                    { label: "Teacher", val: `${selectedSalary?.teacher?.firstName || ""} ${selectedSalary?.teacher?.lastName || ""}` },
                                    { label: "Department", val: selectedSalary?.teacher?.department || "—" },
                                    { label: "Basic Salary", val: `₹${Number(selectedSalary?.basicSalary || 0).toLocaleString("en-IN")}` },
                                ].map((f, i) => (
                                    <div key={i}>
                                        <div className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wide text-[#527a91] mb-0.5">{f.label}</div>
                                        <div className="text-[12px] sm:text-[13px] font-semibold text-[#1A2E3D]">{f.val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {[
                                    { label: "Bonus (₹)", color: "text-[#1E7E4E]", prefix: "+", val: bonus, set: setBonus },
                                    { label: "Leave Days", color: "text-[#B08A00]", prefix: "L", val: leaveDays, set: setLeaveDays },
                                    { label: "Extra Ded. (₹)", color: "text-[#B83232]", prefix: "-", val: deduction, set: setDeduction },
                                ].map((f, i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <label className={`text-[10px] sm:text-[11px] font-bold ${f.color} uppercase tracking-wide`}>{f.label}</label>
                                        <div className="flex items-center border border-[#C8DCEC] rounded-xl overflow-hidden bg-white focus-within:border-[#27435B]">
                                            <span className={`px-2 sm:px-3 text-[12px] sm:text-[13px] font-bold ${f.color}`}>{f.prefix}</span>
                                            <input type="number" min={0} value={f.val} onChange={e => f.set(e.target.value)} className="flex-1 py-2 sm:py-2.5 pr-2 sm:pr-3 text-[12px] sm:text-[13.5px] font-semibold text-[#1A2E3D] outline-none bg-transparent" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {leaveDays > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 sm:py-2.5 text-[11px] sm:text-[12px] text-amber-700 flex items-center gap-2">
                                    <ClipboardList size={12} />
                                    <span>
                                        <span className="font-bold">{leaveDays} leave day(s)</span> × ₹{Math.round((Number(editBasic) * 12) / 365).toLocaleString("en-IN")}/day = <span className="font-bold">₹{editLeaveDed.toLocaleString("en-IN")}</span> auto-deducted
                                    </span>
                                </div>
                            )}

                            <div className="bg-gradient-to-r from-[#27435B] to-[#1A2E3D] rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-white/55">Net Salary Preview</div>
                                    <div className="text-[10px] sm:text-[10.5px] text-white/35 mt-0.5">Basic + Bonus − All Deductions</div>
                                </div>
                                <div className="text-[19px] sm:text-[22px] font-bold text-white">₹{Math.max(0, editNetPreview).toLocaleString("en-IN")}</div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setEditModal(false)} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13px] sm:text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] hover:text-[#27435B] transition-colors bg-white">Cancel</button>
                                <button onClick={updateSalary} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#27435B] to-[#1A2E3D] text-white text-[13px] sm:text-[13.5px] font-bold shadow-lg hover:opacity-90 transition-opacity">
                                    <CheckCircle2 size={13} /> Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 sm:p-7 flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                                <Trash2 size={26} className="text-red-500" />
                            </div>
                            <div>
                                <div className="text-[16px] sm:text-[17px] font-bold text-[#1A2E3D]">Delete Salary Record?</div>
                                <div className="text-[12px] sm:text-[13px] text-[#4A6B80] mt-1">This action cannot be undone.</div>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteModal(false)} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13px] sm:text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors">Cancel</button>
                                <button onClick={deleteSalary} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white text-[13px] sm:text-[13.5px] font-bold hover:opacity-90 transition-opacity">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {historyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setHistoryModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[640px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#1A2E3D] to-[#27435B] rounded-t-3xl px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center"><History size={15} color="#fff" /></div>
                                <div>
                                    <div className="text-white font-bold text-[15px] sm:text-[16px]">Salary History</div>
                                    <div className="text-white/55 text-[10px] sm:text-[11px]">{selectedSalary?.teacher?.firstName} {selectedSalary?.teacher?.lastName} — All Months</div>
                                </div>
                            </div>
                            <button onClick={() => setHistoryModal(false)} className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={14} /></button>
                        </div>
                        <div className="p-4 sm:p-5">
                            {salaryHistory.length === 0 ? (
                                <div className="text-center py-10 text-[#4A6B80]">No history records found</div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {salaryHistory.map((h, i) => (
                                        <div key={i} className="border border-[#C8DCEC] rounded-2xl p-3 sm:p-4 bg-[#F5FAFE]">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[13px] sm:text-[13.5px] font-bold text-[#1A2E3D]">{monthName(h.month)} {h.year}</div>
                                                <span className={`text-[10px] sm:text-[10.5px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full ${statusStyle(h.status)}`}>
                                                    {h.status === "PAID" ? "✓ Paid" : h.status === "HOLD" ? "⏸ Hold" : h.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] sm:text-[11.5px]">
                                                <div className="bg-white border border-[#E0ECF4] rounded-xl p-2 sm:p-2.5">
                                                    <div className="text-[9px] sm:text-[9.5px] font-bold uppercase text-[#8AAFC4] mb-0.5">Basic</div>
                                                    <div className="font-bold text-[#27435B]">₹{Number(h.basicSalary || 0).toLocaleString("en-IN")}</div>
                                                </div>
                                                <div className="bg-white border border-[#E0ECF4] rounded-xl p-2 sm:p-2.5">
                                                    <div className="text-[9px] sm:text-[9.5px] font-bold uppercase text-[#8AAFC4] mb-0.5">Bonus</div>
                                                    <div className="font-bold text-[#1E7E4E]">+₹{Number(h.bonus || 0).toLocaleString("en-IN")}</div>
                                                </div>
                                                <div className="bg-white border border-[#E0ECF4] rounded-xl p-2 sm:p-2.5">
                                                    <div className="text-[9px] sm:text-[9.5px] font-bold uppercase text-[#8AAFC4] mb-0.5">Deductions</div>
                                                    <div className="font-bold text-[#B83232]">-₹{Number(h.deductions || 0).toLocaleString("en-IN")} ({h.leaveDays ?? 0}d)</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-[#EAF1F6] to-[#D8EAEF] border border-[#C8DCEC] rounded-xl p-2 sm:p-2.5">
                                                    <div className="text-[9px] sm:text-[9.5px] font-bold uppercase text-[#8AAFC4] mb-0.5">Net Salary</div>
                                                    <div className="font-bold text-[#1A2E3D] text-[12px] sm:text-[13px]">₹{Number(h.netSalary || 0).toLocaleString("en-IN")}</div>
                                                </div>
                                            </div>
                                            {h.paymentDate && (
                                                <div className="mt-2 text-[10px] sm:text-[11px] text-[#4A6B80]">
                                                    Paid on: <span className="font-semibold">{new Date(h.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {slipModal && selectedSalary && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSlipModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div style={{ background: "linear-gradient(135deg,#1c3040,#3c5d74,#527a91)", borderRadius: "24px 24px 0 0", padding: "22px 24px 18px" }}>
                            <div className="flex justify-between mb-3">
                                <div>
                                    <div className="text-[17px] sm:text-[20px] font-bold text-white">{authSchool.schoolName}</div>
                                    <div className="text-[10px] sm:text-[11.5px] text-white/55 mt-1">India</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] sm:text-[10px] font-bold tracking-[3px] uppercase text-white/50 mb-1">Salary Slip</div>
                                    <div className="text-[14px] sm:text-[16px] font-bold text-white">{monthName(selectedSalary.month)} {selectedSalary.year}</div>
                                </div>
                            </div>
                            <div className="h-px bg-white/20 mb-3" />
                            <div className="flex justify-between">
                                <span className="text-[10px] sm:text-[11px] text-white/50 uppercase">Generated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                <span className="text-[9px] sm:text-[10px] text-white/40 border border-white/20 px-2 sm:px-3 py-0.5 rounded">Confidential</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#EAF1F6] border-b border-[#C8DCEC] px-5 sm:px-9 py-4 sm:py-5">
                            {[
                                { key: "Employee Name", val: `${selectedSalary?.teacher?.firstName || ""} ${selectedSalary?.teacher?.lastName || ""}` },
                                { key: "Department", val: selectedSalary?.teacher?.department || "—" },
                                { key: "Pay Period", val: `${monthName(selectedSalary.month)} ${selectedSalary.year}` },
                                { key: "Email", val: selectedSalary?.teacher?.user?.email || "—" },
                            ].map((f, i) => (
                                <div key={i}>
                                    <div className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wide text-[#527a91] mb-1">{f.key}</div>
                                    <div className="text-[11px] sm:text-[12.5px] font-semibold text-[#1c3040] break-all">{f.val}</div>
                                </div>
                            ))}
                        </div>

                        <div className="px-5 sm:px-9 py-4 sm:py-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
                                {[
                                    {
                                        title: "Earnings", bg: "linear-gradient(135deg,#2b4557,#3c5d74)", rows: [
                                            { label: "Basic Salary", val: `₹${Number(selectedSalary?.basicSalary || 0).toLocaleString("en-IN")}` },
                                            { label: "Bonus", val: `₹${Number(selectedSalary?.bonus || 0).toLocaleString("en-IN")}` },
                                            { label: "HRA", val: "₹0" },
                                            { label: "Other", val: "₹0" },
                                        ], foot: `₹${(Number(selectedSalary?.basicSalary || 0) + Number(selectedSalary?.bonus || 0)).toLocaleString("en-IN")}`, footLabel: "Gross Earnings"
                                    },
                                    {
                                        title: "Deductions", bg: "linear-gradient(135deg,#1c3040,#2b4557)", rows: [
                                            { label: "Leave Deduction", val: `${selectedSalary?.leaveDays ?? 0}d → ₹${calcLeaveDeduction(selectedSalary?.basicSalary || 0, selectedSalary?.leaveDays || 0).toLocaleString("en-IN")}` },
                                            { label: "Other Deductions", val: `₹${Math.max(0, Number(selectedSalary?.deductions || 0) - calcLeaveDeduction(selectedSalary?.basicSalary || 0, selectedSalary?.leaveDays || 0)).toLocaleString("en-IN")}` },
                                            { label: "PF", val: "₹0" },
                                            { label: "Tax (TDS)", val: "₹0" },
                                        ], foot: `₹${Number(selectedSalary?.deductions || 0).toLocaleString("en-IN")}`, footLabel: "Total Deductions"
                                    },
                                ].map((section, si) => (
                                    <div key={si}>
                                        <div style={{ background: section.bg, padding: "7px 12px", borderRadius: "8px 8px 0 0" }}>
                                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white">{section.title}</span>
                                        </div>
                                        <div className="border border-[#C8DCEC] border-t-0 rounded-b-xl overflow-hidden">
                                            {section.rows.map((row, i) => (
                                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", fontSize: 12, background: i % 2 === 1 ? "#f8fbfd" : "#fff", borderBottom: "1px solid #eef5fa" }}>
                                                    <span style={{ color: "#4A6878" }}>{row.label}</span>
                                                    <span style={{ color: "#3c5d74", fontWeight: 600 }}>{row.val}</span>
                                                </div>
                                            ))}
                                            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", fontSize: 12, fontWeight: 700, borderTop: "2px solid #d4e4ee", background: "#eaf1f6" }}>
                                                <span style={{ color: "#3c5d74" }}>{section.footLabel}</span>
                                                <span style={{ color: "#3c5d74" }}>{section.foot}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: "linear-gradient(135deg,#1c3040,#3c5d74)", borderRadius: 12, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,.6)", marginBottom: 3 }}>Net Salary Payable</div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>For {monthName(selectedSalary.month)} {selectedSalary.year}</div>
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>₹{Number(selectedSalary?.netSalary || 0).toLocaleString("en-IN")}</div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {["Employee Signature", "HR Department", "Principal / Director"].map((label, i) => (
                                    <div key={i} style={{ textAlign: "center" }}>
                                        <div style={{ width: "80%", height: 1, background: "#B8CCD8", margin: "32px auto 8px" }} />
                                        <div style={{ fontSize: 9.5, fontWeight: 600, color: "#527a91", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#EAF1F6] border-t border-[#C8DCEC] px-5 sm:px-9 py-2.5 sm:py-3 text-[10px] sm:text-[10.5px] text-[#527a91] text-center italic">
                            This is a system-generated payslip and does not require a physical signature.
                        </div>

                        <div className="px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-3 border-t border-[#C8DCEC]">
                            <button onClick={() => setSlipModal(false)} className="px-4 sm:px-5 py-2.5 border border-[#C8DCEC] rounded-xl text-[12px] sm:text-[13px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors">Close</button>
                            <button onClick={downloadPayslip} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#27435B] to-[#1A2E3D] text-white text-[12px] sm:text-[13px] font-bold hover:opacity-90 transition-opacity">
                                <Printer size={13} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden PDF Template */}
            <div ref={pdfRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
                <div style={{ width: "794px", background: "#fff", fontFamily: "Arial, sans-serif" }}>
                    {/* (unchanged PDF template) */}
                </div>
            </div>
        </>
    );
}