// src/LandingPages/pricing/Payment.jsx
import { useState } from "react";
import { X, Shield, Zap, Crown, Users, CheckCircle2, ChevronRight, Sparkles, ArrowLeft, Lock, GraduationCap, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const plans = [
  {
    id: "silver",
    name: "Silver",
    price: 300,
    icon: Shield,
    color: "#6A89A7",
    features: ["Up to 50 students", "Basic reports", "Email support"],
  },
  {
    id: "gold",
    name: "Gold",
    price: 500,
    icon: Zap,
    color: "#88BDF2",
    features: ["Up to 200 students", "Advanced analytics", "Priority support"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 800,
    icon: Crown,
    color: "#384959",
    features: ["Unlimited students", "Full suite", "24/7 dedicated support"],
  },
];

const MIN_COUNT = 5;
const MIN_COUNTS = 2;

export default function PaymentModal({ isOpen, onClose, selectedPlanId }) {
  const [studentCount, setStudentCount] = useState(MIN_COUNT);
  const [teacherCount, setTeacherCount] = useState(MIN_COUNTS);

  const userCount = Number(studentCount) + Number(teacherCount);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("summary");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    schoolName: "",
    email: "",
    phone: "",
    address: "",
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  if (!isOpen || !selectedPlan) return null;

  const PlanIcon = selectedPlan.icon;
  const basePrice = selectedPlan.price * userCount;
  const taxAmount = Math.round(basePrice * 0.12);
  const totalPrice = basePrice + taxAmount;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Enter a valid email";
    if (!form.schoolName.trim()) newErrors.schoolName = "School name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    if (!form.address.trim()) newErrors.address = "City / Address is required";
    if (studentCount < MIN_COUNT) newErrors.studentCount = `Minimum ${MIN_COUNT} students required`;
    if (teacherCount < MIN_COUNTS) newErrors.teacherCount = `Minimum ${MIN_COUNTS} teachers required`;
    return newErrors;
  };

  const handlePayment = async () => {
    if (loading) return;

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.studentCount || newErrors.teacherCount) setStep("summary");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          userCount,
          studentCount,
          teacherCount,
          amount: totalPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.orderId) {
        alert(`❌ Order creation failed: ${data.error || "Unknown error"}`);
        setLoading(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: data.amount,
        currency: "INR",
        name: "School CRM",
        description: `${selectedPlan.name} Plan`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_URL}/api/payment/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                paymentId: data.paymentId,
                phone: form.phone,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.status === "verified") {
              localStorage.setItem("tempUserId", data.tempUserId);
              onClose();
              navigate("/register", {
                state: {
                  fullName: form.fullName,
                  schoolName: form.schoolName,
                  email: form.email,
                  phone: form.phone,
                  address: form.address,
                  plan: selectedPlan.id,
                  tempUserId: data.tempUserId,
                },
              });
            } else {
              alert("❌ Payment verification failed. Contact support with your payment ID: " + response.razorpay_payment_id);
            }
          } catch (err) {
            console.error("Verify error:", err);
            alert("❌ Verification request failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        prefill: {
          name: form.fullName,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: selectedPlan.color },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", async (response) => {
        console.error("Payment Failed:", response.error);
        try {
          await fetch(`${API_URL}/api/payment/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentId: data.paymentId,
              razorpay_order_id: response.error.metadata?.order_id,
              razorpay_payment_id: response.error.metadata?.payment_id,
              failed: true,
            }),
          });
        } catch (err) {
          console.error("Failed to report payment failure:", err);
        } finally {
          setLoading(false);
        }
        alert(`❌ Payment Failed: ${response.error.description}\nReason: ${response.error.reason}`);
      });

      rzp.open();
    } catch (err) {
      console.error("handlePayment error:", err);
      alert("❌ Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Counter component
  const Counter = ({ label, icon: Icon, value, setValue, errorKey, minVal = MIN_COUNT }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className="text-blue-300/70" />
        <span className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setValue((n) => Math.max(minVal, n - 1));
            if (errors[errorKey]) setErrors({ ...errors, [errorKey]: "" });
          }}
          aria-label={`Decrease ${label}`}
          className="w-8 h-8 rounded-lg border border-blue-300/30 bg-blue-300/10 text-blue-200 text-lg font-light flex items-center justify-center hover:bg-blue-300/20 hover:border-blue-300/50 transition-all duration-150 flex-shrink-0"
        >
          −
        </button>
        <input
          type="number"
          min={minVal}
          value={value}
          onChange={(e) => {
            const val = Number(e.target.value);
            setValue(isNaN(val) || val < minVal ? minVal : val);
            if (errors[errorKey]) setErrors({ ...errors, [errorKey]: "" });
          }}
          aria-label={`${label} count`}
          className={`w-14 h-8 rounded-lg border text-center text-sm font-semibold text-white bg-white/8 outline-none transition-all duration-150
            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
            focus:border-blue-300/70 focus:bg-white/12
            ${errors[errorKey] ? "border-red-400/70" : "border-blue-300/30"}
          `}
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <button
          type="button"
          onClick={() => {
            setValue((n) => n + 1);
            if (errors[errorKey]) setErrors({ ...errors, [errorKey]: "" });
          }}
          aria-label={`Increase ${label}`}
          className="w-8 h-8 rounded-lg border border-blue-300/30 bg-blue-300/10 text-blue-200 text-lg font-light flex items-center justify-center hover:bg-blue-300/20 hover:border-blue-300/50 transition-all duration-150 flex-shrink-0"
        >
          +
        </button>
      </div>
      {errors[errorKey] && (
        <p className="text-[10px] text-red-400 mt-1.5">⚠ {errors[errorKey]}</p>
      )}
    </div>
  );

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&display=swap');
        @keyframes pm-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pm-slidein {
          from { opacity: 0; transform: translateY(20px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes pm-spin { to { transform: rotate(360deg) } }
        .pm-overlay { animation: pm-fadein 0.2s ease; }
        .pm-card    { animation: pm-slidein 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        .pm-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: pm-spin 0.7s linear infinite;
        }
        .font-sora { font-family: 'Sora', sans-serif; }
        .font-dm   { font-family: 'DM Sans', sans-serif; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Overlay */}
      <div
        className="pm-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(15,23,32,0.55)] backdrop-blur-md p-4 font-dm"
        onClick={onClose}
      >
        {/* Card */}
        <div
          className="pm-card bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden max-h-[96vh] grid grid-cols-1 lg:grid-cols-[420px_1fr]"
          onClick={(e) => e.stopPropagation()}
        >

          {/* ══ LEFT: Order Summary ══ */}
          <div
            className={`
              flex flex-col overflow-y-auto
              bg-gradient-to-br from-[#384959] via-[#4a6880] to-[#6A89A7]
              px-6 py-8 md:px-9 md:py-10
              ${step === "summary" ? "flex" : "hidden"} lg:flex
            `}
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex flex-col gap-0">

              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 self-start bg-blue-300/[0.18] border border-blue-300/30 text-blue-200 text-[11px] font-semibold tracking-[1px] uppercase px-3 py-1 rounded-full mb-5">
                <Sparkles size={12} />
                Selected Plan
              </span>

              {/* Title */}
              <h2 className="font-sora text-3xl md:text-[34px] font-bold text-white leading-tight mb-2">
                {selectedPlan.name}<br />Plan
              </h2>
              <p className="text-[13px] text-blue-200/70 mb-6">
                ₹{selectedPlan.price} per user · per year
              </p>

              {/* Features */}
              <ul className="flex flex-col gap-2.5 mb-7">
                {selectedPlan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/85">
                    <CheckCircle2 size={15} className="text-blue-300 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-blue-300/40 to-transparent mb-6" />

              {/* ── Counters: Students & Teachers side by side ── */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-blue-200/70 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Users size={11} />
                  User Counts
                </p>

                {/* Side-by-side counters */}
                <div className="flex gap-4">
                  <Counter
                    label="Students"
                    icon={GraduationCap}
                    value={studentCount}
                    setValue={setStudentCount}
                    errorKey="studentCount"
                  />
                  <Counter
                    label="Teachers"
                    icon={BookOpen}
                    value={teacherCount}
                    setValue={setTeacherCount}
                    errorKey="teacherCount"
                  />
                </div>

                {/* Total Users — below both counters */}
                <div className="mt-4 px-4 py-3 rounded-xl bg-white/[0.08] text-center border border-blue-300/20">
                  <p className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest mb-1">
                    Total Users
                  </p>
                  <div className=" gap-2">
                    <span className="font-sora text-2xl font-bold text-white">{userCount}</span>
                    {/* <span className="text-[12px] text-blue-200/60 mb-0.5">Students + Teachers</span> */}
                  </div>
                </div>

                {/* Min count hint */}
                <p className="text-[10px] text-blue-200/50 mt-2 text-center">
                  Minimum {MIN_COUNTS} students &amp; {MIN_COUNTS} teachers required
                </p>
              </div>

              {/* Price Breakdown */}
              <div className="bg-white/[0.07] border border-blue-300/20 rounded-2xl px-5 py-4 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-blue-200/75">
                    Subtotal ({userCount} user{userCount !== 1 ? "s" : ""})
                  </span>
                  <span className="text-[13px] text-white font-medium">₹{basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-blue-200/75">GST (12%)</span>
                  <span className="text-[13px] text-white font-medium">₹{taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t border-blue-300/20 pt-2.5 mt-1">
                  <span className="text-[13px] text-blue-200/85 font-semibold">Total Due</span>
                  <span className="font-sora text-[22px] font-bold text-white">₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Mobile: Continue button */}
              <button
                className="lg:hidden mt-6 flex items-center justify-center gap-2 bg-blue-300/15 border border-blue-300/30 text-blue-200 text-[13px] font-semibold px-5 py-3 rounded-xl w-full hover:bg-blue-300/25 transition-all duration-150"
                onClick={() => setStep("form")}
              >
                Continue to Details <ChevronRight size={16} />
              </button>

            </div>
          </div>

          {/* ══ RIGHT: Details Form ══ */}
          <div
            className={`
              flex flex-col px-6 py-8 md:px-9 md:py-9 overflow-y-auto
              ${step === "form" ? "flex" : "hidden"} lg:flex
            `}
            style={{ scrollbarWidth: "thin", scrollbarColor: "#e0e9f3 transparent" }}
          >

            {/* Header */}
            <div className="flex items-start gap-4 mb-7">
              <div className="flex-1">
                {/* Mobile back */}
                <button
                  className="lg:hidden flex items-center gap-1.5 text-[12px] text-[#6A89A7] font-medium mb-1.5 bg-transparent border-none cursor-pointer p-0"
                  onClick={() => setStep("summary")}
                >
                  <ArrowLeft size={14} /> Back to summary
                </button>
                <h3 className="font-sora text-[22px] font-bold text-[#384959] mb-1">Your Details</h3>
                <p className="text-[13px] text-[#88a0b5]">Fill in the information to proceed with payment</p>
              </div>
              <button
                className="w-[34px] h-[34px] rounded-[10px] border-[1.5px] border-[#e8eff6] bg-[#f7fafd] text-[#6A89A7] flex items-center justify-center flex-shrink-0 hover:bg-[#eef4fb] hover:text-[#384959] transition-all duration-150 cursor-pointer"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-[18px] flex-1">

              {/* Row 1: Full Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[#384959] tracking-[0.3px]" htmlFor="pm-fullName">
                    Full Name
                  </label>
                  <input
                    id="pm-fullName"
                    name="fullName"
                    placeholder="John Doe"
                    autoComplete="name"
                    onChange={handleChange}
                    value={form.fullName}
                    className={`h-11 rounded-xl border-[1.5px] px-3.5 text-[14px] text-[#384959] bg-[#fafcfe] outline-none transition-all duration-150 font-dm placeholder:text-[#b0c4d8]
                      focus:border-[#88BDF2] focus:shadow-[0_0_0_3px_rgba(136,189,242,0.15)]
                      ${errors.fullName ? "border-[#f87171] shadow-[0_0_0_3px_rgba(248,113,113,0.1)]" : "border-[#dde7f0]"}
                    `}
                  />
                  {errors.fullName && <span className="text-[11px] text-red-500">⚠ {errors.fullName}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[#384959] tracking-[0.3px]" htmlFor="pm-email">
                    Email
                  </label>
                  <input
                    id="pm-email"
                    name="email"
                    type="email"
                    placeholder="john@school.edu"
                    autoComplete="email"
                    onChange={handleChange}
                    value={form.email}
                    className={`h-11 rounded-xl border-[1.5px] px-3.5 text-[14px] text-[#384959] bg-[#fafcfe] outline-none transition-all duration-150 font-dm placeholder:text-[#b0c4d8]
                      focus:border-[#88BDF2] focus:shadow-[0_0_0_3px_rgba(136,189,242,0.15)]
                      ${errors.email ? "border-[#f87171] shadow-[0_0_0_3px_rgba(248,113,113,0.1)]" : "border-[#dde7f0]"}
                    `}
                  />
                  {errors.email && <span className="text-[11px] text-red-500">⚠ {errors.email}</span>}
                </div>
              </div>

              {/* Row 2: School Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#384959] tracking-[0.3px]" htmlFor="pm-schoolName">
                  School Name
                </label>
                <input
                  id="pm-schoolName"
                  name="schoolName"
                  placeholder="e.g. St. Mary's High School"
                  autoComplete="organization"
                  onChange={handleChange}
                  value={form.schoolName}
                  className={`h-11 rounded-xl border-[1.5px] px-3.5 text-[14px] text-[#384959] bg-[#fafcfe] outline-none transition-all duration-150 font-dm placeholder:text-[#b0c4d8]
                    focus:border-[#88BDF2] focus:shadow-[0_0_0_3px_rgba(136,189,242,0.15)]
                    ${errors.schoolName ? "border-[#f87171] shadow-[0_0_0_3px_rgba(248,113,113,0.1)]" : "border-[#dde7f0]"}
                  `}
                />
                {errors.schoolName && <span className="text-[11px] text-red-500">⚠ {errors.schoolName}</span>}
              </div>

              {/* Row 3: Phone + City/Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[#384959] tracking-[0.3px]" htmlFor="pm-phone">
                    Phone Number
                  </label>
                  <input
                    id="pm-phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    onChange={handleChange}
                    value={form.phone}
                    className={`h-11 rounded-xl border-[1.5px] px-3.5 text-[14px] text-[#384959] bg-[#fafcfe] outline-none transition-all duration-150 font-dm placeholder:text-[#b0c4d8]
                      focus:border-[#88BDF2] focus:shadow-[0_0_0_3px_rgba(136,189,242,0.15)]
                      ${errors.phone ? "border-[#f87171] shadow-[0_0_0_3px_rgba(248,113,113,0.1)]" : "border-[#dde7f0]"}
                    `}
                  />
                  {errors.phone && <span className="text-[11px] text-red-500">⚠ {errors.phone}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[#384959] tracking-[0.3px]" htmlFor="pm-address">
                    City / Address
                  </label>
                  <input
                    id="pm-address"
                    name="address"
                    placeholder="Mumbai, Maharashtra"
                    autoComplete="address-level2"
                    onChange={handleChange}
                    value={form.address}
                    className={`h-11 rounded-xl border-[1.5px] px-3.5 text-[14px] text-[#384959] bg-[#fafcfe] outline-none transition-all duration-150 font-dm placeholder:text-[#b0c4d8]
                      focus:border-[#88BDF2] focus:shadow-[0_0_0_3px_rgba(136,189,242,0.15)]
                      ${errors.address ? "border-[#f87171] shadow-[0_0_0_3px_rgba(248,113,113,0.1)]" : "border-[#dde7f0]"}
                    `}
                  />
                  {errors.address && <span className="text-[11px] text-red-500">⚠ {errors.address}</span>}
                </div>
              </div>

            </div>

            {/* Pay Button */}
            <button
              className="mt-6 h-[52px] rounded-[14px] bg-gradient-to-br from-[#384959] to-[#5a7a96] text-white border-none cursor-pointer text-[15px] font-semibold flex items-center justify-center gap-2 font-dm shadow-[0_4px_16px_rgba(56,73,89,0.25)] transition-all duration-150 hover:opacity-90 hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="pm-spinner" />
                  Processing...
                </>
              ) : (
                <>
                  {studentCount >= MIN_COUNT && teacherCount >= MIN_COUNT
                    ? `Pay ₹${totalPrice.toLocaleString()}`
                    : `Add min ${MIN_COUNT} of each to continue`}
                  <ChevronRight size={16} />
                </>
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#a0b5c8]">
              <Lock size={11} />
              Secured by Razorpay · 256-bit SSL encryption
            </div>

          </div>
        </div>
      </div>
    </>
  );
}