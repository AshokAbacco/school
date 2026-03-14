import React, { useState, useMemo } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function PageLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Read auth once on mount from localStorage
  const user = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("auth"));
      if (!stored) return null;
      return {
        name: stored.user?.name,
        role: stored.role,
      };
    } catch (err) {
      console.error("Invalid auth in localStorage");
      return null;
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — now receives user so the bottom card shows real name */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar — receives user so the top-right profile shows real name */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default PageLayout;