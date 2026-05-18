// src/superAdmin/pages/Subscription/PlansTimeline.jsx
import { useEffect, useState } from "react";
import {
  Crown, Shield, Zap, CalendarDays, Clock3,
  CheckCircle2, XCircle, Users, CreditCard, Sparkles,
  RefreshCw,
} from "lucide-react";
import { getToken } from "../../../auth/storage"; // ✅ uses your existing helper

const API_URL = import.meta.env.VITE_API_URL;

const PLAN_META = {
  silver: {
    icon: Shield, color: "#6A89A7", bg: "#EEF4FA",
    border: "#D7E6F5", text: "#425466", label: "Silver",
  },
  gold: {
    icon: Zap, color: "#88BDF2", bg: "#EDF6FF",
    border: "#CFE5FF", text: "#2563EB", label: "Gold",
  },
  premium: {
    icon: Crown, color: "#384959", bg: "#EEF2F7",
    border: "#D9E2EC", text: "#1E293B", label: "Premium",
  },
};

const getPlanMeta = (planName) => {
  if (!planName) return PLAN_META.silver;
  const key = String(planName).toLowerCase().trim();
  return PLAN_META[key] || PLAN_META.silver;
};

export default function SubscriptionTimeline({ onUpgrade }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  useEffect(() => { fetchSubscriptions(); }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ getToken() reads localStorage.auth → JSON.parse → returns auth.token (the raw JWT)
      const token = getToken();

      if (!token) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/payment/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();

      // payment/latest returns a single object — wrap in array if it has plan data
      if (data && data.planName && data.status === "SUCCESS") {
        setSubscriptions([data]);
      } else {
        setSubscriptions([]);
      }
    } catch (err) {
      console.error("Timeline fetch error:", err);
      setError("Failed to load subscription details.");
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const getDaysLeft = (endDate) => {
    if (!endDate) return 0;
    const diff = new Date(endDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-3xl p-12 text-center shadow-sm">
        <p className="text-red-500 font-semibold">{error}</p>
        <button
          onClick={fetchSubscriptions}
          className="mt-4 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (subscriptions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <CreditCard size={28} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">No Subscription Yet</h2>
        <p className="text-gray-400 text-sm">Purchase a plan below to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold tracking-wider uppercase mb-3">
            <Sparkles size={11} /> Subscription Timeline
          </div>
          <h2 className="text-2xl font-black text-[#384959]">Plan History</h2>
          <p className="text-sm text-gray-400 mt-1">Your active plan, renewal dates and previous upgrades.</p>
        </div>
        <button
          onClick={fetchSubscriptions}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* TIMELINE */}
      <div className="space-y-5">
        {subscriptions.map((sub, index) => {
          // ✅ Correct field names from your Payment model
          const meta     = getPlanMeta(sub.planName);
          const Icon     = meta.icon;
          const isActive = sub.status === "SUCCESS";
          // ✅ planEndDate (not endDate) — matches your Prisma Payment model
          const daysLeft = getDaysLeft(sub.planEndDate);

          return (
            <div key={sub.id} className="relative">

              {/* connector line */}
              {index !== subscriptions.length - 1 && (
                <div className="absolute left-8 top-[110px] bottom-[-24px] w-[2px] bg-gray-200 z-0" />
              )}

              <div
                className="relative z-10 rounded-2xl border bg-white shadow-sm overflow-hidden"
                style={{ borderColor: meta.border }}
              >
                {/* TOP BAND */}
                <div className="p-5 md:p-6" style={{ background: meta.bg }}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                    {/* Icon + name + status */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: meta.color }}
                      >
                        <Icon size={26} color="white" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-2xl font-black" style={{ color: meta.text }}>
                            {meta.label} Plan
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1
                              ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                          >
                            {isActive
                              ? <><CheckCircle2 size={11} /> ACTIVE</>
                              : <><XCircle size={11} /> EXPIRED</>}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Activated for <strong>{sub.userCount ?? "—"}</strong> users
                        </p>
                      </div>
                    </div>

                    {/* Days left pill */}
                    {isActive && daysLeft > 0 && (
                      <div className="bg-white border border-green-200 rounded-2xl px-5 py-3 min-w-[160px] shadow-sm text-center">
                        <div className="text-[10px] uppercase tracking-widest text-green-600 font-bold mb-0.5">Remaining</div>
                        <div className="text-3xl font-black text-green-700">{daysLeft}</div>
                        <div className="text-xs text-gray-400">days left</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BODY */}
                <div className="p-5 md:p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    {/* Start Date — ✅ planStartDate */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        <CalendarDays size={12} /> Start Date
                      </div>
                      <div className="text-base font-bold text-gray-800">
                        {formatDate(sub.planStartDate)}
                      </div>
                    </div>

                    {/* End Date — ✅ planEndDate */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        <Clock3 size={12} /> Expiry Date
                      </div>
                      <div className={`text-base font-bold ${isActive && daysLeft < 30 ? "text-red-500" : "text-gray-800"}`}>
                        {formatDate(sub.planEndDate)}
                      </div>
                      {isActive && daysLeft < 30 && (
                        <div className="text-[10px] text-red-400 mt-0.5 font-semibold">Expiring soon!</div>
                      )}
                    </div>

                    {/* Users — ✅ userCount */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        <Users size={12} /> Users
                      </div>
                      <div className="text-base font-bold text-gray-800">{sub.userCount ?? "—"}</div>
                    </div>

                    {/* Payment ID — ✅ razorpayPaymentId */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        <CreditCard size={12} /> Payment ID
                      </div>
                      <div className="text-xs font-semibold text-gray-600 break-all">
                        {sub.razorpayPaymentId || "N/A"}
                      </div>
                    </div>

                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Status</div>
                      <div className={`text-sm font-bold ${isActive ? "text-green-600" : "text-red-500"}`}>
                        {isActive
                          ? daysLeft > 0
                            ? "Currently Active"
                            : "Plan Expired"
                          : "Payment Failed / Pending"}
                      </div>
                    </div>

                    {/* Upgrade button */}
                    {isActive && onUpgrade && (
                      <button
                        onClick={onUpgrade}
                        className="px-5 py-2.5 rounded-xl bg-[#384959] text-white text-sm font-bold hover:opacity-90 transition flex items-center gap-2"
                      >
                        <Zap size={14} /> Upgrade Plan
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}