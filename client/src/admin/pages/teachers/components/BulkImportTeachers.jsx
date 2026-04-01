// client/src/admin/pages/teachers/components/BulkImportTeachers.jsx
// Drop an Excel/CSV → preview → bulk register teachers
import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
import {
  Upload, Download, X, CheckCircle, AlertCircle,
  Loader2, FileSpreadsheet, ChevronDown, ChevronUp,
  Users, Info, RefreshCw,
} from "lucide-react";
import { getToken } from "../../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

// ── Design tokens (matches TeachersPage palette) ─────────────────────────────
const C = {
  primary:    "#243340",
  accent:     "#88BDF2",
  secondary:  "#6A89A7",
  border:     "#DDE9F5",
  borderSoft: "#E8F0F9",
  bgSoft:     "#F4F8FC",
  bgCard:     "#fff",
};

// ── Column aliases → internal field key ──────────────────────────────────────
const COLUMN_MAP = {
  // Identity
  firstName:        ["first name", "firstname", "first_name", "fname"],
  lastName:         ["last name", "lastname", "last_name", "lname"],
  email:            ["email", "teacher email", "login email"],
  password:         ["password", "pass"],
  employeeCode:     ["employee code", "emp code", "empcode", "code", "employee id"],
  // Personal
  dateOfBirth:      ["dob", "date of birth", "dateofbirth", "birth date"],
  gender:           ["gender", "sex"],
  phone:            ["phone", "mobile", "contact", "phone number"],
  address:          ["address", "street address"],
  city:             ["city"],
  state:            ["state"],
  zipCode:          ["zip", "zipcode", "pincode", "postal code"],
  aadhaarNumber:    ["aadhaar", "aadhar", "aadhaar number"],
  panNumber:        ["pan", "pan number"],
  bloodGroup:       ["blood group", "blood", "bloodgroup", "blood type"],
  emergencyContact: ["emergency contact", "emergency", "emergencycontact"],
  medicalConditions:["medical conditions", "medical", "health conditions"],
  allergies:        ["allergies", "allergy"],
  // Professional
  department:       ["department", "dept"],
  designation:      ["designation", "title", "role", "position"],
  qualification:    ["qualification", "education", "degree"],
  experienceYears:  ["experience", "experience years", "exp years", "years of experience", "exp"],
  joiningDate:      ["joining date", "joiningdate", "join date", "start date"],
  employmentType:   ["employment type", "employmenttype", "type", "contract type"],
  status:           ["status", "teacher status"],
  // Financial
  salary:           ["salary", "ctc", "pay"],
  bankAccountNo:    ["bank account", "account number", "bank acc"],
  bankName:         ["bank name", "bank"],
  ifscCode:         ["ifsc", "ifsc code"],
};

function resolveHeader(raw) {
  const lower = raw.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.includes(lower)) return field;
  }
  return null;
}

// ── Normalizers ───────────────────────────────────────────────────────────────
const normalizeGender = (v) => {
  if (!v) return "";
  const u = v.toString().toUpperCase().trim();
  if (u === "M" || u === "MALE") return "MALE";
  if (u === "F" || u === "FEMALE") return "FEMALE";
  return "OTHER";
};
const normalizeBlood = (v) => {
  if (!v) return "";
  return v.toString().toUpperCase().trim()
    .replace(/\+/, "_POS").replace(/-/, "_NEG").replace(/\s/g, "");
};
const normalizeEmploymentType = (v) => {
  if (!v) return "FULL_TIME";
  const u = v.toString().toUpperCase().replace(/[^A-Z]/g, "_").trim();
  const valid = ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"];
  return valid.includes(u) ? u : "FULL_TIME";
};
const normalizeStatus = (v) => {
  if (!v) return "ACTIVE";
  const u = v.toString().toUpperCase().trim();
  const valid = ["ACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED"];
  return valid.includes(u) ? u : "ACTIVE";
};

