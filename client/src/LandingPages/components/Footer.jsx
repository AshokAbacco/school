import { useState } from "react";
import { School, ChevronDown, ChevronUp, Twitter, Facebook, Linkedin, Youtube, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const FOOTER_LINKS = [
  { label: "Home", path: "/" },
  { label: "Pricing", path: "/pricing" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Terms & Conditions", path: "/terms" },
];

const FAQ_ITEMS = [
  {
    q: "What is the Education CRM system?",
    a: "Our Education CRM is a complete school management solution that helps institutions manage students, staff, academics, communication, and finances from a single platform.",
  },
  {
    q: "Who can use this system?",
    a: "It is designed for schools, colleges, and educational institutions of all sizes, including administrators, teachers, students, parents, and finance teams.",
  },
  {
    q: "Is the system cloud-based?",
    a: "Yes, the platform is fully cloud-based, allowing access anytime, anywhere with secure login credentials.",
  },
  {
    q: "Can we manage multiple schools?",
    a: "Yes, multi-school management is available in Gold and Premium plans.",
  },
  {
    q: "Does it support online fee payments?",
    a: "Yes, the system supports online payments via integrated payment gateways.",
  },
  {
    q: "Is there a mobile app available?",
    a: "Yes, mobile apps are available for students, parents, and staff for easy access.",
  },
  {
    q: "Can we customize the system?",
    a: "Yes, we offer customization based on your institution’s requirements.",
  },
  {
    q: "Is data secure?",
    a: "Absolutely. We use secure servers, encrypted data storage, and regular backups to ensure your data safety.",
  },
  {
    q: "Do you provide support?",
    a: "Yes, we provide ongoing technical support and training.",
  },
  {
    q: "How long does setup take?",
    a: "Setup typically takes 3–10 working days depending on customization.",
  },

  // 🔹 Your existing ones (kept but improved)
  {
    q: "Can I migrate data from our existing system?",
    a: "Yes. Our onboarding team provides full data migration support from CSV files and most school management systems.",
  },
  {
    q: "What kind of support is included?",
    a: "All plans include email support. Higher plans include priority support and dedicated account managers.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — enjoy a 30-day free trial with no credit card required.",
  },
];

const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using Education Management Software, you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree, please discontinue use immediately.",
  },
  {
    title: "2. Service Agreement",
    body: "You agree to use the platform in compliance with all applicable laws and regulations. Misuse of the system may result in suspension or termination of access.",
  },
  {
    title: "3. Subscription & Billing",
    body: "All plans are billed annually unless stated otherwise. Renewal charges apply after the initial term and must be paid on time to continue service.",
  },
  {
    title: "4. User Access & Responsibilities",
    body: "You are responsible for maintaining the confidentiality of login credentials and all activities under your account. Notify us immediately of any unauthorized access.",
  },
  {
    title: "5. Data Ownership & Privacy",
    body: "All student and institutional data remains your property. We ensure data confidentiality and do not share it with third parties without consent. Data is securely stored and encrypted.",
  },
  {
    title: "6. Payment Policy",
    body: "All payments must be completed before activation of services. Failure to renew your subscription may result in temporary suspension or permanent loss of access.",
  },
  {
    title: "7. Cancellation Policy",
    body: "Clients may cancel services before the renewal date. Once a service is activated, no refunds will be provided.",
  },
  {
    title: "8. Customization & Changes",
    body: "Additional customization requests beyond the standard offering may incur extra charges depending on the scope and complexity.",
  },
  {
    title: "9. Service Availability",
    body: "We strive to maintain 99.9% uptime. However, we are not liable for downtime caused by maintenance, technical issues, or external factors beyond our control.",
  },
  {
    title: "10. Limitation of Liability",
    body: "Education Management Software shall not be liable for any indirect, incidental, or consequential damages, including data loss or business interruption arising from system usage.",
  },
  {
    title: "11. Updates & Modifications",
    body: "We reserve the right to update features, pricing, or these terms at any time. Continued use of the platform indicates acceptance of the updated terms.",
  },
];
const SOCIAL = [
  { Icon: Twitter, href: "#", label: "Twitter" },
  { Icon: Facebook, href: "#", label: "Facebook" },
  { Icon: Linkedin, href: "#", label: "LinkedIn" },
  { Icon: Youtube, href: "http://youtube.com/@EducationManagementCRM", label: "YouTube" },
];

