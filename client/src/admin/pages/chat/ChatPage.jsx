// src/admin/pages/chat/ChatPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ChatList from "./components/ChatList";
import MessageView from "./components/MessageView";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const ChatPage = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const location = useLocation();

  // Auto-select chat if navbar navigated here with a chatRoomId
  useEffect(() => {
    const chatRoomId = location.state?.chatRoomId;
    if (!chatRoomId || selectedChat?.id === chatRoomId) return;

    fetch(`${API_URL}/api/chat/list`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const match = (data.data || []).find((c) => c.id === chatRoomId);
        if (match) setSelectedChat(match);
      })
      .catch(() => {});
  }, [location.state]);

  const handleSelectChat = (chat) => setSelectedChat(chat);
  const handleChatCreated = (chat) => setSelectedChat(chat);
  const handleBack = () => setSelectedChat(null);

  useEffect(() => {
    if (!selectedChat?.id) return;

    fetch(`${API_URL}/api/chat/mark-seen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ chatRoomId: selectedChat.id }),
    });

    window.dispatchEvent(
      new CustomEvent("chat_opened", { detail: { chatRoomId: selectedChat.id } })
    );
  }, [selectedChat]);

  return (
    <div className="flex h-[92dvh] bg-blue-50 font-['DM_Sans'] overflow-hidden">
      <div className={`${selectedChat ? "hidden sm:flex" : "flex"} w-full sm:w-80 sm:min-w-[300px]`}>
        <ChatList
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          onChatCreated={handleChatCreated}
        />
      </div>
      <div className={`${selectedChat ? "flex" : "hidden sm:flex"} flex-1 min-w-0`}>
        <MessageView selectedChat={selectedChat} onBack={handleBack} />
      </div>
    </div>
  );
};

export default ChatPage;