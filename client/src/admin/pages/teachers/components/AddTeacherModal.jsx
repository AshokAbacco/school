// client/src/admin/pages/teachers/components/AddTeacherModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { X, Eye, EyeOff, Check, Loader2, Camera } from "lucide-react";
import {
  createTeacher, uploadTeacherProfileImage, uploadTeacherDocument,
} from "../api/teachersApi.js";

const INIT = {
  firstName:"", lastName:"", email:"", password:"", confirmPassword:"",
  phone:"", gender:"", dateOfBirth:"", employeeCode:"", department:"",
  designation:"", qualification:"", experienceYears:"", joiningDate:"",
  employmentType:"FULL_TIME", address:"", city:"", state:"", zipCode:"",
  salary:"", bankAccountNo:"", bankName:"", ifscCode:"", panNumber:"",
  aadhaarNumber:"", bloodGroup:"", emergencyContact:"", medicalConditions:"", allergies:"",
};

const REQUIRED = ["firstName","lastName","email","password","employeeCode","department","designation","joiningDate"];

const DOC_SLOTS = [
  { type:"DEGREE_CERTIFICATE",     label:"Degree / Education Certificate", icon:"🎓", required:true,  hint:"B.Ed, M.Sc, B.A or any degree certificate" },
  { type:"EXPERIENCE_CERTIFICATE", label:"Experience Certificate",         icon:"💼", required:false, hint:"From previous employer (if applicable)" },
  { type:"ID_PROOF",               label:"ID Proof",                       icon:"🪪", required:true,  hint:"Aadhaar card or Passport" },
  { type:"ADDRESS_PROOF",          label:"Address Proof",                  icon:"🏠", required:false, hint:"Utility bill, bank passbook, rent agreement" },
  { type:"PAN_CARD",               label:"PAN Card",                       icon:"💳", required:false, hint:"Income Tax PAN card scan" },
];

const BLOOD_GROUPS = [
  { value:"",      label:"Select Blood Group" },
  { value:"A_POS", label:"A+" },{ value:"A_NEG", label:"A−" },
  { value:"B_POS", label:"B+" },{ value:"B_NEG", label:"B−" },
  { value:"O_POS", label:"O+" },{ value:"O_NEG", label:"O−" },
  { value:"AB_POS",label:"AB+" },{ value:"AB_NEG",label:"AB−" },
];

const STEPS = [
  { label:"Account",      icon:"👤" },
  { label:"Professional", icon:"🏫" },
  { label:"Address",      icon:"📍" },
  { label:"Payroll",      icon:"💳" },
  { label:"Medical",      icon:"🏥" },
  { label:"Documents",    icon:"📄" },
];

const font = { fontFamily:"Inter, sans-serif" };

// ─── useIsMobile ─────────────────────────────────────────────
function useIsMobile(bp = 480) {
  const [v, setV] = React.useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const h = (e) => setV(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [bp]);
  return v;
}

// ─── FInput ──────────────────────────────────────────────────
function FInput({ label, required, value, onChange, type="text", error, placeholder, suffix }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:10, fontWeight:700, color:"#6A89A7", ...font, textTransform:"uppercase", letterSpacing:"0.06em" }}>
        {label}{required && <span style={{ color:"#ef4444" }}> *</span>}
      </label>
      <div style={{ position:"relative" }}>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{
            width:"100%", padding:`9px ${suffix ? 38 : 12}px 9px 12px`,
            border:`1.5px solid ${error ? "#f87171" : "#C8DCF0"}`,
            borderRadius:10, fontSize:13, color:"#243340",
            background:"#EDF3FA", outline:"none", ...font, transition:"border-color 0.15s",
          }}
          onFocus={(e) => e.target.style.borderColor="#88BDF2"}
          onBlur={(e) => e.target.style.borderColor = error ? "#f87171" : "#C8DCF0"} />
        {suffix && (
          <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)" }}>{suffix}</div>
        )}
      </div>
      {error && <span style={{ fontSize:11, color:"#dc2626", ...font }}>{error}</span>}
    </div>
  );
}

