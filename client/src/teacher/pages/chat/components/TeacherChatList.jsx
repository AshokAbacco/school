// src/teacher/pages/chat/components/TeacherChatList.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, MessageSquare, ArrowLeft, Trash2, CheckSquare, Square, X, Check } from "lucide-react";
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const COLORS = ["#384959", "#6A89A7", "#88BDF2", "#BDDDFC", "#5a7a94"];
const TABS = ["ADMIN", "TEACHER", "PARENT"];

function getInitials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name = "", size = 42, colorIndex = 0 }) {
  const bg = COLORS[colorIndex % COLORS.length];
  const textColor = colorIndex <= 1 ? "#BDDDFC" : "#384959";
  return (
    <div
      className="flex items-center justify-center font-semibold rounded-full flex-shrink-0"
      style={{
        width: size, height: size, minWidth: size,
        background: bg, color: textColor,
        fontSize: size * 0.33, fontFamily: "DM Sans, sans-serif",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function RoleBadge({ role = "" }) {
  return (
    <span className="inline-block text-xs font-semibold bg-blue-200 text-blue-700 rounded-full px-2 py-0.5 mt-0.5 font-['DM_Sans']">
      {role.replace("_", " ")}
    </span>
  );
}

// Context Menu Component
function ContextMenu({ x, y, onDelete, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-blue-100 py-1 min-w-[160px] overflow-hidden"
      style={{ top: y, left: x }}
    >
      <button
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-['DM_Sans'] font-medium"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        Delete Chat
      </button>
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
    <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-semibold font-['DM_Sans'] shadow-lg flex items-center gap-2 ${type === "success" ? "bg-[#384959] text-white" : "bg-red-500 text-white"}`}>
      {type === "success" ? <Check size={14} /> : <X size={14} />}
      {message}
    </div>
  );
}

const TeacherChatList = ({ selectedChat, onSelectChat, onChatCreated }) => {
  const [chatList, setChatList] = useState([]);
  const [search, setSearch] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [activeTab, setActiveTab] = useState("ADMIN");
  const [admins, setAdmins] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, chatId }

  // Toast
  const [toast, setToast] = useState(null);

  // Confirm delete modal
  const [confirmDelete, setConfirmDelete] = useState(null); // { ids: [], label: string }

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/list`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setChatList(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUsersByRole = async (role) => {
    try {
      const res = await fetch(`${API_URL}/api/chat?role=${role}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (role === "ADMIN") setAdmins(data.data || []);
      if (role === "TEACHER") setTeachers(data.data || []);
      if (role === "PARENT") setParents(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const createChat = async (userId, role) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ receiverId: userId, receiverRole: role }),
      });
      const data = await res.json();
      onChatCreated(data.data);
      setShowUserList(false);
      fetchChats();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteChats = async (ids) => {
    try {
      await Promise.all(
        [...ids].map((id) =>
          fetch(`${API_URL}/api/chat/chat/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${getToken()}` },
          })
        )
      );
      setToast({ message: `${ids.size || ids.length} chat(s) deleted`, type: "success" });
      setSelectedIds(new Set());
      setSelectionMode(false);
      setConfirmDelete(null);
      fetchChats();
    } catch (err) {
      setToast({ message: "Delete failed", type: "error" });
    }
  };

  useEffect(() => { fetchChats(); }, [fetchChats]);

  // Close context menu on scroll/click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, []);

  const filteredChats = chatList.filter((c) =>
    (c.otherUser?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getUsersForActiveTab = () => {
    switch (activeTab) {
      case "ADMIN": return admins;
      case "TEACHER": return teachers;
      case "PARENT": return parents;
      default: return [];
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredChats.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredChats.map((c) => c.id)));
    }
  };

  const handleRightClick = (e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 80);
    setContextMenu({ x, y, chatId });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs font-['DM_Sans']">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-500" size={22} />
            </div>
            <h3 className="text-center font-semibold text-[#384959] text-base mb-1">Delete Chat{confirmDelete.ids.size > 1 ? "s" : ""}?</h3>
            <p className="text-center text-sm text-gray-500 mb-5">
              {confirmDelete.ids.size > 1
                ? `Are you sure you want to delete ${confirmDelete.ids.size} chats? This cannot be undone.`
                : "Are you sure you want to delete this chat? This cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[#384959] text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={() => setConfirmDelete(null)}
              >Cancel</button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                onClick={() => deleteChats(confirmDelete.ids)}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={() => {
            setContextMenu(null);
            setConfirmDelete({ ids: new Set([contextMenu.chatId]) });
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col w-80 min-w-[300px] bg-white border-r-[1.5px] border-blue-200 h-[92dvh] sm:w-80 max-sm:w-full max-sm:min-w-0">
        {/* Header */}
        <div className="bg-[#384959] p-4 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {(showUserList || selectionMode) && (
              <button
                onClick={() => { setShowUserList(false); exitSelectionMode(); }}
                className="text-white p-1 rounded hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-white text-base font-semibold tracking-tight truncate">
              {selectionMode ? `${selectedIds.size} selected` : "Teacher Chats"}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {selectionMode ? (
              <>
                <button
                  className="text-white/80 text-xs font-medium hover:text-white transition-colors"
                  onClick={toggleSelectAll}
                >
                  {selectedIds.size === filteredChats.length ? "None" : "All"}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    className="bg-red-500 text-white rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-red-600 transition-colors"
                    onClick={() => setConfirmDelete({ ids: selectedIds })}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </>
            ) : !showUserList ? (
              <>
                <button
                  className="bg-white/20 text-white rounded-full p-1.5 hover:bg-white/30 transition-colors"
                  title="Select chats"
                  onClick={() => setSelectionMode(true)}
                >
                  <CheckSquare size={15} />
                </button>
                <button
                  className="bg-[#88BDF2] text-[#384959] rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-[#BDDDFC] transition-colors"
                  onClick={() => { setShowUserList(true); setActiveTab("ADMIN"); fetchUsersByRole("ADMIN"); }}
                >
                  <Plus size={14} />
                  New
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Search bar */}
        {!showUserList && (
          <div className="p-3 border-b border-blue-100 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A89A7]" size={15} />
              <input
                className="w-full border border-blue-200 rounded-full pl-9 pr-3.5 py-2 text-sm text-[#384959] bg-[#F4F8FC] outline-none font-['DM_Sans'] box-border"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Tabs for new chat */}
        {showUserList && (
          <div className="flex gap-1.5 p-2.5 border-b border-blue-100 overflow-x-auto flex-shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border-none font-['DM_Sans'] whitespace-nowrap transition-colors ${
                  activeTab === tab ? "bg-[#384959] text-white" : "bg-[#BDDDFC] text-[#6A89A7]"
                }`}
                onClick={() => { setActiveTab(tab); fetchUsersByRole(tab); }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {showUserList ? (
            getUsersForActiveTab().length === 0 ? (
              <div className="p-8 text-gray-400 text-center flex flex-col items-center gap-2">
                <MessageSquare size={32} className="text-[#BDDDFC]" />
                <span className="text-sm">No users found</span>
              </div>
            ) : (
              getUsersForActiveTab().map((user, i) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3.5 cursor-pointer border-b border-gray-50 hover:bg-[#F4F8FC] transition-colors active:bg-[#BDDDFC]/30"
                  onClick={() => createChat(user.id, activeTab)}
                >
                  <Avatar name={user.name} size={40} colorIndex={i % 5} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-[#384959] truncate block">{user.name}</span>
                    <RoleBadge role={activeTab} />
                    <div className="text-xs text-gray-400 truncate mt-0.5">{user.email}</div>
                  </div>
                </div>
              ))
            )
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-gray-400 text-center flex flex-col items-center gap-2">
              <MessageSquare size={32} className="text-[#BDDDFC]" />
              <span className="text-sm">{search ? "No results found" : "No chats yet"}</span>
            </div>
          ) : (
            filteredChats.map((chat, i) => {
              const isActive = selectedChat?.id === chat.id;
              const isSelected = selectedIds.has(chat.id);

              return (
                <div
                  key={chat.id}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer border-b border-gray-50 transition-all select-none ${
                    isSelected
                      ? "bg-blue-50 border-l-4 border-l-[#384959]"
                      : isActive
                      ? "bg-[#BDDDFC]/60"
                      : "hover:bg-[#F4F8FC] active:bg-[#BDDDFC]/20"
                  }`}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelect(chat.id);
                    } else {
                      onSelectChat(chat);
                    }
                  }}
                  onContextMenu={(e) => !selectionMode && handleRightClick(e, chat.id)}
                >
                  {/* Checkbox (selection mode) */}
                  {selectionMode && (
                    <div className="flex-shrink-0 text-[#384959]">
                      {isSelected
                        ? <CheckSquare size={20} className="text-[#384959]" />
                        : <Square size={20} className="text-gray-300" />}
                    </div>
                  )}

                  <Avatar name={chat.otherUser?.name || "?"} size={40} colorIndex={i % 5} />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-sm font-semibold text-[#384959] truncate">
                        {chat.otherUser?.name || "Unknown"}
                      </span>
                      <span className="text-xs text-[#6A89A7] whitespace-nowrap flex-shrink-0">
                        {chat.messages?.[0]?.createdAt
                          ? new Date(chat.messages[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </span>
                    </div>
                    <RoleBadge role={chat.otherUser?.role || ""} />
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {chat.messages?.[0]?.content || "No messages yet"}
                    </div>
                  </div>

                  {/* Individual delete (non-selection mode) */}
                  {!selectionMode && (
                    <button
                      className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      style={{ opacity: undefined }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ ids: new Set([chat.id]) });
                      }}
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default TeacherChatList;