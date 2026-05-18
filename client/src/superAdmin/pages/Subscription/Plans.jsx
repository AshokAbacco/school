// src/superAdmin/pages/Subscription/Plans.jsx
import { useState, useEffect  } from "react";
import {
  Check, X, Zap, Shield, Crown,
  ChevronDown, ChevronUp, Sparkles, Globe, Mail, Info,
} from "lucide-react";
import PaymentModal from "./Payment";
import SubscriptionTimeline from "./PlansTimeline";

const plans = [
  {
    id: "silver",
    name: "Silver",
    price: 300,
    tagline: "Best for single school setup",
    icon: Shield,
    badge: null,
    schools: "1 School",
    webPackage: {
      pages: "1-page website",
      emails: "Staff & administration",
      
    },
    features: {
      "Super Admin": "Limited",
      "School Management": "1 School",
      "Basic Analytics": true,
      "Admin Dashboard": true,
      "Classes & Sections": true,
      "Student Registration": true,
      "Teacher Registration": true,
      "Attendance Management": true,
      "Holiday Management": true,
      "Teacher Dashboard": true,
      "Time Table": true,
      "Homework / Assignments": true,
      "Student Dashboard": true,
      "Parent Dashboard": true,
      "Student Fees (Basic)": true,
      "Reports & Advanced Analytics": false,
      "Transport Management": false,
      "Exams & Results": false,
      "Chat & Communication": false,
      "Payment Gateway": false,
      "Mobile App": false,
    },
  },
  {
    id: "gold",
    name: "Gold",
    price: 500,
    tagline: "Best for small groups up to 5 schools",
    icon: Zap,
    badge: "Most Popular",
    schools: "Up to 5 Schools",
    webPackage: {
      pages: "5-page website",
      emails: "Staff & administration",
      
    },
    features: {
      "Super Admin": true,
      "School Management": "Up to 5 Schools",
      "Basic Analytics": true,
      "Admin Dashboard": true,
      "Classes & Sections": true,
      "Student Registration": true,
      "Teacher Registration": true,
      "Attendance Management": true,
      "Holiday Management": true,
      "Teacher Dashboard": true,
      "Time Table": true,
      "Homework / Assignments": true,
      "Student Dashboard": true,
      "Parent Dashboard": true,
      "Student Fees (Basic)": true,
      "Reports & Advanced Analytics": true,
      "Exams & Results": true,
      "Activities & Events": true,
      "Payment Gateway": true,
      "Basic Notifications": true,
      "Transport Management": "Add-on",
      "Chat & Communication": false,
      "Mobile App": "Optional Add-on",
    },
  },
  {
    id: "premium",
    name: "Premium",
    price: 800,
    tagline: "Best for large institutions & franchises",
    icon: Crown,
    badge: "Full Access",
    schools: "Unlimited",
    webPackage: {
      pages: "15-page website",
      emails: "Staff, administration & students",
      
    },
    features: {
      "Super Admin": "Full Control",
      "School Management": "Unlimited",
      "Basic Analytics": true,
      "Admin Dashboard": true,
      "Classes & Sections": true,
      "Student Registration": true,
      "Teacher Registration": true,
      "Attendance Management": true,
      "Holiday Management": true,
      "Teacher Dashboard": true,
      "Time Table": true,
      "Homework / Assignments": true,
      "Student Dashboard": true,
      "Parent Dashboard": true,
      "Student Fees (Basic)": true,
      "Reports & Advanced Analytics": true,
      "Exams & Results": true,
      "Activities & Events": true,
      "Payment Gateway": true,
      "Basic Notifications": true,
      "Transport Management": true,
      "Chat & Communication": true,
      "Mobile App": "Android & iOS",
      "Online Classes Integration": true,
      "Certificates Generation": true,
      "Role-based Permissions": true,
      "Complete Financial Reporting": true,
      "Automated Fee Reminders": true,
      "Backup & Security": true,
      "API Integrations": true,
    },
  },
];

