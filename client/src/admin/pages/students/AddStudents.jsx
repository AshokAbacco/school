import React, { useState, useRef } from "react";
import axios from "axios";
import {
  User, Mail, Phone, Calendar, BookOpen,
  Upload, X, Save, ArrowLeft, FileText, CheckCircle,
  AlertCircle, Plus, Trash2, ChevronRight, Heart,
  Shield, Image as ImageIcon, File as FileIcon,
  Loader2, ChevronDown,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

// ─── Constants matching backend enums ─────────────────────────────────────────
const GRADES      = ["8th", "9th", "10th", "11th", "12th"];
const CLASSES     = ["A", "B", "C", "D"];
const GENDERS     = [
  { label: "Male",   value: "MALE"   },
  { label: "Female", value: "FEMALE" },
  { label: "Other",  value: "OTHER"  },
];
const BLOOD_GROUPS = [
  { label: "A+",  value: "A_POS"  }, { label: "A−",  value: "A_NEG"  },
  { label: "B+",  value: "B_POS"  }, { label: "B−",  value: "B_NEG"  },
  { label: "O+",  value: "O_POS"  }, { label: "O−",  value: "O_NEG"  },
  { label: "AB+", value: "AB_POS" }, { label: "AB−", value: "AB_NEG" },
];
const STATUSES = [
  { label: "Active",    value: "ACTIVE"    },
  { label: "Inactive",  value: "INACTIVE"  },
  { label: "Graduated", value: "GRADUATED" },
  { label: "Suspended", value: "SUSPENDED" },
];

// Fixed 4 docs — values match DocumentType enum exactly
const FIXED_DOCS = [
  { id: "AADHAR_CARD",          label: "Aadhar Card / ID Proof", required: true  },
  { id: "BIRTH_CERTIFICATE",    label: "Birth Certificate",       required: true  },
  { id: "MARKSHEET",            label: "Previous Marksheet",      required: true  },
  { id: "TRANSFER_CERTIFICATE", label: "Transfer Certificate",    required: false },
];

// const API = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:5000/api";

const formatBytes = (b) => {
  if (!b) return "";
  if (b < 1024)        return `${b} B`;
  if (b < 1048576)     return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

// ══════════════════════════════════════════════════════════════════════════════
export default function AddStudents({ closeModal, studentId }) {
  // studentId — pass if Student auth row already exists (admin flow).
  // If omitted, step-1 save will also call POST /register first.

  const [activeTab,        setActiveTab]        = useState("personal");
  const [personalDone,     setPersonalDone]     = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [apiError,         setApiError]         = useState("");
  const [fieldErrors,      setFieldErrors]      = useState({});
  const [createdStudentId, setCreatedStudentId] = useState(studentId || null);

  // ── Step-1 state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // auth (used only when !studentId)
    name: "", email: "", password: "",
    // personal
    firstName: "", lastName: "", dateOfBirth: "", gender: "",
    profileImage: null,   // { file, preview }
    // contact
    phone: "", address: "", city: "", state: "", zipCode: "",
    // academic
    grade: "", className: "", admissionDate: "", status: "ACTIVE",
    // parent
    parentName: "", parentEmail: "", parentPhone: "", emergencyContact: "",
    // health
    bloodGroup: "", medicalConditions: "", allergies: "",
  });

  // ── Step-2 state ───────────────────────────────────────────────────────────
  const [fixedDocFiles, setFixedDocFiles] = useState(
    Object.fromEntries(FIXED_DOCS.map((d) => [d.id, null]))
  );
  const [extraDocs, setExtraDocs] = useState([]);

  const profileInputRef = useRef();
  const fixedRefs       = useRef({});

  // ── Field helpers ──────────────────────────────────────────────────────────
  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setFieldErrors((p) => ({ ...p, [field]: "" }));
    setApiError("");
  };

  const setProfileImg = (file) => {
    if (!file) { setForm((p) => ({ ...p, profileImage: null })); return; }
    const reader = new FileReader();
    reader.onloadend = () =>
      setForm((p) => ({ ...p, profileImage: { file, preview: reader.result } }));
    reader.readAsDataURL(file);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validatePersonal = () => {
    const rules = {
      firstName:    "First name is required",
      lastName:     "Last name is required",
      phone:        "Phone is required",
      grade:        "Grade is required",
      className:    "Class is required",
      admissionDate:"Admission date is required",
      parentName:   "Parent name is required",
      parentPhone:  "Parent phone is required",
      ...(!studentId && {
        name:     "Full name is required",
        email:    "Email is required",
        password: "Password (min 8 chars) is required",
      }),
    };
    const errs = {};
    Object.entries(rules).forEach(([k, msg]) => { if (!form[k]) errs[k] = msg; });
    if (!studentId && form.password && form.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit Step-1 ──────────────────────────────────────────────────────────
  const handlePersonalSubmit = async () => {
    if (!validatePersonal()) return;
    setSubmitting(true);
    setApiError("");

    try {
      let sid = createdStudentId;

      // 1. Register student if no id yet
      if (!sid) {
        const regRes = await axios.post(`${API_URL}/students/register`, {
          name:     form.name,
          email:    form.email,
          password: form.password,
        });
        sid = regRes.data.student.id;
        setCreatedStudentId(sid);
        localStorage.setItem("token", regRes.data.token);
      }

      // 2. POST /api/students/:id/personal-info  (multipart/form-data)
      const fd = new FormData();
      const textFields = [
        "firstName","lastName","dateOfBirth","gender",
        "phone","address","city","state","zipCode",
        "grade","className","admissionDate","status",
        "parentName","parentEmail","parentPhone","emergencyContact",
        "bloodGroup","medicalConditions","allergies",
      ];
      textFields.forEach((f) => { if (form[f]) fd.append(f, form[f]); });
      if (form.profileImage?.file) fd.append("profileImage", form.profileImage.file);

      await axios.post(`${API_URL}/students/${sid}/personal-info`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setPersonalDone(true);
      setActiveTab("documents");
    } catch (err) {
      setApiError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit Step-2 ──────────────────────────────────────────────────────────
  const handleDocumentsSubmit = async () => {
    setSubmitting(true);
    setApiError("");

    try {
      const sid = createdStudentId;
      const allFiles = [];

      FIXED_DOCS.forEach((doc) => {
        const file = fixedDocFiles[doc.id];
        if (file) allFiles.push({ file, documentName: doc.id, customLabel: null });
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

        await axios.post(`${API_URL}/students/${sid}/documents/bulk`, fd, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      }

      if (closeModal) closeModal();
    } catch (err) {
      setApiError(err.response?.data?.message || "Document upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Document helpers ───────────────────────────────────────────────────────
  const setFixed    = (id, file) => setFixedDocFiles((p) => ({ ...p, [id]: file }));
  const removeFixed = (id)  => {
    setFixedDocFiles((p) => ({ ...p, [id]: null }));
    if (fixedRefs.current[id]) fixedRefs.current[id].value = "";
  };
  const addExtra     = ()         => setExtraDocs((p) => [...p, { id: Date.now(), label: "", file: null }]);
  const removeExtra  = (id)       => setExtraDocs((p) => p.filter((d) => d.id !== id));
  const setExtraLbl  = (id, v)    => setExtraDocs((p) => p.map((d) => d.id === id ? { ...d, label: v } : d));
  const setExtraFile = (id, file) => setExtraDocs((p) => p.map((d) => d.id === id ? { ...d, file } : d));

  const uploadedCount =
    Object.values(fixedDocFiles).filter(Boolean).length +
    extraDocs.filter((d) => d.file).length;

  // ── Style helpers ──────────────────────────────────────────────────────────
  const inp = (f) =>
    `w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white transition-all outline-none
     focus:ring-2 focus:ring-blue-500 focus:border-blue-400
     ${fieldErrors[f] ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200 hover:border-gray-300"}`;

  const sel = (f) =>
    `w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white transition-all outline-none appearance-none
     focus:ring-2 focus:ring-blue-500 focus:border-blue-400
     ${fieldErrors[f] ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`;

  const lbl = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5";

  // ── Sub-components ─────────────────────────────────────────────────────────
  const Section = ({ icon: Icon, bg, title, children }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 ${bg}`}>
        <div className="w-7 h-7 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const Field = ({ label, required: req, error, children }) => (
    <div>
      <label className={lbl}>
        {label}{req && <span className="text-red-500 ml-0.5 normal-case">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-red-500 text-[11px] mt-1 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );

  const Sel = ({ field, value, onChange, children }) => (
    <div className="relative">
      <select className={sel(field)} value={value} onChange={onChange}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full bg-[#f4f6fb] rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: "90vh" }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={closeModal}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-900">Add New Student</h2>
            <p className="text-[11px] text-gray-400 font-medium">
              {activeTab === "personal" ? "Step 1 of 2 — Personal Information" : "Step 2 of 2 — Document Upload"}
            </p>
          </div>
        </div>
        <button type="button" onClick={closeModal}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => setActiveTab("personal")}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "personal"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
              personalDone ? "bg-green-500 text-white" :
              activeTab === "personal" ? "bg-blue-600 text-white" :
              "bg-gray-200 text-gray-500"
            }`}>
              {personalDone ? "✓" : "1"}
            </span>
            Personal Info
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />

          <button
            onClick={() => { if (personalDone) setActiveTab("documents"); }}
            disabled={!personalDone}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "documents"
                ? "border-blue-600 text-blue-700"
                : personalDone
                ? "border-transparent text-gray-400 hover:text-gray-600"
                : "border-transparent text-gray-300 cursor-not-allowed"
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeTab === "documents" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"
            }`}>2</span>
            Documents
            {!personalDone && <span className="text-[10px] text-gray-300 font-normal ml-1">(step 1 first)</span>}
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ══════════════════════════════════════
            TAB 1 — PERSONAL INFORMATION
        ══════════════════════════════════════ */}
        {activeTab === "personal" && (
          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* LEFT: profile + preview + credentials */}
              <div className="lg:col-span-1 space-y-4">

                {/* Profile photo */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
                  <p className={`${lbl} self-start`}>Profile Photo</p>
                  <div
                    className="relative group cursor-pointer mt-2"
                    onClick={() => profileInputRef.current?.click()}>
                    {form.profileImage?.preview ? (
                      <img src={form.profileImage.preview} alt="Profile"
                        className="w-28 h-28 rounded-2xl object-cover border-4 border-blue-50 shadow-md" />
                    ) : (
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center border-4 border-blue-50 shadow-md">
                        <User className="w-12 h-12 text-white/80" />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    {form.profileImage && (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setProfileImg(null); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 shadow-sm">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input ref={profileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                    className="hidden" onChange={(e) => setProfileImg(e.target.files[0])} />
                  <button type="button" onClick={() => profileInputRef.current?.click()}
                    className="mt-3.5 px-4 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-1.5">
                    <Upload className="w-3 h-3" /> Upload Photo
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2">JPG, PNG, WEBP · Max 5 MB</p>
                </div>

                {/* Preview card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className={`${lbl} mb-3`}>Preview</p>
                  <div className="space-y-3">
                    {[
                      { icon: User,     label: "Name",      val: `${form.firstName} ${form.lastName}`.trim() || "—" },
                      { icon: Calendar, label: "Admission", val: form.admissionDate || "—" },
                      { icon: BookOpen, label: "Class",     val: form.grade && form.className ? `${form.grade} — Class ${form.className}` : "—" },
                      { icon: Phone,    label: "Phone",     val: form.phone || "—" },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3 h-3 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold">{label}</p>
                          <p className="text-xs font-bold text-gray-700 truncate">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credentials (only when creating new student) */}
                {!studentId && (
                  <Section icon={Shield} bg="bg-slate-50" title="Login Credentials">
                    <div className="space-y-3.5">
                      <Field label="Full Name" req error={fieldErrors.name}>
                        <input className={inp("name")} placeholder="Full name" value={form.name} onChange={set("name")} />
                      </Field>
                      <Field label="Email" req error={fieldErrors.email}>
                        <input type="email" className={inp("email")} placeholder="student@school.com" value={form.email} onChange={set("email")} />
                      </Field>
                      <Field label="Password" req error={fieldErrors.password}>
                        <input type="password" className={inp("password")} placeholder="Min 8 characters" value={form.password} onChange={set("password")} />
                      </Field>
                    </div>
                  </Section>
                )}
              </div>

              {/* RIGHT: all info sections */}
              <div className="lg:col-span-2 space-y-4">

                {/* Personal */}
                <Section icon={User} bg="bg-blue-50" title="Personal Information">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name" req error={fieldErrors.firstName}>
                      <input className={inp("firstName")} placeholder="First name" value={form.firstName} onChange={set("firstName")} />
                    </Field>
                    <Field label="Last Name" req error={fieldErrors.lastName}>
                      <input className={inp("lastName")} placeholder="Last name" value={form.lastName} onChange={set("lastName")} />
                    </Field>
                    <Field label="Date of Birth">
                      <input type="date" className={inp("dateOfBirth")} value={form.dateOfBirth} onChange={set("dateOfBirth")} />
                    </Field>
                    <Field label="Gender">
                      <Sel field="gender" value={form.gender} onChange={set("gender")}>
                        <option value="">Select gender</option>
                        {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </Sel>
                    </Field>
                  </div>
                </Section>

                {/* Contact */}
                <Section icon={Mail} bg="bg-violet-50" title="Contact Information">
                  <div className="grid grid-cols-2 gap-4">
                    {!studentId && (
                      <div className="col-span-2">
                        <Field label="Email" req error={fieldErrors.email}>
                          <input type="email" className={inp("email")} placeholder="student@school.com" value={form.email} onChange={set("email")} />
                        </Field>
                      </div>
                    )}
                    <Field label="Phone" req error={fieldErrors.phone}>
                      <input type="tel" className={inp("phone")} placeholder="+1 234-567-8900" value={form.phone} onChange={set("phone")} />
                    </Field>
                    <Field label="Zip Code">
                      <input className={inp("zipCode")} placeholder="Zip code" value={form.zipCode} onChange={set("zipCode")} />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Street Address">
                        <input className={inp("address")} placeholder="Street address" value={form.address} onChange={set("address")} />
                      </Field>
                    </div>
                    <Field label="City">
                      <input className={inp("city")} placeholder="City" value={form.city} onChange={set("city")} />
                    </Field>
                    <Field label="State">
                      <input className={inp("state")} placeholder="State" value={form.state} onChange={set("state")} />
                    </Field>
                  </div>
                </Section>

                {/* Academic */}
                <Section icon={BookOpen} bg="bg-emerald-50" title="Academic Information">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Grade" req error={fieldErrors.grade}>
                      <Sel field="grade" value={form.grade} onChange={set("grade")}>
                        <option value="">Select grade</option>
                        {GRADES.map((g) => <option key={g} value={g}>{g} Grade</option>)}
                      </Sel>
                    </Field>
                    <Field label="Class" req error={fieldErrors.className}>
                      <Sel field="className" value={form.className} onChange={set("className")}>
                        <option value="">Select class</option>
                        {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
                      </Sel>
                    </Field>
                    <Field label="Admission Date" req error={fieldErrors.admissionDate}>
                      <input type="date" className={inp("admissionDate")} value={form.admissionDate} onChange={set("admissionDate")} />
                    </Field>
                    <Field label="Status">
                      <Sel field="status" value={form.status} onChange={set("status")}>
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </Sel>
                    </Field>
                  </div>
                </Section>

                {/* Parent / Guardian */}
                <Section icon={Phone} bg="bg-orange-50" title="Parent / Guardian">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Parent Name" req error={fieldErrors.parentName}>
                      <input className={inp("parentName")} placeholder="Full name" value={form.parentName} onChange={set("parentName")} />
                    </Field>
                    <Field label="Parent Phone" req error={fieldErrors.parentPhone}>
                      <input type="tel" className={inp("parentPhone")} placeholder="+1 234-567-8900" value={form.parentPhone} onChange={set("parentPhone")} />
                    </Field>
                    <Field label="Parent Email">
                      <input type="email" className={inp("parentEmail")} placeholder="parent@example.com" value={form.parentEmail} onChange={set("parentEmail")} />
                    </Field>
                    <Field label="Emergency Contact">
                      <input type="tel" className={inp("emergencyContact")} placeholder="+1 234-567-8900" value={form.emergencyContact} onChange={set("emergencyContact")} />
                    </Field>
                  </div>
                </Section>

                {/* Health */}
                <Section icon={Heart} bg="bg-rose-50" title="Health Information">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Blood Group">
                      <Sel field="bloodGroup" value={form.bloodGroup} onChange={set("bloodGroup")}>
                        <option value="">Select blood group</option>
                        {BLOOD_GROUPS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </Sel>
                    </Field>
                    <div />
                    <div className="col-span-2">
                      <Field label="Medical Conditions">
                        <textarea rows={2} className={`${inp("medicalConditions")} resize-none`}
                          placeholder="e.g. Asthma, Diabetes (comma separated)"
                          value={form.medicalConditions} onChange={set("medicalConditions")} />
                      </Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="Allergies">
                        <textarea rows={2} className={`${inp("allergies")} resize-none`}
                          placeholder="e.g. Peanuts, Penicillin (comma separated)"
                          value={form.allergies} onChange={set("allergies")} />
                      </Field>
                    </div>
                  </div>
                </Section>

                {/* Error banners */}
                {apiError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {apiError}
                  </div>
                )}
                {Object.keys(fieldErrors).length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Please fill in all required fields marked with *
                  </div>
                )}

                {/* Next */}
                <div className="flex justify-end pb-2">
                  <button type="button" onClick={handlePersonalSubmit} disabled={submitting}
                    className="flex items-center gap-2.5 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition font-bold text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      : <><span>Next: Upload Documents</span><ChevronRight className="w-4 h-4" /></>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — DOCUMENTS
        ══════════════════════════════════════ */}
        {activeTab === "documents" && (
          <div className="p-5 space-y-5">

            {/* Student summary */}
            <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
              {form.profileImage?.preview ? (
                <img src={form.profileImage.preview} className="w-10 h-10 rounded-xl object-cover border-2 border-blue-100 shrink-0" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {form.firstName?.[0]}{form.lastName?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{form.firstName} {form.lastName}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {form.grade} Grade · Class {form.className}
                  {form.email ? ` · ${form.email}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-400 font-medium">
                  {uploadedCount} file{uploadedCount !== 1 ? "s" : ""} ready
                </span>
                <button onClick={() => setActiveTab("personal")}
                  className="text-xs text-blue-600 hover:underline font-bold">
                  Edit Info
                </button>
              </div>
            </div>

            {/* Fixed 4 documents */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Required Documents</h3>
                    <p className="text-[11px] text-gray-500">Upload official student documents</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                  {Object.values(fixedDocFiles).filter(Boolean).length} / {FIXED_DOCS.length} uploaded
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {FIXED_DOCS.map((doc) => {
                  const file = fixedDocFiles[doc.id];
                  const isImg = file?.type?.startsWith("image/");
                  return (
                    <div key={doc.id}
                      className={`rounded-xl border-2 border-dashed transition-all ${
                        file ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                      }`}>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        ref={(el) => (fixedRefs.current[doc.id] = el)}
                        onChange={(e) => setFixed(doc.id, e.target.files[0])}
                        className="hidden" id={`fd-${doc.id}`} />

                      {file ? (
                        <div className="flex items-center gap-3 p-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-sm">
                            {isImg
                              ? <ImageIcon className="w-5 h-5 text-blue-500" />
                              : <FileIcon  className="w-5 h-5 text-orange-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-700">{doc.label}</p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{file.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-[11px] text-green-600 font-semibold">
                                <CheckCircle className="w-3 h-3" /> Uploaded
                              </span>
                              <span className="text-[10px] text-gray-400">{formatBytes(file.size)}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeFixed(doc.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={`fd-${doc.id}`} className="block p-5 cursor-pointer">
                          <div className="flex flex-col items-center gap-2.5">
                            <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                              <Upload className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold text-gray-700">
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

            {/* Custom / extra documents */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-amber-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
                    <Plus className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Additional Documents</h3>
                    <p className="text-[11px] text-gray-500">Optional — medical cert, passport, caste cert, etc.</p>
                  </div>
                </div>
                <button type="button" onClick={addExtra}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition shadow-sm">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="p-5">
                {extraDocs.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-semibold">No additional documents</p>
                    <p className="text-xs text-gray-300 mt-1">Click "Add" to upload any extra file</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {extraDocs.map((doc, idx) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <input type="text" value={doc.label}
                          onChange={(e) => setExtraLbl(doc.id, e.target.value)}
                          placeholder="Document name (e.g. Medical Certificate)"
                          className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-0" />
                        <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition shrink-0 ${
                          doc.file
                            ? "bg-green-50 border border-green-200 text-green-700"
                            : "bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                        }`}>
                          {doc.file
                            ? <><CheckCircle className="w-3.5 h-3.5" />{doc.file.name.length > 14 ? doc.file.name.slice(0, 14) + "…" : doc.file.name}</>
                            : <><Upload className="w-3.5 h-3.5" />Upload</>
                          }
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => setExtraFile(doc.id, e.target.files[0])} className="hidden" />
                        </label>
                        <button type="button" onClick={() => removeExtra(doc.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {apiError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" /> {apiError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pb-2">
              <button type="button" onClick={() => setActiveTab("personal")}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition text-sm font-bold text-gray-600 shadow-sm">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={handleDocumentsSubmit} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition font-bold text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Save className="w-4 h-4" /> Save Student Record</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}