// admin/pages/students/StudentView.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Heart,
  Users,
  FileText,
  Calendar,
  Shield,
  Loader2,
  AlertCircle,
  Activity,
  GraduationCap,
} from "lucide-react";
import { getToken } from "../../../auth/storage";
import PageLayout from "../../components/PageLayout";
import SignedProfileImage from "./components/SignedProfileImage";
import DocumentViewer from "./components/DocumentViewer";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS = {
  ACTIVE: { bg: "rgba(136,189,242,0.18)", color: "#384959", dot: "#88BDF2" },
  INACTIVE: { bg: "rgba(56,73,89,0.12)", color: "#384959", dot: "#384959" },
  SUSPENDED: { bg: "rgba(255,160,60,0.15)", color: "#7a4000", dot: "#f59e0b" },
  GRADUATED: { bg: "rgba(106,137,167,0.18)", color: "#384959", dot: "#6A89A7" },
};
function StatusBadge({ status = "" }) {
  const s = STATUS[status.toUpperCase()] || STATUS.INACTIVE;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: s.dot }}
      />
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "—"}
    </span>
  );
}

// ── InfoRow ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div
      className="flex items-start gap-3 py-2.5"
      style={{ borderBottom: "1px solid rgba(136,189,242,0.12)" }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "rgba(189,221,252,0.25)" }}
      >
        <Icon size={13} style={{ color: "#6A89A7" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "#88BDF2" }}
        >
          {label}
        </p>
        <p
          className="text-sm font-semibold mt-0.5 break-words"
          style={{ color: "#384959" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, children, accent = "#BDDDFC" }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      style={{ border: "1px solid rgba(136,189,242,0.22)" }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{
          borderBottom: "1px solid rgba(136,189,242,0.18)",
          background: "rgba(189,221,252,0.08)",
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}30` }}
        >
          <Icon size={15} style={{ color: "#6A89A7" }} />
        </div>
        <h3 className="font-bold text-sm" style={{ color: "#384959" }}>
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── StudentView ─────────────────────────────────────────────────────────────
export default function StudentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/students/${id}`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load student");
        setStudent(data.student);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    const name = pi ? `${pi.firstName} ${pi.lastName}` : student?.name;
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`${API_URL}/api/students/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      navigate("/students");
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (loading)
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <Loader2
              size={36}
              className="animate-spin"
              style={{ color: "#88BDF2" }}
            />
            <p className="text-sm font-medium" style={{ color: "#6A89A7" }}>
              Loading student…
            </p>
          </div>
        </div>
      </PageLayout>
    );

  if (error || !student)
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(231,76,60,0.10)" }}
            >
              <AlertCircle size={28} style={{ color: "#e74c3c" }} />
            </div>
            <p className="font-bold" style={{ color: "#384959" }}>
              {error || "Student not found"}
            </p>
            <button
              onClick={() => navigate("/students")}
              className="text-sm font-semibold"
              style={{ color: "#6A89A7" }}
            >
              ← Back to Students
            </button>
          </div>
        </div>
      </PageLayout>
    );

  const pi = student.personalInfo;
  const docs = student.documents || [];
  const fullName = pi ? `${pi.firstName} ${pi.lastName}` : student.name;
  const initials =
    `${pi?.firstName?.[0] || ""}${pi?.lastName?.[0] || ""}`.toUpperCase() ||
    "?";

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: "#F4F8FC", minHeight: "100%" }}
      >
        {/* Top nav */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/students")}
            className="flex items-center gap-2 text-sm font-semibold transition-all"
            style={{ color: "#6A89A7" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#384959")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6A89A7")}
          >
            <ArrowLeft size={16} /> Back to Students
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/students/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all"
              style={{ background: "#384959" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#6A89A7")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#384959")
              }
            >
              <Edit size={13} /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                border: "1px solid rgba(231,76,60,0.30)",
                color: "#c0392b",
                background: "white",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(231,76,60,0.06)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>

        {/* Hero card */}
        <div
          className="bg-white rounded-2xl shadow-sm p-6 mb-5"
          style={{ border: "1px solid rgba(136,189,242,0.22)" }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #6A89A7, #384959)",
            }}
          >
            {pi?.profileImage ? (
              <SignedProfileImage
                studentId={id}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT */}
          <div className="space-y-5">
            <Card title="Personal Information" icon={User}>
              <InfoRow
                icon={Calendar}
                label="Date of Birth"
                value={
                  pi?.dateOfBirth
                    ? new Date(pi.dateOfBirth).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                    : null
                }
              />
              <InfoRow
                icon={User}
                label="Gender"
                value={
                  pi?.gender
                    ? pi.gender.charAt(0) + pi.gender.slice(1).toLowerCase()
                    : null
                }
              />
              <InfoRow
                icon={Activity}
                label="Blood Group"
                value={pi?.bloodGroup
                  ?.replace("_POS", "+")
                  .replace("_NEG", "-")}
              />
            </Card>

            <Card title="Health Information" icon={Heart}>
              <InfoRow
                icon={AlertCircle}
                label="Medical Conditions"
                value={pi?.medicalConditions || "None recorded"}
              />
              <InfoRow
                icon={AlertCircle}
                label="Allergies"
                value={pi?.allergies || "None recorded"}
              />
            </Card>
          </div>

          {/* MIDDLE */}
          <div className="space-y-5">
            <Card title="Contact Information" icon={Mail}>
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Phone" value={pi?.phone} />
              <InfoRow icon={MapPin} label="Address" value={pi?.address} />
              <InfoRow icon={MapPin} label="City" value={pi?.city} />
              <InfoRow icon={MapPin} label="State" value={pi?.state} />
              <InfoRow icon={MapPin} label="Zip" value={pi?.zipCode} />
            </Card>

            <Card title="Academic Information" icon={BookOpen}>
              <InfoRow icon={GraduationCap} label="Grade" value={pi?.grade} />
              <InfoRow icon={Shield} label="Class" value={pi?.className} />
              <InfoRow
                icon={Calendar}
                label="Admission"
                value={
                  pi?.admissionDate
                    ? new Date(pi.admissionDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    : null
                }
              />
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-5">
            <Card title="Parent / Guardian" icon={Users}>
              <InfoRow icon={User} label="Parent Name" value={pi?.parentName} />
              <InfoRow
                icon={Phone}
                label="Parent Phone"
                value={pi?.parentPhone}
              />
              <InfoRow
                icon={Mail}
                label="Parent Email"
                value={pi?.parentEmail}
              />
              <InfoRow
                icon={Phone}
                label="Emergency Contact"
                value={pi?.emergencyContact}
              />
            </Card>

            {/* Documents — uses DocumentViewer */}
            <Card title={`Documents (${docs.length})`} icon={FileText}>
              <DocumentViewer documents={docs} studentId={id} />
              {docs.length > 0 && (
                <p
                  className="text-[10px] mt-3 text-center"
                  style={{ color: "#88BDF2" }}
                >
                  🔒 Secure access · Links expire based on your role
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
