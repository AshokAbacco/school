// src/finance/pages/Teachersfinance/GroupBSalary.jsx
import {
    Search, IndianRupee, Pencil, Trash2, History, Eye,
    TrendingUp, TrendingDown, Users, ClipboardList,
    Banknote, Building2, CheckCircle2, Printer, ListOrdered,
    Plus, X, Sparkles, BadgeCheck, AlertTriangle,
    User, Mail, BookOpen, ChevronDown, Pause, FileText, Wrench
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

const getAuthSchool = () => {
    try {
        const raw = localStorage.getItem("auth");
        if (!raw) return { schoolId: "", schoolName: "Your School" };
        const auth = JSON.parse(raw);
        return {
            schoolId: auth.user?.schoolId || auth.user?.school?.id || auth.schoolId || "",
            schoolName: auth.user?.school?.name || auth.schoolName || "Your School",
        };
    } catch { return { schoolId: "", schoolName: "Your School" }; }
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

export default function GroupBSalary() {
    const isPremium = getPlan() === "Premium";
    const [search, setSearch] = useState("");
    const [tableStatusFilter, setTableStatusFilter] = useState("ALL");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [salaryList, setSalaryList] = useState([]);
    const [currentMonthPlaceholders, setCurrentMonthPlaceholders] = useState([]);
    const [allSalaryHistory, setAllSalaryHistory] = useState([]);
    const [dropdownStaff, setDropdownStaff] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [bonus, setBonus] = useState(0);
    const [deduction, setDeduction] = useState(0);
    const [leaveDays, setLeaveDays] = useState(0);
    const [selectedStaff, setSelectedStaff] = useState("");
    const [staffDetail, setStaffDetail] = useState(null);
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
    const [authSchool, setAuthSchool] = useState({ schoolId: "", schoolName: "Your School" });
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef();
    const [waConfirmModal, setWaConfirmModal] = useState(false);

    const [selectedWhatsAppSalary, setSelectedWhatsAppSalary] = useState(null);

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
            fetchGroupBStaff(school.schoolId);
            refreshSalaryList(school.schoolId);
            fetchAllHistory(school.schoolId);
        }
    }, []);

    useEffect(() => {
        if (!selectedStaff) { setStaffDetail(null); return; }
        const found = dropdownStaff.find(s => s.id === selectedStaff);
        setStaffDetail(found || null);
    }, [selectedStaff, dropdownStaff]);

    useEffect(() => {
        if (staffDetail && leaveDays > 0)
            setDeduction(calcLeaveDeduction(staffDetail.basicSalary || 0, leaveDays));
    }, [leaveDays, staffDetail]);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setShowStatusDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── API Calls ─────────────────────────────────────────────────────────────

    const fetchGroupBStaff = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/groupb/staff/${id}`, {
                headers: { Authorization: `Bearer ${tok()}` }
            });
            if (!res.ok) { setDropdownStaff([]); return; }
            setDropdownStaff(await res.json());
        } catch { setDropdownStaff([]); }
    };

    const buildPlaceholderRows = (historyList, targetMonth, targetYear, prefix) => {
        const byStaff = {};
        historyList.forEach(r => {
            const sid = r.staff?.id || r.staffId;
            if (!byStaff[sid]) { byStaff[sid] = r; return; }
            const prev = byStaff[sid];
            if (r.year > prev.year || (r.year === prev.year && r.month > prev.month))
                byStaff[sid] = r;
        });
        return Object.values(byStaff).map(r => ({
            ...r,
            id: `${prefix}-${r.staff?.id || r.staffId}`,
            salaryId: null, month: targetMonth, year: targetYear,
            bonus: 0, deductions: 0, leaveDays: 0,
            netSalary: Number(r.basicSalary || 0),
            status: "PENDING", paymentDate: null, _isPlaceholder: true,
        }));
    };

    const refreshSalaryList = async (id) => {
        if (!id) return;
        const res = await fetch(`${API_URL}/api/groupb/salary/list/${id}`, {
            headers: { Authorization: `Bearer ${tok()}` }
        });
        if (!res.ok) { setSalaryList([]); return; }
        const data = await res.json();
        setSalaryList(Array.isArray(data) ? data.filter(r => r.salaryId !== null) : []);
    };

const fetchAllHistory = async (id) => {
    try {

        // ✅ FETCH HISTORY
        const historyRes = await fetch(
            `${API_URL}/api/groupb/salary/history-by-school/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${tok()}`
                }
            }
        );

        // ✅ FETCH ALL STAFF
        const staffRes = await fetch(
            `${API_URL}/api/groupb/staff/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${tok()}`
                }
            }
        );

        const historyData =
            historyRes.ok
                ? await historyRes.json()
                : [];

        const staffData =
            staffRes.ok
                ? await staffRes.json()
                : [];

        const historyList =
            Array.isArray(historyData)
                ? historyData
                : [];

        setAllSalaryHistory(historyList);

        const now = new Date();
        const curM = now.getMonth() + 1;
        const curY = now.getFullYear();

        // ✅ EXISTING SALARY STAFF IDS
        const existingIds = new Set(
            historyList.map(
                r => String(r.staff?.id || r.staffId)
            )
        );

        // ✅ CREATE PLACEHOLDER FOR NEW STAFF ALSO
        const placeholders = staffData.map((staff) => {

            const old =
                historyList.find(
                    h =>
                        String(h.staff?.id || h.staffId) ===
                        String(staff.id)
                );

            return {
                id: `cur-${staff.id}`,
                salaryId: old?.salaryId || null,
                staffId: staff.id,
                staff,
                staffName:
                    `${staff.firstName} ${staff.lastName || ""}`,

                staffEmail: staff.email,
                staffRole: staff.role,

                month: curM,
                year: curY,

                basicSalary:
                    Number(staff.basicSalary || 0),

                bonus: 0,
                deductions: 0,
                leaveDays: 0,

                netSalary:
                    Number(staff.basicSalary || 0),

                status: "PENDING",
                paymentDate: null,
                _isPlaceholder: true,
            };
        });

        setCurrentMonthPlaceholders(placeholders);

    } catch (err) {

        console.log(err);

        setAllSalaryHistory([]);
        setCurrentMonthPlaceholders([]);
    }
};

    const createSalary = async () => {
        if (!selectedStaff) { alert("Please select a staff member"); return; }
        setLoading(true);
        const leaveDeduct = calcLeaveDeduction(staffDetail?.basicSalary || 0, leaveDays);
        const res = await fetch(`${API_URL}/api/groupb/salary/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
            body: JSON.stringify({
                staffId: selectedStaff,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                bonus: Number(bonus),
                deductions: Number(leaveDeduct) + Number(deduction),
                leaveDays: Number(leaveDays),
            })
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { alert(data.message || data.error); return; }
        setSelectedStaff(""); setBonus(0); setDeduction(0); setLeaveDays(0); setShowModal(false);
        await refreshSalaryList(authSchool.schoolId);
        await fetchAllHistory(authSchool.schoolId);
    };

    const updateSalary = async () => {
        const salaryId = selectedSalary?.id || selectedSalary?.salaryId;
        if (!salaryId) { alert("No salary record selected"); return; }
        const leaveDeduct = calcLeaveDeduction(selectedSalary?.basicSalary || 0, leaveDays);
        const res = await fetch(`${API_URL}/api/groupb/salary/update/${salaryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
            body: JSON.stringify({
                bonus: Number(bonus),
                deductions: Number(leaveDeduct) + Number(deduction),
                leaveDays: Number(leaveDays),
            })
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message || data.error); return; }
        setEditModal(false);
        await refreshSalaryList(authSchool.schoolId);
        await fetchAllHistory(authSchool.schoolId);
    };

    const deleteSalary = async () => {
        const salaryId = selectedSalary?.id || selectedSalary?.salaryId;
        const res = await fetch(`${API_URL}/api/groupb/salary/delete/${salaryId}`, {
            method: "DELETE", headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message || data.error); return; }
        setDeleteModal(false);
        await refreshSalaryList(authSchool.schoolId);
        await fetchAllHistory(authSchool.schoolId);
    };

    const requestPay = (salaryId) => { setPendingPayId(salaryId); setPayConfirmModal(true); };

    const confirmPay = async () => {
        const res = await fetch(`${API_URL}/api/groupb/salary/pay/${pendingPayId}`, {
            method: "PATCH", headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        setPayConfirmModal(false); setPendingPayId(null);
        if (!res.ok) { alert(data.message || data.error); return; }
        await refreshSalaryList(authSchool.schoolId);
        await fetchAllHistory(authSchool.schoolId);
    };

    const confirmHold = async () => {
        const res = await fetch(`${API_URL}/api/groupb/salary/hold/${pendingPayId}`, {
            method: "PATCH", headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        setPayConfirmModal(false); setPendingPayId(null);
        if (!res.ok) { alert(data.message || data.error); return; }
        await refreshSalaryList(authSchool.schoolId);
        await fetchAllHistory(authSchool.schoolId);
    };

    const openEditModal = (salary) => {
        setSelectedSalary({ ...salary, id: salary.id || salary.salaryId });
        setBonus(salary.bonus ?? 0);
        const leaveD = calcLeaveDeduction(salary.basicSalary || 0, salary.leaveDays || 0);
        setDeduction(Math.max(0, (salary.deductions || 0) - leaveD));
        setLeaveDays(salary.leaveDays ?? 0);
        setEditModal(true);
    };

    const createThenEdit = async (row) => {
        const staffId = row.staff?.id || row.staffId;
        if (!staffId) return;
        setLoading(true);
        const res = await fetch(`${API_URL}/api/groupb/salary/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
            body: JSON.stringify({
                staffId,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                bonus: 0, deductions: 0, leaveDays: 0,
            })
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { alert(data.message || data.error); return; }
        await refreshSalaryList(authSchool.schoolId);
        await fetchAllHistory(authSchool.schoolId);
        setSelectedSalary({ ...data, id: data.id, basicSalary: data.basicSalary, staff: row.staff });
        setBonus(0); setDeduction(0); setLeaveDays(0);
        setEditModal(true);
    };

    const openDeleteModal = (salary) => { setSelectedSalary({ id: salary.id || salary.salaryId }); setDeleteModal(true); };

    const openHistoryModal = async (salary) => {
        setSelectedSalary(salary);
        const staffId = salary.staff?.id || salary.staffId;
        const res = await fetch(`${API_URL}/api/groupb/salary/history/${staffId}`, {
            headers: { Authorization: `Bearer ${tok()}` }
        });
        const data = await res.json();
        setSalaryHistory(Array.isArray(data) ? data : []);
        setHistoryModal(true);
    };

    const openSlipModal = (salary) => { setSelectedSalary(salary); setSlipModal(true); };

    // ── Build full jsPDF payslip (same quality as Group A) ──────────────────
    const buildPayslipPDF = (salary) => {
        const doc = new jsPDF("p", "mm", "a4");
        const W = 210, M = 14, CW = 210 - M * 2;
        let y = 0;

        // Header background
        doc.setFillColor(28, 48, 64);
        doc.rect(0, 0, W, 44, "F");

        // School name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(authSchool.schoolName, M, 16);

        // Group label
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(160, 185, 200);
        doc.text("Group B — Non-Teaching Staff", M, 23);

        // "SALARY SLIP" label (right)
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(140, 170, 190);
        doc.text("SALARY SLIP", W - M, 13, { align: "right" });

        // Month / Year (right)
        doc.setFontSize(15);
        doc.setTextColor(255, 255, 255);
        doc.text(`${monthName(salary.month)} ${salary.year}`, W - M, 22, { align: "right" });

        // Divider
        doc.setDrawColor(255, 255, 255, 0.15);
        doc.setLineWidth(0.3);
        doc.line(M, 30, W - M, 30);

        // Generated date
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 170, 190);
        doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, M, 38);

        // Confidential badge
        doc.setDrawColor(140, 170, 190);
        doc.setLineWidth(0.3);
        doc.roundedRect(W - M - 28, 33, 28, 7, 1, 1, "S");
        doc.setTextColor(140, 170, 190);
        doc.setFontSize(7);
        doc.text("Confidential", W - M - 14, 37.5, { align: "center" });

        y = 44;

        // Employee info strip
        doc.setFillColor(234, 241, 246);
        doc.rect(0, y, W, 24, "F");
        doc.setDrawColor(200, 220, 236);
        doc.setLineWidth(0.3);
        doc.line(0, y + 24, W, y + 24);

        const staffName = salary.staffName || `${salary.staff?.firstName || ""} ${salary.staff?.lastName || ""}`.trim() || "—";
        const staffEmail = salary.staffEmail || salary.staff?.email || "—";
        const staffRole = salary.staffRole || salary.staff?.role || "—";

        const infoFields = [
            { label: "EMPLOYEE NAME", val: staffName },
            { label: "ROLE",          val: staffRole },
            { label: "PAY PERIOD",    val: `${monthName(salary.month)} ${salary.year}` },
            { label: "EMAIL",         val: staffEmail },
        ];
        const colW = CW / 4;
        infoFields.forEach((f, i) => {
            const x = M + i * colW;
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(82, 122, 145);
            doc.text(f.label, x, y + 8);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(28, 48, 64);
            const maxChars = 20;
            const display = f.val.length > maxChars ? f.val.slice(0, maxChars - 1) + "…" : f.val;
            doc.text(display, x, y + 17);
        });
        y += 28;

        // Earnings & Deductions tables
        const tW = (CW - 6) / 2;
        const leaveDed = calcLeaveDeduction(salary?.basicSalary || 0, salary?.leaveDays || 0);
        const otherDed = Math.max(0, Number(salary?.deductions || 0) - leaveDed);

        const sections = [
            {
                title: "EARNINGS",
                color: [43, 69, 87],
                rows: [
                    ["Basic Salary", `Rs.${Number(salary?.basicSalary || 0).toLocaleString("en-IN")}`],
                    ["Bonus",        `Rs.${Number(salary?.bonus || 0).toLocaleString("en-IN")}`],
                    ["HRA",          "Rs.0"],
                    ["Other",        "Rs.0"],
                ],
                footLabel: "Gross Earnings",
                foot: `Rs.${(Number(salary?.basicSalary || 0) + Number(salary?.bonus || 0)).toLocaleString("en-IN")}`,
            },
            {
                title: "DEDUCTIONS",
                color: [28, 48, 64],
                rows: [
                    ["Leave Deduction",  `${salary?.leaveDays ?? 0}d -> Rs.${leaveDed.toLocaleString("en-IN")}`],
                    ["Other Deductions", `Rs.${otherDed.toLocaleString("en-IN")}`],
                    ["PF",               "Rs.0"],
                    ["Tax (TDS)",        "Rs.0"],
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
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(sec.title, x + 4, y + 6);

            sec.rows.forEach((row, ri) => {
                const ry = y + 9 + ri * ROW_H;
                doc.setFillColor(ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 251, ri % 2 === 0 ? 255 : 253);
                doc.rect(x, ry, tW, ROW_H, "F");
                doc.setDrawColor(238, 245, 250);
                doc.setLineWidth(0.2);
                doc.line(x, ry + ROW_H, x + tW, ry + ROW_H);
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(74, 104, 120);
                doc.text(row[0], x + 4, ry + 6);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(60, 93, 116);
                doc.text(row[1], x + tW - 3, ry + 6, { align: "right" });
            });

            const fy = y + 9 + sec.rows.length * ROW_H;
            doc.setFillColor(234, 241, 246);
            doc.rect(x, fy, tW, 10, "F");
            doc.setDrawColor(212, 228, 238);
            doc.setLineWidth(0.5);
            doc.line(x, fy, x + tW, fy);
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(60, 93, 116);
            doc.text(sec.footLabel, x + 4, fy + 7);
            doc.text(sec.foot, x + tW - 3, fy + 7, { align: "right" });
            doc.setDrawColor(200, 220, 236);
            doc.setLineWidth(0.3);
            doc.rect(x, y + 9, tW, sec.rows.length * ROW_H + 10, "S");
        });

        y += 9 + sections[0].rows.length * ROW_H + 10 + 8;

        // Net Salary banner
        doc.setFillColor(28, 48, 64);
        doc.roundedRect(M, y, CW, 20, 2, 2, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(140, 170, 190);
        doc.text("NET SALARY PAYABLE", M + 8, y + 8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 155, 175);
        doc.text(`For ${monthName(salary.month)} ${salary.year}`, M + 8, y + 15);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`Rs.${Number(salary?.netSalary || 0).toLocaleString("en-IN")}`, W - M - 8, y + 13, { align: "right" });
        y += 28;

        // Footer strip
        doc.setFillColor(234, 241, 246);
        doc.rect(0, y, W, 12, "F");
        doc.setDrawColor(200, 220, 236);
        doc.setLineWidth(0.3);
        doc.line(0, y, W, y);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(82, 122, 145);
        doc.text(
            "This is a system-generated payslip and does not require a physical signature.",
            W / 2, y + 8, { align: "center" }
        );

        return doc;
    };

    const downloadPayslip = () => {
        if (!selectedSalary) return;
        const staffName = selectedSalary.staffName || selectedSalary.staff?.firstName || "staff";
        const doc = buildPayslipPDF(selectedSalary);
        doc.save(`Payslip-GroupB-${staffName}-${monthName(selectedSalary.month)}-${selectedSalary.year}.pdf`);
    };

    // ── WhatsApp send (same flow as Group A) ─────────────────────────────────
    const handleSendSalarySlip = async (salary) => {
        
    try {

        const auth =
            JSON.parse(
                localStorage.getItem("auth")
            );

        const token = auth?.token;

        const doc =
            buildPayslipPDF(salary);

        // ✅ CORRECT PDF BASE64
        const pdfBase64 =
            doc.output("datauristring");

        console.log(
            "PDF BASE64 =>",
            pdfBase64
        );

        // STEP 1 → Upload PDF
        const uploadRes =
            await fetch(
                `${API_URL}/api/groupb/salary/uploadSalarySlip/${salary.id}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        pdfBase64,
                    }),
                }
            );

        const uploadData =
            await uploadRes.json();

        console.log(
            "UPLOAD DATA =>",
            uploadData
        );

        if (!uploadRes.ok) {

            alert(
                uploadData.message
            );

            return;
        }

        // STEP 2 → Send WhatsApp
        const sendRes =
            await fetch(
                `${API_URL}/api/groupb/salary/sendSalarySlip/${salary.id}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        pdfUrl:
                            uploadData.pdfUrl,
                    }),
                }
            );

        const sendData =
            await sendRes.json();

        console.log(
            "SEND DATA =>",
            sendData
        );

        if (!sendRes.ok) {

            alert(
                sendData.message
            );

            return;
        }

        alert(
            "Salary slip sent successfully"
        );

    } catch (error) {

        console.log(
            "SEND ERROR =>",
            error
        );

        alert(
            "Failed to send salary slip"
        );

    }
    };

    const confirmWhatsAppSend = async () => {

        if (!selectedWhatsAppSalary) return;

        await handleSendSalarySlip(selectedWhatsAppSalary);

        setWaConfirmModal(false);

        setSelectedWhatsAppSalary(null);
    };


    // ── Derived / filtered lists ──────────────────────────────────────────────
    const searchFn = (r) => {
        const name = r.staffName || `${r.staff?.firstName || ""} ${r.staff?.lastName || ""}`;
        return name.toLowerCase().includes(search.toLowerCase()) ||
            (r.staffEmail || r.staff?.email || "").toLowerCase().includes(search.toLowerCase());
    };

    const nowM = new Date().getMonth() + 1, nowY = new Date().getFullYear();

    const realFiltered = salaryList
        .filter(r => Number(r.month) === nowM && Number(r.year) === nowY)
        .filter(r => tableStatusFilter === "ALL" || r.status === tableStatusFilter)
        .filter(searchFn);

    const realStaffIds = new Set(
        salaryList.filter(r => Number(r.month) === nowM && Number(r.year) === nowY)
            .map(r => String(r.staff?.id || r.staffId))
    );

    const curPlaceholders = currentMonthPlaceholders
        .filter(r => !realStaffIds.has(String(r.staff?.id || r.staffId)))
        .filter(searchFn);

    const filtered = [...realFiltered, ...curPlaceholders];

    const filteredHistory = allSalaryHistory
        .filter(r => historyStatusFilter === "ALL" ? (r.status === "PAID" || r.status === "HOLD") : r.status === historyStatusFilter)
        .filter(r => {
            const name = r.staffName || `${r.staff?.firstName || ""} ${r.staff?.lastName || ""}`;
            return name.toLowerCase().includes(historySearch.toLowerCase()) ||
                (r.staffEmail || r.staff?.email || "").toLowerCase().includes(historySearch.toLowerCase());
        });

    const editBasic = selectedSalary?.basicSalary || 0;
    const editLeaveDed = calcLeaveDeduction(editBasic, leaveDays);
    const editNetPreview = Number(editBasic) + Number(bonus || 0) - editLeaveDed - Number(deduction || 0);
    const leaveDedPreview = calcLeaveDeduction(staffDetail?.basicSalary || 0, leaveDays);
    const netPreview = Number(staffDetail?.basicSalary || 0) + Number(bonus || 0) - leaveDedPreview - Number(deduction || 0);

    // Helper: get display name from salary row
    const rowName = (r) => r.staffName || `${r.staff?.firstName || ""} ${r.staff?.lastName || ""}`;
    const rowEmail = (r) => r.staffEmail || r.staff?.email || "—";
    const rowRole = (r) => r.staffRole || r.staff?.role || "—";

    return (
        <div>
            {/* ── HEADER ── */}
            <div className="bg-gradient-to-r from-[#1A2E3D] via-[#27435B] to-[#3A5E78] rounded-2xl px-4 sm:px-8 py-5 sm:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shadow-lg"><IndianRupee size={22} color="#fff" /></div>
                    <div>
                        <h1 className="text-[22px] font-bold text-white tracking-tight m-0">Group B — Salary Management</h1>
                        <p className="text-[12px] text-white/55 italic m-0">{authSchool.schoolName} • Non-Teaching Staff</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A6B80]" />
                        <input className="pl-9 pr-3 py-2.5 rounded-xl border border-[#C8DCEC] bg-white/90 text-[13px] text-[#162535] w-full sm:w-52 md:w-60 outline-none focus:border-[#27435B] focus:bg-white"
                            placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button onClick={() => { setSelectedStaff(""); setBonus(0); setDeduction(0); setLeaveDays(0); setShowModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[13.5px] font-semibold transition-all border border-white/20">
                        <Plus size={15} /> Add Salary
                    </button>
                </div>
            </div>

            {/* ── STATS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
                {[
                    { label: "Total Staff", val: salaryList.length, icon: Users, color: "from-[#27435B] to-[#1C3044]" },
                    { label: "Pending Payment", val: salaryList.filter(r => r.status === "PENDING").length, icon: AlertTriangle, color: "from-[#B08A00] to-[#7A5E00]" },
                    { label: "Paid This Month", val: salaryList.filter(r => r.status === "PAID").length, icon: BadgeCheck, color: "from-[#1E7E4E] to-[#155A36]" },
                    { label: "Total Payout", val: `₹${salaryList.reduce((s, r) => s + Number(r.netSalary || 0), 0).toLocaleString("en-IN")}`, icon: Banknote, color: "from-[#3A5E78] to-[#27435B]" },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 shadow-lg`}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><s.icon size={16} color="#fff" /></div>
                            <div>
                                <div className="text-[11px] font-bold text-white/60 uppercase tracking-wide">{s.label}</div>
                                <div className="text-[20px] font-bold text-white mt-0.5">{s.val}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── SALARY TABLE ── */}
            <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden mb-5 border border-white/60">
                <div className="bg-gradient-to-r from-[#27435B] to-[#1C3044] px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <ListOrdered size={15} color="#fff" />
                        <span className="text-white font-bold text-[14px]">Group B Staff — Salary Records</span>
                        <span className="ml-1 text-white/50 text-[11px]">{monthName(nowM)} {nowY}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-white/60 text-[12px]">{filtered.length} records</span>
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setShowStatusDropdown(v => !v)}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[12.5px] font-semibold transition-all border border-white/20">
                                <span className="flex items-center gap-1.5">
                                    {tableStatusFilter === "ALL" && <span className="w-2 h-2 rounded-full bg-white/60 inline-block" />}
                                    {tableStatusFilter === "PAID" && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />}
                                    {tableStatusFilter === "PENDING" && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />}
                                    {tableStatusFilter === "HOLD" && <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />}
                                    {tableStatusFilter}
                                </span>
                                <ChevronDown size={13} />
                            </button>
                            {showStatusDropdown && (
                                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-[#C8DCEC] z-20 min-w-[130px] overflow-hidden">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button key={opt} onClick={() => { setTableStatusFilter(opt); setShowStatusDropdown(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-[12.5px] font-semibold flex items-center gap-2 hover:bg-[#EAF1F6] transition-colors ${tableStatusFilter === opt ? "text-[#27435B] bg-[#EAF1F6]" : "text-[#4A6B80]"}`}>
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
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px] sm:text-[13px] min-w-[700px]">
                        <thead>
                            <tr className="bg-[#EAF1F6] border-b border-[#C8DCEC]">
                                {["Name", "Email", "Role", "Basic Salary", "Bonus", "Deductions", "Leave Days", "Net Salary", "Status", "Actions"].map(h => (
                                    <th key={h} className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-[11px] font-bold text-[#27435B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={10} className="text-center py-12 text-[#4A6B80]">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-[#EAF1F6] flex items-center justify-center"><Wrench size={24} color="#8AAFC4" /></div>
                                        <p className="text-[13px] font-semibold">No salary records yet</p>
                                        <p className="text-[11px] text-[#8AAFC4]">Add Group B staff first, then click "Add Salary"</p>
                                    </div>
                                </td></tr>
                            ) : filtered.map((r, idx) => (
                                <tr key={r.id || idx} className={`border-b border-[#EAF1F6] hover:bg-[#F5FAFE] transition-colors ${r._isPlaceholder ? "bg-[#FAFCFE]" : ""}`}>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-[#1A2E3D]">{rowName(r)}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#4A6B80]">{rowEmail(r)}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3"><span className="bg-[#EAF1F6] text-[#27435B] text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full">{rowRole(r)}</span></td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-[#27435B]">₹{Number(r.basicSalary || 0).toLocaleString("en-IN")}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#1E7E4E] font-semibold">{r._isPlaceholder ? "₹0" : `₹${Number(r.bonus || 0).toLocaleString("en-IN")}`}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#B83232] font-semibold">{r._isPlaceholder ? "₹0" : `₹${Number(r.deductions || 0).toLocaleString("en-IN")}`}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[#4A6B80]">{r._isPlaceholder ? "0 days" : `${r.leaveDays ?? 0} days`}</td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="font-bold text-[#1A2E3D]">₹{Number(r._isPlaceholder ? r.basicSalary : r.netSalary || 0).toLocaleString("en-IN")}</span>
                                            {!r._isPlaceholder && (r.status === "PENDING" ? (
                                                <button onClick={() => requestPay(r.salaryId || r.id)} className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-[#27435B] to-[#1C3044] text-white hover:opacity-80 transition-opacity">Pay Now</button>
                                            ) : r.status === "HOLD" ? (
                                                <button onClick={() => requestPay(r.salaryId || r.id)} className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-700 text-white hover:opacity-80 transition-opacity">Pay (Hold)</button>
                                            ) : (
                                                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full bg-green-100 text-green-700 w-fit">✓ Paid</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                        {r._isPlaceholder
                                            ? <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full bg-[#EAF1F6] text-[#8AAFC4]">Not Created</span>
                                            : <span className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-full ${statusStyle(r.status)}`}>{r.status || "PENDING"}</span>
                                        }
                                    </td>
                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                        <div className="flex items-center gap-1">
                                            {[
                                                { icon: Pencil, fn: () => r._isPlaceholder ? createThenEdit(r) : openEditModal(r), color: "text-[#27435B] hover:bg-[#EAF1F6]", title: r._isPlaceholder ? "Set Bonus & Leaves" : "Edit", disabled: false },
                                                { icon: Trash2, fn: () => openDeleteModal(r), color: r._isPlaceholder ? "text-[#C8DCEC] cursor-not-allowed" : "text-red-500 hover:bg-red-50", title: "Delete", disabled: r._isPlaceholder },
                                                { icon: History, fn: () => openHistoryModal(r), color: "text-[#4A6B80] hover:bg-[#EAF1F6]", title: "History", disabled: false },
                                                { icon: Eye, fn: () => !r._isPlaceholder && openSlipModal(r), color: r._isPlaceholder ? "text-[#C8DCEC] cursor-not-allowed" : "text-[#27435B] hover:bg-[#EAF1F6]", title: "View Slip", disabled: r._isPlaceholder },
                                                // ✅ WHATSAPP BUTTON
                                                ...(isPremium ? [{
                                                    icon: FaWhatsapp,
                                                    fn: () => {
                                                        if (r._isPlaceholder) return;

                                                        setSelectedWhatsAppSalary(r);

                                                        setWaConfirmModal(true);
                                                    },
                                                    color: r._isPlaceholder
                                                        ? "text-[#C8DCEC] cursor-not-allowed"
                                                        : "text-green-600 hover:bg-green-50",

                                                    title: "Send WhatsApp",

                                                    disabled: r._isPlaceholder,
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── PAY CONFIRM MODAL ── */}
            {payConfirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setPayConfirmModal(false); setPendingPayId(null); }}>
                    <div className="bg-white rounded-3xl w-full max-w-[420px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-7 flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-[#EAF1F6] flex items-center justify-center"><IndianRupee size={28} className="text-[#27435B]" /></div>
                            <div>
                                <div className="text-[17px] font-bold text-[#1A2E3D]">Confirm Salary Payment?</div>
                                <div className="text-[13px] text-[#4A6B80] mt-1">Once paid, this record will be marked as <span className="font-bold text-green-600">PAID</span>.</div>
                            </div>
                            <div className="w-full bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                                <Pause size={15} className="text-orange-500 flex-shrink-0" />
                                <div className="text-left">
                                    <div className="text-[12px] font-bold text-orange-700">Need to delay this payment?</div>
                                    <div className="text-[11px] text-orange-500 mt-0.5">Put it on hold — you can pay it later.</div>
                                </div>
                                <button onClick={confirmHold} className="ml-auto flex-shrink-0 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11.5px] font-bold transition-colors">⏸ Hold</button>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setPayConfirmModal(false); setPendingPayId(null); }} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors">Cancel</button>
                                <button onClick={confirmPay} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1E7E4E] to-[#155A36] text-white text-[13.5px] font-bold hover:opacity-90 transition-opacity">✓ Confirm Pay</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADD SALARY MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[520px] max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#1A2E3D] via-[#27435B] to-[#3A5E78] rounded-t-3xl px-7 py-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Sparkles size={18} color="#fff" /></div>
                                <div><div className="text-white font-bold text-[17px]">Add Salary Record</div><div className="text-white/55 text-[11.5px]">Group B • Non-Teaching Staff</div></div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={16} /></button>
                        </div>
                        <div className="p-6 flex flex-col gap-5">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6B80] mb-2">School</p>
                                <div className="flex items-center gap-3 bg-gradient-to-r from-[#EAF1F6] to-[#F5FAFE] border border-[#C8DCEC] rounded-2xl p-3.5">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#27435B] to-[#1C3044] flex items-center justify-center flex-shrink-0"><Building2 size={15} color="#fff" /></div>
                                    <div><div className="text-[13.5px] font-semibold text-[#1A2E3D]">{authSchool.schoolName}</div><div className="text-[10.5px] text-[#4A6B80] mt-0.5">Auto-detected from your login session</div></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6B80] mb-2">Select Group B Staff Member</p>
                                <div className="relative">
                                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A6B80]" />
                                    <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 border border-[#C8DCEC] rounded-xl text-[13.5px] text-[#1A2E3D] bg-white outline-none focus:border-[#27435B] appearance-none cursor-pointer">
                                        <option value="">— Choose a staff member —</option>
                                        {dropdownStaff.map(s => (
                                            <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.role}</option>
                                        ))}
                                    </select>
                                </div>
                                {dropdownStaff.length === 0 && (
                                    <p className="text-[11px] text-amber-600 mt-1.5">⚠ No Group B staff found. Add staff with Group Type "Group B" first.</p>
                                )}
                            </div>
                            {staffDetail && (
                                <div className="bg-gradient-to-br from-[#EAF1F6] to-[#F5FAFE] border border-[#C8DCEC] rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#27435B] to-[#1C3044] flex items-center justify-center flex-shrink-0"><User size={18} color="#fff" /></div>
                                        <div>
                                            <div className="text-[15px] font-bold text-[#1A2E3D]">{staffDetail.firstName} {staffDetail.lastName}</div>
                                            <div className="text-[11.5px] text-[#4A6B80]">{staffDetail.role}</div>
                                        </div>
                                        <span className="ml-auto text-[10px] font-bold bg-[#27435B]/10 text-[#27435B] px-2.5 py-1 rounded-full">AUTO-FILLED ✓</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { icon: Mail, label: "Email", val: staffDetail.email || "—" },
                                            { icon: Wrench, label: "Role", val: staffDetail.role || "—" },
                                            { icon: IndianRupee, label: "Basic Salary", val: `₹${Number(staffDetail.basicSalary || 0).toLocaleString("en-IN")}` },
                                            { icon: Building2, label: "Group", val: staffDetail.groupType || "Group B" },
                                        ].map((f, i) => (
                                            <div key={i} className="bg-white border border-[#C8DCEC] rounded-xl p-2.5">
                                                <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-[#4A6B80] uppercase tracking-wide mb-1"><f.icon size={10} />{f.label}</div>
                                                <div className="text-[12.5px] font-semibold text-[#1A2E3D] truncate">{f.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Bonus (₹)", color: "text-[#1E7E4E]", prefix: "+", val: bonus, set: setBonus },
                                    { label: "Leave Days", color: "text-[#B08A00]", prefix: "L", val: leaveDays, set: setLeaveDays },
                                    { label: "Extra Deduction (₹)", color: "text-[#B83232]", prefix: "-", val: deduction, set: setDeduction },
                                ].map((f, i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <label className={`text-[11px] font-bold ${f.color} uppercase tracking-wide`}>{f.label}</label>
                                        <div className="flex items-center border border-[#C8DCEC] rounded-xl overflow-hidden bg-white focus-within:border-[#27435B]">
                                            <span className={`px-3 text-[13px] font-bold ${f.color}`}>{f.prefix}</span>
                                            <input type="number" min={0} value={f.val} onChange={e => f.set(e.target.value)} className="flex-1 py-2.5 pr-3 text-[13.5px] font-semibold text-[#1A2E3D] outline-none bg-transparent" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {leaveDays > 0 && staffDetail && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-[12px] text-amber-700 flex items-center gap-2">
                                    <ClipboardList size={13} />
                                    <span><span className="font-bold">{leaveDays} leave day(s)</span> × ₹{Math.round((Number(staffDetail.basicSalary || 0) * 12) / 365).toLocaleString("en-IN")}/day = <span className="font-bold">₹{leaveDedPreview.toLocaleString("en-IN")}</span> auto-deducted</span>
                                </div>
                            )}
                            <div className="bg-gradient-to-r from-[#27435B] to-[#1A2E3D] rounded-2xl px-5 py-3.5 flex items-center justify-between">
                                <div><div className="text-[10.5px] font-bold uppercase tracking-wider text-white/55">Net Salary Preview</div><div className="text-[10.5px] text-white/35 mt-0.5">Basic + Bonus − All Deductions</div></div>
                                <div className="text-[22px] font-bold text-white">₹{Math.max(0, netPreview).toLocaleString("en-IN")}</div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors bg-white">Cancel</button>
                                <button onClick={createSalary} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#27435B] to-[#1A2E3D] text-white text-[13.5px] font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                                    {loading ? "Creating..." : <><CheckCircle2 size={14} /> Create Salary</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT MODAL ── */}
            {editModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[520px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#1A2E3D] to-[#27435B] rounded-t-3xl px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><Pencil size={16} color="#fff" /></div>
                                <div>
                                    <div className="text-white font-bold text-[16px]">Edit Salary Record</div>
                                    <div className="text-white/55 text-[11px]">{rowName(selectedSalary || {})} • {monthName(selectedSalary?.month)} {selectedSalary?.year}</div>
                                </div>
                            </div>
                            <button onClick={() => setEditModal(false)} className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={15} /></button>
                        </div>
                        <div className="mx-6 mt-5 bg-[#EAF1F6] border border-[#C8DCEC] rounded-2xl p-4">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Staff Member", val: rowName(selectedSalary || {}) },
                                    { label: "Role", val: rowRole(selectedSalary || {}) },
                                    { label: "Basic Salary", val: `₹${Number(selectedSalary?.basicSalary || 0).toLocaleString("en-IN")}` },
                                ].map((f, i) => (
                                    <div key={i}>
                                        <div className="text-[9.5px] font-bold uppercase tracking-wide text-[#527a91] mb-0.5">{f.label}</div>
                                        <div className="text-[13px] font-semibold text-[#1A2E3D]">{f.val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Bonus (₹)", color: "text-[#1E7E4E]", prefix: "+", val: bonus, set: setBonus },
                                    { label: "Leave Days", color: "text-[#B08A00]", prefix: "L", val: leaveDays, set: setLeaveDays },
                                    { label: "Extra Deduction (₹)", color: "text-[#B83232]", prefix: "-", val: deduction, set: setDeduction },
                                ].map((f, i) => (
                                    <div key={i} className="flex flex-col gap-1">
                                        <label className={`text-[11px] font-bold ${f.color} uppercase tracking-wide`}>{f.label}</label>
                                        <div className="flex items-center border border-[#C8DCEC] rounded-xl overflow-hidden bg-white focus-within:border-[#27435B]">
                                            <span className={`px-3 text-[13px] font-bold ${f.color}`}>{f.prefix}</span>
                                            <input type="number" min={0} value={f.val} onChange={e => f.set(e.target.value)} className="flex-1 py-2.5 pr-3 text-[13.5px] font-semibold text-[#1A2E3D] outline-none bg-transparent" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {leaveDays > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-[12px] text-amber-700 flex items-center gap-2"><ClipboardList size={13} /><span><span className="font-bold">{leaveDays} leave day(s)</span> = <span className="font-bold">₹{editLeaveDed.toLocaleString("en-IN")}</span> auto-deducted</span></div>}
                            <div className="bg-gradient-to-r from-[#27435B] to-[#1A2E3D] rounded-2xl px-5 py-3.5 flex items-center justify-between">
                                <div><div className="text-[10.5px] font-bold uppercase tracking-wider text-white/55">Net Salary Preview</div></div>
                                <div className="text-[22px] font-bold text-white">₹{Math.max(0, editNetPreview).toLocaleString("en-IN")}</div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setEditModal(false)} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors bg-white">Cancel</button>
                                <button onClick={updateSalary} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#27435B] to-[#1A2E3D] text-white text-[13.5px] font-bold shadow-lg hover:opacity-90 transition-opacity"><CheckCircle2 size={14} /> Update</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE MODAL ── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-7 flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center"><Trash2 size={28} className="text-red-500" /></div>
                            <div><div className="text-[17px] font-bold text-[#1A2E3D]">Delete Salary Record?</div><div className="text-[13px] text-[#4A6B80] mt-1">This action cannot be undone.</div></div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteModal(false)} className="flex-1 py-2.5 border border-[#C8DCEC] rounded-xl text-[13.5px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors">Cancel</button>
                                <button onClick={deleteSalary} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white text-[13.5px] font-bold hover:opacity-90 transition-opacity">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── HISTORY MODAL ── */}
            {historyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setHistoryModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[640px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#1A2E3D] to-[#27435B] rounded-t-3xl px-6 py-5 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><History size={16} color="#fff" /></div>
                                <div>
                                    <div className="text-white font-bold text-[16px]">Salary History</div>
                                    <div className="text-white/55 text-[11px]">{rowName(selectedSalary || {})} — All Months</div>
                                </div>
                            </div>
                            <button onClick={() => setHistoryModal(false)} className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"><X size={15} /></button>
                        </div>
                        <div className="p-5">
                            {salaryHistory.length === 0 ? (
                                <div className="text-center py-10 text-[#4A6B80]">No history records found</div>
                            ) : salaryHistory.map((h, i) => (
                                <div key={i} className="mb-4 border border-[#C8DCEC] rounded-2xl overflow-hidden">
                                    <div className="bg-[#EAF1F6] px-4 py-3 flex items-center justify-between">
                                        <span className="font-bold text-[#1A2E3D] text-[14px]">{monthName(h.month)} {h.year}</span>
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusStyle(h.status)}`}>{h.status === "PAID" ? "✓ Paid" : h.status === "HOLD" ? "⏸ Hold" : h.status}</span>
                                    </div>
                                    <div className="p-4 grid grid-cols-4 gap-3">
                                        {[
                                            { label: "BASIC", val: `₹${Number(h.basicSalary || 0).toLocaleString("en-IN")}`, color: "text-[#1A2E3D]" },
                                            { label: "BONUS", val: `+₹${Number(h.bonus || 0).toLocaleString("en-IN")}`, color: "text-green-600" },
                                            { label: "DEDUCTIONS", val: `-₹${Number(h.deductions || 0).toLocaleString("en-IN")} (${h.leaveDays ?? 0}d)`, color: "text-red-500" },
                                            { label: "NET SALARY", val: `₹${Number(h.netSalary || 0).toLocaleString("en-IN")}`, color: "text-[#27435B] font-bold" },
                                        ].map((f, j) => (
                                            <div key={j} className="bg-[#F5FAFE] border border-[#EAF1F6] rounded-xl p-3">
                                                <div className="text-[9.5px] font-bold text-[#8AAFC4] uppercase tracking-wide mb-1">{f.label}</div>
                                                <div className={`text-[13px] font-semibold ${f.color}`}>{f.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {h.paymentDate && <div className="px-4 pb-3 text-[11.5px] text-[#4A6B80]">Paid on: {new Date(h.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── PAYSLIP MODAL ── */}
            {slipModal && selectedSalary && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSlipModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div style={{ background: "linear-gradient(135deg,#1c3040,#3c5d74,#527a91)", borderRadius: "24px 24px 0 0", padding: "22px 24px 18px" }}>
                            <div className="flex justify-between mb-3">
                                <div>
                                    <div className="text-[17px] sm:text-[20px] font-bold text-white">{authSchool.schoolName}</div>
                                    <div className="text-[10px] sm:text-[11.5px] text-white/55 mt-1">Group B — Non-Teaching Staff</div>
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
                                { key: "Employee Name", val: rowName(selectedSalary) },
                                { key: "Role", val: rowRole(selectedSalary) },
                                { key: "Pay Period", val: `${monthName(selectedSalary.month)} ${selectedSalary.year}` },
                                { key: "Email", val: rowEmail(selectedSalary) },
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
                        </div>

                        <div className="bg-[#EAF1F6] border-t border-[#C8DCEC] px-5 sm:px-9 py-2.5 sm:py-3 text-[10px] sm:text-[10.5px] text-[#527a91] text-center italic">
                            This is a system-generated payslip and does not require a physical signature.
                        </div>

                        <div className="px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-3 border-t border-[#C8DCEC]">
                            <button onClick={() => setSlipModal(false)} className="px-4 sm:px-5 py-2.5 border border-[#C8DCEC] rounded-xl text-[12px] sm:text-[13px] font-semibold text-[#4A6B80] hover:border-[#27435B] transition-colors">Close</button>
                            {/* ✅ WhatsApp send button inside slip modal */}
                             
                            <button onClick={downloadPayslip} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#27435B] to-[#1A2E3D] text-white text-[12px] sm:text-[13px] font-bold hover:opacity-90 transition-opacity">
                                <Printer size={13} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        {/* WhatsApp Confirm Modal */}
            {waConfirmModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => {
                        setWaConfirmModal(false);
                        setSelectedWhatsAppSalary(null);
                    }}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-[420px] shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 flex flex-col items-center text-center gap-4">

                            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                                <FaWhatsapp size={28} className="text-green-600" />
                            </div>

                            <div>
                                <div className="text-[18px] font-bold text-[#1A2E3D]">
                                    Send WhatsApp Salary Slip?
                                </div>

                                <div className="text-[13px] text-[#4A6B80] mt-2">
                                    Are you sure you want to send salary slip to
                                    <span className="font-bold text-[#1A2E3D]">
                                        {" "}
                                        {selectedWhatsAppSalary?.admin?.name ||
                                            selectedWhatsAppSalary?.adminName ||
                                            "Staff"}
                                    </span>
                                    ?
                                </div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => {
                                        setWaConfirmModal(false);
                                        setSelectedWhatsAppSalary(null);
                                    }}
                                    className="flex-1 py-3 border border-[#C8DCEC] rounded-xl text-[14px] font-semibold text-[#4A6B80]"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={confirmWhatsAppSend}
                                    className="flex-1 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-[14px] font-bold"
                                >
                                    Send
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}