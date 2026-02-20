import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, Mail, Menu, ChevronDown, User, LogOut } from "lucide-react";
import LogoutButton from "../../components/LogoutButton";

const initials = (n = "AU") => n.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);

export default function Navbar({ onMenuClick, user }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const name = user?.name || "Admin User";
  const role = user?.role || "Administrator";

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-5 bg-white border-b border-blue-100 shadow-sm">

        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="md:hidden p-2 rounded-xl text-blue-400 hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all">
            <Menu size={19} />
          </button>
          <div className="relative hidden sm:flex items-center">
            <Search size={14} className="absolute left-3 text-blue-300 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search students, teachers…"
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-blue-200 bg-blue-50/60 text-slate-700 placeholder-blue-300 outline-none w-72 focus:w-96 focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(96,165,250,0.15)] transition-all duration-300"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Mail */}
          <button className="relative p-2 rounded-xl text-blue-400 hover:bg-blue-50 hover:text-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all">
            <Mail size={17} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 border-2 border-white animate-pulse" />
          </button>
          {/* Bell */}
          <button className="relative p-2 rounded-xl text-blue-400 hover:bg-blue-50 hover:text-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all">
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 border-2 border-white animate-pulse" />
          </button>

          <div className="w-px h-7 bg-blue-100 mx-2" />

          {/* Profile */}
          <div className="relative" ref={ref}>
            <button onClick={() => setOpen(o => !o)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-blue-50 hover:-translate-y-0.5 active:scale-95 transition-all">
              <div className="hidden md:block text-right">
                <p className="text-[13.5px] font-semibold text-slate-800 leading-tight">{name}</p>
                <p className="text-[11px] text-blue-400">{role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-blue-300/40 hover:shadow-lg hover:shadow-blue-400/50 transition-shadow">
                {initials(name)}
              </div>
              <ChevronDown size={13} className={`hidden md:block text-blue-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-blue-100 bg-white shadow-xl shadow-slate-200/80 py-1.5 z-50"
                style={{ animation: "dropIn .18s cubic-bezier(.4,0,.2,1)" }}>
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 mb-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {initials(name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{name}</p>
                    <p className="text-[10px] text-blue-400 truncate">{role}</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:translate-x-0.5 transition-all">
                  <User size={14} className="text-blue-400" /> Profile
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button onClick={() => { setOpen(false); setModal(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:translate-x-0.5 transition-all">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm" style={{ animation: "fadeIn .15s ease" }}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-2xl" style={{ animation: "popIn .2s cubic-bezier(.34,1.56,.64,1)" }}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <LogOut size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-800 mb-1">Confirm Logout</h3>
            <p className="text-sm text-center text-slate-500 mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-slate-700 hover:bg-blue-100 hover:-translate-y-0.5 transition-all">
                Cancel
              </button>
              <LogoutButton />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropIn{from{opacity:0;transform:scale(.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </>
  );
}