//client\src\teacher\components\PageLayout.jsx
import React, { useState, useMemo } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function PageLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  // ✅ Read auth once
  const navbarUser = useMemo(() => {
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
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ✅ Pass user properly */}
        <Navbar onMenuClick={handleMenuClick} user={navbarUser} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default PageLayout;