function parseRow(rawRow, headerMap) {
  const get = (field) => {
    const idx = headerMap[field];
    if (idx === undefined) return "";
    const v = rawRow[idx];
    return v !== undefined && v !== null ? v.toString().trim() : "";
  };
  return {
    firstName:         get("firstName"),
    lastName:          get("lastName"),
    email:             get("email"),
    password:          get("password"),
    employeeCode:      get("employeeCode"),
    dateOfBirth:       get("dateOfBirth"),
    gender:            normalizeGender(get("gender")),
    phone:             get("phone"),
    address:           get("address"),
    city:              get("city"),
    state:             get("state"),
    zipCode:           get("zipCode"),
    aadhaarNumber:     get("aadhaarNumber"),
    panNumber:         get("panNumber"),
    bloodGroup:        normalizeBlood(get("bloodGroup")),
    emergencyContact:  get("emergencyContact"),
    medicalConditions: get("medicalConditions"),
    allergies:         get("allergies"),
    department:        get("department"),
    designation:       get("designation"),
    qualification:     get("qualification"),
    experienceYears:   get("experienceYears"),
    joiningDate:       get("joiningDate"),
    employmentType:    normalizeEmploymentType(get("employmentType")),
    status:            normalizeStatus(get("status")),
    salary:            get("salary"),
    bankAccountNo:     get("bankAccountNo"),
    bankName:          get("bankName"),
    ifscCode:          get("ifscCode"),
  };
}

function validateRow(t) {
  const errors = [];
  if (!t.firstName)    errors.push("First Name is required");
  if (!t.lastName)     errors.push("Last Name is required");
  if (!t.email)        errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.email)) errors.push("Invalid email format");
  if (!t.password)     errors.push("Password is required");
  if (!t.department)   errors.push("Department is required");
  if (!t.designation)  errors.push("Designation is required");
  if (!t.joiningDate)  errors.push("Joining Date is required");
  return errors;
}

function downloadTemplate() {
  const headers = [
    "First Name", "Last Name", "Email", "Password", "Employee Code",
    "Date of Birth", "Gender", "Phone", "Address", "City", "State", "ZIP",
    "Aadhaar Number", "PAN Number", "Blood Group", "Emergency Contact",
    "Medical Conditions", "Allergies",
    "Department", "Designation", "Qualification", "Experience Years",
    "Joining Date", "Employment Type", "Status",
    "Salary", "Bank Account", "Bank Name", "IFSC Code",
  ];
  const sample = [
    "Priya", "Sharma", "priya.sharma@school.com", "Teacher@123", "EMP001",
    "15-08-1990", "Female", "9876543210", "12 MG Road", "Bengaluru", "Karnataka", "560001",
    "234567890123", "ABCDE1234F", "B+", "9876543211",
    "None", "None",
    "Mathematics", "Senior Teacher", "M.Sc Mathematics", "5",
    "01-06-2024", "Full Time", "Active",
    "50000", "1234567890", "State Bank of India", "SBIN0001234",
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));

  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C2 = range.s.c; C2 <= range.e.c; ++C2) {
      const ref = XLSX.utils.encode_cell({ c: C2, r: R });
      if (!ws[ref]) continue;
      ws[ref].t = "s";
      ws[ref].z = "@";
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Teachers");
  XLSX.writeFile(wb, "teacher_bulk_import_template.xlsx");
}

// ── Status badge ──────────────────────────────────────────────────────────────
function RowBadge({ status, errors }) {
  if (status === "success")
    return <span style={badge("#15803d","#dcfce7","#bbf7d0")}><CheckCircle size={11}/> Imported</span>;
  if (status === "error")
    return <span style={badge("#dc2626","#fee2e2","#fecaca")}><AlertCircle size={11}/> Failed</span>;
  if (errors?.length)
    return <span style={badge("#d97706","#fef3c7","#fde68a")}><AlertCircle size={11}/> {errors.length} issue{errors.length>1?"s":""}</span>;
  return <span style={badge("#15803d","#f0fdf4","#bbf7d0")}>Ready</span>;
}
const badge = (color, bg, border) => ({
  display:"inline-flex", alignItems:"center", gap:4,
  fontSize:10, fontWeight:700, padding:"3px 8px",
  borderRadius:20, color, background:bg, border:`1px solid ${border}`,
  fontFamily:"'Inter',sans-serif",
});

// ── Shared input style ────────────────────────────────────────────────────────
const F = { fontFamily:"'Inter',sans-serif" };

