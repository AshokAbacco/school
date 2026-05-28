import { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const ReEvaluationRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // Added for refresh spinner state

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/api/re-evaluation/requests`, {
        headers: authHeaders(),
      });
      setRequests(response.data?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updatePayment = async (id, value) => {
    try {
      await axios.patch(
        `${API_URL}/api/re-evaluation/requests/${id}/payment`,
        { isPaid: value },
        { headers: authHeaders() }
      );
      fetchRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const uploadAnswerSheet = async (id, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);

      setLoading(true);

      await axios.post(
        `${API_URL}/api/re-evaluation/requests/${id}/upload-answer-sheet`,
        formData,
        {
          headers: {
            ...authHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Answer sheet uploaded successfully");
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to upload file");
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
    }
  };

  return (
    <div className="min-h-screen bg-[#edf3f9] text-[#1e293b] p-8 space-y-8 font-sans antialiased">
      
      {/* SCREEN ROUTE TITLES */}
      <div className="pb-2 border-b border-[#cfdbe6] flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
            Re-Evaluation Requests
          </h1>
          <p className="text-sm text-[#64748b] mt-1">
            Review incoming submissions, approve processing payments, and dispatch graded digital answer sheets
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            Syncing Document Changes...
          </div>
        )}
      </div>

      {/* COMPREHENSIVE INCOMING ACTIONS LOGGER */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.01)] overflow-hidden">
        <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0f172a]">Incoming Submission Streams</h2>
          
          {/* Actionable Refresh Button */}
          <button
            onClick={fetchRequests}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            title="Refresh stream list"
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
                <th className="p-4">Student Profile</th>
                <th className="p-4">Subject Block</th>
                <th className="p-4">Current Marks</th>
                <th className="p-4">Processing Fee</th>
                <th className="p-4">Payment Toggle</th>
                <th className="p-4">Request Status</th>
                <th className="p-4 text-center">Script Upload</th>
                <th className="p-4 text-right">Data View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] text-sm font-medium text-[#334155]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-[#94a3b8] font-normal">
                    No individual student re-evaluation queues matching criteria discovered.
                  </td>
                </tr>
              ) : (
                requests.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8fafc]/40 transition-colors">
                    
                    {/* STUDENT NAME */}
                    <td className="p-4 text-[#0f172a] font-semibold">
                      {item.student?.firstName} {item.student?.lastName}
                    </td>

                    {/* SUBJECT */}
                    <td className="p-4 text-[#475569]">
                      {item.subject?.name}
                    </td>

                    {/* MARKS */}
                    <td className="p-4 text-[#475569]">
                      {item.marks?.obtainedMarks ?? "-"}
                    </td>

                    {/* AMOUNT */}
                    <td className="p-4 font-bold text-[#0f172a]">
                      ₹ {item.requestedAmount}
                    </td>

                    {/* PAYMENT BUTTON STATUS */}
                    <td className="p-4">
                      <button
                        onClick={() => updatePayment(item.id, !item.isPaid)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border shadow-sm ${
                          item.isPaid
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-[#fef2f2] text-[#e11d48] border-[#fecaca] hover:bg-[#fee2e2]"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isPaid ? "bg-green-500" : "bg-[#e11d48]"}`} />
                        {item.isPaid ? "Paid" : "Pending"}
                      </button>
                    </td>

                    {/* STATUS TEXT TAG */}
                    <td className="p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#64748b] bg-[#f1f5f9] px-2.5 py-1 rounded-md">
                        {item.status}
                      </span>
                    </td>

                    {/* CLEAN ACTION SCRIPT UPLOAD */}
                    <td className="p-4 text-center">
                      <label className="inline-flex items-center justify-center bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/20">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-[#64748b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {item.answerSheetFileKey ? "Re-upload" : "Upload File"}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => uploadAnswerSheet(item.id, e.target.files[0])}
                          className="sr-only"
                          disabled={loading}
                        />
                      </label>
                    </td>

                    {/* DIGITAL ANSWER SHEET BUTTON */}
                    <td className="p-4 text-right">
                      {item.answerSheetFileKey ? (
                        <button
                          onClick={() => openAnswerSheet(item.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-600/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          View Sheet
                        </button>
                      ) : (
                        <span className="text-xs text-[#94a3b8] font-normal italic">None Uploaded</span>
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

export default ReEvaluationRequests;