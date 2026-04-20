import { useState, useEffect, useRef } from "react";
import {
    GraduationCap, Users, BookOpen, DollarSign, Shield, BarChart2,
    CheckCircle, ArrowRight, Menu, X, Star, School, UserCheck,
    ClipboardList, CalendarDays, Bell, FileText, Settings, TrendingUp,
    ChevronRight, Twitter, Facebook, Linkedin, Youtube, BadgeCheck,
    Landmark, BookMarked, PencilLine, Wallet, UsersRound, LayoutDashboard
} from "lucide-react";

// Brand Colors: #6A89A7 · #BDDDFC · #88BDF2 · #384959

const NAV_LINKS = ["Home", "Features", "About", "How It Works", "Contact"];

const FEATURES = [
    { Icon: GraduationCap, title: "Student Management", desc: "Maintain complete student profiles — personal info, enrollment records, academic history, and attendance — all in one place.", color: "#6A89A7" },
    { Icon: Users, title: "Teacher & Staff Portal", desc: "Manage teacher assignments, timetables, leave requests, and staff records through a dedicated staff control panel.", color: "#384959" },
    { Icon: UsersRound, title: "Parent Module", desc: "Give parents real-time visibility into their child's attendance, grades, fee status, and school announcements.", color: "#6A89A7" },
    { Icon: Wallet, title: "Finance Management", desc: "Track fee collection, generate receipts, manage salary payouts, and get full financial reports with one click.", color: "#384959" },
    { Icon: Shield, title: "Super Admin Control", desc: "A powerful super-admin layer to manage multiple schools, user roles, permissions, and system-wide configurations.", color: "#6A89A7" },
    { Icon: BarChart2, title: "Academic Analytics", desc: "Visual dashboards with grade trends, attendance heatmaps, and performance breakdowns per class, section, and subject.", color: "#384959" },
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
    { step: "03", title: "Everyone Works Smarter", desc: "Teachers mark attendance, parents track progress, finance team collects fees — all from one unified CRM platform.", Icon: BarChart2 },
];

const ROLES = [
    { role: "Super Admin", Icon: Shield, perms: ["Manage all schools", "Configure system settings", "Full access control"], color: "#384959" },
    { role: "Admin", Icon: School, perms: ["Manage students & staff", "Handle admissions", "Generate reports"], color: "#6A89A7" },
    { role: "Teacher", Icon: BookOpen, perms: ["Mark attendance", "Enter exam marks", "View class timetable"], color: "#384959" },
    { role: "Parent", Icon: UsersRound, perms: ["View child's progress", "Check fee status", "Get notifications"], color: "#6A89A7" },
];

const CHECK_ITEMS = [
    { Icon: Landmark, text: "Prisma-powered database — fast, reliable, structured" },
    { Icon: FileText, text: "Separate server routes for Finance, Staff, Student, Parent" },
    { Icon: BadgeCheck, text: "Role-based authentication for every user type" },
    { Icon: Shield, text: "Backup system built in — your data is always safe" },
    { Icon: LayoutDashboard, text: "Responsive on all screen sizes — desktop, tablet, mobile" },
];

