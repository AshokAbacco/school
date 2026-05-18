import { useEffect, useRef, useState } from "react";
import {
  Headset, Users, BarChart3, Shield, Zap, Layers,
  BookOpen, GraduationCap, CreditCard, MessageSquare,
  Settings, Smartphone, ArrowRight, CheckCircle2, Star
} from "lucide-react";

/* ─── Google Fonts ─────────────────────────────────────────────────── */
const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy:   #1E2D3D;
      --dark:   #384959;
      --mid:    #6A89A7;
      --accent: #88BDF2;
      --light:  #BDDDFC;
      --pale:   #EDF5FE;
      --white:  #FFFFFF;
      --gray:   #6B7280;
      --border: #D6E8FA;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--white);
      color: var(--dark);
      line-height: 1.6;
    }

    h1,h2,h3,h4 {
      font-family: 'Playfair Display', serif;
      line-height: 1.2;
    }

    /* ── Animations ── */
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(32px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity:0; transform:scale(.92); }
      to   { opacity:1; transform:scale(1); }
    }
    @keyframes floatBubble {
      0%,100% { transform:translateY(0); }
      50%      { transform:translateY(-18px); }
    }
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }

    .fade-up   { animation: fadeUp   .7s ease both; }
    .scale-in  { animation: scaleIn  .6s ease both; }
    .d1 { animation-delay:.1s }
    .d2 { animation-delay:.22s }
    .d3 { animation-delay:.34s }
    .d4 { animation-delay:.46s }
    .d5 { animation-delay:.58s }
    .d6 { animation-delay:.70s }

    /* ── Section label ── */
    .label {
      display:inline-flex; align-items:center; gap:6px;
      font-size:11px; font-weight:600; letter-spacing:.12em;
      text-transform:uppercase; color:var(--mid);
      background:var(--pale); border:1px solid var(--border);
      border-radius:100px; padding:5px 14px; margin-bottom:20px;
    }
    .label svg { width:12px; height:12px; }

    /* ── Highlight word ── */
    .hl { color:var(--accent); }
    .hl-dark { color:var(--mid); }

    /* ── Divider dot row ── */
    .dot-row { display:flex; justify-content:center; gap:6px; margin:12px 0 0; }
    .dot-row span { width:6px; height:6px; border-radius:50%; background:var(--border); }
    .dot-row span:nth-child(2) { background:var(--accent); }

    /* ── Gradient mesh bg ── */
    .mesh-bg {
      background:
        radial-gradient(ellipse 60% 50% at 80% 20%, #BDDDFC44 0%, transparent 70%),
        radial-gradient(ellipse 50% 60% at 10% 80%, #88BDF222 0%, transparent 70%),
        var(--pale);
    }
    .mesh-bg-dark {
      background:
        radial-gradient(ellipse 60% 50% at 20% 30%, #384959 0%, #1E2D3D 100%);
    }

    /* ── Pill badge ── */
    .pill {
      display:inline-block; font-size:12px; font-weight:500;
      background:var(--pale); color:var(--mid); border:1px solid var(--border);
      border-radius:100px; padding:3px 12px;
    }

    /* ── Card ── */
    .card {
      background:var(--white); border:1px solid var(--border);
      border-radius:20px; padding:32px 28px;
      transition: box-shadow .25s, transform .25s;
      cursor:default;
    }
    .card:hover {
      box-shadow:0 12px 40px #88BDF233;
      transform:translateY(-4px);
    }
    .icon-wrap {
      width:52px; height:52px; border-radius:14px;
      background:var(--pale); border:1px solid var(--border);
      display:flex; align-items:center; justify-content:center;
      margin-bottom:20px;
    }
    .icon-wrap svg { width:24px; height:24px; color:var(--mid); }

    /* ── Role card ── */
    .role-card {
      background:var(--white); border:1px solid var(--border);
      border-radius:20px; padding:36px 24px;
      text-align:center;
      transition: box-shadow .25s, transform .25s;
    }
    .role-card:hover {
      box-shadow:0 12px 40px #88BDF233;
      transform:translateY(-4px);
    }
    .role-icon {
      width:72px; height:72px; border-radius:50%;
      background:var(--pale); border:2px solid var(--border);
      display:flex; align-items:center; justify-content:center;
      margin:0 auto 20px;
    }
    .role-icon svg { width:32px; height:32px; color:var(--mid); }

    /* ── Step card ── */
    .step-card { text-align:center; padding:0 16px; }
    .step-num {
      width:64px; height:64px; border-radius:50%;
      background:var(--mid); color:var(--white);
      font-size:22px; font-weight:700;
      display:flex; align-items:center; justify-content:center;
      margin:0 auto 20px;
      font-family:'DM Sans',sans-serif;
      box-shadow:0 4px 20px #6A89A755;
    }

    /* ── Why grid items ── */
    .why-item { display:flex; gap:18px; align-items:flex-start; }
    .why-icon { flex-shrink:0; margin-top:2px; }
    .why-icon svg { width:26px; height:26px; color:var(--accent); }

    /* ── Stat strip ── */
    .stat-strip {
      display:grid; grid-template-columns:repeat(4,1fr);
      gap:0; border-top:1px solid var(--border); border-bottom:1px solid var(--border);
    }
    .stat-item {
      padding:36px 24px; text-align:center;
      border-right:1px solid var(--border);
    }
    .stat-item:last-child { border-right:none; }
    .stat-num {
      font-family:'Playfair Display',serif;
      font-size:42px; font-weight:700; color:var(--navy);
      line-height:1;
    }
    .stat-label { font-size:13px; color:var(--gray); margin-top:6px; font-weight:500; }

    /* ── CTA ── */
    .btn-primary {
      display:inline-flex; align-items:center; gap:8px;
      background:var(--mid); color:var(--white);
      font-family:'DM Sans',sans-serif; font-size:15px; font-weight:600;
      border:none; border-radius:100px; padding:14px 32px;
      cursor:pointer; transition:background .2s, transform .15s, box-shadow .2s;
      box-shadow:0 4px 18px #6A89A766;
    }
    .btn-primary:hover {
      background:var(--dark); transform:translateY(-2px);
      box-shadow:0 8px 28px #6A89A788;
    }
    .btn-outline {
      display:inline-flex; align-items:center; gap:8px;
      background:transparent; color:var(--white);
      font-family:'DM Sans',sans-serif; font-size:15px; font-weight:600;
      border:2px solid rgba(255,255,255,.45); border-radius:100px; padding:13px 30px;
      cursor:pointer; transition:background .2s, border-color .2s;
    }
    .btn-outline:hover { background:rgba(255,255,255,.12); border-color:rgba(255,255,255,.8); }

    /* ── Photo grid ── */
    .photo-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .photo-grid img { width:100%; border-radius:16px; object-fit:cover; }
    .photo-grid img:first-child { grid-column:1/-1; height:200px; }
    .photo-grid img:not(:first-child) { height:140px; }

    /* ── Feature row ── */
    .feature-row { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
    .feature-row.reverse { direction:rtl; }
    .feature-row.reverse > * { direction:ltr; }

    /* ── Testimonial ── */
    .testimonial-card {
      background:var(--white); border:1px solid var(--border);
      border-radius:20px; padding:32px;
    }
    .stars { display:flex; gap:3px; margin-bottom:16px; }
    .stars svg { width:16px; height:16px; color:#F59E0B; fill:#F59E0B; }

    /* ── Bubble decoration ── */
    .bubble {
      position:absolute; border-radius:50%;
      background:var(--light); opacity:.25;
      animation: floatBubble 6s ease-in-out infinite;
    }

    /* ── Section spacing ── */
    .section { padding:96px 0; }
    .section-sm { padding:64px 0; }
    .container { max-width:1180px; margin:0 auto; padding:0 32px; }
    .container-sm { max-width:760px; margin:0 auto; padding:0 32px; }

    .text-center { text-align:center; }
    .mb-4 { margin-bottom:16px; }
    .mb-6 { margin-bottom:24px; }
    .mb-8 { margin-bottom:32px; }
    .mb-12 { margin-bottom:48px; }
    .mb-16 { margin-bottom:64px; }

    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:32px; }
    .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; }
    .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }

    /* ── Timeline connector ── */
    .steps-row { display:grid; grid-template-columns:repeat(3,1fr); gap:0; position:relative; }
    .steps-row::before {
      displye:none;
    }

    /* ── Vision box ── */
    .vision-box {
      background:linear-gradient(135deg,var(--navy) 0%,#2a4a65 100%);
      border-radius:28px; padding:72px 64px;
      text-align:center; color:var(--white);
      position:relative; overflow:hidden;
    }
    .vision-box .bubble { opacity:.08; }

    /* ── Responsive ── */
    @media(max-width:900px){
      .stat-strip { grid-template-columns:repeat(2,1fr); }
      .stat-item:nth-child(2) { border-right:none; }
      .grid-3 { grid-template-columns:1fr 1fr; }
      .grid-4 { grid-template-columns:1fr 1fr; }
      .feature-row { grid-template-columns:1fr; gap:40px; }
      .feature-row.reverse { direction:ltr; }
    }
    @media(max-width:600px){
      .stat-strip { grid-template-columns:1fr 1fr; }
      .grid-2,.grid-3,.grid-4,.steps-row { grid-template-columns:1fr; }
      .steps-row::before { display:none; }
      .vision-box { padding:48px 28px; }
      h1.hero-title { font-size:36px !important; }
    }
  `}</style>
);

/* ─── Animate on scroll hook ──────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Section Header ──────────────────────────────────────────────── */
function SectionHeader({ label, title, subtitle, center = true }) {
  const [ref, v] = useReveal();
  return (
    <div ref={ref} className={`${center ? "text-center" : ""} mb-16`}>
      {label && (
        <div className={`label fade-up ${v ? "" : "opacity-0"}`} style={{ display: center ? "inline-flex" : "inline-flex" }}>
          <Star style={{ width: 12, height: 12 }} /> {label}
        </div>
      )}
      <h2 className={`fade-up d1 ${v ? "" : "opacity-0"}`} style={{ fontSize: "clamp(28px,4vw,42px)", color: "var(--navy)", marginBottom: "16px" }}>
        {title}
      </h2>
      {subtitle && (
        <p className={`fade-up d2 ${v ? "" : "opacity-0"}`} style={{ fontSize: "17px", color: "var(--gray)", maxWidth: "560px", margin: center ? "0 auto" : "0", lineHeight: 1.7 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────────────────── */
const modules = [
  { icon: Users,        title: "Student Management",       desc: "Comprehensive student profiles, attendance tracking, and academic records all in one place." },
  { icon: BookOpen,     title: "Teacher & Staff Portal",   desc: "Simplify staff administration schedules, leaves, and performance in a unified hub." },
  { icon: MessageSquare,title: "Parent Communication",     desc: "Seamless two-way messaging, notices, and progress updates between school and families." },
  { icon: CreditCard,   title: "Finance & Fee Tracking",   desc: "Automated fee collection, payment history, and financial reports without the spreadsheet chaos." },
  { icon: BarChart3,    title: "Academic Analytics",       desc: "Data-driven insights into grades, attendance trends, and institutional performance." },
  { icon: Settings,     title: "Super Admin Controls",     desc: "Centralized configuration, role management, and full-system oversight from one dashboard." },
];

const roles = [
  { icon: Shield,       title: "Super Admins", desc: "Full system control, user provisioning, and school-wide configuration." },
  { icon: Users,        title: "Admins",       desc: "Manage daily operations, reports, and department-level settings effortlessly." },
  { icon: GraduationCap,title: "Teachers",     desc: "Simplified class tools grades, assignments, attendance, and parent messaging." },
  { icon: Smartphone,   title: "Parents",      desc: "Real-time progress updates, fee status, and direct communication with teachers." },
];

const steps = [
  { step: 1, title: "Set Up",  desc: "Configure your school profile departments, classes, and academic calendar in minutes." },
  { step: 2, title: "Onboard", desc: "Invite admins, teachers, and parents. Everyone gets a tailored dashboard automatically." },
  { step: 3, title: "Manage",  desc: "Run every department from one command center. Real-time data, always within reach." },
];

const whyItems = [
  { icon: Layers,     title: "All-in-One Platform",      desc: "No need for multiple disconnected tools every feature lives in one unified workspace." },
  { icon: Headset,    title: "User-Friendly Interface",  desc: "Designed for non-technical users. Admins, teachers, and parents onboard in minutes." },
  { icon: Smartphone, title: "Real-Time Access",         desc: "Stay informed from any device, anytime. Mobile-optimised for everyone on the go." },
  { icon: Shield,     title: "Secure & Reliable",        desc: "Enterprise-grade security with 99.9% uptime SLA. Your data is always safe." },
];

 

/* ─── ABOUT PAGE ──────────────────────────────────────────────────── */
export default function About() {

  return (
    <>
      <FontLink />

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="section mesh-bg" style={{ position: "relative", overflow: "hidden", paddingTop: 120, paddingBottom: 100 }}>
        <div className="bubble" style={{ width: 420, height: 420, top: -100, right: -80 }} />
        <div className="bubble" style={{ width: 260, height: 260, bottom: -60, left: -40, animationDelay: "2s" }} />

        <div className="container text-center" style={{ position: "relative", zIndex: 1 }}>
          <div className="label fade-up" style={{ display: "inline-flex" }}>
            <Star style={{ width: 12, height: 12 }} /> About  Education Management Software
          </div>

          <h1 className="hero-title fade-up d1" style={{ fontSize: "clamp(38px,5.5vw,64px)", color: "var(--navy)", marginBottom: 24, maxWidth: 760, margin: "0 auto 24px" }}>
            Empowering Schools with <span className="hl">Modern Technology</span>
          </h1>

          <p className="fade-up d2" style={{ fontSize: 18, color: "var(--gray)", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.75 }}>
            We reduce manual work, improve operational efficiency, and enhance collaboration between administrators, teachers, students, and parents all from one platform.
          </p>

          <div className="fade-up d3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary">
              Get Started Today <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
 
          </div>
        </div>
      </section>

 

      {/* ══ MISSION ══════════════════════════════════════════════════ */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <div className="feature-row">
            {/* Left text */}
            <div>
              <div className="label" style={{ display: "inline-flex" }}>
                <Zap style={{ width: 12, height: 12 }} /> Our Mission
              </div>
              <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", color: "var(--navy)", marginBottom: 20 }}>
                Schools Should Focus on <span className="hl">Education</span>, Not Admin
              </h2>
              <p style={{ fontSize: 16, color: "var(--gray)", marginBottom: 28, lineHeight: 1.8 }}>
                We built  Education Management Software to make school management simple, efficient, and accessible for institutions of all sizes. Every feature exists to reclaim hours lost to manual processes.
              </p>
              {["Role-based access for every stakeholder", "Paperless record-keeping and reporting", "Works for schools of all sizes"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <CheckCircle2 style={{ width: 18, height: 18, color: "var(--accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: "var(--dark)" }}>{t}</span>
                </div>
              ))}
            </div>
            {/* Right visual */}
            <div style={{ position: "relative" }}>
              <div style={{
                background: "var(--pale)", borderRadius: 28, overflow: "hidden",
                border: "1px solid var(--border)", aspectRatio: "4/3",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {/* Dashboard mock card */}
                <div style={{ padding: 28, width: "100%" }}>
                  <div style={{ background: "var(--white)", borderRadius: 16, padding: 24, border: "1px solid var(--border)", boxShadow: "0 8px 32px #88BDF222" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gray)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16 }}>School Overview</p>
                    {[
                      { label: "Total Students", val: "2,841", pct: 82 },
                      { label: "Staff Members",  val: "186",   pct: 55 },
                      { label: "Fee Collected",  val: "94.2%", pct: 94 },
                    ].map((row, i) => (
                      <div key={i} style={{ marginBottom: 18 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: "var(--gray)" }}>{row.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{row.val}</span>
                        </div>
                        <div style={{ height: 6, background: "var(--pale)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${row.pct}%`, height: "100%", background: "linear-gradient(90deg,var(--accent),var(--mid))", borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* floating badge */}
              <div style={{
                position: "absolute", bottom: -20, right: -20,
                background: "var(--white)", borderRadius: 14, padding: "12px 18px",
                border: "1px solid var(--border)", boxShadow: "0 8px 28px #6A89A722",
                display: "flex", alignItems: "center", gap: 10
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--pale)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap style={{ width: 18, height: 18, color: "var(--mid)" }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", margin: 0 }}>98% Uptime</p>
                  <p style={{ fontSize: 11, color: "var(--gray)", margin: 0 }}>Always reliable</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHAT WE DO ═══════════════════════════════════════════════ */}
      <section className="section" style={{ background: "var(--pale)" }}>
        <div className="container">
          <SectionHeader
            label="What We Do"
            title={<>Every Module Your <span className="hl">School Needs</span></>}
            subtitle="Built with dedicated portals for each role so every stakeholder gets exactly what they need."
          />
          <div className="grid-3">
            {modules.map((m, i) => (
              <div key={i} className={`card fade-up d${(i % 3) + 1}`}>
                <div className="icon-wrap">
                  <m.icon />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--navy)", fontFamily: "'DM Sans',sans-serif", marginBottom: 10 }}>{m.title}</h3>
                <p style={{ fontSize: 14, color: "var(--gray)", lineHeight: 1.7 }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY CHOOSE US ═════════════════════════════════════════════ */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <div className="feature-row">
            <div>
              <SectionHeader label="Why  Education Management Software" title={<>Built for Modern <span className="hl">Educational</span> Institutions</>} center={false} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                {whyItems.map((w, i) => (
                  <div key={i} className="why-item">
                    <div className="why-icon"><w.icon /></div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--navy)", fontFamily: "'DM Sans',sans-serif", marginBottom: 6 }}>{w.title}</h4>
                      <p style={{ fontSize: 13, color: "var(--gray)", lineHeight: 1.65 }}>{w.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Visual side */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: Zap, val: "3×", label: "Faster admin workflows" },
                { icon: BarChart3, val: "40%", label: "Reduction in paperwork" },
                { icon: Users, val: "99%", label: "Parent satisfaction rate" },
              ].map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 20,
                  background: i === 1 ? "linear-gradient(135deg,var(--mid),var(--accent))" : "var(--pale)",
                  border: "1px solid var(--border)", borderRadius: 18, padding: "24px 28px",
                  color: i === 1 ? "var(--white)" : "inherit"
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: i === 1 ? "rgba(255,255,255,.2)" : "var(--white)",
                    border: "1px solid " + (i === 1 ? "rgba(255,255,255,.3)" : "var(--border)"),
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <s.icon style={{ width: 22, height: 22, color: i === 1 ? "var(--white)" : "var(--mid)" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display',serif", lineHeight: 1, marginBottom: 4, color: i === 1 ? "var(--white)" : "var(--navy)" }}>{s.val}</p>
                    <p style={{ fontSize: 13, color: i === 1 ? "rgba(255,255,255,.8)" : "var(--gray)" }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ BUILT FOR EVERY ROLE ═════════════════════════════════════ */}
      <section className="section" style={{ background: "var(--pale)" }}>
        <div className="container">
          <SectionHeader
            label="Every Role"
            title={<>The Right Tools for <span className="hl">Every Role</span></>}
            subtitle="Each user logs in to a tailored dashboard no clutter, no confusion."
          />
          <div className="grid-4">
            {roles.map((r, i) => (
              <div key={i} className={`role-card fade-up d${i + 1}`}>
                <div className="role-icon"><r.icon /></div>
                <h3 style={{ fontSize: 18, color: "var(--navy)", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, marginBottom: 10 }}>{r.title}</h3>
                <p style={{ fontSize: 14, color: "var(--gray)", lineHeight: 1.7 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════ */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <SectionHeader
            label="Simple Onboarding"
            title={<>Up &amp; Running in <span className="hl">3 Steps</span></>}
            subtitle="Getting started is quick your school can be fully operational within a day."
          />
          <div className="steps-row">
            {steps.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-num">{s.step}</div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: "var(--navy)", fontFamily: "'DM Sans',sans-serif", marginBottom: 12 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "var(--gray)", lineHeight: 1.75, maxWidth: 240, margin: "0 auto" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ VISION ═══════════════════════════════════════════════════ */}
      <section className="section" style={{ background: "var(--pale)" }}>
        <div className="container">
          <div className="vision-box">
            <div className="bubble" style={{ width: 500, height: 500, top: -200, right: -150 }} />
            <div className="bubble" style={{ width: 300, height: 300, bottom: -100, left: -80, animationDelay: "3s" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="label" style={{ display: "inline-flex", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.9)" }}>
                <Layers style={{ width: 12, height: 12 }} /> Our Vision
              </div>
              <h2 style={{ fontSize: "clamp(28px,4vw,46px)", color: "var(--white)", marginBottom: 20, maxWidth: 640, margin: "0 auto 20px" }}>
                Every School Operates with <span style={{ color: "var(--light)" }}>Clarity &amp; Transparency</span>
              </h2>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,.7)", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.8 }}>
                We envision a future where institutions of every size run digitally with full visibility, less admin overhead, and more time for what truly matters: education.
              </p>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <button 
                 onClick={() => (window.location.href = "/login")}
                className="btn-primary" style={{ background: "var(--white)", color: "var(--navy)" }}>
                  Open Your Dashboard <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
 
    </>
  );
}