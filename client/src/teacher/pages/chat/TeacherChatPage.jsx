import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import TeacherChatList from "./components/TeacherChatList";
import TeacherMessageView from "./components/TeacherMessageView";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const TeacherChatPage = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const chatRoomId = location.state?.chatRoomId;
    if (!chatRoomId || selectedChat?.id === chatRoomId) return;

    fetch(`${API_URL}/api/chat/list`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        const match = (data.data || []).find((c) => c.id === chatRoomId);
        if (match) setSelectedChat(match);
      });
  }, [location.state]);

  useEffect(() => {
    if (!selectedChat?.id) return;

    fetch(`${API_URL}/api/chat/mark-seen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        chatRoomId: selectedChat.id,
      }),
    });

    window.dispatchEvent(
      new CustomEvent("chat_opened", {
        detail: { chatRoomId: selectedChat.id },
      })
    );
  }, [selectedChat]);

  return (
    <div className="flex h-[92dvh] bg-[#F4F8FC] font-['DM_Sans'] overflow-hidden">
      <div className={`${selectedChat ? "hidden sm:flex" : "flex"} w-full sm:w-80 sm:min-w-[300px]`}>
        <TeacherChatList
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onChatCreated={setSelectedChat}
        />
      </div>

      <div className={`${selectedChat ? "flex" : "hidden sm:flex"} flex-1 min-w-0`}>
        <TeacherMessageView
          selectedChat={selectedChat}
          onBack={() => setSelectedChat(null)}
        />
      </div>
    </div>
  );
};

export default TeacherChatPage;