// School image strips for the marquee
const SCHOOL_IMAGES = [
    { url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80&auto=format&fit=crop", alt: "Students in classroom" },
    { url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80&auto=format&fit=crop", alt: "Blackboard classroom" },
    { url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&q=80&auto=format&fit=crop", alt: "Teacher in class" },
    { url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80&auto=format&fit=crop", alt: "Students studying" },
    { url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80&auto=format&fit=crop", alt: "School library books" },
    { url: "https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80&auto=format&fit=crop", alt: "School building" },
    { url: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&q=80&auto=format&fit=crop", alt: "Students on campus" },
    { url: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&q=80&auto=format&fit=crop", alt: "Teacher helping student" },
];

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

export default function SchoolCRMLanding() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeFeature, setActiveFeature] = useState(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        setMenuOpen(false);
    };

    return (
        <div style={{ minHeight: "100vh", background: "#ffffff", color: "#1a2533", overflowX: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .font-display { font-family: 'Playfair Display', serif; }

        .brand-gt {
          background: linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .brand-bg {
          background: linear-gradient(135deg, #384959 0%, #6A89A7 50%, #88BDF2 100%);
        }
        .dot-grid {
          background-image: radial-gradient(rgba(106,137,167,0.12) 1.5px, transparent 1.5px);
          background-size: 28px 28px;
        }
        .nav-blur {
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .card-hover {
          transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
        }
        .card-hover:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 48px rgba(106,137,167,0.18);
        }
        .shine-btn {
          position: relative;
          overflow: hidden;
        }
        .shine-btn::after {
          content: '';
          position: absolute;
          top: -50%; left: -75%;
          width: 50%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          transform: skewX(-20deg);
          transition: left 0.5s;
        }
        .shine-btn:hover::after { left: 125%; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pdot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* ── Sliding headline animation (right→left then left→right) ── */
        @keyframes slideRTL {
          0%   { transform: translateX(60px);  opacity: 0; }
          15%  { transform: translateX(0);     opacity: 1; }
          80%  { transform: translateX(0);     opacity: 1; }
          100% { transform: translateX(-60px); opacity: 0; }
        }
        @keyframes slideLTR {
          0%   { transform: translateX(-60px); opacity: 0; }
          15%  { transform: translateX(0);     opacity: 1; }
          80%  { transform: translateX(0);     opacity: 1; }
          100% { transform: translateX(60px);  opacity: 0; }
        }
        .slide-rtl { animation: slideRTL 3.6s ease-in-out infinite; }
        .slide-ltr { animation: slideLTR 3.6s ease-in-out 3.6s infinite; }

        /* ── Image marquee strip ── */
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .marquee-track-left  { display: flex; gap: 16px; width: max-content; animation: marquee-left  28s linear infinite; }
        .marquee-track-right { display: flex; gap: 16px; width: max-content; animation: marquee-right 28s linear infinite; }
        .marquee-track-left:hover,
        .marquee-track-right:hover { animation-play-state: paused; }
        .marquee-img {
          width: 260px;
          height: 170px;
          object-fit: cover;
          border-radius: 16px;
          flex-shrink: 0;
          box-shadow: 0 8px 24px rgba(106,137,167,0.18);
          transition: transform 0.3s;
        }
        .marquee-img:hover { transform: scale(1.04); }

        .float-anim { animation: float 4s ease-in-out infinite; }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.18s; }
        .d3 { animation-delay: 0.32s; }
        .d4 { animation-delay: 0.46s; }
        .pdot { animation: pdot 2s ease-in-out infinite; }

        .section-div {
          height: 1px;
          background: linear-gradient(90deg, transparent, #88BDF2, #6A89A7, #88BDF2, transparent);
          opacity: 0.35;
        }
        .role-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1.5px solid #e8f1fa;
          transition: transform 0.28s, box-shadow 0.28s, border-color 0.28s;
        }
        .role-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 40px rgba(106,137,167,0.15);
          border-color: #88BDF2;
        }
        .tcard {
          background: #ffffff;
          border: 1.5px solid #e8f1fa;
          border-radius: 20px;
          transition: transform 0.28s, box-shadow 0.28s;
        }
        .tcard:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 36px rgba(106,137,167,0.14);
        }

        /* section backgrounds with Unsplash education images */
        .edu-hero-bg {
          background-image:
            linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.88) 60%, rgba(248,251,255,1) 100%),
            url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1800&q=80&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .edu-features-bg {
          background-image:
            linear-gradient(rgba(248,251,255,0.97), rgba(248,251,255,0.97)),
            url('https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }
        .edu-roles-bg {
          background-image:
            linear-gradient(rgba(240,247,255,0.97), rgba(240,247,255,0.97)),
            url('https://images.unsplash.com/photo-1544717305-2782549b5136?w=1600&q=80&auto=format&fit=crop');
          background-size: cover;
          background-position: center top;
        }
        .edu-hiw-bg {
          background-image:
            linear-gradient(rgba(248,251,255,0.96), rgba(248,251,255,0.96)),
            url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=80&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }
        .edu-about-bg {
          background-image:
            linear-gradient(rgba(240,247,255,0.97), rgba(240,247,255,0.97)),
            url('https://images.unsplash.com/photo-1588072432836-e10032774350?w=1600&q=80&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
        }
        .edu-testimonials-bg {
          background-image:
            linear-gradient(rgba(248,251,255,0.97), rgba(248,251,255,0.97)),
            url('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=80&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
        }
        .edu-cta-bg {
          background-image:
            linear-gradient(135deg, rgba(56,73,89,0.95), rgba(106,137,167,0.92)),
            url('https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=80&auto=format&fit=crop');
          background-size: cover;
          background-position: center bottom;
        }

        @media (max-width: 900px) {
          .hero-grid  { grid-template-columns: 1fr !important; }
          .feat-grid  { grid-template-columns: 1fr 1fr !important; }
          .roles-grid { grid-template-columns: 1fr 1fr !important; }
          .about-grid { grid-template-columns: 1fr !important; }
          .t-grid     { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .feat-grid  { grid-template-columns: 1fr !important; }
          .roles-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .marquee-img { width: 180px; height: 120px; }
        }
        .hidden-mobile { display: flex; }
        .show-mobile   { display: none; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile   { display: block !important; }
        }
      `}</style>

            {/* ── NAVBAR ── */}
            <nav className="nav-blur" style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
                background: scrolled ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)",
                borderBottom: scrolled ? "1px solid #e2edf7" : "1px solid transparent",
                padding: scrolled ? "10px 0" : "18px 0",
                transition: "all 0.3s",
                boxShadow: scrolled ? "0 2px 20px rgba(106,137,167,0.1)" : "none",
            }}>
                <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Logo */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="brand-bg" style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(106,137,167,0.3)" }}>
                            <School size={20} color="white" />
                        </div>
                        <span className="font-display" style={{ fontSize: 20, fontWeight: 900, color: "#1a2533", letterSpacing: "-0.02em" }}>
                            School<span className="brand-gt">CRM</span>
                        </span>
                    </div>

                    {/* Desktop links */}
                    <div className="hidden-mobile" style={{ alignItems: "center", gap: 32 }}>
                        {NAV_LINKS.map(link => (
                            <button key={link} onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, "-"))}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7", fontSize: 14, fontWeight: 500, letterSpacing: "0.01em", transition: "color 0.2s" }}
                                onMouseEnter={e => e.target.style.color = "#384959"}
                                onMouseLeave={e => e.target.style.color = "#6A89A7"}
                            >{link}</button>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="hidden-mobile" style={{ alignItems: "center", gap: 12 }}>
                        <button onClick={() => (window.location.href = "/signin")}
                            style={{ background: "none", border: "1.5px solid #88BDF2", color: "#6A89A7", padding: "8px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#f0f7ff"; e.currentTarget.style.borderColor = "#6A89A7"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#88BDF2"; }}
                        >Sign In</button>
                        <button onClick={() => (window.location.href = "/signin")}
                            className="shine-btn brand-bg"
                            style={{ border: "none", color: "white", padding: "8px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(106,137,167,0.3)", display: "flex", alignItems: "center", gap: 6 }}
                        >Get Started <ArrowRight size={15} /></button>
                    </div>

                    {/* Hamburger */}
                    <button onClick={() => setMenuOpen(!menuOpen)} className="show-mobile"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7", padding: 4 }}>
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {menuOpen && (
                    <div style={{ background: "white", borderTop: "1px solid #e2edf7", padding: "16px 24px", boxShadow: "0 8px 24px rgba(106,137,167,0.1)" }}>
                        {NAV_LINKS.map(link => (
                            <button key={link} onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, "-"))}
                                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#6A89A7", padding: "10px 0", fontSize: 14, cursor: "pointer", fontWeight: 500 }}
                            >{link}</button>
                        ))}
                        <button onClick={() => (window.location.href = "/signin")}
                            className="brand-bg"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", border: "none", color: "white", padding: "12px", borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: "pointer", marginTop: 16 }}
                        >Sign In to Dashboard <ArrowRight size={15} /></button>
                    </div>
                )}
            </nav>

            {/* ── HERO ── */}
            <section id="home" className="edu-hero-bg dot-grid" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 90, position: "relative", overflow: "hidden" }}>
                {/* Soft ambient blobs */}
                <div style={{ position: "absolute", top: 80, right: 80, width: 340, height: 340, borderRadius: "50%", background: "rgba(136,189,242,0.13)", filter: "blur(70px)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 100, left: 60, width: 260, height: 260, borderRadius: "50%", background: "rgba(106,137,167,0.10)", filter: "blur(60px)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: "rgba(189,221,252,0.08)", filter: "blur(80px)", pointerEvents: "none" }} />

                {/* ── CENTERED HERO CONTENT ── */}
                <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 860, padding: "0 24px", marginBottom: 56 }}>



                    {/* Static prefix line */}
                    <h1 className="font-display fade-up d2" style={{ fontSize: "clamp(2.4rem,5vw,4rem)", fontWeight: 900, lineHeight: 1.07, color: "#1a2533", marginBottom: 0 }}>
                        One Platform to
                    </h1>

                    {/* ── ANIMATED SLIDING LINES ── */}
                    <h1
                        className="font-display brand-gt"
                        style={{
                            fontSize: "clamp(2.4rem,5vw,4rem)",
                            fontWeight: 900,
                            lineHeight: 1.07,
                            marginBottom: 16,
                        }}
                    >
                        Manage Your Entire School
                    </h1>

                    <p className="fade-up d3" style={{ fontSize: 17, lineHeight: 1.75, color: "#6A89A7", marginBottom: 36, maxWidth: 560, margin: "0 auto 36px" }}>
                        SchoolCRM brings together students, teachers, parents, finance, and administration into a single powerful system — built with role-based access so everyone gets exactly what they need.
                    </p>

                    {/* CTA Buttons */}
                    <div className="fade-up d4" style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginBottom: 32 }}>
                        <button onClick={() => (window.location.href = "/signin")}
                            className="shine-btn brand-bg"
                            style={{ border: "none", color: "white", padding: "15px 36px", borderRadius: 13, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 32px rgba(106,137,167,0.35)", display: "flex", alignItems: "center", gap: 8 }}
                        >Access Dashboard <ArrowRight size={17} /></button>
                        <button onClick={() => scrollTo("how-it-works")}
                            style={{ background: "none", border: "1.5px solid #88BDF2", color: "#6A89A7", padding: "15px 36px", borderRadius: 13, fontSize: 15, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#6A89A7"; e.currentTarget.style.background = "#f0f7ff"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#88BDF2"; e.currentTarget.style.background = "none"; }}
                        ><BookMarked size={16} /> See How It Works</button>
                    </div>

                    {/* Role badges */}
                    <div className="fade-up d4" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "center" }}>
                        <span style={{ fontSize: 12, color: "#9db8cc", fontWeight: 500 }}>Roles:</span>
                        {[
                            { label: "Super Admin", Icon: Shield },
                            { label: "Admin", Icon: School },
                            { label: "Teacher", Icon: BookOpen },
                            { label: "Parent", Icon: UsersRound },
                            { label: "Student", Icon: GraduationCap },
                        ].map(({ label, Icon: Ic }) => (
                            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 12px", borderRadius: 999, background: "rgba(240,247,255,0.9)", border: "1px solid #BDDDFC", color: "#6A89A7", fontWeight: 500 }}>
                                <Ic size={12} /> {label}
                            </span>
                        ))}
                    </div>
                </div>


            </section>

            {/* ── STATS ── */}
            <div className="section-div" />
            <section style={{ padding: "56px 0", background: "#f5f9ff" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, textAlign: "center" }} className="stats-grid">
                    {STATS.map(s => (
                        <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: "#e8f3fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <s.Icon size={22} color="#6A89A7" />
                            </div>
                            <div className="font-display brand-gt" style={{ fontSize: 38, fontWeight: 900, lineHeight: 1 }}>
                                <AnimatedCounter target={s.value} />
                            </div>
                            <div style={{ fontSize: 14, color: "#6A89A7", fontWeight: 500 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>
            <div className="section-div" />

            {/* ── FEATURES ── */}
            <section id="features" className="edu-features-bg dot-grid" style={{ padding: "96px 0" }}>
                <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: 60 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "#e8f3fd", border: "1px solid #BDDDFC", color: "#6A89A7", fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            <LayoutDashboard size={13} /> What's Inside SchoolCRM
                        </div>
                        <h2 className="font-display" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", fontWeight: 900, marginBottom: 16, color: "#1a2533" }}>
                            Every Module Your <span className="brand-gt">School Needs</span>
                        </h2>
                        <p style={{ fontSize: 17, color: "#6A89A7", maxWidth: 520, margin: "0 auto" }}>
                            Built with dedicated portals for each role — so every stakeholder gets exactly what they need.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }} className="feat-grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="card-hover" onMouseEnter={() => setActiveFeature(i)} onMouseLeave={() => setActiveFeature(null)}
                                style={{ borderRadius: 20, padding: 28, cursor: "default", background: "white", border: `1.5px solid ${activeFeature === i ? "#88BDF2" : "#e2edf7"}`, boxShadow: activeFeature === i ? "0 12px 40px rgba(136,189,242,0.15)" : "0 2px 12px rgba(106,137,167,0.06)", transition: "all 0.28s" }}>
                                <div style={{ width: 50, height: 50, borderRadius: 14, background: activeFeature === i ? "#e8f3fd" : "#f5f9ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, transition: "background 0.28s" }}>
                                    <f.Icon size={24} color={activeFeature === i ? "#6A89A7" : "#9db8cc"} />
                                </div>
                                <h3 className="font-display" style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, color: activeFeature === i ? "#384959" : "#1a2533", transition: "color 0.28s" }}>{f.title}</h3>
                                <p style={{ fontSize: 14, lineHeight: 1.75, color: "#6A89A7" }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Single school photo accent between features and roles ── */}
                    <div style={{ marginTop: 64, borderRadius: 24, overflow: "visible", position: "relative", height: 280, boxShadow: "0 16px 48px rgba(106,137,167,0.18)" }}>
                        <img
                            src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1600&q=80&auto=format&fit=crop"
                            alt="Teacher helping students"
                            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
                        />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(56,73,89,0.82) 0%, rgba(56,73,89,0.3) 60%, transparent 100%)", display: "flex", alignItems: "center", padding: "0 48px" }}>
                            <div>
                                <div style={{ color: "#BDDDFC", fontSize: 13, fontWeight: 600, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>Real Impact</div>
                                <div className="font-display" style={{ color: "white", fontSize: "clamp(1.4rem,3vw,2.2rem)", fontWeight: 900, maxWidth: 460, lineHeight: 1.2 }}>
                                    Empowering teachers to focus on what matters most — teaching.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── ROLES ── */}
            <section className="edu-roles-bg" style={{ padding: "96px 0" }}>
                <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: 56 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "#e8f3fd", border: "1px solid #BDDDFC", color: "#6A89A7", fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            <UserCheck size={13} /> Role-Based Access
                        </div>
                        <h2 className="font-display" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", fontWeight: 900, marginBottom: 16, color: "#1a2533" }}>
                            The Right Tools for <span className="brand-gt">Every Role</span>
                        </h2>
                        <p style={{ fontSize: 17, color: "#6A89A7", maxWidth: 520, margin: "0 auto" }}>
                            Each user logs in to a tailored dashboard — no clutter, no confusion.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }} className="roles-grid">
                        {ROLES.map((r, i) => (
                            <div key={i} className="role-card" style={{ padding: 24 }}>
                                <div style={{ width: 50, height: 50, borderRadius: 14, background: "#e8f3fd", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                                    <r.Icon size={24} color={r.color} />
                                </div>
                                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: r.color }}>{r.role}</h3>
                                <ul style={{ listStyle: "none", marginBottom: 20 }}>
                                    {r.perms.map((p, j) => (
                                        <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                                            <CheckCircle size={15} color="#88BDF2" style={{ flexShrink: 0, marginTop: 1 }} />
                                            <span style={{ fontSize: 13, color: "#6A89A7", lineHeight: 1.5 }}>{p}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => (window.location.href = "/signin")}
                                    style={{ width: "100%", padding: "9px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#f0f7ff", border: "1.5px solid #BDDDFC", color: r.color, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#e8f3fd"; e.currentTarget.style.borderColor = "#88BDF2"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "#f0f7ff"; e.currentTarget.style.borderColor = "#BDDDFC"; }}
                                >Sign In as {r.role} <ChevronRight size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="edu-hiw-bg dot-grid" style={{ padding: "96px 0" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: 64 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "#e8f3fd", border: "1px solid #BDDDFC", color: "#6A89A7", fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            <CalendarDays size={13} /> Simple Process
                        </div>
                        <h2 className="font-display" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", fontWeight: 900, color: "#1a2533" }}>
                            Up &amp; Running in <span className="brand-gt">3 Steps</span>
                        </h2>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 40, position: "relative" }} className="steps-grid">
                        {HOW_IT_WORKS.map((s, i) => (
                            <div key={i} style={{ textAlign: "center", position: "relative" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 20, background: "white", border: "1.5px solid #e2edf7", boxShadow: "0 4px 20px rgba(106,137,167,0.12)", marginBottom: 20, position: "relative" }}>
                                    <s.Icon size={26} color="#6A89A7" />
                                    <div style={{ position: "absolute", top: -10, right: -10, width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#6A89A7,#88BDF2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>{s.step}</span>
                                    </div>
                                </div>
                                {i < HOW_IT_WORKS.length - 1 && (
                                    <div style={{ position: "absolute", top: 32, left: "calc(50% + 40px)", right: 0, height: 1, background: "linear-gradient(90deg, #88BDF2, transparent)" }} />
                                )}
                                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#384959" }}>{s.title}</h3>
                                <p style={{ fontSize: 14, color: "#6A89A7", lineHeight: 1.75 }}>{s.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── 3-image grid accent ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 64 }} className="feat-grid">
                        {[
                            { url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80&auto=format&fit=crop", caption: "Students Learning Together" },
                            { url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80&auto=format&fit=crop", caption: "Classroom Environment" },
                            { url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&q=80&auto=format&fit=crop", caption: "Teacher Engagement" },
                        ].map((img, i) => (
                            <div key={i} style={{ borderRadius: 18, overflow: "hidden", position: "relative", height: 200, boxShadow: "0 8px 28px rgba(106,137,167,0.16)" }}>
                                <img src={img.url} alt={img.caption} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }}
                                    onMouseEnter={e => e.target.style.transform = "scale(1.06)"}
                                    onMouseLeave={e => e.target.style.transform = "scale(1)"}
                                />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 16px 14px", background: "linear-gradient(to top, rgba(56,73,89,0.75), transparent)" }}>
                                    <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{img.caption}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ABOUT ── */}
            <section id="about" className="edu-about-bg" style={{ padding: "96px 0" }}>
                <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="about-grid">
                    {/* Finance mockup */}
                    <div style={{ position: "relative" }}>
                        <div style={{ borderRadius: 28, padding: 22, background: "white", border: "1.5px solid #e2edf7", boxShadow: "0 24px 72px rgba(106,137,167,0.18)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <Wallet size={18} color="#6A89A7" />
                                        <span className="font-display" style={{ fontWeight: 700, color: "#384959", fontSize: 16 }}>Finance Dashboard</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: "#9db8cc" }}>April 2025 · Q4 Report</div>
                                </div>
                                <div style={{ padding: "6px 12px", borderRadius: 8, background: "#e8f3fd", display: "flex", alignItems: "center", gap: 6 }}>
                                    <TrendingUp size={13} color="#6A89A7" />
                                    <span style={{ fontSize: 12, color: "#6A89A7", fontWeight: 600 }}>Live</span>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                                {[
                                    { l: "Total Collected", v: "₹42.8L", t: "↑ 12%", pos: true, Icon: TrendingUp },
                                    { l: "Pending Fees", v: "₹6.2L", t: "↓ 8%", pos: false, Icon: Bell },
                                    { l: "Salary Paid", v: "₹18.4L", t: "On time", pos: true, Icon: CheckCircle },
                                    { l: "Net Balance", v: "₹18.2L", t: "↑ 5%", pos: true, Icon: BarChart2 },
                                ].map(f => (
                                    <div key={f.l} style={{ borderRadius: 12, padding: "12px 14px", background: "#f5f9ff", border: "1px solid #e2edf7" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                            <f.Icon size={13} color="#9db8cc" />
                                            <span style={{ fontSize: 11, color: "#9db8cc" }}>{f.l}</span>
                                        </div>
                                        <div className="font-display" style={{ fontSize: 19, fontWeight: 700, color: "#384959" }}>{f.v}</div>
                                        <div style={{ fontSize: 11, marginTop: 2, color: f.pos ? "#22c55e" : "#f87171", fontWeight: 600 }}>{f.t}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderRadius: 12, padding: "12px 14px", background: "#f5f9ff", border: "1px solid #e2edf7" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                                    <BarChart2 size={13} color="#6A89A7" />
                                    <span style={{ fontSize: 12, color: "#6A89A7", fontWeight: 500 }}>Class-wise Fee Collection</span>
                                </div>
                                {[{ cls: "Class 10", pct: 91 }, { cls: "Class 9", pct: 87 }, { cls: "Class 8", pct: 79 }, { cls: "Class 7", pct: 95 }].map(c => (
                                    <div key={c.cls} style={{ marginBottom: 10 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                            <span style={{ fontSize: 12, color: "#6A89A7", fontWeight: 500 }}>{c.cls}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: "#384959" }}>{c.pct}%</span>
                                        </div>
                                        <div style={{ height: 7, borderRadius: 999, background: "#e2edf7", overflow: "hidden" }}>
                                            <div style={{ width: `${c.pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#6A89A7,#88BDF2)" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Badge */}
                        <div className="float-anim" style={{ position: "absolute", bottom: -18, right: -18, borderRadius: 16, padding: 14, background: "white", border: "1.5px solid #e2edf7", boxShadow: "0 12px 40px rgba(106,137,167,0.18)", animationDelay: "1.2s" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e8f3fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Bell size={18} color="#6A89A7" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#384959" }}>Fee Receipt Sent</div>
                                    <div style={{ fontSize: 11, color: "#9db8cc" }}>312 parents notified</div>
                                </div>
                                <div className="pdot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#88BDF2", marginLeft: 4 }} />
                            </div>
                        </div>
                    </div>

                    {/* Text */}
                    <div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "#e8f3fd", border: "1px solid #BDDDFC", color: "#6A89A7", fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            <School size={13} /> Why SchoolCRM
                        </div>
                        <h2 className="font-display" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", fontWeight: 900, marginBottom: 20, color: "#1a2533" }}>
                            Every Department, <span className="brand-gt">One System</span>
                        </h2>
                        <p style={{ fontSize: 16, color: "#6A89A7", lineHeight: 1.8, marginBottom: 28 }}>
                            SchoolCRM isn't just student records. It's a complete ecosystem — from finance and staff management to parent portals and academic reporting — all talking to each other in real time.
                        </p>
                        <ul style={{ listStyle: "none", marginBottom: 40 }}>
                            {CHECK_ITEMS.map(({ Icon: Ic, text }, i) => (
                                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e8f3fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Ic size={17} color="#6A89A7" />
                                    </div>
                                    <span style={{ fontSize: 14, color: "#6A89A7", lineHeight: 1.6, paddingTop: 8 }}>{text}</span>
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => (window.location.href = "/signin")}
                            className="shine-btn brand-bg"
                            style={{ border: "none", color: "white", padding: "15px 32px", borderRadius: 13, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 28px rgba(106,137,167,0.3)", display: "inline-flex", alignItems: "center", gap: 8 }}
                        >Open Your Dashboard <ArrowRight size={17} /></button>

                        {/* ── School photo beside text ── */}
                        <div style={{ marginTop: 40, borderRadius: 20, overflow: "hidden", height: 200, position: "relative", boxShadow: "0 10px 32px rgba(106,137,167,0.18)" }}>
                            <img
                                src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&q=80&auto=format&fit=crop"
                                alt="Students in school"
                                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }}
                            />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(56,73,89,0.6) 0%, transparent 60%)" }} />
                            <div style={{ position: "absolute", bottom: 14, left: 16 }}>
                                <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>Students thriving with smarter school management</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section className="edu-testimonials-bg dot-grid" style={{ padding: "96px 0" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: 56 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "#e8f3fd", border: "1px solid #BDDDFC", color: "#6A89A7", fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            <Star size={13} /> Testimonials
                        </div>
                        <h2 className="font-display" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", fontWeight: 900, marginBottom: 12, color: "#1a2533" }}>
                            What <span className="brand-gt">Educators Say</span>
                        </h2>
                        <p style={{ fontSize: 14, color: "#9db8cc" }}>From the people who use SchoolCRM every day</p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }} className="t-grid">
                        {[
                            { quote: "Managing 1,200 students used to be chaos. SchoolCRM made it completely organized — attendance, fees, results all in one place.", name: "Priya Sharma", role: "Principal, Delhi Public School", Icon: School },
                            { quote: "The finance module is exactly what we needed. Fee collection, reminders, and reports — everything automated and clean.", name: "Rajesh Nair", role: "Finance Head, Kendriya Vidyalaya", Icon: Wallet },
                            { quote: "As a parent I can see my child's attendance and marks anytime. The notifications keep me in the loop.", name: "Meena Iyer", role: "Parent, Presidency School", Icon: UsersRound },
                        ].map((t, i) => (
                            <div key={i} className="tcard" style={{ padding: 28 }}>
                                <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                                    {[...Array(5)].map((_, j) => <Star key={j} size={15} color="#88BDF2" fill="#88BDF2" />)}
                                </div>
                                <p style={{ fontSize: 14, lineHeight: 1.8, color: "#6A89A7", marginBottom: 24, fontStyle: "italic" }}>"{t.quote}"</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "#e8f3fd", border: "1.5px solid #BDDDFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <t.Icon size={20} color="#6A89A7" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: "#384959" }}>{t.name}</div>
                                        <div style={{ fontSize: 11, color: "#9db8cc" }}>{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Wide school photo banner ── */}
                    <div style={{ marginTop: 64, borderRadius: 24, overflow: "hidden", position: "relative", height: 240, boxShadow: "0 16px 48px rgba(106,137,167,0.2)" }}>
                        <img
                            src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=80&auto=format&fit=crop"
                            alt="School library"
                            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 55%" }}
                        />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(56,73,89,0.78) 0%, rgba(106,137,167,0.35) 60%, transparent 100%)", display: "flex", alignItems: "center", padding: "0 56px" }}>
                            <div>
                                <div className="font-display" style={{ color: "white", fontSize: "clamp(1.3rem,2.5vw,1.9rem)", fontWeight: 900, marginBottom: 10 }}>
                                    "The best tool we've adopted in 10 years of school management."
                                </div>
                                <div style={{ color: "#BDDDFC", fontSize: 13, fontWeight: 500 }}>— Dr. Anita Menon, School Director, Bangalore</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section id="contact" className="edu-cta-bg" style={{ padding: "96px 0", position: "relative", overflow: "hidden" }}>
                <div className="dot-grid" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
                <div style={{ position: "relative", maxWidth: 760, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 999, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "white", fontSize: 13, fontWeight: 500, marginBottom: 32 }}>
                        <GraduationCap size={15} /> Your school management system is ready — just sign in
                    </div>
                    <h2 className="font-display" style={{ fontSize: "clamp(2.2rem,5vw,3.6rem)", fontWeight: 900, marginBottom: 20, color: "white" }}>
                        Ready to Run Your School Smarter?
                    </h2>
                    <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
                        Everything is built. Students, teachers, parents, finance — all waiting. Just sign in and start managing.
                    </p>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                        <button onClick={() => (window.location.href = "/signin")}
                            style={{ background: "white", border: "none", color: "#384959", padding: "17px 40px", borderRadius: 14, fontWeight: 700, fontSize: 17, cursor: "pointer", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}
                            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "none"}
                        ><LayoutDashboard size={18} /> Go to Dashboard</button>
                        <button onClick={() => (window.location.href = "/signin")}
                            style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.35)", color: "white", padding: "17px 40px", borderRadius: 14, fontSize: 17, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 8 }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                        ><ArrowRight size={17} /> Sign In</button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ borderTop: "1.5px solid #e2edf7", padding: "48px 0", background: "white" }}>
                <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="brand-bg" style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <School size={18} color="white" />
                            </div>
                            <span className="font-display" style={{ fontSize: 18, fontWeight: 900, color: "#1a2533" }}>School<span className="brand-gt">CRM</span></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                            {["Home", "Features", "About", "Contact"].map(link => (
                                <button key={link} onClick={() => scrollTo(link.toLowerCase())}
                                    style={{ background: "none", border: "none", fontSize: 14, color: "#9db8cc", cursor: "pointer", transition: "color 0.2s", fontWeight: 500 }}
                                    onMouseEnter={e => e.target.style.color = "#384959"}
                                    onMouseLeave={e => e.target.style.color = "#9db8cc"}
                                >{link}</button>
                            ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {[Twitter, Facebook, Linkedin, Youtube].map((Ic, i) => (
                                <div key={i} style={{ width: 36, height: 36, borderRadius: 10, background: "#f5f9ff", border: "1.5px solid #e2edf7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#e8f3fd"; e.currentTarget.style.borderColor = "#88BDF2"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "#f5f9ff"; e.currentTarget.style.borderColor = "#e2edf7"; }}
                                ><Ic size={16} color="#6A89A7" /></div>
                            ))}
                        </div>
                    </div>
                    <div style={{ marginTop: 32, paddingTop: 28, borderTop: "1px solid #f0f5fa", textAlign: "center", fontSize: 12, color: "#c0d4e4" }}>
                        © 2025 SchoolCRM. Built with ❤️ for modern schools. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}