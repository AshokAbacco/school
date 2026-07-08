// client/src/busHead/components/PageLayout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function getBusHeadUser() {
  try {
    const auth = JSON.parse(localStorage.getItem("auth"));
    return auth?.user || null;
  } catch {
    return null;
  }
}

function PageLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getBusHeadUser();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />
        <main className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default PageLayout;