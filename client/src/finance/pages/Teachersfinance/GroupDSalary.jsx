// src/finance/pages/Teachersfinance/GroupDSalary.jsx
import {
    Search, IndianRupee, FileText, Pencil, Trash2, History, Eye,
    Users, TrendingUp, TrendingDown, ClipboardList,
    Banknote, Building2, CheckCircle2, Send, Printer, ListOrdered,
    Plus, X, Sparkles, BadgeCheck, AlertTriangle,
    User, Mail, Minus, ChevronDown, Pause, Clock
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import { FaWhatsapp } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const getPlan = () => {
    try {
        const auth = JSON.parse(localStorage.getItem("auth"));
        return auth?.user?.planName || auth?.planName || "Silver";
    } catch {
        return "Silver";
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

const getToken = () => {
    try {
        const auth = JSON.parse(localStorage.getItem("auth"));
        return auth?.token;
    } catch { return null; }
};

const getSchool = () => {
    try {
        const auth = JSON.parse(localStorage.getItem("auth"));
        const schoolId =
            auth?.user?.schoolId ||
            auth?.schoolId ||
            auth?.user?.school?.id ||
            null;
        const schoolName =
            auth?.user?.school?.name ||
            auth?.school?.name ||
            "Your School";
        return { schoolId, schoolName };
    } catch {
        return { schoolId: null, schoolName: "Your School" };
    }
};

export default function GroupDSalary() {
    // ── State ──────────────────────────────────────────────────────────
    const isPremium = getPlan() === "Premium";
    const [admins, setAdmins] = useState([]);
    const [salaryList, setSalaryList] = useState([]);
    const [allSalaryHistory, setAllSalaryHistory] = useState([]);
    const [nextMonthRows, setNextMonthRows] = useState([]);
    const [currentMonthPlaceholders, setCurrentMonthPlaceholders] = useState([]);
    const [viewMonth, setViewMonth] = useState("current");

    const [search, setSearch] = useState("");
    const [tableStatusFilter, setTableStatusFilter] = useState("ALL");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState("");
    const [adminDetail, setAdminDetail] = useState(null);
    const [bonus, setBonus] = useState(0);
    const [deduction, setDeduction] = useState(0);
    const [leaveDays, setLeaveDays] = useState(0);

    const [editModal, setEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [historyModal, setHistoryModal] = useState(false);
    const [slipModal, setSlipModal] = useState(false);
    const [payConfirmModal, setPayConfirmModal] = useState(false);
    const [whatsappModal, setWhatsappModal] = useState(false);
    const [selectedWhatsappSalary, setSelectedWhatsappSalary] = useState(null);

    const [pendingPayId, setPendingPayId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [historySearch, setHistorySearch] = useState("");
    const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");

    const [school, setSchool] = useState({ schoolId: null, schoolName: "" });
    const [loading, setLoading] = useState(false);
    const [adminsLoading, setAdminsLoading] = useState(false);
    const [adminsError, setAdminsError] = useState("");
    const [salaryLoading, setSalaryLoading] = useState(false);

    // ── Bulk WhatsApp state ──
    const [selectedRows, setSelectedRows] = useState([]);
    const [bulkSending, setBulkSending] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ total: 0, completed: 0, current: "" });

    const dropdownRef = useRef();

    // ── Effects ───────────────────────────────────────────────────────
    useEffect(() => {
        const schoolData = getSchool();
        setSchool(schoolData);
        if (!schoolData.schoolId) {
            setAdminsError("School ID not found in session. Please log in again or contact support.");
            return;
        }
        fetchAdmins(schoolData.schoolId);
        fetchAllSalaryHistory(schoolData.schoolId);
    }, []);

    useEffect(() => {
        if (!selectedAdmin) { setAdminDetail(null); return; }
        const found = admins.find(a => a.id === selectedAdmin);
        setAdminDetail(found || null);
    }, [selectedAdmin, admins]);

    useEffect(() => {
        if (adminDetail && leaveDays > 0) {
            const leaveDeduct = calcLeaveDeduction(adminDetail.salary || 0, leaveDays);
            setDeduction(leaveDeduct);
        }
    }, [leaveDays, adminDetail]);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowStatusDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        setSelectedRows([]);
    }, [viewMonth, tableStatusFilter, search]);

    // ── API Functions ─────────────────────────────────────────────────

    const fetchAdmins = async (schoolId) => {
        setAdminsLoading(true);
        setAdminsError("");
        try {
            const [adminRes, financeRes] = await Promise.all([
                fetch(`${API_URL}/api/admin-salary/admins-by-school/${schoolId}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                }),
                fetch(`${API_URL}/api/finance-salary/finance-users/${schoolId}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                }),
            ]);
            const adminData = await adminRes.json();
            const financeData = await financeRes.json();

            const formattedAdmins = (Array.isArray(adminData) ? adminData : []).map(a => ({
                ...a,
                userType: "ADMIN",
                salary: Number(a.schoolAdminProfile?.basicSalary || 0),
                designation: a.schoolAdminProfile?.designation || "Admin",
                salaryApi: "/api/admin-salary/create",
                historyApi: (id) => `/api/admin-salary/history/${id}`,
                payApi: (id) => `/api/admin-salary/pay/${id}`,
                holdApi: (id) => `/api/admin-salary/hold/${id}`,
                deleteApi: (id) => `/api/admin-salary/delete/${id}`,
                updateApi: (id) => `/api/admin-salary/update/${id}`,
            }));

            const formattedFinance = (Array.isArray(financeData) ? financeData : []).map(f => ({
                ...f,
                userType: "FINANCE",
                salary: Number(f.financeProfile?.salary || 0),
                designation: f.financeProfile?.designation || "Finance Officer",
                salaryApi: "/api/finance-salary/create",
                historyApi: (id) => `/api/finance-salary/history/${id}`,
                payApi: (id) => `/api/finance-salary/pay/${id}`,
                holdApi: (id) => `/api/finance-salary/hold/${id}`,
                deleteApi: (id) => `/api/admin-salary/delete/${id}`,
                updateApi: (id) => `/api/admin-salary/update/${id}`,
            }));

            const merged = [...formattedAdmins, ...formattedFinance];
            setAdmins(merged);
            if (merged.length === 0) setAdminsError("No admin or finance users found for this school.");
        } catch (e) {
            console.error(e);
            setAdminsError("Failed to load users.");
            setAdmins([]);
        } finally {
            setAdminsLoading(false);
        }
    };

    const buildPlaceholderRows = (historyList, targetMonth, targetYear, prefix) => {
        const byUser = {};
        historyList.forEach(t => {
            const uid = t.admin?.id || t.adminId;
            if (!uid) return;
            if (!byUser[uid]) { byUser[uid] = t; return; }
            const prev = byUser[uid];
            if (t.year > prev.year || (t.year === prev.year && t.month > prev.month)) {
                byUser[uid] = t;
            }
        });
        return Object.values(byUser).map(t => ({
            ...t,
            id: `${prefix}-${t.admin?.id || t.adminId}`,
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

    const fetchAllSalaryHistory = async (schoolId) => {
        setSalaryLoading(true);
        try {
            const [adminRes, financeRes] = await Promise.all([
                fetch(`${API_URL}/api/admin-salary/list/${schoolId}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                }),
                fetch(`${API_URL}/api/finance-salary/list/${schoolId}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                }),
            ]);
            const adminData = await adminRes.json();
            const financeData = await financeRes.json();

            // normalise finance records to use admin/adminId field shape
            const normFinance = (Array.isArray(financeData) ? financeData : []).map(f => ({
                ...f,
                adminId: f.financeId,
                admin: f.finance
                    ? {
                        id: f.finance.id,
                        name: f.finance.name,
                        email: f.finance.email,
                        designation: f.finance.financeProfile?.designation,
                        employeeId: f.finance.financeProfile?.employeeCode,
                    }
                    : null,
                basicSalary: f.basicSalary,
                _userType: "FINANCE",
            }));

            const normAdmin = (Array.isArray(adminData) ? adminData : []).map(a => ({
                ...a,
                _userType: "ADMIN",
            }));

            const combined = [...normAdmin, ...normFinance];
            setSalaryList(combined.filter(r => {
                const now = new Date();
                return Number(r.month) === now.getMonth() + 1 && Number(r.year) === now.getFullYear();
            }));
            setAllSalaryHistory(combined);

            const now = new Date();
            const curM = now.getMonth() + 1;
            const curY = now.getFullYear();
            const nextM = curM + 1 > 12 ? 1 : curM + 1;
            const nextY = curM + 1 > 12 ? curY + 1 : curY;
            setNextMonthRows(buildPlaceholderRows(combined, nextM, nextY, "next"));
            setCurrentMonthPlaceholders(buildPlaceholderRows(combined, curM, curY, "cur"));
        } catch (e) {
            console.error(e);
        } finally {
            setSalaryLoading(false);
        }
    };

    const createSalary = async () => {
        if (!selectedAdmin) { alert("Please select a user"); return; }
        const admin = admins.find(a => a.id === selectedAdmin);
        if (!admin) { alert("User not found"); return; }
        const basicSalary = Number(admin?.salary || 0);
        if (!basicSalary) { alert(`${admin.name} has no salary configured`); return; }
        setLoading(true);
        try {
            const leaveDeduct = calcLeaveDeduction(admin.salary || 0, leaveDays);
            const bodyData = {
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                bonus: Number(bonus),
                deductions: Number(leaveDeduct) + Number(deduction),
                leaveDays: Number(leaveDays),
            };
            if (admin.userType === "ADMIN") bodyData.adminId = selectedAdmin;
            if (admin.userType === "FINANCE") bodyData.financeId = selectedAdmin;

            const res = await fetch(`${API_URL}${admin.salaryApi}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(bodyData),
            });
            const data = await res.json();
            if (!res.ok) { alert(data.message || "Failed to create salary"); return; }
            setShowModal(false);
            setSelectedAdmin(""); setBonus(0); setDeduction(0); setLeaveDays(0);
            await fetchAllSalaryHistory(school.schoolId);
        } catch (e) {
            console.error(e); alert("Network error");
        } finally {
            setLoading(false);
        }
    };

    const updateSalary = async () => {
        const salaryId = selectedItem?.id || selectedItem?.salaryId;
        if (!salaryId) { alert("No salary record selected"); return; }
        const basicSal = selectedItem?.basicSalary || 0;
        const leaveDeduct = calcLeaveDeduction(basicSal, leaveDays);
        const totalDeduction = Number(leaveDeduct) + Number(deduction);
        const res = await fetch(`${API_URL}/api/admin-salary/update/${salaryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ bonus: Number(bonus), deductions: totalDeduction, leaveDays: Number(leaveDays) }),
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        setEditModal(false);
        await fetchAllSalaryHistory(school.schoolId);
    };

    const deleteSalary = async () => {
        const salaryId = selectedItem?.id || selectedItem?.salaryId;
        if (!salaryId) { alert("No salary record selected"); return; }
        const res = await fetch(`${API_URL}/api/admin-salary/delete/${salaryId}`, {
            method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message); return; }
        setDeleteModal(false);
        await fetchAllSalaryHistory(school.schoolId);
    };

    const requestPay = (id) => { setPendingPayId(id); setPayConfirmModal(true); };

    const confirmPay = async () => {
        if (!pendingPayId) return;
        await fetch(`${API_URL}/api/admin-salary/pay/${pendingPayId}`, {
            method: "PATCH", headers: { Authorization: `Bearer ${getToken()}` },
        });
        setPayConfirmModal(false); setPendingPayId(null);
        await fetchAllSalaryHistory(school.schoolId);
    };

    const confirmHold = async () => {
        if (!pendingPayId) return;
        await fetch(`${API_URL}/api/admin-salary/hold/${pendingPayId}`, {
            method: "PATCH", headers: { Authorization: `Bearer ${getToken()}` },
        });
        setPayConfirmModal(false); setPendingPayId(null);
        await fetchAllSalaryHistory(school.schoolId);
    };

    const openEditModal = (item) => {
        setSelectedItem({ ...item, id: item.id || item.salaryId });
        setBonus(item.bonus ?? 0);
        const leaveD = calcLeaveDeduction(item.basicSalary || 0, item.leaveDays || 0);
        setDeduction(Math.max(0, (item.deductions || 0) - leaveD));
        setLeaveDays(item.leaveDays ?? 0);
        setEditModal(true);
    };

    const createThenEdit = async (t) => {
        const adminId = t.admin?.id || t.adminId;
        if (!adminId) return;
        const admin = admins.find(a => a.id === adminId);
        if (!admin) return;
        setLoading(true);
        const bodyData = {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            bonus: 0, deductions: 0, leaveDays: 0,
        };
        if (admin.userType === "ADMIN") bodyData.adminId = adminId;
        if (admin.userType === "FINANCE") bodyData.financeId = adminId;
        const res = await fetch(`${API_URL}${admin.salaryApi}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(bodyData),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { alert(data.message); return; }
        await fetchAllSalaryHistory(school.schoolId);
        setSelectedItem({ ...data, id: data.id, basicSalary: data.basicSalary, admin: t.admin });
        setBonus(0); setDeduction(0); setLeaveDays(0);
        setEditModal(true);
    };

    const openDeleteModal = (item) => { setSelectedItem({ id: item.id || item.salaryId }); setDeleteModal(true); };

    const openHistoryModal = async (item) => {
        setSelectedItem(item);
        const adminId = item.admin?.id || item.adminId;
        if (!adminId) return;
        const res = await fetch(`${API_URL}/api/admin-salary/history/${adminId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) { setSalaryHistory([]); setHistoryModal(true); return; }
        setSalaryHistory(await res.json());
        setHistoryModal(true);
    };

    const openSlipModal = (item) => { setSelectedItem(item); setSlipModal(true); };

    // ── PDF helpers ───────────────────────────────────────────────────

    const buildPdfDoc = (salary) => {
        const doc = new jsPDF("p", "mm", "a4");
        const W = 210, M = 14, CW = 210 - M * 2;
        let y = 0;

        doc.setFillColor(28, 48, 64);
        doc.rect(0, 0, W, 44, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(school.schoolName, M, 16);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.setTextColor(160, 185, 200);
        doc.text("India", M, 23);
        doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
        doc.setTextColor(140, 170, 190);
        doc.text("SALARY SLIP", W - M, 13, { align: "right" });
        doc.setFontSize(15); doc.setTextColor(255, 255, 255);
        doc.text(`${monthName(salary.month)} ${salary.year}`, W - M, 22, { align: "right" });
        doc.setDrawColor(255, 255, 255, 0.15); doc.setLineWidth(0.3);
        doc.line(M, 30, W - M, 30);
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 170, 190);
        doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, M, 38);
        doc.setDrawColor(140, 170, 190); doc.setLineWidth(0.3);
        doc.roundedRect(W - M - 28, 33, 28, 7, 1, 1, "S");
        doc.setTextColor(140, 170, 190); doc.setFontSize(7);
        doc.text("Confidential", W - M - 14, 37.5, { align: "center" });

        y = 44;
        doc.setFillColor(234, 241, 246);
        doc.rect(0, y, W, 24, "F");
        doc.setDrawColor(200, 220, 236); doc.setLineWidth(0.3);
        doc.line(0, y + 24, W, y + 24);

        const adminName = salary.adminName || salary.admin?.name || salary.financeName || "—";
        const adminEmail = salary.adminEmail || salary.admin?.email || salary.financeEmail || "—";
        const designation = salary.admin?.designation || "—";
        const infoFields = [
            { label: "EMPLOYEE NAME", val: adminName },
            { label: "DESIGNATION", val: designation },
            { label: "PAY PERIOD", val: `${monthName(salary.month)} ${salary.year}` },
            { label: "EMAIL", val: adminEmail },
        ];
        const colW = CW / 4;
        infoFields.forEach((f, i) => {
            const x = M + i * colW;
            doc.setFontSize(7); doc.setFont("helvetica", "bold");
            doc.setTextColor(82, 122, 145);
            doc.text(f.label, x, y + 8);
            doc.setFontSize(10); doc.setFont("helvetica", "bold");
            doc.setTextColor(28, 48, 64);
            const maxChars = 20;
            const display = f.val.length > maxChars ? f.val.slice(0, maxChars - 1) + "…" : f.val;
            doc.text(display, x, y + 17);
        });
        y += 28;

        const tW = (CW - 6) / 2;
        const leaveDed = calcLeaveDeduction(salary?.basicSalary || 0, salary?.leaveDays || 0);
        const otherDed = Math.max(0, Number(salary?.deductions || 0) - leaveDed);

        const sections = [
            {
                title: "EARNINGS", color: [43, 69, 87],
                rows: [
                    ["Basic Salary", `Rs.${Number(salary?.basicSalary || 0).toLocaleString("en-IN")}`],
                    ["Bonus", `Rs.${Number(salary?.bonus || 0).toLocaleString("en-IN")}`],
                    ["HRA", "Rs.0"], ["Other", "Rs.0"],
                ],
                footLabel: "Gross Earnings",
                foot: `Rs.${(Number(salary?.basicSalary || 0) + Number(salary?.bonus || 0)).toLocaleString("en-IN")}`,
            },
            {
                title: "DEDUCTIONS", color: [28, 48, 64],
                rows: [
                    ["Leave Deduction", `${salary?.leaveDays ?? 0}d -> Rs.${leaveDed.toLocaleString("en-IN")}`],
                    ["Other Deductions", `Rs.${otherDed.toLocaleString("en-IN")}`],
                    ["PF", "Rs.0"], ["Tax (TDS)", "Rs.0"],
                ],
                footLabel: "Total Deductions",
                foot: `Rs.${Number(salary?.deductions || 0).toLocaleString("en-IN")}`,
            },
        ];

        const ROW_H = 9;
        sections.forEach((sec, si) => {
            const x = M + si * (tW + 6);
            doc.setFillColor(...sec.color);
            doc.rect(x, y, tW, 9, "F");
            doc.setFontSize(8); doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(sec.title, x + 4, y + 6);
            sec.rows.forEach((row, ri) => {
                const ry = y + 9 + ri * ROW_H;
                doc.setFillColor(ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 251, ri % 2 === 0 ? 255 : 253);
                doc.rect(x, ry, tW, ROW_H, "F");
                doc.setDrawColor(238, 245, 250); doc.setLineWidth(0.2);
                doc.line(x, ry + ROW_H, x + tW, ry + ROW_H);
                doc.setFontSize(9); doc.setFont("helvetica", "normal");
                doc.setTextColor(74, 104, 120);
                doc.text(row[0], x + 4, ry + 6);
                doc.setFont("helvetica", "bold"); doc.setTextColor(60, 93, 116);
                doc.text(row[1], x + tW - 3, ry + 6, { align: "right" });
            });
            const fy = y + 9 + sec.rows.length * ROW_H;
            doc.setFillColor(234, 241, 246);
            doc.rect(x, fy, tW, 10, "F");
            doc.setDrawColor(212, 228, 238); doc.setLineWidth(0.5);
            doc.line(x, fy, x + tW, fy);
            doc.setFontSize(9.5); doc.setFont("helvetica", "bold");
            doc.setTextColor(60, 93, 116);
            doc.text(sec.footLabel, x + 4, fy + 7);
            doc.text(sec.foot, x + tW - 3, fy + 7, { align: "right" });
            doc.setDrawColor(200, 220, 236); doc.setLineWidth(0.3);
            doc.rect(x, y + 9, tW, sec.rows.length * ROW_H + 10, "S");
        });

        y += 9 + sections[0].rows.length * ROW_H + 10 + 8;

        doc.setFillColor(28, 48, 64);
        doc.roundedRect(M, y, CW, 20, 2, 2, "F");
        doc.setFontSize(8); doc.setFont("helvetica", "bold");
        doc.setTextColor(140, 170, 190);
        doc.text("NET SALARY PAYABLE", M + 8, y + 8);
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 155, 175);
        doc.text(`For ${monthName(salary.month)} ${salary.year}`, M + 8, y + 15);
        doc.setFontSize(20); doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`Rs.${Math.round(Number(salary?.netSalary || 0)).toLocaleString("en-IN")}`, W - M - 8, y + 13, { align: "right" });
        y += 28;

        doc.setFillColor(234, 241, 246);
        doc.rect(0, y, W, 12, "F");
        doc.setDrawColor(200, 220, 236); doc.setLineWidth(0.3);
        doc.line(0, y, W, y);
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.setTextColor(82, 122, 145);
        doc.text("This is a system-generated payslip and does not require a physical signature.", W / 2, y + 8, { align: "center" });

        return doc;
    };

    const downloadPayslip = () => {
        if (!selectedItem) return;
        const doc = buildPdfDoc(selectedItem);
        const name = selectedItem.adminName || selectedItem.admin?.name || selectedItem.financeName || "Staff";
        doc.save(`Payslip-${name}-${monthName(selectedItem.month)}-${selectedItem.year}.pdf`);
    };

    const handleSendSalarySlip = async (salary) => {

        try {

            const auth =
                JSON.parse(localStorage.getItem("auth"));

            const token = auth?.token;

            const doc = buildPdfDoc(salary);

            const pdfBlob =
                doc.output("blob");

            const arrayBuffer =
                await pdfBlob.arrayBuffer();

            const uint8Array =
                new Uint8Array(arrayBuffer);

            let binary = "";

            uint8Array.forEach((b) => {
                binary += String.fromCharCode(b);
            });

            const pdfBase64 =
                btoa(binary);

            const endpoint =
                salary._userType === "FINANCE"
                    ? `${API_URL}/api/finance-salary/sendSalarySlip/${salary.id || salary.salaryId}`
                    : `${API_URL}/api/admin-salary/sendSalarySlip/${salary.id || salary.salaryId}`;

            const res = await fetch(endpoint, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify({
                    pdfBase64,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || "Failed");
                return;
            }

            alert("WhatsApp salary slip sent successfully");

        } catch (e) {

            console.log(e);

            alert("Failed to send WhatsApp salary slip");
        }
    };

    // ── Bulk WhatsApp ─────────────────────────────────────────────────

    const toggleRowSelection = (rowId) => {
        setSelectedRows(prev =>
            prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
        );
    };

    const toggleSelectAll = (selectableRows) => {
        const ids = selectableRows.map(r => r.id || r.salaryId).filter(Boolean);
        const allSelected = ids.every(id => selectedRows.includes(id));
        if (allSelected) {
            setSelectedRows(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setSelectedRows(prev => Array.from(new Set([...prev, ...ids])));
        }
    };

    const handleBulkWhatsAppSend = async (rowsToSend) => {
        if (rowsToSend.length === 0) return;
        setBulkSending(true);
        setBulkProgress({ total: rowsToSend.length, completed: 0, current: "" });
        for (let i = 0; i < rowsToSend.length; i++) {
            const staff = rowsToSend[i];
            const name = staff.adminName || staff.admin?.name || staff.financeName || "Staff";
            setBulkProgress(prev => ({ ...prev, current: name }));
            await handleSendSalarySlip(staff);
            setBulkProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
            if (i < rowsToSend.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        setBulkSending(false);
        setBulkProgress({ total: 0, completed: 0, current: "" });
        setSelectedRows([]);
    };

    // ── Derived values ────────────────────────────────────────────────

    const nowM = new Date().getMonth() + 1;
    const nowY = new Date().getFullYear();

    const searchFn = (t) => {
        const name = t.adminName || t.admin?.name || t.financeName || "";
        const email = t.adminEmail || t.admin?.email || t.financeEmail || "";
        return name.toLowerCase().includes(search.toLowerCase()) ||
            email.toLowerCase().includes(search.toLowerCase());
    };

    const realFiltered = salaryList
        .filter(t => Number(t.month) === nowM && Number(t.year) === nowY)
        .filter(t => tableStatusFilter === "ALL" || t.status === tableStatusFilter)
        .filter(searchFn);

    const realUserIds = new Set(
        salaryList
            .filter(t => Number(t.month) === nowM && Number(t.year) === nowY)
            .map(t => String(t.admin?.id || t.adminId))
    );

    const curPlaceholders = currentMonthPlaceholders
        .filter(t => !realUserIds.has(String(t.admin?.id || t.adminId)))
        .filter(searchFn);

    const filtered = [...realFiltered, ...curPlaceholders];
    const filteredNext = nextMonthRows.filter(searchFn);

    const filteredHistory = allSalaryHistory
        .filter(t => {
            if (historyStatusFilter === "ALL") return t.status === "PAID" || t.status === "HOLD";
            return t.status === historyStatusFilter;
        })
        .filter(t => {
            const name = t.adminName || t.admin?.name || t.financeName || "";
            const email = t.adminEmail || t.admin?.email || t.financeEmail || "";
            return name.toLowerCase().includes(historySearch.toLowerCase()) ||
                email.toLowerCase().includes(historySearch.toLowerCase());
        });

    const leaveDedPreview = calcLeaveDeduction(adminDetail?.salary || 0, leaveDays);
    const totalDeducPreview = leaveDedPreview + Number(deduction || 0);
    const netPreview = Number(adminDetail?.salary || 0) + Number(bonus || 0) - totalDeducPreview;

    const editBasic = selectedItem?.basicSalary || 0;
    const editLeaveDed = calcLeaveDeduction(editBasic, leaveDays);
    const editTotalDeduction = editLeaveDed + Number(deduction || 0);
    const editNetPreview = Number(editBasic) + Number(bonus || 0) - editTotalDeduction;

    const currentSelectableRows = viewMonth === "current"
        ? filtered.filter(r => !r._isPlaceholder)
        : [];

    const selectedSelectableRows = currentSelectableRows.filter(r =>
        selectedRows.includes(r.id || r.salaryId)
    );

    const allCurrentSelected =
        currentSelectableRows.length > 0 &&
        currentSelectableRows.every(r => selectedRows.includes(r.id || r.salaryId));

    const someCurrentSelected = currentSelectableRows.some(r => selectedRows.includes(r.id || r.salaryId));

    // ── Render ────────────────────────────────────────────────────────

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
                        <h1 className="text-[17px] sm:text-[22px] font-bold text-white tracking-tight m-0">Group D — Salary Management</h1>
                        <p className="text-[11px] sm:text-[12px] text-white/55 italic m-0">{school.schoolName} • Admin &amp; Finance Staff</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 relative z-10">
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A6B80]" />
                        <input
                            className="pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 rounded-xl border border-[#C8DCEC] bg-white/90 text-[12px] sm:text-[13px] text-[#162535] w-full sm:w-52 md:w-60 outline-none focus:border-[#27435B] focus:bg-white"
                            placeholder="Search admin / finance..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setSelectedAdmin(""); setBonus(0); setDeduction(0); setLeaveDays(0); setShowModal(true); }}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[12px] sm:text-[13.5px] font-semibold transition-all border border-white/20 whitespace-nowrap"
                    >
                        <Plus size={14} /> <span>Add Salary</span>
                    </button>
                </div>
            </div>

            {adminsError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-red-700 text-sm font-medium">
                    <AlertTriangle size={16} className="shrink-0" />
                    {adminsError}
                </div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
                {[
                    { label: "Total Staff", val: adminsLoading ? "..." : admins.length, icon: Users, color: "from-[#27435B] to-[#1C3044]" },
                    { label: "Pending Payment", val: salaryList.filter(s => s.status === "PENDING").length, icon: AlertTriangle, color: "from-[#B08A00] to-[#7A5E00]" },
                    { label: "Paid This Month", val: salaryList.filter(s => s.status === "PAID").length, icon: BadgeCheck, color: "from-[#1E7E4E] to-[#155A36]" },
                    { label: "Total Payout", val: `₹${salaryList.reduce((s, t) => s + Number(t.netSalary || 0), 0).toLocaleString("en-IN")}`, icon: Banknote, color: "from-[#3A5E78] to-[#27435B]" },
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
                        <span className="text-white font-bold text-[13px] sm:text-[14px]">Admin &amp; Finance — Salary Records</span>
                        {/* Month toggle */}
                        <div className="flex rounded-xl overflow-hidden border border-white/20">
                            {[
                                { key: "current", label: `${monthName(nowM)} (Current)` },
                                { key: "next", label: `${monthName(nowM + 1 > 12 ? 1 : nowM + 1)} (Next)` },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setViewMonth(tab.key)}
                                    className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold transition-all
                                        ${viewMonth === tab.key ? "bg-white/25 text-white" : "text-white/55 hover:text-white hover:bg-white/10"}`}
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
                                                {opt === "ALL" && <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />}
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

                {/* ── Bulk Action Bar ── */}
                {isPremium && viewMonth === "current" && selectedSelectableRows.length > 0 && (
                    <div className="bg-gradient-to-r from-[#064E3B] to-[#065F46] border-b border-green-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 flex-wrap">
                            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
                                <CheckCircle2 size={14} color="#6EE7B7" />
                                <span className="text-white font-bold text-[12px] sm:text-[13px]">{selectedSelectableRows.length} selected</span>
                            </div>
                            {bulkSending && (
                                <>
                                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                                        <Clock size={13} color="#A7F3D0" />
                                        <span className="text-white/80 text-[11px] sm:text-[12px]">
                                            Sending: <span className="font-bold text-white">{bulkProgress.current}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                                        <span className="text-white/80 text-[11px] sm:text-[12px]">
                                            <span className="font-bold text-[#6EE7B7]">{bulkProgress.completed}</span>
                                            <span className="text-white/50"> / {bulkProgress.total} done</span>
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-[80px] max-w-[180px]">
                                        <div className="w-full bg-white/20 rounded-full h-1.5">
                                            <div
                                                className="bg-[#6EE7B7] h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.completed / bulkProgress.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {!bulkSending && (
                                <button
                                    onClick={() => setSelectedRows([])}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white/70 hover:text-white text-[11px] sm:text-[12px] font-semibold transition-all border border-white/20"
                                >
                                    <X size={12} /> Clear
                                </button>
                            )}
                            <button
                                onClick={() => handleBulkWhatsAppSend(selectedSelectableRows)}
                                disabled={bulkSending}
                                className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] sm:text-[13px] font-bold transition-all shadow-lg shadow-green-900/30"
                            >
                                <FaWhatsapp size={15} />
                                {bulkSending
                                    ? `Sending ${bulkProgress.completed + 1}/${bulkProgress.total}...`
                                    : `Send ${selectedSelectableRows.length} Slip${selectedSelectableRows.length > 1 ? "s" : ""} via WhatsApp`
                                }
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    {salaryLoading ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#EAF1F6] flex items-center justify-center">
                                <IndianRupee size={20} color="#8AAFC4" />
                            </div>
                            <p className="text-[13px] font-semibold text-[#4A6B80]">Loading salary records...</p>
                        </div>
                    ) : (
                        <table className="w-full text-[12px] sm:text-[13px] min-w-[800px]">
                            <thead>
                                <tr className="bg-[#EAF1F6] border-b border-[#C8DCEC]">
                                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 w-10">
                                        {viewMonth === "current" && currentSelectableRows.length > 0 && (
                                            <input
                                                type="checkbox"
                                                checked={allCurrentSelected}
                                                ref={el => { if (el) el.indeterminate = someCurrentSelected && !allCurrentSelected; }}
                                                onChange={() => toggleSelectAll(currentSelectableRows)}
                                                className="w-4 h-4 rounded accent-[#27435B] cursor-pointer"
                                            />
                                        )}
                                    </th>
                                    {["Name", "Type", "Basic Salary", "Bonus", "Deductions", "Leave Days", "Net Salary", "Status", "Actions"].map(h => (
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
                                                        <Users size={24} color="#8AAFC4" />
                                                    </div>
                                                    <p className="text-[13px] font-semibold">No records found for next month</p>
                                                    <p className="text-[11px] text-[#8AAFC4]">Records will appear once current month salaries are created</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredNext.map((t, idx) => (
                                        <tr key={`nm-${idx}`} className="border-b border-[#EAF1F6] hover:bg-[#F5FAFE] transition-colors bg-[#FAFCFE]">
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3" />
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                <div className="font-semibold text-[#1A2E3D]">{t.adminName || t.admin?.name || "—"}</div>
                                                <div className="text-[11px] text-[#4A6B80] mt-0.5">{t.adminEmail || t.admin?.email || "—"}</div>
                                            </td>
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                <span className="bg-[#EAF1F6] text-[#27435B] text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full">{t._userType || "ADMIN"}</span>
                                            </td>
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-[#27435B]">₹{Number(t.basicSalary || 0).toLocaleString("en-IN")}</td>
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#1E7E4E] font-semibold">₹0</td>
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#B83232] font-semibold">₹0</td>
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#4A6B80]">0 days</td>
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-[#1A2E3D]">₹{Number(t.basicSalary || 0).toLocaleString("en-IN")}</td>
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full bg-[#EAF1F6] text-[#8AAFC4]">Not Created</span>
                                            </td>
                                            <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                <button
                                                    onClick={() => createThenEdit(t)}
                                                    disabled={loading}
                                                    title="Set Bonus & Leaves"
                                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-colors text-[#27435B] hover:bg-[#EAF1F6] disabled:opacity-40"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-12 text-[#4A6B80]">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-14 h-14 rounded-2xl bg-[#EAF1F6] flex items-center justify-center">
                                                        <Users size={24} color="#8AAFC4" />
                                                    </div>
                                                    <p className="text-[13px] font-semibold">No salary records {tableStatusFilter !== "ALL" ? `with status "${tableStatusFilter}"` : "yet"}</p>
                                                    {tableStatusFilter === "ALL" && <p className="text-[11px] text-[#8AAFC4]">Click "Add Salary" to create one</p>}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filtered.map((t, idx) => {
                                        const rowId = t.id || t.salaryId;
                                        const isSelected = !t._isPlaceholder && rowId && selectedRows.includes(rowId);
                                        return (
                                            <tr
                                                key={t.id || idx}
                                                className={`border-b border-[#EAF1F6] hover:bg-[#F5FAFE] transition-colors
                                                    ${t._isPlaceholder ? "bg-[#FAFCFE]" : ""}
                                                    ${isSelected ? "bg-green-50 hover:bg-green-50" : ""}`}
                                            >
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                    {!t._isPlaceholder && rowId ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={!!isSelected}
                                                            onChange={() => toggleRowSelection(rowId)}
                                                            disabled={bulkSending}
                                                            className="w-4 h-4 rounded accent-[#27435B] cursor-pointer disabled:cursor-not-allowed"
                                                        />
                                                    ) : <span className="w-4 h-4 inline-block" />}
                                                </td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                    <div className="font-semibold text-[#1A2E3D]">{t.adminName || t.admin?.name || "—"}</div>
                                                    <div className="text-[11px] text-[#4A6B80] mt-0.5">{t.adminEmail || t.admin?.email || "—"}</div>
                                                </td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                    <span className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full ${t._userType === "FINANCE" ? "bg-blue-100 text-blue-700" : "bg-[#EAF1F6] text-[#27435B]"}`}>
                                                        {t._userType || "ADMIN"}
                                                    </span>
                                                </td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-[#27435B]">₹{Number(t.basicSalary || 0).toLocaleString("en-IN")}</td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#1E7E4E] font-semibold">
                                                    {t._isPlaceholder ? "₹0" : `₹${Math.round(Number(t.bonus || 0)).toLocaleString("en-IN")}`}
                                                </td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#B83232] font-semibold">
                                                    {t._isPlaceholder ? "₹0" : `₹${Math.round(Number(t.deductions || 0)).toLocaleString("en-IN")}`}
                                                </td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#4A6B80]">
                                                    {t._isPlaceholder ? "0 days" : `${t.leaveDays ?? 0} days`}
                                                </td>
                                                <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="font-bold text-[#1A2E3D]">₹{Math.round(Number(t._isPlaceholder ? t.basicSalary : t.netSalary || 0)).toLocaleString("en-IN")}</span>
                                                        {!t._isPlaceholder && (t.status === "PENDING" ? (
                                                            <button onClick={() => requestPay(t.salaryId || t.id)}
                                                                className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-[#27435B] to-[#1C3044] text-white hover:opacity-80 transition-opacity">
                                                                Pay Now
                                                            </button>
                                                        ) : t.status === "HOLD" ? (
                                                            <button onClick={() => requestPay(t.salaryId || t.id)}
                                                                className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-700 text-white hover:opacity-80 transition-opacity">
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
                                                            {
                                                                icon: Pencil,
                                                                fn: () => t._isPlaceholder ? createThenEdit(t) : openEditModal(t),
                                                                color: "text-[#27435B] hover:bg-[#EAF1F6]",
                                                                title: t._isPlaceholder ? "Set Bonus & Leaves" : "Edit",
                                                            },
                                                            {
                                                                icon: Trash2,
                                                                fn: () => openDeleteModal(t),
                                                                color: t._isPlaceholder ? "text-[#C8DCEC] cursor-not-allowed" : "text-red-500 hover:bg-red-50",
                                                                title: "Delete",
                                                                disabled: t._isPlaceholder,
                                                            },
                                                            {
                                                                icon: History,
                                                                fn: () => openHistoryModal(t),
                                                                color: "text-[#4A6B80] hover:bg-[#EAF1F6]",
                                                                title: "History",
                                                            },
                                                            {
                                                                icon: Eye,
                                                                fn: () => !t._isPlaceholder && openSlipModal(t),
                                                                color: t._isPlaceholder ? "text-[#C8DCEC] cursor-not-allowed" : "text-[#27435B] hover:bg-[#EAF1F6]",
                                                                title: "View Slip",
                                                                disabled: t._isPlaceholder,
                                                            },
                                                            ...(isPremium ? [{
                                                                icon: FaWhatsapp,

                                                                    fn: () => {

                                                                        if (t._isPlaceholder || bulkSending) return;

                                                                        setSelectedWhatsappSalary(t);

                                                                        setWhatsappModal(true);
                                                                    },
                                                                color: t._isPlaceholder
                                                                    ? "text-[#C8DCEC] cursor-not-allowed"
                                                                    : bulkSending
                                                                        ? "text-[#C8DCEC] cursor-not-allowed"
                                                                        : "text-green-600 hover:bg-green-50",

                                                                title: "Send WhatsApp",

                                                                disabled: t._isPlaceholder || bulkSending,
                                                            }] : []),
                                                        ].map(({ icon: Ic, fn, color, title, disabled }, i) => (
                                                            <button key={i} onClick={disabled ? undefined : fn} title={title} disabled={disabled}
                                                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-colors ${color}`}>
                                                                <Ic size={12} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ══════════════ MODALS ══════════════ */}

            {/* Pay Confirm Modal */}
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
                                <button onClick={confirmHold}
                                    className="ml-auto flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] sm:text-[11.5px] font-bold transition-colors">
                                    ⏸ Hold
                                </button>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setPayConfirmModal(false); setPendingPayId(null); }}
                                    className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13px] sm:text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors">Cancel</button>
                                <button onClick={confirmPay}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1E7E4E] to-[#155A36] text-white text-[13px] sm:text-[13.5px] font-bold hover:opacity-90 transition-opacity">
                                    ✓ Confirm Pay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Salary Modal */}
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
                                    <div className="text-white/55 text-[10px] sm:text-[11.5px]">Group D • Admin &amp; Finance Staff</div>
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
                                        <div className="text-[13px] sm:text-[13.5px] font-semibold text-[#1A2E3D]">{school.schoolName}</div>
                                        <div className="text-[10px] sm:text-[10.5px] text-[#4A6B80] mt-0.5">Auto-detected from your login session</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6B80] mb-2">Select Admin / Finance</p>
                                {adminsLoading ? (
                                    <div className="border border-[#C8DCEC] rounded-xl px-4 py-3 text-[#8AAFC4] text-sm">Loading users...</div>
                                ) : adminsError ? (
                                    <div className="border border-red-200 rounded-xl px-4 py-3 text-red-500 text-sm flex items-center gap-2">
                                        <AlertTriangle size={14} /> {adminsError}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A6B80]" />
                                        <select
                                            value={selectedAdmin}
                                            onChange={e => setSelectedAdmin(e.target.value)}
                                            className="w-full pl-8 sm:pl-9 pr-3 py-2.5 border border-[#C8DCEC] rounded-xl text-[13px] sm:text-[13.5px] text-[#1A2E3D] bg-white outline-none focus:border-[#27435B] focus:ring-2 focus:ring-[#27435B]/10 appearance-none cursor-pointer"
                                        >
                                            <option value="">{admins.length === 0 ? "No users found" : "— Choose a user —"}</option>
                                            {admins.map(a => {
                                                const hasSalary = Number(a.salary || 0) > 0;
                                                return (
                                                    <option key={a.id} value={a.id} style={!hasSalary ? { color: "#b45309", fontWeight: "600" } : {}}>
                                                        {a.name} — {a.designation || a.userType} — {a.userType}
                                                        {!hasSalary ? " ⚠ No salary set" : ""}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {adminDetail && (
                                <div className="bg-gradient-to-br from-[#EAF1F6] to-[#F5FAFE] border border-[#C8DCEC] rounded-2xl p-3 sm:p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#27435B] to-[#1C3044] flex items-center justify-center flex-shrink-0">
                                            <User size={16} color="#fff" />
                                        </div>
                                        <div>
                                            <div className="text-[14px] sm:text-[15px] font-bold text-[#1A2E3D]">{adminDetail.name}</div>
                                            <div className="text-[11px] sm:text-[11.5px] text-[#4A6B80]">{adminDetail.designation || "No Designation"}</div>
                                        </div>
                                        <span className={`ml-auto text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap
                                            ${adminDetail.userType === "FINANCE" ? "bg-blue-100 text-blue-700" : "bg-[#27435B]/10 text-[#27435B]"}`}>
                                            {adminDetail.userType} ✓
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                        {[
                                            { icon: Mail, label: "Email", val: adminDetail.email || "—" },
                                            { icon: User, label: "Designation", val: adminDetail.designation || "—" },
                                            {
                                                icon: IndianRupee, label: "Basic Salary",
                                                val: Number(adminDetail.salary || 0) > 0
                                                    ? `₹${Number(adminDetail.salary).toLocaleString("en-IN")}`
                                                    : "⚠ Not Set"
                                            },
                                            { icon: Building2, label: "Role", val: adminDetail.userType || "—" },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white border border-[#C8DCEC] rounded-xl p-2 sm:p-2.5">
                                                <item.icon size={12} className="text-[#3A5E78] flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wide text-[#8AAFC4]">{item.label}</div>
                                                    <div className={`text-[11px] sm:text-[12.5px] font-semibold mt-0.5 truncate
                                                        ${item.label === "Basic Salary" && Number(adminDetail.salary || 0) === 0 ? "text-orange-600" : "text-[#1A2E3D]"}`}>
                                                        {item.val}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {Number(adminDetail.salary || 0) === 0 && (
                                        <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-[11px] sm:text-[12px] text-orange-700 flex items-center gap-2">
                                            <AlertTriangle size={12} />
                                            <span>This user has no basic salary configured. Salary cannot be created.</span>
                                        </div>
                                    )}
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
                                        <label className="text-[10px] sm:text-[11px] font-bold text-[#B83232] uppercase tracking-wide flex items-center gap-1"><TrendingDown size={10} /> Deduction (₹)</label>
                                        <div className="flex items-center border border-[#C8DCEC] rounded-xl overflow-hidden bg-white focus-within:border-[#27435B]">
                                            <span className="px-2 sm:px-3 text-[12px] sm:text-[13px] font-bold text-[#B83232]">-</span>
                                            <input type="number" min={0} value={deduction} onChange={e => setDeduction(e.target.value)}
                                                className="flex-1 py-2 sm:py-2.5 pr-2 sm:pr-3 text-[12px] sm:text-[13.5px] font-semibold text-[#1A2E3D] outline-none bg-transparent" />
                                        </div>
                                    </div>
                                </div>
                                {adminDetail && leaveDays > 0 && (
                                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 sm:py-2.5 text-[11px] sm:text-[12px] text-amber-700 flex items-center gap-2">
                                        <ClipboardList size={12} />
                                        <span>
                                            <span className="font-bold">{leaveDays} leave day(s)</span>{" "}
                                            × ₹{Math.round((Number(adminDetail.salary) * 12) / 365).toLocaleString("en-IN")}/day ={" "}
                                            <span className="font-bold">₹{leaveDedPreview.toLocaleString("en-IN")}</span> auto-deducted
                                        </span>
                                    </div>
                                )}
                            </div>

                            {adminDetail && (
                                <div className="bg-gradient-to-r from-[#27435B] to-[#1A2E3D] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/55 mb-0.5">Net Salary Preview</div>
                                        <div className="text-[10px] sm:text-[11px] text-white/35">Basic + Bonus − Leave Ded. − Deduction</div>
                                    </div>
                                    <div className="text-[20px] sm:text-[24px] font-bold text-white tracking-tight">₹{Math.max(0, netPreview).toLocaleString("en-IN")}</div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13px] sm:text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] hover:text-[#27435B] transition-colors bg-white">Cancel</button>
                                <button
                                    onClick={createSalary}
                                    disabled={loading || !selectedAdmin}
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

            {/* Edit Salary Modal */}
            {editModal && selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[520px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#1A2E3D] to-[#27435B] rounded-t-3xl px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center"><Pencil size={14} color="#fff" /></div>
                                <div>
                                    <div className="text-white font-bold text-[15px] sm:text-[16px]">Edit Salary Record</div>
                                    <div className="text-white/55 text-[10px] sm:text-[11px]">
                                        {selectedItem?.adminName || selectedItem?.admin?.name || "—"} • {monthName(selectedItem?.month)} {selectedItem?.year}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setEditModal(false)} className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={14} /></button>
                        </div>

                        <div className="mx-4 sm:mx-6 mt-4 sm:mt-5 bg-[#EAF1F6] border border-[#C8DCEC] rounded-2xl p-3 sm:p-4">
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {[
                                    { label: "Name", val: selectedItem?.adminName || selectedItem?.admin?.name || "—" },
                                    { label: "Type", val: selectedItem?._userType || "ADMIN" },
                                    { label: "Basic Salary", val: `₹${Number(selectedItem?.basicSalary || 0).toLocaleString("en-IN")}` },
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
                                            <input type="number" min={0} value={f.val} onChange={e => f.set(e.target.value)}
                                                className="flex-1 py-2 sm:py-2.5 pr-2 sm:pr-3 text-[12px] sm:text-[13.5px] font-semibold text-[#1A2E3D] outline-none bg-transparent" />
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

            {/* Delete Modal */}
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

            {/* History Modal */}
            {historyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setHistoryModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[640px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#1A2E3D] to-[#27435B] rounded-t-3xl px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center"><History size={15} color="#fff" /></div>
                                <div>
                                    <div className="text-white font-bold text-[15px] sm:text-[16px]">Salary History</div>
                                    <div className="text-white/55 text-[10px] sm:text-[11px]">{selectedItem?.adminName || selectedItem?.admin?.name || "—"} — All Months</div>
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

            {/* Payslip View Modal */}
            {slipModal && selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSlipModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div style={{ background: "linear-gradient(135deg,#1c3040,#3c5d74,#527a91)", borderRadius: "24px 24px 0 0", padding: "22px 24px 18px" }}>
                            <div className="flex justify-between mb-3">
                                <div>
                                    <div className="text-[17px] sm:text-[20px] font-bold text-white">{school.schoolName}</div>
                                    <div className="text-[10px] sm:text-[11.5px] text-white/55 mt-1">India</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] sm:text-[10px] font-bold tracking-[3px] uppercase text-white/50 mb-1">Salary Slip</div>
                                    <div className="text-[14px] sm:text-[16px] font-bold text-white">{monthName(selectedItem.month)} {selectedItem.year}</div>
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
                                { key: "Employee Name", val: selectedItem?.adminName || selectedItem?.admin?.name || "—" },
                                { key: "Designation", val: selectedItem?.admin?.designation || "—" },
                                { key: "Pay Period", val: `${monthName(selectedItem.month)} ${selectedItem.year}` },
                                { key: "Email", val: selectedItem?.adminEmail || selectedItem?.admin?.email || "—" },
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
                                            { label: "Basic Salary", val: `₹${Number(selectedItem?.basicSalary || 0).toLocaleString("en-IN")}` },
                                            { label: "Bonus", val: `₹${Number(selectedItem?.bonus || 0).toLocaleString("en-IN")}` },
                                            { label: "HRA", val: "₹0" },
                                            { label: "Other", val: "₹0" },
                                        ], foot: `₹${(Number(selectedItem?.basicSalary || 0) + Number(selectedItem?.bonus || 0)).toLocaleString("en-IN")}`, footLabel: "Gross Earnings"
                                    },
                                    {
                                        title: "Deductions", bg: "linear-gradient(135deg,#1c3040,#2b4557)", rows: [
                                            { label: "Leave Deduction", val: `${selectedItem?.leaveDays ?? 0}d → ₹${calcLeaveDeduction(selectedItem?.basicSalary || 0, selectedItem?.leaveDays || 0).toLocaleString("en-IN")}` },
                                            { label: "Other Deductions", val: `₹${Math.max(0, Number(selectedItem?.deductions || 0) - calcLeaveDeduction(selectedItem?.basicSalary || 0, selectedItem?.leaveDays || 0)).toLocaleString("en-IN")}` },
                                            { label: "PF", val: "₹0" },
                                            { label: "Tax (TDS)", val: "₹0" },
                                        ], foot: `₹${Number(selectedItem?.deductions || 0).toLocaleString("en-IN")}`, footLabel: "Total Deductions"
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
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>For {monthName(selectedItem.month)} {selectedItem.year}</div>
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>₹{Number(selectedItem?.netSalary || 0).toLocaleString("en-IN")}</div>
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
            {/* WhatsApp Confirm Modal */}

            {whatsappModal && (

                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => {
                        setWhatsappModal(false);
                        setSelectedWhatsappSalary(null);
                    }}
                >

                    <div
                        className="bg-white rounded-3xl w-full max-w-[420px] shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* Header */}

                        <div className="bg-gradient-to-r from-[#128C7E] to-[#25D366] px-6 py-5 text-white">

                            <div className="flex items-center gap-3">

                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                    <FaWhatsapp size={24} />
                                </div>

                                <div>

                                    <h2 className="text-[18px] font-bold">
                                        Send Payslip
                                    </h2>

                                    <p className="text-white/80 text-[12px] mt-1">
                                        WhatsApp Salary Slip Delivery
                                    </p>

                                </div>

                            </div>

                        </div>

                        {/* Body */}

                        <div className="p-6">

                            <div className="bg-[#F6FBF8] border border-[#D7F5E3] rounded-2xl p-4">

                                <div className="text-[12px] text-[#4A6B80] font-semibold mb-2">
                                    Employee
                                </div>

                                <div className="text-[16px] font-bold text-[#1A2E3D]">
                                    {
                                        selectedWhatsappSalary?.adminName ||
                                        selectedWhatsappSalary?.admin?.name ||
                                        selectedWhatsappSalary?.financeName ||
                                        "Staff"
                                    }
                                </div>

                                <div className="text-[12px] text-[#4A6B80] mt-1">
                                    {
                                        selectedWhatsappSalary?.adminEmail ||
                                        selectedWhatsappSalary?.admin?.email ||
                                        selectedWhatsappSalary?.financeEmail ||
                                        "No Email"
                                    }
                                </div>

                            </div>

                             

                            {/* Buttons */}

                            <div className="flex gap-3 mt-6">

                                <button
                                    onClick={() => {
                                        setWhatsappModal(false);
                                        setSelectedWhatsappSalary(null);
                                    }}
                                    className="flex-1 py-3 rounded-2xl border border-[#C8DCEC] text-[#4A6B80] font-semibold hover:bg-[#F5FAFE] transition-all"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={async () => {

                                        await handleSendSalarySlip(
                                            selectedWhatsappSalary
                                        );

                                        setWhatsappModal(false);

                                        setSelectedWhatsappSalary(null);

                                    }}
                                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#128C7E] to-[#25D366] text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >

                                    <FaWhatsapp size={16} />

                                    Send Now

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}
        </>
    );
}