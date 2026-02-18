// client/src/admin/pages/teachers/components/TeacherDetailDrawer.jsx
import React, { useEffect, useState } from "react";
import { useTeacherDetail } from "../hooks/useTeacherDetail.js";
import AssignmentsList from "./AssignmentsList.jsx";
import { updateTeacher } from "../api/teachersApi.js";

// ─── Constants ────────────────────────────────────────────────
const STATUS_MAP = {
  ACTIVE: { dot: "#22c55e", label: "Active", color: "#166534", bg: "#dcfce7" },
  ON_LEAVE: {
    dot: "#f59e0b",
    label: "On Leave",
    color: "#92400e",
    bg: "#fef3c7",
  },
  RESIGNED: {
    dot: "#6b7280",
    label: "Resigned",
    color: "#6b7280",
    bg: "#f3f4f6",
  },
  TERMINATED: {
    dot: "#ef4444",
    label: "Terminated",
    color: "#991b1b",
    bg: "#fee2e2",
  },
};

const DOC_LABELS = {
  ID_PROOF: "ID Proof",
  ADDRESS_PROOF: "Address Proof",
  DEGREE_CERTIFICATE: "Degree Certificate",
  EXPERIENCE_CERTIFICATE: "Experience Certificate",
  CONTRACT_DOCUMENT: "Contract Document",
  PAN_CARD: "PAN Card",
  AADHAR_CARD: "Aadhaar Card",
  PHOTO: "Photo",
  CUSTOM: "Custom",
};

