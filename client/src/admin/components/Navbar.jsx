import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, Mail, ChevronDown, User, LogOut } from 'lucide-react';
import LogoutButton from '../../components/LogoutButton';

function Navbar({ onMenuClick }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setIsLogoutModalOpen(true);
  };


  const handleCancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            {/* Search Bar */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students, teachers..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 lg:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search Icon for Mobile */}
            <button className="sm:hidden p-2 hover:bg-gray-100 rounded-lg transition">
              <Search className="w-5 h-5 text-gray-600" />
            </button>

            {/* Messages */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <Mail className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <Bell className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative pl-2 md:pl-4 border-l" ref={dropdownRef}>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="text-right hidden md:block">
                  <p className="font-semibold text-sm text-gray-800">Student  User</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded-lg transition"
                >
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    AU
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 hidden md:block transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      // Add navigation to profile page
                      console.log('Navigate to profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            
            {/* Modal Content */}
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
              Confirm Logout
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to logout? You will need to sign in again to access your account.
            </p>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelLogout}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
               <LogoutButton/>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
