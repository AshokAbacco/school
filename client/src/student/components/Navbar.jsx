//client\src\student\components\Navbar.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Bell, Mail, Menu, ChevronDown,
  User, LogOut, Cake, X,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";

const font = { fontFamily: "'Inter', sans-serif" };

const initials = (name = "AU") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

// ── API base (works for both dev :5000 and same-origin prod) ─────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function fetchBirthdayNotifications() {
  const auth  = JSON.parse(localStorage.getItem("auth") || "{}");
  const token = auth?.token;

  const res = await fetch(`${API_BASE}/notifications/birthday`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.data;
}

// ── Small avatar ──────────────────────────────────────────────────────────────
function Avatar({ name, pic, size = 32 }) {
  return pic ? (
    <img src={pic} alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

// ── Bell / Notification panel ─────────────────────────────────────────────────
function BellPanel({ data, loading, error, onClose }) {
  return (
      <div style={{
        position: "fixed",
        top: 64,
        right: 8,
        left: 8,
        width: "auto",
        maxWidth: 380,
        marginLeft: "auto",
        background: "#fff",
        border: "1.5px solid #BDDDFC", borderRadius: 16,
        boxShadow: "0 12px 40px rgba(56,73,89,0.16)",
        zIndex: 70, overflow: "hidden", ...font,
      }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f9",
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#384959" }}>Notifications</span>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7", padding: 2 }}>
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div style={{ maxHeight: 520, overflowY: "auto", overflowX: "hidden" }}>
        {loading && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#6A89A7", fontSize: 13 }}>
            Loading…
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 4 }}>Could not load notifications</p>
            <p style={{ color: "#6A89A7", fontSize: 11 }}>{error}</p>
          </div>
        )}

        {!loading && !error && (!data || data.count === 0) && (
          <div style={{ padding: "36px 16px", textAlign: "center" }}>
            <Bell size={28} style={{ color: "#BDDDFC", margin: "0 auto 8px", display: "block" }} />
            <p style={{ color: "#6A89A7", fontSize: 13 }}>No notifications today</p>
          </div>
        )}

        {!loading && !error && data && data.count > 0 && (
          <>
            {/* Wish banner */}
            <div style={{
              margin: "12px 12px 4px", borderRadius: 12,
              background: "linear-gradient(135deg, #e8f4fd, #f0f9ff)",
              border: "1px solid #BDDDFC", padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>🎂</span>
                <div>
                  {data.isMyBirthday && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#88BDF2", marginBottom: 2 }}>
                      It's your birthday! 🎉
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: "#384959", fontWeight: 500, lineHeight: 1.4 }}>
                    {data.wish}
                  </p>
                  <p style={{ fontSize: 11, color: "#6A89A7", marginTop: 4 }}>
                    {data.count} student{data.count !== 1 ? "s" : ""} celebrating today · {data.date}
                  </p>
                </div>
              </div>
            </div>

            {/* Birthday list */}
            <div style={{ padding: "6px 12px 12px" }}>
              {data.birthdayStudents.map((s) => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 6px", borderRadius: 10, marginBottom: 2,
                  background: s.isMe ? "rgba(136,189,242,0.1)" : "transparent",
                }}>
                  <Avatar name={s.name} pic={s.profilePic} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: s.isMe ? 700 : 500, color: "#384959",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {s.name}
                      {s.isMe && <span style={{ color: "#88BDF2", marginLeft: 4, fontSize: 11 }}>(You)</span>}
                    </p>
                    <p style={{ fontSize: 11, color: "#6A89A7" }}>🎂 Birthday today</p>
                  </div>
                  <Cake size={15} style={{ color: "#88BDF2", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Mail panel ────────────────────────────────────────────────────────────────
function MailPanel({ onClose }) {
  return (
      <div style={{
        position: "fixed",
        top: 64,
        right: 8,
        left: 8,
        width: "auto",
        maxWidth: 380,
        marginLeft: "auto",
        background: "#fff",
        border: "1.5px solid #BDDDFC", borderRadius: 16,
        boxShadow: "0 12px 40px rgba(56,73,89,0.16)",
        zIndex: 70, overflow: "hidden", ...font,
      }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f9",
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#384959" }}>Messages</span>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7", padding: 2 }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ padding: "36px 16px", textAlign: "center" }}>
        <Mail size={28} style={{ color: "#BDDDFC", margin: "0 auto 8px", display: "block" }} />
        <p style={{ color: "#6A89A7", fontSize: 13 }}>No new messages</p>
      </div>
    </div>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar({ onMenuClick, user }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModal, setLogoutModal]   = useState(false);
  const [search, setSearch]             = useState("");
  const [bellOpen, setBellOpen]         = useState(false);
  const [mailOpen, setMailOpen]         = useState(false);

  const [notifData,    setNotifData]    = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError,   setNotifError]   = useState(null);

  const dropdownRef = useRef(null);
  const bellRef     = useRef(null);
  const mailRef     = useRef(null);

  const displayName = user?.name || "Student User";
  const displayRole = user?.role || "Student";
  const hasBirthday = notifData && notifData.count > 0;

  // ── Close panels on outside click ─────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (bellRef.current     && !bellRef.current.contains(e.target))     setBellOpen(false);
      if (mailRef.current     && !mailRef.current.contains(e.target))     setMailOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Fetch birthday notifications on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setNotifLoading(true);
    fetchBirthdayNotifications()
      .then((data) => { if (!cancelled) { setNotifData(data); setNotifError(null); } })
      .catch((err)  => { if (!cancelled) { setNotifError(err.message); console.error("[Navbar notif]", err); } })
      .finally(()   => { if (!cancelled) setNotifLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleBell = useCallback(() => { setMailOpen(false); setDropdownOpen(false); setBellOpen((o) => !o); }, []);
  const handleMail = useCallback(() => { setBellOpen(false); setDropdownOpen(false); setMailOpen((o) => !o); }, []);

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6"
        style={{ background: "#fff", borderBottom: "1.5px solid #e8f1fb", boxShadow: "0 1px 6px rgba(56,73,89,0.05)", ...font }}>

        {/* Left */}
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="md:hidden p-2 rounded-xl"
            style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <Menu size={20} />
          </button>

          <div className="relative hidden sm:flex items-center">
            <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "#6A89A7" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students, teachers…"
              className="pl-9 pr-4 py-2 text-sm rounded-xl outline-none w-72 lg:w-96 transition-all"
              style={{ border: "1.5px solid #BDDDFC", background: "#f8fbff", color: "#384959", ...font }}
              onFocus={(e) => { e.target.style.borderColor = "#88BDF2"; e.target.style.boxShadow = "0 0 0 3px rgba(136,189,242,0.15)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "#BDDDFC";  e.target.style.boxShadow = "none"; }} />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">

          {/* Mobile search */}
          <button className="sm:hidden p-2 rounded-xl"
            style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}>
            <Search size={18} />
          </button>

          {/* ── Mail ──────────────────────────────────────────────────────── */}
          <div className="relative" ref={mailRef}>
            <button onClick={handleMail} className="relative p-2 rounded-xl transition-colors"
              style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Mail size={19} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white"
                style={{ background: "#88BDF2" }} />
            </button>
            {mailOpen && <MailPanel onClose={() => setMailOpen(false)} />}
          </div>

          {/* ── Bell ──────────────────────────────────────────────────────── */}
          <div className="relative" ref={bellRef}>
            <button onClick={handleBell} className="relative p-2 rounded-xl transition-colors mr-1"
              style={{ color: hasBirthday ? "#f97316" : "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

              {/* Animated bell when there are birthdays */}
              <Bell size={19} style={hasBirthday ? { animation: "bellRing 1.4s ease infinite" } : {}} />
              <style>{`
                @keyframes bellRing {
                  0%,100%{ transform:rotate(0deg); }
                  10%    { transform:rotate(14deg); }
                  20%    { transform:rotate(-12deg); }
                  30%    { transform:rotate(10deg); }
                  40%    { transform:rotate(-8deg); }
                  50%    { transform:rotate(5deg); }
                  60%    { transform:rotate(0deg); }
                }
              `}</style>

              {/* Badge */}
              {hasBirthday ? (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: "#ef4444", border: "2px solid #fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff", padding: "0 3px",
                }}>
                  {notifData.count > 9 ? "9+" : notifData.count}
                </span>
              ) : (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white"
                  style={{ background: "#ef4444" }} />
              )}
            </button>

            {bellOpen && (
              <BellPanel
                data={notifData}
                loading={notifLoading}
                error={notifError}
                onClose={() => setBellOpen(false)}
              />
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-7 mx-2" style={{ background: "#BDDDFC" }} />

          {/* ── Profile dropdown ───────────────────────────────────────────── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setBellOpen(false); setMailOpen(false); setDropdownOpen((o) => !o); }}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold leading-tight" style={{ color: "#384959" }}>{displayName}</p>
                <p className="text-[11px]" style={{ color: "#6A89A7" }}>{displayRole}</p>
              </div>

              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)", color: "#fff" }}>
                {initials(displayName)}
              </div>

              <ChevronDown size={14}
                className={`hidden md:block transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                style={{ color: "#6A89A7" }} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl overflow-hidden py-1"
                style={{ background: "#fff", border: "1.5px solid #BDDDFC", boxShadow: "0 8px 28px rgba(56,73,89,0.13)", zIndex: 60 }}>

                <div className="flex items-center gap-2.5 px-4 py-3 mb-1" style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)", color: "#fff" }}>
                    {initials(displayName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "#384959" }}>{displayName}</p>
                    <p className="text-[10px] truncate" style={{ color: "#6A89A7" }}>{displayRole}</p>
                  </div>
                </div>

                <button onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
                  style={{ color: "#384959", background: "none", border: "none", cursor: "pointer", ...font }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <User size={15} style={{ color: "#6A89A7" }} />
                  Profile
                </button>

                <div style={{ borderTop: "1px solid #f1f5f9", margin: "2px 0" }} />

                <button onClick={() => { setDropdownOpen(false); setLogoutModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
                  style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", ...font }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fff5f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Logout Modal ──────────────────────────────────────────────────── */}
      {logoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(56,73,89,0.35)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(56,73,89,0.22)", animation: "popIn .18s ease", ...font }}>
            <style>{`@keyframes popIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#fee2e2" }}>
              <LogOut size={20} style={{ color: "#ef4444" }} />
            </div>

            <h3 className="text-base font-bold text-center mb-1" style={{ color: "#384959" }}>Confirm Logout</h3>
            <p className="text-sm text-center mb-6" style={{ color: "#6A89A7" }}>
              Are you sure you want to logout? You'll need to sign in again.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: "1.5px solid #BDDDFC", background: "#f8fbff", color: "#384959", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#BDDDFC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fbff")}>
                Cancel
              </button>
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}