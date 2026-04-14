// src/parent/pages/chat/ParentChatPage.jsx
import React, { useState, useEffect } from "react";
import ParentChatList from "./Components/ParentChatList";
import ParentMessageView from "./Components/ParentMessageView";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const ParentChatPage = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  // NEW STATES
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleChatCreated = (chat) => {
    setSelectedChat(chat);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  // FETCH STUDENTS
  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/parent/students`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();

      setStudents(data.data || []);

      if (data.data?.length > 0) {
        setSelectedStudent(data.data[0]); // default
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // On mobile: show list OR message view (not both)
  // On desktop (sm+): show both side by side
  return (
    <div className="flex flex-col h-[92dvh] bg-[#F4F8FC] font-['DM_Sans'] overflow-hidden">
      {/* STUDENT SELECTOR */}
      <div className="p-3 bg-white border-b text-sm font-semibold text-[#384959]">
        Student: {selectedStudent?.name || "Loading..."}
      </div>

      <div className="flex flex-1">
        {/* Chat List: always visible on desktop, hidden on mobile when chat selected */}
        <div className={`
          ${selectedChat ? "hidden sm:flex" : "flex"}
          w-full sm:w-80 sm:min-w-[300px]
        `}>
          <ParentChatList 
            selectedChat={selectedChat} 
            onSelectChat={handleSelectChat}
            onChatCreated={handleChatCreated}
            studentId={selectedStudent?.id}
          />
        </div>

        {/* Message View: always visible on desktop, shown on mobile when chat selected */}
        <div className={`
          ${selectedChat ? "flex" : "hidden sm:flex"}
          flex-1 min-w-0
        `}>
          <ParentMessageView 
            selectedChat={selectedChat}
            onBack={handleBack}
          />
        </div>
      </div>
    </div>
  );
};

export default ParentChatPage;