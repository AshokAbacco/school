// client/src/busHead/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";

export default function Navbar({ onMenuClick, user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <header
      className="flex items-center justify-between flex-shrink-0"
      style={{ height: 64, padding: "0 20px", background: "#fff", borderBottom: "1px solid #E5E7EB", fontFamily: "'DM Sans', sans-serif" }}
    >
      <button
        onClick={onMenuClick}
        className="md:hidden"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#384959" }}
      >
        <Menu size={22} />
      </button>

      <div style={{ fontWeight: 700, fontSize: 15, color: "#243340" }}>
        Bus Head Portal
      </div>

      <button
        onClick={handleLogout}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E7EB",
          background: "#fff", color: "#B91C1C", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        <LogOut size={15} /> Logout
      </button>
    </header>
  );
}