import { useEffect, useState } from "react";
import { getToken } from "../../../auth/storage";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function RevaluationRequestsPage() {

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {

      const res = await fetch(
        `${API_BASE}/api/teacher/revaluation`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      const data = await res.json();

      if (data.success) {
        setRequests(data.data);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div style={{ padding: 20 }}>

      <h2 style={{ marginBottom: 20 }}>
        Revaluation Requests
      </h2>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8fafc",
              }}
            >
              <th style={th}>Student</th>
              <th style={th}>Subject</th>
              <th style={th}>Current Marks</th>
              <th style={th}>Reason</th>
              <th style={th}>Status</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td style={td}>
                  {r.student?.personalInfo?.firstName}{" "}
                  {r.student?.personalInfo?.lastName}
                </td>

                <td style={td}>
                  {r.subject?.name}
                </td>

                <td style={td}>
                  {r.currentMarks}
                </td>

                <td style={td}>
                  {r.reason}
                </td>

                <td style={td}>
                  {r.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}

const th = {
  padding: 12,
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
};

const td = {
  padding: 12,
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
};