import React, { useState, useEffect } from "react";
import {
    Search, IndianRupee, ReceiptText, CalendarDays,
    Pencil, Trash2, UserPlus, GraduationCap, TrendingUp,
    AlertCircle, CheckCircle, Clock, CreditCard, BookOpen,
    Bus, FlaskConical, FileText, Users, X, Download, Receipt
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import Addstudent from "./Addstudent";

// ── STATIC DISPLAY DATA (unchanged) ──────────────────────────────────────────
const summary = { total: 60000, paid: 40000, due: 20000, nextDue: "15 Mar 2026" };

const payments = [
    { date: "01 Jan 2026", mode: "UPI", amount: 20000 },
    { date: "01 Feb 2026", mode: "Net Banking", amount: 20000 },
];

// ── INVOICE MODAL ─────────────────────────────────────────────────────────────
function InvoiceModal({ student, onClose }) {
    const invoiceNo = `INV-${String(student.id || "").slice(-4).padStart(4, "0")}-${new Date().getFullYear()}`;
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const totalFees = Number(student.fees || 0);
    const paid = payments.reduce((a, p) => a + p.amount, 0);
    const due = Math.max(0, totalFees - paid);

    const handleDownload = () => {
        if (!window.jspdf) {
            alert("PDF library not loaded yet. Please try again in a moment.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const W = 210, margin = 18;

        doc.setFillColor(28, 48, 68);
        doc.rect(0, 0, W, 40, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("Invoice", margin, 17);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 205, 220);
        doc.text("Fee Invoice & Payment Receipt", margin, 25);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(W - margin - 52, 8, 52, 22, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(28, 48, 68);
        doc.text("INVOICE", W - margin - 26, 16, { align: "center" });
        doc.setFontSize(10);
        doc.text(invoiceNo, W - margin - 26, 24, { align: "center" });
        doc.setFillColor(39, 67, 91);
        doc.rect(0, 40, W, 10, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 205, 220);
        doc.text(`Date: ${today}`, margin, 47);
        doc.text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, W / 2, 47, { align: "center" });
        doc.text("Status: " + (due === 0 ? "PAID" : "PARTIALLY PAID"), W - margin, 47, { align: "right" });

        let y = 62;
        doc.setFillColor(240, 247, 252);
        doc.roundedRect(margin, y - 6, W - margin * 2, 36, 3, 3, "F");
        doc.setDrawColor(200, 220, 235);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, y - 6, W - margin * 2, 36, 3, 3, "S");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
        doc.text("STUDENT DETAILS", margin + 4, y);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 50, 70);
        const col2 = W / 2 + 4;
        doc.setFont("helvetica", "bold"); doc.text("Name:", margin + 4, y + 8);
        doc.setFont("helvetica", "normal"); doc.text(student.name || "N/A", margin + 24, y + 8);
        doc.setFont("helvetica", "bold"); doc.text("Email:", col2, y + 8);
        doc.setFont("helvetica", "normal"); doc.text(student.email || "N/A", col2 + 20, y + 8);
        doc.setFont("helvetica", "bold"); doc.text("Course:", margin + 4, y + 17);
        doc.setFont("helvetica", "normal"); doc.text(student.course || "N/A", margin + 24, y + 17);
        doc.setFont("helvetica", "bold"); doc.text("Student ID:", col2, y + 17);
        doc.setFont("helvetica", "normal"); doc.text(String(student.id || "N/A"), col2 + 26, y + 17);

        y += 46;
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
        doc.text("FEE SUMMARY", margin, y);
        y += 5;
        doc.setFillColor(28, 48, 68);
        doc.rect(margin, y, W - margin * 2, 9, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
        const cols = [margin + 4, margin + 70, margin + 115, margin + 145];
        doc.text("Description", cols[0], y + 6);
        doc.text("Category", cols[1], y + 6);
        doc.text("Due Date", cols[2], y + 6);
        doc.text("Amount (INR)", cols[3], y + 6);
        y += 9;
        doc.setFillColor(248, 252, 255); doc.rect(margin, y, W - margin * 2, 9, "F");
        doc.setDrawColor(210, 228, 240); doc.setLineWidth(0.3); doc.line(margin, y + 9, W - margin, y + 9);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 50, 70);
        doc.text("Annual Tuition Fee", cols[0], y + 6);
        doc.text(student.course || "General", cols[1], y + 6);
        doc.text(summary.nextDue, cols[2], y + 6);
        doc.setFont("helvetica", "bold");
        doc.text(`Rs. ${totalFees.toLocaleString("en-IN")}`, cols[3], y + 6);

        y += 20;
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
        doc.text("PAYMENT HISTORY", margin, y);
        y += 5;
        doc.setFillColor(28, 48, 68); doc.rect(margin, y, W - margin * 2, 9, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
        doc.text("Date", margin + 4, y + 6);
        doc.text("Payment Mode", margin + 45, y + 6);
        doc.text("Reference", margin + 100, y + 6);
        doc.text("Amount (INR)", margin + 145, y + 6);
        payments.forEach((p, i) => {
            y += 9;
            doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 252 : 255, 255);
            doc.rect(margin, y, W - margin * 2, 9, "F");
            doc.setDrawColor(210, 228, 240); doc.line(margin, y + 9, W - margin, y + 9);
            doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 50, 70);
            doc.text(p.date, margin + 4, y + 6);
            doc.text(p.mode, margin + 45, y + 6);
            doc.text(`TXN${String(i + 1).padStart(6, "0")}`, margin + 100, y + 6);
            doc.setFont("helvetica", "bold");
            doc.text(`Rs. ${p.amount.toLocaleString("en-IN")}`, margin + 145, y + 6);
        });

        y += 18;
        const boxX = W - margin - 80;
        doc.setFillColor(240, 247, 252); doc.roundedRect(boxX, y, 80, 34, 3, 3, "F");
        doc.setDrawColor(180, 210, 228); doc.roundedRect(boxX, y, 80, 34, 3, 3, "S");
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 100, 120);
        doc.text("Total Fees:", boxX + 4, y + 9);
        doc.setFont("helvetica", "bold"); doc.setTextColor(28, 48, 68);
        doc.text(`Rs. ${totalFees.toLocaleString("en-IN")}`, boxX + 78, y + 9, { align: "right" });
        doc.setFont("helvetica", "normal"); doc.setTextColor(80, 100, 120);
        doc.text("Amount Paid:", boxX + 4, y + 18);
        doc.setFont("helvetica", "bold"); doc.setTextColor(28, 68, 48);
        doc.text(`Rs. ${paid.toLocaleString("en-IN")}`, boxX + 78, y + 18, { align: "right" });
        doc.setDrawColor(28, 48, 68); doc.setLineWidth(0.5);
        doc.line(boxX + 4, y + 22, boxX + 76, y + 22);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(28, 48, 68);
        doc.text("Balance Due:", boxX + 4, y + 30);
        doc.setTextColor(due === 0 ? 28 : 180, due === 0 ? 90 : 30, due === 0 ? 50 : 30);
        doc.text(`Rs. ${due.toLocaleString("en-IN")}`, boxX + 78, y + 30, { align: "right" });
        if (due === 0) {
            doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(39, 150, 80);
            doc.setGState && doc.setGState(new doc.GState({ opacity: 0.15 }));
            doc.text("PAID", margin + 10, y + 28);
            doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));
        }
        y = 272;
        doc.setFillColor(28, 48, 68); doc.rect(0, y, W, 25, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(180, 205, 220);
        doc.text("This is a system-generated invoice. No signature required.", W / 2, y + 9, { align: "center" });
        doc.text("For queries, contact the accounts office.", W / 2, y + 17, { align: "center" });
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
                            <div><span className="inv-dl">Student ID</span><span className="inv-dv">{student.id || "—"}</span></div>
                        </div>
                    </div>
                    <div className="inv-section">
                        <div className="inv-sec-label">Fee Summary</div>
                        <div className="inv-row"><span>Total Fees</span><span className="inv-bold">₹{totalFees.toLocaleString("en-IN")}</span></div>
                        <div className="inv-row"><span>Amount Paid</span><span className="inv-bold inv-green">₹{paid.toLocaleString("en-IN")}</span></div>
                        <div className="inv-row inv-row-total"><span>Balance Due</span><span className="inv-bold">₹{due.toLocaleString("en-IN")}</span></div>
                        <div className="inv-progress-wrap">
                            <div className="inv-progress-fill" style={{ width: `${Math.min(100, Math.round((paid / (totalFees || 1)) * 100))}%` }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#4A6B80", marginTop: 4 }}>
                            <span>{Math.min(100, Math.round((paid / (totalFees || 1)) * 100))}% paid</span>
                            <span>{due === 0 ? "✓ Fully Paid" : `₹${due.toLocaleString("en-IN")} remaining`}</span>
                        </div>
                    </div>
                    <div className="inv-section">
                        <div className="inv-sec-label">Payment History</div>
                        {payments.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#4A6B80", padding: "16px 0", fontSize: 13 }}>No payments recorded</div>
                        ) : payments.map((p, i) => (
                            <div key={i} className="inv-pay-row">
                                <div className="inv-pay-dot"><CreditCard size={13} /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1C3044" }}>{p.mode}</div>
                                    <div style={{ fontSize: 11, color: "#4A6B80" }}>{p.date}</div>
                                </div>
                                <span className="inv-pay-amt">₹{p.amount.toLocaleString("en-IN")}</span>
                                <span className="sf2-badge sf2-badge-green" style={{ fontSize: 11 }}>Success</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── PAY MODAL WITH OPTIONAL EMI ───────────────────────────────────────────────
function PayModal({ student, onClose, onMarkPaid, onUpdatePaid }) {
    const totalFees = Number(student.fees || 0);
    const alreadyPaid = payments.reduce((a, p) => a + p.amount, 0);
    const initialDue = Math.max(0, totalFees - alreadyPaid);

    // null = not chosen yet | false = full pay | true = EMI
    const [useEmi, setUseEmi] = useState(null);

    // Full pay
    const [fullMode, setFullMode] = useState("UPI");
    const [fullDone, setFullDone] = useState(false);

    // EMI
    const [emiCount, setEmiCount] = useState(3);
    const [emiList, setEmiList] = useState([]);
    const [confirmId, setConfirmId] = useState(null);
    const [modeInput, setModeInput] = useState("UPI");

    // Build EMI rows whenever emiCount or useEmi changes
    useEffect(() => {
        if (!useEmi) return;
        const base = Math.floor(initialDue / emiCount);
        const remainder = initialDue - base * emiCount;
        setEmiList(Array.from({ length: emiCount }, (_, i) => ({
            id: i + 1,
            label: `Instalment ${i + 1}`,
            amount: i === emiCount - 1 ? base + remainder : base,
            date: null, mode: null, status: "pending",
        })));
        setConfirmId(null);
    }, [emiCount, useEmi]);

    const emiPaid = emiList.filter(e => e.status === "paid").reduce((a, e) => a + e.amount, 0);
    const emiPending = emiList.filter(e => e.status === "pending").reduce((a, e) => a + e.amount, 0);

    const displayPaid = useEmi ? alreadyPaid + emiPaid : (fullDone ? totalFees : alreadyPaid);
    const displayPending = useEmi ? emiPending : (fullDone ? 0 : initialDue);
    const progressPct = Math.min(100, Math.round((displayPaid / (totalFees || 1)) * 100));

    const handleFullPay = () => {
        setFullDone(true);
        onUpdatePaid(student.id, totalFees);
        onMarkPaid(student.id);
    };

    const handleConfirmEmi = (emi) => {
        const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const updated = emiList.map(e =>
            e.id === emi.id ? { ...e, status: "paid", date: today, mode: modeInput } : e
        );
        setEmiList(updated);
        setConfirmId(null);
        const nowPaid = alreadyPaid + updated.filter(e => e.status === "paid").reduce((a, e) => a + e.amount, 0);
        onUpdatePaid(student.id, nowPaid);
        if (updated.filter(e => e.status === "pending").length === 0) onMarkPaid(student.id);
    };

    return (
        <div className="inv-overlay" onClick={onClose}>
            <div className="inv-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="inv-head">
                    <div className="inv-head-left">
                        <div className="inv-head-ico"><CreditCard size={18} color="#fff" /></div>
                        <div>
                            <div className="inv-head-title">Fee Payment</div>
                            <div className="inv-head-sub">{student.name} · {student.course}</div>
                        </div>
                    </div>
                    <button className="inv-close" onClick={onClose}><X size={17} /></button>
                </div>

                <div className="inv-body">

                    {/* ── Summary cards — always visible */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {[
                            { lbl: "Total Fees", val: `₹${totalFees.toLocaleString("en-IN")}`, clr: "#1C3044", bg: "#f0f7fc" },
                            { lbl: "Amount Paid", val: `₹${displayPaid.toLocaleString("en-IN")}`, clr: "#1a6e3e", bg: "#edf7f1" },
                            { lbl: "Pending", val: `₹${displayPending.toLocaleString("en-IN")}`, clr: displayPending > 0 ? "#a33030" : "#1a6e3e", bg: displayPending > 0 ? "#fdf0f0" : "#edf7f1" },
                        ].map((s, i) => (
                            <div key={i} style={{ background: s.bg, borderRadius: 10, padding: "11px 14px", border: "1px solid #d0e2ee", textAlign: "center" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 5 }}>{s.lbl}</div>
                                <div style={{ fontSize: 17, fontWeight: 700, color: s.clr, fontFamily: "'Playfair Display',serif" }}>{s.val}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Progress bar — always visible */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#4A6B80", marginBottom: 5 }}>
                            <span>Payment progress</span>
                            <span style={{ fontWeight: 700, color: "#27435B" }}>{progressPct}% paid</span>
                        </div>
                        <div style={{ height: 9, background: "#D0E2EE", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#3A5E78,#27435B)", borderRadius: 8, transition: "width .5s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#6A8FA4", marginTop: 4 }}>
                            <span>₹0</span>
                            <span>{displayPending === 0 ? "✓ Fully Paid" : `₹${displayPending.toLocaleString("en-IN")} remaining`}</span>
                            <span>₹{totalFees.toLocaleString("en-IN")}</span>
                        </div>
                    </div>

                    {/* ── Already fully paid (no due) */}
                    {initialDue === 0 && (
                        <div style={{ background: "#edf7f1", border: "1px solid #b2dfc6", borderRadius: 12, padding: "18px", textAlign: "center" }}>
                            <CheckCircle size={24} color="#1a6e3e" style={{ marginBottom: 6 }} />
                            <div style={{ fontWeight: 700, color: "#1a6e3e", fontSize: 14 }}>All fees have been paid!</div>
                        </div>
                    )}

                    {/* ── STEP 1: Choose payment method — shown only when nothing selected yet */}
                    {useEmi === null && !fullDone && initialDue > 0 && (
                        <div style={{ background: "#f0f7fc", borderRadius: 14, padding: "20px", border: "1px solid #d0e2ee" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1C3044", marginBottom: 14, textAlign: "center" }}>
                                How would you like to pay the remaining{" "}
                                <span style={{ color: "#27435B" }}>₹{initialDue.toLocaleString("en-IN")}</span>?
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <button
                                    onClick={() => setUseEmi(false)}
                                    style={{ background: "#fff", border: "2px solid #A0C0D4", borderRadius: 12, padding: "18px 14px", cursor: "pointer", textAlign: "center", fontFamily: "'DM Sans',sans-serif", transition: "border-color .15s, box-shadow .15s" }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#27435B"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(39,67,91,.15)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#A0C0D4"; e.currentTarget.style.boxShadow = "none"; }}
                                >
                                    <div style={{ fontSize: 26, marginBottom: 8 }}>💳</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1C3044" }}>Pay Full Amount</div>
                                    <div style={{ fontSize: 11, color: "#4A6B80", marginTop: 4 }}>₹{initialDue.toLocaleString("en-IN")} at once</div>
                                </button>
                                <button
                                    onClick={() => setUseEmi(true)}
                                    style={{ background: "#fff", border: "2px solid #A0C0D4", borderRadius: 12, padding: "18px 14px", cursor: "pointer", textAlign: "center", fontFamily: "'DM Sans',sans-serif", transition: "border-color .15s, box-shadow .15s" }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#27435B"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(39,67,91,.15)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#A0C0D4"; e.currentTarget.style.boxShadow = "none"; }}
                                >
                                    <div style={{ fontSize: 26, marginBottom: 8 }}>📅</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1C3044" }}>Pay in Instalments</div>
                                    <div style={{ fontSize: 11, color: "#4A6B80", marginTop: 4 }}>Split into EMIs</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── FULL PAY: form */}
                    {useEmi === false && !fullDone && (
                        <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #d0e2ee", overflow: "hidden" }}>
                            <div style={{ padding: "11px 16px 0" }}>
                                <button onClick={() => setUseEmi(null)} style={{ background: "none", border: "none", color: "#4A6B80", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                                    ← Back
                                </button>
                            </div>
                            <div style={{ padding: "14px 16px 18px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 14 }}>Full Payment</div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: "#4A6B80" }}>Amount to pay</div>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: "#1C3044", fontFamily: "'Playfair Display',serif" }}>₹{initialDue.toLocaleString("en-IN")}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <label style={{ fontSize: 12, color: "#4A6B80", fontWeight: 600 }}>Mode</label>
                                        <select
                                            value={fullMode}
                                            onChange={e => setFullMode(e.target.value)}
                                            style={{ fontSize: 13, border: "1.5px solid #A0C0D4", borderRadius: 8, padding: "7px 10px", color: "#1C3044", fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff" }}
                                        >
                                            {["UPI", "Net Banking", "Cash", "Card", "Cheque"].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={handleFullPay}
                                    style={{ width: "100%", background: "linear-gradient(135deg,#27435B,#1C3044)", border: "none", color: "#fff", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 3px 12px rgba(39,67,91,.28)" }}
                                >
                                    Confirm Full Payment — ₹{initialDue.toLocaleString("en-IN")}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FULL PAY: success banner */}
                    {useEmi === false && fullDone && (
                        <div style={{ background: "#edf7f1", border: "1px solid #b2dfc6", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                            <CheckCircle size={28} color="#1a6e3e" />
                            <div>
                                <div style={{ fontWeight: 700, color: "#1a6e3e", fontSize: 14 }}>Payment Confirmed!</div>
                                <div style={{ fontSize: 12, color: "#4A6B80", marginTop: 2 }}>₹{initialDue.toLocaleString("en-IN")} paid via {fullMode}</div>
                            </div>
                        </div>
                    )}

                    {/* ── EMI SECTION */}
                    {useEmi === true && (
                        <>
                            {/* Back + instalment count picker */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f7fc", borderRadius: 10, padding: "10px 14px", border: "1px solid #d0e2ee" }}>
                                <button onClick={() => setUseEmi(null)} style={{ background: "none", border: "none", color: "#4A6B80", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                                    ← Back
                                </button>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#27435B" }}>Instalments:</span>
                                    {[2, 3, 4, 6].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setEmiCount(n)}
                                            style={{
                                                width: 34, height: 34, borderRadius: 8, border: "none",
                                                background: emiCount === n ? "linear-gradient(135deg,#27435B,#1C3044)" : "rgba(39,67,91,.12)",
                                                color: emiCount === n ? "#fff" : "#27435B",
                                                fontWeight: 700, fontSize: 13, cursor: "pointer",
                                                fontFamily: "'DM Sans',sans-serif", transition: "background .15s"
                                            }}
                                        >{n}</button>
                                    ))}
                                </div>
                            </div>

                            {/* EMI Table */}
                            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #d0e2ee" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: "linear-gradient(135deg,#1C3044,#27435B)" }}>
                                            {["Instalment", "Amount", "Date", "Mode", "Status", "Action"].map(h => (
                                                <th key={h} style={{ padding: "11px 13px", color: "rgba(255,255,255,.85)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".6px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emiList.map((emi, i) => (
                                            <tr key={emi.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e8f2f8" }}>
                                                <td style={{ padding: "11px 13px", fontWeight: 600, color: "#1C3044", whiteSpace: "nowrap" }}>{emi.label}</td>
                                                <td style={{ padding: "11px 13px", fontWeight: 700, color: "#27435B", fontFamily: "'Playfair Display',serif", whiteSpace: "nowrap" }}>₹{emi.amount.toLocaleString("en-IN")}</td>
                                                <td style={{ padding: "11px 13px", color: "#4A6B80", fontSize: 12, whiteSpace: "nowrap" }}>{emi.date || "—"}</td>
                                                <td style={{ padding: "11px 13px" }}>
                                                    {emi.mode
                                                        ? <span className="sf2-badge sf2-badge-blue" style={{ fontSize: 11 }}>{emi.mode}</span>
                                                        : <span style={{ color: "#A0B8C8", fontSize: 12 }}>—</span>}
                                                </td>
                                                <td style={{ padding: "11px 13px" }}>
                                                    {emi.status === "paid" ? (
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#edf7f1", color: "#1a6e3e", borderRadius: 20, padding: "3px 10px", fontSize: 11.5, fontWeight: 600 }}>
                                                            <CheckCircle size={11} /> Paid
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdf0f0", color: "#a33030", borderRadius: 20, padding: "3px 10px", fontSize: 11.5, fontWeight: 600 }}>
                                                            <Clock size={11} /> Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "11px 13px" }}>
                                                    {emi.status === "paid" && <span style={{ color: "#A0B8C8", fontSize: 12 }}>—</span>}
                                                    {emi.status === "pending" && confirmId !== emi.id && (
                                                        <button
                                                            onClick={() => setConfirmId(emi.id)}
                                                            style={{ background: "linear-gradient(135deg,#27435B,#1C3044)", border: "none", color: "#fff", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}
                                                        >Pay</button>
                                                    )}
                                                    {emi.status === "pending" && confirmId === emi.id && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                            <select
                                                                value={modeInput}
                                                                onChange={e => setModeInput(e.target.value)}
                                                                style={{ fontSize: 12, border: "1.5px solid #A0C0D4", borderRadius: 6, padding: "5px 8px", color: "#1C3044", fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff" }}
                                                            >
                                                                {["UPI", "Net Banking", "Cash", "Card", "Cheque"].map(m => <option key={m}>{m}</option>)}
                                                            </select>
                                                            <button onClick={() => handleConfirmEmi(emi)} style={{ background: "#1a6e3e", border: "none", color: "#fff", borderRadius: 6, padding: "5px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }} title="Confirm">✓</button>
                                                            <button onClick={() => setConfirmId(null)} style={{ background: "rgba(39,67,91,.13)", border: "none", color: "#27435B", borderRadius: 6, padding: "5px 9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }} title="Cancel">✕</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: "#e8f2f8", borderTop: "2px solid #C0D8E8" }}>
                                            <td style={{ padding: "11px 13px", fontWeight: 700, color: "#1C3044", fontSize: 13 }}>Total</td>
                                            <td style={{ padding: "11px 13px", fontWeight: 700, color: "#1C3044", fontFamily: "'Playfair Display',serif", fontSize: 14 }}>₹{initialDue.toLocaleString("en-IN")}</td>
                                            <td colSpan={2} style={{ padding: "11px 13px" }}>
                                                <span style={{ fontSize: 12, color: "#1a6e3e", fontWeight: 600 }}>Paid: ₹{emiPaid.toLocaleString("en-IN")}</span>
                                            </td>
                                            <td colSpan={2} style={{ padding: "11px 13px" }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: emiPending > 0 ? "#a33030" : "#1a6e3e" }}>
                                                    {emiPending > 0 ? `Pending: ₹${emiPending.toLocaleString("en-IN")}` : "✓ Fully Paid"}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Close */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={onClose} style={{ background: "none", border: "1.5px solid #A0C0D4", borderRadius: 10, color: "#27435B", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "9px 28px", fontFamily: "'DM Sans',sans-serif" }}>
                            Close
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function StudentFeesPage() {
    const [editData, setEditData] = useState(null);
    const [students, setStudents] = useState([]);
    const [openPopup, setOpenPopup] = useState(false);
    const [search, setSearch] = useState("");

    const [invoiceStudent, setInvoiceStudent] = useState(null);
    const [payStudent, setPayStudent] = useState(null);
    const [paidIds, setPaidIds] = useState(new Set());
    // per-student paid amount tracker for the Remaining column
    const [studentPaidMap, setStudentPaidMap] = useState({});

    useEffect(() => {
        if (!window.jspdf) {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    const addStudentData = (newStudent) => {
        setStudents(prev => [newStudent, ...prev]);
    };

    const fetchStudents = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/finance/getStudentFinance", { credentials: "include" });
            const data = await res.json();
            console.log("Fetched from DB 👉", data);
            setStudents(data);
        } catch (err) { console.log(err); }
    };
    useEffect(() => { fetchStudents(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        await fetch(`http://localhost:5000/api/finance/deleteStudentFinance/${id}`, { method: "DELETE", credentials: "include" });
        fetchStudents();
    };

    const handleEdit = (student) => { setEditData(student); setOpenPopup(true); };

    const handleMarkPaid = (id) => {
        setPaidIds(prev => new Set([...prev, id]));
    };

    // Called on every instalment / full payment to refresh the Remaining column
    const handleUpdatePaid = (id, paidAmount) => {
        setStudentPaidMap(prev => ({ ...prev, [id]: paidAmount }));
    };

    const filtered = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <PageLayout>
            <style>{`

        .sf2-root {
          --brand:#27435B; --brand-dark:#1C3044; --brand-mid:#2E4F6B; --brand-light:#3A5E78;
          --brand-pale:#D0E2EE; --bg:#C5D9E8; --white:#fff;
          --text:#162535; --muted:#4A6B80; --border:#A0C0D4;
        }
        .sf2-root * { box-sizing:border-box; }
        .sf2-root, .sf2-root input, .sf2-root select, .sf2-root button { font-family:'DM Sans',sans-serif; }

        .sf2-page { background:linear-gradient(150deg,#C5D9E8 0%,#B2CCDC 45%,#A0BBCC 100%); min-height:100vh; padding:0; }

        .sf2-topbar { background:linear-gradient(135deg,#1C3044 0%,#27435B 100%); padding:18px 32px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 24px rgba(39,67,91,.38); }
        .sf2-brand { display:flex; align-items:center; gap:13px; }
        .sf2-logo  { width:46px; height:46px; border-radius:12px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
        .sf2-title { margin:0; font-size:19px; font-weight:700; color:#fff; font-family:'Playfair Display',serif; }
        .sf2-sub   { margin:0; font-size:11.5px; color:rgba(255,255,255,.6); }
        .sf2-topright { display:flex; align-items:center; gap:10px; }
        .sf2-datebadge { color:rgba(255,255,255,.7); font-size:12px; background:rgba(255,255,255,.1); padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.18); }

        .sf2-content { padding:28px 32px; }

        .sf2-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        .sf2-kpi { background:rgba(255,255,255,.9); border-radius:18px; padding:20px 22px; box-shadow:0 2px 16px rgba(39,67,91,.1); position:relative; overflow:hidden; border-top:4px solid #27435B; transition:transform .2s,box-shadow .2s; }
        .sf2-kpi:hover { transform:translateY(-2px); box-shadow:0 6px 22px rgba(39,67,91,.15); }
        .sf2-kpi-lbl { font-size:11px; font-weight:700; color:#4A6B80; text-transform:uppercase; letter-spacing:.9px; margin-bottom:7px; }
        .sf2-kpi-val { font-size:23px; font-weight:700; color:#1C3044; font-family:sans-serif }
        .sf2-kpi-ico { position:absolute; right:16px; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:12px; background:#27435B; opacity:.15; }
        .sf2-kpi-ico-el { position:absolute; right:16px; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:rgba(39,67,91,.15); color:#27435B; }

        .sf2-panel { background:rgba(255,255,255,.9); border-radius:18px; box-shadow:0 2px 14px rgba(39,67,91,.09); overflow:hidden; margin-bottom:22px; }
        .sf2-panel-head { background:linear-gradient(135deg,#27435B,#1C3044); padding:14px 22px; display:flex; align-items:center; justify-content:space-between; }
        .sf2-ph-left { display:flex; align-items:center; gap:9px; }
        .sf2-ph-title { color:#fff; font-size:14.5px; font-weight:700; margin:0; }
        .sf2-ph-badge { background:rgba(255,255,255,.2); color:#fff; border-radius:20px; padding:2px 12px; font-size:12px; font-weight:600; }
        .sf2-panel-body { padding:4px 22px 20px; }

        .sf2-tbl { width:100%; border-collapse:collapse; font-size:13.5px; }
        .sf2-tbl th { text-align:left; padding:14px 0 10px; border-bottom:2px solid #D0E2EE; color:#4A6B80; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; }
        .sf2-tbl td { padding:11px 0; border-bottom:1px solid #E0EEF6; color:#1C3044; vertical-align:middle; }
        .sf2-tbl tr:last-child td { border-bottom:none; }
        .sf2-tbl tbody tr:hover td { background:#edf4f9; }

        .sf2-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:11.5px; font-weight:600; }
        .sf2-badge-green { color:#27435B; background:rgba(39,67,91,.13); }
        .sf2-badge-red   { color:#27435B; background:rgba(39,67,91,.11); }
        .sf2-badge-blue  { color:#27435B; background:rgba(39,67,91,.12); }

        .sf2-act { width:30px; height:30px; border-radius:8px; border:none; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:opacity .15s; }
        .sf2-act:hover { opacity:.72; }
        .sf2-act-edit { background:rgba(39,67,91,.14); color:#27435B; }
        .sf2-act-del  { background:rgba(39,67,91,.18); color:#1C3044; }
        .sf2-act-inv  { background:rgba(39,67,91,.12); color:#27435B; }

        .sf2-pay-inline { border:none; border-radius:8px; padding:5px 14px; font-size:12px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:opacity .15s; white-space:nowrap; }
        .sf2-pay-inline:hover { opacity:.8; }
        .sf2-pay-inline-unpaid { background:linear-gradient(135deg,#27435B,#1C3044); color:#fff; }

        .sf2-search-wrap { position:relative; }
        .sf2-search-ico  { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,.6); pointer-events:none; }
        .sf2-search-inp  { padding:8px 14px 8px 35px; border:1.5px solid rgba(255,255,255,.25); border-radius:10px; background:rgba(255,255,255,.15); font-size:13px; color:#fff; width:220px; outline:none; }
        .sf2-search-inp::placeholder { color:rgba(255,255,255,.5); }
        .sf2-search-inp:focus { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.45); }

        .sf2-btn-primary { background:linear-gradient(135deg,#27435B,#1C3044); border:none; color:#fff; border-radius:10px; padding:9px 22px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(39,67,91,.28); transition:opacity .15s; display:flex; align-items:center; gap:7px; }
        .sf2-btn-primary:hover { opacity:.88; }
        .sf2-btn-pay { background:linear-gradient(135deg,#27435B,#1C3044); border:none; color:#fff; border-radius:10px; padding:10px 28px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(39,67,91,.3); transition:opacity .15s; }
        .sf2-btn-pay:hover { opacity:.88; }

        .sf2-progress-track { height:8px; background:#D0E2EE; border-radius:8px; overflow:hidden; margin-top:10px; }
        .sf2-progress-fill  { height:100%; border-radius:8px; }

        .sf2-strip { background:linear-gradient(135deg,#27435B,#1C3044); border-radius:16px; padding:18px 28px; display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
        .sf2-strip-item { text-align:center; }
        .sf2-strip-lbl  { color:rgba(255,255,255,.65); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
        .sf2-strip-val  { color:#fff; font-size:20px; font-weight:700; font-family:'Playfair Display',serif; margin-top:3px; }

        .sf2-empty { text-align:center; padding:36px 0; color:#4A6B80; font-size:14px; }

        /* ── MODALS ── */
        .inv-overlay { position:fixed; inset:0; background:rgba(20,35,50,.6); backdrop-filter:blur(6px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:invFadeIn .2s ease; }
        @keyframes invFadeIn { from{opacity:0} to{opacity:1} }
        .inv-box { background:#fff; border-radius:20px; width:100%; max-width:540px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(28,48,64,.32); animation:invSlideUp .25s ease; overflow:hidden; }
        @keyframes invSlideUp { from{transform:translateY(22px);opacity:0} to{transform:translateY(0);opacity:1} }

        .inv-head { background:linear-gradient(135deg,#1C3044,#27435B); padding:17px 22px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .inv-head-left { display:flex; align-items:center; gap:12px; }
        .inv-head-ico { width:40px; height:40px; border-radius:11px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
        .inv-head-title { font-size:15px; font-weight:700; color:#fff; font-family:'Playfair Display',serif; margin:0 0 2px; }
        .inv-head-sub { font-size:11px; color:rgba(255,255,255,.55); margin:0; }
        .inv-close { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:rgba(255,255,255,.75); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .15s; }
        .inv-close:hover { background:rgba(255,255,255,.22); color:#fff; }
        .inv-dl-btn { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.3); color:#fff; border-radius:9px; padding:7px 16px; font-size:12.5px; font-weight:700; font-family:'DM Sans',sans-serif; cursor:pointer; transition:background .15s; }
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
        .inv-bold { font-weight:700; color:#1C3044; font-family:'Playfair Display',serif; }
        .inv-green { color:#27435B; }
        .inv-progress-wrap { height:7px; background:#d0e2ee; border-radius:6px; overflow:hidden; margin-top:10px; }
        .inv-progress-fill { height:100%; background:linear-gradient(90deg,#3A5E78,#27435B); border-radius:6px; transition:width .5s ease; }
        .inv-pay-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #e8f2f8; }
        .inv-pay-row:last-child { border-bottom:none; }
        .inv-pay-dot { width:32px; height:32px; border-radius:9px; background:rgba(39,67,91,.13); color:#27435B; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .inv-pay-amt { font-size:13.5px; font-weight:700; color:#1C3044; font-family:'Playfair Display',serif; }
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
                            {new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <button className="sf2-btn-primary" onClick={() => { setEditData(null); setOpenPopup(true); }}>
                            <UserPlus size={15} /> Add Student
                        </button>
                    </div>
                </div>

                <div className="sf2-content">

                    {/* ── KPI CARDS ── */}
                    <div className="sf2-kpi-grid">
                        {[
                            { lbl: "Total Fees", val: `₹${summary.total.toLocaleString()}`, icon: IndianRupee },
                            { lbl: "Amount Paid", val: `₹${summary.paid.toLocaleString()}`, icon: CheckCircle },
                            { lbl: "Amount Due", val: `₹${summary.due.toLocaleString()}`, icon: AlertCircle },
                            { lbl: "Next Due Date", val: summary.nextDue, icon: CalendarDays },
                        ].map((k, i) => (
                            <div key={i} className="sf2-kpi">
                                <div className="sf2-kpi-lbl">{k.lbl}</div>
                                <div className="sf2-kpi-val">{k.val}</div>
                                <div className="sf2-kpi-ico" />
                                <div className="sf2-kpi-ico-el"><k.icon size={18} /></div>
                            </div>
                        ))}
                    </div>

                    {/* ── COLLECTION PROGRESS STRIP ── */}
                    <div className="sf2-strip">
                        <div className="sf2-strip-item">
                            <div className="sf2-strip-lbl">Collection Progress</div>
                            <div className="sf2-strip-val">{Math.round(summary.paid / summary.total * 100)}% Collected</div>
                        </div>
                        <div style={{ flex: 1, margin: "0 32px" }}>
                            <div className="sf2-progress-track" style={{ height: 12 }}>
                                <div className="sf2-progress-fill" style={{ width: `${Math.round(summary.paid / summary.total * 100)}%`, background: "linear-gradient(90deg,#3A5E78,#27435B)" }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                                <span style={{ color: "rgba(255,255,255,.6)", fontSize: 11 }}>₹0</span>
                                <span style={{ color: "rgba(255,255,255,.6)", fontSize: 11 }}>₹{summary.total.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="sf2-strip-item">
                            <div className="sf2-strip-lbl">Remaining</div>
                            <div className="sf2-strip-val" style={{ color: "#A8C8DC" }}>₹{summary.due.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* ── STUDENT LIST ── */}
                    <div className="sf2-panel">
                        <div className="sf2-panel-head">
                            <div className="sf2-ph-left">
                                <Users size={15} color="#fff" />
                                <p className="sf2-ph-title">Student List</p>
                                <span className="sf2-ph-badge">{filtered.length} students</span>
                            </div>
                            <div className="sf2-search-wrap">
                                <Search size={13} className="sf2-search-ico" />
                                <input
                                    className="sf2-search-inp"
                                    placeholder="Search name or email…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="sf2-panel-body">
                            <table className="sf2-tbl">
                                <thead>
                                    <tr>
                                        {["Name", "Email", "Course", "Fees", "Paid", "Remaining", "Status", "Actions"].map(h => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={8} className="sf2-empty">No students found</td></tr>
                                    ) : filtered.map(student => {
                                        const isPaid = paidIds.has(student.id);
                                        const totalFee = Number(student.fees || 0);
                                        const paidAmt = studentPaidMap[student.id] ?? payments.reduce((a, p) => a + p.amount, 0);
                                        const remaining = Math.max(0, totalFee - paidAmt);
                                        return (
                                            <tr key={student.id}>
                                                <td style={{ fontWeight: 600 }}>{student.name}</td>
                                                <td style={{ color: "#4A6B80" }}>{student.email}</td>
                                                <td><span className="sf2-badge sf2-badge-blue">{student.course}</span></td>
                                                <td style={{ fontWeight: 700, color: "#27435B" }}>₹{totalFee.toLocaleString()}</td>
                                                <td style={{ fontWeight: 600, color: "#1a6e3e" }}>₹{paidAmt.toLocaleString()}</td>
                                                <td>
                                                    <span style={{ fontWeight: 700, color: remaining > 0 ? "#a33030" : "#1a6e3e" }}>
                                                        ₹{remaining.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td>
                                                    {isPaid ? (
                                                        <span className="sf2-badge sf2-badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                            <CheckCircle size={11} /> Paid
                                                        </span>
                                                    ) : (
                                                        <button className="sf2-pay-inline sf2-pay-inline-unpaid" onClick={() => setPayStudent(student)}>
                                                            Pay
                                                        </button>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <button className="sf2-act sf2-act-edit" title="Edit" onClick={() => handleEdit(student)}><Pencil size={13} /></button>
                                                        <button className="sf2-act sf2-act-del" title="Delete" onClick={() => handleDelete(student.id)}><Trash2 size={13} /></button>
                                                        <button className="sf2-act sf2-act-inv" title="View Invoice" onClick={() => setInvoiceStudent(student)}><FileText size={13} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── PAYMENT HISTORY ── */}
                    <div className="sf2-panel">
                        <div className="sf2-panel-head">
                            <div className="sf2-ph-left">
                                <CreditCard size={15} color="#fff" />
                                <p className="sf2-ph-title">Payment History</p>
                                <span className="sf2-ph-badge">{payments.length} records</span>
                            </div>
                        </div>
                        <div className="sf2-panel-body" style={{ paddingTop: 8 }}>
                            <table className="sf2-tbl">
                                <thead>
                                    <tr>
                                        <th>Date</th><th>Time</th><th>Mode</th><th>Amount</th><th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.length === 0 ? (
                                        <tr><td colSpan={5} className="sf2-empty">No payment records found</td></tr>
                                    ) : payments.map((p, i) => {
                                        const dateObj = new Date(p.date);
                                        return (
                                            <tr key={i}>
                                                <td>{dateObj.toLocaleDateString("en-IN")}</td>
                                                <td>{dateObj.toLocaleTimeString("en-IN")}</td>
                                                <td><span className="sf2-badge sf2-badge-blue">{p.mode}</span></td>
                                                <td style={{ fontWeight: 700, color: "#27435B" }}>₹{p.amount.toLocaleString()}</td>
                                                <td><span className="sf2-badge sf2-badge-green">Success</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "2px solid #D0E2EE" }}>
                                <span style={{ fontWeight: 700, color: "#1C3044", fontSize: 13 }}>Total Paid</span>
                                <span style={{ fontWeight: 700, color: "#27435B", fontSize: 15, fontFamily: "'Playfair Display',serif" }}>
                                    ₹{payments.reduce((a, p) => a + p.amount, 0).toLocaleString()}
                                </span>
                            </div>
                            <div style={{ background: "rgba(39,67,91,.08)", borderRadius: 10, padding: "12px 14px", marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <AlertCircle size={15} color="#27435B" />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#27435B" }}>Outstanding Balance</span>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 14, color: "#27435B", fontFamily: "'Playfair Display',serif" }}>
                                    ₹{summary.due.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── PAY NOW BUTTON ── */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button className="sf2-btn-pay">Pay Now</button>
                    </div>

                </div>
            </div>

            {/* ADD/EDIT STUDENT MODAL */}
            <Addstudent
                open={openPopup}
                handleClose={() => setOpenPopup(false)}
                addStudentData={addStudentData}
                editData={editData}
            />

            {/* INVOICE MODAL */}
            {invoiceStudent && (
                <InvoiceModal student={invoiceStudent} onClose={() => setInvoiceStudent(null)} />
            )}

            {/* PAY / EMI MODAL */}
            {payStudent && (
                <PayModal
                    student={payStudent}
                    onClose={() => setPayStudent(null)}
                    onMarkPaid={handleMarkPaid}
                    onUpdatePaid={handleUpdatePaid}
                />
            )}
        </PageLayout>
    );
}