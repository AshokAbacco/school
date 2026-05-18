//client/src/superAdmin/pages/chat/components/SuperAdminChatList.jsx

import React, { useState, useEffect } from "react";
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const TABS = ["ADMIN", "FINANCE"];

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

const SuperAdminChatList = ({
  selectedChat,
  onSelectChat,
}) => {

  const [chatList, setChatList] = useState([]);
  const [search, setSearch] = useState("");

  // NEW CHAT STATES
  const [showUserList, setShowUserList] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("ADMIN");

  // FETCH CHATS
  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/list`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await res.json();

      const sortedChats = (data.data || []).sort((a, b) => {
        const aTime = a.messages?.[0]?.createdAt
          ? new Date(a.messages[0].createdAt).getTime()
          : 0;

        const bTime = b.messages?.[0]?.createdAt
          ? new Date(b.messages[0].createdAt).getTime()
          : 0;

        return bTime - aTime;
      });

      setChatList(sortedChats);

    } catch (err) {
      console.error(err);
    }
  };

  // FETCH USERS
  const fetchUsers = async (role) => {
    try {

      const res = await fetch(`${API_URL}/api/chat?role=${role}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await res.json();

      setUsers(data.data || []);

    } catch (err) {
      console.error(err);
    }
  };

  // CREATE CHAT
  const createChat = async (userId, role) => {
    try {

      const res = await fetch(`${API_URL}/api/chat/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          receiverId: userId,
          receiverRole: role,
        }),
      });

      const data = await res.json();

      if (data.data) {
        onSelectChat(data.data);

        setShowUserList(false);

        fetchChats();
      }

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {

    fetchChats();

    const interval = setInterval(fetchChats, 3000);

    const refreshUnread = () => {
      fetchChats();
    };

    window.addEventListener("chat_opened", refreshUnread);

    return () => {
      clearInterval(interval);
      window.removeEventListener("chat_opened", refreshUnread);
    };

  }, []);

  const filteredChats = chatList.filter((c) =>
    (c.otherUser?.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <div className="flex flex-col w-80 min-w-[300px] bg-white border-r-[1.5px] border-blue-200 h-[92dvh]">

        {/* HEADER */}
        <div className="bg-slate-700 p-4 flex items-center justify-between gap-2">

          <h2 className="text-white text-lg font-semibold tracking-tight flex-1">
            Admin Chats
          </h2>

          <button
            className="bg-blue-300 text-slate-700 border-none rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer font-['DM_Sans'] whitespace-nowrap"
            onClick={() => {
              setShowUserList(true);
              setActiveTab("ADMIN");
              fetchUsers("ADMIN");
            }}
          >
            + New Chat
          </button>

        </div>

        {/* SEARCH */}
        <div className="p-3 border-b border-blue-200">

          <input
            className="w-full border border-blue-200 rounded-full px-3.5 py-2 text-sm text-slate-700 bg-blue-50 outline-none font-['DM_Sans'] box-border"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

        </div>

        {/* TABS */}
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

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">

          {showUserList ? (

            users.map((u, i) => (

              <div
                key={u.id}
                className="flex items-center gap-3 p-3.5 cursor-pointer border-b border-gray-100 hover:bg-blue-100 transition-colors"
                onClick={() => createChat(u.id, activeTab)}
              >

                <Avatar
                  name={u.name}
                  size={42}
                  colorIndex={i % 5}
                />

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
                    isActive
                      ? "bg-blue-200"
                      : "hover:bg-blue-50"
                  }`}
                  onClick={() => {

                    onSelectChat(chat);

                    setChatList((prev) =>
                      prev.map((c) =>
                        c.id === chat.id
                          ? { ...c, unreadCount: 0 }
                          : c
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
    </>
  );
};

export default SuperAdminChatList;