export default function BulkImportTeachers({ onClose, onSuccess }) {
  const [file, setFile]           = useState(null);
  const [rows, setRows]           = useState([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [step, setStep]           = useState("upload"); // upload | preview | done
  const [unmapped, setUnmapped]   = useState([]);
  const fileRef = useRef();

  // ── Parse uploaded file ───────────────────────────────────────────────────
  const parseFile = useCallback((f) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb  = XLSX.read(e.target.result, { type:"array", cellDates:true });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });
        if (raw.length < 2) { alert("File needs a header row and at least one data row."); return; }

        const [headerRow, ...dataRows] = raw;
        const headerMap = {};
        const unmappedCols = [];
        headerRow.forEach((h, i) => {
          const field = resolveHeader(String(h));
          if (field) headerMap[field] = i;
          else if (String(h).trim()) unmappedCols.push(String(h));
        });
        setUnmapped(unmappedCols);

        const parsed = dataRows
          .filter((r) => r.some((c) => c !== ""))
          .map((r, i) => {
            const teacher = parseRow(r, headerMap);
            const errors  = validateRow(teacher);
            return { _idx: i + 2, teacher, errors, status: "pending" };
          });

        setRows(parsed);
        setStep("preview");
      } catch (ex) {
        alert("Failed to parse file: " + ex.message);
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    const valid = rows.filter((r) => r.errors.length === 0);
    if (!valid.length) return;
    setImporting(true);

    try {
      const res = await fetch(`${API}/api/teachers/bulk-import`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify({ teachers: valid.map((r) => r.teacher) }),
      });
      const data = await res.json();
      const updated = [...rows];

      if (Array.isArray(data.results)) {
        data.results.forEach((result) => {
          const validRow = valid[result.row - 1];
          if (!validRow) return;
          const idx = updated.findIndex((x) => x._idx === validRow._idx);
          if (idx === -1) return;
          updated[idx] = { ...updated[idx], status: result.success ? "success" : "error", serverError: result.error || null };
        });
      } else {
        const msg = data.error || "Import failed";
        valid.forEach((row) => {
          const idx = updated.findIndex((x) => x._idx === row._idx);
          if (idx !== -1) updated[idx] = { ...updated[idx], status:"error", serverError:msg };
        });
      }
      setRows(updated);
    } catch {
      setRows(rows.map((r) => r.errors.length === 0
        ? { ...r, status:"error", serverError:"Network error" }
        : r
      ));
    }

    setImporting(false);
    setStep("done");
    onSuccess?.();
  };

  const validCount   = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.filter((r) => r.errors.length > 0).length;
  const successCount = rows.filter((r) => r.status === "success").length;
  const failCount    = rows.filter((r) => r.status === "error").length;

  // ── Steps ─────────────────────────────────────────────────────────────────
  const STEPS = [
    { id:"upload",  shortLabel:"1. Upload",  fullLabel:"1. Upload File" },
    { id:"preview", shortLabel:"2. Preview", fullLabel:"2. Preview & Validate" },
    { id:"done",    shortLabel:"3. Results", fullLabel:"3. Import Results" },
  ];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>

      <style>{`
        * { font-family:'Inter',sans-serif; box-sizing:border-box; }
        .bi-backdrop { position:fixed; inset:0; z-index:50; display:flex; align-items:flex-end; justify-content:center; background:rgba(20,30,40,0.45); backdrop-filter:blur(4px); }
        @media(min-width:640px) { .bi-backdrop { align-items:center; } }
        .bi-modal { width:100%; max-width:860px; background:#fff; display:flex; flex-direction:column; border-radius:20px 20px 0 0; max-height:95vh; overflow:hidden; box-shadow:0 24px 80px rgba(20,30,40,0.22); }
        @media(min-width:640px) { .bi-modal { border-radius:16px; margin:16px; max-width:calc(100% - 32px); } }
        .bi-scroll { overflow-y:auto; flex:1; }
        .bi-drag-handle { display:flex; justify-content:center; padding-top:10px; }
        @media(min-width:640px) { .bi-drag-handle { display:none; } }
        .bi-table { width:100%; border-collapse:collapse; font-size:12px; min-width:500px; }
        .bi-table th { padding:10px 12px; text-align:left; font-weight:700; color:${C.secondary}; background:${C.bgSoft}; border-bottom:1px solid ${C.border}; white-space:nowrap; }
        .bi-table td { padding:9px 12px; border-bottom:1px solid ${C.borderSoft}; vertical-align:middle; }
        .bi-table tr:last-child td { border-bottom:none; }
        .bi-btn-ghost { display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 16px; border-radius:10px; font-size:13px; font-weight:600; border:1.5px solid ${C.border}; background:#fff; color:${C.secondary}; cursor:pointer; transition:all 0.13s; }
        .bi-btn-ghost:hover { background:${C.bgSoft}; border-color:#C8DCF0; }
        .bi-btn-primary { display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 22px; border-radius:10px; font-size:13px; font-weight:700; border:none; background:${C.primary}; color:#fff; cursor:pointer; transition:all 0.13s; box-shadow:0 2px 12px rgba(36,51,64,0.22); }
        .bi-btn-primary:hover:not(:disabled) { background:#384959; transform:translateY(-1px); box-shadow:0 4px 18px rgba(36,51,64,0.28); }
        .bi-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .bi-btn-green { display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 22px; border-radius:10px; font-size:13px; font-weight:700; border:none; background:#15803d; color:#fff; cursor:pointer; transition:all 0.13s; }
        .bi-info { border-radius:12px; padding:14px 16px; background:#eff6ff; border:1px solid #bfdbfe; }
        .bi-warn { border-radius:10px; padding:10px 14px; background:#fffbeb; border:1px solid #fde68a; display:flex; align-items:flex-start; gap:8px; }
        .bi-dropzone { border-radius:16px; border:2px dashed; padding:40px 24px; display:flex; flex-direction:column; align-items:center; gap:16px; cursor:pointer; transition:all 0.15s; }
        .bi-summary-pill { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; }
        .bi-expand-btn { display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; background:none; border:none; cursor:pointer; color:#d97706; }
        @keyframes bi-spin { to { transform:rotate(360deg); } }
        .bi-spin { animation:bi-spin 0.9s linear infinite; }
        .sm-hide { display:none; }
        @media(min-width:560px) { .sm-hide { display:table-cell; } .sm-show { display:none; } }
      `}</style>

      <div className="bi-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bi-modal">

          {/* Mobile handle */}
          <div className="bi-drag-handle">
            <div style={{ width:36, height:4, borderRadius:4, background:"#d1d5db" }}/>
          </div>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px 14px 20px", background:C.primary, borderBottom:`1px solid rgba(255,255,255,0.08)` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
              <div style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <FileSpreadsheet size={18} color="#fff"/>
              </div>
              <div style={{ minWidth:0 }}>
                <h2 style={{ ...F, margin:0, fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"-0.02em" }}>Bulk Import Teachers</h2>
                <p style={{ ...F, margin:0, fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:1 }}>Upload Excel / CSV to register multiple teachers at once</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, background:"rgba(255,255,255,0.1)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", flexShrink:0 }}>
              <X size={15}/>
            </button>
          </div>

          {/* Step indicator */}
          <div style={{ display:"flex", alignItems:"center", padding:"10px 20px", background:C.bgSoft, borderBottom:`1px solid ${C.border}`, gap:2 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display:"flex", alignItems:"center" }}>
                {i > 0 && <div style={{ width:20, height:1, background:C.border, margin:"0 6px" }}/>}
                <span style={{ ...F, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, background:step===s.id ? C.primary : "transparent", color:step===s.id ? "#fff" : C.secondary, transition:"all 0.15s", whiteSpace:"nowrap" }}>
                  <span style={{ display:"none" }}>{s.shortLabel}</span>
                  <span>{s.fullLabel}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="bi-scroll" style={{ padding:"20px", display:"flex", flexDirection:"column", gap:16 }}>

            {/* ── STEP 1: Upload ─────────────────────────────────────────── */}
            {step === "upload" && (
              <>
                {/* Tips */}
                <div className="bi-info">
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                    <Info size={13} color="#1d4ed8"/>
                    <span style={{ ...F, fontSize:12, fontWeight:700, color:"#1d4ed8" }}>Data Entry Tips</span>
                  </div>
                  <ul style={{ margin:0, paddingLeft:0, listStyle:"none", display:"flex", flexDirection:"column", gap:5 }}>
                    {[
                      ["Download Template", "Start with the .xlsx template below — all columns are pre-formatted as text."],
                      ["Required Fields", "First Name, Last Name, Email, Password, Department, Designation, and Joining Date are mandatory."],
                      ["Date Format", "Use DD-MM-YYYY (e.g. 15-08-1990) for Date of Birth and Joining Date."],
                      ["Employment Type", "Use: Full Time, Part Time, Contract, or Temporary."],
                      ["Blood Group", "Use standard notation: A+, B-, O+, AB+, etc."],
                      ["Aadhaar", "Enter as text to prevent Excel converting to scientific notation."],
                    ].map(([title, desc]) => (
                      <li key={title} style={{ ...F, fontSize:11, color:"#1e40af" }}>
                        • <strong>{title}:</strong> {desc}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Template download */}
                <button onClick={downloadTemplate} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:10, fontSize:12, fontWeight:700, background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#15803d", cursor:"pointer" }}>
                  <Download size={14}/> Download Sample Template (.xlsx)
                </button>

                {/* Drop zone */}
                <label
                  className="bi-dropzone"
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  style={{ borderColor: dragOver ? C.accent : C.border, background: dragOver ? `${C.accent}12` : C.bgSoft }}
                >
                  <div style={{ width:64, height:64, borderRadius:18, background:`${C.primary}14`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Upload size={28} color={C.primary}/>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ ...F, margin:0, fontWeight:700, fontSize:13, color:C.primary }}>Drop your Excel or CSV file here</p>
                    <p style={{ ...F, margin:"4px 0 0", fontSize:11, color:C.secondary }}>or click to browse · .xlsx, .xls, .csv supported</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])}/>
                </label>
              </>
            )}

            {/* ── STEP 2: Preview ────────────────────────────────────────── */}
            {step === "preview" && (
              <>
                {/* Summary pills */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {[
                    { label:"Total Rows", val:rows.length, color:C.primary },
                    { label:"Valid",      val:validCount,  color:"#15803d" },
                    { label:"Has Issues", val:invalidCount, color:"#d97706" },
                  ].map((p) => (
                    <span key={p.label} className="bi-summary-pill" style={{ background:`${p.color}12`, border:`1px solid ${p.color}30`, color:p.color }}>
                      {p.val} {p.label}
                    </span>
                  ))}
                </div>

                {/* Unmapped warning */}
                {unmapped.length > 0 && (
                  <div className="bi-warn">
                    <AlertCircle size={13} color="#f59e0b" style={{ flexShrink:0, marginTop:1 }}/>
                    <span style={{ ...F, fontSize:11, color:"#92400e" }}>
                      <strong>Columns ignored (not recognized):</strong> {unmapped.join(", ")}
                    </span>
                  </div>
                )}

                {/* File name + re-upload */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 14px", borderRadius:10, background:C.bgSoft, border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <FileSpreadsheet size={13} color={C.secondary}/>
                    <span style={{ ...F, fontSize:12, fontWeight:600, color:C.primary }}>{file?.name}</span>
                  </div>
                  <button onClick={() => { setStep("upload"); setRows([]); setFile(null); }} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:C.secondary, background:"none", border:"none", cursor:"pointer" }}>
                    <RefreshCw size={11}/> Change file
                  </button>
                </div>

                {/* Table */}
                <div style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
                  <div style={{ overflowX:"auto" }}>
                    <table className="bi-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Name</th>
                          <th className="sm-hide">Email</th>
                          <th className="sm-hide">Dept / Designation</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <React.Fragment key={row._idx}>
                            <tr style={{ background: row.errors.length ? "#fffbeb" : "#fff" }}>
                              <td style={{ ...F, color:C.secondary, fontVariantNumeric:"tabular-nums" }}>#{row._idx}</td>
                              <td>
                                <span style={{ ...F, fontWeight:600, color:C.primary, display:"block" }}>
                                  {row.teacher.firstName} {row.teacher.lastName}
                                </span>
                                <span style={{ ...F, fontSize:10, color:C.secondary, display:"block" }} className="sm-show">
                                  {row.teacher.email || "—"}
                                </span>
                              </td>
                              <td className="sm-hide" style={{ ...F, color:C.secondary, maxWidth:160 }}>
                                <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {row.teacher.email || "—"}
                                </span>
                              </td>
                              <td className="sm-hide" style={{ ...F, color:C.secondary }}>
                                {row.teacher.department || "—"} · {row.teacher.designation || "—"}
                              </td>
                              <td><RowBadge status={row.status} errors={row.errors}/></td>
                              <td>
                                {row.errors.length > 0 && (
                                  <button className="bi-expand-btn" onClick={() => setExpanded(expanded === row._idx ? null : row._idx)}>
                                    {expanded === row._idx ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                                    Details
                                  </button>
                                )}
                              </td>
                            </tr>
                            {expanded === row._idx && row.errors.length > 0 && (
                              <tr>
                                <td colSpan={6} style={{ background:"#fffbeb", padding:"8px 14px", borderBottom:`1px solid ${C.borderSoft}` }}>
                                  <ul style={{ margin:0, paddingLeft:0, listStyle:"none", display:"flex", flexDirection:"column", gap:3 }}>
                                    {row.errors.map((e, i) => (
                                      <li key={i} style={{ ...F, fontSize:11, fontWeight:600, color:"#b45309" }}>· {e}</li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {invalidCount > 0 && (
                  <p style={{ ...F, fontSize:11, color:C.secondary, margin:0 }}>
                    Rows with issues will be <strong>skipped</strong>. Only <strong>{validCount}</strong> valid rows will be imported.
                  </p>
                )}
              </>
            )}

            {/* ── STEP 3: Done ───────────────────────────────────────────── */}
            {step === "done" && (
              <>
                {/* Result banner */}
                <div style={{ borderRadius:14, padding:"20px 24px", textAlign:"center", background: successCount > 0 ? "#f0fdf4" : "#fef2f2", border:`1px solid ${successCount > 0 ? "#bbf7d0" : "#fecaca"}` }}>
                  <CheckCircle size={32} color={successCount > 0 ? "#16a34a" : "#dc2626"} style={{ marginBottom:10 }}/>
                  <p style={{ ...F, margin:0, fontWeight:700, fontSize:15, color: successCount > 0 ? "#15803d" : "#dc2626" }}>
                    {successCount > 0 ? `${successCount} teacher${successCount !== 1 ? "s" : ""} imported successfully!` : "Import failed"}
                  </p>
                  {failCount > 0 && <p style={{ ...F, margin:"6px 0 0", fontSize:12, color:"#dc2626" }}>{failCount} row(s) failed — check details below</p>}
                  {invalidCount > 0 && <p style={{ ...F, margin:"4px 0 0", fontSize:12, color:"#d97706" }}>{invalidCount} row(s) skipped due to validation issues</p>}
                </div>

                {/* Results table */}
                <div style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
                  <div style={{ overflowX:"auto" }}>
                    <table className="bi-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Name</th>
                          <th className="sm-hide">Email</th>
                          <th>Result</th>
                          <th className="sm-hide">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row._idx} style={{ background: row.status==="success" ? "#f0fdf4" : row.status==="error" ? "#fef2f2" : row.errors.length ? "#fffbeb" : "#fff" }}>
                            <td style={{ ...F, color:C.secondary }}>#{row._idx}</td>
                            <td>
                              <span style={{ ...F, fontWeight:600, color:C.primary, display:"block" }}>{row.teacher.firstName} {row.teacher.lastName}</span>
                              {(row.serverError || row.errors[0]) && (
                                <span className="sm-show" style={{ ...F, fontSize:10, color:"#dc2626", display:"block" }}>{row.serverError || row.errors[0]}</span>
                              )}
                            </td>
                            <td className="sm-hide" style={{ ...F, color:C.secondary }}>{row.teacher.email}</td>
                            <td><RowBadge status={row.status} errors={row.errors}/></td>
                            <td className="sm-hide" style={{ ...F, fontSize:11, color:"#dc2626" }}>{row.serverError || (row.errors.length ? row.errors[0] : "")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", background:C.bgSoft, borderTop:`1px solid ${C.border}`, gap:10, flexWrap:"wrap" }}>
            <button className="bi-btn-ghost" onClick={onClose}>
              <X size={13}/> {step === "done" ? "Close" : "Cancel"}
            </button>
            <div style={{ display:"flex", gap:10 }}>
              {step === "preview" && (
                <button className="bi-btn-primary" onClick={handleImport} disabled={importing || validCount === 0}>
                  {importing
                    ? <><Loader2 size={14} className="bi-spin"/> Importing…</>
                    : <><Users size={14}/> Import {validCount} Teacher{validCount !== 1 ? "s" : ""}</>
                  }
                </button>
              )}
              {step === "done" && successCount > 0 && (
                <button className="bi-btn-green" onClick={onClose}>
                  <CheckCircle size={14}/> Done
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}