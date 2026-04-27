import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { School, ArrowRight, Menu, X } from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  // ✅ NAV LINKS INSIDE FUNCTION
  const NAV_LINKS = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Pricing", path: "/pricing" },
    { name: "Contact", path: "/contact" },
  ];



  return (
    <nav
      className="nav-blur bg-gradient-to-br from-blue-50 to-blue-100"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
       
        borderBottom: scrolled
          ? "1px solid #e2edf7"
          : "1px solid transparent",
        padding: scrolled ? "10px 0" : "18px 0",
        transition: "all 0.3s",
        boxShadow: scrolled
          ? "0 2px 20px rgba(106,137,167,0.1)"
          : "none",
      }}
    >
      <style>{`
        .nav-blur {
          backdrop-filter: blur(18px);
        }
        .brand-gt {
          background: linear-gradient(135deg, #6A89A7, #88BDF2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .brand-bg {
          background: linear-gradient(135deg, #384959, #6A89A7, #88BDF2);
        }
        .hidden-mobile { display: flex; }
        .show-mobile { display: none; }

        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
           
          <span style={{ fontSize: 10, fontWeight: 900 }}>
            <img src="/Logo/logo_sch.png" alt="" className="w-full h-14" />
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden-mobile" style={{ gap: 32 }}>
          {NAV_LINKS.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6A89A7",
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              {link.name}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden-mobile">
          <button
            onClick={() => navigate("/login")}
            className="brand-bg"
            style={{
              border: "none",
              color: "white",
              padding: "8px 20px",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Get Started <ArrowRight size={15} />
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="show-mobile"
          style={{ background: "none", border: "none" }}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          style={{
            background: "white",
            padding: "16px 24px",
          }}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.name}
              onClick={() => {
                navigate(link.path);
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                padding: "10px 0",
              }}
            >
              {link.name}
            </button>
          ))}

          <button
            onClick={() => navigate("/login")}
            className="brand-bg"
            style={{
              width: "100%",
              marginTop: 16,
              padding: "12px",
              color: "white",
              borderRadius: 10,
              border: "none",
            }}
          >
            Login
          </button>
        </div>
      )}
    </nav>
  );
}