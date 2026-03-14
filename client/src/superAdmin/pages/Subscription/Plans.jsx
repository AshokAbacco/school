import React, { useState } from 'react'
import {
  GraduationCap, Users, HardDrive, Check, X, TrendingUp, School, DollarSign,
  Activity, ChevronRight, ChevronDown, Zap, Shield, Star, ArrowRight
} from 'lucide-react'
import PageLayout from '../../components/PageLayout'

// ─── Student Tier Pricing Config ───────────────────────────────────────────
const studentTiers = [
  { label: 'Up to 100 students',   value: 100,   monthly: 29,   yearly: 290  },
  { label: 'Up to 200 students',   value: 200,   monthly: 49,   yearly: 490  },
  { label: 'Up to 500 students',   value: 500,   monthly: 89,   yearly: 890  },
  { label: 'Up to 1,000 students', value: 1000,  monthly: 149,  yearly: 1490 },
  { label: 'Up to 2,000 students', value: 2000,  monthly: 229,  yearly: 2290 },
  { label: 'Up to 5,000 students', value: 5000,  monthly: 399,  yearly: 3990 },
  { label: 'Unlimited students',   value: 99999, monthly: 599,  yearly: 5990 },
]

const plans = [
  {
    id: 1,
    name: 'Starter',
    tagline: 'Perfect for small schools',
    badge: null,
    highlight: false,
    color: '#6A89A7',
    bgLight: '#6A89A710',
    borderTop: 'border-t-[#6A89A7]',
    icon: School,
    maxTeachers: 10,
    storage: '10 GB',
    activeSchools: 142,
    features: [
      'Student Management',
      'Attendance Tracking',
      'Basic Grade Reports',
      'Parent Portal',
      'Email Support',
    ],
    notIncluded: ['Custom Reports', 'API Access', 'Multi-branch', 'Priority Support', 'Analytics Dashboard'],
  },
  {
    id: 2,
    name: 'Growth',
    tagline: 'Ideal for growing institutions',
    badge: 'Most Popular',
    highlight: true,
    color: '#88BDF2',
    bgLight: '#88BDF215',
    borderTop: 'border-t-[#88BDF2]',
    icon: TrendingUp,
    maxTeachers: 50,
    storage: '50 GB',
    activeSchools: 389,
    features: [
      'Student Management',
      'Attendance Tracking',
      'Advanced Grade Reports',
      'Parent Portal',
      'Priority Support',
      'Custom Reports',
      'API Access',
      'Analytics Dashboard',
    ],
    notIncluded: ['Multi-branch'],
  },
  {
    id: 3,
    name: 'Enterprise',
    tagline: 'Full power for large schools',
    badge: 'Best Value',
    highlight: false,
    color: '#384959',
    bgLight: '#38495910',
    borderTop: 'border-t-[#384959]',
    icon: Shield,
    maxTeachers: 'Unlimited',
    storage: '500 GB',
    activeSchools: 67,
    features: [
      'Student Management',
      'Attendance Tracking',
      'Advanced Grade Reports',
      'Parent Portal',
      'Priority Support',
      'Custom Reports',
      'API Access',
      'Multi-branch Support',
      'Analytics Dashboard',
      'Dedicated Account Manager',
    ],
    notIncluded: [],
  },
]

const stats = [
  { label: 'Total Revenue',  value: '$128,400', sub: '+18.2% this month', Icon: DollarSign, accent: '#88BDF2', accentBg: 'bg-[#88BDF215]', border: 'border-l-[#88BDF2]' },
  { label: 'Active Schools', value: '598',       sub: '+34 new this month', Icon: School,     accent: '#6A89A7', accentBg: 'bg-[#6A89A715]', border: 'border-l-[#6A89A7]' },
  { label: 'Avg Plan Value', value: '$86/mo',    sub: '+5.1% growth',       Icon: TrendingUp, accent: '#88BDF2', accentBg: 'bg-[#88BDF215]', border: 'border-l-[#88BDF2]' },
  { label: 'Churn Rate',     value: '2.4%',      sub: '-0.3% improved',     Icon: Activity,   accent: '#6A89A7', accentBg: 'bg-[#6A89A715]', border: 'border-l-[#6A89A7]' },
]

