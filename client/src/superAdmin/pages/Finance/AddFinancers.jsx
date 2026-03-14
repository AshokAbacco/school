import { useEffect, useState } from "react";
import { createFinance, updateFinance, getSchools } from "./components/financeApi";

export default function AddFinance({ onSuccess, editData }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", schoolId: "",
    employeeCode: "", designation: "", phone: ""
  });

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await getSchools();
        setSchools(res.data.schools || []);
      } catch (error) {
        console.error("School fetch error:", error);
        setSchools([]);
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.user?.name || "",
        email: editData.user?.email || "",
        password: "",
        schoolId: editData.school?.id || "",
        employeeCode: editData.employeeCode || "",
        designation: editData.designation || "",
        phone: editData.phone || "",
      });
    }
  }, [editData]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editData) {
        await updateFinance(editData.id, form);
      } else {
        await createFinance(form);
      }
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving finance");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-slate-300 bg-gray-50 placeholder-gray-400 transition";

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-xl">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800">
          {editData ? "Edit Finance Account" : "Add Finance Account"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name</label>
          <input name="name" value={form.name} placeholder="Full Name" className={inputClass} onChange={handleChange} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
          <input name="email" type="email" value={form.email} placeholder="Email" className={inputClass} onChange={handleChange} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">
            Password {editData && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
          </label>
          <input name="password" type="password" value={form.password} placeholder="Password" className={inputClass} onChange={handleChange} required={!editData} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">School</label>
          <select name="schoolId" value={form.schoolId} onChange={handleChange} className={inputClass} required>
            <option value="">Select School</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Employee Code</label>
          <input name="employeeCode" value={form.employeeCode} placeholder="Employee Code" className={inputClass} onChange={handleChange} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Designation</label>
          <input name="designation" value={form.designation} placeholder="Designation" className={inputClass} onChange={handleChange} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone</label>
          <input name="phone" value={form.phone} placeholder="Phone Number" className={inputClass} onChange={handleChange} />
        </div>

        <div className="md:col-span-2 flex justify-end mt-2">
          <button type="submit" disabled={loading}
            className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-900 transition text-sm font-medium">
            {loading ? "Saving..." : editData ? "Update Finance" : "+ Create Finance"}
          </button>
        </div>
      </form>
    </>
  );
}