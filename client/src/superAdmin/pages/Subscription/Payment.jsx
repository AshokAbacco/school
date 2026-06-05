// src/superAdmin/pages/Subscription/Payment.jsx
// ✅ Fully responsive: mobile (bottom-sheet), tablet (single col scroll), desktop (two-col)
// ✅ Auto-fetches last payment → pre-fills form + student/teacher counts
// ✅ All API calls go to /api/subscription/* (upgrade flow → stores in Subscription table)

import { useState, useRef, useEffect } from "react";
import {
  X, Shield, Zap, Crown, Users, CheckCircle2, ChevronRight,
  Sparkles, Lock, GraduationCap, BookOpen, RefreshCw, AlertCircle,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const PLANS = [
  {
    id: "silver", name: "Silver", price: 300, icon: Shield, color: "#6A89A7",
    features: ["1 School", "Basic reports", "Email support"],
  },
  {
    id: "gold", name: "Gold", price: 500, icon: Zap, color: "#88BDF2",
    features: ["Up to 5 Schools", "Advanced analytics", "Priority support"],
  },
  {
    id: "premium", name: "Premium", price: 300, icon: Crown, color: "#384959",
    features: ["Unlimited schools", "Full suite", "24/7 dedicated support"],
  },
];

const MIN_STUDENTS = 5;
const MIN_TEACHERS = 2;

// ─── Counter ─────────────────────────────────────────────────────────────────
function Counter({ label, icon: Icon, value, setValue, errorKey, errors, setErrors, minVal }) {
  const [inputVal, setInputVal] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setInputVal(String(value));
  }, [value]);

  const dec = () => {
    const next = Math.max(minVal, value - 1);
    setValue(next);
    if (errors[errorKey]) setErrors(p => ({ ...p, [errorKey]: "" }));
  };
  const inc = () => {
    setValue(value + 1);
    if (errors[errorKey]) setErrors(p => ({ ...p, [errorKey]: "" }));
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className="text-blue-300/60" />
        <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={dec} aria-label={`Decrease ${label}`}
          className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl border border-blue-300/25 bg-blue-300/10 text-blue-200 text-xl font-light flex items-center justify-center active:scale-95 hover:bg-blue-300/20 transition-all flex-shrink-0"
        >−</button>
        <input
          type="number" min={minVal} value={inputVal}
          onFocus={() => { focused.current = true; }}
          onChange={e => {
            setInputVal(e.target.value);
            if (errors[errorKey]) setErrors(p => ({ ...p, [errorKey]: "" }));
          }}
          onBlur={() => {
            focused.current = false;
            const n = parseInt(inputVal, 10);
            const c = isNaN(n) || n < minVal ? minVal : n;
            setValue(c);
            setInputVal(String(c));
          }}
          aria-label={`${label} count`}
          className={`w-14 h-9 sm:h-8 rounded-xl border text-center text-sm font-bold text-white outline-none transition-all
            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
            focus:border-blue-300/60
            ${errors[errorKey] ? "border-red-400/70" : "border-blue-300/25"}
          `}
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <button type="button" onClick={inc} aria-label={`Increase ${label}`}
          className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl border border-blue-300/25 bg-blue-300/10 text-blue-200 text-xl font-light flex items-center justify-center active:scale-95 hover:bg-blue-300/20 transition-all flex-shrink-0"
        >+</button>
      </div>
      {errors[errorKey] && (
        <p className="text-[10px] text-red-400 mt-1.5">⚠ {errors[errorKey]}</p>
      )}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ id, label, name, type = "text", placeholder, autoComplete, value, onChange, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-[#384959] tracking-[0.3px]">
        {label}
      </label>
      <input
        id={id} name={name} type={type}
        placeholder={placeholder} autoComplete={autoComplete}
        value={value} onChange={onChange}
        className={`h-11 rounded-xl border-[1.5px] px-3.5 text-[14px] text-[#384959] bg-[#fafcfe] outline-none transition-all font-dm placeholder:text-[#b0c4d8]
          focus:border-[#88BDF2] focus:shadow-[0_0_0_3px_rgba(136,189,242,0.15)]
          ${error ? "border-[#f87171] shadow-[0_0_0_3px_rgba(248,113,113,0.1)]" : "border-[#dde7f0]"}
        `}
      />
      {error && <span className="text-[11px] text-red-500">⚠ {error}</span>}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function PaymentModal({ isOpen, onClose, selectedPlanId, isUpgrade = true }) {
  const [studentCount, setStudentCount] = useState(MIN_STUDENTS);
  const [teacherCount, setTeacherCount] = useState(MIN_TEACHERS);
  const [loading,      setLoading]      = useState(false);
  const [prefilling,   setPrefilling]   = useState(false);
  const [errors,       setErrors]       = useState({});
  const [hasPrefilled, setHasPrefilled] = useState(false);

  const [form, setForm] = useState({
    fullName: "", schoolName: "", email: "", phone: "", address: "",
  });

  // ── Auto-fetch on open — uses upgrade-specific endpoint ────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setHasPrefilled(false);

    const fetchLatest = async () => {
      setPrefilling(true);
      try {
        const token = getToken();
        if (!token) return;

        // ✅ Uses upgrade controller's pre-fill endpoint (reads from Payment, superAdminId scoped)
        const res = await fetch(`${API_URL}/api/subscription/latest-details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data) {
          setForm({
            fullName:   data.fullName   || "",
            schoolName: data.schoolName || "",
            email:      data.email      || "",
            phone:      data.phone      || "",
            address:    data.address    || "",
          });
          if (data.studentCount) setStudentCount(Math.max(MIN_STUDENTS, Number(data.studentCount)));
          if (data.teacherCount) setTeacherCount(Math.max(MIN_TEACHERS, Number(data.teacherCount)));
          if (data.fullName) setHasPrefilled(true);
        }
      } catch (e) {
        console.error("Pre-fill error:", e);
      } finally {
        setPrefilling(false);
      }
    };

    fetchLatest();
  }, [isOpen]);

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const selectedPlan = PLANS.find(p => p.id === selectedPlanId);
  if (!isOpen || !selectedPlan) return null;

  const userCount  = Number(studentCount) + Number(teacherCount);
  const basePrice  = selectedPlan.price * userCount;
  const taxAmount  = Math.round(basePrice * 0.12);
  const totalPrice = basePrice + taxAmount;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim())   e.fullName   = "Full name is required";
    if (!form.email.trim())      e.email      = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.schoolName.trim()) e.schoolName = "School name is required";
    if (!form.phone.trim())      e.phone      = "Phone number is required";
    if (!form.address.trim())    e.address    = "City / Address is required";
    if (studentCount < MIN_STUDENTS) e.studentCount = `Minimum ${MIN_STUDENTS} students`;
    if (teacherCount < MIN_TEACHERS) e.teacherCount = `Minimum ${MIN_TEACHERS} teachers`;
    return e;
  };

  const handlePayment = async () => {
    if (loading) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);

    try {
      const token = getToken();

      // ✅ Step 1: Create order via upgrade endpoint (requires auth)
      const res = await fetch(`${API_URL}/api/subscription/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          planId:       selectedPlan.id,
          planName:     selectedPlan.name,
          userCount,
          studentCount,
          teacherCount,
          amount:       totalPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.orderId) {
        alert(`❌ Order creation failed: ${data.error || "Unknown error"}`);
        setLoading(false);
        return;
      }

      // ✅ Step 2: Open Razorpay
      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY,
        amount:      data.amount,
        currency:    "INR",
        name:        "School CRM",
        description: `${selectedPlan.name} Plan`,
        order_id:    data.orderId,

        handler: async (response) => {
          try {
            // ✅ Step 3: Verify via upgrade endpoint → creates Subscription record
            const vRes = await fetch(`${API_URL}/api/subscription/verify-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                paymentId:           data.paymentId,
              }),
            });

            const vData = await vRes.json();
            if (vData.status === "verified") {
              onClose();
              window.location.reload();
            } else {
              alert("❌ Verification failed. Contact support: " + response.razorpay_payment_id);
            }
          } catch (e) {
            console.error("Verify error:", e);
            alert("❌ Verification failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },

        modal: { ondismiss: () => setLoading(false) },

        prefill: { name: form.fullName, email: form.email, contact: form.phone },
        theme:   { color: selectedPlan.color },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", async (response) => {
        try {
          // Mark as FAILED in payment table
          await fetch(`${API_URL}/api/subscription/verify-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              paymentId:           data.paymentId,
              razorpay_order_id:   response.error.metadata?.order_id,
              razorpay_payment_id: response.error.metadata?.payment_id,
              failed: true,
            }),
          });
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
        alert(`❌ Payment Failed: ${response.error.description}`);
      });

      rzp.open();

    } catch (e) {
      console.error(e);
      alert("❌ Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .pm-font-sora { font-family: 'Sora', sans-serif; }
        .pm-font-dm   { font-family: 'DM Sans', sans-serif; }
        @keyframes pm-fade  { from{opacity:0} to{opacity:1} }
        @keyframes pm-slide { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes pm-pop   { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pm-spin  { to{transform:rotate(360deg)} }
        @keyframes pm-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .pm-overlay   { animation: pm-fade 0.2s ease both; }
        .pm-slide-up  { animation: pm-slide 0.38s cubic-bezier(0.32,0.72,0,1) both; }
        .pm-pop-in    { animation: pm-pop 0.32s cubic-bezier(0.22,1,0.36,1) both; }
        .pm-spinner   { width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:pm-spin 0.7s linear infinite;flex-shrink:0; }
        .pm-skel      { animation:pm-pulse 1.4s ease infinite;background:#f0f4f8;border-radius:12px; }
        .pm-noscroll  { scrollbar-width:none; }
        .pm-noscroll::-webkit-scrollbar { display:none; }
        .pm-thinscroll { scrollbar-width:thin;scrollbar-color:#dde7f0 transparent; }
        .pm-thinscroll::-webkit-scrollbar { width:4px; }
        .pm-thinscroll::-webkit-scrollbar-thumb { background:#dde7f0;border-radius:4px; }
        input[type=number] { -moz-appearance:textfield; }
      `}</style>

      {/* ── Overlay ────────────────────────────────────────────────────────── */}
      <div
        className="pm-overlay pm-font-dm fixed inset-0 z-[9999] flex items-end lg:items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >

        {/* ══════════════════════════════════════════════════════════════════
            MOBILE / TABLET  —  bottom sheet, single scrollable column
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="pm-slide-up lg:hidden w-full bg-white rounded-t-3xl flex flex-col"
          style={{ maxHeight: "94dvh" }}
          onClick={e => e.stopPropagation()}
        >
          {/* drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* scrollable content */}
          <div className="flex-1 overflow-y-auto pm-thinscroll">

            {/* Dark plan band */}
            <div className="bg-gradient-to-br from-[#384959] via-[#4a6880] to-[#6A89A7] px-5 pt-4 pb-6">

              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-blue-100 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-2">
                    <Sparkles size={10} />{isUpgrade ? "Upgrade Plan" : "Selected Plan"}
                  </span>
                  <h2 className="pm-font-sora text-2xl font-bold text-white">{selectedPlan.name} Plan</h2>
                  <p className="text-[12px] text-blue-200/70 mt-0.5">₹{selectedPlan.price}/user/year</p>
                </div>
                <button onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 text-white/70 flex items-center justify-center flex-shrink-0 active:bg-white/20 transition-all mt-1"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mb-5">
                {selectedPlan.features.map(f => (
                  <span key={f} className="flex items-center gap-1.5 text-[11px] text-white/80 bg-white/10 rounded-full px-3 py-1">
                    <CheckCircle2 size={11} className="text-blue-300" />{f}
                  </span>
                ))}
              </div>

              {/* Counters */}
              <p className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Users size={10} /> User Counts
              </p>
              <div className="flex gap-4 mb-4">
                <Counter label="Students" icon={GraduationCap} value={studentCount} setValue={setStudentCount}
                  errorKey="studentCount" errors={errors} setErrors={setErrors} minVal={MIN_STUDENTS} />
                <Counter label="Teachers" icon={BookOpen} value={teacherCount} setValue={setTeacherCount}
                  errorKey="teacherCount" errors={errors} setErrors={setErrors} minVal={MIN_TEACHERS} />
              </div>

              {/* Total users + price — side by side */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/[0.08] border border-white/10 rounded-2xl px-4 py-3 text-center">
                  <p className="text-[9px] font-bold text-blue-200/50 uppercase tracking-widest mb-0.5">Total Users</p>
                  <span className="pm-font-sora text-2xl font-bold text-white">{userCount}</span>
                </div>
                <div className="bg-white/[0.08] border border-white/10 rounded-2xl px-4 py-3 text-center">
                  <p className="text-[9px] font-bold text-blue-200/50 uppercase tracking-widest mb-0.5">Total Due</p>
                  <span className="pm-font-sora text-xl font-bold text-white">₹{totalPrice.toLocaleString()}</span>
                  <p className="text-[9px] text-blue-200/40 mt-0.5">incl. 12% GST</p>
                </div>
              </div>

              {/* Pre-fill notice */}
              {prefilling ? (
                <div className="flex items-center gap-2 text-blue-200/50 text-[11px]">
                  <RefreshCw size={11} className="animate-spin" /> Loading saved details…
                </div>
              ) : hasPrefilled ? (
                <div className="flex items-start gap-2 bg-white/[0.08] border border-white/10 rounded-xl px-3 py-2.5">
                  <AlertCircle size={13} className="text-blue-300 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-blue-200/70 leading-snug">
                    Details pre-filled from your last payment — edit below if needed.
                  </p>
                </div>
              ) : null}
            </div>

            {/* White form section */}
            <div className="px-5 py-6">
              <h3 className="pm-font-sora text-[17px] font-bold text-[#384959] mb-1">Your Details</h3>
              <p className="text-[12px] text-[#88a0b5] mb-5">
                {hasPrefilled ? "Pre-filled — edit if anything changed" : "Fill in to proceed with payment"}
              </p>
              {prefilling ? (
                <div className="flex flex-col gap-3">
                  {[1,2,3,4,5].map(i => <div key={i} className="pm-skel" style={{ height: 44 }} />)}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Field id="m-fullName"   label="Full Name"      name="fullName"   placeholder="John Doe"               autoComplete="name"           value={form.fullName}   onChange={handleChange} error={errors.fullName} />
                  <Field id="m-email"      label="Email"          name="email"      type="email" placeholder="john@school.edu"   autoComplete="email"          value={form.email}     onChange={handleChange} error={errors.email} />
                  <Field id="m-schoolName" label="School Name"    name="schoolName" placeholder="St. Mary's High School"  autoComplete="organization"   value={form.schoolName} onChange={handleChange} error={errors.schoolName} />
                  <Field id="m-phone"      label="Phone Number"   name="phone"      type="tel"   placeholder="+91 98765 43210"   autoComplete="tel"            value={form.phone}     onChange={handleChange} error={errors.phone} />
                  <Field id="m-address"    label="City / Address" name="address"    placeholder="Mumbai, Maharashtra"     autoComplete="address-level2" value={form.address}   onChange={handleChange} error={errors.address} />
                </div>
              )}
            </div>

          </div>{/* end scrollable */}

          {/* Sticky pay button */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white">
            <button
              onClick={handlePayment}
              disabled={loading || prefilling}
              className="w-full h-[52px] rounded-2xl bg-gradient-to-br from-[#384959] to-[#5a7a96] text-white text-[15px] font-semibold flex items-center justify-center gap-2 pm-font-dm shadow-[0_4px_20px_rgba(56,73,89,0.3)] transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? <><div className="pm-spinner" /> Processing…</>
               : prefilling ? <><RefreshCw size={15} className="animate-spin" /> Loading…</>
               : <>Pay ₹{totalPrice.toLocaleString()} <ChevronRight size={16} /></>}
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-[#a0b5c8]">
              <Lock size={10} /> Secured by Razorpay · 256-bit SSL
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DESKTOP  ≥1024px  —  two-column card, height = content (not vh)
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="pm-pop-in hidden lg:flex w-full max-w-5xl xl:max-w-6xl rounded-2xl shadow-2xl overflow-hidden bg-white"
          style={{ maxHeight: "90vh" }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── LEFT: dark summary panel ── */}
          <div
            className="flex flex-col bg-gradient-to-br from-[#384959] via-[#4a6880] to-[#6A89A7] px-8 py-9 overflow-y-auto pm-noscroll"
            style={{ width: 400, flexShrink: 0 }}
          >
            <span className="inline-flex items-center gap-1.5 self-start bg-blue-300/[0.18] border border-blue-300/30 text-blue-200 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-5">
              <Sparkles size={11} />{isUpgrade ? "Upgrade Plan" : "Selected Plan"}
            </span>

            <h2 className="pm-font-sora text-[30px] font-bold text-white leading-tight mb-1.5">
              {selectedPlan.name} Plan
            </h2>
            <p className="text-[13px] text-blue-200/65 mb-5">₹{selectedPlan.price} per user · per year</p>

            <ul className="flex flex-col gap-2.5 mb-6">
              {selectedPlan.features.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/85">
                  <CheckCircle2 size={14} className="text-blue-300 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>

            <div className="h-px bg-gradient-to-r from-blue-300/40 to-transparent mb-5" />

            {/* Pre-fill notice */}
            {prefilling ? (
              <div className="flex items-center gap-2 text-blue-200/50 text-[11px] mb-4">
                <RefreshCw size={11} className="animate-spin" /> Loading your saved details…
              </div>
            ) : hasPrefilled ? (
              <div className="flex items-start gap-2 bg-white/[0.08] border border-white/10 rounded-xl px-4 py-3 mb-5">
                <AlertCircle size={13} className="text-blue-300 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-blue-200/75 leading-snug">
                  Pre-filled from your last payment. Edit the form on the right if anything changed.
                </p>
              </div>
            ) : null}

            {/* Counters */}
            <p className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Users size={10} /> User Counts
            </p>
            <div className="flex gap-4 mb-4">
              <Counter label="Students" icon={GraduationCap} value={studentCount} setValue={setStudentCount}
                errorKey="studentCount" errors={errors} setErrors={setErrors} minVal={MIN_STUDENTS} />
              <Counter label="Teachers" icon={BookOpen} value={teacherCount} setValue={setTeacherCount}
                errorKey="teacherCount" errors={errors} setErrors={setErrors} minVal={MIN_TEACHERS} />
            </div>

            <div className="px-4 py-3 rounded-xl bg-white/[0.08] border border-white/10 text-center mb-1.5">
              <p className="text-[9px] font-bold text-blue-200/50 uppercase tracking-widest mb-1">Total Users</p>
              <span className="pm-font-sora text-2xl font-bold text-white">{userCount}</span>
            </div>
            <p className="text-[10px] text-blue-200/40 text-center mb-5">
              Min {MIN_STUDENTS} students &amp; {MIN_TEACHERS} teachers
            </p>

            {/* Price breakdown */}
            <div className="bg-white/[0.07] border border-white/10 rounded-2xl px-5 py-4 flex flex-col gap-2.5 mt-auto">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-blue-200/70">Subtotal ({userCount} users)</span>
                <span className="text-[13px] text-white font-medium">₹{basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-blue-200/70">GST (12%)</span>
                <span className="text-[13px] text-white font-medium">₹{taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-2.5 mt-1">
                <span className="text-[13px] text-blue-200/85 font-semibold">Total Due</span>
                <span className="pm-font-sora text-[22px] font-bold text-white">₹{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: white form panel ── */}
          <div className="flex-1 flex flex-col px-8 xl:px-10 py-9 overflow-y-auto pm-thinscroll min-w-0">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="pm-font-sora text-[22px] font-bold text-[#384959] mb-1">Your Details</h3>
                <p className="text-[13px] text-[#88a0b5]">
                  {prefilling
                    ? "Fetching your saved details…"
                    : hasPrefilled
                    ? "Pre-filled from your last payment — edit if needed"
                    : "Fill in to proceed with payment"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl border-[1.5px] border-[#e8eff6] bg-[#f7fafd] text-[#6A89A7] flex items-center justify-center flex-shrink-0 hover:bg-[#eef4fb] hover:text-[#384959] transition-all cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form fields */}
            {prefilling ? (
              <div className="flex flex-col gap-4">
                {[1,2,3,4,5].map(n => <div key={n} className="pm-skel" style={{ height: 44 }} />)}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field id="d-fullName" label="Full Name" name="fullName" placeholder="John Doe"
                    autoComplete="name" value={form.fullName} onChange={handleChange} error={errors.fullName} />
                  <Field id="d-email" label="Email" name="email" type="email" placeholder="john@school.edu"
                    autoComplete="email" value={form.email} onChange={handleChange} error={errors.email} />
                </div>
                <Field id="d-schoolName" label="School Name" name="schoolName" placeholder="St. Mary's High School"
                  autoComplete="organization" value={form.schoolName} onChange={handleChange} error={errors.schoolName} />
                <div className="grid grid-cols-2 gap-4">
                  <Field id="d-phone" label="Phone Number" name="phone" type="tel" placeholder="+91 98765 43210"
                    autoComplete="tel" value={form.phone} onChange={handleChange} error={errors.phone} />
                  <Field id="d-address" label="City / Address" name="address" placeholder="Mumbai, Maharashtra"
                    autoComplete="address-level2" value={form.address} onChange={handleChange} error={errors.address} />
                </div>
              </div>
            )}

            {/* Pay button */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={handlePayment}
                disabled={loading || prefilling}
                className="w-full h-[52px] rounded-[14px] bg-gradient-to-br from-[#384959] to-[#5a7a96] text-white text-[15px] font-semibold flex items-center justify-center gap-2 pm-font-dm shadow-[0_4px_16px_rgba(56,73,89,0.25)] transition-all hover:opacity-90 hover:-translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <><div className="pm-spinner" /> Processing…</>
                 : prefilling ? <><RefreshCw size={15} className="animate-spin" /> Loading details…</>
                 : <>Pay ₹{totalPrice.toLocaleString()} <ChevronRight size={16} /></>}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#a0b5c8]">
                <Lock size={11} /> Secured by Razorpay · 256-bit SSL encryption
              </p>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}