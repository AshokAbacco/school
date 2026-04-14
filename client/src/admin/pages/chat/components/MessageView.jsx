// src/admin/pages/chat/components/MessageView.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, MoreVertical, Paperclip, Send, Trash2, X, Check, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { getToken, getUser } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const COLORS = ["#384959", "#6A89A7", "#88BDF2", "#BDDDFC", "#5a7a94"];

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ name = "", size = 42, colorIndex = 0 }) {
  const bg = COLORS[colorIndex % COLORS.length];
  const textColor = colorIndex <= 1 ? "#BDDDFC" : "#384959";
  return (
    <div
      className="flex items-center justify-center font-semibold rounded-full"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: bg,
        color: textColor,
        fontSize: size * 0.33,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

// Toast notification
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2 font-['DM_Sans'] ${type === "success" ? "bg-slate-700 text-white" : "bg-red-500 text-white"}`}>
      {type === "success" ? <Check size={14} /> : <X size={14} />}
      {message}
    </div>
  );
}

// Confirm modal
function ConfirmModal({ title, body, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs font-['DM_Sans']">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="text-red-500" size={22} />
        </div>
        <h3 className="text-center font-semibold text-slate-700 text-base mb-1">{title}</h3>
        <p className="text-center text-sm text-gray-500 mb-5">{body}</p>
        <div className="flex gap-3">
          <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-700 text-sm font-semibold hover:bg-gray-50" onClick={onCancel}>Cancel</button>
          <button className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// Message context menu
function MessageMenu({ isMe, onDelete, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute bottom-full mb-1 z-40 bg-white rounded-xl shadow-xl border border-blue-100 py-1 min-w-[140px] ${isMe ? "right-0" : "left-0"}`}
    >
      <button
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-['DM_Sans'] font-medium"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        Delete Message
      </button>
    </div>
  );
}

