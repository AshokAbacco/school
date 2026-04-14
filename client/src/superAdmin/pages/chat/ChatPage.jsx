// src/superAdmin/pages/chat/SuperAdminChatPage.jsx
import React, { useState } from "react";
import SuperAdminChatList from "./components/SuperAdminChatList";
import SuperAdminMessageView from "./components/SuperAdminMessageView";

const SuperAdminChatPage = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  // On mobile: show list OR message view (not both)
  // On desktop (sm+): show both side by side
  return (
    <div className="flex h-[92dvh] bg-blue-50 font-['DM_Sans'] overflow-hidden">
      {/* Chat List: always visible on desktop, hidden on mobile when chat selected */}
      <div className={`
        ${selectedChat ? "hidden sm:flex" : "flex"}
        w-full sm:w-80 sm:min-w-[300px]
      `}>
        <SuperAdminChatList 
          selectedChat={selectedChat} 
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Message View: always visible on desktop, shown on mobile when chat selected */}
      <div className={`
        ${selectedChat ? "flex" : "hidden sm:flex"}
        flex-1 min-w-0
      `}>
        <SuperAdminMessageView 
          selectedChat={selectedChat}
          onBack={handleBack}
        />
      </div>
    </div>
  );
};

export default SuperAdminChatPage;