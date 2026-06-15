// client/src/superAdmin/pages/PayrollManagement/PayrollManagement.jsx
// Top-level Payroll Management page (Super Admin)
// Tabs: Monthly Payroll | Attendance Corrections | School Config
import React, { useState, useEffect } from "react";
import { IndianRupee, ClipboardCheck, Settings } from "lucide-react";
import MonthlyPayroll from "../../pages/payroll/MonthlyPayroll.jsx";
import AttendanceCorrections from "../../pages/payroll/AttendanceCorrections.jsx";
import AttendanceConfig from "../../pages/payroll/AttendanceConfig.jsx";

const API = import.meta.env.VITE_API_URL;
const token = () => { try { const a = localStorage.getItem("auth"); return a ? JSON.parse(a).token : null; } catch { return null; } };

// Read schoolId directly from stored user as a fallback
const getUserSchoolId = () => {
  try {
    const a = localStorage.getItem("auth");
    return a ? JSON.parse(a).user?.schoolId : null;
  } catch { return null; }
};

const TABS = [
  { id: "payroll",      label: "Monthly Payroll",         icon: IndianRupee },
  { id: "corrections",  label: "Attendance Corrections",   icon: ClipboardCheck },
  { id: "config",       label: "School Config",            icon: Settings },
];

export default function PayrollManagement() {
  const [tab, setTab]           = useState("payroll");
  const [schools, setSchools]   = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");

  useEffect(() => {
    fetch(`${API}/api/biometric/schools`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.length) {
          setSchools(d.data);
          setSelectedSchool(d.data[0]?.id || "");
        } else {
          // API succeeded but returned no schools — fall back to user's own schoolId
          const fallback = getUserSchoolId();
          if (fallback) setSelectedSchool(fallback);
        }
      })
      .catch(() => {
        // Network/auth error — fall back to user's own schoolId so UI still works
        const fallback = getUserSchoolId();
        if (fallback) setSelectedSchool(fallback);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Payroll Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Biometric-based teacher salary calculation and payroll generation
            </p>
          </div>

          {/* School Selector — show when multiple schools exist */}
          {schools.length > 1 && (
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 -mb-[1px]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-colors ${
                tab === id
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {tab === "payroll" && (
          <MonthlyPayroll schools={schools} defaultSchoolId={selectedSchool} />
        )}
        {tab === "corrections" && (
          <AttendanceCorrections schools={schools} defaultSchoolId={selectedSchool} />
        )}
        {tab === "config" && (
          <AttendanceConfig schoolId={selectedSchool} />
        )}
      </div>
    </div>
  );
}