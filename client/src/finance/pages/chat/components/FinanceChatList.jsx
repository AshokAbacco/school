import React, { useState, useEffect } from "react";
import { Search, Plus, MessageSquare } from "lucide-react";
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

const FinanceChatList = ({ selectedChat, onSelectChat, onChatCreated }) => {
  const [chatList, setChatList] = useState([]);
  const [search, setSearch] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [admins, setAdmins] = useState([]);

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

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat?role=ADMIN`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setAdmins(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const createChat = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          receiverId: userId,
          receiverRole: "ADMIN",
        }),
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
        <div className="bg-[#384959] p-5 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold tracking-tight">Finance Chats</h2>
          <button
            className="bg-[#88BDF2] text-[#384959] border-none rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer font-['DM_Sans'] flex items-center gap-1"
            onClick={() => {
              setShowUserList(true);
              fetchAdmins();
            }}
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        <div className="p-3 border-b border-blue-200">
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6A89A7]" 
              size={16} 
            />
            <input
              className="w-full border border-blue-200 rounded-full pl-9 pr-3.5 py-2 text-sm text-[#384959] bg-[#F4F8FC] outline-none font-['DM_Sans'] box-border"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showUserList ? (
            admins.map((admin, i) => (
              <div
                key={admin.id}
                className="flex items-center gap-3 p-3.5 cursor-pointer border-b border-gray-100 hover:bg-[#F4F8FC] transition-colors"
                onClick={() => createChat(admin.id)}
              >
                <Avatar name={admin.name} size={42} colorIndex={i % 5} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#384959] truncate">
                      {admin.name}
                    </span>
                  </div>
                  <RoleBadge role="ADMIN" />
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {admin.email}
                  </div>
                </div>
              </div>
            ))
          ) : (
            filteredChats.length === 0 ? (
              <div className="p-4 text-gray-500 text-center flex flex-col items-center gap-2">
                <MessageSquare className="text-[#6A89A7]" size={32} />
                <span>No chats yet</span>
              </div>
            ) : (
              filteredChats.map((chat, i) => {
                const isActive = selectedChat?.id === chat.id;
                return (
                  <div
                    key={chat.id}
                    className={`flex items-center gap-3 p-3.5 cursor-pointer border-b border-gray-100 transition-colors ${
                      isActive
                        ? "bg-[#BDDDFC]"
                        : "hover:bg-[#F4F8FC]"
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
                        <span className="text-sm font-semibold text-[#384959] truncate">
                          {chat.otherUser?.name || "Unknown"}
                        </span>
                        <span className="text-xs text-[#6A89A7] whitespace-nowrap">
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
              })
            )
          )}
        </div>
      </div>
    </>
  );
};

export default FinanceChatList;