/* ── Modal ── */
function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,25,40,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20,
          maxWidth: 640, width: "100%", maxHeight: "82vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 32px 80px rgba(56,73,89,0.22)",
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "28px 32px 20px", borderBottom: "1px solid #eef4fb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#1a2533" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "#f5f9ff", border: "1.5px solid #e2edf7",
              borderRadius: 10, width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: "#6A89A7", lineHeight: 1,
            }}
          >×</button>
        </div>
        <div style={{ overflowY: "auto", padding: "24px 32px 32px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── FAQ Accordion ── */
function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 14, border: "1.5px solid #e8f2fb",
      marginBottom: 10, overflow: "hidden",
      background: open ? "#f7fbff" : "#fff",
      transition: "background 0.2s",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none",
          padding: "16px 20px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a2533", lineHeight: 1.4 }}>{item.q}</span>
        {open
          ? <ChevronUp size={16} color="#6A89A7" style={{ flexShrink: 0 }} />
          : <ChevronDown size={16} color="#9db8cc" style={{ flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ padding: "0 20px 18px", fontSize: 13.5, color: "#5a7a94", lineHeight: 1.7 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

/* ── Main Footer ── */
export default function Footer({ onScrollTo }) {
  const [modal, setModal] = useState(null); // "terms" | "faq" | null

  const scrollTo = (id) => {
    if (onScrollTo) onScrollTo(id);
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        .footer-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }

        .footer-nav-btn {
          background: none; border: none; font-size: 13.5px; color: #7a9db8;
          cursor: pointer; font-weight: 500; padding: 4px 0;
          transition: color 0.2s; white-space: nowrap;
        }
        .footer-nav-btn:hover { color: #1a2533; }

        .footer-social {
          width: 38px; height: 38px; border-radius: 12px;
          background: #f5f9ff; border: 1.5px solid #e2edf7;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .footer-social:hover { background: #e2f0fd; border-color: #88BDF2; transform: translateY(-2px); }

        .footer-pill {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: 1.5px solid #e2edf7; border-radius: 100px;
          padding: 7px 16px; font-size: 12.5px; color: #7a9db8;
          cursor: pointer; font-weight: 500; transition: all 0.2s;
        }
        .footer-pill:hover { background: #f5f9ff; border-color: #88BDF2; color: #384959; }

        .brand-gt {
          background: linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .brand-bg { background: linear-gradient(135deg, #384959 0%, #6A89A7 50%, #88BDF2 100%); }
        .font-display { font-family: 'Playfair Display', serif; }

        /* Responsive grid */
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 24px;
        }
        .footer-nav-wrap { display: flex; align-items: center; gap: 28px; justify-content: center; flex-wrap: wrap; }
        .footer-social-wrap { display: flex; align-items: center; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
        .footer-pills { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 24px; }
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }

        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .footer-nav-wrap { justify-content: center; }
          .footer-social-wrap { justify-content: center; }
          .footer-bottom { justify-content: center; text-align: center; }
        }
      `}</style>

      <footer className="footer-root" style={{
        borderTop: "1.5px solid #e8f2fb",
        background: "linear-gradient(180deg, #fafcff 0%, #ffffff 100%)",
        padding: "5px 0 0",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

          {/* ── Top row: logo / nav / social ── */}
          <div className="footer-grid">

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
               <a href="/">
              <span className="font-display" style={{ fontSize: 19, fontWeight: 900, color: "#1a2533" }}>
                <img src="/Logo/logo_sch.png" alt="" className="w-full h-14" />
              </span>
              </a>
            </div>

            {/* Nav links */}
            <div className="footer-nav-wrap">
              {FOOTER_LINKS.map(({ label, path }) => (
                <Link key={path} to={path} className="footer-nav-btn">
                    {label}
                </Link>
                ))}
            </div>

            {/* Social */}
            <div className="footer-social-wrap">
              {SOCIAL.map(({ Icon, href, label }) => (
                <a key={label} href={href} aria-label={label} className="footer-social">
                  <Icon size={15} color="#6A89A7" />
                </a>
              ))}
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ margin: "32px 0 0", height: 1, background: "linear-gradient(90deg, transparent, #e2edf7 20%, #e2edf7 80%, transparent)" }} />

          {/* ── Tagline + pills ── */}
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#506979", margin: 0, letterSpacing: "0.02em" }}>
              Empowering 3,000+ schools worldwide · Built with ❤️ for modern education
            </p>
            <div className="footer-pills">
              <button className="footer-pill" onClick={() => setModal("faq")}>
                FAQs <ArrowUpRight size={12} />
              </button>
              <button className="footer-pill" onClick={() => setModal("terms")}>
                Terms &amp; Conditions <ArrowUpRight size={12} />
              </button>
              {LEGAL_LINKS.slice(1).map(({ label, id }) => (
                <button key={id} className="footer-pill" onClick={() => scrollTo(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Bottom bar ── */}
         <div style={{ borderTop: "1px solid #f0f6fb", padding: "18px 0 24px" }}>
            <div className="footer-bottom">
                <span style={{ fontSize: 12, color: "#506979" }}>
                © {new Date().getFullYear()} Education Management Software. All rights reserved.
                </span>

                {/* <span style={{ fontSize: 12, color: "#506979" }}>
                ISO 27001 · FERPA Compliant · GDPR Ready
                </span> */}
            </div>
            </div>

        </div>
      </footer>

      {/* ── FAQ Modal ── */}
      {modal === "faq" && (
        <Modal title="Frequently Asked Questions" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13.5, color: "#7a9db8", marginBottom: 20, lineHeight: 1.6 }}>
            Got questions? We've got answers. Reach out to support if you need more help.
          </p>
          {FAQ_ITEMS.map((item, i) => <FAQItem key={i} item={item} />)}
        </Modal>
      )}

      {/* ── Terms Modal ── */}
      {modal === "terms" && (
        <Modal title="Terms & Conditions" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: "#9db8cc", marginBottom: 24 }}>
            Last updated: January {new Date().getFullYear()} · Please read these terms carefully before using Education Management Software.
            </p>
          {TERMS_SECTIONS.map(({ title, body }, i) => (
            <div key={i} style={{ marginBottom: 22 }}>
              <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: "#1a2533", margin: "0 0 8px" }}>
                {title}
              </h4>
              <p style={{ fontSize: 13.5, color: "#5a7a94", lineHeight: 1.75, margin: 0 }}>{body}</p>
            </div>
          ))}
          <div style={{
            marginTop: 28, padding: "16px 20px", borderRadius: 14,
            background: "#f5f9ff", border: "1.5px solid #e2edf7",
            fontSize: 12.5, color: "#7a9db8", lineHeight: 1.6,
          }}>
            For questions about these terms, contact us at{" "}
            <a href="mailto:legal@Education Management Software.io" style={{ color: "#6A89A7", fontWeight: 600 }}>
              legal@Education Management Software.io
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}