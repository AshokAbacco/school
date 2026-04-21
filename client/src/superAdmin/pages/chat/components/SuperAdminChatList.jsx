//client\src\superAdmin\pages\chat\components\SuperAdminChatList.jsx
import React, { useState, useEffect } from "react";
import { getToken } from "../../../../auth/storage";

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

function RoleBadge({ role = "" }) {
  return (
    <span className="inline-block text-xs font-semibold bg-blue-200 text-blue-700 rounded-full px-2 py-0.5 mt-0.5 font-['DM_Sans']">
      {role.replace("_", " ")}
    </span>
  );
}

const SuperAdminChatList = ({ selectedChat, onSelectChat }) => {
  const [chatList, setChatList] = useState([]);
  const [search, setSearch] = useState("");

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/list`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setChatList(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const filteredChats = chatList.filter((c) =>
    (c.otherUser?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="flex flex-col w-80 min-w-[300px] bg-white border-r-[1.5px] border-blue-200 h-[92dvh]">
        <div className="bg-slate-700 p-5 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold tracking-tight">Admin Chats</h2>
        </div>

        <div className="p-3 border-b border-blue-200">
          <input
            className="w-full border border-blue-200 rounded-full px-3.5 py-2 text-sm text-slate-700 bg-blue-50 outline-none font-['DM_Sans'] box-border"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat, i) => {
            const isActive = selectedChat?.id === chat.id;
            return (
              <div
                key={chat.id}
                className={`flex items-center gap-3 p-3.5 cursor-pointer border-b border-gray-100 transition-colors ${
                  isActive
                    ? "bg-blue-200"
                    : "hover:bg-blue-50"
                }`}
                onClick={() => onSelectChat(chat)}
              >
                <Avatar
                  name={chat.otherUser?.name || "?"}
                  size={42}
                  colorIndex={i % 5}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700 truncate">
                      {chat.otherUser?.name || "Unknown"}
                    </span>
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
                  <RoleBadge role={chat.otherUser?.role || ""} />
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {chat.messages?.[0]?.content || "No messages yet"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SuperAdminChatList;