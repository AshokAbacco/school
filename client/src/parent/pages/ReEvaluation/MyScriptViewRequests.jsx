import { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const MyScriptViewRequests = () => {
  const [requests, setRequests] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false); // State for refresh loading

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsRefreshing(true); // Start loading state
      const response = await axios.get(
        `${API_URL}/api/parent/re-evaluation/my-requests`,
        {
          headers: authHeaders(),
        }
      );

      setRequests(response.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefreshing(false); // End loading state
    }
  };

  const openAnswerSheet = async (id) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/re-evaluation/requests/${id}/answer-sheet`,
        {
          headers: authHeaders(),
        }
      );

      window.open(response.data.url, "_blank");
    } catch (error) {
      console.error(error);
      alert("Answer script not uploaded yet");
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-md p-6">
        {/* Header container with flex layout to place button on the right */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            My Answer Sheet Requests
          </h1>
          
          {/* Refresh Button */}
          <button
            onClick={fetchRequests}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
          >
            <svg
              className={`w-4 h-4 text-gray-500 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">Subject</th>
                <th className="border p-3 text-left">Viewing Fee</th>
                <th className="border p-3 text-left">Payment</th>
                <th className="border p-3 text-left">Status</th>
                <th className="border p-3 text-center">Answer Script</th>
              </tr>
            </thead>

            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="border p-8 text-center text-gray-400 font-normal">
                    No active answer sheet view requests found.
                  </td>
                </tr>
              ) : (
                requests.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="border p-3 font-medium">
                      {item.subject?.name}
                    </td>

                    <td className="border p-3 font-semibold text-gray-700">
                      ₹ {item.requestedAmount}
                    </td>

                    <td className="border p-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.isPaid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {item.isPaid ? "Paid" : "Pending"}
                      </span>
                    </td>

                    <td className="border p-3 text-sm text-gray-600">
                      {item.status}
                    </td>

                    <td className="border p-3 text-center">
                      {item.answerSheetFileKey ? (
                        <button
                          onClick={() => openAnswerSheet(item.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not Uploaded</span>
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

export default MyScriptViewRequests;