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
  Download,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  File as FileIcon,
} from "lucide-react";
import { getToken } from "../../../auth/storage";
import PageLayout from "../../components/PageLayout";
const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});
const statusColor = (s = "") => {
  switch (s.toUpperCase()) {
    case "ACTIVE":
      return "bg-green-100 text-green-700 border-green-200";
    case "INACTIVE":
      return "bg-red-100 text-red-700 border-red-200";
    case "SUSPENDED":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "GRADUATED":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const InfoRow = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">
          {value}
        </p>
      </div>
    </div>
  ) : null;

const Card = ({ title, icon: Icon, color = "blue", children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div
      className={`flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-${color}-50/40`}
    >
      <div
        className={`w-8 h-8 rounded-xl bg-${color}-100 flex items-center justify-center`}
      >
        <Icon size={15} className={`text-${color}-600`} />
      </div>
      <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

export default function StudentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetch_ = async () => {
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
    };
    fetch_();
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
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm">Loading student…</p>
          </div>
        </div>
      </PageLayout>
    );

  if (error || !student)
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="font-semibold text-gray-700">
              {error || "Student not found"}
            </p>
            <button
              onClick={() => navigate("/students")}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to list
            </button>
          </div>
        </div>
      </PageLayout>
    );

  const pi = student.personalInfo;
  const docs = student.documents || [];
  const fullName = pi ? `${pi.firstName} ${pi.lastName}` : student.name;

  return (
    <PageLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/students")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition font-medium"
          >
            <ArrowLeft size={16} /> Back to Students
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/students/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold shadow-sm"
            >
              <Edit size={14} /> Edit Student
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition text-sm font-semibold"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {/* Hero profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
              {pi?.profileImage ? (
                <img
                  src={pi.profileImage}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                `${pi?.firstName?.[0] || ""}${pi?.lastName?.[0] || ""}`.toUpperCase() || (
                  <User size={32} />
                )
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                {pi?.status && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor(pi.status)}`}
                  >
                    {pi.status.charAt(0) + pi.status.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{student.email}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                {pi?.grade && (
                  <span className="flex items-center gap-1">
                    <BookOpen size={13} />
                    {pi.grade}
                  </span>
                )}
                {pi?.className && (
                  <span className="flex items-center gap-1">
                    <Shield size={13} />
                    {pi.className}
                  </span>
                )}
                {pi?.admissionDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    Admitted{" "}
                    {new Date(pi.admissionDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Student ID
              </p>
              <p className="font-mono text-xs text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg">
                {student.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-[10px] text-gray-400 mt-2">
                Registered{" "}
                {new Date(student.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="space-y-5">
            <Card title="Personal Information" icon={User} color="blue">
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
                icon={Heart}
                label="Blood Group"
                value={pi?.bloodGroup
                  ?.replace("_PLUS", "+")
                  .replace("_MINUS", "-")}
              />
            </Card>

            <Card title="Health Information" icon={Heart} color="pink">
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

          {/* Middle column */}
          <div className="space-y-5">
            <Card title="Contact Information" icon={Mail} color="purple">
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Phone" value={pi?.phone} />
              <InfoRow icon={MapPin} label="Address" value={pi?.address} />
              <InfoRow icon={MapPin} label="City" value={pi?.city} />
              <InfoRow icon={MapPin} label="State" value={pi?.state} />
              <InfoRow icon={MapPin} label="Zip" value={pi?.zipCode} />
            </Card>

            <Card title="Academic Information" icon={BookOpen} color="green">
              <InfoRow icon={BookOpen} label="Grade" value={pi?.grade} />
              <InfoRow icon={Shield} label="Class" value={pi?.className} />
              <InfoRow
                icon={Calendar}
                label="Admission Date"
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

          {/* Right column */}
          <div className="space-y-5">
            <Card title="Parent / Guardian" icon={Users} color="orange">
              <InfoRow icon={User} label="Name" value={pi?.parentName} />
              <InfoRow icon={Phone} label="Phone" value={pi?.parentPhone} />
              <InfoRow icon={Mail} label="Email" value={pi?.parentEmail} />
              <InfoRow
                icon={Phone}
                label="Emergency Contact"
                value={pi?.emergencyContact}
              />
            </Card>

            {/* Documents */}
            <Card
              title={`Documents (${docs.length})`}
              icon={FileText}
              color="indigo"
            >
              {docs.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <FileText size={28} className="text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No documents uploaded</p>
                  <button
                    onClick={() => navigate(`/students/${id}/edit`)}
                    className="mt-3 text-xs text-blue-600 hover:underline font-medium"
                  >
                    Upload now
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map((doc) => {
                    const isImg = doc.mimeType?.startsWith("image/");
                    const label =
                      doc.documentName === "CUSTOM"
                        ? doc.customLabel || "Custom"
                        : doc.documentName
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                          {isImg ? (
                            <ImageIcon size={14} className="text-blue-500" />
                          ) : (
                            <FileIcon size={14} className="text-orange-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            {label}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {doc.fileName}
                          </p>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition"
                        >
                          <Download size={12} />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
