import { useState, useEffect, useRef,useMemo  } from "react";
import {
    GraduationCap, Users, BookOpen, Shield, BarChart2,
    CheckCircle, ArrowRight, Star, School, UserCheck,
    ClipboardList, CalendarDays, Bell, FileText, Settings, TrendingUp,
    ChevronRight, BadgeCheck, Landmark, PencilLine,
    Wallet, UsersRound, LayoutDashboard
} from "lucide-react";
// import Navbar from "./Navbar";
// import Footer from "./Footer";

// Brand: #6A89A7 · #BDDDFC · #88BDF2 · #384959

const FEATURES = [
    { Icon: GraduationCap, title: "Student Management", desc: "Maintain complete student profiles personal info, enrollment records, academic history, and attendance all in one place." },
    { Icon: Users, title: "Teacher & Staff Portal", desc: "Manage teacher assignments, timetables, leave requests, and staff records through a dedicated staff control panel." },
    { Icon: UsersRound, title: "Parent Module", desc: "Give parents real-time visibility into their child's attendance, grades, fee status, and school announcements." },
    { Icon: Wallet, title: "Finance Management", desc: "Track fee collection, generate receipts, manage salary payouts, and get full financial reports with one click." },
    { Icon: Shield, title: "Super Admin Control", desc: "A powerful super-admin layer to manage multiple schools, user roles, permissions, and system-wide configurations." },
    { Icon: BarChart2, title: "Academic Analytics", desc: "Visual dashboards with grade trends, attendance heatmaps, and performance breakdowns per class, section, and subject." },
];

const STATS = [
    { value: "5000+", label: "Students Managed", Icon: GraduationCap },
    { value: "200+", label: "Staff Onboarded", Icon: Users },
    { value: "98%", label: "Uptime Reliability", Icon: TrendingUp },
    { value: "6", label: "Modules Built", Icon: LayoutDashboard },
];

const HOW_IT_WORKS = [
    { step: "01", title: "Super Admin Sets Up", desc: "Super Admin configures the school, creates departments, and sets up role-based access for admins, teachers, and parents.", Icon: Settings },
    { step: "02", title: "Admins Onboard Users", desc: "School admins add students, assign teachers to classes, manage timetables, and configure the finance structure.", Icon: UserCheck },
    { step: "03", title: "Everyone Works Smarter", desc: "Teachers mark attendance, parents track progress, finance team collects fees all from one unified CRM platform.", Icon: BarChart2 },
];

const ROLES = [
    { role: "Super Admin", Icon: Shield, perms: ["Manage all schools", "Configure system settings", "Full access control"] },
    { role: "Admin", Icon: School, perms: ["Manage students & staff", "Handle admissions", "Generate reports"] },
    { role: "Teacher", Icon: BookOpen, perms: ["Mark attendance", "Enter exam marks", "View class timetable"] },
    { role: "Parent", Icon: UsersRound, perms: ["View child's progress", "Check fee status", "Get notifications"] },
];

const CHECK_ITEMS = [
    { Icon: Landmark, text: "Prisma-powered database fast, reliable, structured" },
    { Icon: FileText, text: "Separate server routes for Finance, Staff, Student, Parent" },
    { Icon: BadgeCheck, text: "Role-based authentication for every user type" },
    { Icon: Shield, text: "Backup system built in your data is always safe" },
    { Icon: LayoutDashboard, text: "Responsive on all screen sizes desktop, tablet, mobile" },
];

function GreetingHeader() {
  const { greeting, monthYear } = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();

    let greetingText = "Hello";
    if (hours < 12) greetingText = "Good morning 👋";
    else if (hours < 17) greetingText = "Good afternoon ☀️";
    else greetingText = "Good evening 🌙";

    const monthYearText = now.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });

    return {
      greeting: greetingText,
      monthYear: `${monthYearText} · Term 2`,
    };
  }, []);

  return { greeting, monthYear }; // 👈 ADD THIS
}