// ─── Reusable Tier Selector ─────────────────────────────────────────────────
function TierSelector({ selectedTier, onChange, color }) {
  const [open, setOpen] = useState(false)
  const tier = studentTiers.find(t => t.value === selectedTier) || studentTiers[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer"
        style={{ background: color + '10', borderColor: color + '40', color }}
      >
        <span className="flex items-center gap-1.5">
          <GraduationCap size={13} color={color} />
          {tier.label}
        </span>
        <ChevronDown size={13} color={color} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-[#EFF6FD] overflow-hidden">
          {studentTiers.map(t => (
            <button
              key={t.value}
              onClick={() => { onChange(t.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium hover:bg-[#EFF6FD] transition-colors cursor-pointer border-0 text-left
                ${t.value === selectedTier ? 'font-bold' : ''}`}
              style={{ color: t.value === selectedTier ? color : '#384959', background: t.value === selectedTier ? color + '08' : 'transparent' }}
            >
              <span>{t.label}</span>
              <span className="font-bold" style={{ color }}>
                ${t.monthly}/mo
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Plans() {
  const [billing, setBilling] = useState('monthly')
  // Each plan has its own selected student tier
  const [tiers, setTiers] = useState({ 1: 100, 2: 100, 3: 100 })

  const setTier = (planId, tierValue) => setTiers(prev => ({ ...prev, [planId]: tierValue }))

  const getPrice = (planId) => {
    const tierVal = tiers[planId] || 100
    const tier = studentTiers.find(t => t.value === tierVal) || studentTiers[0]
    // Each plan has a multiplier over base (Starter=1x, Growth=1.5x, Enterprise=2.5x)
    const multipliers = { 1: 1, 2: 1.5, 3: 2.5 }
    const mult = multipliers[planId] || 1
    const base = billing === 'monthly' ? tier.monthly : tier.yearly
    return Math.round(base * mult)
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-[#EFF6FD] p-8 font-sans text-[#384959]">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-[#6A89A7] flex items-center gap-1 mb-1">
              SuperAdmin
              <ChevronRight size={12} />
              <span className="text-[#88BDF2] font-semibold">Subscription Plans</span>
            </p>
            <h1 className="text-3xl font-bold text-[#384959] mb-1">Subscription Plans</h1>
            <p className="text-sm text-[#6A89A7]">Student-based pricing — pay only for what your school needs</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {stats.map((st, i) => (
            <div key={i} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${st.border} hover:shadow-md transition-all duration-200`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-2xl font-bold text-[#384959] mb-1">{st.value}</p>
                  <p className="text-xs font-semibold text-[#6A89A7]">{st.label}</p>
                </div>
                <div className={`w-10 h-10 ${st.accentBg} rounded-xl flex items-center justify-center`}>
                  <st.Icon size={18} color={st.accent} />
                </div>
              </div>
              <p className="text-xs font-medium" style={{ color: st.accent }}>{st.sub}</p>
            </div>
          ))}
        </div>

        {/* Pricing Note Banner */}
        <div className="bg-white border border-[#88BDF230] rounded-2xl px-5 py-4 mb-6 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 bg-[#88BDF215] rounded-xl flex items-center justify-center shrink-0">
            <Zap size={16} color="#88BDF2" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#384959]">Student-count based pricing</p>
            <p className="text-xs text-[#6A89A7]">
              Choose your student range for each plan. Pricing scales automatically — upgrade anytime as your school grows.
            </p>
          </div>
          <div className="ml-auto flex gap-2 shrink-0">
            {studentTiers.slice(0, 5).map((t, i) => (
              <div key={i} className="hidden lg:flex flex-col items-center bg-[#EFF6FD] rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-[#384959]">{t.value === 99999 ? '∞' : t.value.toLocaleString()}</span>
                <span className="text-[9px] text-[#6A89A7]">students</span>
                <span className="text-[10px] font-bold text-[#88BDF2]">${t.monthly}/mo</span>
              </div>
            ))}
            <div className="hidden lg:flex flex-col items-center bg-[#88BDF215] rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-[#384959]">+</span>
              <span className="text-[9px] text-[#6A89A7]">more</span>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center gap-4 mb-7">
          <span className="text-sm font-semibold text-[#6A89A7]">Billing Cycle:</span>
          <div className="flex bg-white rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-0 cursor-pointer ${
                billing === 'monthly' ? 'bg-[#384959] text-[#BDDDFC]' : 'bg-transparent text-[#6A89A7]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-0 cursor-pointer ${
                billing === 'yearly' ? 'bg-[#384959] text-[#BDDDFC]' : 'bg-transparent text-[#6A89A7]'
              }`}
            >
              Yearly
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = getPrice(plan.id)
            const PlanIcon = plan.icon

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-6 shadow-md border-t-4 ${plan.borderTop} relative
                  hover:-translate-y-1 hover:shadow-xl transition-all duration-200
                  ${plan.highlight ? '-translate-y-2 shadow-[0_8px_32px_rgba(136,189,242,0.3)]' : ''}
                `}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className="absolute -top-3 right-5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white"
                    style={{ background: plan.color }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Plan Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: plan.bgLight }}>
                    <PlanIcon size={20} color={plan.color} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: plan.color }}>{plan.name}</h2>
                    <p className="text-xs text-[#6A89A7]">{plan.tagline}</p>
                  </div>
                </div>

                {/* Student Tier Selector */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-[#6A89A7] uppercase tracking-wide mb-1.5">
                    Select Student Count
                  </p>
                  <TierSelector
                    selectedTier={tiers[plan.id]}
                    onChange={(v) => setTier(plan.id, v)}
                    color={plan.color}
                  />
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-[#384959]">${price}</span>
                  <span className="text-sm text-[#6A89A7] font-medium">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {billing === 'yearly' && (
                  <p className="text-[10px] text-green-600 font-semibold mb-3">
                    ≈ ${Math.round(price / 12)}/mo billed annually
                  </p>
                )}
                {billing === 'monthly' && <div className="mb-3" />}

                {/* Meta */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { Icon: GraduationCap, val: studentTiers.find(t => t.value === tiers[plan.id])?.label.replace('Up to ', '').replace(' students', '') || '100', lbl: 'Students' },
                    { Icon: Users, val: plan.maxTeachers, lbl: 'Teachers' },
                    { Icon: HardDrive, val: plan.storage, lbl: 'Storage' },
                  ].map(({ Icon, val, lbl }, i) => (
                    <div key={i} className="rounded-xl p-2.5 flex flex-col items-center gap-1" style={{ background: plan.bgLight }}>
                      <Icon size={14} color={plan.color} />
                      <span className="text-xs font-bold text-[#384959] text-center leading-tight">{val}</span>
                      <span className="text-[9px] text-[#6A89A7] font-medium uppercase tracking-wide">{lbl}</span>
                    </div>
                  ))}
                </div>

                {/* Active Schools */}
                <div
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full w-fit mb-4"
                  style={{ background: plan.bgLight, color: plan.color }}
                >
                  <School size={12} color={plan.color} />
                  {plan.activeSchools} schools currently active
                </div>

                {/* Divider */}
                <div className="h-px bg-[#EFF6FD] my-3" />

                {/* Features */}
                <ul className="flex flex-col gap-2 mb-5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#384959]">
                      <Check size={13} color={plan.color} strokeWidth={3} className="shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#384959] opacity-35">
                      <X size={13} color="#999" strokeWidth={3} className="shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border-0"
                  style={{
                    background: plan.highlight ? plan.color : plan.bgLight,
                    color: plan.highlight ? '#fff' : plan.color,
                    border: `1.5px solid ${plan.color}40`,
                  }}
                >
                  Get Started
                  <ArrowRight size={14} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Pricing Reference Table */}
        <div className="mt-10 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EFF6FD] flex items-center gap-2">
            <Star size={16} color="#88BDF2" />
            <h3 className="font-bold text-[#384959] text-sm">Base Pricing by Student Count</h3>
            <span className="ml-2 text-xs text-[#6A89A7]">(plan pricing = base × plan multiplier)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#EFF6FD]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#6A89A7] uppercase tracking-wide">Student Range</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6A89A7] uppercase tracking-wide">Base Monthly</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6A89A7] uppercase tracking-wide">Starter (1×)</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#88BDF2] uppercase tracking-wide">Growth (1.5×)</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#384959] uppercase tracking-wide">Enterprise (2.5×)</th>
                </tr>
              </thead>
              <tbody>
                {studentTiers.map((tier, i) => (
                  <tr key={i} className={`border-t border-[#EFF6FD] hover:bg-[#EFF6FD40] transition-colors ${i % 2 === 0 ? '' : 'bg-[#EFF6FD20]'}`}>
                    <td className="px-6 py-3 font-medium text-[#384959]">{tier.label}</td>
                    <td className="px-4 py-3 text-center text-[#6A89A7] font-semibold">${tier.monthly}/mo</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: '#6A89A7' }}>${tier.monthly}/mo</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: '#88BDF2' }}>${Math.round(tier.monthly * 1.5)}/mo</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: '#384959' }}>${Math.round(tier.monthly * 2.5)}/mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PageLayout>
  )
}