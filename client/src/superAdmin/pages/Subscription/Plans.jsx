// src/superAdmin/pages/Subscription/Plans.jsx
import { useState, useEffect } from "react";
import {
  Crown, Globe, Mail, Sparkles,
} from "lucide-react";
import PaymentModal from "./Payment";
import SubscriptionTimeline from "./PlansTimeline";
import { getToken } from "../../../auth/storage";

const premiumPlan = {
  id: "premium",
  name: "Premium",
  price: 300,
  tagline: "Best for large institutions & franchises",
  icon: Crown,
  badge: "Full Access",
  schools: "Unlimited",
  webPackage: {
    pages: "15-page website",
    emails: "Staff, administration & students",
  },

};

export default function UpgradePage() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentPlan,        setCurrentPlan]        = useState(null);
  const [loadingPlan,        setLoadingPlan]        = useState(true);

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const token = getToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscription/timeline`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const active = data?.subscriptions?.find(
        (s) => new Date(s.endDate) > new Date()
      );
      if (active) setCurrentPlan(active);
    } catch (err) {
      console.error("[Plans] fetchCurrentPlan error:", err);
    } finally {
      setLoadingPlan(false);
    }
  };

  if (loadingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f0f7ff" }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: "#BDDDFC", borderTopColor: "#6A89A7" }} />
      </div>
    );
  }

  const daysLeft = currentPlan?.endDate
    ? Math.ceil((new Date(currentPlan.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  const currentPlanName =
    currentPlan?.planName?.replace(" Plan", "").trim().toLowerCase() || null;

  const isCurrent          = currentPlanName === "premium";
  const canRenewCurrentPlan = isCurrent && daysLeft <= 30;

  const buttonLabel = isCurrent && !canRenewCurrentPlan
    ? "Current Active Plan"
    : isCurrent && canRenewCurrentPlan
    ? "Renew Plan"
    : currentPlan
    ? "Upgrade to Premium"
    : "Get Premium";

  const buttonDisabled = isCurrent && !canRenewCurrentPlan;

  const Icon = premiumPlan.icon;


  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "linear-gradient(135deg, #BDDDFC22 0%, #88BDF215 100%)", backgroundColor: "#f0f7ff" }}>
      <div className="max-w-5xl mx-auto">

        {/* ── Subscription Timeline ── */}
        <div className="mb-14">
          <SubscriptionTimeline
            onUpgrade={() =>
              document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })
            }
          />
        </div>

        {/* ── Header ── */}
        <div id="plans-section" className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4" style={{ backgroundColor: "#BDDDFC", color: "#384959" }}>
            <Sparkles size={12} /> Upgrade Plans
          </div>
          <h1 className="text-4xl font-black mb-3" style={{ color: "#384959" }}>Choose Your Plan</h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: "#6A89A7" }}>
            Upgrade anytime. Your new plan activates immediately and replaces the current one.
          </p>
        </div>

        {/* ── Premium Card (full width) ── */}
        <div className="relative rounded-2xl shadow-xl bg-white overflow-hidden w-full">

          {/* Top colour bar */}
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #88BDF2, #6A89A7, #384959)" }} />

          {/* Badges */}
          <div className="absolute top-5 right-5 flex gap-2">
            <span className="text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase text-white" style={{ backgroundColor: "#384959" }}>
              {premiumPlan.badge}
            </span>
          </div>
          {isCurrent && (
            <div className="absolute top-5 left-5">
              <span className="text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase bg-green-500 text-white">
                Current Plan
              </span>
            </div>
          )}

          {/* Card body */}
          <div className="p-8 md:p-10">

            {/* Plan identity row */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#BDDDFC" }}>
                  <Icon size={26} style={{ color: "#384959" }} />
                </div>
                <div>
                  <h3 className="text-2xl font-black" style={{ color: "#384959" }}>{premiumPlan.name}</h3>
                  <p className="text-sm" style={{ color: "#6A89A7" }}>{premiumPlan.tagline}</p>
                </div>
              </div>

              <div className="md:ml-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Price */}
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black" style={{ color: "#384959" }}>₹{premiumPlan.price}</span>
                  <span className="text-sm mb-2 font-medium" style={{ color: "#6A89A7" }}>/user/Yr</span>
                </div>

                {/* Schools badge */}
                <span className="text-xs font-semibold py-1.5 px-4 rounded-full" style={{ backgroundColor: "#BDDDFC", color: "#384959" }}>
                  {premiumPlan.schools}
                </span>

                {/* CTA button */}
                <button
                  disabled={buttonDisabled}
                  onClick={() => {
                    if (!buttonDisabled) setIsPaymentModalOpen(true);
                  }}
                  className="px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap"
                  style={buttonDisabled
                    ? { backgroundColor: "#22c55e", color: "#fff", cursor: "not-allowed" }
                    : { backgroundColor: "#384959", color: "#fff" }}
                >
                  {buttonLabel}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t mb-8" style={{ borderColor: "#BDDDFC" }} />

            

            {/* Web Package */}
            <div className="rounded-xl p-5" style={{ backgroundColor: "#BDDDFC26" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#384959" }}>
                Included Web Package (Paid)
              </p>
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex items-center gap-2.5">
                  <Globe size={15} style={{ color: "#88BDF2" }} className="shrink-0" />
                  <span className="text-sm font-semibold" style={{ color: "#384959" }}>
                    {premiumPlan.webPackage.pages} - domain
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail size={15} style={{ color: "#88BDF2" }} className="shrink-0" />
                  <span className="text-sm" style={{ color: "#6A89A7" }}>
                    Professional emails — {premiumPlan.webPackage.emails}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── Payment Modal ── */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedPlanId="premium"
        existingSubscription={currentPlan}
      />
    </div>
  );
}