const MessageView = ({ selectedChat, onBack }) => {
  const user = getUser();
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]); // indices into messages
  const [searchIndex, setSearchIndex] = useState(0); // which result we're at
  const messageRefs = useRef({});

  // More menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  // Per-message menu
  const [openMenuMsgId, setOpenMenuMsgId] = useState(null);

  // Confirm modal
  const [confirm, setConfirm] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // Long-press support (mobile)
  const longPressTimer = useRef(null);

  const fetchMessages = useCallback(async (chatId) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setMessages(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSend = async () => {
    if (!message.trim() || !selectedChat) return;
    try {
      await fetch(`${API_URL}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ chatRoomId: selectedChat.id, content: message }),
      });
      setMessage("");
      fetchMessages(selectedChat.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete single message
  const deleteMessage = async (msgId) => {
    try {
      await fetch(`${API_URL}/api/chat/message/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      setToast({ message: "Message deleted", type: "success" });
    } catch (err) {
      setToast({ message: "Delete failed", type: "error" });
    }
    setConfirm(null);
    setOpenMenuMsgId(null);
  };

  // Delete all messages (delete chat room)
  const deleteAllMessages = async () => {
    if (!selectedChat) return;
    try {
      await fetch(`${API_URL}/api/chat/chat/${selectedChat.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setMessages([]);
      setToast({ message: "All messages deleted", type: "success" });
    } catch (err) {
      setToast({ message: "Delete failed", type: "error" });
    }
    setConfirm(null);
    setShowMoreMenu(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchIndex(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const indices = messages
      .map((m, i) => (m.content?.toLowerCase().includes(q) ? i : -1))
      .filter((i) => i !== -1);
    setSearchResults(indices);
    setSearchIndex(indices.length > 0 ? 0 : -1);
  }, [searchQuery, messages]);

  // Scroll to search result
  useEffect(() => {
    if (searchResults.length > 0 && searchIndex >= 0) {
      const msgId = messages[searchResults[searchIndex]]?.id;
      if (msgId && messageRefs.current[msgId]) {
        messageRefs.current[msgId].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [searchIndex, searchResults, messages]);

  useEffect(() => {
    if (!showSearch) { setSearchQuery(""); setSearchResults([]); }
    else setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [showSearch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedChat) return;
    fetchMessages(selectedChat.id);
    const interval = setInterval(() => fetchMessages(selectedChat.id), 3000);
    return () => clearInterval(interval);
  }, [selectedChat, fetchMessages]);

  // Close more menu on outside click
  useEffect(() => {
    const h = (e) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Long press handlers for mobile
  const handleTouchStart = (msgId) => {
    longPressTimer.current = setTimeout(() => setOpenMenuMsgId(msgId), 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const activeSearchMsgId = searchResults.length > 0 && searchIndex >= 0
    ? messages[searchResults[searchIndex]]?.id
    : null;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col flex-1 bg-blue-50 h-[92dvh] min-w-0">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="bg-slate-700 flex-shrink-0">
              {/* Main header row */}
              <div className="p-3 sm:p-4 flex items-center gap-2.5">
                {/* Back button (mobile) */}
                {onBack && (
                  <button
                    className="text-white p-1 rounded hover:bg-white/20 transition-colors sm:hidden flex-shrink-0"
                    onClick={onBack}
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}

                <Avatar name={selectedChat.otherUser?.name || "?"} size={38} colorIndex={2} />

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm sm:text-base font-semibold m-0 truncate">
                    {selectedChat.otherUser?.name || "Chat"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"></div>
                    <span className="text-xs text-blue-200 truncate">
                      {selectedChat.otherUser?.role?.replace("_", " ")} · Online
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    className={`rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer transition-colors ${showSearch ? "bg-white/30 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
                    onClick={() => setShowSearch((p) => !p)}
                    title="Search messages"
                  >
                    <Search size={15} />
                  </button>

                  {/* More menu */}
                  <div className="relative" ref={moreMenuRef}>
                    <button
                      className="bg-white/20 border-none rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer text-white hover:bg-white/30 transition-colors"
                      onClick={() => setShowMoreMenu((p) => !p)}
                    >
                      <MoreVertical size={15} />
                    </button>
                    {showMoreMenu && (
                      <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-blue-100 py-1 min-w-[140px] z-50 cursor-pointer">
                        <button
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 cursor-pointer transition-colors font-['DM_Sans'] font-medium"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setConfirm({
                              title: "Delete All Messages?",
                              body: "This will permanently delete the entire conversation. This cannot be undone.",
                              onConfirm: deleteAllMessages,
                            });
                          }}
                        >
                          <Trash2 size={12} />
                          Delete All 
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Search bar (expandable) */}
              {showSearch && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-700" size={14} />
                    <input
                      ref={searchInputRef}
                      className="w-full bg-white border border-blue-200 rounded-full pl-8 pr-3 py-2 text-sm text-slate-700 outline-none font-['DM_Sans']"
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-white/80 font-['DM_Sans'] whitespace-nowrap">
                        {searchIndex + 1}/{searchResults.length}
                      </span>
                      <button
                        className="text-white/80 hover:text-white p-1"
                        onClick={() => setSearchIndex((p) => (p - 1 + searchResults.length) % searchResults.length)}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        className="text-white/80 hover:text-white p-1"
                        onClick={() => setSearchIndex((p) => (p + 1) % searchResults.length)}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && (
                    <span className="text-xs text-white/60 whitespace-nowrap font-['DM_Sans']">No results</span>
                  )}
                  <button className="text-white/70 hover:text-white p-1 flex-shrink-0" onClick={() => setShowSearch(false)}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-2.5">
              <div className="text-xs text-blue-700 bg-blue-200 inline-block mx-auto px-3.5 py-1 rounded-full self-center">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                const isHighlighted = msg.id === activeSearchMsgId;
                const isMenuOpen = openMenuMsgId === msg.id;

                // Highlight matching text
                const renderContent = () => {
                  if (!searchQuery.trim()) return msg.content;
                  const q = searchQuery;
                  const parts = msg.content.split(new RegExp(`(${q})`, "gi"));
                  return parts.map((part, i) =>
                    part.toLowerCase() === q.toLowerCase()
                      ? <mark key={i} className="bg-yellow-300 text-slate-700 rounded px-0.5">{part}</mark>
                      : part
                  );
                };

                return (
                  <div
                    key={msg.id}
                    ref={(el) => { messageRefs.current[msg.id] = el; }}
                    className={`transition-all duration-300 ${isHighlighted ? "scale-[1.01]" : ""}`}
                  >
                    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        <div className="w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center font-semibold text-xs bg-blue-700 text-white flex-shrink-0">
                          {getInitials(selectedChat.otherUser?.name || "?")}
                        </div>
                      )}

                      {/* Message bubble + menu wrapper */}
                      <div className={`relative max-w-[75%] sm:max-w-[65%] group`}>
                        {/* Bubble */}
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-6 cursor-pointer transition-all ${
                            isHighlighted
                              ? "ring-2 ring-yellow-400"
                              : ""
                          } ${
                            isMe
                              ? "bg-slate-700 text-blue-200 rounded-br-sm"
                              : "bg-white border border-blue-200 text-slate-700 rounded-bl-sm"
                          }`}
                          onClick={() => setOpenMenuMsgId(isMenuOpen ? null : msg.id)}
                          onTouchStart={() => handleTouchStart(msg.id)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchEnd}
                        >
                          {renderContent()}
                        </div>

                        {/* Delete button - visible on hover (desktop) */}
                        {isMe && (
                          <button
                            className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "-left-8" : "-right-8"} p-1.5 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center cursor-pointer`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirm({
                                title: "Delete Message?",
                                body: "This message will be permanently deleted.",
                                onConfirm: () => deleteMessage(msg.id),
                              });
                            }}
                            title="Delete message"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        {/* Per-message context menu (tap on mobile / click on bubble) */}
                        {isMenuOpen && isMe && (
                          <MessageMenu
                            isMe={isMe}
                            onClose={() => setOpenMenuMsgId(null)}
                            onDelete={() => {
                              setOpenMenuMsgId(null);
                              setConfirm({
                                title: "Delete Message?",
                                body: "This message will be permanently deleted.",
                                onConfirm: () => deleteMessage(msg.id),
                              });
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className={`text-xs text-blue-700 mt-0.5 ${isMe ? "text-right" : "text-left ml-9"}`}>
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""}
                      {isMe && " · ✓✓"}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t-[1.5px] border-blue-200 bg-white flex items-center gap-2 flex-shrink-0">
              <button className="bg-blue-200 border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-blue-700 flex-shrink-0 hover:bg-blue-300 transition-colors">
                <Paperclip size={16} />
              </button>
              <input
                className="flex-1 border-[1.5px] border-blue-200 rounded-full px-4 py-2.5 text-sm text-slate-700 outline-none bg-blue-50 font-['DM_Sans'] min-w-0"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
              />
              <button
                className="bg-slate-700 text-white border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-slate-800 transition-colors disabled:opacity-40"
                onClick={handleSend}
                disabled={!message.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-blue-700 p-4">
            <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center text-2xl">💬</div>
            <p className="text-sm text-blue-700 font-medium text-center font-['DM_Sans']">
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default MessageView;