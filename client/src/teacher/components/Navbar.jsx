// client/src/admin/components/Navbar.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Bell, Mail, Menu, ChevronDown,
  User, LogOut, Cake, X, MessageSquare,
} from "lucide-react";
// import { io } from "socket.io-client";
import LogoutButton from "../../components/LogoutButton";
import { getSocket } from "../../socket";

const font = { fontFamily: "'DM Sans', sans-serif" };
const API_URL = import.meta.env.VITE_API_URL;

const initials = (name = "AU") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

// ── Small avatar ──────────────────────────────────────────────
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

// ── Combined Bell Panel ───────────────────────────────────────
function BellPanel({ bdayData, bdayLoading, bdayError, chatNotifs, onClose, onChatClick }) {
  const hasBirthdays = bdayData && bdayData.count > 0;
  const hasChats     = chatNotifs.length > 0;
  const hasAnything  = hasBirthdays || hasChats;

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

      <div style={{ maxHeight: 520, overflowY: "auto", overflowX: "hidden" }}>


        {/* ── Birthday section ── */}
        {bdayLoading && (
          <div style={{ padding: "20px 16px", textAlign: "center", color: "#6A89A7", fontSize: 13 }}>
            Loading…
          </div>
        )}

        {!bdayLoading && hasBirthdays && (
          <div style={{ padding: "10px 12px 4px" }}>
            {/* Section label */}


            {/* One card per birthday student */}
            {bdayData.birthdayStudents.map((s, idx) => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 12, marginBottom: 6,
                background: "linear-gradient(135deg, #f0f8ff, #e8f4fd)",
                border: "1px solid #BDDDFC",
                animation: `fadeSlideIn 0.25s ease both`,
                animationDelay: `${idx * 60}ms`,
              }}>

                {/* Avatar with cake badge */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {s.profilePic ? (
                    <img
                      src={s.profilePic}
                      alt={s.name}
                      style={{
                        width: 40, height: 40, borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #88BDF2",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
                      color: "#fff", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 14, fontWeight: 700,
                      border: "2px solid #BDDDFC",
                    }}>
                      {initials(s.name)}
                    </div>
                  )}
                  <span style={{
                    position: "absolute", bottom: -3, right: -4,
                    fontSize: 14, lineHeight: 1,
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
                  }}>
                    🎂
                  </span>
                </div>

                {/* Text block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#384959",
                    wordBreak: "break-word",
                    marginBottom: 2,
                    lineHeight: 1.4,
                  }}>
                    {s.type === "TEACHER"
                      ? `Happy Birthday ${s.name}! 🎉`
                      : `Your student ${s.name} is celebrating today! 🎉`}
                  </p>

                  <p style={{
                    fontSize: 11,
                    color: "#6A89A7",
                    lineHeight: 1.4,
                  }}>
                    {s.type === "TEACHER"
                      ? "Wishing you a wonderful year ahead ✨"
                      : "A birthday wish from their teacher will make their day ✨"}
                  </p>
                </div>
              </div>
            ))}

            <style>{`
              @keyframes fadeSlideIn {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}

        {/* Divider between sections */}
        {hasBirthdays && hasChats && (
          <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
        )}

        {/* ── Chat messages section ── */}
        {hasChats && (
          <div style={{ padding: "10px 12px 4px" }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#6A89A7",
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 6, paddingLeft: 2,
            }}>
              💬 New Messages
            </p>
            {chatNotifs.map((n) => (
              <div key={n.id}
                onClick={() => onChatClick(n.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 8px", borderRadius: 10, marginBottom: 2,
                  cursor: "pointer", transition: "background 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
                  color: "#fff", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {initials(n.otherUser?.name || "?")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 500, color: "#384959",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {n.otherUser?.name || "Unknown"}
                  </p>
                  <p style={{ fontSize: 11, color: "#6A89A7" }}>
                    {n.unreadCount} new message{n.unreadCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: "#ef4444", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, padding: "0 4px",
                }}>
                  {n.unreadCount > 9 ? "9+" : n.unreadCount}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!bdayLoading && !hasAnything && (
          <div style={{ padding: "36px 16px", textAlign: "center" }}>
            <Bell size={28} style={{ color: "#BDDDFC", margin: "0 auto 8px", display: "block" }} />
            <p style={{ color: "#6A89A7", fontSize: 13 }}>No notifications today</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Navbar ───────────────────────────────────────────────
export default function Navbar({ onMenuClick, user }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModal,  setLogoutModal]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [notifOpen,    setNotifOpen]    = useState(false);

  // Chat notifications (existing)
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);

  // Birthday notifications (new)
  const [bdayData,    setBdayData]    = useState(null);
  const [bdayLoading, setBdayLoading] = useState(false);
  const [bdayError,   setBdayError]   = useState(null);

  const dropdownRef = useRef(null);
  const notifRef    = useRef(null);

  const displayName = user?.name || "Admin User";
  const displayRole = user?.role || "Administrator";

  const notificationSound = new Audio("/Audio/notification.wav");

  // Total badge count: unread chats + birthday count
  const totalBadge = unreadCount + (bdayData?.count || 0);
  const hasBirthdays = bdayData && bdayData.count > 0;

  // ── Fetch birthday notifications on mount ────────────────────
  useEffect(() => {
    let cancelled = false;
    setBdayLoading(true);

    const auth  = JSON.parse(localStorage.getItem("auth") || "{}");
    const token = auth?.token || localStorage.getItem("token");

    fetch(`${API_URL}/api/notifications/birthdays`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) { setBdayData(json.data); setBdayError(null); }
      })
      .catch((e) => {
        if (!cancelled) setBdayError(e.message);
      })
      .finally(() => {
        if (!cancelled) setBdayLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ── Socket: chat notifications ────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("new_message");
    socket.on("new_message", (msg) => {
      setNotifOpen(true);
      notificationSound.play().catch(() => {});

      setNotifications((prev) => {
        const existing = prev.find((n) => n.id === msg.chatRoomId);
        if (existing) {
          return prev.map((n) =>
            n.id === msg.chatRoomId ? { ...n, unreadCount: n.unreadCount + 1 } : n
          );
        }
        return [{ id: msg.chatRoomId, unreadCount: 1, otherUser: { name: msg.senderName || "User" } }, ...prev];
      });
      setUnreadCount((c) => c + 1);
    });
  }, [user]);

  // ── Chat opened: clear that room's badge ─────────────────────
  useEffect(() => {
    const h = (e) => {
      const chatId = e.detail.chatRoomId;
      setNotifications((prev) => prev.filter((n) => n.id !== chatId));
      setUnreadCount((c) => Math.max(c - 1, 0));
    };
    window.addEventListener("chat_opened", h);
    return () => window.removeEventListener("chat_opened", h);
  }, []);

  // ── Fetch unread chats on mount ───────────────────────────────
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res  = await fetch(`${API_URL}/api/chat/list`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.success) {
          const unread = data.data.filter((c) => c.unreadCount > 0);
          setNotifications(unread);
          setUnreadCount(unread.length);
        }
      } catch (e) {
        console.error("❌ fetch error", e);
      }
    };
    fetchUnread();
  }, []);

  // ── Outside-click closes panels ──────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current    && !notifRef.current.contains(e.target))    setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleChatClick = useCallback((chatRoomId) => {
    setNotifOpen(false);
    window.location.href = "/teacher/chat";
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6"
        style={{ background: "#fff", borderBottom: "1.5px solid #e8f1fb",
          boxShadow: "0 1px 6px rgba(56,73,89,0.05)", ...font }}>

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
          <button className="sm:hidden p-2 rounded-xl"
            style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}>
            <Search size={18} />
          </button>

          {/* Mail */}
          <button className="relative p-2 rounded-xl transition-colors"
            style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <Mail size={19} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white"
              style={{ background: "#88BDF2" }} />
          </button>

          {/* ── Bell ── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setDropdownOpen(false); setNotifOpen((o) => !o); }}
              className="relative p-2 rounded-xl transition-colors mr-1"
              style={{
                color: hasBirthdays ? "#f97316" : "#6A89A7",
                background: "none", border: "none", cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

              <Bell size={19} style={hasBirthdays
                ? { animation: "bellRing 1.4s ease infinite" } : {}} />
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

              {totalBadge > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: "#ef4444", border: "2px solid #fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff", padding: "0 3px",
                }}>
                  {totalBadge > 9 ? "9+" : totalBadge}
                </span>
              )}
            </button>

            {notifOpen && (
              <BellPanel
                bdayData={bdayData}
                bdayLoading={bdayLoading}
                bdayError={bdayError}
                chatNotifs={notifications}
                onClose={() => setNotifOpen(false)}
                onChatClick={handleChatClick}
              />
            )}
          </div>

          <div className="w-px h-7 mx-2" style={{ background: "#BDDDFC" }} />

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setNotifOpen(false); setDropdownOpen((o) => !o); }}
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
                style={{ background: "#fff", border: "1.5px solid #BDDDFC",
                  boxShadow: "0 8px 28px rgba(56,73,89,0.13)", zIndex: 60 }}>

                <div className="flex items-center gap-2.5 px-4 py-3 mb-1"
                  style={{ borderBottom: "1px solid #f1f5f9" }}>
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

      {/* Logout Modal */}
      {logoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(56,73,89,0.35)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(56,73,89,0.22)",
              animation: "popIn .18s ease", ...font }}>
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