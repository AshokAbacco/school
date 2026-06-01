// src/LandingPages/pricing/Pricing.jsx
import { useState } from "react";
import { Check, Crown, ChevronDown, ChevronUp, Sparkles, Globe, Mail, Info } from "lucide-react";
import PaymentModal from "./Payment";

const plan = {
  id: "premium",
  name: "Premium",
  price: 300,
  tagline: "Complete school management solution — everything included, no limits",
  icon: Crown,
  badge: "Full Access",
  schools: "Unlimited Schools",
  webPackage: {
    pages: "10-page website",
    emails: "Staff, administration & students",
    note: "Free for Year 1 — renewal charges apply from Year 2",
  },
};

const allFeatureKeys = [
  "Super Admin — Full Control",
  "Unlimited School Management",
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
  "Student Fees Management",
  "Reports & Advanced Analytics",
  "Curriculum Management",
  "Exams & Results",
  "Activities & Events",
  "Payment Gateway",
  "Basic Notifications",
  "Transport Management",
  "Chat & Communication",
  "Mobile App (Android & iOS)",
  "Online Classes Integration",
  "Certificates Generation",
  "Role-based Permissions",
  "Complete Financial Reporting",
  "WhatsApp & SMS Notifications",
  "Automated Fee Reminders",
  "Backup & Security",
  "API Integrations",
];

const PREVIEW_COUNT = 12;

export default function PricingPage() {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const visibleFeatures = showAllFeatures ? allFeatureKeys : allFeatureKeys.slice(0, PREVIEW_COUNT);
  const Icon = plan.icon;

  return (
    <div className="min-h-screen py-24 px-4 bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-0 w-72 h-72 rounded-full pointer-events-none opacity-20 bg-blue-200 blur-3xl -translate-x-1/3 -translate-y-1/3" />
      <div className="fixed bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none opacity-15 bg-blue-300 blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="max-w-4xl mx-auto relative">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mt-3 rounded-full text-xs font-bold tracking-widest uppercase mb-5 bg-blue-200 text-blue-800">
            <Sparkles size={12} /> Dashboard CRM Pricing
          </div>
          <h1 className="text-5xl font-black mb-4 leading-tight text-[#384959]">
            One Plan. Everything Included.
          </h1>
          <p className="text-base max-w-md mx-auto text-[#6A89A7]">
            The Premium plan gives your institution every feature — no tiers, no limits, no add-ons required.
          </p>
        </div>

        {/* Plan Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#384959] via-[#4a6880] to-[#6A89A7] mb-12">
          {/* Badge */}
          <div className="absolute top-5 right-5 text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase bg-white text-[#384959]">
            {plan.badge}
          </div>

          <div className="p-8 md:p-12 grid md:grid-cols-2 gap-10 items-center">
            {/* Left */}
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                <Icon size={28} className="text-white" />
              </div>
              <h2 className="text-4xl font-black text-white mb-2">{plan.name}</h2>
              <p className="text-blue-200/80 text-sm leading-relaxed mb-8">{plan.tagline}</p>

              <div className="flex items-end gap-1 mb-2">
                <span className="text-5xl font-black text-white">₹{plan.price}</span>
                <span className="text-sm mb-2 font-medium text-blue-200/70">/user/year</span>
              </div>
              <div className="text-xs font-semibold mb-8 py-1.5 px-3 rounded-full inline-block bg-white/20 text-white">
                {plan.schools}
              </div>

              <button
                className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide bg-white text-[#384959] hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Get Started — ₹{plan.price}/user/yr
              </button>
            </div>

            {/* Right — Web Package */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-5 text-blue-200/80">
                Included Web Package
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Globe size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{plan.webPackage.pages}</p>
                  <p className="text-xs text-blue-200/70">Free domain included</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Mail size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Professional Emails</p>
                  <p className="text-xs text-blue-200/70">{plan.webPackage.emails}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-4 border-t border-white/20">
                <Info size={12} className="text-blue-300 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-blue-200/60 leading-snug">{plan.webPackage.note}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="rounded-2xl overflow-hidden shadow-lg bg-white border border-blue-100">
          <div className="px-6 py-5 border-b border-blue-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-800">Everything Included</h2>
              <p className="text-xs mt-0.5 text-[#6A89A7]">All {allFeatureKeys.length} features unlocked in Premium</p>
            </div>
            <div className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-[#6A89A7]">
              {allFeatureKeys.length} Features
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-0">
            {visibleFeatures.map((feature, i) => (
              <div
                key={feature}
                className={`flex items-center gap-3 px-6 py-3.5 border-b border-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-blue-50/40"}`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Check size={13} className="text-[#88BDF2]" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-medium text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* Show more */}
          <button
            onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="w-full py-4 flex items-center justify-center gap-2 text-sm font-bold text-[#6A89A7] cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            {showAllFeatures ? (
              <><ChevronUp size={16} /> Show Less</>
            ) : (
              <><ChevronDown size={16} /> Show All {allFeatureKeys.length} Features</>
            )}
          </button>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <button
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#384959] text-white font-bold text-sm hover:bg-[#2f3d4a] transition-colors cursor-pointer shadow-lg"
            onClick={() => setIsPaymentModalOpen(true)}
          >
            <Crown size={16} />
            Get Premium — ₹{plan.price}/user/year
          </button>
          <p className="mt-3 text-xs text-[#6A89A7]">Upgrade anytime · Cancel anytime · GST applicable</p>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedPlanId="premium"
      />
    </div>
  );
}