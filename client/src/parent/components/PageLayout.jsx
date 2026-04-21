import React, { useState, useMemo } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function PageLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ SAME AS ADMIN
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
    <div className="flex h-screen overflow-hidden" style={{ background: "#EDF3FA" }}>
      
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={navbarUser}   // ✅ also pass here if needed later
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* ✅ FIX IS HERE */}
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          user={navbarUser}
        />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default PageLayout;