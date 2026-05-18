// src/superAdmin/pages/Subscription/Payment.jsx
import { useState, useEffect } from "react";
import {
  X, Shield, Zap, Crown, Users, CheckCircle2,
  ChevronRight, Sparkles, ArrowLeft, Lock, Pencil
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const plans = [
  {
    id: "silver",
    name: "Silver",
    price: 300,
    icon: Shield,
    color: "#6A89A7",
    features: ["1 School", "Basic reports", "Email support"],
  },
  {
    id: "gold",
    name: "Gold",
    price: 500,
    icon: Zap,
    color: "#88BDF2",
    features: ["Up to 5 Schools", "Advanced analytics", "Priority support"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 800,
    icon: Crown,
    color: "#384959",
    features: ["Unlimited schools", "Full suite", "24/7 dedicated support"],
  },
];

export default function PaymentModal({ isOpen, onClose, selectedPlanId }) {
  const [userCount, setUserCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [step, setStep] = useState("summary");
  const [errors, setErrors] = useState({});
  const [isEditable, setIsEditable] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    schoolName: "",
    email: "",
    phone: "",
    address: "",
  });

  // ── Auto-fetch user details when modal opens ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setPrefillLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/payment/latest`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        if (data) {
          setForm({
            fullName:   data.fullName   || "",
            schoolName: data.schoolName || "",
            email:      data.email      || "",
            phone:      data.phone      || "",
            address:    data.address    || "",
          });
        }
      } catch (err) {
        console.error("Prefill error:", err);
      } finally {
        setPrefillLoading(false);
      }
    };
    fetchData();
  }, [isOpen]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  if (!isOpen || !selectedPlan) return null;

  const PlanIcon   = selectedPlan.icon;
  const basePrice  = selectedPlan.price * userCount;
  const taxAmount  = Math.round(basePrice * 0.12);
  const totalPrice = basePrice + taxAmount;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim())   newErrors.fullName   = "Full name is required";
    if (!form.email.trim())      newErrors.email      = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Enter a valid email";
    if (!form.schoolName.trim()) newErrors.schoolName = "School name is required";
    if (!form.phone.trim())      newErrors.phone      = "Phone number is required";
    if (!form.address.trim())    newErrors.address    = "City / Address is required";
    if (!userCount || userCount < 1) newErrors.userCount = "Please add at least 1 user";
    return newErrors;
  };

  const handlePayment = async () => {
    if (loading) return;

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.userCount) setStep("summary");
      return;
    }

    setLoading(true);

    try {
      // ── 1. Create order ─────────────────────────────────────────────────
      const res = await fetch(`${API_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          planName: selectedPlan.name, // ✅ backend needs planName not planId
          userCount,
          amount: totalPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.orderId) {
        alert(`❌ Order creation failed: ${data.error || "Unknown error"}`);
        setLoading(false);
        return;
      }

      // ── 2. Open Razorpay ────────────────────────────────────────────────
      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY,
        amount:      data.amount,
        currency:    "INR",
        name:        "School CRM",
        description: `${selectedPlan.name} Plan`,
        order_id:    data.orderId,

        handler: async (response) => {
          try {
            // ── 3. Verify payment ──────────────────────────────────────────
            const verifyRes = await fetch(`${API_URL}/api/payment/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                paymentId:           data.paymentId,
                phone:               form.phone,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.status === "verified") {
              // ── 4. Create subscription ─────────────────────────────────
              await fetch(`${API_URL}/api/subscription/subscribe`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                  universityId: localStorage.getItem("universityId"),
                  planId:       selectedPlan.id,
                  paymentId:    data.paymentId,
                  userCount,
                }),
              });

              onClose();
              // Reload so PlansTimeline refreshes
              window.location.reload();
            } else {
              alert("❌ Payment verification failed. Contact support with ID: " + response.razorpay_payment_id);
            }
          } catch (err) {
            console.error("Verify error:", err);
            alert("❌ Verification request failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => setLoading(false),
        },

        prefill: {
          name:    form.fullName,
          email:   form.email,
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
              paymentId:           data.paymentId,
              razorpay_order_id:   response.error.metadata?.order_id,
              razorpay_payment_id: response.error.metadata?.payment_id,
              failed: true,
            }),
          });
        } catch (err) {
          console.error("Failed to report failure:", err);
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .pm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: rgba(15,23,32,0.55);
          backdrop-filter: blur(8px);
          padding: 16px;
          font-family: 'DM Sans', sans-serif;
          animation: pm-fadein 0.2s ease;
        }
        @keyframes pm-fadein { from { opacity:0 } to { opacity:1 } }
        @keyframes pm-slidein {
          from { opacity:0; transform: translateY(20px) scale(0.98) }
          to   { opacity:1; transform: translateY(0) scale(1) }
        }
        @keyframes pm-spin { to { transform: rotate(360deg) } }

        .pm-modal {
          width: 100%; max-width: 900px; max-height: 92vh;
          background: #fff; border-radius: 24px;
          overflow: hidden; display: flex; flex-direction: column;
          box-shadow: 0 32px 80px rgba(0,0,0,0.22);
          animation: pm-slidein 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        .pm-body { display: flex; flex: 1; overflow: hidden; }

        /* LEFT */
        .pm-left {
          width: 300px; flex-shrink: 0;
          background: linear-gradient(160deg, #384959 0%, #4a6278 100%);
          color: #fff; overflow-y: auto;
          display: flex; flex-direction: column;
        }
        .pm-left-inner { padding: 32px 28px; display: flex; flex-direction: column; gap: 20px; }
        .pm-plan-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.15); border-radius: 99px;
          padding: 5px 12px; font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; width: fit-content;
        }
        .pm-plan-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.15);
        }
        .pm-plan-title { font-size: 28px; font-weight: 800; font-family: 'Sora', sans-serif; line-height: 1.1; }
        .pm-plan-sub   { font-size: 12px; opacity: 0.65; margin-top: -8px; }
        .pm-features   { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .pm-features li { display: flex; align-items: center; gap: 8px; font-size: 12px; opacity: 0.85; }
        .pm-divider { height: 1px; background: rgba(255,255,255,0.12); }

        /* User control */
        .pm-user-label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; margin-bottom: 8px; }
        .pm-user-row   { display: flex; align-items: center; gap: 8px; }
        .pm-user-btn   { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.1); color: #fff; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .pm-user-btn:hover { background: rgba(255,255,255,0.22); }
        .pm-user-input { width: 64px; text-align: center; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-size: 15px; font-weight: 700; padding: 5px; outline: none; }
        .pm-user-error { font-size: 10px; color: #fca5a5; margin-top: 4px; display: block; }

        /* Price */
        .pm-price-card { background: rgba(255,255,255,0.1); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .pm-price-row  { display: flex; justify-content: space-between; align-items: center; }
        .pm-price-row.total { border-top: 1px solid rgba(255,255,255,0.15); padding-top: 10px; margin-top: 2px; }
        .pm-price-label { font-size: 11px; opacity: 0.7; }
        .pm-price-value { font-size: 12px; font-weight: 600; }
        .pm-price-total-val { font-size: 20px; font-weight: 800; }

        /* Mobile next */
        .pm-mobile-next { display: none; width: 100%; padding: 12px; border-radius: 12px; border: none; background: rgba(255,255,255,0.15); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s; }
        .pm-mobile-next:hover { background: rgba(255,255,255,0.22); }

        /* RIGHT */
        .pm-right { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .pm-right-header { padding: 28px 32px 20px; border-bottom: 1px solid #f0f4f8; display: flex; align-items: flex-start; gap: 16px; }
        .pm-right-title  { font-size: 20px; font-weight: 800; color: #1a2433; font-family: 'Sora', sans-serif; }
        .pm-right-sub    { font-size: 12px; color: #8899aa; margin-top: 2px; }
        .pm-close        { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e8edf2; background: #f8fafc; color: #8899aa; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
        .pm-close:hover  { background: #fee2e2; border-color: #fca5a5; color: #ef4444; }

        /* Prefill banner */
        .pm-prefill-banner {
          margin: 0 32px 0; padding: 10px 16px; border-radius: 10px;
          background: #f0f9ff; border: 1px solid #bae6fd;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 11px; color: #0369a1;
        }
        .pm-prefill-edit {
          display: flex; align-items: center; gap: 4px;
          background: #0ea5e9; color: #fff; border: none; border-radius: 6px;
          padding: 4px 10px; font-size: 10px; font-weight: 700; cursor: pointer;
          transition: background 0.15s;
        }
        .pm-prefill-edit:hover { background: #0284c7; }

        /* Form */
        .pm-field-group { padding: 20px 32px; display: flex; flex-direction: column; gap: 16px; flex: 1; }
        .pm-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .pm-field  { display: flex; flex-direction: column; gap: 5px; }
        .pm-label  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #8899aa; }
        .pm-input  { padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; color: #1a2433; outline: none; background: #fff; transition: border-color 0.15s, box-shadow 0.15s; font-family: 'DM Sans', sans-serif; }
        .pm-input:focus   { border-color: #88BDF2; box-shadow: 0 0 0 3px rgba(136,189,242,0.15); }
        .pm-input:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; }
        .pm-input.pm-error { border-color: #f87171; }
        .pm-err-msg { font-size: 10px; color: #ef4444; }

        /* Pay button */
        .pm-pay-btn {
          margin: 16px 32px; padding: 14px 24px;
          background: linear-gradient(135deg, #384959 0%, #4a6278 100%);
          color: #fff; border: none; border-radius: 14px;
          font-size: 14px; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.15s; font-family: 'DM Sans', sans-serif;
        }
        .pm-pay-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .pm-pay-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pm-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: pm-spin 0.7s linear infinite; }
        .pm-secure-note { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10px; color: #a0aec0; padding-bottom: 20px; }

        /* Mobile back */
        .pm-mobile-back { display: none; align-items: center; gap: 4px; font-size: 11px; color: #8899aa; background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 6px; }

        @media (max-width: 640px) {
          .pm-body { flex-direction: column; }
          .pm-left { width: 100%; }
          .pm-mobile-next { display: flex; }
          .pm-mobile-back { display: flex; }
          .pm-right { display: none; }
          .pm-right.active { display: flex; }
          .pm-row { grid-template-columns: 1fr; }
          .pm-field-group { padding: 20px 16px; }
          .pm-right-header { padding: 20px 16px 16px; }
          .pm-pay-btn { margin: 16px; }
          .pm-prefill-banner { margin: 0 16px; }
        }
      `}</style>

      <div className={`pm-overlay`}>
        <div className="pm-modal">
          <div className="pm-body">

            {/* ── LEFT: Plan Summary ── */}
            <div className={`pm-left${step === "form" ? " hidden-mobile" : ""}`}>
              <div className="pm-left-inner">
                <div className="pm-plan-badge"><Sparkles size={11} /> Selected Plan</div>

                <div className="pm-plan-icon">
                  <PlanIcon size={26} color="white" />
                </div>

                <div>
                  <div className="pm-plan-title">{selectedPlan.name} Plan</div>
                  <div className="pm-plan-sub">₹{selectedPlan.price} per user · per year</div>
                </div>

                <ul className="pm-features">
                  {selectedPlan.features.map((f) => (
                    <li key={f}><CheckCircle2 size={13} color="rgba(255,255,255,0.7)" />{f}</li>
                  ))}
                </ul>

                <div className="pm-divider" />

                {/* User Count */}
                <div className="pm-user-control">
                  <div className="pm-user-label"><Users size={11} /> Number of Users</div>
                  <div className="pm-user-row">
                    <button className="pm-user-btn" onClick={() => { setUserCount((n) => Math.max(1, n - 1)); if (errors.userCount) setErrors({ ...errors, userCount: "" }); }}>−</button>
                    <input
                      className="pm-user-input"
                      type="number" min="1"
                      value={userCount}
                      onChange={(e) => { const v = Number(e.target.value); setUserCount(isNaN(v) || v < 1 ? 1 : v); if (errors.userCount) setErrors({ ...errors, userCount: "" }); }}
                    />
                    <button className="pm-user-btn" onClick={() => { setUserCount((n) => n + 1); if (errors.userCount) setErrors({ ...errors, userCount: "" }); }}>+</button>
                  </div>
                  {errors.userCount && <span className="pm-user-error">⚠ {errors.userCount}</span>}
                </div>

                {/* Price Breakdown */}
                <div className="pm-price-card">
                  <div className="pm-price-row">
                    <span className="pm-price-label">Subtotal ({userCount} user{userCount !== 1 ? "s" : ""})</span>
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

                <button className="pm-mobile-next" onClick={() => setStep("form")}>
                  Continue to Details <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* ── RIGHT: Form ── */}
            <div className={`pm-right${step === "form" ? " active" : ""}`}>

              {/* Header */}
              <div className="pm-right-header">
                <div style={{ flex: 1 }}>
                  <button className="pm-mobile-back" onClick={() => setStep("summary")}>
                    <ArrowLeft size={14} /> Back to summary
                  </button>
                  <div className="pm-right-title">Your Details</div>
                  <div className="pm-right-sub">
                    {prefillLoading ? "Fetching your saved details…" : "Review your info and proceed to payment"}
                  </div>
                </div>
                <button className="pm-close" onClick={onClose}><X size={16} /></button>
              </div>

              {/* Prefill banner */}
              {!prefillLoading && form.fullName && (
                <div className="pm-prefill-banner" style={{ marginTop: 20 }}>
                  <span>✅ Details auto-filled from your account</span>
                  {!isEditable && (
                    <button className="pm-prefill-edit" onClick={() => setIsEditable(true)}>
                      <Pencil size={10} /> Edit
                    </button>
                  )}
                  {isEditable && (
                    <button className="pm-prefill-edit" style={{ background: "#64748b" }} onClick={() => setIsEditable(false)}>
                      Lock
                    </button>
                  )}
                </div>
              )}

              {/* Form Fields */}
              <div className="pm-field-group">

                <div className="pm-row">
                  <div className="pm-field">
                    <label className="pm-label">Full Name</label>
                    <input
                      className={`pm-input${errors.fullName ? " pm-error" : ""}`}
                      name="fullName" value={form.fullName}
                      onChange={handleChange} disabled={!isEditable}
                      placeholder="John Doe"
                    />
                    {errors.fullName && <span className="pm-err-msg">⚠ {errors.fullName}</span>}
                  </div>
                  <div className="pm-field">
                    <label className="pm-label">Email</label>
                    <input
                      className={`pm-input${errors.email ? " pm-error" : ""}`}
                      name="email" type="email" value={form.email}
                      onChange={handleChange} disabled={!isEditable}
                      placeholder="john@school.edu"
                    />
                    {errors.email && <span className="pm-err-msg">⚠ {errors.email}</span>}
                  </div>
                </div>

                <div className="pm-field">
                  <label className="pm-label">School Name</label>
                  <input
                    className={`pm-input${errors.schoolName ? " pm-error" : ""}`}
                    name="schoolName" value={form.schoolName}
                    onChange={handleChange} disabled={!isEditable}
                    placeholder="e.g. St. Mary's High School"
                  />
                  {errors.schoolName && <span className="pm-err-msg">⚠ {errors.schoolName}</span>}
                </div>

                <div className="pm-row">
                  <div className="pm-field">
                    <label className="pm-label">Phone Number</label>
                    <input
                      className={`pm-input${errors.phone ? " pm-error" : ""}`}
                      name="phone" type="tel" value={form.phone}
                      onChange={handleChange} disabled={!isEditable}
                      placeholder="+91 98765 43210"
                    />
                    {errors.phone && <span className="pm-err-msg">⚠ {errors.phone}</span>}
                  </div>
                  <div className="pm-field">
                    <label className="pm-label">City / Address</label>
                    <input
                      className={`pm-input${errors.address ? " pm-error" : ""}`}
                      name="address" value={form.address}
                      onChange={handleChange} disabled={!isEditable}
                      placeholder="Mumbai, Maharashtra"
                    />
                    {errors.address && <span className="pm-err-msg">⚠ {errors.address}</span>}
                  </div>
                </div>

              </div>

              {/* Pay Button */}
              <button className="pm-pay-btn" onClick={handlePayment} disabled={loading || prefillLoading}>
                {loading ? (
                  <><div className="pm-spinner" /> Processing...</>
                ) : (
                  <>Pay ₹{totalPrice.toLocaleString()} <ChevronRight size={16} /></>
                )}
              </button>

              <div className="pm-secure-note">
                <Lock size={11} /> Secured by Razorpay · 256-bit SSL encryption
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}