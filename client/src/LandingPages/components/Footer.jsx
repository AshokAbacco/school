import { Twitter, Facebook, Linkedin, Youtube, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const FOOTER_LINKS = [
  { label: "Home", path: "/" },
  { label: "Pricing", path: "/pricing" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

const SOCIAL = [
  { Icon: Twitter, href: "#", label: "Twitter" },
  { Icon: Facebook, href: "#", label: "Facebook" },
  { Icon: Linkedin, href: "#", label: "LinkedIn" },
  { Icon: Youtube, href: "http://youtube.com/@EducationManagementCRM", label: "YouTube" },
];

export default function Footer({ onScrollTo }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        .footer-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        .footer-nav-btn {
          background: none; border: none; font-size: 13.5px; color: #7a9db8;
          cursor: pointer; font-weight: 500; padding: 4px 0;
          transition: color 0.2s; white-space: nowrap; text-decoration: none;
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
          font-weight: 500; transition: all 0.2s; text-decoration: none;
        }
        .footer-pill:hover { background: #f5f9ff; border-color: #88BDF2; color: #384959; }
        .font-display { font-family: 'Playfair Display', serif; }
        .footer-grid {
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 24px;
        }
        .footer-nav-wrap { display: flex; align-items: center; gap: 28px; justify-content: center; flex-wrap: wrap; }
        .footer-social-wrap { display: flex; align-items: center; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
        .footer-pills { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 24px; }
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr; text-align: center; }
          .footer-nav-wrap { justify-content: center; }
          .footer-social-wrap { justify-content: center; }
          .footer-bottom { justify-content: center; text-align: center; }
        }
      `}</style>

      <footer className="footer-root" style={{
        borderTop: "1.5px solid #e8f2fb",
        background: "linear-gradient(180deg, #fafcff 0%, #ffffff 100%)",
        padding: "15px 0 0",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

          {/* Top row */}
          <div className="footer-grid">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a href="/">
                <span className="font-display" style={{ fontSize: 19, fontWeight: 900, color: "#1a2533" }}>
                  <img src="/Logo/logo_sch.png" alt="" className="w-full h-14" />
                </span>
              </a>
            </div>

            <div className="footer-nav-wrap">
              {FOOTER_LINKS.map(({ label, path }) => (
                <Link key={path} to={path} className="footer-nav-btn">{label}</Link>
              ))}
            </div>

            <div className="footer-social-wrap">
              {SOCIAL.map(({ Icon, href, label }) => (
                <a key={label} href={href} aria-label={label} className="footer-social">
                  <Icon size={15} color="#6A89A7" />
                </a>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ margin: "32px 0 0", height: 1, background: "linear-gradient(90deg, transparent, #e2edf7 20%, #e2edf7 80%, transparent)" }} />

          {/* Tagline + pills */}
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#506979", margin: 0, letterSpacing: "0.02em" }}>
              Empowering 3,000+ schools worldwide · Built with ❤️ for modern education
            </p>
            <div className="footer-pills">
              <Link to="/faq" className="footer-pill">
                FAQs <ArrowUpRight size={12} />
              </Link>
              <Link to="/terms" className="footer-pill">
                Terms &amp; Conditions <ArrowUpRight size={12} />
              </Link>
              <Link to="/privacy" className="footer-pill">
                Privacy Policy <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid #f0f6fb", padding: "18px 0 24px" }}>
            <div className="footer-bottom">
              <span style={{ fontSize: 12, color: "#506979" }}>
                © {new Date().getFullYear()} Education Management Software. All rights reserved.
              </span>
            </div>
          </div>

        </div>
      </footer>
    </>
  );
}