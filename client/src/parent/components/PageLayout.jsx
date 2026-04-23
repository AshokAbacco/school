// client/src/parent/components/PageLayout.jsx
// UI: matches student PageLayout design
// Logic: 100% unchanged — Outlet, Sidebar, Navbar all intact

import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { getUser } from "../../auth/storage";

function PageLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getUser();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#EDF3FA" }}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default PageLayout;