function AnimatedCounter({ target }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const num = parseInt(target.replace(/[^0-9]/g, ""));
                if (!num) return;
                let cur = 0;
                const step = Math.ceil(num / 60);
                const timer = setInterval(() => {
                    cur += step;
                    if (cur >= num) { setCount(num); clearInterval(timer); }
                    else setCount(cur);
                }, 25);
            }
        }, { threshold: 0.4 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target]);
    const hasPlus = target.includes("+");
    const hasPercent = target.includes("%");
    const num = parseInt(target.replace(/[^0-9]/g, ""));
    return <span ref={ref}>{num ? count.toLocaleString() + (hasPlus ? "+" : hasPercent ? "%" : "") : target}</span>;
}

export default function Home() {
    const [activeFeature, setActiveFeature] = useState(null);
    const { greeting, monthYear } = GreetingHeader();
    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 to-blue-100 text-slate-800 font-sans">

            {/* ── HERO ── */}
            <section
                id="home"
                className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: "linear-gradient(to bottom right, #eff6ff 0%, #dbeafe 100%), linear-gradient(to bottom, rgba(95, 127, 141, 0.47) 0%, rgba(255,255,255,0.89) 60%, rgba(248,251,255,1) 100%), url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1800&q=80&auto=format&fit=crop')" }}  
                
            >
                {/* dot grid */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: "radial-gradient(rgba(106, 137, 167, 0.23) 1.5px, transparent 1.5px)",
                        backgroundSize: "28px 28px",
                    }}
                />
                {/* blobs */}
                <div className="absolute top-20 right-20 w-80 h-80 rounded-full pointer-events-none opacity-50"
                    style={{ background: "rgba(136,189,242,0.25)", filter: "blur(70px)" }} />
                <div className="absolute bottom-24 left-16 w-64 h-64 rounded-full pointer-events-none opacity-50"
                    style={{ background: "rgba(106,137,167,0.18)", filter: "blur(60px)" }} />

                <div className="relative z-10 w-full max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* LEFT */}
                    <div>
                        <div
                            className="w-max-lg mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold mb-7 tracking-wide"
                            style={{ background: "rgba(189,221,252,0.35)", borderColor: "#BDDDFC", color: "#6A89A7" }}
                        >
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#6A89A7" }} />
                            Complete School Management System Built &amp; Ready
                        </div>

                        <h1
                            className="text-5xl lg:text-6xl font-black leading-tight mb-1"
                            style={{ color: "#1a2533", fontFamily: "Georgia, serif" }}
                        >
                            One Platform to
                        </h1>
                        <h1
                            className="text-5xl lg:text-6xl font-black leading-tight mb-6 bg-clip-text text-transparent"
                            style={{
                                fontFamily: "Georgia, serif",
                                backgroundImage: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)",
                            }}
                        >
                            Manage Your Entire School
                        </h1>

                        <p className="text-base leading-relaxed mb-9 max-w-md" style={{ color: "#5a7a96" }}>
                             Education Management Software brings together students, teachers, parents, finance, and administration into a single
                            powerful system built with role-based access so everyone gets exactly what they need.
                        </p>

                        <div className="flex flex-wrap gap-3 mb-8">
                            <button
                                onClick={() => (window.location.href = "/login")}
                                className="relative overflow-hidden flex items-center gap-2 px-8 py-3.5 cursor-pointer rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 active:scale-95"
                                style={{
                                    background: "linear-gradient(135deg, #384959 0%, #6A89A7 50%, #88BDF2 100%)",
                                    boxShadow: "0 8px 32px rgba(106,137,167,0.35)",
                                }}
                            >
                                Access Dashboard <ArrowRight size={16} />
                            </button>
                            <button
                            onClick={() => window.open("https://youtu.be/ozxbGKDpR14", "_blank")}
                            className="relative overflow-hidden flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold cursor-pointer text-sm text-white transition-all hover:-translate-y-0.5 active:scale-95"
                            style={{
                                background: "linear-gradient(135deg, #384959 0%, #6A89A7 50%, #88BDF2 100%)",
                                boxShadow: "0 8px 32px rgba(106,137,167,0.35)",
                            }}
                            > 
                            Watch Demo <ArrowRight size={16} />
                            </button>
                           
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: "#9db8cc" }}>Roles:</span>
                            {[
                                { label: "Super Admin", Icon: Shield },
                                { label: "Admin", Icon: School },
                                { label: "Teacher", Icon: BookOpen },
                                { label: "Finance", Icon: Wallet },
                                { label: "Parent", Icon: UsersRound },
                                { label: "Student", Icon: GraduationCap },
                            ].map(({ label, Icon: Ic }) => (
                                <span
                                    key={label}
                                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium border"
                                    style={{ background: "rgba(240,247,255,0.95)", borderColor: "#BDDDFC", color: "#6A89A7" }}
                                >
                                    <Ic size={11} /> {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT Dashboard mockup */}
                    <div className="flex justify-center" style={{ animation: "float 4s ease-in-out infinite" }}>
                        <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
                        <div
                            className="w-full max-w-5xl rounded-2xl overflow-hidden border border-slate-100 bg-white"
                            style={{ boxShadow: "0 24px 80px rgba(56,73,89,0.16), 0 4px 24px rgba(106,137,167,0.12)" }}
                        >
                            {/* Browser chrome */}
                            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                                <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                                </div>
                                <div
                                    className="flex-1 bg-white border border-slate-100 rounded-md px-3 py-1 text-center text-xs"
                                    style={{ color: "#9db8cc" }}
                                >
                                     Education Management Software.app/admin/dashboard
                                </div>
                            </div>

                            {/* Dashboard body */}
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: "#1a2533" }}>{greeting}</p>
                                        <p className="text-xs mt-0.5" style={{ color: "#9db8cc" }}>{monthYear}</p>
                                    </div>
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center border"
                                        style={{ background: "#f0f7ff", borderColor: "#BDDDFC" }}
                                    >
                                        <Bell size={15} color="#6A89A7" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5 mb-4">
                                    {[
                                        { Icon: GraduationCap, value: "1,248", label: "Students" },
                                        { Icon: Users, value: "84", label: "Teachers" },
                                        { Icon: BookOpen, value: "36", label: "Classes" },
                                    ].map((s, i) => (
                                        <div key={i} className="rounded-xl p-3 text-center border" style={{ background: "#f8fbff", borderColor: "#e8f1fa" }}>
                                            <s.Icon size={15} color="#88BDF2" className="mx-auto mb-1" />
                                            <p className="text-base font-bold leading-tight" style={{ color: "#1a2533" }}>{s.value}</p>
                                            <p className="text-xs mt-0.5" style={{ color: "#9db8cc" }}>{s.label}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-xl p-3.5 mb-3 border" style={{ background: "#f8fbff", borderColor: "#e8f1fa" }}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays size={12} color="#6A89A7" />
                                            <span className="text-xs font-semibold" style={{ color: "#384959" }}>Today's Attendance</span>
                                        </div>
                                        <span className="text-xs font-bold" style={{ color: "#384959" }}>94.2%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#e8f1fa" }}>
                                        <div className="h-full rounded-full w-[94%]" style={{ background: "linear-gradient(90deg, #6A89A7, #88BDF2)" }} />
                                    </div>
                                </div>

                                <div className="rounded-xl p-3.5 mb-3 border" style={{ background: "#f8fbff", borderColor: "#e8f1fa" }}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Wallet size={12} color="#6A89A7" />
                                            <span className="text-xs font-semibold" style={{ color: "#384959" }}>Fee Collection April</span>
                                        </div>
                                        <TrendingUp size={13} color="#88BDF2" />
                                    </div>
                                    <p className="text-xl font-black" style={{ color: "#1a2533", fontFamily: "Georgia, serif" }}>₹8,42,000</p>
                                    <p className="text-xs mb-2" style={{ color: "#9db8cc" }}>of ₹10,00,000 target</p>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#e8f1fa" }}>
                                        <div className="h-full rounded-full w-[84%]" style={{ background: "linear-gradient(90deg, #384959, #6A89A7)" }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-1.5 mb-2.5">
                                        <Bell size={11} color="#9db8cc" />
                                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9db8cc" }}>Recent Activity</span>
                                    </div>
                                    {[
                                        { Icon: Wallet, text: "Arjun Kumar's fee paid ₹8,400", color: "#6A89A7" },
                                        { Icon: ClipboardList, text: "Class 10A results published", color: "#88BDF2" },
                                        { Icon: UsersRound, text: "New parent account created", color: "#384959" },
                                    ].map((a, i) => (
                                        <div key={i} className={`flex items-center gap-2 py-1.5 ${i < 2 ? "border-b border-slate-50" : ""}`}>
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f0f7ff" }}>
                                                <a.Icon size={11} color={a.color} />
                                            </div>
                                            <span className="text-xs" style={{ color: "#384959" }}>{a.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* DIVIDER */}
            <div className="h-px opacity-35" style={{ background: "linear-gradient(90deg, transparent, #88BDF2, #6A89A7, #88BDF2, transparent)" }} />

            {/* ── STATS ── */}
            <section className="py-14" style={{ background: "#f5f9ff" }}>
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {STATS.map((s) => (
                        <div key={s.label} className="flex flex-col items-center gap-2.5">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#e8f3fd" }}>
                                <s.Icon size={22} color="#6A89A7" />
                            </div>
                            <div
                                className="text-4xl font-black bg-clip-text text-transparent"
                                style={{ fontFamily: "Georgia, serif", backgroundImage: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)" }}
                            >
                                <AnimatedCounter target={s.value} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: "#6A89A7" }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="h-px opacity-35" style={{ background: "linear-gradient(90deg, transparent, #88BDF2, #6A89A7, #88BDF2, transparent)" }} />

            {/* ── FEATURES ── */}
            <section
                id="features"
                className="py-24 bg-cover bg-center"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(248,251,255,0.97), rgba(248,251,255,0.97)), url('https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80&auto=format&fit=crop')",
                }}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <div
                            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-widest mb-4"
                            style={{ background: "#e8f3fd", borderColor: "#BDDDFC", color: "#6A89A7" }}
                        >
                            <LayoutDashboard size={12} /> What's Inside  Education Management Software
                        </div>
                        <h2 className="text-4xl font-black mb-4" style={{ color: "#1a2533", fontFamily: "Georgia, serif" }}>
                            Every Module Your{" "}
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)" }}
                            >
                                School Needs
                            </span>
                        </h2>
                        <p className="text-base max-w-lg mx-auto" style={{ color: "#6A89A7" }}>
                            Built with dedicated portals for each role so every stakeholder gets exactly what they need.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES.map((f, i) => (
                            <div
                                key={i}
                                onMouseEnter={() => setActiveFeature(i)}
                                onMouseLeave={() => setActiveFeature(null)}
                                className="rounded-2xl p-7 bg-white border transition-all duration-300 cursor-default hover:-translate-y-1"
                                style={{
                                    borderColor: activeFeature === i ? "#88BDF2" : "#e2edf7",
                                    boxShadow: activeFeature === i ? "0 12px 40px rgba(136,189,242,0.15)" : "0 2px 12px rgba(106,137,167,0.06)",
                                }}
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors duration-300"
                                    style={{ background: activeFeature === i ? "#e8f3fd" : "#f5f9ff" }}
                                >
                                    <f.Icon size={22} color={activeFeature === i ? "#6A89A7" : "#9db8cc"} />
                                </div>
                                <h3
                                    className="text-lg font-bold mb-2.5 transition-colors duration-300"
                                    style={{ color: activeFeature === i ? "#384959" : "#1a2533", fontFamily: "Georgia, serif" }}
                                >
                                    {f.title}
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: "#6A89A7" }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 rounded-3xl overflow-hidden relative h-64 shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1600&q=80&auto=format&fit=crop"
                            alt="Teacher helping students"
                            className="w-full h-full object-cover object-[center_30%]"
                        />
                        <div
                            className="absolute inset-0 flex items-center px-12"
                            style={{ background: "linear-gradient(to right, rgba(56,73,89,0.82) 0%, rgba(56,73,89,0.3) 60%, transparent 100%)" }}
                        >
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#BDDDFC" }}>Real Impact</p>
                                <p className="text-2xl font-black text-white max-w-md leading-snug" style={{ fontFamily: "Georgia, serif" }}>
                                    Empowering teachers to focus on what matters most teaching.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── ROLES ── */}
            <section
                className="py-24 bg-cover bg-center"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(240,247,255,0.97), rgba(240,247,255,0.97)), url('https://images.unsplash.com/photo-1544717305-2782549b5136?w=1600&q=80&auto=format&fit=crop')",
                }}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <div
                            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-widest mb-4"
                            style={{ background: "#e8f3fd", borderColor: "#BDDDFC", color: "#6A89A7" }}
                        >
                            <UserCheck size={12} /> Role-Based Access
                        </div>
                        <h2 className="text-4xl font-black mb-4" style={{ color: "#1a2533", fontFamily: "Georgia, serif" }}>
                            The Right Tools for{" "}
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)" }}
                            >
                                Every Role
                            </span>
                        </h2>
                        <p className="text-base max-w-lg mx-auto" style={{ color: "#6A89A7" }}>
                            Each user logs in to a tailored dashboard no clutter, no confusion.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {ROLES.map((r, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-sky-300"
                                style={{ borderColor: "#e8f1fa" }}
                            >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#e8f3fd" }}>
                                    <r.Icon size={22} color="#6A89A7" />
                                </div>
                                <h3 className="text-lg font-bold mb-4" style={{ color: "#384959", fontFamily: "Georgia, serif" }}>{r.role}</h3>
                                <ul className="space-y-2.5 mb-5">
                                    {r.perms.map((p, j) => (
                                        <li key={j} className="flex items-start gap-2">
                                            <CheckCircle size={14} color="#88BDF2" className="flex-shrink-0 mt-0.5" />
                                            <span className="text-xs leading-snug" style={{ color: "#6A89A7" }}>{p}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => (window.location.href = "/login")}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs cursor-pointer font-semibold border transition-all hover:bg-blue-50 hover:border-sky-300"
                                    style={{ background: "#f0f7ff", borderColor: "#BDDDFC", color: "#6A89A7" }}
                                >
                                    Sign In as {r.role} <ChevronRight size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section
                id="how-it-works"
                className="py-24 bg-cover bg-center"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(248,251,255,0.96), rgba(248,251,255,0.96)), url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=80&auto=format&fit=crop')",
                }}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div
                            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-widest mb-4"
                            style={{ background: "#e8f3fd", borderColor: "#BDDDFC", color: "#6A89A7" }}
                        >
                            <CalendarDays size={12} /> Simple Process
                        </div>
                        <h2 className="text-4xl font-black" style={{ color: "#1a2533", fontFamily: "Georgia, serif" }}>
                            Up &amp; Running in{" "}
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)" }}
                            >
                                3 Steps
                            </span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {HOW_IT_WORKS.map((s, i) => (
                            <div key={i} className="text-center relative">
                                <div
                                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-100 mb-5 relative"
                                    style={{ boxShadow: "0 4px 20px rgba(106,137,167,0.12)" }}
                                >
                                    <s.Icon size={26} color="#6A89A7" />
                                    <div
                                        className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{ background: "linear-gradient(135deg, #6A89A7, #88BDF2)" }}
                                    >
                                        {s.step}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3" style={{ color: "#384959", fontFamily: "Georgia, serif" }}>{s.title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: "#6A89A7" }}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16">
                        {[
                            { url: "https://s39613.pcdn.co/wp-content/uploads/2018/02/students-collaborating-id527370201-1.jpg", caption: "Students Learning Together" },
                            { url: "https://data-flair.training/blogs/wp-content/uploads/sites/2/2023/04/private-school.webp", caption: "Classroom Environment" },
                            { url: "https://insider.augusta.edu/wp-content/uploads/sites/25/2023/08/smiling-teacher-classroom.jpg", caption: "Teacher Engagement" },
                        ].map((img, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden relative h-48 shadow-md group">
                                <img
                                    src={img.url}
                                    alt={img.caption}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div
                                    className="absolute bottom-0 left-0 right-0 px-4 py-3 pt-8"
                                    style={{ background: "linear-gradient(to top, rgba(56,73,89,0.75), transparent)" }}
                                >
                                    <span className="text-xs font-semibold text-white">{img.caption}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ABOUT ── */}
            <section
                id="about"
                className="py-24 bg-cover bg-center"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(240,247,255,0.97), rgba(240,247,255,0.97)), url('https://images.unsplash.com/photo-1588072432836-e10032774350?w=1600&q=80&auto=format&fit=crop')",
                }}
            >
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Finance mockup */}
                    <div className="relative">
                        <div className="rounded-3xl p-6 bg-white border shadow-2xl" style={{ borderColor: "#e2edf7" }}>
                            <div className="flex justify-between items-start mb-5">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Wallet size={17} color="#6A89A7" />
                                        <span className="font-bold text-base" style={{ color: "#384959", fontFamily: "Georgia, serif" }}>Finance Dashboard</span>
                                    </div>
                                    <p className="text-xs" style={{ color: "#9db8cc" }}>April 2025 · Q4 Report</p>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "#e8f3fd" }}>
                                    <TrendingUp size={12} color="#6A89A7" />
                                    <span className="text-xs font-semibold" style={{ color: "#6A89A7" }}>Live</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[
                                    { l: "Total Collected", v: "₹42.8L", t: "↑ 12%", pos: true, Icon: TrendingUp },
                                    { l: "Pending Fees", v: "₹6.2L", t: "↓ 8%", pos: false, Icon: Bell },
                                    { l: "Salary Paid", v: "₹18.4L", t: "On time", pos: true, Icon: CheckCircle },
                                    { l: "Net Balance", v: "₹18.2L", t: "↑ 5%", pos: true, Icon: BarChart2 },
                                ].map((f) => (
                                    <div key={f.l} className="rounded-xl p-3.5 border" style={{ background: "#f5f9ff", borderColor: "#e2edf7" }}>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <f.Icon size={12} color="#9db8cc" />
                                            <span className="text-xs" style={{ color: "#9db8cc" }}>{f.l}</span>
                                        </div>
                                        <p className="text-lg font-bold" style={{ color: "#384959", fontFamily: "Georgia, serif" }}>{f.v}</p>
                                        <p className={`text-xs font-semibold mt-0.5 ${f.pos ? "text-green-500" : "text-red-400"}`}>{f.t}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-xl p-3.5 border" style={{ background: "#f5f9ff", borderColor: "#e2edf7" }}>
                                <div className="flex items-center gap-1.5 mb-3">
                                    <BarChart2 size={12} color="#6A89A7" />
                                    <span className="text-xs font-medium" style={{ color: "#6A89A7" }}>Class-wise Fee Collection</span>
                                </div>
                                {[
                                    { cls: "Class 10", pct: 91 },
                                    { cls: "Class 9", pct: 87 },
                                    { cls: "Class 8", pct: 79 },
                                    { cls: "Class 7", pct: 95 },
                                ].map((c) => (
                                    <div key={c.cls} className="mb-2.5">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-medium" style={{ color: "#6A89A7" }}>{c.cls}</span>
                                            <span className="text-xs font-bold" style={{ color: "#384959" }}>{c.pct}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#e2edf7" }}>
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${c.pct}%`, background: "linear-gradient(90deg, #6A89A7, #88BDF2)" }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="absolute -bottom-4 -right-4 rounded-2xl p-3.5 bg-white border shadow-lg" style={{ borderColor: "#e2edf7" }}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#e8f3fd" }}>
                                    <Bell size={17} color="#6A89A7" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold" style={{ color: "#384959" }}>Fee Receipt Sent</p>
                                    <p className="text-xs" style={{ color: "#9db8cc" }}>312 parents notified</p>
                                </div>
                                <span className="w-2 h-2 rounded-full ml-1" style={{ background: "#88BDF2" }} />
                            </div>
                        </div>
                    </div>

                    {/* Text */}
                    <div>
                        <div
                            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-widest mb-4"
                            style={{ background: "#e8f3fd", borderColor: "#BDDDFC", color: "#6A89A7" }}
                        >
                            <School size={12} /> Why  Education Management Software
                        </div>
                        <h2 className="text-4xl font-black mb-5" style={{ color: "#1a2533", fontFamily: "Georgia, serif" }}>
                            Every Department,{" "}
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)" }}
                            >
                                One System
                            </span>
                        </h2>
                        <p className="text-base leading-relaxed mb-7" style={{ color: "#6A89A7" }}>
                             Education Management Software isn't just student records. It's a complete ecosystem from finance and staff management
                            to parent portals and academic reporting all talking to each other in real time.
                        </p>
                        <ul className="space-y-4 mb-10">
                            {CHECK_ITEMS.map(({ Icon: Ic, text }, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#e8f3fd" }}>
                                        <Ic size={16} color="#6A89A7" />
                                    </div>
                                    <span className="text-sm leading-relaxed pt-2" style={{ color: "#6A89A7" }}>{text}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => (window.location.href = "/login")}
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5"
                            style={{
                                background: "linear-gradient(135deg, #384959 0%, #6A89A7 50%, #88BDF2 100%)",
                                boxShadow: "0 8px 28px rgba(106,137,167,0.3)",
                            }}
                        >
                            Open Your Dashboard <ArrowRight size={16} />
                        </button>
                       
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section
                className="py-24 bg-cover bg-center"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(248,251,255,0.97), rgba(248,251,255,0.97)), url('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=80&auto=format&fit=crop')",
                }}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <div
                            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-widest mb-4"
                            style={{ background: "#e8f3fd", borderColor: "#BDDDFC", color: "#6A89A7" }}
                        >
                            <Star size={12} /> Testimonials
                        </div>
                        <h2 className="text-4xl font-black mb-3" style={{ color: "#1a2533", fontFamily: "Georgia, serif" }}>
                            What{" "}
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)" }}
                            >
                                Educators Say
                            </span>
                        </h2>
                        <p className="text-sm" style={{ color: "#9db8cc" }}>From the people who use  Education Management Software every day</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { quote: "Managing 1,200 students used to be chaos.  Education Management Software made it completely organized attendance, fees, results all in one place.", name: "Priya Sharma", role: "Principal, Delhi Public School", Icon: School },
                            { quote: "The finance module is exactly what we needed. Fee collection, reminders, and reports everything automated and clean.", name: "Rajesh Nair", role: "Finance Head, Kendriya Vidyalaya", Icon: Wallet },
                            { quote: "As a parent I can see my child's attendance and marks anytime. The notifications keep me in the loop.", name: "Meena Iyer", role: "Parent, Presidency School", Icon: UsersRound },
                        ].map((t, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                style={{ borderColor: "#e8f1fa" }}
                            >
                                <div className="flex gap-0.5 mb-4">
                                    {[...Array(5)].map((_, j) => <Star key={j} size={14} color="#88BDF2" fill="#88BDF2" />)}
                                </div>
                                <p className="text-sm leading-relaxed italic mb-6" style={{ color: "#6A89A7" }}>"{t.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0"
                                        style={{ background: "#e8f3fd", borderColor: "#BDDDFC" }}
                                    >
                                        <t.Icon size={19} color="#6A89A7" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: "#384959" }}>{t.name}</p>
                                        <p className="text-xs" style={{ color: "#9db8cc" }}>{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                   
                </div>
            </section>

            {/* ── CTA ── */}
            <section
                id="contact"
                className="py-24 relative overflow-hidden bg-cover bg-center"
                style={{
                    backgroundImage:
                        "linear-gradient(135deg, rgba(56,73,89,0.95), rgba(106,137,167,0.92)), url('https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=80&auto=format&fit=crop')",
                }}
            >
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.2) 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }}
                />
                <div className="relative max-w-2xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-white/25 bg-white/15 text-white text-sm font-medium mb-8">
                        <GraduationCap size={14} /> Your school management system is ready just sign in
                    </div>
                    <h2 className="text-5xl font-black text-white mb-5" style={{ fontFamily: "Georgia, serif" }}>
                        Ready to Run Your School Smarter?
                    </h2>
                    <p className="text-lg text-white/70 max-w-md mx-auto mb-10">
                        Everything is built. Students, teachers, parents, finance all waiting. Just sign in and start managing.
                    </p>
                    <div className="flex justify-center gap-4 flex-wrap cursor-pointer">
                        
                        <button
                            onClick={() => (window.location.href = "/login")}
                            className="inline-flex items-center gap-2 border border-white/35 bg-white/10 text-white px-10 py-4 rounded-2xl text-base font-medium transition-all hover:bg-white/20"
                        >
                            <ArrowRight size={16} /> Sign In
                        </button>
                    </div>
                </div>
            </section>

            {/* <Footer onScrollTo={scrollTo} /> */}
        </div>
    );
}