// src/components/finance/pages/Studentfinance/Addstudent.jsx
import React, { useState, useEffect } from "react";
import {
  X, ChevronDown, User, Mail, Phone, BookOpen,
  DollarSign, Plus, Minus, GraduationCap, Building2,
  AlertCircle, Calendar, Tag, Percent
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

// ── Read school from the logged-in finance user's auth ──────────────────────
const getAuthSchool = () => {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) {
      console.warn("[Addstudent] No auth found in localStorage");
      return { schoolId: "", schoolName: "Your School" };
    }
    const auth = JSON.parse(raw);
    const schoolId =
      auth.user?.schoolId ||
      auth.user?.school?.id ||
      auth.schoolId ||
      "";
    const schoolName =
      auth.user?.school?.name ||
      auth.schoolName ||
      "Your School";
    console.log("[Addstudent] schoolId resolved:", schoolId, "| name:", schoolName);
    return { schoolId, schoolName };
  } catch (e) {
    console.error("[Addstudent] getAuthSchool error:", e);
    return { schoolId: "", schoolName: "Your School" };
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().split("T")[0];

// ── Component ─────────────────────────────────────────────────────────────────
const Addstudent = ({ open, handleClose, addStudentData, editData }) => {

  // school — re-read from localStorage every time modal opens
  const [authSchool, setAuthSchool] = useState({ schoolId: "", schoolName: "Your School" });

  // cascade selects
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // auto-filled info
  const [studentInfo, setStudentInfo] = useState({ name: "", email: "", phone: "", course: "", studentId: "" });
  const [autoFilled, setAutoFilled] = useState(false);

  // ── Fee date ────────────────────────────────────────────────────────────────
  const [feeDate, setFeeDate] = useState(todayISO());

  // ── Fee rows state ──────────────────────────────────────────────────────────
  const DEFAULT_FEES = [
    { id: "college", label: "School Fee", amount: "", enabled: true, required: true, discountType: "none", discountValue: "" },
    { id: "tuition", label: "Tuition Fee", amount: "", enabled: true, required: false, discountType: "none", discountValue: "" },
    { id: "exam", label: "Exam Fee", amount: "", enabled: false, required: false, discountType: "none", discountValue: "" },
    { id: "transport", label: "Transport Fee", amount: "", enabled: false, required: false, discountType: "none", discountValue: "" },
    { id: "books", label: "Books Fee", amount: "", enabled: false, required: false, discountType: "none", discountValue: "" },
    { id: "lab", label: "Lab Fee", amount: "", enabled: false, required: false, discountType: "none", discountValue: "" },
  ];
  const [feeRows, setFeeRows] = useState(DEFAULT_FEES);
  const [customFees, setCustomFees] = useState([]); // [{ id, label, amount, discountType, discountValue }]

  // ui
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Duplicate guard ────────────────────────────────────────────────────────
  const [duplicateRecord, setDuplicateRecord] = useState(null); // existing StudentList record
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // ── Per-row discount calculation ───────────────────────────────────────────
  const calcRowTotal = (amount, discountType, discountValue) => {
    const amt = Number(amount || 0);
    if (discountType === "amount") {
      return Math.max(0, amt - Number(discountValue || 0));
    }
    if (discountType === "percentage") {
      return Math.max(0, amt - (amt * Number(discountValue || 0) / 100));
    }
    return amt;
  };

  // ── Grand total (after discounts) ─────────────────────────────────────────
  const grandTotal =
    feeRows.filter(r => r.enabled).reduce((s, r) => s + calcRowTotal(r.amount, r.discountType, r.discountValue), 0) +
    customFees.reduce((s, c) => s + calcRowTotal(c.amount, c.discountType, c.discountValue), 0);

  // ── Reset helper ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedClass(""); setSelectedStudentId("");
    setStudents([]); setAutoFilled(false);
    setStudentInfo({ name: "", email: "", phone: "", course: "", studentId: "" });
    setFeeRows(DEFAULT_FEES);
    setCustomFees([]);
    setFeeDate(todayISO());
    setError("");
    setDuplicateRecord(null);
  };

  // ── On open: re-read school from auth, fetch classes, restore editData ──────
  useEffect(() => {
    if (!open) return;
    resetForm();

    const school = getAuthSchool();
    setAuthSchool(school);

    if (school.schoolId) {
      const url = `${API_URL}/api/finance/classSections?schoolId=${school.schoolId}`;
      fetch(url)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(d => { setClasses(Array.isArray(d) ? d : []); })
        .catch(e => { console.error("[Addstudent] Failed to fetch classes:", e); setClasses([]); });
    }

    if (editData) {
      setStudentInfo({
        name: editData.name ?? "",
        email: editData.email ?? "",
        phone: editData.phone ?? "",
        course: editData.course ?? "",
        studentId: editData.id ?? "",
      });
      setAutoFilled(true);

      // Restore fee date if stored
      if (editData.feeDate) {
        setFeeDate(editData.feeDate.split("T")[0]);
      }

      let parsed = null;
      try {
        if (editData.feeBreakdown) parsed = JSON.parse(editData.feeBreakdown);
      } catch { parsed = null; }

      if (parsed) {
        const keyMap = {
          collegeFee: "college",
          tuitionFee: "tuition",
          examFee: "exam",
          transportFee: "transport",
          booksFee: "books",
          labFee: "lab",
        };

        if (!parsed.collegeFee && editData.fees) {
          const otherSum = ["tuitionFee", "examFee", "transportFee", "booksFee", "labFee", "miscFee"]
            .reduce((s, k) => s + Number(parsed[k] || 0), 0);
          const customSum = (parsed.customFees || []).reduce((s, c) => s + Number(c.amount || 0), 0);
          parsed.collegeFee = Math.max(0, Number(editData.fees) - otherSum - customSum);
        }

        setFeeRows(DEFAULT_FEES.map(row => {
          const jsonKey = Object.keys(keyMap).find(k => keyMap[k] === row.id);
          const stored = jsonKey ? parsed[jsonKey] : null;
          const amt = stored ? Number(stored.amount ?? stored ?? 0) : 0;
          const dType = (stored && stored.discountType) ? stored.discountType : "none";
          const dVal = (stored && stored.discountValue) ? String(stored.discountValue) : "";
          return {
            ...row,
            amount: amt > 0 ? String(amt) : "",
            discountType: dType,
            discountValue: dVal,
            enabled: row.required || amt > 0,
          };
        }));

        if (Array.isArray(parsed.customFees) && parsed.customFees.length > 0) {
          setCustomFees(parsed.customFees.map((c, i) => ({
            id: `custom_edit_${i}`,
            label: c.label || "",
            amount: c.amount ? String(c.amount) : "",
            discountType: c.discountType || "none",
            discountValue: c.discountValue ? String(c.discountValue) : "",
          })));
        }
      } else if (editData.fees) {
        setFeeRows(DEFAULT_FEES.map(row =>
          row.id === "college"
            ? { ...row, amount: String(Number(editData.fees)), enabled: true }
            : row
        ));
      }
    }
  }, [open, editData]);

  // ── Class change → fetch students ─────────────────────────────────────────
  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setSelectedStudentId("");
    setStudents([]);
    setAutoFilled(false);
    if (!classId) return;
    try {
      const res = await fetch(`${API_URL}/api/finance/studentsByClass?classSectionId=${classId}`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);

      const feeRes = await fetch(`${API_URL}/api/finance/classFee?classSectionId=${classId}`);
      const feeData = await feeRes.json();
      if (feeData) {
        const total = Number(feeData.feeAmount || 0);
        setFeeRows(prev =>
          prev.map(row => {
            if (row.id === "college") {
              return { ...row, amount: total ? String(total) : "", enabled: true };
            }
            return { ...row, amount: "", enabled: row.required };
          })
        );
      }
    } catch (err) {
      console.error(err);
      setStudents([]);
    }
  };

  // ── Student change → auto-fill + duplicate check ───────────────────────────
  const handleStudentChange = async (e) => {
    const sid = e.target.value;
    setSelectedStudentId(sid);
    setDuplicateRecord(null);
    setError("");

    if (!sid) {
      setStudentInfo({ name: "", email: "", phone: "", course: "", studentId: "" });
      setAutoFilled(false);
      return;
    }

    const enrollment = students.find(s => s.student?.id === sid);
    if (!enrollment) return;
    const st = enrollment.student;
    const cs = enrollment.classSection;

    setStudentInfo({
      name: st.name ?? "",
      email: st.email ?? "",
      phone: st.personalInfo?.phone ?? "",
      course: cs?.name ?? `${cs?.grade ?? ""} ${cs?.section ?? ""}`.trim(),
      studentId: st.id,
    });
    setAutoFilled(true);

    // Check if a fee record already exists for this student
    try {
      setCheckingDuplicate(true);
      const auth = JSON.parse(localStorage.getItem("auth"));
      const token = auth?.token;
      const res = await fetch(`${API_URL}/api/finance/getStudentFinance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const allRecords = await res.json();
        const existing = allRecords.find(r => r.studentId === st.id && !r.deletedAt);
        if (existing) setDuplicateRecord(existing);
      }
    } catch (err) {
      console.error("[Addstudent] Duplicate check error:", err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // ── Fee helpers ────────────────────────────────────────────────────────────
  const toggleFee = (id) => setFeeRows(rows => rows.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const updateFee = (id, val) => setFeeRows(rows => rows.map(r => r.id === id ? { ...r, amount: val } : r));
  const updateFeeDiscount = (id, field, val) =>
    setFeeRows(rows => rows.map(r => r.id === id ? { ...r, [field]: val } : r));

  const addCustomFee = () =>
    setCustomFees(prev => [...prev, { id: `custom_${Date.now()}`, label: "", amount: "", discountType: "none", discountValue: "" }]);
  const updateCustom = (id, field, val) =>
    setCustomFees(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  const removeCustom = (id) =>
    setCustomFees(prev => prev.filter(c => c.id !== id));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentInfo.name) return setError("Please select a student.");
    const hasAnyFee = feeRows.some(r => r.enabled && Number(r.amount) > 0) || customFees.some(c => Number(c.amount) > 0);
    if (!hasAnyFee) return setError("Please enter at least one fee amount.");
    setLoading(true); setError("");
    try {
      // Build fee breakdown including discount info per row
      const feeBreakdownData = {};
      feeRows.forEach(r => {
        const keyMap = { college: "collegeFee", tuition: "tuitionFee", exam: "examFee", transport: "transportFee", books: "booksFee", lab: "labFee" };
        const key = keyMap[r.id];
        if (key) {
          feeBreakdownData[key] = {
            amount: r.enabled ? Number(r.amount || 0) : 0,
            discountType: r.discountType || "none",
            discountValue: Number(r.discountValue || 0),
            total: r.enabled ? calcRowTotal(r.amount, r.discountType, r.discountValue) : 0,
          };
        }
      });

      const payload = {
        studentId: studentInfo.studentId,
        name: studentInfo.name,
        email: studentInfo.email,
        phone: studentInfo.phone,
        course: studentInfo.course,
        fees: grandTotal,
        address: "",
        feeDate: feeDate,
        // flat amounts for backward compat
        collegeFee: feeBreakdownData.collegeFee?.total ?? 0,
        tuitionFee: feeBreakdownData.tuitionFee?.total ?? 0,
        examFee: feeBreakdownData.examFee?.total ?? 0,
        transportFee: feeBreakdownData.transportFee?.total ?? 0,
        booksFee: feeBreakdownData.booksFee?.total ?? 0,
        labFee: feeBreakdownData.labFee?.total ?? 0,
        customFees: customFees.map(c => ({
          label: c.label,
          amount: Number(c.amount || 0),
          discountType: c.discountType || "none",
          discountValue: Number(c.discountValue || 0),
          total: calcRowTotal(c.amount, c.discountType, c.discountValue),
        })),
        // full breakdown with discount details
        feeBreakdownDetails: feeBreakdownData,
      };

      const auth = JSON.parse(localStorage.getItem("auth"));
      const token = auth?.token;

      let url, method;
      if (editData) {
        url = `${API_URL}/api/finance/updateStudentFinance/${editData.id}`;
        method = "PUT";
      } else {
        url = `${API_URL}/api/finance/addStudentFinance`;
        method = "POST";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      addStudentData(result);
      handleClose(); resetForm();
    } catch (err) {
      setError(err.message || "Failed to save. Please try again.");
    } finally { setLoading(false); }
  };

  if (!open) return null;

  // ── Helper: discount display text ──────────────────────────────────────────
  const discountLabel = (row) => {
    if (!row.discountValue || row.discountType === "none") return null;
    const disc = row.discountType === "percentage"
      ? `${row.discountValue}%`
      : `₹${Number(row.discountValue).toLocaleString("en-IN")}`;
    return disc;
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        :root {
          --br:#3f556c; --brd:#2e3f52; --brp:#1e2c3a; --brl:#5a7390;
          --bm:#eef1f4; --bf:#dce3ea; --bg:rgba(63,85,108,.15);
          --ex:#7c3aed; --exm:#f5f3ff; --exf:#ede9fe;
          --gr:#059669; --grm:#ecfdf5; --grf:#d1fae5;
          --am:#b45309; --amm:#fffbeb; --amf:#fef3c7;
        }
        .as-ov{position:fixed;inset:0;background:rgba(15,25,36,.76);backdrop-filter:blur(7px);
          display:flex;justify-content:center;align-items:center;z-index:1000;
          font-family:'Sora',sans-serif;padding:20px;}
        .as-mod{background:#fff;border-radius:22px;width:100%;max-width:580px;
          max-height:92vh;overflow-y:auto;
          box-shadow:0 32px 80px rgba(15,25,36,.28),0 0 0 1px var(--bf);
          animation:su .3s cubic-bezier(.16,1,.3,1);}
        .as-mod::-webkit-scrollbar{width:4px}
        .as-mod::-webkit-scrollbar-thumb{background:var(--bf);border-radius:4px}
        @keyframes su{from{opacity:0;transform:translateY(22px) scale(.97)}to{opacity:1;transform:none}}

        .as-hd{background:linear-gradient(135deg,var(--br),var(--brd));padding:22px 26px;
          border-radius:22px 22px 0 0;display:flex;align-items:flex-start;justify-content:space-between;}
        .as-ttl{font-size:18px;font-weight:700;color:#fff;margin:0;letter-spacing:-.3px}
        .as-sub{font-size:12px;color:rgba(255,255,255,.55);margin:3px 0 0}
        .as-cx{width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.15);
          display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;flex-shrink:0}
        .as-cx:hover{background:rgba(255,255,255,.28)}

        .as-bd{padding:20px 26px 26px;display:flex;flex-direction:column;gap:18px}
        .as-sl{font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;
          color:var(--brl);margin-bottom:9px;display:flex;align-items:center;gap:6px}

        .as-sbadge{display:flex;align-items:center;gap:11px;background:linear-gradient(135deg,#eef1f4,#e4ecf2);
          border:1.5px solid var(--bf);border-radius:12px;padding:12px 16px}
        .as-sicon{width:36px;height:36px;border-radius:10px;flex-shrink:0;
          background:linear-gradient(135deg,var(--br),var(--brd));
          display:flex;align-items:center;justify-content:center}
        .as-sname{font-size:13.5px;font-weight:600;color:var(--brp)}
        .as-shint{font-size:10.5px;color:var(--brl);margin-top:2px}

        .as-f{display:flex;flex-direction:column;gap:6px}
        .as-lbl{font-size:12px;font-weight:600;color:var(--brd);display:flex;align-items:center;gap:5px}
        .as-lbl svg{color:var(--brl)}
        .as-sel,.as-inp{width:100%;padding:10px 14px;border:1.5px solid var(--bf);border-radius:10px;
          font-size:13.5px;font-family:'Sora',sans-serif;color:#1e293b;background:var(--bm);
          outline:none;transition:all .2s;box-sizing:border-box;appearance:none;-webkit-appearance:none}
        .as-sel:focus,.as-inp:focus{border-color:var(--br);background:#fff;box-shadow:0 0 0 3px var(--bg)}
        .as-sw{position:relative}
        .as-sw>svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--brl)}

        /* Fee date row */
        .as-date-row{display:flex;align-items:center;gap:10px;background:var(--amm);
          border:1.5px solid #fde68a;border-radius:12px;padding:11px 16px;}
        .as-date-icon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#d97706,#b45309);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .as-date-label{font-size:11px;font-weight:700;color:var(--am);text-transform:uppercase;letter-spacing:.6px}
        .as-date-hint{font-size:10px;color:#92400e;margin-top:1px}
        .as-date-inp{border:1.5px solid #fde68a;background:#fff;border-radius:8px;
          padding:7px 10px;font-size:13px;font-family:'Sora',sans-serif;color:#1e293b;
          outline:none;transition:border-color .2s;flex-shrink:0;}
        .as-date-inp:focus{border-color:#d97706;box-shadow:0 0 0 3px rgba(217,119,6,.15)}

        .as-ig{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .as-ic{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:10px 14px}
        .as-icl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;
          color:#15803d;margin-bottom:3px;display:flex;align-items:center;gap:4px}
        .as-icv{font-size:13px;font-weight:500;color:#14532d}
        .as-ph{display:flex;align-items:center;gap:9px;background:var(--bm);
          border:1.5px dashed var(--bf);border-radius:10px;padding:14px 16px;
          color:var(--brl);font-size:12.5px}

        /* Duplicate student warning banner */
        .as-dup{background:#fff7ed;border:2px solid #fb923c;border-radius:14px;
          padding:16px 18px;display:flex;gap:14px;align-items:flex-start;}
        .as-dup-icon{width:38px;height:38px;border-radius:10px;flex-shrink:0;
          background:linear-gradient(135deg,#f97316,#ea580c);
          display:flex;align-items:center;justify-content:center;}
        .as-dup-title{font-size:13.5px;font-weight:700;color:#9a3412;margin-bottom:3px;}
        .as-dup-msg{font-size:12px;color:#c2410c;line-height:1.5;}
        .as-dup-meta{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}
        .as-dup-chip{font-size:11px;font-weight:600;background:#fed7aa;color:#9a3412;
          padding:3px 9px;border-radius:20px;font-family:'JetBrains Mono',monospace;}
        .as-dup-block{flex:1;min-width:0;}
        .as-checking{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--brl);
          background:var(--bm);border:1.5px solid var(--bf);border-radius:10px;padding:10px 14px;}
        @keyframes as-spin{to{transform:rotate(360deg)}}
        .as-spinner{width:14px;height:14px;border:2px solid var(--bf);
          border-top-color:var(--br);border-radius:50%;animation:as-spin .7s linear infinite;flex-shrink:0;}

        .as-div{height:1px;background:var(--bf)}

        /* ── Fee list ── */
        .as-fee-list{border:1.5px solid var(--bf);border-radius:16px;overflow:hidden;}

        /* numbered row */
        .as-fee-row{display:flex;align-items:stretch;gap:0;
          border-bottom:1px solid var(--bf);transition:background .15s;flex-wrap:wrap;}
        .as-fee-row:last-child{border-bottom:none}
        .as-fee-row.disabled{opacity:.45;}

        .as-fee-num{width:38px;min-width:38px;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:var(--brl);
          font-family:'JetBrains Mono',monospace;
          border-right:1px solid var(--bf);background:var(--bm);flex-shrink:0;}

        .as-fee-label-wrap{flex:1;padding:0 14px;display:flex;flex-direction:column;justify-content:center;min-width:0;}
        .as-fee-label-text{font-size:13px;font-weight:600;color:var(--brp);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .as-fee-label-input{border:none;outline:none;background:transparent;
          font-size:13px;font-weight:600;color:var(--brp);font-family:'Sora',sans-serif;width:100%;}
        .as-fee-label-input::placeholder{color:#c5cfd8}
        .as-fee-tag{font-size:9.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;
          padding:1px 6px;border-radius:20px;margin-top:2px;display:inline-block;width:fit-content;}
        .as-fee-tag-req{background:#fee2e2;color:#b91c1c}
        .as-fee-tag-opt{background:var(--bf);color:var(--brl)}
        .as-fee-tag-custom{background:var(--exf);color:var(--ex)}

        /* main amount side */
        .as-fee-main{display:flex;align-items:stretch;flex-shrink:0;min-height:52px;}

        /* amount input side */
        .as-fee-amount-side{display:flex;align-items:center;gap:0;flex-shrink:0;
          border-left:1px solid var(--bf);height:52px;}
        .as-fee-sym{padding:0 8px 0 12px;font-size:14px;font-weight:600;
          color:var(--brl);font-family:'JetBrains Mono',monospace;}
        .as-fee-amt{border:none;outline:none;background:transparent;
          font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;
          color:var(--brp);width:90px;padding:0 12px 0 0;}
        .as-fee-amt::placeholder{color:#d1d9e0}
        .as-fee-amt:disabled{color:#c5cfd8}

        /* Discount section (sub-row) */
        .as-disc-row{width:100%;border-top:1px dashed var(--bf);
          display:flex;align-items:center;gap:0;background:#fafbfc;padding:0;}
        .as-disc-spacer{width:38px;min-width:38px;border-right:1px solid var(--bf);
          background:var(--bm);align-self:stretch;}
        .as-disc-inner{flex:1;display:flex;align-items:center;gap:8px;padding:7px 14px;flex-wrap:wrap;}
        .as-disc-lbl{font-size:10px;font-weight:700;color:var(--brl);letter-spacing:.5px;text-transform:uppercase;
          display:flex;align-items:center;gap:4px;white-space:nowrap;}
        .as-disc-type{border:1.5px solid var(--bf);border-radius:8px;padding:4px 8px;
          font-size:11.5px;font-family:'Sora',sans-serif;color:var(--brp);background:#fff;
          outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;}
        .as-disc-type:focus{border-color:var(--br);}
        .as-disc-val-wrap{display:flex;align-items:center;gap:4px;}
        .as-disc-sym{font-size:12px;color:var(--brl);font-family:'JetBrains Mono',monospace;}
        .as-disc-val{border:1.5px solid var(--bf);border-radius:8px;padding:4px 8px;
          font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace;
          color:var(--brp);width:80px;outline:none;background:#fff;}
        .as-disc-val:focus{border-color:var(--br);}
        .as-disc-result{font-size:11px;color:var(--gr);font-weight:600;
          background:var(--grm);border:1px solid var(--grf);border-radius:6px;
          padding:3px 8px;font-family:'JetBrains Mono',monospace;white-space:nowrap;margin-left:auto;}

        /* toggle switch */
        .as-toggle-wrap{padding:0 14px;border-left:1px solid var(--bf);
          display:flex;align-items:center;flex-shrink:0;align-self:stretch;}
        .as-toggle{position:relative;width:36px;height:20px;cursor:pointer;flex-shrink:0;}
        .as-toggle input{opacity:0;width:0;height:0;position:absolute}
        .as-toggle-slider{position:absolute;inset:0;border-radius:20px;background:#dce3ea;transition:background .2s;}
        .as-toggle-slider::before{content:'';position:absolute;width:14px;height:14px;border-radius:50%;
          background:#fff;top:3px;left:3px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);}
        .as-toggle input:checked+.as-toggle-slider{background:var(--br)}
        .as-toggle input:checked+.as-toggle-slider::before{transform:translateX(16px)}

        /* delete btn for custom */
        .as-del-btn{padding:0 12px;border-left:1px solid var(--bf);
          display:flex;align-items:center;cursor:pointer;color:#cbd5e1;
          background:none;border-top:none;border-bottom:none;border-right:none;
          transition:color .15s;flex-shrink:0;}
        .as-del-btn:hover{color:#ef4444}

        /* add custom row */
        .as-add-custom{display:flex;align-items:center;gap:8px;padding:12px 16px;cursor:pointer;
          background:linear-gradient(135deg,var(--exm),#faf8ff);
          border-top:1.5px dashed #c4b5fd;color:var(--ex);font-size:13px;font-weight:600;
          transition:background .15s;border:none;width:100%;font-family:'Sora',sans-serif;
          border-radius:0 0 14px 14px;}
        .as-add-custom:hover{background:var(--exf)}

        /* total bar */
        .as-tb{background:linear-gradient(135deg,var(--br),var(--brp));
          border-radius:14px;padding:16px 22px;
          display:flex;align-items:center;justify-content:space-between;}
        .as-tl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.6)}
        .as-ts{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px}
        .as-ta{font-size:30px;font-weight:700;color:#fff;font-family:'JetBrains Mono',monospace;letter-spacing:-1px}
        .as-tcs{font-size:18px;opacity:.65;margin-right:2px}

        .as-err{background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;padding:10px 14px;
          font-size:12.5px;color:#b91c1c;display:flex;align-items:center;gap:7px}

        .as-act{display:flex;gap:10px}
        .as-bp{flex:1;padding:12px 20px;background:linear-gradient(135deg,var(--br),var(--brd));
          color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;
          font-family:'Sora',sans-serif;cursor:pointer;transition:all .2s;letter-spacing:.2px}
        .as-bp:hover:not(:disabled){background:linear-gradient(135deg,var(--brd),var(--brp));
          transform:translateY(-1px);box-shadow:0 6px 20px rgba(63,85,108,.4)}
        .as-bp:disabled{opacity:.6;cursor:not-allowed}
        .as-bs{padding:12px 20px;background:var(--bm);color:var(--br);border:1.5px solid var(--bf);
          border-radius:10px;font-size:14px;font-weight:600;
          font-family:'Sora',sans-serif;cursor:pointer;transition:all .2s}
        .as-bs:hover{background:var(--bf);color:var(--brd)}

        @media (max-width: 600px) {
          .as-ov { padding: 12px; }
          .as-mod { max-width: 100%; border-radius: 16px; }
          .as-hd { padding: 16px 18px; border-radius: 16px 16px 0 0; }
          .as-bd { padding: 14px 16px 20px; gap: 14px; }
          .as-ttl { font-size: 15px; }
          .as-ig { grid-template-columns: 1fr; }
          .as-act { flex-direction: column; }
          .as-bp, .as-bs { width: 100%; }
          .as-fee-sym { padding: 0 6px 0 8px; }
          .as-fee-amt { width: 70px; }
          .as-fee-label-text { font-size: 12px; }
          .as-fee-num { width: 32px; min-width: 32px; font-size: 10px; }
          .as-ta { font-size: 24px; }
          .as-disc-spacer { width: 32px; min-width: 32px; }
        }
      `}</style>

      <div className="as-ov">
        <div className="as-mod">

          {/* Header */}
          <div className="as-hd">
            <div>
              <h2 className="as-ttl">{editData ? "Edit Student Fees" : "Add Student Fees"}</h2>
              <p className="as-sub">{editData ? "Edit existing fee record" : "School auto-detected • Select class then student"}</p>
            </div>
            <button className="as-cx" onClick={handleClose}><X size={15} /></button>
          </div>

          <div className="as-bd">

            {/* School */}
            <div>
              <p className="as-sl">School</p>
              <div className="as-sbadge">
                <div className="as-sicon"><Building2 size={16} color="#fff" /></div>
                <div>
                  <div className="as-sname">{authSchool.schoolName}</div>
                  <div className="as-shint">Auto-detected from your login session</div>
                </div>
              </div>
            </div>

            {/* Fee Date */}
            <div>
              <p className="as-sl">Fee Entry Date</p>
              <div className="as-date-row">
                <div className="as-date-icon"><Calendar size={16} color="#fff" /></div>
                <div style={{ flex: 1 }}>
                  <div className="as-date-label">Payment Date</div>
                  <div className="as-date-hint">Select the date the fee was actually received</div>
                </div>
                <input
                  type="date"
                  className="as-date-inp"
                  value={feeDate}
                  max={todayISO()}
                  onChange={e => setFeeDate(e.target.value)}
                />
              </div>
            </div>

            {/* Class + Student — only for adding new student, hidden in edit mode */}
            {!editData && (<>
              <div>
                <p className="as-sl">Class</p>
                <div className="as-f">
                  <label className="as-lbl"><GraduationCap size={13} /> Select Class</label>
                  <div className="as-sw">
                    <select className="as-sel" value={selectedClass} onChange={handleClassChange}>
                      <option value="">— Choose a class —</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name || `${c.grade} - ${c.section}`}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
              <div>
                <p className="as-sl">Student</p>
                <div className="as-f">
                  <label className="as-lbl"><User size={13} /> Select Student</label>
                  <div className="as-sw">
                    <select className="as-sel" value={selectedStudentId} onChange={handleStudentChange}
                      disabled={!selectedClass} style={{ opacity: !selectedClass ? .55 : 1 }}>
                      <option value="">{!selectedClass ? "Select a class first" : students.length === 0 ? "No students in this class" : "— Choose a student —"}</option>
                      {students.map(s => (
                        <option key={s.student?.id} value={s.student?.id}>{s.student?.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </>)}

            {/* Edit mode: show student name as read-only badge */}
            {editData && (
              <div>
                <p className="as-sl">Student</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#eef1f4,#e4ecf2)", border: "1.5px solid var(--bf)", borderRadius: 12, padding: "11px 16px" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,var(--br),var(--brd))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={15} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--brp)" }}>{editData.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--brl)", marginTop: 2 }}>Editing existing record — ID #{editData.id}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Checking spinner ── */}
            {checkingDuplicate && (
              <div className="as-checking">
                <div className="as-spinner" />
                Checking for existing fee record…
              </div>
            )}

            {/* ── Duplicate warning banner ── */}
            {duplicateRecord && !checkingDuplicate && (
              <div className="as-dup">
                <div className="as-dup-icon">
                  <AlertCircle size={18} color="#fff" />
                </div>
                <div className="as-dup-block">
                  <div className="as-dup-title">Fee Record Already Exists</div>
                  <div className="as-dup-msg">
                    <strong>{duplicateRecord.name}</strong> already has a fee record in the system.
                    Adding a duplicate is not allowed — use the <strong>Edit</strong> option on the existing record to make changes.
                  </div>
                  <div className="as-dup-meta">
                    <span className="as-dup-chip">₹{Number(duplicateRecord.fees || 0).toLocaleString("en-IN")}</span>
                    <span className="as-dup-chip">{duplicateRecord.paymentStatus || "Unpaid"}</span>
                    {duplicateRecord.feeDate && (
                      <span className="as-dup-chip">
                        {new Date(duplicateRecord.feeDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Auto-filled Info */}
            <div>
              <p className="as-sl">
                Student Info
                {autoFilled && <span style={{ fontSize: 10, fontWeight: 700, background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 20 }}>AUTO-FILLED ✓</span>}
              </p>
              {autoFilled ? (
                <div className="as-ig">
                  <div className="as-ic">
                    <div className="as-icl"><Mail size={9} /> Email</div>
                    <div className="as-icv">{studentInfo.email || "—"}</div>
                  </div>
                  <div className="as-ic">
                    <div className="as-icl"><Phone size={9} /> Phone</div>
                    <div className="as-icv">{studentInfo.phone || "—"}</div>
                  </div>
                  <div className="as-ic" style={{ gridColumn: "1 / -1" }}>
                    <div className="as-icl"><BookOpen size={9} /> Course / Class</div>
                    <div className="as-icv">{studentInfo.course || "—"}</div>
                  </div>
                </div>
              ) : (
                <div className="as-ph">
                  <AlertCircle size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  Select a class and student above — email, phone &amp; course will appear here automatically.
                </div>
              )}
            </div>

            <div className="as-div" />

            {/* Fees */}
            <div>
              <p className="as-sl">Fees Breakdown</p>

              <div className="as-fee-list">
                {feeRows.map((row, idx) => (
                  <div key={row.id} className={`as-fee-row${!row.enabled ? " disabled" : ""}`}>

                    {/* Main row line */}
                    <div style={{ display: "flex", alignItems: "stretch", width: "100%", minHeight: 52 }}>
                      {/* number */}
                      <div className="as-fee-num">{String(idx + 1).padStart(2, "0")}</div>

                      {/* label */}
                      <div className="as-fee-label-wrap">
                        <div className="as-fee-label-text">{row.label}</div>
                        <span className={`as-fee-tag ${row.required ? "as-fee-tag-req" : "as-fee-tag-opt"}`}>
                          {row.required ? "Required" : "Optional"}
                        </span>
                      </div>

                      {/* amount input */}
                      <div className="as-fee-amount-side">
                        <span className="as-fee-sym">₹</span>
                        <input
                          className="as-fee-amt"
                          type="number"
                          placeholder="0"
                          disabled={!row.enabled}
                          value={row.amount}
                          onChange={e => updateFee(row.id, e.target.value)}
                        />
                      </div>

                      {/* toggle (not for required rows) */}
                      {!row.required ? (
                        <div className="as-toggle-wrap">
                          <label className="as-toggle">
                            <input type="checkbox" checked={row.enabled} onChange={() => toggleFee(row.id)} />
                            <span className="as-toggle-slider" />
                          </label>
                        </div>
                      ) : (
                        <div style={{ width: 64 }} />
                      )}
                    </div>

                    {/* Discount sub-row — only shown when enabled and has an amount */}
                    {row.enabled && Number(row.amount) > 0 && (
                      <div className="as-disc-row">
                        <div className="as-disc-spacer" />
                        <div className="as-disc-inner">
                          <span className="as-disc-lbl"><Tag size={10} /> Discount</span>
                          <select
                            className="as-disc-type"
                            value={row.discountType}
                            onChange={e => updateFeeDiscount(row.id, "discountType", e.target.value)}
                          >
                            <option value="none">No Discount</option>
                            <option value="amount">Fixed (₹)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>

                          {row.discountType !== "none" && (
                            <div className="as-disc-val-wrap">
                              <span className="as-disc-sym">{row.discountType === "percentage" ? "%" : "₹"}</span>
                              <input
                                className="as-disc-val"
                                type="number"
                                placeholder="0"
                                min="0"
                                max={row.discountType === "percentage" ? 100 : row.amount}
                                value={row.discountValue}
                                onChange={e => updateFeeDiscount(row.id, "discountValue", e.target.value)}
                              />
                            </div>
                          )}

                          {row.discountType !== "none" && Number(row.discountValue) > 0 && (
                            <div className="as-disc-result">
                              → ₹{calcRowTotal(row.amount, row.discountType, row.discountValue).toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Custom fee rows */}
                {customFees.map((cf, idx) => (
                  <div key={cf.id} className="as-fee-row">
                    {/* Main line */}
                    <div style={{ display: "flex", alignItems: "stretch", width: "100%", minHeight: 52 }}>
                      <div className="as-fee-num">{String(feeRows.length + idx + 1).padStart(2, "0")}</div>
                      <div className="as-fee-label-wrap">
                        <input
                          className="as-fee-label-input"
                          placeholder="Enter fee name…"
                          value={cf.label}
                          onChange={e => updateCustom(cf.id, "label", e.target.value)}
                        />
                        <span className="as-fee-tag as-fee-tag-custom">Custom</span>
                      </div>
                      <div className="as-fee-amount-side">
                        <span className="as-fee-sym">₹</span>
                        <input
                          className="as-fee-amt"
                          type="number"
                          placeholder="0"
                          value={cf.amount}
                          onChange={e => updateCustom(cf.id, "amount", e.target.value)}
                        />
                      </div>
                      <button className="as-del-btn" onClick={() => removeCustom(cf.id)}>
                        <X size={14} />
                      </button>
                    </div>

                    {/* Discount sub-row for custom */}
                    {Number(cf.amount) > 0 && (
                      <div className="as-disc-row">
                        <div className="as-disc-spacer" />
                        <div className="as-disc-inner">
                          <span className="as-disc-lbl"><Tag size={10} /> Discount</span>
                          <select
                            className="as-disc-type"
                            value={cf.discountType}
                            onChange={e => updateCustom(cf.id, "discountType", e.target.value)}
                          >
                            <option value="none">No Discount</option>
                            <option value="amount">Fixed (₹)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>

                          {cf.discountType !== "none" && (
                            <div className="as-disc-val-wrap">
                              <span className="as-disc-sym">{cf.discountType === "percentage" ? "%" : "₹"}</span>
                              <input
                                className="as-disc-val"
                                type="number"
                                placeholder="0"
                                min="0"
                                max={cf.discountType === "percentage" ? 100 : cf.amount}
                                value={cf.discountValue}
                                onChange={e => updateCustom(cf.id, "discountValue", e.target.value)}
                              />
                            </div>
                          )}

                          {cf.discountType !== "none" && Number(cf.discountValue) > 0 && (
                            <div className="as-disc-result">
                              → ₹{calcRowTotal(cf.amount, cf.discountType, cf.discountValue).toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add custom button */}
                <button className="as-add-custom" onClick={addCustomFee}>
                  <Plus size={14} />
                  Add Custom Fee
                </button>
              </div>
            </div>

            {/* Grand Total */}
            <div className="as-tb">
              <div>
                <div className="as-tl">Grand Total (After Discounts)</div>
                <div className="as-ts">
                  {feeRows.filter(r => r.enabled && Number(r.amount) > 0).length + customFees.filter(c => Number(c.amount) > 0).length} fee component(s) •{" "}
                  Date: {feeDate ? new Date(feeDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </div>
              </div>
              <div className="as-ta">
                <span className="as-tcs">₹</span>
                {grandTotal.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="as-err">
                <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
              </div>
            )}

            {/* Actions */}
            <div className="as-act">
              <button className="as-bp" onClick={handleSubmit} disabled={loading || !!duplicateRecord || checkingDuplicate}>
                {loading ? "Saving…" : checkingDuplicate ? "Checking…" : duplicateRecord ? "Record Already Exists" : editData ? "Update Fees" : "Save Student Fees"}
              </button>
              <button className="as-bs" onClick={handleClose}>Cancel</button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Addstudent;