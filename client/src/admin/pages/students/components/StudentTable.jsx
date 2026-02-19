// admin/pages/students/components/StudentTable.jsx
import { Mail, Phone, Eye, Edit, Trash2, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SignedProfileImage from "./SignedProfileImage";

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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: s.dot }}
      />
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "—"}
    </span>
  );
}

function Avatar({ student }) {
  const pi = student.personalInfo;

  const initials =
    `${pi?.firstName?.[0] || ""}${pi?.lastName?.[0] || ""}`.toUpperCase() ||
    "?";

  if (pi?.profileImage)
    return (
      <SignedProfileImage
        studentId={student.id}
        className="w-10 h-10 rounded-xl object-cover"
      />
    );

  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
      style={{ background: "linear-gradient(135deg, #6A89A7, #384959)" }}
    >
      {initials}
    </div>
  );
}

const btnHover = {
  view: { bg: "rgba(136,189,242,0.20)", color: "#384959" },
  edit: { bg: "rgba(136,189,242,0.20)", color: "#384959" },
  delete: { bg: "rgba(255,80,80,0.10)", color: "#c0392b" },
};

export default function StudentTable({ students, loading, onDelete }) {
  const navigate = useNavigate();

  const displayName = (s) =>
    s.personalInfo
      ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`
      : s.name;

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "#88BDF2" }}
        />
        <p className="text-sm font-medium" style={{ color: "#6A89A7" }}>
          Loading students…
        </p>
      </div>
    );

  if (!students.length)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(189,221,252,0.25)" }}
        >
          <Search size={22} style={{ color: "#6A89A7" }} />
        </div>
        <p className="font-semibold text-sm" style={{ color: "#384959" }}>
          No students found
        </p>
        <p className="text-xs" style={{ color: "#6A89A7" }}>
          Try adjusting your search or filters
        </p>
      </div>
    );

  const TH = ({ children, hidden = "" }) => (
    <th
      className={`px-5 py-3.5 text-left ${hidden}`}
      style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#6A89A7",
        borderBottom: "1px solid rgba(136,189,242,0.20)",
        background: "rgba(189,221,252,0.12)",
      }}
    >
      {children}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <TH>Student</TH>
            <TH hidden="hidden md:table-cell">Contact</TH>
            <TH>Class / Section</TH>
            <TH hidden="hidden lg:table-cell">Academic Year</TH>
            <TH>Status</TH>
            <TH>Actions</TH>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => {
            const name = displayName(student);
            // ✅ Class/grade now comes from enrollments[0] (FK-based)
            const enroll = student.enrollments?.[0] || null;
            const section = enroll?.classSection;
            const acYear = enroll?.academicYear;
            // Status: enrollment status if available, else personalInfo status
            const status = enroll?.status || student.personalInfo?.status || "";
            const isEven = idx % 2 === 0;
            const rowBg = isEven ? "white" : "rgba(189,221,252,0.05)";
            const rowHover = "rgba(189,221,252,0.15)";

            return (
              <tr
                key={student.id}
                onClick={() => navigate(`/students/${student.id}`)}
                className="cursor-pointer transition-all duration-100"
                style={{
                  borderBottom: "1px solid rgba(136,189,242,0.12)",
                  background: rowBg,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = rowHover)
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
              >
                {/* Student */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar student={student} />
                    <div>
                      <p
                        className="font-semibold text-sm"
                        style={{ color: "#384959" }}
                      >
                        {name}
                      </p>
                      <p
                        className="text-xs md:hidden"
                        style={{ color: "#6A89A7" }}
                      >
                        {student.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <div className="space-y-1">
                    <div
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: "#6A89A7" }}
                    >
                      <Mail size={11} /> {student.email}
                    </div>
                    {student.personalInfo?.phone && (
                      <div
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: "#6A89A7" }}
                      >
                        <Phone size={11} /> {student.personalInfo.phone}
                      </div>
                    )}
                  </div>
                </td>

                {/* ✅ Class / Section from enrollment FK */}
                <td className="px-5 py-3.5">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      background: "rgba(106,137,167,0.12)",
                      color: "#384959",
                    }}
                  >
                    {section?.name || "—"}
                  </span>
                  {enroll?.rollNumber && (
                    <p
                      className="text-[10px] mt-0.5 ml-0.5"
                      style={{ color: "#6A89A7" }}
                    >
                      Roll: {enroll.rollNumber}
                    </p>
                  )}
                </td>

                {/* ✅ Academic Year from enrollment FK */}
                <td className="px-5 py-3.5 hidden lg:table-cell">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      background: "rgba(136,189,242,0.15)",
                      color: "#384959",
                    }}
                  >
                    {acYear?.name || "—"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <StatusBadge status={status} />
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5">
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      {
                        action: "view",
                        icon: Eye,
                        onClick: () => navigate(`/students/${student.id}`),
                        title: "View",
                      },
                      {
                        action: "edit",
                        icon: Edit,
                        onClick: () => navigate(`/students/${student.id}/edit`),
                        title: "Edit",
                      },
                      {
                        action: "delete",
                        icon: Trash2,
                        onClick: (e) => onDelete(e, student.id, name),
                        title: "Delete",
                      },
                    ].map(({ action, icon: Icon, onClick, title }) => (
                      <button
                        key={action}
                        onClick={onClick}
                        title={title}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: "#6A89A7" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            btnHover[action].bg;
                          e.currentTarget.style.color = btnHover[action].color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#6A89A7";
                        }}
                      >
                        <Icon size={15} />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
