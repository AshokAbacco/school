// src/parent/components/Navbar.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Mail, Menu, ChevronDown, User, LogOut, CheckCheck, Check } from "lucide-react";
import LogoutButton from "../../components/LogoutButton";
import { getSocket } from "../../socket";
import { getToken } from "../../auth/storage";

const font = { fontFamily: "'DM Sans', sans-serif" };
const API_URL = import.meta.env.VITE_API_URL;

const initials = (name = "AU") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export default function Navbar({ onMenuClick, user }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // notifications: Map of chatRoomId → { id, otherUser: {name}, unreadCount, lastMessage }
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const displayName = user?.name || "Admin User";
  const displayRole = user?.role || "Administrator";
  const notificationSound = useRef(null);

  useEffect(() => {
    notificationSound.current = new Audio("/Audio/notification.wav");
  }, []);

  const unreadCount = notifications.reduce((sum, n) => sum + n.unreadCount, 0);

  // ── Poll chat list on mount to hydrate existing unreads ──
  const fetchUnreadSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/list`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      const chats = data.data || [];

      setNotifications((prev) => {
        const prevMap = new Map(prev.map((n) => [n.id, n]));

        const next = chats
          .filter((c) => c.unreadCount > 0)
          .map((c) => ({
            id: c.id,
            unreadCount: c.unreadCount,
            otherUser: c.otherUser,
            lastMessage: c.messages?.[0]?.content || "",
          }));

        // Merge: keep socket-added entries that aren't in poll yet
        const nextMap = new Map(next.map((n) => [n.id, n]));
        prev.forEach((n) => {
          if (!nextMap.has(n.id) && n.unreadCount > 0) nextMap.set(n.id, n);
        });

        return Array.from(nextMap.values());
      });
    } catch (err) {
      console.error("Navbar unread fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadSummary();
    // Re-poll every 30s as a fallback
    const interval = setInterval(fetchUnreadSummary, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadSummary]);

  // ── Socket: add/increment notification on new_message ──
  useEffect(() => {
    let interval;

    const attachSocket = () => {
      const socket = getSocket();
      if (!socket) return;

      socket.off("new_message");
      socket.on("new_message", (msg) => {
        notificationSound.current?.play().catch(() => {});

        setNotifications((prev) => {
          const existing = prev.find((n) => n.id === msg.chatRoomId);
          if (existing) {
            return prev.map((n) =>
              n.id === msg.chatRoomId
                ? { ...n, unreadCount: n.unreadCount + 1, lastMessage: msg.content || n.lastMessage }
                : n
            );
          }
          return [
            {
              id: msg.chatRoomId,
              unreadCount: 1,
              otherUser: { name: msg.senderName || "User" },
              lastMessage: msg.content || "",
            },
            ...prev,
          ];
        });

        if (!notifOpen) setNotifOpen(true);
      });

      clearInterval(interval);
    };

    attachSocket();
    interval = setInterval(attachSocket, 1000);
    return () => clearInterval(interval);
  }, [notifOpen]);

  // ── When a chat is opened from ChatPage, remove it from notifs ──
  useEffect(() => {
    const handleChatOpened = (e) => {
      const chatId = e.detail.chatRoomId;
      setNotifications((prev) => prev.filter((n) => n.id !== chatId));
    };
    window.addEventListener("chat_opened", handleChatOpened);
    return () => window.removeEventListener("chat_opened", handleChatOpened);
  }, []);

  // ── Outside click handler ──
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Mark a single chat as read ──
  const markOneAsRead = async (chatId, e) => {
    e?.stopPropagation();
    try {
      await fetch(`${API_URL}/api/chat/mark-seen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ chatRoomId: chatId }),
      });
    } catch (_) {}
    setNotifications((prev) => prev.filter((n) => n.id !== chatId));
    window.dispatchEvent(new CustomEvent("chat_opened", { detail: { chatRoomId: chatId } }));
  };

  // ── Mark all as read ──
  const markAllAsRead = async () => {
    await Promise.all(notifications.map((n) =>
      fetch(`${API_URL}/api/chat/mark-seen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ chatRoomId: n.id }),
      }).catch(() => {})
    ));
    notifications.forEach((n) =>
      window.dispatchEvent(new CustomEvent("chat_opened", { detail: { chatRoomId: n.id } }))
    );
    setNotifications([]);
  };

  // ── Navigate to chat and mark read ──
  const openChat = async (notif) => {
    await markOneAsRead(notif.id);
    setNotifOpen(false);
    navigate("/parent/chat", { state: { chatRoomId: notif.id } });
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between h-16 px-6"
        style={{ background: "#fff", borderBottom: "1.5px solid #e8f1fb", boxShadow: "0 1px 6px rgba(56,73,89,0.05)", ...font }}
      >
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Menu size={20} />
          </button>

          <div className="relative hidden sm:flex items-center">
            <Search size={15} className="absolute left-3 pointer-events-none" style={{ color: "#6A89A7" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students, teachers…"
              className="pl-9 pr-4 py-2 text-sm rounded-xl outline-none w-72 lg:w-96 transition-all"
              style={{ border: "1.5px solid #BDDDFC", background: "#f8fbff", color: "#384959", ...font }}
              onFocus={(e) => { e.target.style.borderColor = "#88BDF2"; e.target.style.boxShadow = "0 0 0 3px rgba(136,189,242,0.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#BDDDFC"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <button className="sm:hidden p-2 rounded-xl" style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}>
            <Search size={18} />
          </button>

          <button
            className="relative p-2 rounded-xl transition-colors"
            style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Mail size={19} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white" style={{ background: "#88BDF2" }} />
          </button>

          {/* 🔔 Bell + Notification Panel */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2 rounded-xl transition-colors mr-1"
              style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 mt-2 bg-white border rounded-xl shadow-xl z-50 overflow-hidden"
                style={{ width: 320, border: "1.5px solid #BDDDFC", ...font }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100">
                  <span className="font-semibold text-sm text-slate-700">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <CheckCheck size={13} />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl">🔔</div>
                      <p className="text-sm text-gray-400 font-medium">All caught up!</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors group"
                        onClick={() => openChat(n)}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        {/* Avatar */}
                        <div
                          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)" }}
                        >
                          {initials(n.otherUser?.name || "U")}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-semibold text-slate-700 truncate">
                              {n.otherUser?.name || "User"}
                            </span>
                            <span className="flex-shrink-0 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {n.unreadCount}
                            </span>
                          </div>
                          {n.lastMessage && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{n.lastMessage}</p>
                          )}
                          <p className="text-xs text-blue-500 mt-0.5">
                            {n.unreadCount} unread message{n.unreadCount !== 1 ? "s" : ""}
                          </p>
                        </div>

                        {/* Mark as read button (visible on hover) */}
                        <button
                          onClick={(e) => markOneAsRead(n.id, e)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-blue-200 transition-all text-blue-600"
                          title="Mark as read"
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                          <Check size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-blue-100">
                    <button
                      onClick={() => { setNotifOpen(false); navigate("/parent/chat"); }}
                      className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      Open Messages →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-px h-7 mx-2" style={{ background: "#BDDDFC" }} />

          {/* Profile dropdown — unchanged */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold leading-tight" style={{ color: "#384959" }}>{displayName}</p>
                <p className="text-[11px]" style={{ color: "#6A89A7" }}>{displayRole}</p>
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)", color: "#fff" }}
              >
                {initials(displayName)}
              </div>
              <ChevronDown size={14} className={`hidden md:block transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} style={{ color: "#6A89A7" }} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-48 rounded-xl overflow-hidden py-1"
                style={{ background: "#fff", border: "1.5px solid #BDDDFC", boxShadow: "0 8px 28px rgba(56,73,89,0.13)", zIndex: 60 }}
              >
                <div className="flex items-center gap-2.5 px-4 py-3 mb-1" style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)", color: "#fff" }}>
                    {initials(displayName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "#384959" }}>{displayName}</p>
                    <p className="text-[10px] truncate" style={{ color: "#6A89A7" }}>{displayRole}</p>
                  </div>
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); navigate("/superadmin/profile"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#384959", background: "none", border: "none", cursor: "pointer", ...font }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8fd")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <User size={15} style={{ color: "#6A89A7" }} /> Profile
                </button>

                <div style={{ borderTop: "1px solid #f1f5f9", margin: "2px 0" }} />

                <button
                  onClick={() => { setDropdownOpen(false); setLogoutModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", ...font }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fff5f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {logoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(56,73,89,0.35)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#fff", boxShadow: "0 24px 64px rgba(56,73,89,0.22)", animation: "popIn .18s ease", ...font }}>
            <style>{`@keyframes popIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#fee2e2" }}>
              <LogOut size={20} style={{ color: "#ef4444" }} />
            </div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "#384959" }}>Confirm Logout</h3>
            <p className="text-sm text-center mb-6" style={{ color: "#6A89A7" }}>Are you sure you want to logout? You'll need to sign in again.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ border: "1.5px solid #BDDDFC", background: "#f8fbff", color: "#384959", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#BDDDFC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fbff")}
              >
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