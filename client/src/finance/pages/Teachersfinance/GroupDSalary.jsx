import React, { useState, useEffect } from "react";
import {
    Users, Search, Pencil, Trash2, UserPlus,
    CheckCircle, AlertCircle, IndianRupee, X,
    Building2, Briefcase, Download
} from "lucide-react";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
:root {
  --navy:#1c3040; --primary:#2b4557; --mid:#3c5d74;
  --accent:#527a91; --pale:#eaf1f6;
  --text:#162535; --muted:#5A7A90; --border:#d4e4ee;
}
.gd-root * { box-sizing:border-box; }
.gd-root, .gd-root input, .gd-root select, .gd-root button { font-family:'DM Sans',sans-serif; }
.gd-page { background:linear-gradient(150deg,#d8e8f0 0%,#c8dce9 45%,#b8cfe0 100%); min-height:100vh; }

.gd-topbar { background:linear-gradient(135deg,#1c3040,#2b4557); padding:18px 32px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 20px rgba(28,48,64,.38); }
.gd-brand { display:flex; align-items:center; gap:13px; }
.gd-logo  { width:46px; height:46px; border-radius:13px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
.gd-title { margin:0; font-size:19px; font-weight:700; color:#fff; font-family:'Playfair Display',serif; }
.gd-sub   { margin:0; font-size:12px; color:rgba(255,255,255,.55); }
.gd-datebadge { color:rgba(255,255,255,.7); font-size:12px; background:rgba(255,255,255,.1); padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.18); }

.gd-content { padding:24px 32px; }

.gd-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:22px; }
.gd-kpi { background:rgba(255,255,255,.92); border-radius:16px; padding:20px 20px 16px; box-shadow:0 2px 14px rgba(28,48,64,.1); position:relative; overflow:hidden; border-top:4px solid #3c5d74; transition:transform .2s; }
.gd-kpi:hover { transform:translateY(-3px); }
.gd-kpi-lbl { font-size:11px; font-weight:700; color:#5A7A90; text-transform:uppercase; letter-spacing:.9px; margin-bottom:7px; }
.gd-kpi-val { font-size:24px; font-weight:700; color:#1c3040; font-family:sans-serif}
.gd-kpi-sub { font-size:11.5px; margin-top:6px; color:#5A7A90; font-weight:500; }
.gd-kpi-ico { position:absolute; right:16px; top:16px; width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; background:rgba(60,93,116,.12); color:#3c5d74; }

.gd-panel { background:rgba(255,255,255,.92); border-radius:16px; box-shadow:0 2px 12px rgba(28,48,64,.09); overflow:hidden; margin-bottom:18px; }
.gd-panel-head { background:linear-gradient(135deg,#2b4557,#1c3040); padding:13px 20px; display:flex; align-items:center; justify-content:space-between; }
.gd-ph-left { display:flex; align-items:center; gap:9px; }
.gd-ph-title { color:#fff; font-size:14px; font-weight:700; margin:0; }
.gd-ph-badge { background:rgba(255,255,255,.2); color:#fff; border-radius:20px; padding:2px 12px; font-size:12px; font-weight:600; }
.gd-panel-body { padding:4px 22px 20px; }

.gd-tbl { width:100%; border-collapse:collapse; font-size:13.5px; }
.gd-tbl th { text-align:left; padding:14px 0 10px; border-bottom:2px solid #d4e4ee; color:#5A7A90; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; }
.gd-tbl td { padding:11px 0; border-bottom:1px solid #eaf1f6; color:#1c3040; vertical-align:middle; }
.gd-tbl tr:last-child td { border-bottom:none; }
.gd-tbl tbody tr:hover td { background:#f0f7fb; }

.gd-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:11.5px; font-weight:600; }
.gd-badge-blue  { color:#2b4557; background:rgba(60,93,116,.13); }
.gd-badge-green { color:#2b4557; background:rgba(60,93,116,.13); }
.gd-badge-red   { color:#527a91; background:rgba(82,122,145,.13); }

.gd-act { width:30px; height:30px; border-radius:8px; border:none; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:opacity .15s; }
.gd-act:hover { opacity:.72; }
.gd-act-edit { background:rgba(60,93,116,.14); color:#2b4557; }
.gd-act-del  { background:rgba(60,93,116,.18); color:#1c3040; }
.gd-act-pay  { background:linear-gradient(135deg,#2b4557,#1c3040); color:#fff; border-radius:8px; border:none; padding:5px 14px; font-size:12px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }
.gd-act-pay:hover { opacity:.85; }
.gd-act-paid { background:rgba(60,93,116,.13); color:#2b4557; border-radius:8px; border:none; padding:5px 14px; font-size:12px; font-weight:700; cursor:default; font-family:'DM Sans',sans-serif; display:inline-flex; align-items:center; gap:4px; }

.gd-search-wrap { position:relative; }
.gd-search-ico  { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,.6); pointer-events:none; }
.gd-search-inp  { padding:8px 14px 8px 35px; border:1.5px solid rgba(255,255,255,.25); border-radius:10px; background:rgba(255,255,255,.15); font-size:13px; color:#fff; width:220px; outline:none; }
.gd-search-inp::placeholder { color:rgba(255,255,255,.5); }
.gd-search-inp:focus { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.45); }

.gd-btn-primary { background:linear-gradient(135deg,#2b4557,#1c3040); border:none; color:#fff; border-radius:10px; padding:9px 20px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:7px; transition:opacity .15s; box-shadow:0 3px 10px rgba(28,48,64,.25); }
.gd-btn-primary:hover { opacity:.88; }

.gd-strip { background:linear-gradient(135deg,#2b4557,#1c3040); border-radius:14px; padding:18px 28px; display:flex; align-items:center; justify-content:space-around; margin-bottom:18px; }
.gd-strip-item { text-align:center; }
.gd-strip-lbl  { color:rgba(255,255,255,.55); font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
.gd-strip-val  { color:#fff; font-size:19px; font-weight:700; font-family:'Playfair Display',serif; margin-top:3px; }
.gd-strip-div  { width:1px; height:36px; background:rgba(255,255,255,.18); }

.gd-empty { text-align:center; padding:40px 0; color:#5A7A90; font-size:14px; }

.gd-overlay { position:fixed; inset:0; background:rgba(20,35,50,.6); backdrop-filter:blur(6px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:gdFade .2s ease; }
@keyframes gdFade { from{opacity:0} to{opacity:1} }
.gd-modal { background:#fff; border-radius:20px; width:100%; max-width:500px; max-height:88vh; overflow-y:auto; box-shadow:0 24px 60px rgba(28,48,64,.3); animation:gdSlide .25s ease; }
@keyframes gdSlide { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
.gd-modal-head { background:linear-gradient(135deg,#1c3040,#2b4557); padding:17px 22px; display:flex; align-items:center; justify-content:space-between; border-radius:20px 20px 0 0; }
.gd-modal-title { color:#fff; font-size:15px; font-weight:700; font-family:'Playfair Display',serif; margin:0; }
.gd-modal-close { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:rgba(255,255,255,.75); display:flex; align-items:center; justify-content:center; cursor:pointer; }
.gd-modal-close:hover { background:rgba(255,255,255,.22); color:#fff; }
.gd-modal-body { padding:22px; display:flex; flex-direction:column; gap:14px; }
.gd-field { display:flex; flex-direction:column; gap:5px; }
.gd-field label { font-size:11.5px; font-weight:700; color:#5A7A90; text-transform:uppercase; letter-spacing:.7px; }
.gd-field input, .gd-field select { border:1.5px solid #d4e4ee; border-radius:10px; padding:10px 14px; font-size:14px; font-family:'DM Sans',sans-serif; color:#1c3040; outline:none; background:#fff; }
.gd-field input:focus, .gd-field select:focus { border-color:#3c5d74; }
.gd-field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.gd-modal-footer { display:flex; gap:10px; padding:0 22px 22px; }
.gd-btn-save { flex:1; background:linear-gradient(135deg,#2b4557,#1c3040); border:none; color:#fff; border-radius:10px; padding:11px; font-size:14px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }
.gd-btn-save:hover { opacity:.88; }
.gd-btn-cancel { flex:1; background:none; border:1.5px solid #d4e4ee; border-radius:10px; padding:11px; font-size:14px; font-weight:600; color:#5A7A90; cursor:pointer; font-family:'DM Sans',sans-serif; }
.gd-btn-cancel:hover { border-color:#3c5d74; color:#2b4557; }
.gd-act-slip { background:rgba(82,122,145,.18); color:#1c3040; width:30px; height:30px; border-radius:8px; border:none; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:opacity .15s; }
.gd-act-slip:hover { opacity:.72; }
`;

const emptyForm = { name: "", position: "", school: "", section: "", basicSalary: "", allowances: "", status: "Active" };

export default function GroupDSalary() {
    const [staff, setStaff] = useState([]);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [paidIds, setPaidIds] = useState(new Set());

    const fetchStaff = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/groupd/salary/list/all", { credentials: "include" });
            const data = await res.json();
            setStaff(data);
        } catch (err) { console.log(err); }
    };
    useEffect(() => { fetchStaff(); }, []);

    const handleOpen = (item = null) => {
        setEditData(item);
        setForm(item ? { ...item } : emptyForm);
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editData) {
                await fetch(`http://localhost:5000/api/groupd/salary/update/${editData.id}`, {
                    method: "PUT", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                });
            } else {
                await fetch("http://localhost:5000/api/groupd/salary/create", {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                });
            }
            setShowModal(false);
            fetchStaff();
        } catch (err) { console.log(err); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this staff record?")) return;
        await fetch(`http://localhost:5000/api/groupd/salary/delete/${id}`, { method: "DELETE", credentials: "include" });
        fetchStaff();
    };

    const handlePay = async (id) => {
        try {
            await fetch(`http://localhost:5000/api/groupd/salary/pay/${id}`, { method: "PATCH", credentials: "include" });
            setPaidIds(prev => new Set([...prev, id]));
        } catch (err) { console.log(err); }
    };

    const filtered = staff.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.position?.toLowerCase().includes(search.toLowerCase()) ||
        s.school?.toLowerCase().includes(search.toLowerCase())
    );

    const totalSalary = staff.reduce((a, s) => a + Number(s.basicSalary || 0) + Number(s.allowances || 0), 0);
    const paidCount = paidIds.size;
    const unpaidCount = staff.length - paidCount;
    const fmt = n => "Rs. " + Number(n).toLocaleString("en-IN");

    const downloadPayslip = async (s) => {
        const total = Number(s.basicSalary || 0) + Number(s.allowances || 0);
        const isPaid = paidIds.has(s.id);
        const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        const genDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

        if (!window.jspdf) {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const W = doc.internal.pageSize.getWidth();

        doc.setFillColor(28, 48, 64);
        doc.roundedRect(0, 0, W, 110, 0, 0, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("Institution Payroll System", 36, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 200, 215);
        doc.text("Group D \u2014 Administrative Staff", 36, 62);

        doc.setFillColor(255, 255, 255, 40);
        doc.roundedRect(36, 74, 200, 22, 11, 11, "F");
        doc.setTextColor(220, 235, 245);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`SALARY PAYSLIP  \u00B7  ${month.toUpperCase()}`, 44, 89);

        const infoY = 130;
        const col1 = 36, col2 = W / 2 + 10;
        const fields = [
            ["Employee Name", s.name || "\u2014", "Position", s.position || "\u2014"],
            ["School", s.school || "\u2014", "Section", s.section || "\u2014"],
            ["Employee ID", String(s.id || "\u2014"), "Status", s.status || "Active"],
        ];
        doc.setDrawColor(212, 228, 238);
        fields.forEach((row, i) => {
            const y = infoY + i * 52;
            if (i > 0) { doc.setLineWidth(0.5); doc.line(36, y - 8, W - 36, y - 8); }
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(138, 160, 176);
            doc.text(row[0].toUpperCase(), col1, y + 4);
            doc.text(row[2].toUpperCase(), col2, y + 4);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(28, 48, 64);
            doc.text(row[1], col1, y + 20);
            doc.text(row[3], col2, y + 20);
        });

        const earnY = infoY + fields.length * 52 + 10;
        doc.setLineWidth(1);
        doc.setDrawColor(212, 228, 238);
        doc.line(36, earnY, W - 36, earnY);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(138, 160, 176);
        doc.text("EARNINGS BREAKDOWN", 36, earnY + 20);

        const rows = [
            ["Basic Salary", fmt(s.basicSalary || 0)],
            ["Allowances", fmt(s.allowances || 0)],
        ];
        rows.forEach((row, i) => {
            const ry = earnY + 38 + i * 30;
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(28, 48, 64);
            doc.text(row[0], 36, ry);
            doc.setFont("helvetica", "bold");
            doc.text(row[1], W - 36, ry, { align: "right" });
            doc.setLineWidth(0.4);
            doc.setDrawColor(234, 241, 246);
            doc.line(36, ry + 8, W - 36, ry + 8);
        });

        const totalBoxY = earnY + 38 + rows.length * 30 + 14;
        doc.setFillColor(234, 243, 250);
        doc.roundedRect(36, totalBoxY, W - 72, 44, 8, 8, "F");
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(43, 69, 87);
        doc.text("Net Salary (Total)", 52, totalBoxY + 27);
        doc.setFontSize(16);
        doc.setTextColor(28, 48, 64);
        doc.text(fmt(total), W - 52, totalBoxY + 27, { align: "right" });

        const badgeY = totalBoxY + 62;
        const badgeColor = isPaid ? [212, 237, 218] : [252, 232, 232];
        const badgeText = isPaid ? "SALARY PAID" : "PAYMENT PENDING";
        const badgeTextColor = isPaid ? [26, 102, 50] : [160, 48, 48];
        doc.setFillColor(...badgeColor);
        doc.roundedRect(36, badgeY, 140, 24, 12, 12, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...badgeTextColor);
        doc.text(badgeText, 106, badgeY + 15.5, { align: "center" });

        const footerY = doc.internal.pageSize.getHeight() - 40;
        doc.setFillColor(248, 250, 252);
        doc.rect(0, footerY - 10, W, 50, "F");
        doc.setLineWidth(0.5);
        doc.setDrawColor(212, 228, 238);
        doc.line(0, footerY - 10, W, footerY - 10);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(138, 160, 176);
        doc.text(`Generated on ${genDate}`, 36, footerY + 8);
        doc.text("Group D \u00B7 Payroll Management System", W - 36, footerY + 8, { align: "right" });

        doc.save(`Payslip_${(s.name || "staff").replace(/\s+/g, "_")}_${month.replace(/\s+/g, "_")}.pdf`);
    };

    return (
        <>
            <style>{STYLE}</style>
            <div className="gd-root gd-page">

                <div className="gd-topbar">
                    <div className="gd-brand">
                        <div className="gd-logo"><Building2 size={22} color="#fff" /></div>
                        <div>
                            <p className="gd-title">Group D — Salary Management</p>
                            <p className="gd-sub">Administrative Staff · Payroll & Records</p>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="gd-datebadge">
                            {new Date().toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <button className="gd-btn-primary" onClick={() => handleOpen()}>
                            <UserPlus size={15} /> Add Staff
                        </button>
                    </div>
                </div>

                <div className="gd-content">

                    <div className="gd-kpi-grid">
                        {[
                            { lbl: "Total Staff", val: staff.length, sub: "Group D members", icon: Users },
                            { lbl: "Total Payroll", val: fmt(totalSalary), sub: "Monthly outflow", icon: IndianRupee },
                            { lbl: "Salaries Paid", val: paidCount, sub: "This month", icon: CheckCircle },
                            { lbl: "Pending", val: unpaidCount, sub: "Awaiting payment", icon: AlertCircle },
                        ].map((k, i) => (
                            <div key={i} className="gd-kpi">
                                <div className="gd-kpi-lbl">{k.lbl}</div>
                                <div className="gd-kpi-val">{k.val}</div>
                                <div className="gd-kpi-sub">{k.sub}</div>
                                <div className="gd-kpi-ico"><k.icon size={19} /></div>
                            </div>
                        ))}
                    </div>

                    <div className="gd-strip">
                        {[
                            { lbl: "Total Staff", val: staff.length },
                            { lbl: "Total Payroll", val: fmt(totalSalary) },
                            { lbl: "Paid This Month", val: paidCount },
                            { lbl: "Pending Payments", val: unpaidCount },
                        ].map((s, i, arr) => (
                            <React.Fragment key={i}>
                                <div className="gd-strip-item">
                                    <div className="gd-strip-lbl">{s.lbl}</div>
                                    <div className="gd-strip-val">{s.val}</div>
                                </div>
                                {i < arr.length - 1 && <div className="gd-strip-div" />}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="gd-panel">
                        <div className="gd-panel-head">
                            <div className="gd-ph-left">
                                <Users size={14} color="#fff" />
                                <p className="gd-ph-title">Staff List</p>
                                <span className="gd-ph-badge">{filtered.length} records</span>
                            </div>
                            <div className="gd-search-wrap">
                                <Search size={13} className="gd-search-ico" />
                                <input
                                    className="gd-search-inp"
                                    placeholder="Search name, position…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="gd-panel-body">
                            <table className="gd-tbl">
                                <thead>
                                    <tr>
                                        {["Name", "Position", "School / Section", "Basic Salary", "Allowances", "Total", "Status", "Actions"].map(h => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={8} className="gd-empty">No staff records found</td></tr>
                                    ) : filtered.map(s => {
                                        const total = Number(s.basicSalary || 0) + Number(s.allowances || 0);
                                        const isPaid = paidIds.has(s.id);
                                        return (
                                            <tr key={s.id}>
                                                <td style={{ fontWeight: 600 }}>{s.name}</td>
                                                <td><span className="gd-badge gd-badge-blue">{s.position}</span></td>
                                                <td style={{ color: "#5A7A90" }}>{s.school}{s.section ? ` · ${s.section}` : ""}</td>
                                                <td style={{ fontWeight: 600 }}>{fmt(s.basicSalary || 0)}</td>
                                                <td style={{ color: "#5A7A90" }}>{fmt(s.allowances || 0)}</td>
                                                <td style={{ fontWeight: 700, color: "#2b4557" }}>{fmt(total)}</td>
                                                <td>
                                                    {isPaid
                                                        ? <span className="gd-badge gd-badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle size={11} /> Paid</span>
                                                        : <span className="gd-badge gd-badge-red"><AlertCircle size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />Pending</span>
                                                    }
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <button className="gd-act gd-act-edit" title="Edit" onClick={() => handleOpen(s)}><Pencil size={13} /></button>
                                                        <button className="gd-act gd-act-del" title="Delete" onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
                                                        {isPaid
                                                            ? <span className="gd-act-paid"><CheckCircle size={12} /> Paid</span>
                                                            : <button className="gd-act-pay" onClick={() => handlePay(s.id)}>Pay</button>
                                                        }
                                                        <button className="gd-act-slip" title="Download Payslip" onClick={() => downloadPayslip(s)}><Download size={13} /></button>
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

            {showModal && (
                <div className="gd-overlay" onClick={() => setShowModal(false)}>
                    <div className="gd-modal" onClick={e => e.stopPropagation()}>
                        <div className="gd-modal-head">
                            <p className="gd-modal-title">{editData ? "Edit Staff Record" : "Add Group D Staff"}</p>
                            <button className="gd-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="gd-modal-body">
                            <div className="gd-field-row">
                                <div className="gd-field">
                                    <label>Full Name</label>
                                    <input placeholder="e.g. Anita Sharma" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="gd-field">
                                    <label>Position</label>
                                    <input placeholder="e.g. Office Clerk" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
                                </div>
                            </div>
                            <div className="gd-field-row">
                                <div className="gd-field">
                                    <label>School</label>
                                    <input placeholder="School name" value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
                                </div>
                                <div className="gd-field">
                                    <label>Section</label>
                                    <input placeholder="e.g. Accounts" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
                                </div>
                            </div>
                            <div className="gd-field-row">
                                <div className="gd-field">
                                    <label>Basic Salary (₹)</label>
                                    <input type="number" placeholder="0" value={form.basicSalary} onChange={e => setForm(f => ({ ...f, basicSalary: e.target.value }))} />
                                </div>
                                <div className="gd-field">
                                    <label>Allowances (₹)</label>
                                    <input type="number" placeholder="0" value={form.allowances} onChange={e => setForm(f => ({ ...f, allowances: e.target.value }))} />
                                </div>
                            </div>
                            <div className="gd-field">
                                <label>Status</label>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                    <option>Active</option>
                                    <option>On Leave</option>
                                    <option>Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div className="gd-modal-footer">
                            <button className="gd-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="gd-btn-save" onClick={handleSave}>{editData ? "Update" : "Add Staff"}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}