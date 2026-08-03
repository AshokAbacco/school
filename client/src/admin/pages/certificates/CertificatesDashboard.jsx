// client/src/admin/pages/certificates/CertificatesDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileBadge2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getToken } from "../../../auth/storage";
import CertificateCard from "./components/CertificateCard";
import { C, API_URL } from "./components/theme";

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export default function CertificatesDashboard() {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/certificates/types`, { headers: authHeaders() });
        if (!res.ok) throw new Error("Failed to load certificate types");
        const data = await res.json();
        setTypes(data.types || []);
      } catch (err) {
        console.error(err);
        toast.error("Could not load certificate types");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-4 md:p-6" style={{ background: C.bg, minHeight: "100%" }}>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 44, height: 44, background: `${C.deep}`, color: "#fff" }}
        >
          <FileBadge2 size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: C.deep }}>Certificates</h1>
          <p className="text-xs" style={{ color: C.textLight }}>
            Generate and manage official student certificates
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/certificates/history")}
          className="ml-auto text-xs font-bold px-4 py-2 rounded-lg border"
          style={{ borderColor: C.border, color: C.deep, background: C.white }}
        >
          View All History
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={26} className="animate-spin" style={{ color: C.slate }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {types.map((type) => (
            <CertificateCard
              key={type.key}
              type={type}
              onGenerate={(key) => navigate(`/admin/certificates/generate?type=${key}`)}
              onHistory={(key) => navigate(`/admin/certificates/history?type=${key}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