const allFeatureKeys = [
  "Super Admin",
  "School Management",
  "Basic Analytics",
  "Admin Dashboard",
  "Classes & Sections",
  "Student Registration",
  "Teacher Registration",
  "Attendance Management",
  "Holiday Management",
  "Teacher Dashboard",
  "Time Table",
  "Homework / Assignments",
  "Student Dashboard",
  "Parent Dashboard",
  "Student Fees (Basic)",
  "Reports & Advanced Analytics",
  "Exams & Results",
  "Activities & Events",
  "Payment Gateway",
  "Basic Notifications",
  "Transport Management",
  "Chat & Communication",
  "Mobile App",
  "Online Classes Integration",
  "Certificates Generation",
  "Role-based Permissions",
  "Complete Financial Reporting",
  "Automated Fee Reminders",
  "Backup & Security",
  "API Integrations",
];

export default function UpgradePage() {
  const [selectedPlan,      setSelectedPlan]      = useState(null);
  const [showAllFeatures,   setShowAllFeatures]   = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);


  const visibleFeatures = showAllFeatures
    ? allFeatureKeys
    : allFeatureKeys.slice(0, 12);

  const openPlan = (planId) => {
    setSelectedPlan(planId);
    setIsPaymentModalOpen(true);
  };

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscription/timeline`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await res.json();

      const active = data?.subscriptions?.find(
        (s) => s.status === "ACTIVE"
      );

      if (active) {
        setCurrentPlan(active);
      }
    } catch (err) {
      console.error("Failed to fetch current plan:", err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const planOrder = {
    silver: 1,
    gold: 2,
    premium: 3,
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-blue-50 to-blue-100">

      <div className="max-w-7xl mx-auto">

        {/* ── Subscription Timeline ─────────────────────────────────────────── */}
        <div className="mb-14">
          <SubscriptionTimeline
            onUpgrade={() => {
              // scroll down to plans section
              document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>

        {/* ── Plans Header ──────────────────────────────────────────────────── */}
        <div id="plans-section" className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4 bg-blue-200 text-blue-800">
            <Sparkles size={12} /> Upgrade Plans
          </div>
          <h1 className="text-4xl font-black mb-3 text-[#384959]">Choose Your Plan</h1>
          <p className="text-sm max-w-md mx-auto text-[#6A89A7]">
            Upgrade anytime. Your new plan activates immediately and replaces the current one.
          </p>
        </div>

        {/* ── Plan Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {plans.map((plan) => {
            const Icon   = plan.icon;
            const isGold = plan.id === "gold";

            // ✅ Current active plan
            const currentPlanName =
              currentPlan?.planName
                ?.replace(" Plan", "")
                ?.trim()
                ?.toLowerCase();

            const isCurrent =
              currentPlanName === plan.id.toLowerCase();

            // ✅ Prevent downgrade
            const isLowerPlan =
              currentPlan &&
              planOrder[plan.id] <
              planOrder[currentPlanName]

            // ✅ Upgrade allowed
            const canUpgrade = !isCurrent && !isLowerPlan;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl transition-all duration-300 overflow-hidden cursor-pointer
                  ${isGold ? "shadow-xl scale-[1.03]" : "shadow-md hover:shadow-lg hover:-translate-y-1"}
                  ${selectedPlan === plan.id ? "ring-2 ring-blue-400" : ""}
                  ${isGold ? "bg-gradient-to-br from-blue-200 to-blue-300" : "bg-white"}
                `}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase bg-[#384959] text-white">
                    {plan.badge}
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-4 left-4 text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase bg-green-500 text-white">
                    Current Plan
                  </div>
                )}

                <div className="p-6">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isGold ? "bg-white/40" : "bg-blue-100"}`}>
                    <Icon size={22} className={isGold ? "text-gray-800" : "text-[#88BDF2]"} />
                  </div>

                  <h3 className="text-xl font-bold mb-1 text-gray-800">{plan.name}</h3>
                  <p className="text-xs mb-4 leading-snug text-[#6A89A7]">{plan.tagline}</p>

                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-black text-gray-800">₹{plan.price}</span>
                    <span className="text-sm mb-1.5 font-medium text-[#6A89A7]">/user/Yr</span>
                  </div>

                  <div className="text-xs font-semibold mb-5 py-1.5 px-3 rounded-full inline-block bg-blue-100 text-[#6A89A7]">
                    {plan.schools}
                  </div>

                  <button
                    disabled={isCurrent || isLowerPlan}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold tracking-wide transition-colors
                      ${
                        isCurrent
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : isLowerPlan
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : isGold || plan.id === "premium"
                          ? "bg-gray-800 text-white hover:bg-gray-900"
                          : "bg-blue-100 text-[#6cabf3] border border-blue-300 hover:bg-[#88BDF2] hover:text-white"
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();

                      if (!isCurrent && !isLowerPlan) {
                        openPlan(plan.id);
                      }
                    }}
                  >
                    {isCurrent
                      ? "Current Active Plan"
                      : isLowerPlan
                      ? "Downgrade Not Available"
                      : currentPlan
                      ? `Upgrade to ${plan.name}`
                      : "Upgrade Now"}
                  </button>

                  {/* Web Package */}
                  <div className={`mt-4 rounded-xl p-3.5 ${isGold ? "bg-white/30" : "bg-blue-50"}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5 text-[#384959]">Included Web Package (paid)</p>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Globe size={13} className="text-[#88BDF2] shrink-0" />
                      <span className="text-xs font-semibold text-gray-700">{plan.webPackage.pages} - domain</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={13} className="text-[#88BDF2] shrink-0" />
                      <span className="text-xs text-gray-600">Professional emails — {plan.webPackage.emails}</span>
                    </div>
                    
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Feature Comparison Table ──────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-lg bg-white border border-blue-100">
          <div className="px-6 py-5 border-b border-blue-100">
            <h2 className="text-lg font-black text-gray-800">Feature Comparison</h2>
            <p className="text-xs mt-0.5 text-[#6A89A7]">Detailed breakdown of what's included in each plan</p>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-4 px-6 py-3 text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#88BDF2]">
            <div>Feature</div>
            {plans.map((p) => <div key={p.id} className="text-center">{p.name}</div>)}
          </div>

          {/* Rows */}
          {visibleFeatures.map((feature, i) => (
            <div
              key={feature}
              className={`grid grid-cols-4 px-6 py-3 items-center text-sm border-b border-blue-100 ${i % 2 === 0 ? "bg-white" : "bg-blue-50/40"}`}
            >
              <div className="font-medium text-xs text-gray-800">{feature}</div>
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-center">
                  {plan.features[feature] === true && (
                    <Check size={16} className="text-[#88BDF2]" strokeWidth={2.5} />
                  )}
                  {plan.features[feature] === false && (
                    <X size={14} className="text-gray-300" strokeWidth={2} />
                  )}
                  {plan.features[feature] === undefined && (
                    <X size={14} className="text-gray-200" strokeWidth={2} />
                  )}
                  {typeof plan.features[feature] === "string" && (
                    <span className="text-xs font-semibold text-[#6A89A7] text-center px-1">
                      {plan.features[feature]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Show more toggle */}
          <button
            onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="w-full py-4 flex items-center justify-center gap-2 text-sm font-bold text-[#6A89A7] bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            {showAllFeatures
              ? <><ChevronUp size={16} /> Show Less</>
              : <><ChevronDown size={16} /> Show All {allFeatureKeys.length} Features</>}
          </button>
        </div>

      </div>

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPlan(null);
        }}
        selectedPlanId={selectedPlan}
        existingSubscription={currentPlan}
      />
    </div>
  );
}