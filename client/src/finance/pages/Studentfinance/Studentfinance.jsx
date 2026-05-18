import React, { useState, useEffect } from "react";
import {
    Search, IndianRupee, CalendarDays,
    Pencil, Trash2, UserPlus, GraduationCap,
    AlertCircle, CheckCircle, Clock, CreditCard,
    Users, X, Download, Receipt, FileText
} from "lucide-react";
import Addstudent from "./Addstudent";
import { PayModal } from "../../../finance/pages/Studentfinance/PayModal";
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

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceModal({ student, onClose, schoolName, schoolAddress }) {
    const paidAmount = Number(student.paidAmount || 0);
    const totalFees = Number(student.fees || 0);
    const due = Math.max(0, totalFees - paidAmount);
    const invoiceNo = `INV-${String(student.id || "").slice(-4).padStart(4, "0")}-${new Date().getFullYear()}`;
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    let breakdown = null;
    try { breakdown = student.feeBreakdown ? JSON.parse(student.feeBreakdown) : null; } catch { }

    const handleDownload = () => {
        if (!window.jspdf) { alert("PDF library not loaded yet. Please try again."); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const W = 210, m = 18;

        // ── Header: School name prominently ──
        const headerH = schoolAddress ? 50 : 44;
        doc.setFillColor(28, 48, 68); doc.rect(0, 0, W, headerH, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
        doc.text(schoolName || "Fee Invoice", m, 16);
        doc.setFontSize(9.5); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
        doc.text("Fee Invoice & Payment Receipt", m, 25);
        if (schoolAddress) {
            doc.setFontSize(8.5); doc.setTextColor(140, 175, 200);
            doc.text(schoolAddress, m, 33);
        }
        // Invoice badge (top right)
        doc.setFillColor(255, 255, 255); doc.roundedRect(W - m - 52, 8, 52, 22, 3, 3, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(28, 48, 68);
        doc.text("INVOICE", W - m - 26, 16, { align: "center" });
        doc.setFontSize(10); doc.text(invoiceNo, W - m - 26, 24, { align: "center" });
        // Status bar
        doc.setFillColor(39, 67, 91); doc.rect(0, headerH, W, 10, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
        doc.text(`Date: ${today}`, m, headerH + 7);
        doc.text(`Status: ${due === 0 ? "PAID" : "PARTIALLY PAID"}`, W - m, headerH + 7, { align: "right" });

        // ── Student details box ──
            // Student details
            let y = headerH + 18;
            const hasAddress = !!student.address;
            const boxHeight = hasAddress ? 60 : 48;
            doc.setFillColor(240, 247, 252); doc.roundedRect(m, y - 6, W - m * 2, boxHeight, 3, 3, "F");
            doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
            doc.text("STUDENT DETAILS", m + 4, y);

            // Row 1: Name | Email
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 50, 70);
            doc.text("Name:", m + 4, y + 10);
            doc.setFont("helvetica", "normal"); doc.text(student.name || "N/A", m + 22, y + 10);
            doc.setFont("helvetica", "bold"); doc.text("Email:", W / 2 + 4, y + 10);
            doc.setFont("helvetica", "normal"); doc.text(student.email || "N/A", W / 2 + 22, y + 10);

            // Row 2: Course | Phone
            doc.setFont("helvetica", "bold"); doc.text("Course:", m + 4, y + 20);
            doc.setFont("helvetica", "normal"); doc.text(student.course || "N/A", m + 22, y + 20);
            doc.setFont("helvetica", "bold"); doc.text("Phone:", W / 2 + 4, y + 20);
            doc.setFont("helvetica", "normal"); doc.text(student.phone || "N/A", W / 2 + 22, y + 20);

            // Row 3: Address (full width, only if present)
            if (hasAddress) {
            doc.setFont("helvetica", "bold"); doc.text("Address:", m + 4, y + 30);
            doc.setFont("helvetica", "normal");
            const addrLines = doc.splitTextToSize(student.address, W - m * 2 - 34);
            doc.text(addrLines, m + 22, y + 30);
            }

            y += boxHeight + 12;

        // ── Fee Summary table ──
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
        doc.text(schoolName ? `${schoolName} · System-generated invoice. No signature required.` : "This is a system-generated invoice. No signature required.", W / 2, y + 9, { align: "center" });
        doc.save(`Invoice_${student.name?.replace(/\s+/g, "_") || "Student"}_${invoiceNo}.pdf`);
    };

    return (
        <div className="inv-overlay" onClick={onClose}>
            <div className="inv-box" onClick={e => e.stopPropagation()}>
                <div className="inv-head">
                    <div className="inv-head-left">
                        <div className="inv-head-ico"><Receipt size={18} color="#fff" /></div>
                        <div>
                            <div className="inv-head-title">{schoolName || "Student Invoice"}</div>
                            <div className="inv-head-sub">{invoiceNo} · {today}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button className="inv-dl-btn" onClick={handleDownload}><Download size={14} /> Download PDF</button>
                        <button className="inv-close" onClick={onClose}><X size={17} /></button>
                    </div>
                </div>
                <div className="inv-body">
                    {/* School info banner */}
                    {schoolName && (
                        <div style={{ background: "linear-gradient(135deg,#f0f7fc,#e4f0f8)", border: "1px solid #c8dff0", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".7px" }}>Issued By</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1C3044" }}>{schoolName}</span>
                            {schoolAddress && <span style={{ fontSize: 12, color: "#4A6B80" }}>{schoolAddress}</span>}
                        </div>
                    )}
                    <div className="inv-section">
                        <div className="inv-sec-label">Student Details</div>
                        <div className="inv-detail-grid">
                            <div><span className="inv-dl">Name</span><span className="inv-dv">{student.name}</span></div>
                            <div><span className="inv-dl">Email</span><span className="inv-dv">{student.email}</span></div>
                            <div><span className="inv-dl">Course</span><span className="inv-dv">{student.course}</span></div>
                            <div><span className="inv-dl">Student ID</span><span className="inv-dv">#{student.id}</span></div>
                            {student.phone && <div><span className="inv-dl">Phone</span><span className="inv-dv">{student.phone}</span></div>}
                        </div>
                        {student.address && (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e0eef6" }}>
                                <span className="inv-dl">Address</span>
                                <span className="inv-dv" style={{ display: "block", marginTop: 2, lineHeight: 1.5 }}>{student.address}</span>
                            </div>
                        )}
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
// WHATSAPP CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────
function WhatsAppConfirmModal({ student, onClose, onConfirm }) {
    return (
        <div className="inv-overlay" onClick={onClose}>
            <div
                style={{
                    background: "#fff", borderRadius: 16, width: "100%", maxWidth: 340,
                    overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,.22)",
                    animation: "invUp .25s ease"
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg,#1C3044,#27435B)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.14)", border: "1.5px solid rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FaWhatsapp size={18} color="#fff" />
                    </div>
                    <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>Send WhatsApp</div>
                        <div style={{ color: "rgba(255,255,255,.6)", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Fee reminder to parent</div>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: "24px 22px 8px", textAlign: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e7f7ee", border: "2px solid #b2dfc6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <FaWhatsapp size={22} color="#25D366" />
                    </div>
                    <p style={{ fontSize: 14, color: "#1C3044", margin: "0 0 8px", fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                        Send fee reminder?
                    </p>
                    <p style={{ fontSize: 13, color: "#4A6B80", margin: 0, lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif" }}>
                        A WhatsApp message will be sent to <strong style={{ color: "#27435B" }}>{student.name}</strong>'s parent about the pending fee.
                    </p>
                </div>

                {/* Footer */}
                <div style={{ padding: "20px 22px 22px", display: "flex", gap: 10 }}>
                    <button
                        onClick={onClose}
                        style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #d0d5dd", background: "#fff", fontSize: 13, fontWeight: 600, color: "#4A6B80", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#25D366", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "'DM Sans',sans-serif" }}
                    >
                        <FaWhatsapp size={14} /> Send
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReceiptConfirmModal({ student, onClose, onConfirm }) {
    return (
        <div className="inv-overlay" onClick={onClose}>
            <div
                style={{
                    background: "#fff",
                    borderRadius: 16,
                    width: "100%",
                    maxWidth: 340,
                    overflow: "hidden",
                    boxShadow: "0 16px 40px rgba(0,0,0,.22)",
                    animation: "invUp .25s ease"
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        background: "linear-gradient(135deg,#1C3044,#27435B)",
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                    }}
                >
                    <div
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: "rgba(255,255,255,.14)",
                            border: "1.5px solid rgba(255,255,255,.22)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <Receipt size={18} color="#fff" />
                    </div>

                    <div>
                        <div
                            style={{
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 15,
                                fontFamily: "'DM Sans',sans-serif"
                            }}
                        >
                            Send Fee Receipt
                        </div>

                        <div
                            style={{
                                color: "rgba(255,255,255,.6)",
                                fontSize: 12,
                                fontFamily: "'DM Sans',sans-serif"
                            }}
                        >
                            WhatsApp PDF Receipt
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: "24px 22px 8px", textAlign: "center" }}>
                    <div
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            background: "#edf4ff",
                            border: "2px solid #c7d7fe",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 14px"
                        }}
                    >
                        <Receipt size={22} color="#27435B" />
                    </div>

                    <p
                        style={{
                            fontSize: 14,
                            color: "#1C3044",
                            margin: "0 0 8px",
                            fontWeight: 700,
                            fontFamily: "'DM Sans',sans-serif"
                        }}
                    >
                        Send fee receipt PDF?
                    </p>

                    <p
                        style={{
                            fontSize: 13,
                            color: "#4A6B80",
                            margin: 0,
                            lineHeight: 1.6,
                            fontFamily: "'DM Sans',sans-serif"
                        }}
                    >
                        Receipt PDF will be sent to{" "}
                        <strong style={{ color: "#27435B" }}>
                            {student.name}
                        </strong>'s parent on WhatsApp.
                    </p>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "20px 22px 22px",
                        display: "flex",
                        gap: 10
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: 10,
                            border: "1.5px solid #d0d5dd",
                            background: "#fff",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#4A6B80",
                            cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif"
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: 10,
                            border: "none",
                            background: "#27435B",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 7,
                            fontFamily: "'DM Sans',sans-serif"
                        }}
                    >
                        <Receipt size={14} />
                        Send PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentFeesPage() {

    const isPremium = getPlan() === "Premium";
    const [students, setStudents] = useState([]);
    const [openPopup, setOpenPopup] = useState(false);
    const [editData, setEditData] = useState(null);
    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState("All");
    const [invoiceStudent, setInvoiceStudent] = useState(null);
    const [payStudent, setPayStudent] = useState(null);
    const [waStudent, setWaStudent] = useState(null);
    const [schoolInfo, setSchoolInfo] = useState({ name: "", address: "", city: "", phone: "" });
    const [receiptStudent, setReceiptStudent] = useState(null);


    useEffect(() => {
        if (!window.jspdf) {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            s.async = true;
            document.head.appendChild(s);
        }
    }, []);

    // Fetch school info from backend (auth token contains schoolId, backend returns name/address)
    useEffect(() => {
        const fetchSchool = async () => {
            try {
                const auth = JSON.parse(localStorage.getItem("auth"));
                const token = auth?.token;
                const res = await fetch(`${API_URL}/api/finance/mySchool`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSchoolInfo({
                        name: data.name || "",
                        address: data.address || "",
                        city: data.city || "",
                        phone: data.phone || "",
                    });
                }
            } catch (err) {
                console.error("School fetch error:", err);
            }
        };
        fetchSchool();
    }, []);

    const fetchStudents = async () => {
        try {
            const auth = JSON.parse(localStorage.getItem("auth"));
            const token = auth?.token;
            const res = await fetch(`${API_URL}/api/finance/getStudentFinance`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setStudents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };
    useEffect(() => { fetchStudents(); }, []);

    const totalFeesAll = students.reduce((a, s) => a + Number(s.fees || 0), 0);
    const totalPaidAll = students.reduce((a, s) => a + Number(s.paidAmount || 0), 0);
    const totalDueAll = Math.max(0, totalFeesAll - totalPaidAll);
    const paidCount = students.filter(s => s.paymentStatus === "PAID").length;
    const collectionPct = totalFeesAll > 0 ? Math.round((totalPaidAll / totalFeesAll) * 100) : 0;

    const addStudentData = (newStudent) => {
        setStudents(prev => {
            const exists = prev.some(s => s.id === newStudent.id);
            if (exists) return prev.map(s => s.id === newStudent.id ? newStudent : s);
            return [newStudent, ...prev];
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this student record?")) return;
        const auth = JSON.parse(localStorage.getItem("auth"));
        const token = auth?.token;
        await fetch(`${API_URL}/api/finance/deleteStudentFinance/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchStudents();
    };

    const handleEdit = (student) => { setEditData(student); setOpenPopup(true); };

    const handlePaymentDone = (id, newPaidAmount, newStatus) => {
        setStudents(prev => prev.map(s =>
            s.id === id ? { ...s, paidAmount: newPaidAmount, paymentStatus: newStatus } : s
        ));
        fetchStudents();
    };

    const handleSendWhatsApp = async () => {
        if (!waStudent) return;
        try {
            const auth = JSON.parse(localStorage.getItem("auth"));
            const token = auth?.token;
            const res = await fetch(`${API_URL}/api/finance/sendFeeReminder/${waStudent.id}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            alert(data.message);
        } catch (err) {
            console.error(err);
            alert("Failed to send WhatsApp message.");
        }
        setWaStudent(null);
    };

const handleSendReceipt = async (student) => {
  try {
    // Step 1: generate PDF as a Blob (same logic as handleDownload)
    if (!window.jspdf) {
      alert("PDF library not loaded yet. Please try again in a moment.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const W = 210, m = 18;
    const paidAmount = Number(student.paidAmount || 0);
    const totalFees  = Number(student.fees || 0);
    const due = Math.max(0, totalFees - paidAmount);
    const invoiceNo = `INV-${String(student.id || "").slice(-4).padStart(4, "0")}-${new Date().getFullYear()}`;
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    let breakdown = null;
    try { breakdown = student.feeBreakdown ? JSON.parse(student.feeBreakdown) : null; } catch {}

    // Header
    const schoolName = schoolInfo.name;
    const schoolAddress = `${schoolInfo.address || ""}${schoolInfo.city ? ", " + schoolInfo.city : ""}`;
    const headerH = schoolAddress ? 50 : 44;
    doc.setFillColor(28, 48, 68); doc.rect(0, 0, W, headerH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
    doc.text(schoolName || "Fee Invoice", m, 16);
    doc.setFontSize(9.5); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
    doc.text("Fee Invoice & Payment Receipt", m, 25);
    if (schoolAddress) {
      doc.setFontSize(8.5); doc.setTextColor(140, 175, 200);
      doc.text(schoolAddress, m, 33);
    }
    doc.setFillColor(255, 255, 255); doc.roundedRect(W - m - 52, 8, 52, 22, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(28, 48, 68);
    doc.text("INVOICE", W - m - 26, 16, { align: "center" });
    doc.setFontSize(10); doc.text(invoiceNo, W - m - 26, 24, { align: "center" });
    doc.setFillColor(39, 67, 91); doc.rect(0, headerH, W, 10, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
    doc.text(`Date: ${today}`, m, headerH + 7);
    doc.text(`Status: ${due === 0 ? "PAID" : "PARTIALLY PAID"}`, W - m, headerH + 7, { align: "right" });
 
        // Student details
        let y = headerH + 18;
        const hasAddress = !!student.address;
        const boxHeight = hasAddress ? 60 : 48;
        doc.setFillColor(240, 247, 252); doc.roundedRect(m, y - 6, W - m * 2, boxHeight, 3, 3, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
        doc.text("STUDENT DETAILS", m + 4, y);

        // Row 1: Name | Email
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 50, 70);
        doc.text("Name:", m + 4, y + 10);
        doc.setFont("helvetica", "normal"); doc.text(student.name || "N/A", m + 22, y + 10);
        doc.setFont("helvetica", "bold"); doc.text("Email:", W / 2 + 4, y + 10);
        doc.setFont("helvetica", "normal"); doc.text(student.email || "N/A", W / 2 + 22, y + 10);

        // Row 2: Course | Phone
        doc.setFont("helvetica", "bold"); doc.text("Course:", m + 4, y + 20);
        doc.setFont("helvetica", "normal"); doc.text(student.course || "N/A", m + 22, y + 20);
        doc.setFont("helvetica", "bold"); doc.text("Phone:", W / 2 + 4, y + 20);
        doc.setFont("helvetica", "normal"); doc.text(student.phone || "N/A", W / 2 + 22, y + 20);

        // Row 3: Address (full width, only if present)
        if (hasAddress) {
        doc.setFont("helvetica", "bold"); doc.text("Address:", m + 4, y + 30);
        doc.setFont("helvetica", "normal");
        const addrLines = doc.splitTextToSize(student.address, W - m * 2 - 34);
        doc.text(addrLines, m + 22, y + 30);
        }

        y += boxHeight + 12;

    // Fee table
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
    doc.text("FEE SUMMARY", m, y); y += 5;
    doc.setFillColor(28, 48, 68); doc.rect(m, y, W - m * 2, 9, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text("Description", m + 4, y + 6); doc.text("Amount (INR)", m + 145, y + 6); y += 9;
    const rows = breakdown
      ? Object.entries(breakdown).filter(([k, v]) => k !== "customFees" && Number(v) > 0)
          .map(([k, v]) => [k.replace(/Fee$/, "").replace(/([A-Z])/g, " $1").trim(), v])
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
    doc.text(`${schoolName || "School"} · System-generated invoice. No signature required.`, W / 2, y + 9, { align: "center" });

    // Step 2: Get PDF as ArrayBuffer and upload to R2
    const pdfArrayBuffer = doc.output("arraybuffer");

    const auth = JSON.parse(localStorage.getItem("auth"));
    const token = auth?.token;

    const uploadRes = await fetch(`${API_URL}/api/finance/uploadFeeReceipt/${student.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        Authorization: `Bearer ${token}`,
      },
      body: pdfArrayBuffer,
    });

    const uploadData = await uploadRes.json();
    if (!uploadData.success || !uploadData.pdfUrl) {
      alert("Failed to upload receipt PDF: " + (uploadData.message || "unknown error"));
      return;
    }

    const pdfUrl = uploadData.pdfUrl;
    console.log("Uploaded PDF URL:", pdfUrl);

    // Step 3: Send WhatsApp with the real URL
    const res = await fetch(`${API_URL}/api/finance/sendFeeReceipt/${student.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pdfUrl }),
    });

    const data = await res.json();
    if (data.success) {
      alert("✅ WhatsApp receipt sent successfully!");
    } else {
      alert(data.message || "Failed to send");
    }

  } catch (err) {
    console.error(err);
    alert("Failed to send receipt: " + err.message);
  }
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

                * { box-sizing: border-box; }
                .sf2-font, .sf2-font input, .sf2-font select, .sf2-font button { font-family: 'DM Sans', sans-serif; }

                /* ── Keyframes ── */
                @keyframes invFade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes invUp   { from { transform: translateY(22px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

                /* ── Modal overlay & box ── */
                .inv-overlay { position: fixed; inset: 0; background: rgba(20,35,50,.6); backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; animation: invFade .2s ease; }
                .inv-box     { background: #fff; border-radius: 20px; width: 100%; max-width: 540px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(28,48,64,.32); animation: invUp .25s ease; overflow: hidden; }
                .inv-head    { background: linear-gradient(135deg,#1C3044,#27435B); padding: 17px 22px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
                .inv-head-left  { display: flex; align-items: center; gap: 12px; }
                .inv-head-ico   { width: 40px; height: 40px; border-radius: 11px; background: rgba(255,255,255,.14); border: 1.5px solid rgba(255,255,255,.22); display: flex; align-items: center; justify-content: center; }
                .inv-head-title { font-size: 15px; font-weight: 700; color: #fff; font-family: 'Playfair Display', serif; margin: 0 0 2px; }
                .inv-head-sub   { font-size: 11px; color: rgba(255,255,255,.55); margin: 0; }
                .inv-close      { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); color: rgba(255,255,255,.75); display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .inv-close:hover { background: rgba(255,255,255,.22); color: #fff; }
                .inv-dl-btn     { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3); color: #fff; border-radius: 9px; padding: 7px 14px; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
                .inv-dl-btn:hover { background: rgba(255,255,255,.28); }
                .inv-body        { overflow-y: auto; padding: 20px 22px 24px; flex: 1; display: flex; flex-direction: column; gap: 16px; }
                .inv-section     { background: #f8fafc; border-radius: 12px; padding: 14px 16px; border: 1px solid #e0eef6; }
                .inv-sec-label   { font-size: 10.5px; font-weight: 700; color: #4A6B80; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 10px; }
                .inv-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
                .inv-dl          { font-size: 11px; font-weight: 700; color: #4A6B80; display: block; margin-bottom: 2px; }
                .inv-dv          { font-size: 13.5px; font-weight: 600; color: #1C3044; }
                .inv-row         { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e8f2f8; font-size: 13.5px; color: #2E4F6B; }
                .inv-row:last-of-type { border-bottom: none; }
                .inv-row-total   { font-weight: 700; font-size: 14px; border-top: 2px solid #d0e2ee; margin-top: 4px; padding-top: 10px; }
                .inv-bold        { font-weight: 700; color: #1C3044; }
                .inv-green       { color: #1a6e3e; }
                .inv-progress-wrap { height: 7px; background: #d0e2ee; border-radius: 6px; overflow: hidden; margin-top: 10px; }
                .inv-progress-fill { height: 100%; background: linear-gradient(90deg,#3A5E78,#27435B); border-radius: 6px; transition: width .5s ease; }

                /* ── Table ── */
                .sf2-tbl { width: 100%; border-collapse: collapse; font-size: 13.5px; }
                .sf2-tbl th { text-align: left; padding: 14px 12px 10px; border-bottom: 2px solid #D0E2EE; color: #4A6B80; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; white-space: nowrap; }
                .sf2-tbl td { padding: 12px; border-bottom: 1px solid #E0EEF6; color: #1C3044; vertical-align: middle; }
                .sf2-tbl tr:last-child td { border-bottom: none; }
                .sf2-tbl tbody tr:hover td { background: #edf4f9; }

                /* ── Badges ── */
                .sf2-badge        { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
                .sf2-badge-green  { color: #1a6e3e; background: #edf7f1; border: 1px solid #b2dfc6; }
                .sf2-badge-red    { color: #a33030; background: #fdf0f0; border: 1px solid #f5c2c2; }
                .sf2-badge-blue   { color: #27435B; background: rgba(39,67,91,.12); }
                .sf2-badge-orange { color: #92400e; background: #fef3c7; border: 1px solid #fde68a; }

                /* ── Action buttons ── */
                .sf2-act       { width: 30px; height: 30px; border-radius: 8px; border: none; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; flex-shrink: 0; }
                .sf2-act:hover { opacity: .75; }
                .sf2-act-edit  { background: rgba(39,67,91,.14); color: #27435B; }
                .sf2-act-del   { background: rgba(39,67,91,.18); color: #1C3044; }
                .sf2-act-inv   { background: rgba(39,67,91,.12); color: #27435B; }
                .sf2-act-wa    { background: #e7f7ee; color: #25D366; border: 1px solid #b2dfc6; }
                .sf2-act-wa:hover { background: #25D366 !important; color: #fff !important; opacity: 1 !important; }

                /* ── Pay button ── */
                .sf2-pay-btn       { border: none; border-radius: 8px; padding: 5px 14px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity .15s; background: linear-gradient(135deg,#27435B,#1C3044); color: #fff; white-space: nowrap; }
                .sf2-pay-btn:hover { opacity: .8; }

                /* ── Search ── */
                .sf2-search-wrap { position: relative; width: 100%; }
                .sf2-search-ico  { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,.6); pointer-events: none; }
                .sf2-search-inp  { padding: 8px 14px 8px 34px; border: 1.5px solid rgba(255,255,255,.25); border-radius: 10px; background: rgba(255,255,255,.15); font-size: 13px; color: #fff; width: 100%; outline: none; }
                .sf2-search-inp::placeholder { color: rgba(255,255,255,.5); }
                .sf2-search-inp:focus { background: rgba(255,255,255,.22); border-color: rgba(255,255,255,.45); }

                /* ── Progress bar ── */
                .sf2-progress-track { height: 12px; background: rgba(255,255,255,.2); border-radius: 8px; overflow: hidden; }
                .sf2-progress-fill  { height: 100%; border-radius: 8px; background: linear-gradient(90deg,#88BDF2,#BDDDFC); transition: width .6s ease; }

                /* ── Mobile tweaks ── */
                @media (max-width: 480px) {
                    .inv-box  { border-radius: 16px; }
                    .inv-head { border-radius: 16px 16px 0 0; padding: 13px 15px; }
                    .inv-body { padding: 14px 15px 18px; }
                    .inv-detail-grid { grid-template-columns: 1fr; }
                    .sf2-tbl  { font-size: 12px; }
                    .sf2-tbl th, .sf2-tbl td { padding: 9px 8px; }
                }
            `}</style>

            {/* ════════════════════════════════════
                PAGE WRAPPER
            ════════════════════════════════════ */}
            <div
                className="sf2-font min-h-screen"
                style={{ background: "linear-gradient(150deg,#C5D9E8 0%,#B2CCDC 45%,#A0BBCC 100%)" }}
            >

                {/* ── TOP BAR ── */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4"
                    style={{ background: "linear-gradient(135deg,#1C3044,#27435B)", boxShadow: "0 4px 24px rgba(39,67,91,.38)" }}
                >
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center rounded-xl flex-shrink-0"
                            style={{ width: 44, height: 44, background: "rgba(255,255,255,.14)", border: "1.5px solid rgba(255,255,255,.22)" }}
                        >
                            <GraduationCap size={22} color="#fff" />
                        </div>
                        <div>
                            <p className="m-0 font-bold text-white" style={{ fontSize: 18, fontFamily: "'Playfair Display',serif" }}>
                                Student Fees Dashboard
                            </p>
                            <p className="m-0 text-xs" style={{ color: "rgba(255,255,255,.6)" }}>
                                Fee Management &amp; Payment Records
                            </p>
                        </div>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{ color: "rgba(255,255,255,.7)", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", whiteSpace: "nowrap" }}
                        >
                            {new Date().toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <button
                            className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-xl border-none cursor-pointer transition-opacity hover:opacity-90 flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#3A5E78,#1C3044)", boxShadow: "0 3px 12px rgba(39,67,91,.28)" }}
                            onClick={() => { setEditData(null); setOpenPopup(true); }}
                        >
                            <UserPlus size={15} /> Add Student
                        </button>
                    </div>
                </div>

                {/* ── MAIN CONTENT ── */}
                <div className="px-3 sm:px-5 lg:px-8 py-5 sm:py-6">

                    {/* ── KPI CARDS ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        {[
                            { lbl: "Total Fees",    val: `₹${totalFeesAll.toLocaleString("en-IN")}`, Icon: IndianRupee },
                            { lbl: "Amount Paid",   val: `₹${totalPaidAll.toLocaleString("en-IN")}`, Icon: CheckCircle },
                            { lbl: "Amount Due",    val: `₹${totalDueAll.toLocaleString("en-IN")}`,  Icon: AlertCircle },
                            { lbl: "Paid Students", val: `${paidCount} / ${students.length}`,         Icon: CalendarDays },
                        ].map((k, i) => (
                            <div
                                key={i}
                                className="relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-transform hover:-translate-y-0.5"
                                style={{ background: "rgba(255,255,255,.93)", boxShadow: "0 2px 16px rgba(39,67,91,.1)", borderTop: "4px solid #27435B" }}
                            >
                                <div className="text-xs font-bold uppercase mb-1.5" style={{ color: "#4A6B80", letterSpacing: ".9px" }}>
                                    {k.lbl}
                                </div>
                                <div className="font-bold text-xl sm:text-2xl" style={{ color: "#1C3044" }}>
                                    {k.val}
                                </div>
                                <div
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: "rgba(39,67,91,.12)", color: "#27435B" }}
                                >
                                    <k.Icon size={17} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── COLLECTION PROGRESS STRIP ── */}
                    <div
                        className="rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center gap-4"
                        style={{ background: "linear-gradient(135deg,#27435B,#1C3044)" }}
                    >
                        {/* Left label */}
                        <div className="flex-shrink-0 text-center md:text-left">
                            <div className="text-xs font-bold uppercase" style={{ color: "rgba(255,255,255,.65)", letterSpacing: ".8px" }}>
                                Collection Progress
                            </div>
                            <div className="text-white text-xl font-bold mt-1">{collectionPct}% Collected</div>
                        </div>

                        {/* Progress bar */}
                        <div className="flex-1 w-full">
                            <div className="sf2-progress-track">
                                <div className="sf2-progress-fill" style={{ width: `${collectionPct}%` }} />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className="text-xs" style={{ color: "rgba(255,255,255,.6)" }}>₹0</span>
                                <span className="text-xs" style={{ color: "rgba(255,255,255,.6)" }}>
                                    ₹{totalFeesAll.toLocaleString("en-IN")}
                                </span>
                            </div>
                        </div>

                        {/* Right label */}
                        <div className="flex-shrink-0 text-center md:text-right">
                            <div className="text-xs font-bold uppercase" style={{ color: "rgba(255,255,255,.65)", letterSpacing: ".8px" }}>
                                Remaining
                            </div>
                            <div className="text-xl font-bold mt-1" style={{ color: "#A8C8DC" }}>
                                ₹{totalDueAll.toLocaleString("en-IN")}
                            </div>
                        </div>
                    </div>

                    {/* ── STUDENT TABLE PANEL ── */}
                    <div
                        className="rounded-2xl overflow-hidden mb-5"
                        style={{ background: "rgba(255,255,255,.93)", boxShadow: "0 2px 14px rgba(39,67,91,.09)" }}
                    >
                        {/* Panel Header */}
                        <div
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5"
                            style={{ background: "linear-gradient(135deg,#27435B,#1C3044)" }}
                        >
                            {/* Left: title + count */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Users size={15} color="#fff" />
                                <p className="text-white font-bold m-0" style={{ fontSize: 14.5 }}>Student List</p>
                                <span
                                    className="text-white text-xs font-semibold px-3 py-0.5 rounded-full"
                                    style={{ background: "rgba(255,255,255,.2)" }}
                                >
                                    {filtered.length} students
                                </span>
                            </div>

                            {/* Right: filter + search */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
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
                                        minWidth: 110, flexShrink: 0,
                                    }}
                                >
                                    {courses.map(c => (
                                        <option key={c} value={c}>{c === "All" ? "All Classes" : c}</option>
                                    ))}
                                </select>

                                <div className="sf2-search-wrap flex-1" style={{ minWidth: 0 }}>
                                    <Search size={13} className="sf2-search-ico" />
                                    <input
                                        className="sf2-search-inp"
                                        placeholder="Search name or email…"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scrollable table */}
                        <div className="overflow-x-auto w-full">
                            <div style={{ padding: "4px 16px 20px" }}>
                                <table className="sf2-tbl" style={{ minWidth: 700 }}>
                                    <thead>
                                        <tr>
                                            {["#", "Name", "Email", "Class", "Total Fees", "Paid", "Remaining", "Status", "Actions"].map(h => (
                                                <th key={h}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} style={{ textAlign: "center", padding: "36px 0", color: "#4A6B80", fontSize: 14 }}>
                                                    No students found
                                                </td>
                                            </tr>
                                        ) : filtered.map((student, idx) => {
                                            const totalFee = Number(student.fees || 0);
                                            const paidAmt  = Number(student.paidAmount || 0);
                                            const remaining = Math.max(0, totalFee - paidAmt);

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
                                                        {paidAmt >= totalFee && totalFee > 0 ? (
                                                            <span className="sf2-badge sf2-badge-green">
                                                                <CheckCircle size={12} /> Paid
                                                            </span>
                                                        ) : (
                                                            <button className="sf2-pay-btn" onClick={() => setPayStudent(student)}>
                                                                Pay
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            <button className="sf2-act sf2-act-edit" title="Edit" onClick={() => handleEdit(student)}>
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button className="sf2-act sf2-act-del" title="Delete" onClick={() => handleDelete(student.id)}>
                                                                <Trash2 size={13} />
                                                            </button>
                                                            <button className="sf2-act sf2-act-inv" title="Invoice" onClick={() => setInvoiceStudent(student)}>
                                                                <FileText size={13} />
                                                            </button>
                                                            {isPremium && (
                                                                <button
                                                                    className="sf2-act sf2-act-wa"
                                                                    title="Send Fees Reminder to Parent"
                                                                    onClick={() => setWaStudent(student)}
                                                                >
                                                                    <FaWhatsapp size={13} />
                                                                </button>
                                                            )}
                                                            {isPremium && (
                                                                <button
                                                                    className="sf2-act sf2-act-inv"
                                                                    title="Send Receipt PDF"
                                                                    onClick={() => setReceiptStudent(student)}
                                                                    style={{
                                                                        background: "#eef2ff",
                                                                        color: "#4f46e5",
                                                                        border: "1px solid #c7d2fe"
                                                                    }}
                                                                >
                                                                    <FaWhatsapp size={13} />
                                                                </button>
                                                            )}
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
            </div>

            {/* ── MODALS ── */}
            <Addstudent open={openPopup} handleClose={() => setOpenPopup(false)} addStudentData={addStudentData} editData={editData} />
            {invoiceStudent && <InvoiceModal student={invoiceStudent} onClose={() => setInvoiceStudent(null)} schoolName={schoolInfo.name} schoolAddress={`${schoolInfo.address || ""}${schoolInfo.city ? ", " + schoolInfo.city : ""}`} />}
            {payStudent && <PayModal student={payStudent} onClose={() => setPayStudent(null)} onPaymentDone={handlePaymentDone} />}
            {waStudent && <WhatsAppConfirmModal student={waStudent} onClose={() => setWaStudent(null)} onConfirm={handleSendWhatsApp} />}
            {receiptStudent && (
                <ReceiptConfirmModal
                    student={receiptStudent}
                    onClose={() => setReceiptStudent(null)}
                    onConfirm={() => {
                        handleSendReceipt(receiptStudent);
                        setReceiptStudent(null);
                    }}
                />
            )}
        </>
    );
}