// ─── FTextarea ────────────────────────────────────────────────
function FTextarea({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:10, fontWeight:700, color:"#6A89A7", ...font, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
        style={{ border:"1.5px solid #C8DCF0", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#243340", background:"#EDF3FA", outline:"none", ...font, resize:"none", transition:"border-color 0.15s" }}
        onFocus={(e) => e.target.style.borderColor="#88BDF2"}
        onBlur={(e) => e.target.style.borderColor="#C8DCF0"} />
    </div>
  );
}

// ─── FSelect ─────────────────────────────────────────────────
function FSelect({ label, required, value, onChange, options }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:10, fontWeight:700, color:"#6A89A7", ...font, textTransform:"uppercase", letterSpacing:"0.06em" }}>
        {label}{required && <span style={{ color:"#ef4444" }}> *</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ border:"1.5px solid #C8DCF0", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#243340", background:"#EDF3FA", outline:"none", ...font, cursor:"pointer" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── AvatarPicker ─────────────────────────────────────────────
function AvatarPicker({ firstName, lastName, preview, onFileSelect }) {
  const fileRef = useRef(null);
  const initials = `${firstName?.[0]??""}${lastName?.[0]??""}`.toUpperCase();
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <label style={{ fontSize:10, fontWeight:700, color:"#6A89A7", ...font, textTransform:"uppercase", letterSpacing:"0.06em" }}>
        Photo <span style={{ color:"#6A89A7", fontWeight:400 }}>(optional)</span>
      </label>
      <div style={{ position:"relative", width:72, height:72 }}>
        <div onClick={() => fileRef.current?.click()} title="Click to select photo"
          style={{ width:72, height:72, borderRadius:"50%", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg, #88BDF2, #6A89A7)", color:"#fff", fontWeight:800, fontSize:22, cursor:"pointer", border:"2.5px solid #EDF3FA" }}>
          {preview ? <img src={preview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize: initials ? 22 : 14, opacity: initials ? 1 : 0.5 }}>{initials || "📷"}</span>}
        </div>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ position:"absolute", bottom:0, right:0, width:22, height:22, borderRadius:"50%", background:"#384959", border:"2.5px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0 }}>
          <Camera size={10} color="#fff" />
        </button>
      </div>
      {preview && (
        <button type="button" onClick={() => onFileSelect(null)}
          style={{ fontSize:11, color:"#ef4444", background:"none", border:"none", cursor:"pointer", ...font, padding:0 }}>Remove</button>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }}
        onChange={(e) => { const file = e.target.files[0]; if (file) onFileSelect(file); e.target.value=""; }} />
    </div>
  );
}

// ─── DocSlot ─────────────────────────────────────────────────
function DocSlot({ slot, file, onSelect }) {
  const fileRef = useRef(null);
  const hasFile = !!file;
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14,
      border:`1.5px solid ${hasFile ? "#86efac" : "#DDE9F5"}`,
      background: hasFile ? "#f0fdf4" : "#EDF3FA",
      transition:"all 0.15s",
    }}>
      <div style={{ width:36, height:36, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, background: hasFile ? "#dcfce7" : "#BDDDFC44" }}>{slot.icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
          <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#243340", ...font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{slot.label}</p>
          {slot.required && <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:20, background:"#fee2e2", color:"#991b1b", flexShrink:0 }}>Required</span>}
        </div>
        {hasFile
          ? <p style={{ margin:0, fontSize:10, color:"#16a34a", ...font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>✓ {file.name} ({(file.size/1024).toFixed(0)} KB)</p>
          : <p style={{ margin:0, fontSize:10, color:"#6A89A7", ...font }}>{slot.hint}</p>
        }
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        {hasFile && (
          <button type="button" onClick={() => onSelect(null)}
            style={{ fontSize:11, padding:"4px 8px", borderRadius:8, background:"#fee2e2", color:"#991b1b", border:"none", cursor:"pointer", ...font, fontWeight:700 }}>✕</button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ fontSize:11, fontWeight:700, padding:"6px 12px", borderRadius:10, background:"linear-gradient(135deg, #6A89A7, #384959)", color:"#fff", border:"none", cursor:"pointer", ...font }}>
          {hasFile ? "Change" : "Upload"}
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }}
        onChange={(e) => { const f = e.target.files[0]; if (f) onSelect(f); e.target.value=""; }} />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────