const font = { fontFamily: "'DM Sans', sans-serif" };
const initials = (f, l) => `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();

// ─── Reusable sub-components ──────────────────────────────────

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div
      className="flex items-start justify-between py-2"
      style={{ borderBottom: "1px solid #f1f5f9" }}
    >
      <span
        className="text-xs flex-shrink-0"
        style={{ color: "#6A89A7", ...font }}
      >
        {label}
      </span>
      <span
        className="text-xs font-medium text-right ml-4"
        style={{
          color: "#384959",
          ...font,
          wordBreak: "break-all",
          maxWidth: "58%",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  as = "input",
  options,
}) {
  const base = {
    ...font,
    fontSize: 12,
    color: "#384959",
    background: "#f8fbff",
    border: "1.5px solid #BDDDFC",
    borderRadius: 8,
    padding: "6px 10px",
    width: "100%",
    outline: "none",
    transition: "border-color 0.15s",
  };
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[11px] font-semibold"
        style={{ color: "#6A89A7", ...font }}
      >
        {label}
      </label>
      {as === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={base}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={base}
          onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
          onBlur={(e) => (e.target.style.borderColor = "#BDDDFC")}
        />
      )}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="mb-4"
      style={{ borderBottom: "1px solid #BDDDFC", paddingBottom: 12 }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full mb-2"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "#6A89A7", ...font }}
        >
          {title}
        </p>
        <span style={{ color: "#6A89A7", fontSize: 13 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ─── Status action buttons config ────────────────────────────
// Each status allows specific transitions
const STATUS_ACTIONS = {
  ACTIVE: [
    {
      to: "ON_LEAVE",
      label: "Set On Leave",
      bg: "#fef3c7",
      color: "#92400e",
      border: "#fde68a",
    },
    {
      to: "RESIGNED",
      label: "Mark Resigned",
      bg: "#fee2e2",
      color: "#991b1b",
      border: "#fecaca",
    },
  ],
  ON_LEAVE: [
    {
      to: "ACTIVE",
      label: "Mark Active",
      bg: "#dcfce7",
      color: "#166534",
      border: "#86efac",
    },
    {
      to: "RESIGNED",
      label: "Mark Resigned",
      bg: "#fee2e2",
      color: "#991b1b",
      border: "#fecaca",
    },
  ],
  RESIGNED: [
    {
      to: "ACTIVE",
      label: "Re-Join (Active)",
      bg: "#dcfce7",
      color: "#166534",
      border: "#86efac",
    },
  ],
  TERMINATED: [
    {
      to: "ACTIVE",
      label: "Re-Join (Active)",
      bg: "#dcfce7",
      color: "#166534",
      border: "#86efac",
    },
  ],
};

// ─── Main Component ───────────────────────────────────────────
export default function TeacherDetailDrawer({ teacherId, onClose, onUpdate }) {
  const { teacher, loading, error, invalidate } = useTeacherDetail(teacherId);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState(null);

  // Populate form when teacher loads or edit toggled
  useEffect(() => {
    if (teacher) {
      setForm({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone ?? "",
        gender: teacher.gender ?? "",
        dateOfBirth: teacher.dateOfBirth
          ? teacher.dateOfBirth.split("T")[0]
          : "",
        department: teacher.department,
        designation: teacher.designation,
        qualification: teacher.qualification ?? "",
        experienceYears: teacher.experienceYears ?? "",
        joiningDate: teacher.joiningDate
          ? teacher.joiningDate.split("T")[0]
          : "",
        employmentType: teacher.employmentType,
        address: teacher.address ?? "",
        city: teacher.city ?? "",
        state: teacher.state ?? "",
        zipCode: teacher.zipCode ?? "",
        salary: teacher.salary ?? "",
        bankName: teacher.bankName ?? "",
        bankAccountNo: teacher.bankAccountNo ?? "",
        ifscCode: teacher.ifscCode ?? "",
        panNumber: teacher.panNumber ?? "",
        aadhaarNumber: teacher.aadhaarNumber ?? "",
      });
    }
  }, [teacher]);

  // Escape key
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        if (editMode) setEditMode(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [editMode, onClose]);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await updateTeacher(teacherId, {
        ...form,
        experienceYears: form.experienceYears
          ? Number(form.experienceYears)
          : undefined,
        salary: form.salary ? Number(form.salary) : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      invalidate();
      onUpdate();
      setEditMode(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const msg =
      newStatus === "ACTIVE" &&
      ["RESIGNED", "TERMINATED"].includes(teacher.status)
        ? `Re-join ${teacher.firstName} as Active teacher?`
        : `Change status to "${STATUS_MAP[newStatus]?.label}"?`;
    if (!window.confirm(msg)) return;
    try {
      await updateTeacher(teacherId, { status: newStatus });
      invalidate();
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const st = teacher ? (STATUS_MAP[teacher.status] ?? STATUS_MAP.ACTIVE) : null;
  const actions = teacher ? (STATUS_ACTIONS[teacher.status] ?? []) : [];

  const btnSm = (bg, color, border) => ({
    ...font,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: bg,
    color,
    border: `1.5px solid ${border}`,
    borderRadius: 8,
    padding: "6px 12px",
  });

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(56,73,89,0.25)",
          backdropFilter: "blur(2px)",
        }}
        onClick={() => {
          if (!editMode) onClose();
        }}
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: 460,
          maxWidth: "95vw",
          background: "#fff",
          boxShadow: "-8px 0 40px rgba(56,73,89,0.14)",
          animation: "slideIn 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1.5px solid #BDDDFC" }}
        >
          <h2
            className="font-bold text-base"
            style={{ ...font, color: "#384959" }}
          >
            {editMode ? "Edit Teacher" : "Teacher Profile"}
          </h2>
          <div className="flex items-center gap-2">
            {teacher && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  ...font,
                  background: "#BDDDFC",
                  color: "#384959",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✏ Edit
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setSaveError("");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    ...font,
                    background: "#f3f8fd",
                    color: "#6A89A7",
                    border: "1.5px solid #BDDDFC",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    ...font,
                    background: "#384959",
                    color: "#fff",
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving…" : "✓ Save"}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                ...font,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6A89A7",
                fontSize: 22,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.target.style.color = "#384959")}
              onMouseLeave={(e) => (e.target.style.color = "#6A89A7")}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: "#BDDDFC", borderTopColor: "#384959" }}
              />
            </div>
          )}

          {error && (
            <p
              className="text-sm text-center py-10"
              style={{ color: "#991b1b" }}
            >
              ⚠ {error}
            </p>
          )}

          {saveError && (
            <div
              className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ background: "#fee2e2", color: "#991b1b", ...font }}
            >
              ⚠ {saveError}
            </div>
          )}

          {teacher && form && (
            <>
              {/* ── Profile Hero ── */}
              <div
                className="flex items-center gap-4 mb-5 pb-5"
                style={{ borderBottom: "1.5px solid #BDDDFC" }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
                  }}
                >
                  {teacher.profileImage ? (
                    <img
                      src={teacher.profileImage}
                      alt={teacher.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(teacher.firstName, teacher.lastName)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className="font-bold text-base"
                      style={{ ...font, color: "#384959" }}
                    >
                      {teacher.firstName} {teacher.lastName}
                    </h3>
                    <span
                      title={st.label}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: st.dot,
                        boxShadow: `0 0 0 2px ${st.dot}40`,
                        flexShrink: 0,
                        display: "inline-block",
                      }}
                    />
                  </div>
                  <p className="text-xs" style={{ ...font, color: "#6A89A7" }}>
                    {teacher.designation}
                  </p>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider mt-0.5"
                    style={{ ...font, color: "#88BDF2" }}
                  >
                    {teacher.department}
                  </p>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                    style={{ color: st.color, background: st.bg, ...font }}
                  >
                    {st.label}
                  </span>
                </div>
              </div>

              {/* ── Status Actions ── */}
              {!editMode && actions.length > 0 && (
                <div
                  className="mb-4 pb-4"
                  style={{ borderBottom: "1px solid #BDDDFC" }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: "#6A89A7", ...font }}
                  >
                    Status Actions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {actions.map((a) => (
                      <button
                        key={a.to}
                        onClick={() => handleStatusChange(a.to)}
                        style={btnSm(a.bg, a.color, a.border)}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.opacity = "0.8")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.opacity = "1")
                        }
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Basic Info ── */}
              <Section title="Basic Information">
                {editMode ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <EditField
                        label="First Name"
                        value={form.firstName}
                        onChange={set("firstName")}
                      />
                      <EditField
                        label="Last Name"
                        value={form.lastName}
                        onChange={set("lastName")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EditField
                        label="Phone"
                        value={form.phone}
                        onChange={set("phone")}
                      />
                      <EditField
                        label="Date of Birth"
                        value={form.dateOfBirth}
                        onChange={set("dateOfBirth")}
                        type="date"
                      />
                    </div>
                    <EditField
                      label="Gender"
                      value={form.gender}
                      onChange={set("gender")}
                      as="select"
                      options={[
                        { value: "", label: "Select" },
                        { value: "MALE", label: "Male" },
                        { value: "FEMALE", label: "Female" },
                        { value: "OTHER", label: "Other" },
                      ]}
                    />
                  </div>
                ) : (
                  <>
                    <InfoRow
                      label="Employee Code"
                      value={teacher.employeeCode}
                    />
                    <InfoRow label="Email" value={teacher.user?.email} />
                    <InfoRow label="Phone" value={teacher.phone} />
                    <InfoRow label="Gender" value={teacher.gender} />
                    <InfoRow
                      label="Date of Birth"
                      value={
                        teacher.dateOfBirth
                          ? new Date(teacher.dateOfBirth).toLocaleDateString(
                              "en-IN",
                            )
                          : null
                      }
                    />
                    <InfoRow
                      label="Last Login"
                      value={
                        teacher.user?.lastLoginAt
                          ? new Date(teacher.user.lastLoginAt).toLocaleString(
                              "en-IN",
                            )
                          : "Never"
                      }
                    />
                  </>
                )}
              </Section>

              {/* ── Professional ── */}
              <Section title="Professional Details">
                {editMode ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <EditField
                        label="Department"
                        value={form.department}
                        onChange={set("department")}
                      />
                      <EditField
                        label="Designation"
                        value={form.designation}
                        onChange={set("designation")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EditField
                        label="Qualification"
                        value={form.qualification}
                        onChange={set("qualification")}
                      />
                      <EditField
                        label="Experience (yrs)"
                        value={form.experienceYears}
                        onChange={set("experienceYears")}
                        type="number"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EditField
                        label="Joining Date"
                        value={form.joiningDate}
                        onChange={set("joiningDate")}
                        type="date"
                      />
                      <EditField
                        label="Employment Type"
                        value={form.employmentType}
                        onChange={set("employmentType")}
                        as="select"
                        options={[
                          { value: "FULL_TIME", label: "Full Time" },
                          { value: "PART_TIME", label: "Part Time" },
                          { value: "CONTRACT", label: "Contract" },
                          { value: "TEMPORARY", label: "Temporary" },
                        ]}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Department" value={teacher.department} />
                    <InfoRow label="Designation" value={teacher.designation} />
                    <InfoRow
                      label="Qualification"
                      value={teacher.qualification}
                    />
                    <InfoRow
                      label="Experience"
                      value={
                        teacher.experienceYears != null
                          ? `${teacher.experienceYears} years`
                          : null
                      }
                    />
                    <InfoRow
                      label="Joining Date"
                      value={new Date(teacher.joiningDate).toLocaleDateString(
                        "en-IN",
                      )}
                    />
                    <InfoRow
                      label="Employment Type"
                      value={teacher.employmentType?.replace(/_/g, " ")}
                    />
                    <InfoRow label="Status" value={st.label} />
                  </>
                )}
              </Section>

              {/* ── Address ── */}
              <Section title="Address" defaultOpen={false}>
                {editMode ? (
                  <div className="flex flex-col gap-3">
                    <EditField
                      label="Street Address"
                      value={form.address}
                      onChange={set("address")}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <EditField
                        label="City"
                        value={form.city}
                        onChange={set("city")}
                      />
                      <EditField
                        label="State"
                        value={form.state}
                        onChange={set("state")}
                      />
                      <EditField
                        label="ZIP Code"
                        value={form.zipCode}
                        onChange={set("zipCode")}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Street" value={teacher.address} />
                    <InfoRow label="City" value={teacher.city} />
                    <InfoRow label="State" value={teacher.state} />
                    <InfoRow label="ZIP" value={teacher.zipCode} />
                  </>
                )}
              </Section>

              {/* ── Payroll ── */}
              <Section title="Payroll & Banking" defaultOpen={false}>
                {editMode ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <EditField
                        label="Salary (₹)"
                        value={form.salary}
                        onChange={set("salary")}
                        type="number"
                      />
                      <EditField
                        label="Bank Name"
                        value={form.bankName}
                        onChange={set("bankName")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EditField
                        label="Account No."
                        value={form.bankAccountNo}
                        onChange={set("bankAccountNo")}
                      />
                      <EditField
                        label="IFSC"
                        value={form.ifscCode}
                        onChange={set("ifscCode")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <EditField
                        label="PAN Number"
                        value={form.panNumber}
                        onChange={set("panNumber")}
                      />
                      <EditField
                        label="Aadhaar Number"
                        value={form.aadhaarNumber}
                        onChange={set("aadhaarNumber")}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <InfoRow
                      label="Salary"
                      value={
                        teacher.salary
                          ? `₹ ${Number(teacher.salary).toLocaleString("en-IN")}`
                          : null
                      }
                    />
                    <InfoRow label="Bank Name" value={teacher.bankName} />
                    <InfoRow
                      label="Account No."
                      value={teacher.bankAccountNo}
                    />
                    <InfoRow label="IFSC" value={teacher.ifscCode} />
                    <InfoRow label="PAN Number" value={teacher.panNumber} />
                    <InfoRow
                      label="Aadhaar Number"
                      value={teacher.aadhaarNumber}
                    />
                  </>
                )}
              </Section>

              {/* ── Assignments (view only — managed separately) ── */}
              {!editMode && (
                <Section
                  title={`Assignments (${teacher.assignments?.length ?? 0})`}
                >
                  <AssignmentsList
                    assignments={teacher.assignments}
                    teacherId={teacherId}
                    onUpdate={() => {
                      invalidate();
                      onUpdate();
                    }}
                  />
                </Section>
              )}

              {/* ── Documents (view only) ── */}
              {!editMode && (
                <Section
                  title={`Documents (${teacher.documents?.length ?? 0})`}
                  defaultOpen={false}
                >
                  {!teacher.documents?.length ? (
                    <p
                      className="text-xs py-2"
                      style={{ color: "#6A89A7", ...font }}
                    >
                      No documents uploaded yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {teacher.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                          style={{
                            background: "#f3f8fd",
                            border: "1px solid #BDDDFC",
                          }}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: "#384959", ...font }}
                            >
                              {doc.customLabel ||
                                DOC_LABELS[doc.documentType] ||
                                doc.documentType}
                            </p>
                            <p
                              className="text-[11px]"
                              style={{ color: "#6A89A7", ...font }}
                            >
                              {doc.fileType?.toUpperCase()}{" "}
                              {doc.fileSizeBytes
                                ? `· ${(doc.fileSizeBytes / 1024).toFixed(0)} KB`
                                : ""}
                            </p>
                          </div>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0"
                            style={{
                              color: doc.isVerified ? "#166534" : "#92400e",
                              background: doc.isVerified
                                ? "#dcfce7"
                                : "#fef3c7",
                            }}
                          >
                            {doc.isVerified ? "✓ Verified" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* Edit mode: save reminder */}
              {editMode && (
                <div
                  className="mt-4 px-3 py-2.5 rounded-xl text-xs"
                  style={{
                    background: "#f8fbff",
                    border: "1px solid #BDDDFC",
                    color: "#6A89A7",
                    ...font,
                  }}
                >
                  💡 Assignments & Documents cannot be edited here. Use the
                  respective sections in view mode.
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
