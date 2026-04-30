// client/src/teacher/components/Navbar.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Bell, Mail, Menu, ChevronDown,
  User, LogOut, Cake, X, MessageSquare,
} from "lucide-react";
import LogoutButton from "../../components/LogoutButton";

const font = { fontFamily: "'Inter', sans-serif" };

const initials = (name = "AU") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const API_BASE   = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CHAT_ROUTE = "/teacher/chat"; // ← change to your teacher chat page route

// ── Session cache key for birthday data ───────────────────────────────────────
// Stored in sessionStorage so it's fetched ONCE per browser session,
// not on every component mount. Cleared automatically when tab closes.
const BDAY_CACHE_KEY = "teacher_bday_notif";

function getAuthToken() {
  const auth = JSON.parse(localStorage.getItem("auth") || "{}");
  return auth?.token;
}

// ── Soft two-tone ping — no external file needed ──────────────────────────────
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[880, 0, 0.28], [660, 0.15, 0.45]].forEach(([freq, start, stop]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(freq, ctx.currentTime + start);
      g.gain.setValueAtTime(start === 0 ? 0.18 : 0, ctx.currentTime);
      if (start > 0) g.gain.setValueAtTime(0.14, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + stop);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + stop);
    });
  } catch { /* autoplay blocked — silent fail */ }
}

