import { useState, useRef } from "react";
import {
  User, Mail, Phone, MapPin, Upload, X, ChevronRight,
  Loader2, AlertCircle, Lock, Heart, Users, BookOpen,
  CheckCircle, FileText, Plus, Trash2, Image as ImageIcon,
  File as FileIcon, Save, ArrowLeft
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const token = () => localStorage.getItem("token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

const GRADES = ["Pre-K","Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const CLASSES = ["Class A","Class B","Class C","Class D"];
const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

const FIXED_DOCS = [
  { id: "AADHAR_CARD",          label: "Aadhar Card / ID Proof", required: true  },
  { id: "BIRTH_CERTIFICATE",    label: "Birth Certificate",       required: true  },
  { id: "MARKSHEET",            label: "Previous Marksheet",      required: true  },
  { id: "TRANSFER_CERTIFICATE", label: "Transfer Certificate",    required: false },
];

const formatBytes = (b) => {
  if (!b) return "";
  if (b < 1024)    return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

// ── Sub-components defined OUTSIDE to prevent focus-loss on re-render ─────────

const Section = ({ icon: Icon, title, color = "blue", children }) => (
  <div className={`rounded-xl border border-gray-100 p-5 bg-${color}-50/30`}>
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-7 h-7 rounded-lg bg-${color}-100 flex items-center justify-center`}>
        <Icon size={14} className={`text-${color}-600`} />
      </div>
      <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <AlertCircle size={11} />{error}
      </p>
    )}
  </div>
);

const Input = ({ icon: Icon, error, className = "", ...props }) => (
  <div className="relative">
    {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
    <input
      {...props}
      className={`w-full text-sm border rounded-lg py-2.5 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all
        ${Icon ? "pl-9" : "pl-3"}
        ${error ? "border-red-400 bg-red-50/50" : "border-gray-200 bg-white"}
        ${className}`}
    />
  </div>
);

const Select = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full text-sm border border-gray-200 bg-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
    {children}
  </select>
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function AddStudent({ onClose, closeModal, onSuccess }) {
  // FIX 1: support both prop names — onClose (this file) and closeModal (StudentsList)
  const handleClose = onClose || closeModal;

  const [step, setStep] = useState(1);
  const [studentId, setStudentId] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoRef = useRef();
  const fixedRefs = useRef({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Step-2 document state
  const [fixedDocFiles, setFixedDocFiles] = useState(
    Object.fromEntries(FIXED_DOCS.map((d) => [d.id, null]))
  );
  const [extraDocs, setExtraDocs] = useState([]);
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docError, setDocError] = useState("");

  const [f, setF] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "",
    email: "", phone: "", zipCode: "", address: "", city: "", state: "",
    fullName: "", loginEmail: "", password: "",
    grade: "", class: "", admissionDate: "", status: "Active",
    parentName: "", parentPhone: "", parentEmail: "", emergencyContact: "",
    bloodGroup: "", medicalConditions: "", allergies: "",
  });

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!f.firstName.trim()) e.firstName = "Required";
    if (!f.lastName.trim())  e.lastName  = "Required";
    if (!f.email.trim())     e.email     = "Required";
    else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = "Invalid email";
    if (!f.phone.trim())     e.phone     = "Required";
    if (!f.password.trim())  e.password  = "Required";
    else if (f.password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return !Object.keys(e).length;
  };

  // ── Step-1 submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      // Register student
      const regRes = await fetch(`${API_URL}/api/students/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      `${f.firstName} ${f.lastName}`.trim(),
          email:     f.email,
          password:  f.password,
          firstName: f.firstName,
          lastName:  f.lastName,
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.message || "Registration failed");

      // FIX 2: backend returns student.id (UUID string), not _id
      const sid = regData.student?.id || regData.student?._id || regData.id || regData._id;
      if (!sid) throw new Error("No student ID returned from server");

      // Save token
      if (regData.token) localStorage.setItem("token", regData.token);
      setStudentId(sid);

      // Save personal info
      const fd = new FormData();
      const fields = {
        firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone,
        dateOfBirth: f.dateOfBirth, gender: f.gender, zipCode: f.zipCode,
        address: f.address, city: f.city, state: f.state,
        grade: f.grade, className: f.class,   // backend field is "className" not "class"
        admissionDate: f.admissionDate, status: f.status,
        parentName: f.parentName, parentPhone: f.parentPhone,
        parentEmail: f.parentEmail, emergencyContact: f.emergencyContact,
        bloodGroup: f.bloodGroup, medicalConditions: f.medicalConditions,
        allergies: f.allergies,
      };
      Object.entries(fields).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (photo) fd.append("profileImage", photo);

      const piRes = await fetch(`${API_URL}/api/students/${sid}/personal-info`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const piData = await piRes.json();
      if (!piRes.ok) throw new Error(piData.message || "Failed to save personal info");

      // FIX 3: only navigate to step 2 after both API calls succeed
      setStep(2);
    } catch (err) {
      setErrors({ _global: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step-2 submit ──────────────────────────────────────────────────────────
  const handleDocSubmit = async () => {
    setDocSubmitting(true);
    setDocError("");
    try {
      const sid = studentId;
      const allFiles = [];

      FIXED_DOCS.forEach((doc) => {
        if (fixedDocFiles[doc.id])
          allFiles.push({ file: fixedDocFiles[doc.id], documentName: doc.id, customLabel: null });
      });
      extraDocs.forEach((doc) => {
        if (doc.file)
          allFiles.push({ file: doc.file, documentName: "CUSTOM", customLabel: doc.label || "Custom Document" });
      });

      if (allFiles.length > 0) {
        const fd = new FormData();
        const metadata = [];
        allFiles.forEach(({ file, documentName, customLabel }) => {
          fd.append("files", file);
          metadata.push({ documentName, customLabel });
        });
        fd.append("metadata", JSON.stringify(metadata));

        const res = await fetch(`${API_URL}/api/students/${sid}/documents/bulk`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Document upload failed");
      }

      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      setDocError(err.message);
    } finally {
      setDocSubmitting(false);
    }
  };

  // ── Doc helpers ────────────────────────────────────────────────────────────
  const setFixed    = (id, file) => setFixedDocFiles((p) => ({ ...p, [id]: file }));
  const removeFixed = (id) => {
    setFixedDocFiles((p) => ({ ...p, [id]: null }));
    if (fixedRefs.current[id]) fixedRefs.current[id].value = "";
  };
  const addExtra     = () => setExtraDocs((p) => [...p, { id: Date.now(), label: "", file: null }]);
  const removeExtra  = (id) => setExtraDocs((p) => p.filter((d) => d.id !== id));
  const setExtraLbl  = (id, v) => setExtraDocs((p) => p.map((d) => d.id === id ? { ...d, label: v } : d));
  const setExtraFile = (id, file) => setExtraDocs((p) => p.map((d) => d.id === id ? { ...d, file } : d));

  const uploadedCount =
    Object.values(fixedDocFiles).filter(Boolean).length +
    extraDocs.filter((d) => d.file).length;

  const previewName = [f.firstName, f.lastName].filter(Boolean).join(" ") || "—";

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Add New Student</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 1 ? "Step 1 of 2 — Personal Information" : "Step 2 of 2 — Document Upload"}
            </p>
          </div>
          {/* FIX 1: cancel button now uses handleClose which supports both prop names */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          {[{ n: 1, label: "Personal Info" }, { n: 2, label: "Documents" }].map(({ n, label }) => (
            <div key={n} className={`flex items-center gap-1.5 text-sm font-medium transition-colors
              ${step === n ? "text-blue-600" : step > n ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${step === n ? "bg-blue-600 text-white" : step > n ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                {step > n ? <CheckCircle size={13} /> : n}
              </div>
              {label}
              {n < 2 && <span className="text-gray-200 ml-2">›</span>}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════
            STEP 1 — PERSONAL INFORMATION
        ══════════════════════════════════════ */}
        {step === 1 && (
          <>
            <div className="flex flex-1">
              {/* Sidebar */}
              <div className="w-64 shrink-0 border-r border-gray-100 p-5 bg-gray-50/30 flex flex-col gap-4">
                {/* Photo */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Profile Photo</p>
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md relative">
                      {photoPreview
                        ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                        : <User size={32} className="text-white/80" />}
                      {photoPreview && (
                        <button onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                          <X size={10} />
                        </button>
                      )}
                    </div>
                    <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
                      }}
                      className="hidden" />
                    <button onClick={() => photoRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 transition-all">
                      <Upload size={12} /> Upload Photo
                    </button>
                    <p className="text-[10px] text-gray-400 text-center">JPG, PNG, WEBP · Max 5 MB</p>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Preview</p>
                  <div className="space-y-2.5">
                    {[
                      { icon: User,     label: "Name",      value: previewName       },
                      { icon: BookOpen, label: "Class",     value: f.class || "—"    },
                      { icon: MapPin,   label: "Admission", value: f.admissionDate || "—" },
                      { icon: Phone,    label: "Phone",     value: f.phone || "—"    },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-2">
                        <Icon size={12} className="text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] text-gray-400 leading-none mb-0.5">{label}</p>
                          <p className="text-xs font-medium text-gray-700 truncate">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main form */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[75vh]">
                {errors._global && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    <AlertCircle size={15} className="shrink-0" /> {errors._global}
                  </div>
                )}

                {/* Personal Information */}
                <Section icon={User} title="Personal Information" color="blue">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name" required error={errors.firstName}>
                      <Input placeholder="First name" value={f.firstName} onChange={set("firstName")} error={errors.firstName} />
                    </Field>
                    <Field label="Last Name" required error={errors.lastName}>
                      <Input placeholder="Last name" value={f.lastName} onChange={set("lastName")} error={errors.lastName} />
                    </Field>
                    <Field label="Date of Birth">
                      <Input type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} />
                    </Field>
                    <Field label="Gender">
                      <Select value={f.gender} onChange={set("gender")}>
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </Field>
                  </div>
                </Section>

                {/* Contact Information */}
                <Section icon={Mail} title="Contact Information" color="purple">
                  <div className="space-y-3">
                    <Field label="Email" required error={errors.email}>
                      <Input icon={Mail} type="email" placeholder="student@school.com" value={f.email} onChange={set("email")} error={errors.email} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Phone" required error={errors.phone}>
                        <Input icon={Phone} type="tel" placeholder="+1 234-567-8900" value={f.phone} onChange={set("phone")} error={errors.phone} />
                      </Field>
                      <Field label="Zip Code">
                        <Input placeholder="Zip code" value={f.zipCode} onChange={set("zipCode")} />
                      </Field>
                    </div>
                    <Field label="Street Address">
                      <Input placeholder="Street address" value={f.address} onChange={set("address")} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="City">
                        <Input placeholder="City" value={f.city} onChange={set("city")} />
                      </Field>
                      <Field label="State">
                        <Input placeholder="State" value={f.state} onChange={set("state")} />
                      </Field>
                    </div>
                  </div>
                </Section>

                {/* Login Credentials */}
                <Section icon={Lock} title="Login Credentials" color="orange">
                  <div className="space-y-3">
                    <Field label="Full Name">
                      <Input icon={User} placeholder="Full name" value={f.fullName} onChange={set("fullName")} />
                    </Field>
                    <Field label="Email">
                      <Input icon={Mail} type="email" placeholder="student@school.com" value={f.loginEmail} onChange={set("loginEmail")} />
                    </Field>
                    <Field label="Password" required error={errors.password}>
                      <Input icon={Lock} type="password" placeholder="Min 6 characters" value={f.password} onChange={set("password")} error={errors.password} />
                    </Field>
                  </div>
                </Section>

                {/* Academic Information */}
                <Section icon={BookOpen} title="Academic Information" color="green">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Grade">
                      <Select value={f.grade} onChange={set("grade")}>
                        <option value="">Select grade</option>
                        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </Select>
                    </Field>
                    <Field label="Class">
                      <Select value={f.class} onChange={set("class")}>
                        <option value="">Select class</option>
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </Field>
                    <Field label="Admission Date">
                      <Input type="date" value={f.admissionDate} onChange={set("admissionDate")} />
                    </Field>
                    <Field label="Status">
                      <Select value={f.status} onChange={set("status")}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Graduated">Graduated</option>
                      </Select>
                    </Field>
                  </div>
                </Section>

                {/* Parent / Guardian */}
                <Section icon={Users} title="Parent / Guardian" color="pink">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Parent Name">
                        <Input icon={User} placeholder="Full name" value={f.parentName} onChange={set("parentName")} />
                      </Field>
                      <Field label="Parent Phone">
                        <Input icon={Phone} placeholder="+1 234-567-8900" value={f.parentPhone} onChange={set("parentPhone")} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Parent Email">
                        <Input icon={Mail} type="email" placeholder="parent@example.com" value={f.parentEmail} onChange={set("parentEmail")} />
                      </Field>
                      <Field label="Emergency Contact">
                        <Input icon={Phone} placeholder="+1 234-567-8900" value={f.emergencyContact} onChange={set("emergencyContact")} />
                      </Field>
                    </div>
                  </div>
                </Section>

                {/* Health Information */}
                <Section icon={Heart} title="Health Information" color="red">
                  <div className="space-y-3">
                    <Field label="Blood Group">
                      <Select value={f.bloodGroup} onChange={set("bloodGroup")}>
                        <option value="">Select blood group</option>
                        {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </Select>
                    </Field>
                    <Field label="Medical Conditions">
                      <textarea value={f.medicalConditions} onChange={set("medicalConditions")}
                        placeholder="e.g. Asthma, Diabetes (comma separated)"
                        rows={2}
                        className="w-full text-sm border border-gray-200 bg-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </Field>
                    <Field label="Allergies">
                      <textarea value={f.allergies} onChange={set("allergies")}
                        placeholder="e.g. Peanuts, Penicillin (comma separated)"
                        rows={2}
                        className="w-full text-sm border border-gray-200 bg-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </Field>
                  </div>
                </Section>
              </div>
            </div>

            {/* Footer step-1 */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                {submitting ? "Saving…" : "Next: Upload Documents"}
                {!submitting && <ChevronRight size={15} />}
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            STEP 2 — DOCUMENTS
        ══════════════════════════════════════ */}
        {step === 2 && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[75vh]">

              {/* Student summary pill */}
              <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                  {photoPreview
                    ? <img src={photoPreview} className="w-full h-full object-cover" alt="" />
                    : `${f.firstName?.[0] || ""}${f.lastName?.[0] || ""}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{f.firstName} {f.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {f.grade || "—"} · {f.class || "—"} · {f.email}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{uploadedCount} file{uploadedCount !== 1 ? "s" : ""} ready</span>
                  <button onClick={() => setStep(1)}
                    className="text-xs text-blue-600 hover:underline font-semibold">Edit Info</button>
                </div>
              </div>

              {/* Required 4 documents */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-indigo-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <FileText size={14} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Required Documents</h3>
                      <p className="text-[11px] text-gray-400">Upload official student documents</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">
                    {Object.values(fixedDocFiles).filter(Boolean).length} / {FIXED_DOCS.length}
                  </span>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FIXED_DOCS.map((doc) => {
                    const file = fixedDocFiles[doc.id];
                    const isImg = file?.type?.startsWith("image/");
                    return (
                      <div key={doc.id}
                        className={`rounded-xl border-2 border-dashed transition-all ${
                          file ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"
                        }`}>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          ref={(el) => (fixedRefs.current[doc.id] = el)}
                          onChange={(e) => setFixed(doc.id, e.target.files[0])}
                          className="hidden"
                          id={`fd-${doc.id}`}
                        />
                        {file ? (
                          <div className="flex items-center gap-3 p-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-sm">
                              {isImg
                                ? <ImageIcon size={18} className="text-blue-500" />
                                : <FileIcon  size={18} className="text-orange-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-700">{doc.label}</p>
                              <p className="text-[11px] text-gray-400 truncate mt-0.5">{file.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                                  <CheckCircle size={11} /> Uploaded
                                </span>
                                <span className="text-[10px] text-gray-400">{formatBytes(file.size)}</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => removeFixed(doc.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 transition">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <label htmlFor={`fd-${doc.id}`} className="block p-5 cursor-pointer">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                <Upload size={18} className="text-gray-400" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-gray-700">
                                  {doc.label}
                                  {doc.required && <span className="text-red-500 ml-1">*</span>}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">PDF, JPG, PNG, DOC · Max 5 MB</p>
                              </div>
                            </div>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional / custom documents */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-amber-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Plus size={14} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Additional Documents</h3>
                      <p className="text-[11px] text-gray-400">Optional — medical cert, passport, caste cert, etc.</p>
                    </div>
                  </div>
                  <button type="button" onClick={addExtra}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition shadow-sm">
                    <Plus size={12} /> Add
                  </button>
                </div>

                <div className="p-5">
                  {extraDocs.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <FileText size={22} className="text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">No additional documents</p>
                      <p className="text-xs text-gray-300 mt-1">Click "Add" to upload any extra file</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {extraDocs.map((doc, idx) => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={doc.label}
                            onChange={(e) => setExtraLbl(doc.id, e.target.value)}
                            placeholder="Document name (e.g. Medical Certificate)"
                            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-0"
                          />
                          <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition shrink-0 ${
                            doc.file
                              ? "bg-green-50 border border-green-200 text-green-700"
                              : "bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                          }`}>
                            {doc.file
                              ? <><CheckCircle size={13} />{doc.file.name.length > 14 ? doc.file.name.slice(0, 14) + "…" : doc.file.name}</>
                              : <><Upload size={13} />Upload</>
                            }
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => setExtraFile(doc.id, e.target.files[0])} className="hidden" />
                          </label>
                          <button type="button" onClick={() => removeExtra(doc.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Doc error */}
              {docError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertCircle size={15} className="shrink-0" /> {docError}
                </div>
              )}
            </div>

            {/* Footer step-2 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-600">
                <ArrowLeft size={15} /> Back
              </button>
              <button onClick={handleDocSubmit} disabled={docSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
                {docSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {docSubmitting ? "Saving…" : "Save Student Record"}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}