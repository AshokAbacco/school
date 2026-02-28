// client\src\teacher\components\Sidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, User, GraduationCap, X } from "lucide-react";

function Sidebar({ isOpen, onClose, user }) {
  // Added user prop
  const location = useLocation();
  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: User, label: "Attendance", href: "/attendance" },
  ];

  const initials = (name = "AU") =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 flex flex-col`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">SchoolHub</h1>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-500">
            <X />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                location.pathname === item.href
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Dynamic User Profile Section */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {initials(user?.name || "Teacher")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800 truncate">
                {user?.name || "Teacher User"}
              </p>
              <p className="text-xs text-gray-500 uppercase">
                {user?.role || "Staff"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
