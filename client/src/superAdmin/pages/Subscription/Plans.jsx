import React, { useState } from 'react'
import {
  Pencil, Trash2, ArrowUpCircle, Plus, Users, GraduationCap,
  HardDrive, Check, X, TrendingUp, School, DollarSign,
  Activity, ChevronRight
} from 'lucide-react'
import PageLayout from '../../components/PageLayout'

export default function Plans() {

  // ─── Data ───────────────────────────────────────────────────────────────────
  const plans = [
    {
      id: 1,
      name: 'Basic',
      monthlyPrice: 29,
      yearlyPrice: 290,
      description: 'Perfect for small schools getting started',
      badge: null,
      highlight: false,
      borderColor: 'border-t-[#6A89A7]',
      textColor: 'text-[#6A89A7]',
      bgLight: 'bg-[#6A89A710]',
      iconColor: '#6A89A7',
      badgeBg: 'bg-[#6A89A7]',
      upgradeStyle: 'bg-[#6A89A710] text-[#6A89A7] border border-[#6A89A740]',
      schoolCountStyle: 'bg-[#6A89A710] text-[#6A89A7]',
      students: '100',
      teachers: '10',
      storage: '5 GB',
      activeSchools: 142,
      features: ['Student Management', 'Attendance Tracking', 'Basic Grade Reports', 'Parent Portal', 'Email Support'],
      notIncluded: ['Custom Reports', 'API Access', 'Multi-branch', 'Priority Support'],
    },
    {
      id: 2,
      name: 'Standard',
      monthlyPrice: 79,
      yearlyPrice: 790,
      description: 'Ideal for growing institutions',
      badge: 'Most Popular',
      highlight: true,
      borderColor: 'border-t-[#88BDF2]',
      textColor: 'text-[#88BDF2]',
      bgLight: 'bg-[#88BDF210]',
      iconColor: '#88BDF2',
      badgeBg: 'bg-[#88BDF2]',
      upgradeStyle: 'bg-[#88BDF210] text-[#88BDF2] border border-[#88BDF240]',
      schoolCountStyle: 'bg-[#88BDF210] text-[#88BDF2]',
      students: '500',
      teachers: '50',
      storage: '25 GB',
      activeSchools: 389,
      features: ['Student Management', 'Attendance Tracking', 'Advanced Grade Reports', 'Parent Portal', 'Priority Support', 'Custom Reports', 'API Access'],
      notIncluded: ['Multi-branch'],
    },
    {
      id: 3,
      name: 'Premium',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      description: 'Full power for enterprise schools',
      badge: 'Best Value',
      highlight: false,
      borderColor: 'border-t-[#384959]',
      textColor: 'text-[#384959]',
      bgLight: 'bg-[#38495910]',
      iconColor: '#384959',
      badgeBg: 'bg-[#384959]',
      upgradeStyle: 'bg-[#38495910] text-[#384959] border border-[#38495940]',
      schoolCountStyle: 'bg-[#38495910] text-[#384959]',
      students: 'Unlimited',
      teachers: 'Unlimited',
      storage: '500 GB',
      activeSchools: 67,
      features: ['Student Management', 'Attendance Tracking', 'Advanced Grade Reports', 'Parent Portal', 'Priority Support', 'Custom Reports', 'API Access', 'Multi-branch'],
      notIncluded: [],
    },
  ]

  const stats = [
    { label: 'Total Revenue', value: '$128,400', sub: '+18.2% this month', Icon: DollarSign, accent: '#88BDF2', accentBg: 'bg-[#88BDF215]', border: 'border-l-[#88BDF2]' },
    { label: 'Active Schools', value: '598', sub: '+34 new this month', Icon: School, accent: '#6A89A7', accentBg: 'bg-[#6A89A715]', border: 'border-l-[#6A89A7]' },
    { label: 'Avg Plan Value', value: '$86/mo', sub: '+5.1% growth', Icon: TrendingUp, accent: '#88BDF2', accentBg: 'bg-[#88BDF215]', border: 'border-l-[#88BDF2]' },
    { label: 'Churn Rate', value: '2.4%', sub: '-0.3% improved', Icon: Activity, accent: '#6A89A7', accentBg: 'bg-[#6A89A715]', border: 'border-l-[#6A89A7]' },
  ]

  // ─── State ──────────────────────────────────────────────────────────────────
  const [billing, setBilling] = useState('monthly')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('edit')
  const [activePlan, setActivePlan] = useState(null)
  const [form, setForm] = useState({ name: '', monthlyPrice: '', yearlyPrice: '', students: '', teachers: '', storage: '' })

  const openEdit = (plan) => {
    setActivePlan(plan)
    setForm({ name: plan.name, monthlyPrice: plan.monthlyPrice, yearlyPrice: plan.yearlyPrice, students: plan.students, teachers: plan.teachers, storage: plan.storage })
    setModalType('edit')
    setShowModal(true)
  }

  const openAdd = () => {
    setActivePlan(null)
    setForm({ name: '', monthlyPrice: '', yearlyPrice: '', students: '', teachers: '', storage: '' })
    setModalType('add')
    setShowModal(true)
  }

  const formFields = [
    { label: 'Plan Name', key: 'name', type: 'text', placeholder: 'e.g. Standard' },
    { label: 'Monthly Price ($)', key: 'monthlyPrice', type: 'number', placeholder: '79' },
    { label: 'Yearly Price ($)', key: 'yearlyPrice', type: 'number', placeholder: '790' },
    { label: 'Max Students', key: 'students', type: 'text', placeholder: '500 or Unlimited' },
    { label: 'Max Teachers', key: 'teachers', type: 'text', placeholder: '50 or Unlimited' },
    { label: 'Storage', key: 'storage', type: 'text', placeholder: '25 GB' },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageLayout>
    <div className="min-h-screen bg-[#EFF6FD] p-8 font-sans text-[#384959]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-[#6A89A7] flex items-center gap-1 mb-1">
            SuperAdmin
            <ChevronRight size={12} />
            <span className="text-[#88BDF2] font-semibold">Subscription Plans</span>
          </p>
          <h1 className="text-3xl font-bold text-[#384959] mb-1">Subscription Plans</h1>
          <p className="text-sm text-[#6A89A7]">Manage pricing tiers and feature access for all schools</p>
        </div>
      
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
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

      {/* ── Billing Toggle ─────────────────────────────────────────────────── */}
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

      {/* ── Plan Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl p-6 shadow-md border-t-4 ${plan.borderColor} relative
              hover:-translate-y-1 hover:shadow-xl transition-all duration-200
              ${plan.highlight ? '-translate-y-2 shadow-[0_8px_32px_rgba(136,189,242,0.3)]' : ''}
            `}
          >
            {/* Badge */}
            {plan.badge && (
              <div className={`absolute -top-3 right-5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white ${plan.badgeBg}`}>
                {plan.badge}
              </div>
            )}

           

            {/* Plan Name */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-11 h-11 ${plan.bgLight} rounded-xl flex items-center justify-center shrink-0`}>
                <School size={20} color={plan.iconColor} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${plan.textColor}`}>{plan.name}</h2>
                <p className="text-xs text-[#6A89A7]">{plan.description}</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-extrabold text-[#384959]">
                ${billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
              </span>
              <span className="text-sm text-[#6A89A7] font-medium">
                /{billing === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>

            {/* Meta: Students / Teachers / Storage */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { Icon: GraduationCap, val: plan.students, lbl: 'Students' },
                { Icon: Users, val: plan.teachers, lbl: 'Teachers' },
                { Icon: HardDrive, val: plan.storage, lbl: 'Storage' },
              ].map(({ Icon, val, lbl }, i) => (
                <div key={i} className={`${plan.bgLight} rounded-xl p-2.5 flex flex-col items-center gap-1`}>
                  <Icon size={14} color={plan.iconColor} />
                  <span className="text-xs font-bold text-[#384959]">{val}</span>
                  <span className="text-[9px] text-[#6A89A7] font-medium uppercase tracking-wide">{lbl}</span>
                </div>
              ))}
            </div>

            {/* Active Schools Count */}
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full w-fit mb-4 ${plan.schoolCountStyle}`}>
              <School size={12} color={plan.iconColor} />
              {plan.activeSchools} schools currently active
            </div>

            {/* Divider */}
            <div className="h-px bg-[#EFF6FD] my-3" />

            {/* Features */}
            <ul className="flex flex-col gap-2">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#384959]">
                  <Check size={13} color={plan.iconColor} strokeWidth={3} className="shrink-0" />
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

            <button className={`w-full mt-10 items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-75 transition-all duration-200 cursor-pointer ml-auto ${plan.upgradeStyle}`}>
                <ArrowUpCircle size={12} /> Upgrade Plan
            </button>
          </div>
        ))}
      </div>

     
    </div>
    </PageLayout>
  )
}