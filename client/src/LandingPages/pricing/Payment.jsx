import { useState } from "react";
import { X, Shield, Zap, Crown, Users, CheckCircle2, ChevronRight, Sparkles, ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const plans = [
  {
    id: "silver",
    name: "Silver",
    price: 1,
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

export default function PaymentModal({ isOpen, onClose, selectedPlanId }) {
  // ✅ FIX: Default is 0, not 1
  const [userCount, setUserCount] = useState(0);
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
  const basePrice  = selectedPlan.price * userCount;
  const taxAmount  = Math.round(basePrice * 0.12);
  const totalPrice = basePrice + taxAmount;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim())   newErrors.fullName   = "Full name is required";
    if (!form.email.trim())      newErrors.email      = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Enter a valid email";
    if (!form.schoolName.trim()) newErrors.schoolName = "School name is required";
    if (!form.phone.trim())      newErrors.phone      = "Phone number is required";
    if (!form.address.trim())    newErrors.address    = "City / Address is required";
    // ✅ FIX: Validate user count is at least 1 before paying
    if (!userCount || userCount < 1) newErrors.userCount = "Please add at least 1 user";
    return newErrors;
  };

  const handlePayment = async () => {
    if (loading) return;
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // ✅ If userCount error, switch back to summary step so they can see it
      if (newErrors.userCount) setStep("summary");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          planId: selectedPlan.id,
          userCount,
          amount: totalPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.orderId) {
        alert("Order creation failed");
        return;
      }

      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY,
        amount:      data.amount,
        currency:    "INR",
        name:        "School CRM",
        description: `${selectedPlan.name} Plan`,
        order_id:    data.orderId,

        handler: async (response) => {
          const verifyRes = await fetch(`${API_URL}/api/payment/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              paymentId: data.paymentId,
              // ✅ FIX: send phone so backend can update it correctly
              phone: form.phone,
            }),
          });

          const verifyData = await verifyRes.json();

          if (verifyData.status === "verified") {
            alert("✅ Payment Successful");
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
            alert("❌ Payment verification failed");
          }
        },

        modal: {
          ondismiss: function () {
            alert("⚠️ Payment cancelled");
          },
        },

        prefill: {
          name:    form.fullName,
          email:   form.email,
          contact: form.phone,
        },

        theme: { color: selectedPlan.color },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", async function (response) {
        console.error("Payment Failed:", response.error);

        await fetch(`${API_URL}/api/payment/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: data.paymentId,
            status:    "FAILED",
          }),
        });

        alert(
          "❌ Payment Failed: " +
          response.error.description +
          "\nReason: " +
          response.error.reason
        );
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .pm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: rgba(15, 23, 32, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 16px;
          font-family: 'DM Sans', sans-serif;
          animation: pm-fadein 0.2s ease;
        }

        @keyframes pm-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pm-slidein {
          from { opacity: 0; transform: translateY(20px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes pm-spin { to { transform: rotate(360deg) } }
        @keyframes pm-pulse { 0%,100% { opacity:0.6 } 50% { opacity:1 } }

        /* ── CARD ── */
        .pm-card {
          background: #fff;
          border-radius: 24px;
          box-shadow:
            0 0 0 1px rgba(56,73,89,0.06),
            0 24px 60px rgba(56,73,89,0.2),
            0 4px 12px rgba(56,73,89,0.08);
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: 420px 1fr;
          overflow: hidden;
          animation: pm-slidein 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          max-height: 96vh;
        }

        /* ── LEFT ── */
        .pm-left {
          background: linear-gradient(160deg, #384959 0%, #4a6880 60%, #6A89A7 100%);
          padding: 40px 36px 36px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .pm-left::-webkit-scrollbar { display: none; }
        .pm-left-inner { display: flex; flex-direction: column; gap: 0; }

        .pm-plan-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(136,189,242,0.18);
          border: 1px solid rgba(136,189,242,0.3);
          color: #BDDDFC;
          font-size: 11px; font-weight: 600;
          letter-spacing: 1px; text-transform: uppercase;
          padding: 5px 12px; border-radius: 20px;
          width: fit-content; margin-bottom: 20px;
        }

        .pm-plan-title {
          font-family: 'Sora', sans-serif;
          font-size: 34px; font-weight: 700;
          color: #fff; line-height: 1.15;
          margin-bottom: 8px;
        }

        .pm-plan-sub {
          font-size: 13px; color: rgba(189,221,252,0.7);
          margin-bottom: 24px;
        }

        .pm-features {
          list-style: none; display: flex; flex-direction: column; gap: 10px;
          margin-bottom: 28px;
        }
        .pm-features li {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: rgba(255,255,255,0.85);
        }
        .pm-features li svg { color: #88BDF2; flex-shrink: 0; }

        .pm-divider {
          height: 1px;
          background: linear-gradient(90deg, rgba(136,189,242,0.4), transparent);
          margin-bottom: 24px;
        }

        /* ── User control ── */
        .pm-user-control { margin-bottom: 20px; }
        .pm-user-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 600;
          color: rgba(189,221,252,0.7);
          letter-spacing: 0.8px; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .pm-user-row { display: flex; align-items: center; gap: 8px; }
        .pm-user-btn {
          width: 34px; height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(136,189,242,0.35);
          background: rgba(136,189,242,0.12);
          color: #BDDDFC;
          font-size: 18px; font-weight: 300;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, border-color 0.15s;
          line-height: 1;
        }
        .pm-user-btn:hover { background: rgba(136,189,242,0.22); border-color: rgba(136,189,242,0.55); }

        /* ✅ FIX: user input is editable */
        .pm-user-input {
          width: 72px; height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(136,189,242,0.35);
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-size: 15px; font-weight: 600;
          text-align: center;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
          /* ✅ Allow manual typing */
          -moz-appearance: textfield;
        }
        .pm-user-input::-webkit-inner-spin-button,
        .pm-user-input::-webkit-outer-spin-button { -webkit-appearance: none; }
        .pm-user-input:focus {
          border-color: rgba(136,189,242,0.7);
          background: rgba(255,255,255,0.12);
        }
        .pm-user-input.pm-input-error {
          border-color: #ff6b6b !important;
        }

        .pm-user-error {
          font-size: 11px; color: #ff9999;
          margin-top: 6px; display: block;
        }

        /* ── Price card ── */
        .pm-price-card {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(136,189,242,0.2);
          border-radius: 14px; padding: 18px 20px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .pm-price-row {
          display: flex; justify-content: space-between; align-items: center;
        }
        .pm-price-label { font-size: 13px; color: rgba(189,221,252,0.75); }
        .pm-price-value { font-size: 13px; color: #fff; font-weight: 500; }
        .pm-price-row.total {
          border-top: 1px solid rgba(136,189,242,0.2);
          padding-top: 10px; margin-top: 2px;
        }
        .pm-price-total-val {
          font-size: 22px; font-weight: 700; color: #fff;
          font-family: 'Sora', sans-serif;
        }

        /* ── Mobile next ── */
        .pm-mobile-next {
          display: none;
          align-items: center; justify-content: center; gap: 6px;
          margin-top: 24px;
          background: rgba(136,189,242,0.15);
          border: 1px solid rgba(136,189,242,0.3);
          color: #BDDDFC; font-size: 13px; font-weight: 600;
          padding: 12px 20px; border-radius: 12px; cursor: pointer;
          width: 100%; transition: background 0.15s;
        }
        .pm-mobile-next:hover { background: rgba(136,189,242,0.25); }

        /* ── RIGHT ── */
        .pm-right {
          display: flex; flex-direction: column;
          padding: 36px 36px 28px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #e0e9f3 transparent;
        }
        .pm-right::-webkit-scrollbar { width: 4px; }
        .pm-right::-webkit-scrollbar-thumb { background: #e0e9f3; border-radius: 4px; }

        .pm-right-header {
          display: flex; align-items: flex-start; gap: 16px;
          margin-bottom: 28px;
        }

        .pm-mobile-back {
          display: none;
          align-items: center; gap: 6px;
          font-size: 12px; color: #6A89A7; font-weight: 500;
          background: none; border: none; cursor: pointer; padding: 0;
          margin-bottom: 6px;
        }

        .pm-right-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px; font-weight: 700; color: #384959;
          margin-bottom: 4px;
        }
        .pm-right-sub { font-size: 13px; color: #88a0b5; }

        .pm-close {
          width: 34px; height: 34px; border-radius: 10px;
          border: 1.5px solid #e8eff6; background: #f7fafd;
          color: #6A89A7; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
        }
        .pm-close:hover { background: #eef4fb; color: #384959; }

        /* ── Form ── */
        .pm-field-group { display: flex; flex-direction: column; gap: 18px; flex: 1; }
        .pm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .pm-field { display: flex; flex-direction: column; gap: 6px; }
        .pm-label { font-size: 12px; font-weight: 600; color: #384959; letter-spacing: 0.3px; }
        .pm-input {
          height: 44px; border-radius: 12px;
          border: 1.5px solid #dde7f0;
          padding: 0 14px; font-size: 14px; color: #384959;
          background: #fafcfe; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .pm-input::placeholder { color: #b0c4d8; }
        .pm-input:focus {
          border-color: #88BDF2;
          box-shadow: 0 0 0 3px rgba(136,189,242,0.15);
        }
        .pm-input.pm-error { border-color: #f87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.1); }
        .pm-err-msg { font-size: 11px; color: #ef4444; }

        /* ── Pay button ── */
        .pm-pay-btn {
          margin-top: 24px;
          height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #384959 0%, #5a7a96 100%);
          color: #fff; border: none; cursor: pointer;
          font-size: 15px; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: 'DM Sans', sans-serif;
          transition: opacity 0.15s, transform 0.15s;
          box-shadow: 0 4px 16px rgba(56,73,89,0.25);
        }
        .pm-pay-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .pm-pay-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .pm-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: pm-spin 0.7s linear infinite;
        }

        .pm-secure-note {
          margin-top: 12px;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 11px; color: #a0b5c8;
        }

        /* ══════════════════════════════
           RESPONSIVE — TABLET / MOBILE
        ══════════════════════════════ */
        @media (max-width: 720px) {
          .pm-card {
            grid-template-columns: 1fr;
            max-height: 92vh;
            border-radius: 20px;
          }

          .pm-left  { display: ${step === "summary" ? "flex" : "none"}; border-radius: 20px 20px 0 0; }
          .pm-right { display: ${step === "form" ? "flex" : "none"}; border-radius: 20px 20px 0 0; }

          .pm-mobile-next { display: flex !important; }
          .pm-mobile-back { display: flex !important; }

          .pm-plan-title { font-size: 28px; }

          .pm-row { grid-template-columns: 1fr; gap: 16px; }
        }

        /* ══════════════════════════════
           RESPONSIVE — VERY SMALL
        ══════════════════════════════ */
        @media (max-width: 380px) {
          .pm-left  { padding: 24px 20px; }
          .pm-right { padding: 24px 20px 20px; }
          .pm-plan-title { font-size: 24px; }
          .pm-right-title { font-size: 19px; }
        }
      `}</style>

      <div className="pm-overlay" onClick={onClose}>
        <div className="pm-card" onClick={(e) => e.stopPropagation()}>

          {/* ── LEFT: Order Summary ── */}
          <div className="pm-left">
            <div className="pm-left-inner">

              <div className="pm-plan-badge">
                <Sparkles size={12} />
                Selected Plan
              </div>

              <div className="pm-plan-title">
                {selectedPlan.name}<br />Plan
              </div>
              <div className="pm-plan-sub">₹{selectedPlan.price} per user · per year</div>

              <ul className="pm-features">
                {selectedPlan.features.map((f) => (
                  <li key={f}>
                    <CheckCircle2 size={15} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="pm-divider" />

              {/* ✅ FIX: User Count — default 0, min 0, fully manual */}
              <div className="pm-user-control">
                <div className="pm-user-label">
                  <Users size={11} />
                  Number of Users (Students &amp; Teachers)
                </div>
                <div className="pm-user-row">
                  <button
                    className="pm-user-btn"
                    onClick={() => {
                      setUserCount((n) => Math.max(0, n - 1));
                      if (errors.userCount) setErrors({ ...errors, userCount: "" });
                    }}
                    aria-label="Decrease users"
                  >−</button>

                  <input
                    className={`pm-user-input${errors.userCount ? " pm-input-error" : ""}`}
                    type="number"
                    min="0"
                    value={userCount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setUserCount(isNaN(val) || val < 0 ? 0 : val);
                      if (errors.userCount) setErrors({ ...errors, userCount: "" });
                    }}
                    aria-label="User count"
                  />

                  <button
                    className="pm-user-btn"
                    onClick={() => {
                      setUserCount((n) => n + 1);
                      if (errors.userCount) setErrors({ ...errors, userCount: "" });
                    }}
                    aria-label="Increase users"
                  >+</button>
                </div>
                {/* ✅ Show error if 0 users and user tried to pay */}
                {errors.userCount && (
                  <span className="pm-user-error">⚠ {errors.userCount}</span>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="pm-price-card">
                <div className="pm-price-row">
                  <span className="pm-price-label">
                    Subtotal ({userCount} user{userCount !== 1 ? "s" : ""})
                  </span>
                  <span className="pm-price-value">₹{basePrice.toLocaleString()}</span>
                </div>
                <div className="pm-price-row">
                  <span className="pm-price-label">GST (12%)</span>
                  <span className="pm-price-value">₹{taxAmount.toLocaleString()}</span>
                </div>
                <div className="pm-price-row total">
                  <span className="pm-price-label" style={{ fontWeight: 600, opacity: 0.85 }}>Total Due</span>
                  <span className="pm-price-total-val">₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Mobile: continue to form */}
              <button className="pm-mobile-next" onClick={() => setStep("form")}>
                Continue to Details <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* ── RIGHT: Details Form ── */}
          <div className="pm-right">

            {/* Header */}
            <div className="pm-right-header">
              <div style={{ flex: 1 }}>
                <button className="pm-mobile-back" onClick={() => setStep("summary")}>
                  <ArrowLeft size={14} /> Back to summary
                </button>
                <div className="pm-right-title">Your Details</div>
                <div className="pm-right-sub">Fill in the information to proceed with payment</div>
              </div>
              <button className="pm-close" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="pm-field-group">

              {/* Row 1: Full Name + Email */}
              <div className="pm-row">
                <div className="pm-field">
                  <label className="pm-label" htmlFor="pm-fullName">Full Name</label>
                  <input
                    id="pm-fullName"
                    className={`pm-input${errors.fullName ? " pm-error" : ""}`}
                    name="fullName"
                    placeholder="John Doe"
                    autoComplete="name"
                    onChange={handleChange}
                    value={form.fullName}
                  />
                  {errors.fullName && <span className="pm-err-msg">⚠ {errors.fullName}</span>}
                </div>
                <div className="pm-field">
                  <label className="pm-label" htmlFor="pm-email">Email</label>
                  <input
                    id="pm-email"
                    className={`pm-input${errors.email ? " pm-error" : ""}`}
                    name="email"
                    type="email"
                    placeholder="john@school.edu"
                    autoComplete="email"
                    onChange={handleChange}
                    value={form.email}
                  />
                  {errors.email && <span className="pm-err-msg">⚠ {errors.email}</span>}
                </div>
              </div>

              {/* Row 2: School Name (full width) */}
              <div className="pm-field">
                <label className="pm-label" htmlFor="pm-schoolName">School Name</label>
                <input
                  id="pm-schoolName"
                  className={`pm-input${errors.schoolName ? " pm-error" : ""}`}
                  name="schoolName"
                  placeholder="e.g. St. Mary's High School"
                  autoComplete="organization"
                  onChange={handleChange}
                  value={form.schoolName}
                />
                {errors.schoolName && <span className="pm-err-msg">⚠ {errors.schoolName}</span>}
              </div>

              {/* Row 3: Phone + City/Address */}
              <div className="pm-row">
                <div className="pm-field">
                  <label className="pm-label" htmlFor="pm-phone">Phone Number</label>
                  <input
                    id="pm-phone"
                    className={`pm-input${errors.phone ? " pm-error" : ""}`}
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    onChange={handleChange}
                    value={form.phone}
                  />
                  {errors.phone && <span className="pm-err-msg">⚠ {errors.phone}</span>}
                </div>
                <div className="pm-field">
                  <label className="pm-label" htmlFor="pm-address">City / Address</label>
                  <input
                    id="pm-address"
                    className={`pm-input${errors.address ? " pm-error" : ""}`}
                    name="address"
                    placeholder="Mumbai, Maharashtra"
                    autoComplete="address-level2"
                    onChange={handleChange}
                    value={form.address}
                  />
                  {errors.address && <span className="pm-err-msg">⚠ {errors.address}</span>}
                </div>
              </div>

            </div>

            {/* Pay Button */}
            <button className="pm-pay-btn" onClick={handlePayment} disabled={loading}>
              {loading ? (
                <>
                  <div className="pm-spinner" />
                  Processing...
                </>
              ) : (
                <>
                  {userCount > 0
                    ? `Pay ₹${totalPrice.toLocaleString()}`
                    : "Add users to continue"}
                  <ChevronRight size={16} />
                </>
              )}
            </button>

            <div className="pm-secure-note">
              <Lock size={11} />
              Secured by Razorpay · 256-bit SSL encryption
            </div>

          </div>
        </div>
      </div>
    </>
  );
}