// ── Birthday fetch — reads sessionStorage cache first ─────────────────────────
async function fetchBirthdayNotifications() {
  // Return cached result within the same browser session
  const cached = sessionStorage.getItem(BDAY_CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* corrupt cache — fall through */ }
  }

  const token = getAuthToken();
  const res   = await fetch(`${API_BASE}/api/notifications/birthdays`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  // Don't throw on 429 — just return empty so we don't crash the UI
  if (res.status === 429) {
    console.warn("[Navbar] Birthday API rate limited (429) — skipping");
    return { count: 0, birthdayStudents: [], date: "" };
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  const json = await res.json();
  // Cache for this session
  try { sessionStorage.setItem(BDAY_CACHE_KEY, JSON.stringify(json.data)); } catch { /* storage full */ }
  return json.data;
}

// ── Chat fetch — unchanged logic ──────────────────────────────────────────────
async function fetchChatNotifications() {
  const token = getAuthToken();
  if (!token) return [];

  const res = await fetch(`${API_BASE}/api/chat/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // On 429 return last known state (caller keeps stale data)
  if (res.status === 429) {
    console.warn("[Navbar] Chat API rate limited (429) — skipping poll");
    return null; // null signals "keep previous value"
  }
  if (!res.ok) return [];

  const json = await res.json();
  return (json.data || []).filter((c) => c.unreadCount > 0);
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

// ── Bell / Birthday panel ─────────────────────────────────────────────────────
function BellPanel({ data, loading, error, onClose }) {
  const isTeacherBirthday =
    data?.count === 1 && data?.birthdayStudents?.[0]?.type === "TEACHER";

  const bannerSub = isTeacherBirthday
    ? "It's your special day! 🎉"
    : data
      ? `${data.count} student${data.count !== 1 ? "s" : ""} celebrating today · ${data.date}`
      : "";

  return (
    <div style={{
      position: "fixed", top: 64, right: 8, left: 8,
      width: "auto", maxWidth: 380, marginLeft: "auto",
      background: "#fff", border: "1.5px solid #BDDDFC", borderRadius: 16,
      boxShadow: "0 12px 40px rgba(56,73,89,0.16)", zIndex: 70, overflow: "hidden", ...font,
    }}>
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
            <div style={{
              margin: "12px 12px 4px", borderRadius: 12,
              background: isTeacherBirthday
                ? "linear-gradient(135deg, #fff7ed, #fef3c7)"
                : "linear-gradient(135deg, #e8f4fd, #f0f9ff)",
              border: `1px solid ${isTeacherBirthday ? "#fcd34d" : "#BDDDFC"}`,
              padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>🎂</span>
                <div>
                  {isTeacherBirthday && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#f97316", marginBottom: 2 }}>
                      Happy Birthday to you! 🎉
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: "#384959", fontWeight: 500, lineHeight: 1.4 }}>
                    {data.wish}
                  </p>
                  <p style={{ fontSize: 11, color: "#6A89A7", marginTop: 4 }}>{bannerSub}</p>
                </div>
              </div>
            </div>

            <div style={{ padding: "6px 12px 12px" }}>
              {data.birthdayStudents.map((s) => {
                const isMe = s.type === "TEACHER";
                return (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 6px", borderRadius: 10, marginBottom: 2,
                    background: isMe ? "rgba(249,115,22,0.07)" : "transparent",
                  }}>
                    <Avatar name={s.name} pic={s.profilePic} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: isMe ? 700 : 500, color: "#384959",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {s.name}
                        {isMe && <span style={{ color: "#f97316", marginLeft: 4, fontSize: 11 }}>(You)</span>}
                      </p>
                      <p style={{ fontSize: 11, color: "#6A89A7" }}>🎂 Birthday today</p>
                    </div>
                    <Cake size={15} style={{ color: isMe ? "#f97316" : "#88BDF2", flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Mail / Chat panel ─────────────────────────────────────────────────────────
function MailPanel({ chatNotifs, chatLoading, onClose, onChatClick }) {
  return (
    <div style={{
      position: "fixed", top: 64, right: 8, left: 8,
      width: "auto", maxWidth: 380, marginLeft: "auto",
      background: "#fff", border: "1.5px solid #BDDDFC", borderRadius: 16,
      boxShadow: "0 12px 40px rgba(56,73,89,0.16)", zIndex: 70, overflow: "hidden", ...font,
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

      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {chatLoading && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#6A89A7", fontSize: 13 }}>
            Loading…
          </div>
        )}
        {!chatLoading && chatNotifs.length === 0 && (
          <div style={{ padding: "36px 16px", textAlign: "center" }}>
            <Mail size={28} style={{ color: "#BDDDFC", margin: "0 auto 8px", display: "block" }} />
            <p style={{ color: "#6A89A7", fontSize: 13 }}>No new messages</p>
          </div>
        )}
        {!chatLoading && chatNotifs.length > 0 && (
          <div style={{ padding: "8px 0" }}>
            {chatNotifs.map((chat) => {
              const sender  = chat.otherUser;
              const lastMsg = chat.messages?.[0];
              return (
                <div
                  key={chat.id}
                  onClick={() => onChatClick(chat.id)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 16px", borderBottom: "1px solid #f1f5f9",
                    background: "rgba(136,189,242,0.06)",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(136,189,242,0.14)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(136,189,242,0.06)")}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 13, fontWeight: 700,
                  }}>
                    {initials(sender?.name || "?")}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#384959" }}>
                        {sender?.name || "Unknown"}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 9,
                          background: "#3b82f6", color: "#fff",
                          fontSize: 10, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "0 4px",
                        }}>
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      background: "#BDDDFC", color: "#384959",
                      borderRadius: 20, padding: "1px 7px",
                      display: "inline-block", marginTop: 2, marginBottom: 3,
                    }}>
                      {(sender?.role || "").replace("_", " ")}
                    </span>
                    <p style={{
                      fontSize: 12, color: "#6A89A7",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0,
                    }}>
                      {lastMsg?.content || "New message"}
                    </p>
                    {lastMsg?.createdAt && (
                      <p style={{ fontSize: 10, color: "#88BDF2", marginTop: 2 }}>
                        {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <MessageSquare size={14} style={{ color: "#88BDF2", flexShrink: 0, marginTop: 4 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Teacher Navbar ───────────────────────────────────────────────────────
export default function Navbar({ onMenuClick, user }) {
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModal,  setLogoutModal]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [bellOpen,     setBellOpen]     = useState(false);
  const [mailOpen,     setMailOpen]     = useState(false);

  const [notifData,    setNotifData]    = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError,   setNotifError]   = useState(null);

  const [chatNotifs,   setChatNotifs]   = useState([]);
  const [chatLoading,  setChatLoading]  = useState(false);
  const totalUnreadChat = chatNotifs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const prevUnreadRef    = useRef(0);
  const chatFetchingRef  = useRef(false); // prevents concurrent chat polls
  const dropdownRef      = useRef(null);
  const bellRef          = useRef(null);
  const mailRef          = useRef(null);

  const displayName = user?.name || "Teacher User";
  const displayRole = user?.role || "Teacher";
  const hasBirthday = notifData && notifData.count > 0;

  // ── Outside click → close panels ──────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (bellRef.current     && !bellRef.current.contains(e.target))     setBellOpen(false);
      if (mailRef.current     && !mailRef.current.contains(e.target))     setMailOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Birthday — fetch once per session (sessionStorage cache) ──────────────
  // Delayed by 1.5 s so dashboard data APIs get priority on page load
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      setNotifLoading(true);
      fetchBirthdayNotifications()
        .then((data) => { if (!cancelled) { setNotifData(data); setNotifError(null); } })
        .catch((err)  => { if (!cancelled) setNotifError(err.message); })
        .finally(()   => { if (!cancelled) setNotifLoading(false); });
    }, 1500); // ← 1.5 s delay — dashboard APIs load first

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // ── Chat — poll every 30 s with a concurrent-request guard ────────────────
  // Delayed 2 s on first run so it doesn't pile on with page load
  useEffect(() => {
    let cancelled  = false;
    let isFirstRun = true;

    const load = async () => {
      // Skip if a request is already in flight
      if (chatFetchingRef.current) return;
      chatFetchingRef.current = true;
      if (isFirstRun) setChatLoading(true);

      try {
        const result = await fetchChatNotifications();
        if (!cancelled) {
          if (result !== null) { // null = 429, keep stale data
            const newTotal = result.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            if (!isFirstRun && newTotal > prevUnreadRef.current) {
              playNotificationSound();
            }
            prevUnreadRef.current = newTotal;
            isFirstRun = false;
            setChatNotifs(result);
          }
        }
      } catch { /* silent */ } finally {
        chatFetchingRef.current = false;
        if (!cancelled) setChatLoading(false);
      }
    };

    // First poll after 2 s delay so page-load requests go first
    const initTimer = setTimeout(load, 2000);

    // Subsequent polls every 30 s (was 10 s — reduced to ease rate limit)
    const interval  = setInterval(load, 30_000);

    const onChatOpened = () => load();
    window.addEventListener("chat_opened", onChatOpened);

    return () => {
      cancelled = true;
      clearTimeout(initTimer);
      clearInterval(interval);
      window.removeEventListener("chat_opened", onChatOpened);
    };
  }, []);

  const handleBell = useCallback(() => {
    setMailOpen(false); setDropdownOpen(false); setBellOpen((o) => !o);
  }, []);

  const handleMail = useCallback(() => {
    setBellOpen(false); setDropdownOpen(false); setMailOpen((o) => !o);
  }, []);

  const handleChatClick = useCallback((chatId) => {
    setMailOpen(false);
    navigate(`${CHAT_ROUTE}?id=${chatId}`);
  }, [navigate]);

  return (
    <>
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
              placeholder="Search students, classes…"
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
          <div className="relative" ref={mailRef}>
            <button onClick={handleMail} className="relative p-2 rounded-xl transition-colors"
              style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Mail size={19} />
              {totalUnreadChat > 0 ? (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: "#3b82f6", border: "2px solid #fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff", padding: "0 3px",
                }}>
                  {totalUnreadChat > 9 ? "9+" : totalUnreadChat}
                </span>
              ) : (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white"
                  style={{ background: "#88BDF2" }} />
              )}
            </button>
            {mailOpen && (
              <MailPanel
                chatNotifs={chatNotifs}
                chatLoading={chatLoading}
                onClose={() => setMailOpen(false)}
                onChatClick={handleChatClick}
              />
            )}
          </div>

          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <button onClick={handleBell} className="relative p-2 rounded-xl transition-colors mr-1"
              style={{ color: hasBirthday ? "#f97316" : "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Bell size={19} style={hasBirthday ? { animation: "bellRing 1.4s ease infinite" } : {}} />
              <style>{`
                @keyframes bellRing {
                  0%,100%{transform:rotate(0deg)} 10%{transform:rotate(14deg)}
                  20%{transform:rotate(-12deg)} 30%{transform:rotate(10deg)}
                  40%{transform:rotate(-8deg)} 50%{transform:rotate(5deg)}
                  60%{transform:rotate(0deg)}
                }
              `}</style>
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

          <div className="w-px h-7 mx-2" style={{ background: "#BDDDFC" }} />

          {/* Profile dropdown */}
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
                  <User size={15} style={{ color: "#6A89A7" }} /> Profile
                </button>
                <div style={{ borderTop: "1px solid #f1f5f9", margin: "2px 0" }} />
                <button onClick={() => { setDropdownOpen(false); setLogoutModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
                  style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", ...font }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fff5f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout modal */}
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