import { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const ParentScriptViewing = () => {
  const [children, setChildren] = useState([]);
  const [assessmentGroups, setAssessmentGroups] = useState([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [myRequests, setMyRequests] = useState([]);

  useEffect(() => {
    fetchChildren();
    fetchAssessmentGroups();
    fetchMyRequests();
  }, []);

  const fetchChildren = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/parent/students`, {
        headers: authHeaders(),
      });

      const data = response.data;
      const list = Array.isArray(data) ? data : data?.data || [];
      setChildren(list);
    } catch (error) {
      console.error("fetchChildren error:", error);
    }
  };

  const fetchAssessmentGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/parent/assessment-groups/final`, {
        headers: authHeaders(),
      });
      setAssessmentGroups(
        Array.isArray(response.data)
          ? response.data
          : response.data?.data || []
      );
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSubjects = async () => {
    if (!selectedChild || !selectedExam) return;
    try {
      const response = await axios.get(
        `${API_URL}/api/parent/re-evaluation/subjects?studentId=${selectedChild}&assessmentGroupId=${selectedExam}`,
        { headers: authHeaders() }
      );
      setSubjects(
        Array.isArray(response.data)
          ? response.data
          : response.data?.data || []
      );
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMyRequests = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/api/parent/re-evaluation/my-requests`, {
        headers: authHeaders(),
      });
      setMyRequests(response.data?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedChild, selectedExam]);

  const getChildName = (child) => {
    if (child.firstName && child.lastName) {
      return `${child.firstName} ${child.lastName}`;
    }
    if (child.firstName) return child.firstName;
    if (child.name) return child.name;
    if (child.email) return child.email;
    return `Student (${child.id?.slice(0, 6)})`;
  };

  const handleSelectSubject = (subject) => {
    const exists = selectedSubjects.find((item) => item.marksId === subject.marksId);
    if (exists) {
      setSelectedSubjects(selectedSubjects.filter((item) => item.marksId !== subject.marksId));
    } else {
      setSelectedSubjects([
        ...selectedSubjects,
        { marksId: subject.marksId, subjectId: subject.subjectId },
      ]);
    }
  };

  const calculateTotal = () => {
    return subjects
      .filter((subject) => selectedSubjects.some((item) => item.marksId === subject.marksId))
      .reduce((total, item) => total + Number(item.reEvaluationAmount || 0), 0);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${API_URL}/api/parent/re-evaluation/request`,
        {
          studentId: selectedChild,
          assessmentGroupId: selectedExam,
          parentRemarks: remarks,
          requests: selectedSubjects,
          isPaid: paid,
        },
        { headers: authHeaders() }
      );
      alert("Script view request submitted successfully");
      fetchMyRequests();
      setSelectedSubjects([]);
      setRemarks("");
      setPaid(false);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const openAnswerSheet = async (id) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/re-evaluation/requests/${id}/answer-sheet`,
        { headers: authHeaders() }
      );
      window.open(response.data.url, "_blank");
    } catch (error) {
      console.error(error);
      alert("Answer script not uploaded yet");
    }
  };

  return (
    <div className="min-h-screen bg-[#edf3f9] text-[#1e293b] p-8 space-y-8 font-sans antialiased">

      {/* PAGE HEADER */}
      <div className="pb-2 border-b border-[#cfdbe6]">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
          Answer Script Viewing
        </h1>
        <p className="text-sm text-[#64748b] mt-1">
          Apply to view your child's final examination answer scripts and track your submissions
        </p>
      </div>

      {/* APPLICATION FORM */}
      <div className="bg-white rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
        <h2 className="text-base font-bold text-[#1e293b] mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Script View Application
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Child Dropdown */}
          <div className="relative">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#334155] rounded-xl p-3.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-sm"
            >
              <option value="">Select Child</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {getChildName(child)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748b]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Exam Dropdown */}
          <div className="relative">
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] text-[#334155] rounded-xl p-3.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-sm"
            >
              <option value="">Select Final Exam</option>
              {assessmentGroups.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748b]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* SUBJECTS TABLE */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          <div className="p-6 border-b border-[#f1f5f9]">
            <h3 className="text-lg font-bold text-[#0f172a]">Available Academic Subjects</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-[#64748b] text-xs font-semibold uppercase tracking-wider border-b border-[#e2e8f0]">
                  <th className="p-4 text-center w-20">Select</th>
                  <th className="p-4">Subject Name</th>
                  <th className="p-4">Obtained Marks</th>
                  <th className="p-4">Max Marks</th>
                  <th className="p-4">Pass Marks</th>
                  <th className="p-4">Result Status</th>
                  <th className="p-4 text-right">Viewing Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] text-sm font-medium text-[#334155]">
                {subjects.map((subject) => {
                  const selected = selectedSubjects.some((item) => item.marksId === subject.marksId);
                  return (
                    <tr
                      key={subject.marksId}
                      className={`hover:bg-[#f8fafc]/50 transition-colors ${selected ? "bg-blue-50/40" : ""}`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleSelectSubject(subject)}
                          className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500/30"
                        />
                      </td>
                      <td className="p-4 text-[#0f172a] font-semibold">{subject.subjectName}</td>
                      <td className="p-4">{subject.obtainedMarks}</td>
                      <td className="p-4 text-[#64748b]">{subject.maxMarks}</td>
                      <td className="p-4 text-[#64748b]">{subject.passMarks}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            subject.result?.toLowerCase() === "pass"
                              ? "bg-green-50 text-green-700"
                              : "bg-[#fef2f2] text-[#e11d48]"
                          }`}
                        >
                          {subject.result}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-[#0f172a]">₹ {subject.reEvaluationAmount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="p-6 bg-[#f8fafc] border-t border-[#e2e8f0] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">
                Parent Remarks
              </label>
              <textarea
                placeholder="Type relevant specific query details or viewing contexts here..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-white border border-[#e2e8f0] rounded-xl p-4 min-h-[115px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-[#94a3b8]"
              />
            </div>

            <div className="lg:col-span-5 bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                <span className="text-sm font-semibold text-[#64748b]">Transaction State</span>
                <button
                  onClick={() => setPaid(!paid)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all ${
                    paid
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-[#fef2f2] text-[#e11d48] border border-[#fecaca] hover:bg-[#fee2e2]"
                  }`}
                >
                  {paid ? "Paid" : "Not Paid"}
                </button>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#64748b] font-medium">Total Amount Due:</span>
                <span className="text-2xl font-black text-[#0f172a]">₹ {calculateTotal()}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || selectedSubjects.length === 0}
                className="w-full bg-blue-600 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-600/10 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {loading ? "Submitting Request..." : "Submit Script View Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MY REQUESTS TABLE */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.01)] overflow-hidden">
        <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0f172a]">My Script View Requests</h2>
          <button
            onClick={fetchMyRequests}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            title="Refresh history table"
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
                <th className="p-4">Subject Name</th>
                <th className="p-4">Viewing Fee</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Request Status</th>
                <th className="p-4 text-right">Digital Answer Script</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] text-sm font-medium text-[#334155]">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-[#94a3b8] font-normal">
                    No processing script view requests filed under this account profile.
                  </td>
                </tr>
              ) : (
                myRequests.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8fafc]/40 transition-colors">
                    <td className="p-4 text-[#0f172a] font-semibold">{item.subject?.name}</td>
                    <td className="p-4 font-semibold text-[#475569]">₹ {item.requestedAmount}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.isPaid ? "bg-green-50 text-green-700" : "bg-[#fef2f2] text-[#e11d48]"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isPaid ? "bg-green-500" : "bg-[#e11d48]"}`} />
                        {item.isPaid ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#64748b] bg-[#f1f5f9] px-2.5 py-1 rounded-md">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {item.answerSheetFileKey ? (
                        <button
                          onClick={() => openAnswerSheet(item.id)}
                          className="bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-blue-600 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          View Script
                        </button>
                      ) : (
                        <span className="text-xs text-[#94a3b8] font-normal italic">Not Uploaded</span>
                      )}
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

export default ParentScriptViewing;