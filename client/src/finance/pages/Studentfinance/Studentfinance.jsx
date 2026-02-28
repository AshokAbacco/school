import React, { useEffect, useState } from "react";
import {
    Search, IndianRupee, ReceiptText, CalendarDays,
    Pencil, Trash2, UserPlus, GraduationCap, TrendingUp,
    AlertCircle, CheckCircle, Clock, CreditCard, BookOpen,
    Bus, FlaskConical, FileText, Users
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import Addstudent from "./Addstudent";

// ── STATIC DISPLAY DATA (unchanged) ──────────────────────────────────────────
const summary = { total: 60000, paid: 40000, due: 20000, nextDue: "15 Mar 2026" };



const payments = [
    { date: "01 Jan 2026", mode: "UPI", amount: 20000 },
    { date: "01 Feb 2026", mode: "Net Banking", amount: 20000 },
];

export default function StudentFeesPage() {
    // ── ALL EXISTING STATE & LOGIC UNCHANGED ─────────────────────────────────
    const [editData, setEditData] = useState(null);
    const [students, setStudents] = useState([]);
    const [openPopup, setOpenPopup] = useState(false);
    const [search, setSearch] = useState("");

    const addStudentData = () => { fetchStudents(); };

    const fetchStudents = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/finance/getStudentFinance", { credentials: "include" });
            const data = await res.json();
            console.log("Fetched from DB 👉", data);
            setStudents(data);
        } catch (err) { console.log(err); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        await fetch(`http://localhost:5000/api/finance/deleteStudentFinance/${id}`, { method: "DELETE", credentials: "include" });
        fetchStudents();
    };

    const handleEdit = (student) => { setEditData(student); setOpenPopup(true); };

    useEffect(() => { fetchStudents(); }, []);

    const filtered = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <PageLayout>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .sf2-root { --navy:#1E3448; --primary:#2E4F6B; --mid:#3D6480; --accent:#5A8FA8; --pale:#D6E8F2; --bg:#C8DCE9; --white:#fff; --success:#2A7A4F; --danger:#A83228; --warn:#A07010; --text:#162535; --muted:#5A7A90; --border:#A8C8DC; }
        .sf2-root * { box-sizing:border-box; }
        .sf2-root, .sf2-root input, .sf2-root select, .sf2-root button { font-family:'DM Sans',sans-serif; }

        /* PAGE */
        .sf2-page { background:linear-gradient(150deg,#C8DCE9 0%,#B5CEDF 45%,#A4BDD0 100%); min-height:100vh; padding:0; }

        /* TOP BAR */
        .sf2-topbar {
          background:linear-gradient(135deg,#1E3448 0%,#2E4F6B 100%);
          padding:18px 32px; display:flex; align-items:center; justify-content:space-between;
          box-shadow:0 4px 24px rgba(30,52,72,.38);
        }
        .sf2-brand { display:flex; align-items:center; gap:13px; }
        .sf2-logo  { width:46px; height:46px; border-radius:12px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
        .sf2-title { margin:0; font-size:19px; font-weight:700; color:#fff; font-family:'Playfair Display',serif; }
        .sf2-sub   { margin:0; font-size:11.5px; color:rgba(255,255,255,.6); }
        .sf2-topright { display:flex; align-items:center; gap:10px; }
        .sf2-datebadge { color:rgba(255,255,255,.7); font-size:12px; background:rgba(255,255,255,.1); padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.18); }

        /* CONTENT */
        .sf2-content { padding:28px 32px; }

        /* KPI GRID */
        .sf2-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        .sf2-kpi {
          background:rgba(255,255,255,.9); border-radius:18px; padding:20px 22px;
          box-shadow:0 2px 16px rgba(30,52,72,.1); position:relative; overflow:hidden;
          border-top:4px solid var(--kc); transition:transform .2s,box-shadow .2s;
        }
        .sf2-kpi:hover { transform:translateY(-2px); box-shadow:0 6px 22px rgba(30,52,72,.15); }
        .sf2-kpi-lbl { font-size:11px; font-weight:700; color:#5A7A90; text-transform:uppercase; letter-spacing:.9px; margin-bottom:7px; }
        .sf2-kpi-val { font-size:23px; font-weight:700; color:#1E3448; font-family:'Playfair Display',serif; }
        .sf2-kpi-ico { position:absolute; right:16px; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:12px; background:var(--kc); opacity:.15; }
        .sf2-kpi-ico-el { position:absolute; right:16px; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:var(--kc); opacity:.85; }

        /* PANEL */
        .sf2-panel { background:rgba(255,255,255,.9); border-radius:18px; box-shadow:0 2px 14px rgba(30,52,72,.09); overflow:hidden; margin-bottom:22px; }
        .sf2-panel-head { background:linear-gradient(135deg,#2E4F6B,#1E3448); padding:14px 22px; display:flex; align-items:center; justify-content:space-between; }
        .sf2-ph-left { display:flex; align-items:center; gap:9px; }
        .sf2-ph-title { color:#fff; font-size:14.5px; font-weight:700; margin:0; }
        .sf2-ph-badge { background:rgba(255,255,255,.2); color:#fff; border-radius:20px; padding:2px 12px; font-size:12px; font-weight:600; }
        .sf2-panel-body { padding:4px 22px 20px; }

        /* TWO COL */
        .sf2-two { display:grid; grid-template-columns:1fr 1fr; gap:20px; }

        /* TABLE */
        .sf2-tbl { width:100%; border-collapse:collapse; font-size:13.5px; }
        .sf2-tbl th { text-align:left; padding:14px 0 10px; border-bottom:2px solid #D6E8F2; color:#5A7A90; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; }
        .sf2-tbl td { padding:11px 0; border-bottom:1px solid #E4EFF6; color:#1E3448; vertical-align:middle; }
        .sf2-tbl tr:last-child td { border-bottom:none; }
        .sf2-tbl tbody tr:hover td { background:#f0f7fc; }

        /* BADGE */
        .sf2-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:11.5px; font-weight:600; }
        .sf2-badge-green { color:#2A7A4F; background:rgba(42,122,79,.13); }
        .sf2-badge-red   { color:#A83228; background:rgba(168,50,40,.11); }
        .sf2-badge-blue  { color:#2E4F6B; background:rgba(46,79,107,.12); }

        /* ACTION BUTTONS */
        .sf2-act { width:30px; height:30px; border-radius:8px; border:none; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:opacity .15s; }
        .sf2-act:hover { opacity:.72; }
        .sf2-act-edit { background:rgba(46,79,107,.14); color:#2E4F6B; }
        .sf2-act-del  { background:rgba(168,50,40,.12);  color:#A83228; }

        /* SEARCH */
        .sf2-search-wrap { position:relative; }
        .sf2-search-ico  { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,.6); pointer-events:none; }
        .sf2-search-inp  { padding:8px 14px 8px 35px; border:1.5px solid rgba(255,255,255,.25); border-radius:10px; background:rgba(255,255,255,.15); font-size:13px; color:#fff; width:220px; outline:none; }
        .sf2-search-inp::placeholder { color:rgba(255,255,255,.5); }
        .sf2-search-inp:focus { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.45); }

        /* MAIN SEARCH (page level) */
        .sf2-main-search-wrap { position:relative; }
        .sf2-main-search-ico  { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#5A7A90; pointer-events:none; }
        .sf2-main-search-inp  { padding:9px 14px 9px 36px; border:1.5px solid #A8C8DC; border-radius:10px; background:rgba(255,255,255,.82); font-size:13px; color:#1E3448; width:250px; outline:none; }
        .sf2-main-search-inp:focus { border-color:#2E4F6B; background:#fff; }

        /* BUTTONS */
        .sf2-btn-primary { background:linear-gradient(135deg,#2E4F6B,#1E3448); border:none; color:#fff; border-radius:10px; padding:9px 22px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(30,52,72,.28); transition:opacity .15s; display:flex; align-items:center; gap:7px; }
        .sf2-btn-primary:hover { opacity:.88; }
        .sf2-btn-pay { background:linear-gradient(135deg,#2A7A4F,#1E5C3A); border:none; color:#fff; border-radius:10px; padding:10px 28px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(42,122,79,.3); transition:opacity .15s; }
        .sf2-btn-pay:hover { opacity:.88; }

        /* FEE STRUCTURE CARD */
        .sf2-fee-row-card { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid #E4EFF6; }
        .sf2-fee-row-card:last-child { border-bottom:none; }
        .sf2-fee-left { display:flex; align-items:center; gap:11px; }
        .sf2-fee-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; }

        /* PAYMENT ROW */
        .sf2-pay-row { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid #E4EFF6; }
        .sf2-pay-row:last-child { border-bottom:none; }
        .sf2-pay-dot { width:36px; height:36px; border-radius:10px; background:rgba(42,122,79,.13); display:flex; align-items:center; justify-content:center; flex-shrink:0; }

        /* PROGRESS */
        .sf2-progress-track { height:8px; background:#D6E8F2; border-radius:8px; overflow:hidden; margin-top:10px; }
        .sf2-progress-fill  { height:100%; border-radius:8px; }

        /* SECTION HEADER ROW */
        .sf2-sec-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .sf2-sec-title { font-family:'Playfair Display',serif; font-size:18px; font-weight:700; color:#1E3448; margin:0; display:flex; align-items:center; gap:10px; }
        .sf2-sec-title span { width:4px; height:22px; background:linear-gradient(135deg,#2E4F6B,#1E3448); border-radius:4px; display:inline-block; }

        /* SUMMARY STRIP */
        .sf2-strip { background:linear-gradient(135deg,#2E4F6B,#1E3448); border-radius:16px; padding:18px 28px; display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
        .sf2-strip-item { text-align:center; }
        .sf2-strip-lbl  { color:rgba(255,255,255,.65); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
        .sf2-strip-val  { color:#fff; font-size:20px; font-weight:700; font-family:'Playfair Display',serif; margin-top:3px; }

        /* EMPTY STATE */
        .sf2-empty { text-align:center; padding:36px 0; color:#5A7A90; font-size:14px; }
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
                            { lbl: "Total Fees", val: `₹${summary.total.toLocaleString()}`, color: "#2E4F6B", icon: IndianRupee },
                            { lbl: "Amount Paid", val: `₹${summary.paid.toLocaleString()}`, color: "#2A7A4F", icon: CheckCircle },
                            { lbl: "Amount Due", val: `₹${summary.due.toLocaleString()}`, color: "#A83228", icon: AlertCircle },
                            { lbl: "Next Due Date", val: summary.nextDue, color: "#A07010", icon: CalendarDays },
                        ].map((k, i) => (
                            <div key={i} className="sf2-kpi" style={{ "--kc": k.color }}>
                                <div className="sf2-kpi-lbl">{k.lbl}</div>
                                <div className="sf2-kpi-val">{k.val}</div>
                                <div className="sf2-kpi-ico" />
                                <div className="sf2-kpi-ico-el" style={{ background: k.color + "22", color: k.color, opacity: 1 }}>
                                    <k.icon size={18} />
                                </div>
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
                                <div className="sf2-progress-fill" style={{ width: `${Math.round(summary.paid / summary.total * 100)}%`, background: "linear-gradient(90deg,#5A8FA8,#7FB3CC)" }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                                <span style={{ color: "rgba(255,255,255,.6)", fontSize: 11 }}>₹0</span>
                                <span style={{ color: "rgba(255,255,255,.6)", fontSize: 11 }}>₹{summary.total.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="sf2-strip-item">
                            <div className="sf2-strip-lbl">Remaining</div>
                            <div className="sf2-strip-val" style={{ color: "#FFA07A" }}>₹{summary.due.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* ── STUDENT LIST (BACKEND DATA) ── */}
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
                                        {["Name", "Email", "Course", "Fees", "Actions"].map(h => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="sf2-empty">No students found</td>
                                        </tr>
                                    ) : filtered.map(student => (
                                        <tr key={student.id}>
                                            <td style={{ fontWeight: 600 }}>{student.name}</td>
                                            <td style={{ color: "#5A7A90" }}>{student.email}</td>
                                            <td><span className="sf2-badge sf2-badge-blue">{student.course}</span></td>
                                            <td style={{ fontWeight: 700, color: "#2E4F6B" }}>₹{Number(student.fees).toLocaleString()}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button className="sf2-act sf2-act-edit" title="Edit" onClick={() => handleEdit(student)}>
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button className="sf2-act sf2-act-del" title="Delete" onClick={() => handleDelete(student.id)}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── FEE STRUCTURE & PAYMENT HISTORY ── */}
                    {/* Payment History */}
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
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Mode</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="sf2-empty">
                                                No payment records found
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((p, i) => {
                                            const dateObj = new Date(p.date);

                                            return (
                                                <tr key={i}>
                                                    <td>
                                                        {dateObj.toLocaleDateString("en-IN")}
                                                    </td>
                                                    <td>
                                                        {dateObj.toLocaleTimeString("en-IN")}
                                                    </td>
                                                    <td>
                                                        <span className="sf2-badge sf2-badge-blue">
                                                            {p.mode}
                                                        </span>
                                                    </td>
                                                    <td style={{
                                                        fontWeight: 700,
                                                        color: "#2A7A4F"
                                                    }}>
                                                        ₹{p.amount.toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <span className="sf2-badge sf2-badge-green">
                                                            Success
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {/* Total Paid Footer */}
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 16,
                                paddingTop: 14,
                                borderTop: "2px solid #D6E8F2"
                            }}>
                                <span style={{
                                    fontWeight: 700,
                                    color: "#1E3448",
                                    fontSize: 13
                                }}>
                                    Total Paid
                                </span>

                                <span style={{
                                    fontWeight: 700,
                                    color: "#2A7A4F",
                                    fontSize: 15,
                                    fontFamily: "'Playfair Display',serif"
                                }}>
                                    ₹{payments.reduce((a, p) => a + p.amount, 0).toLocaleString()}
                                </span>
                            </div>

                            {/* Outstanding */}
                            <div style={{
                                background: "rgba(168,50,40,.08)",
                                borderRadius: 10,
                                padding: "12px 14px",
                                marginTop: 12,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <AlertCircle size={15} color="#A83228" />
                                    <span style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "#A83228"
                                    }}>
                                        Outstanding Balance
                                    </span>
                                </div>

                                <span style={{
                                    fontWeight: 700,
                                    fontSize: 14,
                                    color: "#A83228",
                                    fontFamily: "'Playfair Display',serif"
                                }}>
                                    ₹{summary.due.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* ── PAY NOW BUTTON ── */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button className="sf2-btn-pay">
                            Pay Now
                        </button>
                    </div>

                </div>{/* end content */}
            </div>{/* end page */}

            {/* ADD/EDIT STUDENT MODAL — UNCHANGED */}
            <Addstudent
                open={openPopup}
                handleClose={() => setOpenPopup(false)}
                addStudentData={addStudentData}
                editData={editData}
            />
        </PageLayout>
    );
}