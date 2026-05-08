import React, { useState, useEffect } from "react";
import {
    Search, IndianRupee, CalendarDays,
    Pencil, Trash2, UserPlus, GraduationCap,
    AlertCircle, CheckCircle, Clock, CreditCard,
    Users, X, Download, Receipt, FileText
} from "lucide-react";
// import  from "../../components/";
import Addstudent from "./Addstudent";
import { PayModal } from "../../../finance/pages/Studentfinance/PayModal";

const API_URL = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceModal({ student, onClose }) {
    const paidAmount = Number(student.paidAmount || 0);
    const totalFees = Number(student.fees || 0);
    const due = Math.max(0, totalFees - paidAmount);
    const invoiceNo = `INV-${String(student.id || "").slice(-4).padStart(4, "0")}-${new Date().getFullYear()}`;
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    // Parse fee breakdown if stored as JSON in feeBreakdown field
    let breakdown = null;
    try { breakdown = student.feeBreakdown ? JSON.parse(student.feeBreakdown) : null; } catch { }

    const handleDownload = () => {
        if (!window.jspdf) { alert("PDF library not loaded yet. Please try again."); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const W = 210, m = 18;
        doc.setFillColor(28, 48, 68); doc.rect(0, 0, W, 40, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
        doc.text("Invoice", m, 17);
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
        doc.text("Fee Invoice & Payment Receipt", m, 25);
        doc.setFillColor(255, 255, 255); doc.roundedRect(W - m - 52, 8, 52, 22, 3, 3, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(28, 48, 68);
        doc.text("INVOICE", W - m - 26, 16, { align: "center" });
        doc.setFontSize(10); doc.text(invoiceNo, W - m - 26, 24, { align: "center" });
        doc.setFillColor(39, 67, 91); doc.rect(0, 40, W, 10, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
        doc.text(`Date: ${today}`, m, 47);
        doc.text(`Status: ${due === 0 ? "PAID" : "PARTIALLY PAID"}`, W - m, 47, { align: "right" });
        let y = 62;
        doc.setFillColor(240, 247, 252); doc.roundedRect(m, y - 6, W - m * 2, 36, 3, 3, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
        doc.text("STUDENT DETAILS", m + 4, y);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 50, 70);
        doc.setFont("helvetica", "bold"); doc.text("Name:", m + 4, y + 8);
        doc.setFont("helvetica", "normal"); doc.text(student.name || "N/A", m + 24, y + 8);
        doc.setFont("helvetica", "bold"); doc.text("Email:", W / 2 + 4, y + 8);
        doc.setFont("helvetica", "normal"); doc.text(student.email || "N/A", W / 2 + 24, y + 8);
        doc.setFont("helvetica", "bold"); doc.text("Course:", m + 4, y + 17);
        doc.setFont("helvetica", "normal"); doc.text(student.course || "N/A", m + 24, y + 17);
        y += 46;
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
        doc.text("FEE SUMMARY", m, y); y += 5;
        doc.setFillColor(28, 48, 68); doc.rect(m, y, W - m * 2, 9, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
        doc.text("Description", m + 4, y + 6); doc.text("Amount (INR)", m + 145, y + 6); y += 9;
        const rows = breakdown
            ? Object.entries(breakdown).filter(([k, v]) => k !== "customFees" && Number(v) > 0).map(([k, v]) => [k.replace(/Fee$/, "").replace(/([A-Z])/g, " $1").trim(), v])
            : [["Total Fees", totalFees]];
        rows.forEach(([label, amt], i) => {
            doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 252 : 255, 255);
            doc.rect(m, y, W - m * 2, 9, "F");
            doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 50, 70);
            doc.text(label, m + 4, y + 6);
            doc.setFont("helvetica", "bold"); doc.text(`Rs. ${Number(amt).toLocaleString("en-IN")}`, m + 145, y + 6); y += 9;
        });
        y += 12;
        const bx = W - m - 80;
        doc.setFillColor(240, 247, 252); doc.roundedRect(bx, y, 80, 34, 3, 3, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 100, 120);
        doc.text("Total Fees:", bx + 4, y + 9);
        doc.setFont("helvetica", "bold"); doc.setTextColor(28, 48, 68);
        doc.text(`Rs. ${totalFees.toLocaleString("en-IN")}`, bx + 78, y + 9, { align: "right" });
        doc.setFont("helvetica", "normal"); doc.setTextColor(80, 100, 120);
        doc.text("Amount Paid:", bx + 4, y + 18);
        doc.setFont("helvetica", "bold"); doc.setTextColor(28, 68, 48);
        doc.text(`Rs. ${paidAmount.toLocaleString("en-IN")}`, bx + 78, y + 18, { align: "right" });
        doc.setDrawColor(28, 48, 68); doc.setLineWidth(0.5); doc.line(bx + 4, y + 22, bx + 76, y + 22);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(28, 48, 68);
        doc.text("Balance Due:", bx + 4, y + 30);
        doc.setTextColor(due === 0 ? 28 : 180, due === 0 ? 90 : 30, due === 0 ? 50 : 30);
        doc.text(`Rs. ${due.toLocaleString("en-IN")}`, bx + 78, y + 30, { align: "right" });
        y = 272;
        doc.setFillColor(28, 48, 68); doc.rect(0, y, W, 25, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(180, 205, 220);
        doc.text("This is a system-generated invoice. No signature required.", W / 2, y + 9, { align: "center" });
        doc.save(`Invoice_${student.name?.replace(/\s+/g, "_") || "Student"}_${invoiceNo}.pdf`);
    };

    return (
        <div className="inv-overlay" onClick={onClose}>
            <div className="inv-box" onClick={e => e.stopPropagation()}>
                <div className="inv-head">
                    <div className="inv-head-left">
                        <div className="inv-head-ico"><Receipt size={18} color="#fff" /></div>
                        <div>
                            <div className="inv-head-title">Student Invoice</div>
                            <div className="inv-head-sub">{invoiceNo} · {today}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button className="inv-dl-btn" onClick={handleDownload}><Download size={14} /> Download PDF</button>
                        <button className="inv-close" onClick={onClose}><X size={17} /></button>
                    </div>
                </div>
                <div className="inv-body">
                    <div className="inv-section">
                        <div className="inv-sec-label">Student Details</div>
                        <div className="inv-detail-grid">
                            <div><span className="inv-dl">Name</span><span className="inv-dv">{student.name}</span></div>
                            <div><span className="inv-dl">Email</span><span className="inv-dv">{student.email}</span></div>
                            <div><span className="inv-dl">Course</span><span className="inv-dv">{student.course}</span></div>
                            <div><span className="inv-dl">Student ID</span><span className="inv-dv">#{student.id}</span></div>
                        </div>
                    </div>
                    <div className="inv-section">
                        <div className="inv-sec-label">Fee Summary</div>
                        <div className="inv-row"><span>Total Fees</span><span className="inv-bold">₹{totalFees.toLocaleString("en-IN")}</span></div>
                        <div className="inv-row"><span>Amount Paid</span><span className="inv-bold inv-green">₹{paidAmount.toLocaleString("en-IN")}</span></div>
                        <div className="inv-row inv-row-total"><span>Balance Due</span><span className="inv-bold" style={{ color: due > 0 ? "#a33030" : "#1a6e3e" }}>₹{due.toLocaleString("en-IN")}</span></div>
                        <div className="inv-progress-wrap">
                            <div className="inv-progress-fill" style={{ width: `${Math.min(100, Math.round((paidAmount / (totalFees || 1)) * 100))}%` }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#4A6B80", marginTop: 4 }}>
                            <span>{Math.min(100, Math.round((paidAmount / (totalFees || 1)) * 100))}% paid</span>
                            <span>{due === 0 ? "✓ Fully Paid" : `₹${due.toLocaleString("en-IN")} remaining`}</span>
                        </div>
                    </div>
                    {breakdown && (
                        <div className="inv-section">
                            <div className="inv-sec-label">Fee Breakdown</div>
                            {Object.entries(breakdown)
                                .filter(([k, v]) => k !== "customFees" && Number(v) > 0)
                                .map(([k, v]) => (
                                    <div key={k} className="inv-row">
                                        <span style={{ textTransform: "capitalize" }}>{k.replace(/Fee$/, "").replace(/([A-Z])/g, " $1").trim()} Fee</span>
                                        <span className="inv-bold">₹{Number(v).toLocaleString("en-IN")}</span>
                                    </div>
                                ))
                            }
                            {breakdown.customFees?.filter(c => Number(c.amount) > 0).map((c, i) => (
                                <div key={i} className="inv-row">
                                    <span>{c.label || "Custom Fee"}</span>
                                    <span className="inv-bold">₹{Number(c.amount).toLocaleString("en-IN")}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAY MODAL  — reads real student data, persists via API
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentFeesPage() {
    const [students, setStudents] = useState([]);
    const [openPopup, setOpenPopup] = useState(false);
    const [editData, setEditData] = useState(null);
    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState("All");
    const [invoiceStudent, setInvoiceStudent] = useState(null);
    const [payStudent, setPayStudent] = useState(null);

    // Load jsPDF for invoice downloads
    useEffect(() => {
        if (!window.jspdf) {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            s.async = true;
            document.head.appendChild(s);
        }
    }, []);

    // ── Fetch students ────────────────────────────────────────────────────────
    const fetchStudents = async () => {
        try {
            const auth = JSON.parse(localStorage.getItem("auth"));
            const token = auth?.token;

            const res = await fetch(`${API_URL}/api/finance/getStudentFinance`, {
                headers: {
                    Authorization: `Bearer ${token}` // ✅ FIX
                }
            });

            const data = await res.json();
            setStudents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };
    useEffect(() => { fetchStudents(); }, []);

    // ── Computed KPI from real data ───────────────────────────────────────────
    const totalFeesAll = students.reduce((a, s) => a + Number(s.fees || 0), 0);
    const totalPaidAll = students.reduce((a, s) => a + Number(s.paidAmount || 0), 0);
    const totalDueAll = Math.max(0, totalFeesAll - totalPaidAll);
    const paidCount = students.filter(s => s.paymentStatus === "PAID").length;
    const collectionPct = totalFeesAll > 0 ? Math.round((totalPaidAll / totalFeesAll) * 100) : 0;

    // ── Handlers ──────────────────────────────────────────────────────────────
    const addStudentData = (newStudent) => {
        setStudents(prev => {
            const exists = prev.some(s => s.id === newStudent.id);
            if (exists) {
                // Edit: replace the existing row in-place
                return prev.map(s => s.id === newStudent.id ? newStudent : s);
            }
            // New: prepend
            return [newStudent, ...prev];
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this student record?")) return;
        const auth = JSON.parse(localStorage.getItem("auth"));
        const token = auth?.token;

        await fetch(`${API_URL}/api/finance/deleteStudentFinance/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        fetchStudents();
    };

    const handleEdit = (student) => { setEditData(student); setOpenPopup(true); };

    // Called after a successful payment in PayModal — updates student in-place
    const handlePaymentDone = (id, newPaidAmount, newStatus) => {
        setStudents(prev => prev.map(s =>
            s.id === id
                ? { ...s, paidAmount: newPaidAmount, paymentStatus: newStatus }
                : s
        ));
        // Also refresh from DB to stay in sync
        fetchStudents();
    };

    const courses = ["All", ...Array.from(new Set(students.map(s => s.course).filter(Boolean))).sort()];

    const filtered = students.filter(s => {
        const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase());
        const matchCourse = courseFilter === "All" || s.course === courseFilter;
        return matchSearch && matchCourse;
    });

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');

                .sf2-root { --brand:#27435B; --brand-dark:#1C3044; }
                .sf2-root *, .sf2-root input, .sf2-root select, .sf2-root button { box-sizing:border-box; font-family:'DM Sans',sans-serif; }
                .sf2-page { background:linear-gradient(150deg,#C5D9E8 0%,#B2CCDC 45%,#A0BBCC 100%); min-height:100vh; }

                .sf2-topbar { background:linear-gradient(135deg,#1C3044,#27435B); padding:18px 32px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 24px rgba(39,67,91,.38); }
                .sf2-brand  { display:flex; align-items:center; gap:13px; }
                .sf2-logo   { width:46px; height:46px; border-radius:12px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
                .sf2-title  { margin:0; font-size:19px; font-weight:700; color:#fff; font-family:'Playfair Display',serif; }
                .sf2-sub    { margin:0; font-size:11.5px; color:rgba(255,255,255,.6); }
                .sf2-topright { display:flex; align-items:center; gap:10px; }
                .sf2-datebadge { color:rgba(255,255,255,.7); font-size:12px; background:rgba(255,255,255,.1); padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.18); }

                .sf2-content { padding:28px 32px; }

                .sf2-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
                .sf2-kpi { background:rgba(255,255,255,.92); border-radius:18px; padding:20px 22px; box-shadow:0 2px 16px rgba(39,67,91,.1); position:relative; overflow:hidden; border-top:4px solid #27435B; transition:transform .2s,box-shadow .2s; }
                .sf2-kpi:hover { transform:translateY(-2px); box-shadow:0 6px 22px rgba(39,67,91,.15); }
                .sf2-kpi-lbl { font-size:11px; font-weight:700; color:#4A6B80; text-transform:uppercase; letter-spacing:.9px; margin-bottom:7px; }
                .sf2-kpi-val { font-size:23px; font-weight:700; color:#1C3044; font-family:'DM Sans',sans-serif; }
                .sf2-kpi-ico-el { position:absolute; right:16px; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:rgba(39,67,91,.12); color:#27435B; }

                .sf2-strip { background:linear-gradient(135deg,#27435B,#1C3044); border-radius:16px; padding:18px 28px; display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
                .sf2-strip-item { text-align:center; }
                .sf2-strip-lbl  { color:rgba(255,255,255,.65); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
                .sf2-strip-val  { color:#fff; font-size:20px; font-weight:700; margin-top:3px; }
                .sf2-progress-track { height:12px; background:rgba(255,255,255,.2); border-radius:8px; overflow:hidden; }
                .sf2-progress-fill  { height:100%; border-radius:8px; background:linear-gradient(90deg,#88BDF2,#BDDDFC); transition:width .6s ease; }

                .sf2-panel { background:rgba(255,255,255,.92); border-radius:18px; box-shadow:0 2px 14px rgba(39,67,91,.09); overflow:hidden; margin-bottom:22px; }
                .sf2-panel-head { background:linear-gradient(135deg,#27435B,#1C3044); padding:14px 22px; display:flex; align-items:center; justify-content:space-between; }
                .sf2-ph-left { display:flex; align-items:center; gap:9px; }
                .sf2-ph-title { color:#fff; font-size:14.5px; font-weight:700; margin:0; }
                .sf2-ph-badge { background:rgba(255,255,255,.2); color:#fff; border-radius:20px; padding:2px 12px; font-size:12px; font-weight:600; }
                .sf2-panel-body { padding:4px 22px 20px; }

                .sf2-tbl { width:100%; border-collapse:collapse; font-size:13.5px; }
                .sf2-tbl th { text-align:left; padding:14px 12px 10px; border-bottom:2px solid #D0E2EE; color:#4A6B80; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; }
                .sf2-tbl td { padding:12px 12px; border-bottom:1px solid #E0EEF6; color:#1C3044; vertical-align:middle; }
                .sf2-tbl tr:last-child td { border-bottom:none; }
                .sf2-tbl tbody tr:hover td { background:#edf4f9; }

                .sf2-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 12px; border-radius:20px; font-size:11.5px; font-weight:600; }
                .sf2-badge-green { color:#1a6e3e; background:#edf7f1; border:1px solid #b2dfc6; }
                .sf2-badge-red   { color:#a33030; background:#fdf0f0; border:1px solid #f5c2c2; }
                .sf2-badge-blue  { color:#27435B; background:rgba(39,67,91,.12); }
                .sf2-badge-orange{ color:#92400e; background:#fef3c7; border:1px solid #fde68a; }

                .sf2-act { width:30px; height:30px; border-radius:8px; border:none; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:opacity .15s; }
                .sf2-act:hover { opacity:.72; }
                .sf2-act-edit { background:rgba(39,67,91,.14); color:#27435B; }
                .sf2-act-del  { background:rgba(39,67,91,.18); color:#1C3044; }
                .sf2-act-inv  { background:rgba(39,67,91,.12); color:#27435B; }

                .sf2-pay-btn { border:none; border-radius:8px; padding:5px 16px; font-size:12px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:opacity .15s; background:linear-gradient(135deg,#27435B,#1C3044); color:#fff; white-space:nowrap; }
                .sf2-pay-btn:hover { opacity:.8; }

                .sf2-search-wrap { position:relative; }
                .sf2-search-ico  { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,.6); pointer-events:none; }
                .sf2-search-inp  { padding:8px 14px 8px 35px; border:1.5px solid rgba(255,255,255,.25); border-radius:10px; background:rgba(255,255,255,.15); font-size:13px; color:#fff; width:220px; outline:none; }
                .sf2-search-inp::placeholder { color:rgba(255,255,255,.5); }
                .sf2-search-inp:focus { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.45); }

                .sf2-btn-primary { background:linear-gradient(135deg,#27435B,#1C3044); border:none; color:#fff; border-radius:10px; padding:9px 22px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(39,67,91,.28); transition:opacity .15s; display:flex; align-items:center; gap:7px; }
                .sf2-btn-primary:hover { opacity:.88; }
                .sf2-empty { text-align:center; padding:36px 0; color:#4A6B80; font-size:14px; }

                /* Modals */
                .inv-overlay { position:fixed; inset:0; background:rgba(20,35,50,.6); backdrop-filter:blur(6px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:invFade .2s ease; }
                @keyframes invFade { from{opacity:0} to{opacity:1} }
                .inv-box { background:#fff; border-radius:20px; width:100%; max-width:540px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(28,48,64,.32); animation:invUp .25s ease; overflow:hidden; }
                @keyframes invUp { from{transform:translateY(22px);opacity:0} to{transform:translateY(0);opacity:1} }
                .inv-head { background:linear-gradient(135deg,#1C3044,#27435B); padding:17px 22px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
                .inv-head-left { display:flex; align-items:center; gap:12px; }
                .inv-head-ico { width:40px; height:40px; border-radius:11px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
                .inv-head-title { font-size:15px; font-weight:700; color:#fff; font-family:'Playfair Display',serif; margin:0 0 2px; }
                .inv-head-sub { font-size:11px; color:rgba(255,255,255,.55); margin:0; }
                .inv-close { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:rgba(255,255,255,.75); display:flex; align-items:center; justify-content:center; cursor:pointer; }
                .inv-close:hover { background:rgba(255,255,255,.22); color:#fff; }
                .inv-dl-btn { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.3); color:#fff; border-radius:9px; padding:7px 16px; font-size:12.5px; font-weight:700; cursor:pointer; }
                .inv-dl-btn:hover { background:rgba(255,255,255,.28); }
                .inv-body { overflow-y:auto; padding:20px 22px 24px; flex:1; display:flex; flex-direction:column; gap:16px; }
                .inv-section { background:#f8fafc; border-radius:12px; padding:14px 16px; border:1px solid #e0eef6; }
                .inv-sec-label { font-size:10.5px; font-weight:700; color:#4A6B80; text-transform:uppercase; letter-spacing:.8px; margin-bottom:10px; }
                .inv-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; }
                .inv-dl { font-size:11px; font-weight:700; color:#4A6B80; display:block; margin-bottom:2px; }
                .inv-dv { font-size:13.5px; font-weight:600; color:#1C3044; }
                .inv-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #e8f2f8; font-size:13.5px; color:#2E4F6B; }
                .inv-row:last-of-type { border-bottom:none; }
                .inv-row-total { font-weight:700; font-size:14px; border-top:2px solid #d0e2ee; margin-top:4px; padding-top:10px; }
                .inv-bold { font-weight:700; color:#1C3044; }
                .inv-green { color:#1a6e3e; }
                .inv-progress-wrap { height:7px; background:#d0e2ee; border-radius:6px; overflow:hidden; margin-top:10px; }
                .inv-progress-fill { height:100%; background:linear-gradient(90deg,#3A5E78,#27435B); border-radius:6px; transition:width .5s ease; }

                @media (max-width: 768px) {
                  .sf2-topbar { padding: 14px 16px; flex-direction: column; align-items: flex-start; gap: 12px; }
                  .sf2-content { padding: 16px; }
                  .sf2-kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
                  .sf2-strip { padding: 14px 16px; flex-direction: column; gap: 10px; }
                  .sf2-progress-track { display: none; }
                  .sf2-tbl { font-size: 12px; }
                  .sf2-tbl th, .sf2-tbl td { padding: 9px 8px; }
                  .sf2-panel-head { flex-direction: column; gap: 10px; align-items: flex-start; padding: 12px 16px; }
                  .sf2-search-inp { width: 100%; }
                  .sf2-panel-body { overflow-x: auto; }
                  .sf2-kpi-val { font-size: 17px; }
                  .sf2-title { font-size: 15px; }
                }
                @media (max-width: 480px) {
                  .sf2-kpi-grid { grid-template-columns: 1fr; }
                  .inv-box { border-radius: 16px; }
                  .inv-head { border-radius: 16px 16px 0 0; padding: 14px 16px; }
                  .inv-body { padding: 14px 16px 18px; }
                  .inv-detail-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            <div className="sf2-root sf2-page">

                {/* ── TOP BAR ── */}
                <div className="sf2-topbar">
                    <div className="sf2-brand">
                        <div className="sf2-logo"><GraduationCap size={23} color="#fff" /></div>
                        <div>
                            <p className="sf2-title">Student Fees Dashboard</p>
                            <p className="sf2-sub">Fee Management &amp; Payment Records</p>
                        </div>
                    </div>
                    <div className="sf2-topright">
                        <span className="sf2-datebadge">
                            {new Date().toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <button className="sf2-btn-primary" onClick={() => { setEditData(null); setOpenPopup(true); }}>
                            <UserPlus size={15} /> Add Student
                        </button>
                    </div>
                </div>

                <div className="sf2-content">

                    {/* ── KPI CARDS — all from real data ── */}
                    <div className="sf2-kpi-grid">
                        {[
                            { lbl: "Total Fees", val: `₹${totalFeesAll.toLocaleString("en-IN")}`, Icon: IndianRupee },
                            { lbl: "Amount Paid", val: `₹${totalPaidAll.toLocaleString("en-IN")}`, Icon: CheckCircle },
                            { lbl: "Amount Due", val: `₹${totalDueAll.toLocaleString("en-IN")}`, Icon: AlertCircle },
                            { lbl: "Paid Students", val: `${paidCount} / ${students.length}`, Icon: CalendarDays },
                        ].map((k, i) => (
                            <div key={i} className="sf2-kpi">
                                <div className="sf2-kpi-lbl">{k.lbl}</div>
                                <div className="sf2-kpi-val">{k.val}</div>
                                <div className="sf2-kpi-ico-el"><k.Icon size={18} /></div>
                            </div>
                        ))}
                    </div>

                    {/* ── COLLECTION PROGRESS ── */}
                    <div className="sf2-strip">
                        <div className="sf2-strip-item">
                            <div className="sf2-strip-lbl">Collection Progress</div>
                            <div className="sf2-strip-val">{collectionPct}% Collected</div>
                        </div>
                        <div style={{ flex: 1, margin: "0 32px" }}>
                            <div className="sf2-progress-track">
                                <div className="sf2-progress-fill" style={{ width: `${collectionPct}%` }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                                <span style={{ color: "rgba(255,255,255,.6)", fontSize: 11 }}>₹0</span>
                                <span style={{ color: "rgba(255,255,255,.6)", fontSize: 11 }}>₹{totalFeesAll.toLocaleString("en-IN")}</span>
                            </div>
                        </div>
                        <div className="sf2-strip-item">
                            <div className="sf2-strip-lbl">Remaining</div>
                            <div className="sf2-strip-val" style={{ color: "#A8C8DC" }}>₹{totalDueAll.toLocaleString("en-IN")}</div>
                        </div>
                    </div>

                    {/* ── STUDENT TABLE ── */}
                    <div className="sf2-panel">
                        <div className="sf2-panel-head">
                            <div className="sf2-ph-left">
                                <Users size={15} color="#fff" />
                                <p className="sf2-ph-title">Student List</p>
                                <span className="sf2-ph-badge">{filtered.length} students</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <select
                                    value={courseFilter}
                                    onChange={e => setCourseFilter(e.target.value)}
                                    style={{
                                        fontSize: 12, fontWeight: 600, color: "#1C3044",
                                        background: "#fff", border: "1.5px solid rgba(255,255,255,.35)",
                                        borderRadius: 8, padding: "7px 28px 7px 10px",
                                        fontFamily: "'DM Sans',sans-serif", outline: "none",
                                        cursor: "pointer", appearance: "none",
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2327435B' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
                                        minWidth: 110,
                                    }}
                                >
                                    {courses.map(c => (
                                        <option key={c} value={c}>{c === "All" ? "All Classes" : c}</option>
                                    ))}
                                </select>
                                <div className="sf2-search-wrap">
                                    <Search size={13} className="sf2-search-ico" />
                                    <input className="sf2-search-inp" placeholder="Search name or email…"
                                        value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="sf2-panel-body">
                            <table className="sf2-tbl" style={{ minWidth: "700px" }}>
                                <thead>
                                    <tr>
                                        {["#", "Name", "Email", "Class", "Total Fees", "Paid", "Remaining", "Status", "Actions"].map(h => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={9} className="sf2-empty">No students found</td></tr>
                                    ) : filtered.map((student, idx) => {
                                        const totalFee = Number(student.fees || 0);
                                        const paidAmt = Number(student.paidAmount || 0);
                                        const remaining = Math.max(0, totalFee - paidAmt);
                                        const status = student.paymentStatus || (remaining === 0 && totalFee > 0 ? "PAID" : "UNPAID");
                                        const isPaid = status === "PAID";
                                        const isPartial = status === "PARTIAL";
 
                                        return (
                                            <tr key={student.id}>
                                                <td style={{ color: "#8fa3b1", fontSize: 12 }}>{idx + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{student.name}</td>
                                                <td style={{ color: "#4A6B80", fontSize: 13 }}>{student.email}</td>
                                                <td><span className="sf2-badge sf2-badge-blue">{student.course || "—"}</span></td>
                                                <td style={{ fontWeight: 700, color: "#27435B" }}>₹{totalFee.toLocaleString("en-IN")}</td>
                                                <td style={{ fontWeight: 600, color: "#1a6e3e" }}>
                                                    {paidAmt > 0 ? `₹${paidAmt.toLocaleString("en-IN")}` : <span style={{ color: "#A0B8C8" }}>—</span>}
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: 700, color: remaining > 0 ? "#a33030" : "#1a6e3e" }}>
                                                        ₹{remaining.toLocaleString("en-IN")}
                                                    </span>
                                                </td>
                                                <td>
                                                    {Number(student.paidAmount || 0) >= Number(student.fees || 0) ? (
                                                        <span className="sf2-badge sf2-badge-green">
                                                        <CheckCircle size={12} /> Paid
                                                        </span>
                                                    ) : (
                                                        <button
                                                        className="sf2-pay-btn"
                                                        onClick={() => setPayStudent(student)}
                                                        >
                                                        Pay
                                                        </button>
                                                    )}
                                                    </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        <button className="sf2-act sf2-act-edit" title="Edit" onClick={() => handleEdit(student)}><Pencil size={13} /></button>
                                                        <button className="sf2-act sf2-act-del" title="Delete" onClick={() => handleDelete(student.id)}><Trash2 size={13} /></button>
                                                        <button className="sf2-act sf2-act-inv" title="Invoice" onClick={() => setInvoiceStudent(student)}><FileText size={13} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {/* Modals */}
            <Addstudent open={openPopup} handleClose={() => setOpenPopup(false)} addStudentData={addStudentData} editData={editData} />
            {invoiceStudent && <InvoiceModal student={invoiceStudent} onClose={() => setInvoiceStudent(null)} />}
            {payStudent && <PayModal student={payStudent} onClose={() => setPayStudent(null)} onPaymentDone={handlePaymentDone} />}

        </>
    );
}