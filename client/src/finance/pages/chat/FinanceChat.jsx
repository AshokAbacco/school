import React, { useState } from "react";
import FinanceChatList from "./components/FinanceChatList";
import FinanceMessageView from "./components/FinanceMessageView";

const FinanceChatPage = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleChatCreated = (chat) => {
    setSelectedChat(chat);
  };

  return (
    <div className="flex h-[92dvh] bg-[#F4F8FC] font-['DM_Sans'] overflow-hidden">
      <FinanceChatList 
        selectedChat={selectedChat} 
        onSelectChat={handleSelectChat}
        onChatCreated={handleChatCreated}
      />
      <FinanceMessageView selectedChat={selectedChat} />
    </div>
  );
};

export default FinanceChatPage;