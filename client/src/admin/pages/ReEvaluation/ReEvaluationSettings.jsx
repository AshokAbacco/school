import { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const ReEvaluationSettings = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // Added for refresh spinner state
const [formData, setFormData] = useState({
  academicYearId: "",
  selectedGrade: "",
  classSectionId: "",
  subjectId: "",
  amount: "",
});

  const fetchInitialData = async () => {
    try {
      const [academicYearRes, classSectionRes, subjectRes] = await Promise.all([
        axios.get(`${API_URL}/api/academic-years`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/class-sections`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/subjects`, { headers: authHeaders() }),
      ]);

      setAcademicYears(
        Array.isArray(academicYearRes.data)
          ? academicYearRes.data
          : academicYearRes.data?.academicYears || academicYearRes.data?.data || []
      );

      setClassSections(
        Array.isArray(classSectionRes.data)
          ? classSectionRes.data
          : classSectionRes.data?.classSections || classSectionRes.data?.data || []
      );

      setSubjects(
        Array.isArray(subjectRes.data)
          ? subjectRes.data
          : subjectRes.data?.subjects || subjectRes.data?.data || []
      );
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSettings = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/api/re-evaluation/settings`, {
        headers: authHeaders(),
      });
      setSettings(response.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const groupedClasses = Object.values(
  classSections.reduce((acc, item) => {
    const grade = item.grade;

    if (!acc[grade]) {
      acc[grade] = {
        grade,
        sections: [],
      };
    }

    acc[grade].sections.push(item);

    return acc;
  }, {})
);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(
        `${API_URL}/api/re-evaluation/settings`,
        {
          ...formData,
          amount: Number(formData.amount),
        },
        { headers: authHeaders() }
      );

    setFormData({
      academicYearId: "",
      selectedGrade: "",
      classSectionId: "",
      subjectId: "",
      amount: "",
    });

      fetchSettings();
      alert("Pricing saved successfully");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to save pricing");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this pricing?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/api/re-evaluation/settings/${id}`, {
        headers: authHeaders(),
      });
      fetchSettings();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf3f9] text-[#1e293b] p-8 space-y-8 font-sans antialiased">
      
      {/* SCREEN ROUTE TITLES */}
      <div className="pb-2 border-b border-[#cfdbe6]">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
          Re-Evaluation Settings
        </h1>
        <p className="text-sm text-[#64748b] mt-1">
          Configure financial processing rules and structural pricing modules across standard parameters
        </p>
      </div>

      {/* CORE CONTROL FORM CONFIG PANEL */}
      <div className="bg-white rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
        <h2 className="text-base font-bold text-[#1e293b] mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m0 14v-6m0 6a2 2 0 100-4m0 4a2 2 0 110-4m0-6v2m6.5-2.5h-1.5m1.5 0a2 2 0 10-4 0m4 0a2 2 0 11-4 0m0 14v-6m0 6a2 2 0 100-4m0 4a2 2 0 110-4m0-6v2M4.5 7.5H3m1.5 0a2 2 0 104 0m-4 0a2 2 0 114 0m0 14v-6m0 6a2 2 0 100-4m0 4a2 2 0 110-4m0-6v2" />
          </svg>
          Configure Re-Evaluation Fee Structure
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-end">
          
          {/* ACADEMIC YEAR DROPDOWN */}
          <div className="relative lg:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Academic Year</label>
            <div className="relative">
              <select
                name="academicYearId"
                value={formData.academicYearId}
                onChange={handleChange}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#334155] rounded-xl p-3.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-sm"
                required
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748b]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>

        {/* CLASS DROP DOWN */}
        <div className="relative lg:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">
            Class / Grade
          </label>

          <div className="relative">
            <select
              name="selectedGrade"
              value={formData.selectedGrade}
              onChange={(e) => {
                const selectedGrade = e.target.value;

                const matchedClass =
                  groupedClasses.find(
                    (g) => g.grade === selectedGrade
                  );

                setFormData({
                  ...formData,
                  selectedGrade,

                  // first section auto-selected internally
                  classSectionId:
                    matchedClass?.sections?.[0]?.id || "",
                });
              }}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#334155] rounded-xl p-3.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-sm"
              required
            >
              <option value="">Select Class</option>

              {groupedClasses.map((item) => (
                <option
                  key={item.grade}
                  value={item.grade}
                >
                  Class {item.grade}
                </option>
              ))}
            </select>

            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748b]">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* AUTO SECTION INFO */}
          {formData.selectedGrade && (
            <p className="text-[11px] text-[#64748b] mt-2">
              Applies automatically to all sections of Class{" "}
              {formData.selectedGrade}
            </p>
          )}
        </div>

          {/* SUBJECT DROPDOWN */}
          <div className="relative lg:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Subject</label>
            <div className="relative">
              <select
                name="subjectId"
                value={formData.subjectId}
                onChange={handleChange}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#334155] rounded-xl p-3.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-sm"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748b]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>

          {/* NUMERIC AMOUNT INPUT */}
          <div className="relative lg:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Processing Fee</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none font-bold text-[#64748b] text-sm">
                ₹
              </div>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] rounded-xl p-3.5 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-semibold text-sm"
                required
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold text-sm h-[49px] rounded-xl shadow-md shadow-blue-600/10 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              {loading ? "Saving..." : "Save Pricing"}
            </button>
          </div>

        </form>
      </div>

      {/* RENDER COMPILATION DATA GRID LIST */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.01)] overflow-hidden">
        <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0f172a]">Active Pricing List</h2>
          
          {/* Refresh Button Container */}
          <button
            onClick={fetchSettings}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            title="Refresh active settings"
          >
            <svg 
              className={`w-3.5 h-3.5 text-[#64748b] ${isRefreshing ? "animate-spin" : ""}`} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-[#64748b] text-xs font-semibold uppercase tracking-wider border-b border-[#e2e8f0]">
                <th className="p-4">Academic Year</th>
                <th className="p-4">Class Level</th>
                <th className="p-4">Assigned Subject</th>
                <th className="p-4">Amount Rate</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] text-sm font-medium text-[#334155]">
              {settings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-[#94a3b8] font-normal">
                    No individual re-evaluation pricing rules configured yet.
                  </td>
                </tr>
              ) : (
                settings.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8fafc]/40 transition-colors">
                    <td className="p-4 text-[#0f172a] font-semibold">
                      {item.academicYear?.name}
                    </td>
                    <td className="p-4 text-[#475569]">
                      {item.classSection?.name || `${item.classSection?.grade}-${item.classSection?.section}`}
                    </td>
                    <td className="p-4 text-[#0f172a] font-semibold">
                      {item.subject?.name}
                    </td>
                    <td className="p-4 font-black text-[#0f172a]">
                      ₹ {item.amount}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-white border border-[#fecaca] hover:bg-[#fef2f2] text-[#e11d48] px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#e11d48]/20"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ReEvaluationSettings;