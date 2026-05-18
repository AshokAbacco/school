// src/admin/pages/chat/components/ChatList.jsx
import React, { useState, useEffect } from "react";
import { getToken, getUser } from "../../../../auth/storage";
import GroupMessageModal from "./GroupMessage";

const API_URL = import.meta.env.VITE_API_URL;

const TABS = ["SUPER_ADMIN", "TEACHER", "FINANCE", "PARENT"];

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

function RoleBadge({ role = "" }) {
  return (
    <span className="inline-block text-xs font-semibold bg-blue-200 text-blue-700 rounded-full px-2 py-0.5 mt-0.5 font-['DM_Sans']">
      {role.replace("_", " ")}
    </span>
  );
}

const ChatList = ({ selectedChat, onSelectChat, onChatCreated }) => {
  const [chatList, setChatList] = useState([]);
  const [search, setSearch] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("SUPER_ADMIN");
  const [showGroupModal, setShowGroupModal] = useState(false);

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/list`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setChatList(
        (data.data || []).sort((a, b) => {
          const aTime = a.messages?.[0]?.createdAt
            ? new Date(a.messages[0].createdAt).getTime()
            : 0;
          const bTime = b.messages?.[0]?.createdAt
            ? new Date(b.messages[0].createdAt).getTime()
            : 0;
          return bTime - aTime;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async (role) => {
    try {
      const res = await fetch(`${API_URL}/api/chat?role=${role}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const createChat = async (userId, role) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
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

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 3000);
    const refreshUnread = () => fetchChats();
    window.addEventListener("chat_opened", refreshUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener("chat_opened", refreshUnread);
    };
  }, []);

  const filteredChats = chatList
    .filter((c) => c.otherUser?.role !== "STUDENT")
    .filter((c) =>
      (c.otherUser?.name || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="flex flex-col w-80 min-w-[300px] bg-white border-r-[1.5px] border-blue-200 h-[92dvh]">

        {/* Header */}
        <div className="bg-slate-700 p-4 flex items-center justify-between gap-2">
          <h2 className="text-white text-lg font-semibold tracking-tight flex-1">
            Messages
          </h2>

          {/* Group Message button */}
          <button
            onClick={() => {
              setShowUserList(false);
              setShowGroupModal(true);
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors font-['DM_Sans']"
            style={{
              background: "rgba(136,189,242,0.18)",
              color: "#BDDDFC",
              border: "1px solid rgba(189,221,252,0.35)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="Send group message to students"
          >
            {/* group icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Group
          </button>

          {/* New Chat button */}
          <button
            className="bg-blue-300 text-slate-700 border-none rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer font-['DM_Sans'] whitespace-nowrap"
            onClick={() => {
              setShowUserList(true);
              fetchUsers("SUPER_ADMIN");
              setActiveTab("SUPER_ADMIN");
            }}
          >
            + New Chat
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-blue-200">
          <input
            className="w-full border border-blue-200 rounded-full px-3.5 py-2 text-sm text-slate-700 bg-blue-50 outline-none font-['DM_Sans'] box-border"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Role tabs (only when picking a new chat user) */}
        {showUserList && (
          <div className="flex gap-1.5 p-2.5 border-b border-blue-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border-none font-['DM_Sans'] whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-slate-700 text-white"
                    : "bg-blue-200 text-blue-700"
                }`}
                onClick={() => {
                  setActiveTab(tab);
                  fetchUsers(tab);
                }}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
        )}

        {/* List body */}
        <div className="flex-1 overflow-y-auto">
          {showUserList ? (
            users.map((u, i) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3.5 cursor-pointer border-b border-gray-100 hover:bg-blue-100 transition-colors"
                onClick={() => {
                  if (activeTab === "STUDENT") {
                    alert("Cannot create chat with students.");
                    return;
                  }
                  createChat(u.id, activeTab);
                }}
              >
                <Avatar name={u.name} size={42} colorIndex={i % 5} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700 truncate">
                      {u.name}
                    </span>
                  </div>
                  <RoleBadge role={activeTab} />
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {u.email}
                  </div>
                </div>
              </div>
            ))
          ) : (
            filteredChats.map((chat, i) => {
              const isActive = selectedChat?.id === chat.id;
              return (
                <div
                  key={chat.id}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer border-b border-gray-100 transition-colors ${
                    isActive ? "bg-blue-200" : "hover:bg-blue-50"
                  }`}
                  onClick={() => {
                    onSelectChat(chat);
                    setChatList((prev) =>
                      prev.map((c) =>
                        c.id === chat.id ? { ...c, unreadCount: 0 } : c
                      )
                    );
                  }}
                >
                  <Avatar
                    name={chat.otherUser?.name || "?"}
                    size={42}
                    colorIndex={i % 5}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700 truncate">
                        {chat.otherUser?.name || "Unknown"}
                      </span>
                      <div className="flex items-center gap-2">
                        {chat.unreadCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
                            {chat.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-blue-700 whitespace-nowrap">
                          {chat.messages?.[0]?.createdAt
                            ? new Date(
                                chat.messages[0].createdAt
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    </div>
                    <RoleBadge role={chat.otherUser?.role || ""} />
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {chat.messages?.[0]?.content || "No messages yet"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Group Message Modal */}
      {showGroupModal && (
        <GroupMessageModal onClose={() => setShowGroupModal(false)} />
      )}
    </>
  );
};

export default ChatList;