export default function AddTeacherModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(INIT);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [step, setStep] = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [docFiles, setDocFiles] = useState({});
  const [uploadStatus, setUploadStatus] = useState("");
  const isMobile = useIsMobile(540);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const handlePhotoSelect = (file) => {
    if (!file) { setPhotoFile(null); setPhotoPreview(""); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleDocSelect = (docType, file) => {
    setDocFiles((prev) => { const next = { ...prev }; if (!file) delete next[docType]; else next[docType] = file; return next; });
  };

  useEffect(() => { return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }; }, [photoPreview]);
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const validate = () => {
    const errs = {};
    REQUIRED.forEach((k) => { if (!form[k]) errs[k] = "Required"; });
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (!form.confirmPassword) errs.confirmPassword = "Required";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (["employeeCode","department","designation","joiningDate"].includes(Object.keys(errs)[0])) setStep(2);
      else setStep(1);
      return;
    }
    setLoading(true); setApiError(""); setUploadStatus("Creating teacher profile…");
    try {
      const { confirmPassword:_cp, ...formData } = form;
      const result = await createTeacher({ ...formData, name:`${form.firstName} ${form.lastName}`, experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined, salary: form.salary ? Number(form.salary) : undefined, dateOfBirth: form.dateOfBirth || undefined, bloodGroup: form.bloodGroup || undefined, emergencyContact: form.emergencyContact || undefined, medicalConditions: form.medicalConditions || undefined, allergies: form.allergies || undefined });
      const teacherId = result?.data?.id;
      if (photoFile && teacherId) {
        setUploadStatus("Uploading profile photo…");
        try { await uploadTeacherProfileImage(teacherId, photoFile); } catch(e) { console.warn(e.message); }
      }
      const docEntries = Object.entries(docFiles);
      if (docEntries.length && teacherId) {
        for (let i = 0; i < docEntries.length; i++) {
          const [docType, file] = docEntries[i];
          const slot = DOC_SLOTS.find((s) => s.type === docType);
          setUploadStatus(`Uploading ${slot?.label ?? docType} (${i+1}/${docEntries.length})…`);
          try { await uploadTeacherDocument(teacherId, file, docType); } catch(e) { console.warn(e.message); }
        }
      }
      setUploadStatus(""); onSuccess();
    } catch (err) { setApiError(err.message || "Failed to create teacher"); setUploadStatus(""); }
    finally { setLoading(false); }
  };

  const requiredDocs = DOC_SLOTS.filter((s) => s.required);
  const uploadedRequiredCount = requiredDocs.filter((s) => docFiles[s.type]).length;

  const btnBase = { ...font, fontSize:13, fontWeight:700, padding:"9px 18px", borderRadius:11, border:"none", cursor:"pointer", transition:"all 0.15s" };

  return (
    <>
      {/* Overlay */}
      <div style={{ position:"fixed", inset:0, zIndex:40, background:"rgba(56,73,89,0.35)", backdropFilter:"blur(4px)" }} onClick={onClose} />

      {/* Modal */}
      <div style={isMobile ? {
        position:"fixed",zIndex:50,bottom:0,left:0,right:0,
        width:"100%",maxHeight:"94vh",
        background:"#FFFFFF",borderRadius:"20px 20px 0 0",
        border:"1.5px solid #DDE9F5",
        boxShadow:"0 -16px 60px rgba(56,73,89,0.22)",
        display:"flex",flexDirection:"column",
        animation:"slideUpModal 0.22s cubic-bezier(0.4,0,0.2,1)",
      } : {
        position:"fixed",zIndex:50,top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        width:580,maxWidth:"95vw",maxHeight:"92vh",
        background:"#FFFFFF",borderRadius:22,
        border:"1.5px solid #DDE9F5",
        boxShadow:"0 28px 80px rgba(56,73,89,0.22)",
        display:"flex",flexDirection:"column",
        animation:"fadeUp 0.2s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translate(-50%,-48%)}to{opacity:1;transform:translate(-50%,-50%)}}
          @keyframes slideUpModal{from{transform:translateY(100%)}to{transform:translateY(0)}}
        `}</style>
        {isMobile && (
          <div style={{display:"flex",justifyContent:"center",paddingTop:10,flexShrink:0}}>
            <div style={{width:40,height:4,borderRadius:99,background:"#C8DCF0"}} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          padding: isMobile ? "14px 16px 12px" : "18px 22px 14px",
          background:"linear-gradient(90deg, #EDF3FA 0%, #FFFFFF 100%)",
          borderBottom:"1.5px solid #DDE9F5", borderRadius: isMobile ? "20px 20px 0 0" : "22px 22px 0 0", flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:4, height:22, borderRadius:99, background:"linear-gradient(180deg, #88BDF2, #384959)", flexShrink:0 }} />
            <div>
              <h2 style={{ margin:0, fontWeight:900, fontSize:16, color:"#243340", ...font }}>Add New Teacher</h2>
              <p style={{ margin:"2px 0 0", fontSize:11, color:"#6A89A7", ...font }}>
                Step {step} of {STEPS.length} — {STEPS[step-1].label}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width:30, height:30, borderRadius:9, border:"1.5px solid #DDE9F5", background:"#EDF3FA", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#6A89A7", flexShrink:0 }}
            onMouseEnter={(e) => e.currentTarget.style.background="#BDDDFC"}
            onMouseLeave={(e) => e.currentTarget.style.background="#EDF3FA"}>
            <X size={13} />
          </button>
        </div>

        {/* Step tabs */}
        <div style={{ display:"flex", alignItems:"center", gap:0, padding: isMobile ? "8px 12px 6px" : "12px 22px 8px", flexShrink:0, overflowX:"auto" }}>
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const active = step === idx;
            const done = step > idx;
            return (
              <React.Fragment key={s.label}>
                <button onClick={() => idx < step && setStep(idx)}
                  style={{
                    display:"flex", alignItems:"center", gap: isMobile ? 0 : 5,
                    padding: isMobile ? "6px 8px" : "6px 10px", borderRadius:9, fontSize:11, fontWeight:700,
                    background: active ? "linear-gradient(135deg, #6A89A7, #384959)" : done ? "#BDDDFC44" : "#EDF3FA",
                    color: active ? "#fff" : done ? "#384959" : "#6A89A7",
                    border: `1.5px solid ${active ? "#384959" : done ? "#C8DCF0" : "#DDE9F5"}`,
                    cursor: idx < step ? "pointer" : "default", whiteSpace:"nowrap", ...font, flexShrink:0,
                  }}>
                  <span>{done ? "✓" : s.icon}</span>
                  {!isMobile && <span>{s.label}</span>}
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{ flex:1, minWidth: isMobile ? 3 : 6, height:1.5, background: step > idx ? "#88BDF2" : "#DDE9F5", margin:"0 2px" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding: isMobile ? "14px 16px" : "16px 22px" }}>
          {apiError && (
            <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:12, background:"#fef2f2", border:"1px solid #fca5a5", color:"#b91c1c", fontSize:12, ...font }}>
              ⚠ {apiError}
            </div>
          )}

          {/* Step 1: Account */}
          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"flex", alignItems: isMobile ? "center" : "flex-end", gap:16, flexDirection: isMobile ? "column" : "row" }}>
                <AvatarPicker firstName={form.firstName} lastName={form.lastName} preview={photoPreview} onFileSelect={handlePhotoSelect} />
                <div style={{ flex:1, width: isMobile ? "100%" : undefined, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <FInput label="First Name" required value={form.firstName} onChange={set("firstName")} error={errors.firstName} placeholder="First name" />
                  <FInput label="Last Name"  required value={form.lastName}  onChange={set("lastName")}  error={errors.lastName}  placeholder="Last name"  />
                </div>
              </div>
              <FInput label="Email (used to login)" required value={form.email} onChange={set("email")} error={errors.email} type="email" placeholder="teacher@school.com" />
              <div style={{ padding:"10px 14px", borderRadius:12, background:"#EDF3FA", border:"1.5px solid #DDE9F5", fontSize:12, color:"#6A89A7", ...font }}>
                🔑 The email and password below will be the teacher's login credentials for the portal.
              </div>
              <FInput label="Password" required value={form.password} onChange={set("password")} error={errors.password} type={showPwd ? "text":"password"} placeholder="Set a password"
                suffix={<button type="button" onClick={() => setShowPwd(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", color:"#6A89A7", display:"flex" }}>{showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}</button>} />
              <FInput label="Confirm Password" required value={form.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} type={showConfirmPwd ? "text":"password"} placeholder="Re-enter password"
                suffix={<button type="button" onClick={() => setShowConfirmPwd(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", color:"#6A89A7", display:"flex" }}>{showConfirmPwd ? <EyeOff size={15}/> : <Eye size={15}/>}</button>} />
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
                <FInput label="Phone" value={form.phone} onChange={set("phone")} placeholder="+91 XXXXX XXXXX" />
                <FInput label="Date of Birth" value={form.dateOfBirth} onChange={set("dateOfBirth")} type="date" />
              </div>
              <FSelect label="Gender" value={form.gender} onChange={set("gender")} options={[{ value:"", label:"Select Gender" },{ value:"MALE", label:"Male" },{ value:"FEMALE", label:"Female" },{ value:"OTHER", label:"Other" }]} />
            </div>
          )}

          {/* Step 2: Professional */}
          {step === 2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
                <FInput label="Employee Code" required value={form.employeeCode} onChange={set("employeeCode")} error={errors.employeeCode} placeholder="e.g. TCH-001" />
                <FInput label="Qualification" value={form.qualification} onChange={set("qualification")} placeholder="e.g. B.Ed, M.Sc" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
                <FInput label="Department"  required value={form.department}  onChange={set("department")}  error={errors.department}  placeholder="e.g. Science" />
                <FInput label="Designation" required value={form.designation} onChange={set("designation")} error={errors.designation} placeholder="e.g. Senior Teacher" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
                <FInput label="Experience (years)" value={form.experienceYears} onChange={set("experienceYears")} type="number" placeholder="e.g. 5" />
                <FSelect label="Employment Type" value={form.employmentType} onChange={set("employmentType")} options={[{ value:"FULL_TIME", label:"Full Time" },{ value:"PART_TIME", label:"Part Time" }]} />
              </div>
              <FInput label="Joining Date" required value={form.joiningDate} onChange={set("joiningDate")} type="date" error={errors.joiningDate} />
            </div>
          )}

          {/* Step 3: Address */}
          {step === 3 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <FInput label="Street Address" value={form.address} onChange={set("address")} placeholder="House no, Street name" />
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap:12 }}>
                <FInput label="City"     value={form.city}    onChange={set("city")}    placeholder="City" />
                <FInput label="State"    value={form.state}   onChange={set("state")}   placeholder="State" />
                <FInput label="ZIP Code" value={form.zipCode} onChange={set("zipCode")} placeholder="PIN" />
              </div>
              <div style={{ padding:"10px 14px", borderRadius:12, background:"#EDF3FA", border:"1.5px solid #DDE9F5", fontSize:12, color:"#6A89A7", ...font }}>
                💡 Address is optional and can be added later from the teacher's profile.
              </div>
            </div>
          )}

          {/* Step 4: Payroll */}
          {step === 4 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
                <FInput label="Monthly Salary (₹)" value={form.salary}   onChange={set("salary")}   type="number" placeholder="e.g. 45000" />
                <FInput label="Bank Name"          value={form.bankName} onChange={set("bankName")} placeholder="e.g. SBI" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
                <FInput label="Bank Account No." value={form.bankAccountNo} onChange={set("bankAccountNo")} placeholder="Account number" />
                <FInput label="IFSC Code"        value={form.ifscCode}      onChange={set("ifscCode")}      placeholder="e.g. SBIN0001234" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
                <FInput label="PAN Number"     value={form.panNumber}     onChange={set("panNumber")}     placeholder="e.g. ABCDE1234F" />
                <FInput label="Aadhaar Number" value={form.aadhaarNumber} onChange={set("aadhaarNumber")} placeholder="12-digit number" />
              </div>
              <div style={{ padding:"10px 14px", borderRadius:12, background:"#fffbeb", border:"1px solid #fde68a", fontSize:12, color:"#92400e", ...font }}>
                🔒 Payroll data is sensitive. All fields are optional and access-controlled.
              </div>
            </div>
          )}

          {/* Step 5: Medical */}
          {step === 5 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ padding:"12px 14px", borderRadius:14, background:"#fff5f5", border:"1px solid #fecaca" }}>
                <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#991b1b", ...font }}>🚨 Emergency Contact</p>
                <FInput label="Emergency Contact Number" value={form.emergencyContact} onChange={set("emergencyContact")} placeholder="Phone number for emergency" type="tel" />
              </div>
              <div style={{ padding:"12px 14px", borderRadius:14, background:"#f0fdf4", border:"1px solid #86efac" }}>
                <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#166534", ...font }}>🏥 Medical Information</p>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <FSelect label="Blood Group" value={form.bloodGroup} onChange={set("bloodGroup")} options={BLOOD_GROUPS} />
                  <FTextarea label="Medical Conditions" value={form.medicalConditions} onChange={set("medicalConditions")} placeholder="e.g. Diabetes, Hypertension (leave blank if none)" />
                  <FTextarea label="Allergies"          value={form.allergies}          onChange={set("allergies")}          placeholder="e.g. Penicillin, Peanuts (leave blank if none)" />
                </div>
              </div>
              <div style={{ padding:"10px 14px", borderRadius:12, background:"#EDF3FA", border:"1.5px solid #DDE9F5", fontSize:12, color:"#6A89A7", ...font }}>
                💡 All fields on this step are optional. This information is confidential.
              </div>
            </div>
          )}

          {/* Step 6: Documents */}
          {step === 6 && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:12, background:"#EDF3FA", border:"1.5px solid #DDE9F5" }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#243340", ...font }}>Documents uploaded</span>
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background: uploadedRequiredCount === requiredDocs.length ? "#dcfce7" : "#fef3c7", color: uploadedRequiredCount === requiredDocs.length ? "#166534" : "#92400e", ...font }}>
                  {Object.keys(docFiles).length} / {DOC_SLOTS.length} files
                </span>
              </div>
              {DOC_SLOTS.map((slot) => (
                <DocSlot key={slot.type} slot={slot} file={docFiles[slot.type] ?? null} onSelect={(f) => handleDocSelect(slot.type, f)} />
              ))}
              <div style={{ padding:"10px 14px", borderRadius:12, background:"#fffbeb", border:"1px solid #fde68a", fontSize:12, color:"#92400e", ...font }}>
                📎 Accepted formats: PDF, JPG, PNG. Required documents must be uploaded before submission.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding: isMobile ? "12px 16px" : "14px 22px", borderTop:"1.5px solid #DDE9F5",
          background:"linear-gradient(90deg, #EDF3FA 0%, #FFFFFF 100%)",
          borderRadius: isMobile ? 0 : "0 0 22px 22px", flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {loading && uploadStatus ? (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Loader2 size={14} className="animate-spin" style={{ color:"#384959" }} />
                <span style={{ fontSize:12, color:"#6A89A7", ...font }}>{uploadStatus}</span>
              </div>
            ) : (
              <>
                {step > 1 && (
                  <button onClick={() => setStep((s) => s-1)} style={{ ...btnBase, background:"#EDF3FA", color:"#384959", border:"1.5px solid #C8DCF0" }}>← Back</button>
                )}
                <button onClick={onClose} style={{ ...btnBase, background:"#EDF3FA", color:"#6A89A7", border:"1.5px solid #DDE9F5" }}>Cancel</button>
              </>
            )}
          </div>
          {!loading && (
            step < STEPS.length
              ? <button onClick={() => setStep((s) => s+1)} style={{ ...btnBase, background:"linear-gradient(135deg, #6A89A7, #384959)", color:"#fff", boxShadow:"0 4px 12px rgba(56,73,89,0.25)" }}>Next →</button>
              : <button onClick={handleSubmit} disabled={loading} style={{ ...btnBase, background:"linear-gradient(135deg, #6A89A7, #384959)", color:"#fff", opacity: loading ? 0.7:1, cursor: loading ? "not-allowed":"pointer", boxShadow:"0 4px 12px rgba(56,73,89,0.25)" }}>
                  <Check size={13} style={{ display:"inline", marginRight:5 }} />Create Teacher
                </button>
          )}
        </div>
      </div>
    </>
  );
}