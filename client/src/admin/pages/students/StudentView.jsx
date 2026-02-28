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
import DocumentViewer from "./components/DocumentViewer";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

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

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: "1px solid rgba(136,189,242,0.10)" }}
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

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(136,189,242,0.20)" }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{
          borderBottom: "1px solid rgba(136,189,242,0.14)",
          background: "rgba(189,221,252,0.08)",
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(136,189,242,0.18)" }}
        >
          <Icon size={13} style={{ color: "#6A89A7" }} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: "#384959" }}>
          {title}
        </h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Tab config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "academic", label: "Academic", icon: GraduationCap },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "parents", label: "Parents", icon: Users },
  { id: "health", label: "Health", icon: Heart },
  { id: "documents", label: "Documents", icon: FileText },
];

export default function StudentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("personal");

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
  const enrollment = student.enrollments?.[0] || null;
  const section = enrollment?.classSection;
  const acYear = enrollment?.academicYear;
  const rollNumber = enrollment?.rollNumber;
  const fullName = pi ? `${pi.firstName} ${pi.lastName}` : student.name;
  const initials =
    `${pi?.firstName?.[0] || ""}${pi?.lastName?.[0] || ""}`.toUpperCase() ||
    "?";

  // ── Tab panel renderer ─────────────────────────────────────────────────────
  function TabPanel() {
    switch (activeTab) {
      case "personal":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard title="Personal Information" icon={User}>
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
              <InfoRow
                icon={Shield}
                label="Admission Number"
                value={student.admissionNumber}
              />
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
            </SectionCard>

            <SectionCard title="Health Information" icon={Heart}>
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
            </SectionCard>
          </div>
        );

      case "academic":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard title="Academic Information" icon={GraduationCap}>
              <InfoRow
                icon={GraduationCap}
                label="Class / Section"
                value={section?.name}
              />
              <InfoRow icon={BookOpen} label="Grade" value={section?.grade} />
              <InfoRow icon={Shield} label="Roll Number" value={rollNumber} />
              <InfoRow
                icon={Calendar}
                label="Academic Year"
                value={acYear?.name}
              />
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
              <InfoRow
                icon={Activity}
                label="Enrollment Status"
                value={
                  enrollment?.status
                    ? enrollment.status.charAt(0) +
                      enrollment.status.slice(1).toLowerCase()
                    : null
                }
              />
            </SectionCard>

            <SectionCard title="Identifiers" icon={Shield}>
              <InfoRow
                icon={Shield}
                label="Student ID"
                value={student.id.slice(0, 8).toUpperCase()}
              />
              <InfoRow
                icon={Shield}
                label="Admission Number"
                value={student.admissionNumber}
              />
              <InfoRow
                icon={Shield}
                label="External / Board Roll No"
                value={enrollment?.externalId}
              />
              <InfoRow
                icon={Calendar}
                label="Joined On"
                value={new Date(student.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              />
            </SectionCard>
          </div>
        );

      case "contact":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard title="Contact Information" icon={Mail}>
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Phone" value={pi?.phone} />
            </SectionCard>

            <SectionCard title="Address" icon={MapPin}>
              <InfoRow icon={MapPin} label="Address" value={pi?.address} />
              <InfoRow icon={MapPin} label="City" value={pi?.city} />
              <InfoRow icon={MapPin} label="State" value={pi?.state} />
              <InfoRow icon={MapPin} label="Zip Code" value={pi?.zipCode} />
            </SectionCard>
          </div>
        );

      case "parents":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard title="Parent / Guardian" icon={Users}>
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
            </SectionCard>
          </div>
        );

      case "health":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard title="Health Information" icon={Heart}>
              <InfoRow
                icon={Activity}
                label="Blood Group"
                value={pi?.bloodGroup
                  ?.replace("_POS", "+")
                  .replace("_NEG", "-")}
              />
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
            </SectionCard>
          </div>
        );

      case "documents":
        return (
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(136,189,242,0.20)" }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3.5"
              style={{
                borderBottom: "1px solid rgba(136,189,242,0.14)",
                background: "rgba(189,221,252,0.08)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(136,189,242,0.18)" }}
              >
                <FileText size={13} style={{ color: "#6A89A7" }} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: "#384959" }}>
                Documents ({docs.length})
              </h3>
            </div>
            <div className="p-5">
              <DocumentViewer documents={docs} studentId={id} />
              {docs.length > 0 && (
                <p
                  className="text-[10px] mt-3 text-center"
                  style={{ color: "#88BDF2" }}
                >
                  🔒 Secure access · Links expire based on your role
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: "#F4F8FC", minHeight: "100%" }}
      >
        {/* ── Top nav ── */}
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

        {/* ── Hero card (unchanged) ── */}
        <div
          className="bg-white rounded-2xl shadow-sm p-6 mb-5"
          style={{ border: "1px solid rgba(136,189,242,0.22)" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #6A89A7, #384959)",
              }}
            >
              {pi?.profileImage ? (
                <img
                  src={pi.profileImage}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold" style={{ color: "#384959" }}>
                  {fullName}
                </h1>
                {(enrollment?.status || pi?.status) && (
                  <StatusBadge status={enrollment?.status || pi?.status} />
                )}
              </div>
              <p className="text-sm" style={{ color: "#6A89A7" }}>
                {student.email}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {section && (
                  <span
                    className="flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      background: "rgba(189,221,252,0.30)",
                      color: "#384959",
                    }}
                  >
                    <GraduationCap size={13} style={{ color: "#6A89A7" }} />
                    {section.name}
                  </span>
                )}
                {acYear && (
                  <span
                    className="flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      background: "rgba(136,189,242,0.15)",
                      color: "#384959",
                    }}
                  >
                    <BookOpen size={13} style={{ color: "#6A89A7" }} />
                    {acYear.name}
                  </span>
                )}
                {rollNumber && (
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "#6A89A7" }}
                  >
                    <Shield size={12} /> Roll: {rollNumber}
                  </span>
                )}
                {pi?.admissionDate && (
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "#6A89A7" }}
                  >
                    <Calendar size={12} />
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

            {/* ID chip */}
            <div className="shrink-0 text-right">
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "#88BDF2" }}
              >
                Student ID
              </p>
              <p
                className="font-mono text-xs px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(189,221,252,0.25)",
                  color: "#384959",
                  border: "1px solid rgba(136,189,242,0.30)",
                }}
              >
                {student.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-[10px] mt-2" style={{ color: "#6A89A7" }}>
                Joined{" "}
                {new Date(student.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: "1px solid rgba(136,189,242,0.22)" }}
        >
          {/* Tab bar */}
          <div
            className="flex items-center gap-0 overflow-x-auto"
            style={{ borderBottom: "1px solid rgba(136,189,242,0.18)" }}
          >
            {TABS.map(({ id: tid, label, icon: Icon }) => {
              const isActive = activeTab === tid;
              const badgeCount = tid === "documents" ? docs.length : null;
              return (
                <button
                  key={tid}
                  onClick={() => setActiveTab(tid)}
                  className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all relative shrink-0"
                  style={{
                    color: isActive ? "#384959" : "#6A89A7",
                    background: isActive
                      ? "rgba(189,221,252,0.12)"
                      : "transparent",
                    borderBottom: isActive
                      ? "2px solid #384959"
                      : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background =
                        "rgba(189,221,252,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon size={14} />
                  {label}
                  {badgeCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(136,189,242,0.25)",
                        color: "#384959",
                      }}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-5">
            <TabPanel />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
