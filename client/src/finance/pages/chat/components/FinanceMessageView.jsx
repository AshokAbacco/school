import React, { useEffect, useState, useRef } from "react";
import { Search, MoreVertical, Paperclip, Send } from "lucide-react";
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

const FinanceMessageView = ({ selectedChat }) => {
  const user = getUser();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const fetchMessages = async (chatId) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setMessages(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedChat) return;
    fetchMessages(selectedChat.id);
    const interval = setInterval(() => fetchMessages(selectedChat.id), 3000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="flex flex-col flex-1 bg-[#F4F8FC] h-[92dvh]">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="bg-[#384959] p-4 flex items-center gap-3.5">
              <Avatar
                name={selectedChat.otherUser?.name || "?"}
                size={40}
                colorIndex={2}
              />
              <div className="flex-1">
                <p className="text-white text-base font-semibold m-0">
                  {selectedChat.otherUser?.name || "Chat"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-xs text-[#BDDDFC]">
                    {selectedChat.otherUser?.role?.replace("_", " ")} · Online
                  </span>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button className="bg-white/20 border-none rounded-lg w-8.5 h-8.5 flex items-center justify-center cursor-pointer text-white hover:bg-white/30 transition-colors">
                  <Search size={16} />
                </button>
                <button className="bg-white/20 border-none rounded-lg w-8.5 h-8.5 flex items-center justify-center cursor-pointer text-white hover:bg-white/30 transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              <div className="text-xs text-[#6A89A7] bg-[#BDDDFC] inline-block mx-auto px-3.5 py-1 rounded-full self-center">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id}>
                    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        <div className="w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center font-semibold text-xs bg-[#6A89A7] text-white">
                          {getInitials(selectedChat.otherUser?.name || "?")}
                        </div>
                      )}
                      <div
                        className={`max-w-[65%] px-3.5 py-2.5 rounded-2xl text-sm leading-6 ${
                          isMe
                            ? "bg-[#384959] text-[#BDDDFC] rounded-br-sm"
                            : "bg-white border border-[#BDDDFC] text-[#384959] rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                    <div
                      className={`text-xs text-[#6A89A7] mt-0.75 ${
                        isMe ? "text-right ml-0" : "text-left ml-9"
                      }`}
                    >
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                      {isMe && " · ✓✓"}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3.5 border-t-[1.5px] border-[#BDDDFC] bg-white flex items-center gap-2.5">
              <button className="bg-[#BDDDFC] border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-[#6A89A7] flex-shrink-0 hover:bg-[#88BDF2] transition-colors">
                <Paperclip size={16} />
              </button>
              <input
                className="flex-1 border-[1.5px] border-[#BDDDFC] rounded-full px-4 py-2.5 text-sm text-[#384959] outline-none bg-[#F4F8FC] font-['DM_Sans']"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type message..."
              />
              <button className="bg-[#384959] text-white border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-[#6A89A7] transition-colors" onClick={handleSend}>
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-[#6A89A7]">
            <div className="w-15 h-15 rounded-full bg-[#BDDDFC] flex items-center justify-center text-2xl">
              💬
            </div>
            <p className="text-sm text-[#6A89A7] font-medium">
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default FinanceMessageView;