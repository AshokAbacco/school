import { CreditCard, X, CheckCircle, Clock } from "lucide-react";
import React, { useState, useEffect } from "react";


const API_URL = import.meta.env.VITE_API_URL;


export function PayModal({ student, onClose, onPaymentDone }) {
    const totalFees = Number(student.fees || 0);
    const alreadyPaid = Number(student.paidAmount || 0);
    const remaining = Math.max(0, totalFees - alreadyPaid);

    const [useEmi, setUseEmi] = useState(null);   // null=choose | false=full | true=emi
    const [fullMode, setFullMode] = useState("UPI");
    const [fullDone, setFullDone] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [emiCount, setEmiCount] = useState(3);
    const [emiList, setEmiList] = useState([]);
    const [confirmId, setConfirmId] = useState(null);
    const [modeInput, setModeInput] = useState("UPI");
    const [customConfirm, setCustomConfirm] = useState(false);
    const [customAmount, setCustomAmount] = useState("");

    useEffect(() => {
        if (!useEmi) return;
        const base = Math.floor(remaining / emiCount);
        const rem = remaining - base * emiCount;
        setEmiList(Array.from({ length: emiCount }, (_, i) => ({
            id: i + 1, label: `Instalment ${i + 1}`,
            amount: i === emiCount - 1 ? base + rem : base,
            date: null, mode: null, status: "pending",
        })));
        setConfirmId(null);
    }, [emiCount, useEmi]);

    const emiPaid = emiList.filter(e => e.status === "paid").reduce((a, e) => a + e.amount, 0);
    const emiPending = emiList.filter(e => e.status === "pending").reduce((a, e) => a + e.amount, 0);

    const displayPaid = useEmi ? alreadyPaid + emiPaid : (fullDone ? totalFees : alreadyPaid);
    const displayPending = useEmi ? emiPending : (fullDone ? 0 : remaining);
    const progressPct = Math.min(100, Math.round((displayPaid / (totalFees || 1)) * 100));

    // ── Full pay: call API to mark student as paid ──────────────────────────
    const handleFullPay = async () => {
        setLoading(true); setError("");
        try {
            const auth = JSON.parse(localStorage.getItem("auth"));
            const token = auth?.token;

            const res = await fetch(`${API_URL}/api/finance/updateStudentFinance/${student.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` // ✅ FIX
                },
                body: JSON.stringify({
                    ...student,
                    paidAmount: totalFees,
                    paymentStatus: "PAID",
                    paymentMode: fullMode,
                    paymentDate: new Date().toISOString(),
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            setFullDone(true);
            onPaymentDone(student.id, totalFees, "PAID");
        } catch (e) { setError(e.message || "Payment failed. Try again."); }
        finally { setLoading(false); }
    };

    // ── EMI instalment pay ──────────────────────────────────────────────────
    const handleConfirmEmi = async (emi) => {
        setLoading(true);
        setError("");

        const auth = JSON.parse(localStorage.getItem("auth"));
        const token = auth?.token;

        const today = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        const updated = emiList.map(e =>
            e.id === emi.id
                ? { ...e, status: "paid", date: today, mode: modeInput }
                : e
        );

        const nowPaid =
            alreadyPaid +
            updated.filter(e => e.status === "paid")
                .reduce((a, e) => a + e.amount, 0);

        const allPaid = updated.every(e => e.status === "paid");

        try {
            const res = await fetch(
                `${API_URL}/api/finance/updateStudentFinance/${student.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}` // ✅ FIX
                    },
                    body: JSON.stringify({
                        ...student,
                        paidAmount: nowPaid,
                        paymentStatus: allPaid ? "PAID" : "PARTIAL",
                        paymentMode: modeInput,
                        paymentDate: new Date().toISOString(),
                    }),
                }
            );

            if (!res.ok) throw new Error(await res.text());

            setEmiList(updated);
            setConfirmId(null);
            onPaymentDone(student.id, nowPaid, allPaid ? "PAID" : "PARTIAL");

        } catch (e) {
            setError(e.message || "Payment failed. Try again.");
        } finally {
            setLoading(false);
        }
    };
    const handleCustomPay = async () => {
        const amount = Number(customAmount);
        if (!amount || amount <= 0 || amount > remaining - emiPaid) {
            setError("Enter a valid amount not exceeding the remaining balance."); return;
        }
        setLoading(true); setError("");
        const nowPaid = alreadyPaid + emiPaid + amount;
        const allPaid = nowPaid >= totalFees;
        try {
            const auth = JSON.parse(localStorage.getItem("auth"));
            const token = auth?.token;
            const res = await fetch(`${API_URL}/api/finance/updateStudentFinance/${student.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...student,
                    paidAmount: nowPaid,
                    paymentStatus: allPaid ? "PAID" : "PARTIAL",
                    paymentMode: modeInput,
                    paymentDate: new Date().toISOString(),
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            onPaymentDone(student.id, nowPaid, allPaid ? "PAID" : "PARTIAL");
            setCustomAmount("");
            setCustomConfirm(false);
        } catch (e) { setError(e.message || "Payment failed. Try again."); }
        finally { setLoading(false); }
    };
    return (
        <div className="inv-overlay" onClick={onClose}>
            <div className="inv-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
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

                    {/* Summary cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {[
                            { lbl: "Total Fees", val: `₹${totalFees.toLocaleString("en-IN")}`, clr: "#1C3044", bg: "#f0f7fc" },
                            { lbl: "Amount Paid", val: `₹${displayPaid.toLocaleString("en-IN")}`, clr: "#1a6e3e", bg: "#edf7f1" },
                            { lbl: "Pending", val: `₹${displayPending.toLocaleString("en-IN")}`, clr: displayPending > 0 ? "#a33030" : "#1a6e3e", bg: displayPending > 0 ? "#fdf0f0" : "#edf7f1" },
                        ].map((s, i) => (
                            <div key={i} style={{ background: s.bg, borderRadius: 10, padding: "11px 14px", border: "1px solid #d0e2ee", textAlign: "center" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 5 }}>{s.lbl}</div>
                                <div style={{ fontSize: 17, fontWeight: 700, color: s.clr }}>{s.val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Progress */}
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

                    {/* Already fully paid */}
                    {remaining === 0 && (
                        <div style={{ background: "#edf7f1", border: "1px solid #b2dfc6", borderRadius: 12, padding: 18, textAlign: "center" }}>
                            <CheckCircle size={24} color="#1a6e3e" style={{ marginBottom: 6 }} />
                            <div style={{ fontWeight: 700, color: "#1a6e3e", fontSize: 14 }}>All fees have been paid!</div>
                        </div>
                    )}

                    {/* Choose payment method */}
                    {useEmi === null && !fullDone && remaining > 0 && (
                        <div style={{ background: "#f0f7fc", borderRadius: 14, padding: 20, border: "1px solid #d0e2ee" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1C3044", marginBottom: 14, textAlign: "center" }}>
                                How would you like to pay <span style={{ color: "#27435B" }}>₹{remaining.toLocaleString("en-IN")}</span>?
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                {[
                                    { icon: "💳", title: "Pay Full Amount", sub: `₹${remaining.toLocaleString("en-IN")} at once`, action: () => setUseEmi(false) },
                                    { icon: "📅", title: "Pay in Instalments", sub: "Split into EMIs", action: () => setUseEmi(true) },
                                ].map((opt, i) => (
                                    <button key={i} onClick={opt.action}
                                        style={{ background: "#fff", border: "2px solid #A0C0D4", borderRadius: 12, padding: "18px 14px", cursor: "pointer", textAlign: "center", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#27435B"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(39,67,91,.15)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#A0C0D4"; e.currentTarget.style.boxShadow = "none"; }}
                                    >
                                        <div style={{ fontSize: 26, marginBottom: 8 }}>{opt.icon}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1C3044" }}>{opt.title}</div>
                                        <div style={{ fontSize: 11, color: "#4A6B80", marginTop: 4 }}>{opt.sub}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Full pay form */}
                    {useEmi === false && !fullDone && (
                        <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #d0e2ee", overflow: "hidden" }}>
                            <div style={{ padding: "11px 16px 0" }}>
                                <button onClick={() => setUseEmi(null)} style={{ background: "none", border: "none", color: "#4A6B80", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: 0 }}>← Back</button>
                            </div>
                            <div style={{ padding: "14px 16px 18px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 14 }}>Full Payment</div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: "#4A6B80" }}>Amount to pay</div>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: "#1C3044" }}>₹{remaining.toLocaleString("en-IN")}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <label style={{ fontSize: 12, color: "#4A6B80", fontWeight: 600 }}>Mode</label>
                                        <select value={fullMode} onChange={e => setFullMode(e.target.value)}
                                            style={{ fontSize: 13, border: "1.5px solid #A0C0D4", borderRadius: 8, padding: "7px 10px", color: "#1C3044", fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff" }}>
                                            {["UPI", "Net Banking", "Cash", "Card", "Cheque"].map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleFullPay} disabled={loading}
                                    style={{ width: "100%", background: "linear-gradient(135deg,#27435B,#1C3044)", border: "none", color: "#fff", borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: loading ? .7 : 1 }}>
                                    {loading ? "Processing…" : `Confirm Full Payment — ₹${remaining.toLocaleString("en-IN")}`}
                                </button>
                                {error && <div style={{ marginTop: 10, color: "#a33030", fontSize: 12 }}>{error}</div>}
                            </div>
                        </div>
                    )}

                    {/* Full pay success */}
                    {useEmi === false && fullDone && (
                        <div style={{ background: "#edf7f1", border: "1px solid #b2dfc6", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                            <CheckCircle size={28} color="#1a6e3e" />
                            <div>
                                <div style={{ fontWeight: 700, color: "#1a6e3e", fontSize: 14 }}>Payment Confirmed!</div>
                                <div style={{ fontSize: 12, color: "#4A6B80", marginTop: 2 }}>₹{remaining.toLocaleString("en-IN")} paid via {fullMode}</div>
                            </div>
                        </div>
                    )}

                    {/* EMI section */}
                    {useEmi === true && (
                        <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f7fc", borderRadius: 10, padding: "10px 14px", border: "1px solid #d0e2ee" }}>
                                <button onClick={() => setUseEmi(null)} style={{ background: "none", border: "none", color: "#4A6B80", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: 0 }}>← Back</button>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#27435B" }}>Instalments:</span>
                                    {[2, 3, 4, 6].map(n => (
                                        <button key={n} onClick={() => setEmiCount(n)}
                                            style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: emiCount === n ? "linear-gradient(135deg,#27435B,#1C3044)" : "rgba(39,67,91,.12)", color: emiCount === n ? "#fff" : "#27435B", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

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
                                                <td style={{ padding: "11px 13px", fontWeight: 600, color: "#1C3044" }}>{emi.label}</td>
                                                <td style={{ padding: "11px 13px", fontWeight: 700, color: "#27435B" }}>₹{emi.amount.toLocaleString("en-IN")}</td>
                                                <td style={{ padding: "11px 13px", color: "#4A6B80", fontSize: 12 }}>{emi.date || "—"}</td>
                                                <td style={{ padding: "11px 13px" }}>
                                                    {emi.mode ? <span className="sf2-badge sf2-badge-blue" style={{ fontSize: 11 }}>{emi.mode}</span> : <span style={{ color: "#A0B8C8", fontSize: 12 }}>—</span>}
                                                </td>
                                                <td style={{ padding: "11px 13px" }}>
                                                    {emi.status === "paid"
                                                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#edf7f1", color: "#1a6e3e", borderRadius: 20, padding: "3px 10px", fontSize: 11.5, fontWeight: 600 }}><CheckCircle size={11} /> Paid</span>
                                                        : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdf0f0", color: "#a33030", borderRadius: 20, padding: "3px 10px", fontSize: 11.5, fontWeight: 600 }}><Clock size={11} /> Pending</span>}
                                                </td>
                                                <td style={{ padding: "11px 13px" }}>
                                                    {emi.status === "paid" && <span style={{ color: "#A0B8C8", fontSize: 12 }}>—</span>}
                                                    {emi.status === "pending" && confirmId !== emi.id && (
                                                        <button onClick={() => setConfirmId(emi.id)}
                                                            style={{ background: "linear-gradient(135deg,#27435B,#1C3044)", border: "none", color: "#fff", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                                            Pay
                                                        </button>
                                                    )}
                                                    {emi.status === "pending" && confirmId === emi.id && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                            <select value={modeInput} onChange={e => setModeInput(e.target.value)}
                                                                style={{ fontSize: 12, border: "1.5px solid #A0C0D4", borderRadius: 6, padding: "5px 8px", color: "#1C3044", fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff" }}>
                                                                {["UPI", "Net Banking", "Cash", "Card", "Cheque"].map(m => <option key={m}>{m}</option>)}
                                                            </select>
                                                            <button onClick={() => handleConfirmEmi(emi)} disabled={loading}
                                                                style={{ background: "#1a6e3e", border: "none", color: "#fff", borderRadius: 6, padding: "5px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓</button>
                                                            <button onClick={() => setConfirmId(null)}
                                                                style={{ background: "rgba(39,67,91,.13)", border: "none", color: "#27435B", borderRadius: 6, padding: "5px 9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Custom instalment row */}
                                        <tr style={{ background: "#f0f7fc", borderBottom: "1px solid #e8f2f8" }}>
                                            <td style={{ padding: "11px 13px", fontWeight: 600, color: "#27435B", fontStyle: "italic" }}>+ Custom amount</td>
                                            <td style={{ padding: "11px 13px", color: "#4A6B80", fontSize: 12 }}>Any amount</td>
                                            <td style={{ padding: "11px 13px", color: "#A0B8C8", fontSize: 12 }}>—</td>
                                            <td style={{ padding: "11px 13px" }}>
                                                {customConfirm
                                                    ? <select value={modeInput} onChange={e => setModeInput(e.target.value)}
                                                        style={{ fontSize: 12, border: "1.5px solid #A0C0D4", borderRadius: 6, padding: "5px 8px", color: "#1C3044", fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff" }}>
                                                        {["UPI", "Net Banking", "Cash", "Card", "Cheque"].map(m => <option key={m}>{m}</option>)}
                                                    </select>
                                                    : <span style={{ color: "#A0B8C8", fontSize: 12 }}>—</span>}
                                            </td>
                                            <td style={{ padding: "11px 13px" }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdf0f0", color: "#a33030", borderRadius: 20, padding: "3px 10px", fontSize: 11.5, fontWeight: 600 }}>
                                                    <Clock size={11} /> Pending
                                                </span>
                                            </td>
                                            <td style={{ padding: "11px 13px" }}>
                                                {!customConfirm
                                                    ? <button onClick={() => setCustomConfirm(true)}
                                                        style={{ background: "rgba(39,67,91,.13)", border: "1.5px dashed #27435B", color: "#27435B", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                                        Pay custom
                                                    </button>
                                                    : <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                        <input
                                                            type="number"
                                                            placeholder="Amount"
                                                            value={customAmount}
                                                            onChange={e => setCustomAmount(e.target.value)}
                                                            style={{ fontSize: 13, border: "1.5px solid #A0C0D4", borderRadius: 6, padding: "5px 8px", color: "#1C3044", fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", width: 90 }}
                                                        />
                                                        <button onClick={handleCustomPay} disabled={loading}
                                                            style={{ background: "#1a6e3e", border: "none", color: "#fff", borderRadius: 6, padding: "5px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓</button>
                                                        <button onClick={() => { setCustomConfirm(false); setCustomAmount(""); }}
                                                            style={{ background: "rgba(39,67,91,.13)", border: "none", color: "#27435B", borderRadius: 6, padding: "5px 9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕</button>
                                                    </div>}
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: "#e8f2f8", borderTop: "2px solid #C0D8E8" }}>
                                            <td style={{ padding: "11px 13px", fontWeight: 700, color: "#1C3044", fontSize: 13 }}>Total</td>
                                            <td style={{ padding: "11px 13px", fontWeight: 700, color: "#1C3044", fontSize: 14 }}>₹{remaining.toLocaleString("en-IN")}</td>
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
                            {error && <div style={{ color: "#a33030", fontSize: 12 }}>{error}</div>}
                        </>
                    )}

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