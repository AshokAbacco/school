// admin/pages/students/BulkImportStudents.jsx
// Drop an Excel/CSV → preview → bulk register students
import React, { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Users,
  Info,
  RefreshCw,
} from "lucide-react";
import { getToken } from "../../../auth/storage";
import { COLORS } from "./components/FormFields";

const API = import.meta.env.VITE_API_URL;
const auth = () => ({ Authorization: `Bearer ${getToken()}` });

// ── Column mapping: CSV header → internal field key ─────────────────────────
// Flexible: accepts multiple aliases per field
const COLUMN_MAP = {
  // Personal
  firstName: ["first name", "firstname", "first_name", "fname"],
  lastName: ["last name", "lastname", "last_name", "lname"],
  dateOfBirth: ["dob", "date of birth", "dateofbirth", "birth date", "birthdate"],
  gender: ["gender", "sex"],
  email: ["email", "student email", "student_email"],
  phone: ["phone", "mobile", "contact", "phone number"],
  address: ["address", "street address"],
  city: ["city"],
  state: ["state"],
  zipCode: ["zip", "zipcode", "pincode", "pin code", "postal code"],
  aadhaarNumber: ["aadhaar", "aadhar", "aadhaar number", "aadhar number"],
  panNumber: ["pan", "pan number", "pannumber"],
  satsNumber: ["sats", "sats number", "satsnumber"],
  nationality: ["nationality"],
  religion: ["religion"],
  casteCategory: ["caste", "caste category", "castecategory"],
  motherTongue: ["mother tongue", "mothertongue", "native language"],
  subcaste: ["subcaste", "sub caste", "sub-caste"],
  domicileState: ["domicile", "domicile state"],
  annualIncome: ["annual income", "annualincome", "income"],
  physicallyChallenged: ["physically challenged", "disabled", "disability"],
  disabilityType: ["disability type", "disabilitytype"],

  // Login
  loginEmail: ["login email", "loginemail", "username"],
  password: ["password", "pass"],

  // Academic
  admissionNumber: ["admission no", "admission number", "admno", "adm no", "admissionnumber"],
  classSectionName: ["class", "section", "class section", "classsection", "grade section"],
  academicYearName: ["academic year", "academicyear", "year"],
  rollNumber: ["roll no", "roll number", "rollno", "rollnumber"],
  externalId: ["external id", "board roll no", "university reg no", "externalid"], // ✅ ADDED
  admissionDate: ["admission date", "admissiondate", "joining date"],

  status: ["status", "student status"],
  previousSchoolName: ["previous school", "prev school", "previousschool"],
  previousSchoolBoard: ["previous board", "prev board", "board"],
  udiseCode: ["udise", "udise code", "udisecode"],
  lateralEntry: ["lateral entry", "lateralentry"],

  // ── Parent – Father (also displayed as "Parent Name" in the template for backward compatibility) ──
  parentName: ["parent name", "father name", "fathername", "father"],
  parentPhone: ["parent phone", "father phone", "fatherphone", "father mobile"],
  parentEmail: ["parent email", "father email", "fatheremail"],
  parentOccupation: ["parent occupation", "father occupation", "fatheroccupation"],
  fatherAadhaarNumber: ["father aadhaar", "father aadhar", "father aadhaar number"],
  emergencyContact: ["emergency contact", "emergencycontact", "emergency"],

  // ── Parent – Mother ──
  motherName: ["mother name", "mothername", "mother"],
  motherPhone: ["mother phone", "motherphone", "mother mobile"],
  motherEmail: ["mother email", "motheremail"],
  motherOccupation: ["mother occupation", "motheroccupation"],
  motherAadhaarNumber: ["mother aadhaar", "mother aadhar", "mother aadhaar number"],

  // ── Guardian (optional, separate from Father/Mother) ──
  guardianName: ["guardian name", "guardianname"],
  guardianRelation: ["guardian relation", "guardianrelation"],
  guardianPhone: ["guardian phone", "guardianphone"],
  guardianEmail: ["guardian email", "guardianemail"],
  guardianOccupation: ["guardian occupation", "guardianoccupation"],

  // ── Login (only ONE parent — Father or Mother — may get portal login) ──
  loginFor: ["login for", "parent login relation", "loginfor"], // value: FATHER or MOTHER, blank = no login
  parentPassword: ["parent password", "parent login password", "ppass"],

  // ── Bank Details ──
  bankAccountNumber: ["bank account number", "account number", "bank account no", "accountnumber"],
  ifscCode: ["ifsc", "ifsc code", "ifsccode"],
  bankName: ["bank name", "bankname"],
  bankBranch: ["bank branch", "branch", "bankbranch"],

  // ── Boarding type ──
  boardingType: ["boarding type", "hostel or day scholar", "boardingtype"], // value: HOSTEL or DAY_SCHOLAR

  // Health
  bloodGroup: ["blood group", "blood", "bloodgroup", "blood type"],
  heightCm: ["height", "height cm", "heightcm"],
  weightKg: ["weight", "weight kg", "weightkg"],
  identifyingMarks: ["identifying marks", "birthmarks", "marks"],
  medicalConditions: ["medical conditions", "medical", "health conditions"],
  allergies: ["allergies", "allergy"],
};

// ── Normalize a raw header string to a field key ─────────────────────────────
function resolveHeader(raw) {
  const lower = raw.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.includes(lower)) return field;
  }
  return null;
}

// ── Normalize common field values ─────────────────────────────────────────────
function normalizeGender(v) {
  if (!v) return "";
  const up = v.toString().toUpperCase().trim();
  if (up === "M" || up === "MALE") return "MALE";
  if (up === "F" || up === "FEMALE") return "FEMALE";
  return "OTHER";
}

function normalizeBlood(v) {
  if (!v) return "";
  return v.toString().toUpperCase().trim()
    .replace(/\+/, "_POS").replace(/-/, "_NEG")
    .replace(/\s/g, "");
}

function normalizeBool(v) {
  if (!v) return false;
  const s = v.toString().toLowerCase().trim();
  return s === "yes" || s === "true" || s === "1";
}

function normalizeCaste(v) {
  if (!v) return "";
  const up = v.toString().toUpperCase().trim();
  const valid = ["SC", "ST", "OBC", "GM", "OTHER"];
  return valid.includes(up) ? up : "";
}

function normalizeBoard(v) {
  if (!v) return "";
  const up = v.toString().toUpperCase().trim();
  const valid = ["KSEEB","CBSE","ICSE","NIOS","IB","IGCSE","STATE","OTHER"];
  return valid.includes(up) ? up : "OTHER";
}

function normalizeStatus(v) {
  if (!v) return "ACTIVE";
  const up = v.toString().toUpperCase().trim();
  const valid = ["ACTIVE","INACTIVE","SUSPENDED","GRADUATED"];
  return valid.includes(up) ? up : "ACTIVE";
}

function parseRow(rawRow, headerMap) {
  const get = (field) => {
    const colIdx = headerMap[field];
    if (colIdx === undefined) return "";
    const v = rawRow[colIdx];
    return v !== undefined && v !== null ? v.toString().trim() : "";
  };

  return {
    // ── Personal & Identity ──────────────────────────────────────────────────
    firstName: get("firstName"),
    lastName: get("lastName"),
    dateOfBirth: get("dateOfBirth"),
    gender: normalizeGender(get("gender")),
    email: get("email"),
    phone: get("phone"),
    address: get("address"),
    city: get("city"),
    state: get("state"),
    zipCode: get("zipCode"),
    aadhaarNumber: get("aadhaarNumber"),
    panNumber: get("panNumber"),            // ✅ ADDED
    satsNumber: get("satsNumber"),           // ✅ ADDED
    nationality: get("nationality") || "Indian",
    religion: get("religion"),
    casteCategory: normalizeCaste(get("casteCategory")),
    motherTongue: get("motherTongue"),
    subcaste: get("subcaste"),
    domicileState: get("domicileState") || "Karnataka",
    annualIncome: get("annualIncome"),
    physicallyChallenged: normalizeBool(get("physicallyChallenged")),
    disabilityType: get("disabilityType"),

    // ── Student Login ────────────────────────────────────────────────────────
    loginEmail: get("loginEmail") || get("email"),
    password: get("password"),

    // ── Academic Enrollment ──────────────────────────────────────────────────
    admissionNumber: get("admissionNumber"),
    classSectionName: get("classSectionName"),
    academicYearName: get("academicYearName"),
    rollNumber: get("rollNumber"),
    externalId: get("externalId"),
    admissionDate: get("admissionDate"),
    status: normalizeStatus(get("status")),
    previousSchoolName: get("previousSchoolName"),
    previousSchoolBoard: normalizeBoard(get("previousSchoolBoard")),
    udiseCode: get("udiseCode"),
    lateralEntry: normalizeBool(get("lateralEntry")),

    // ── Unified Parent Account (Replaces separate Father/Mother fields) ──────
    // ── Father — always saved regardless of login ──
    parentName: get("parentName"),
    parentPhone: get("parentPhone"),
    parentEmail: get("parentEmail"),
    parentOccupation: get("parentOccupation"),
    fatherAadhaarNumber: get("fatherAadhaarNumber"),
    emergencyContact: get("emergencyContact"),

    // ── Mother — always saved regardless of login ──
    motherName: get("motherName"),
    motherPhone: get("motherPhone"),
    motherEmail: get("motherEmail"),
    motherOccupation: get("motherOccupation"),
    motherAadhaarNumber: get("motherAadhaarNumber"),

    // ── Guardian — always saved, never gets a login ──
    guardianName: get("guardianName"),
    guardianRelation: get("guardianRelation"),
    guardianPhone: get("guardianPhone"),
    guardianEmail: get("guardianEmail"),
    guardianOccupation: get("guardianOccupation"),

    // ── Login — exactly ONE parent (FATHER or MOTHER), blank = no login ──
    loginFor: get("loginFor").toUpperCase(),
    parentPassword: get("parentPassword"),

    // ── Bank Details ──
    bankAccountNumber: get("bankAccountNumber"),
    ifscCode: get("ifscCode").toUpperCase(),
    bankName: get("bankName"),
    bankBranch: get("bankBranch"),

    // ── Boarding type ──
    boardingType: get("boardingType").toUpperCase().replace(/\s+/g, "_"),

    // ── Health Measurements ──────────────────────────────────────────────────
    bloodGroup: normalizeBlood(get("bloodGroup")),
    heightCm: get("heightCm"),
    weightKg: get("weightKg"),
    identifyingMarks: get("identifyingMarks"),
    medicalConditions: get("medicalConditions"),
    allergies: get("allergies"),
  };
}

// ── Validate a parsed student row ─────────────────────────────────────────────
function validateRow(s, idx) {
  const errors = [];
  if (!s.firstName) errors.push("First Name is required");
  // if (!s.lastName) errors.push("Last Name is required");
  if (!s.email) errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))
    errors.push("Invalid email format");
  if (!s.password) errors.push("Password is required");
  if (!s.admissionNumber) errors.push("Admission Number is required");
  if (!s.classSectionName) errors.push("Class Section is required");
  if (!s.academicYearName) errors.push("Academic Year is required");
  if (s.loginFor && !["FATHER", "MOTHER"].includes(s.loginFor))
    errors.push(`"Login For" must be FATHER, MOTHER, or left blank (got "${s.loginFor}")`);
  if (s.loginFor === "FATHER" && !s.parentEmail)
    errors.push(`"Login For" is FATHER but Father Email is missing`);
  if (s.loginFor === "MOTHER" && !s.motherEmail)
    errors.push(`"Login For" is MOTHER but Mother Email is missing`);
  return errors;
}

function downloadTemplate() {
  const headers = [
    "First Name", "Last Name", "DOB", "Gender", "Email", "Password", "Phone",
    "Address", "City", "State", "ZIP", "Aadhaar", "PAN Number", "SATS Number",
    "Nationality", "Religion", "Caste Category", "Mother Tongue", "Subcaste",
    "Domicile State", "Annual Income", "Physically Challenged", "Disability Type",
    "Admission No", "Class Section", "Academic Year", "Roll No", "External ID",
    "Admission Date", "Status", "Previous School", "Previous Board", "UDISE Code", "Lateral Entry",
    "Parent Name", "Father Phone", "Father Email", "Father Occupation", "Father Aadhaar",
    "Mother Name", "Mother Phone", "Mother Email", "Mother Occupation", "Mother Aadhaar",
    "Guardian Name", "Guardian Relation", "Guardian Phone", "Guardian Email", "Guardian Occupation",
    "Login For", "Parent Password",
    "Bank Account Number", "IFSC Code", "Bank Name", "Bank Branch",
    "Boarding Type",
    "Emergency Contact", "Blood Group", "Height CM", "Weight KG",
    "Identifying Marks", "Medical Conditions", "Allergies",
  ];

  // IMPORTANT: Wrapped numbers in quotes "" to tell JavaScript these are strings, not math numbers
  const sample = [
    "Rahul", "Kumar", "15-06-2008", "Male", "rahul@school.com", "Pass@123", "9876543210",
    "123 MG Road", "Bengaluru", "Karnataka", "560001",
    "123456789012", // Aadhaar as String
    "ABCDE1234F",
    "123456789",    // SATS as String
    "Indian", "Hindu", "OBC", "Kannada", "Vokkaliga",
    "Karnataka", "300000", "No", "",
    "ADM2024001", "10-A", "2024-25", "1", "REG-998877",
    "01-06-2024", "ACTIVE", "St. Mary's School", "KSEEB",
    "29140100102",  // UDISE as String
    "No",
    "Suresh Kumar", "9876543211", "suresh@gmail.com", "Engineer", "123456789012",
    "Lakshmi Kumar", "9876543212", "lakshmi@gmail.com", "Teacher", "123456789013",
    "", "", "", "", "", // Guardian — leave blank if not applicable
    "FATHER", "Parent@123",   // Login For + Parent Password (only used if Login For is set)
    "1234567890123456", "SBIN0001234", "State Bank of India", "MG Road Branch",
    "DAY_SCHOLAR",
    "9876543211", "O+", "165", "55", "Mole on right hand",
    "None", "None",
  ];

  const wb = XLSX.utils.book_new();

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);

  // 1. Set column widths
  ws["!cols"] = headers.map(() => ({ wch: 22 }));

  // 2. Force Global Text Format
  // This is the CRITICAL part for Aadhaar. It sets the Excel cell format to '@' (Text).
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);

      if (!ws[cell_ref]) continue;

      // Set format to 'Text' for all cells
      ws[cell_ref].t = 's'; // Type: String
      ws[cell_ref].z = '@'; // Excel Format: Text
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "student_bulk_import_template.xlsx");
}

// ── Status badge ──────────────────────────────────────────────────────────────
function RowStatus({ status, errors }) {
  if (status === "success")
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-green-600">
        <CheckCircle size={12} /> Imported
      </span>
    );
  if (status === "error")
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-red-500">
        <AlertCircle size={12} /> Failed
      </span>
    );
  if (errors?.length)
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
        <AlertCircle size={12} /> {errors.length} issue{errors.length > 1 ? "s" : ""}
      </span>
    );
  return (
    <span className="text-xs font-semibold text-emerald-600">Ready</span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BulkImportStudents({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);        // parsed + validated rows
  const [importing, setImporting] = useState(false);
  // const [results, setResults] = useState([]);        // per-row import results
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [step, setStep] = useState("upload"); // upload | preview | done
  const [unmappedCols, setUnmappedCols] = useState([]);
  const [limitStatus, setLimitStatus] = useState(null); // { used, limit }

  const fileRef = useRef();

  // ── Fetch live limit on mount ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/students/limit-status`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (r.ok) setLimitStatus(await r.json());
      } catch { /* non-critical */ }
    })();
  }, []);

  // ── Parse file ────────────────────────────────────────────────────────────
  const parseFile = useCallback((f) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (raw.length < 2) {
          alert("File must have a header row and at least one data row.");
          return;
        }

        const [headerRow, ...dataRows] = raw;

        // Build header → field mapping
        const headerMap = {};
        const unmapped = [];
        headerRow.forEach((h, i) => {
          const field = resolveHeader(String(h));
          if (field) headerMap[field] = i;
          else if (String(h).trim()) unmapped.push(String(h));
        });

        setUnmappedCols(unmapped);

        // Parse and validate
        const parsed = dataRows
          .filter((r) => r.some((c) => c !== ""))
          .map((r, i) => {
            const student = parseRow(r, headerMap);
            const errors = validateRow(student, i);
            return { _idx: i + 2, student, errors, status: "pending" };
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
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  // ── Import all valid rows ─────────────────────────────────────────────────
  const handleImport = async () => {
    const valid = rows.filter((r) => r.errors.length === 0);
    if (!valid.length) return;

    setImporting(true);
    let updatedRows = [...rows]; // ← HOIST HERE

    try {
      const response = await fetch(`${API}/api/students/bulk-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ students: valid.map((r) => r.student) }),
      });

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error(data.message || "Invalid server response");
      }

      if (response.ok && Array.isArray(data.results)) {
        // result.row is 1-based index into the valid[] array sent to backend
        data.results.forEach((result) => {
          const validRow = valid[result.row - 1]; // valid[0] = first sent student
          if (!validRow) return;
          const idx = updatedRows.findIndex((x) => x._idx === validRow._idx);
          if (idx === -1) return;
          updatedRows[idx] = {
            ...updatedRows[idx],
            status: result.success ? "success" : "error",
            serverError: result.success
              ? null
              : (result.error || result.detail || result.message || "Server rejected this row"),
          };
        });
      } else {
        // Whole batch rejected (limit exceeded, auth error, etc.)
        const errorMsg = data.message || "Import failed";
        valid.forEach((row) => {
          const idx = updatedRows.findIndex((x) => x._idx === row._idx);
          if (idx !== -1)
            updatedRows[idx] = { ...updatedRows[idx], status: "error", serverError: errorMsg };
        });
      }

      // Any valid row that got no result entry = server missed it
      updatedRows.forEach((row, index) => {
        if (row.status === "pending" && row.errors.length === 0) {
          updatedRows[index] = { ...row, status: "error", serverError: "No response from server for this row" };
        }
      });

    } catch (err) {
      updatedRows = rows.map((row) =>
        row.errors.length === 0
          ? { ...row, status: "error", serverError: "Network error" }
          : row
      );
    }

    setRows(updatedRows);
    setImporting(false);
    setStep("done");

    // ✅ FIXED: use local variable
    const hasSuccess = updatedRows.some((r) => r.status === "success");
    if (hasSuccess) {
      onSuccess?.();
      try {
        const r = await fetch(`${API}/api/students/limit-status`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (r.ok) setLimitStatus(await r.json());
      } catch { /* non-critical */ }
    }
  };

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.filter((r) => r.errors.length > 0).length;
  const successCount = rows.filter((r) => r.status === "success").length;
  const failCount = rows.filter((r) => r.status === "error").length;

  // ── Limit helpers ──────────────────────────────────────────────────────────
  const isUnlimited = limitStatus?.limit === null;
  const remainingSlots = (limitStatus && !isUnlimited)
    ? Math.max(0, limitStatus.limit - limitStatus.used)
    : Infinity;
  const limitPct = (limitStatus && !isUnlimited)
    ? Math.round((limitStatus.used / limitStatus.limit) * 100)
    : 0;
  const atLimit = !isUnlimited && remainingSlots === 0;
  const nearLimit = !isUnlimited && limitPct >= 80;
  // If file has more valid rows than remaining slots, warn (but backend will block extras)
  const exceedsSlots = !isUnlimited && validCount > remainingSlots;

  // ── Download Import Report ─────────────────────────────────────────────────
  const parseExistingForReport = (raw) => {
    if (!raw) return null;
    const emailMatch = raw.match(/\[Existing student:\s*(.+?)\s*\|\s*Email:\s*(.+?)\s*\|\s*Class:\s*(.+?)\s*\|\s*Year:\s*(.+?)\]/i);
    if (emailMatch) return { name: emailMatch[1], email: emailMatch[2], cls: emailMatch[3], year: emailMatch[4] };
    const admMatch = raw.match(/\[Existing student:\s*(.+?)\s*\|\s*Class:\s*(.+?)\s*\|\s*Year:\s*(.+?)\s*\|\s*Adm No:\s*(.+?)\]/i);
    if (admMatch)   return { name: admMatch[1], email: "", cls: admMatch[2], year: admMatch[3], admNo: admMatch[4] };
    return null;
  };

  const categoriseForReport = (row) => {
    if (row.status === "success") return { label: "✅ Imported", fix: "New student added successfully.", existing: null };
    const raw = row.serverError || row.errors.join(" | ") || "";
    const lo  = raw.toLowerCase();
    const existing = parseExistingForReport(raw);
    if (lo.includes("email") && (lo.includes("already registered") || lo.includes("already exists")))
      return { label: "🔁 Email Already Registered", fix: "Student with this email already exists. Skipped to avoid duplicates.", existing };
    if (lo.includes("admission no") && lo.includes("already exists"))
      return { label: "🔁 Admission No Already Taken", fix: `Adm No "${row.student.admissionNumber}" is already used. Change it and re-upload.`, existing };
    if (lo.includes("roll no") && lo.includes("already assigned"))
      return { label: "🔁 Roll No Conflict", fix: `Roll No "${row.student.rollNumber}" already assigned. Use a different roll number.`, existing };
    if (lo.includes("class") && lo.includes("not found"))
      return { label: "❌ Class Not Found", fix: `Class "${row.student.classSectionName}" not found. Check spelling in Settings → Classes.`, existing: null };
    if (lo.includes("academic year") && lo.includes("not found"))
      return { label: "❌ Academic Year Not Found", fix: `Year "${row.student.academicYearName}" not found. Create it in Settings first.`, existing: null };
    if (lo.includes("missing") || lo.includes("required"))
      return { label: "⚠️ Missing Field", fix: raw, existing: null };
    return { label: "❌ Server Error", fix: raw, existing: null };
  };

  const downloadImportReport = () => {
    const reportRows = rows.map((row) => {
      const { label, fix, existing } = categoriseForReport(row);
      return {
        "Row #":                    row._idx,
        "Admission No (Excel)":     row.student.admissionNumber || "",
        "First Name":               row.student.firstName || "",
        "Last Name":                row.student.lastName || "",
        "Email (Excel)":            row.student.email || "",
        "Class (Excel)":            row.student.classSectionName || "",
        "Academic Year":            row.student.academicYearName || "",
        "Status":                   label,
        "Already Exists: Name":     existing?.name  || "",
        "Already Exists: Email":    existing?.email || "",
        "Already Exists: Class":    existing?.cls   || "",
        "Already Exists: Year":     existing?.year  || "",
        "What Happened / Fix":      fix,
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportRows);
    ws["!cols"] = [
      { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 26 },
      { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 50 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import Report");

    const summaryData = [
      { "Summary": "Total Rows in File",          "Count": rows.length },
      { "Summary": "✅ Imported Successfully",     "Count": successCount },
      { "Summary": "❌ Failed (Server Rejected)",  "Count": failCount },
      { "Summary": "⚠️ Skipped (Missing Fields)", "Count": invalidCount },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 32 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const date = new Date().toLocaleDateString("en-IN").replace(/\//g, "-");
    XLSX.writeFile(wb, `Import_Report_${date}.xlsx`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm overflow-hidden">
      <div
        className="bulk-import-modal w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          background: "white",
          border: `1px solid ${COLORS.border}`,
          borderRadius: "20px 20px 0 0",
          maxHeight: "95vh",
        }}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div style={{ width: 36, height: 4, borderRadius: 4, background: "#d1d5db" }} />
        </div>
        <style>{`
          @media (min-width: 640px) {
            .bulk-import-modal { border-radius: 16px !important; margin: 16px; max-width: calc(100% - 32px); }
          }
        `}</style>
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: COLORS.primary,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">Bulk Import Students</h2>
              <p className="text-xs text-white/60 hidden sm:block">Upload Excel / CSV to register multiple students at once</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* ── Live limit badge ─────────────────────────────────────── */}
            {limitStatus && !isUnlimited && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{
                  background: atLimit ? "rgba(239,68,68,0.25)" : nearLimit ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.15)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <Users size={12} />
                <span>{limitStatus.used} / {limitStatus.limit} students</span>
              </div>
            )}
            {limitStatus && isUnlimited && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <Users size={12} /> Unlimited
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Steps indicator */}
        <div
          className="flex items-center px-4 sm:px-6 py-2.5 text-xs font-bold overflow-x-auto scrollbar-hide"
          style={{ background: `${COLORS.bgSoft}`, borderBottom: `1px solid ${COLORS.border}` }}
        >
          {[
            { id: "upload", label: "1. Upload", labelFull: "1. Upload File" },
            { id: "preview", label: "2. Preview", labelFull: "2. Preview & Validate" },
            { id: "done", label: "3. Results", labelFull: "3. Import Results" },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center shrink-0">
              {i > 0 && (
                <div className="w-4 sm:w-6 h-px mx-1.5 sm:mx-2" style={{ background: COLORS.border }} />
              )}
              <span
                className="px-2.5 sm:px-3 py-1 rounded-full transition-all whitespace-nowrap"
                style={{
                  background: step === s.id ? COLORS.primary : "transparent",
                  color: step === s.id ? "white" : COLORS.secondary,
                }}
              >
                <span className="sm:hidden">{s.label}</span>
                <span className="hidden sm:inline">{s.labelFull}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto" style={{ maxHeight: "calc(95vh - 180px)" }}>

          {/* ── Live Student Limit Bar ─────────────────────────────────────── */}
          {limitStatus && !isUnlimited && (
            <div
              className="rounded-xl p-3"
              style={{
                background: atLimit ? "#fef2f2" : nearLimit ? "#fffbeb" : "#f0fdf4",
                border: `1px solid ${atLimit ? "#fecaca" : nearLimit ? "#fde68a" : "#bbf7d0"}`,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Users size={13} style={{ color: atLimit ? "#dc2626" : nearLimit ? "#b45309" : "#15803d" }} />
                  <span className="text-xs font-bold" style={{ color: atLimit ? "#dc2626" : nearLimit ? "#b45309" : "#15803d" }}>
                    Student Slots Used
                  </span>
                </div>
                <span className="text-xs font-extrabold" style={{ color: atLimit ? "#dc2626" : nearLimit ? "#b45309" : "#15803d" }}>
                  {limitStatus.used} / {limitStatus.limit}
                  {!isUnlimited && remainingSlots > 0 && (
                    <span className="font-normal ml-1">({remainingSlots} remaining)</span>
                  )}
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: atLimit ? "#fecaca" : nearLimit ? "#fde68a" : "#bbf7d0" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(limitPct, 100)}%`,
                    background: atLimit ? "#dc2626" : nearLimit ? "#b45309" : "#15803d",
                  }}
                />
              </div>
              {atLimit && (
                <p className="text-[11px] font-semibold mt-1.5" style={{ color: "#dc2626" }}>
                  ⚠ Student limit reached. You cannot import any more students. Please upgrade your plan.
                </p>
              )}
              {exceedsSlots && !atLimit && (
                <p className="text-[11px] font-semibold mt-1.5" style={{ color: "#b45309" }}>
                  ⚠ Your file has {validCount} valid students but only {remainingSlots} slot{remainingSlots !== 1 ? "s" : ""} remain. Only the first {remainingSlots} will be imported; the rest will fail.
                </p>
              )}
            </div>
          )}
          {/* ──────────────────────────────────────────────────────────────── */}

          {/* ── STEP 1: Upload ────────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Instructions */}
              {/* Instructions / How it works */}
              <div
                className="rounded-xl p-4 text-sm space-y-2"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
              >
                <div className="flex items-center gap-2 font-bold" style={{ color: "#1d4ed8" }}>
                  <Info size={14} /> Data Entry Tips
                </div>
                <ul className="text-xs space-y-1.5" style={{ color: "#1e40af" }}>
                  <li>
                    • <strong>Download Template:</strong> Start by downloading the <code>.xlsx</code> template below and filling in your student data.
                  </li>
                  <li>
                    • <strong>Date Format:</strong> Use the Indian format <strong>DD-MM-YYYY</strong> (e.g., <code>15-06-2008</code>) for DOB and Admission Date.
                  </li>
                  <li>
                    • <strong>Class & Section:</strong> Use formats like "10-A" or "10 A". The system automatically splits these into Grade and Section.
                  </li>
                  <li>
                    • <strong>Parent Login:</strong> Fill the <strong>Parent Email</strong> and <strong>Parent Password</strong> columns to automatically create one login for the family (Father, Mother, or Guardian).
                  </li>
                  <li>
                    • <strong>Identity Numbers:</strong> Ensure <strong>Aadhaar</strong> (12 digits) and <strong>PAN</strong> are entered as text to prevent Excel from scientific notation (e.g., 1.23E+11).
                  </li>
                  <li>
                    • <strong>Required Fields:</strong> First Name, Last Name, Student Email, Password, Admission No, Class, and Academic Year are mandatory.
                  </li>
                </ul>
              </div>

              {/* Template download */}
              <button
                onClick={downloadTemplate}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}
              >
                <Download size={15} /> Download Sample Template (.xlsx)
              </button>

              {/* Drop zone */}
              <label
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className="flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-10 rounded-2xl cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragOver ? COLORS.accent : COLORS.border}`,
                  background: dragOver ? `${COLORS.accent}10` : COLORS.bgSoft,
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: `${COLORS.primary}15` }}
                >
                  <Upload size={28} style={{ color: COLORS.primary }} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm" style={{ color: COLORS.primary }}>
                    Drop your Excel or CSV file here
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.secondary }}>
                    or click to browse · .xlsx, .xls, .csv supported
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])}
                />
              </label>
            </div>
          )}

          {/* ── STEP 2: Preview ───────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Total Rows", val: rows.length, color: COLORS.primary },
                  { label: "Valid", val: validCount, color: "#15803d" },
                  { label: "Has Issues", val: invalidCount, color: "#d97706" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: `${c.color}12`, border: `1px solid ${c.color}30`, color: c.color }}
                  >
                    {c.val} {c.label}
                  </div>
                ))}
              </div>

              {/* Unmapped columns warning */}
              {unmappedCols.length > 0 && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}
                >
                  <AlertCircle size={13} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                  <span>
                    <strong>Unmapped columns ignored:</strong> {unmappedCols.join(", ")}
                  </span>
                </div>
              )}

              {/* File info + re-upload */}
              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{ background: COLORS.bgSoft, border: `1px solid ${COLORS.border}` }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: COLORS.primary }}>
                  <FileSpreadsheet size={14} style={{ color: COLORS.secondary }} />
                  {file?.name}
                </div>
                <button
                  onClick={() => { setStep("upload"); setRows([]); setFile(null); }}
                  className="flex items-center gap-1 text-xs font-semibold transition-all hover:opacity-70"
                  style={{ color: COLORS.secondary }}
                >
                  <RefreshCw size={11} /> Change file
                </button>
              </div>

              {/* Row table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 480 }}>
                    <thead>
                      <tr style={{ background: `${COLORS.bgSoft}`, borderBottom: `1px solid ${COLORS.border}` }}>
                        {[
                          { h: "Row", cls: "" },
                          { h: "Name", cls: "" },
                          { h: "Email", cls: "hidden sm:table-cell" },
                          { h: "Class / Year", cls: "hidden md:table-cell" },
                          { h: "Adm No", cls: "hidden sm:table-cell" },
                          { h: "Status", cls: "" },
                          { h: "", cls: "" },
                        ].map(({ h, cls }) => (
                          <th
                            key={h}
                            className={`px-3 py-2.5 text-left font-bold ${cls}`}
                            style={{ color: COLORS.secondary }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <React.Fragment key={row._idx}>
                          <tr
                            className="transition-colors"
                            style={{
                              borderBottom: `1px solid ${COLORS.border}`,
                              background: row.errors.length ? "#fffbeb" : "white",
                            }}
                          >
                            <td
                              className="px-3 py-2.5 font-mono"
                              style={{ color: COLORS.secondary }}
                            >
                              #{row._idx}
                            </td>

                            <td
                              className="px-3 py-2.5 font-semibold"
                              style={{ color: COLORS.primary, maxWidth: 120 }}
                            >
                              <span className="block truncate">{row.student.firstName} {row.student.lastName}</span>
                              {/* Show email below name on mobile */}
                              <span className="sm:hidden block text-[10px] font-normal truncate" style={{ color: COLORS.secondary }}>
                                {row.student.email || "—"}
                              </span>
                            </td>

                            <td
                              className="px-3 py-2.5 hidden sm:table-cell"
                              style={{ color: COLORS.secondary, maxWidth: 160 }}
                            >
                              <span className="block truncate">{row.student.email || "—"}</span>
                            </td>

                            <td
                              className="px-3 py-2.5 hidden md:table-cell"
                              style={{ color: COLORS.secondary }}
                            >
                              {row.student.classSectionName || "—"} /{" "}
                              {row.student.academicYearName || "—"}
                            </td>

                            <td
                              className="px-3 py-2.5 hidden sm:table-cell"
                              style={{ color: COLORS.secondary }}
                            >
                              {row.student.admissionNumber || "—"}
                            </td>

                            <td className="px-3 py-2.5">
                              <RowStatus status={row.status} errors={row.errors} />
                            </td>

                            <td className="px-3 py-2.5">
                              {row.errors.length > 0 && (
                                <button
                                  onClick={() =>
                                    setExpandedRow(
                                      expandedRow === row._idx ? null : row._idx
                                    )
                                  }
                                  className="flex items-center gap-1 text-[10px] font-bold transition-all hover:opacity-70"
                                  style={{ color: "#d97706" }}
                                >
                                  {expandedRow === row._idx ? (
                                    <ChevronUp size={11} />
                                  ) : (
                                    <ChevronDown size={11} />
                                  )}
                                  Details
                                </button>
                              )}
                            </td>
                          </tr>

                          {expandedRow === row._idx && row.errors.length > 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-2"
                                style={{
                                  background: "#fffbeb",
                                  borderBottom: `1px solid ${COLORS.border}`,
                                }}
                              >
                                <ul className="space-y-0.5">
                                  {row.errors.map((e, i) => (
                                    <li
                                      key={`${row._idx}-${i}-${e}`}
                                      className="text-[11px] font-semibold"
                                      style={{ color: "#b45309" }}
                                    >
                                      · {e}
                                    </li>
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
                <p className="text-xs" style={{ color: COLORS.secondary }}>
                  Rows with issues will be <strong>skipped</strong>. Only {validCount} valid rows will be imported.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 3: Done ──────────────────────────────────────────────── */}
          {step === "done" && (() => {
            // ── Parse existing-student detail from backend error bracket ─────
            // Backend embeds: [Existing student: NAME | Email: X | Class: Y | Year: Z]
            //              or: [Existing student: NAME | Class: Y | Year: Z | Adm No: N]
            const parseExisting = (raw) => {
              if (!raw) return null;
              const emailMatch = raw.match(/\[Existing student:\s*(.+?)\s*\|\s*Email:\s*(.+?)\s*\|\s*Class:\s*(.+?)\s*\|\s*Year:\s*(.+?)\]/i);
              if (emailMatch) return { name: emailMatch[1], email: emailMatch[2], cls: emailMatch[3], year: emailMatch[4], admNo: "" };
              const admMatch = raw.match(/\[Existing student:\s*(.+?)\s*\|\s*Class:\s*(.+?)\s*\|\s*Year:\s*(.+?)\s*\|\s*Adm No:\s*(.+?)\]/i);
              if (admMatch)   return { name: admMatch[1], email: "", cls: admMatch[2], year: admMatch[3], admNo: admMatch[4] };
              return null;
            };

            // ── Parse each row's error into a friendly category ──────────────
            const categorise = (row) => {
              if (row.status === "success") return { tag: "success", label: "Imported", color: "#15803d", bg: "#f0fdf4", fix: "", existing: null };
              const raw = row.serverError || row.errors.join(" | ") || "";
              const lo  = raw.toLowerCase();
              const existing = parseExisting(raw);
              if (lo.includes("email") && (lo.includes("already registered") || lo.includes("already exists")))
                return { tag: "dup-email",  label: "Email Already Exists",      color: "#dc2626", bg: "#fef2f2", existing,
                  fix: "This student's email is already registered. They were skipped to avoid duplicates." };
              if (lo.includes("admission no") && lo.includes("already exists"))
                return { tag: "dup-adm",   label: "Admission No Already Taken", color: "#9333ea", bg: "#faf5ff", existing,
                  fix: `Admission No "${row.student.admissionNumber}" is already used. Change it in your Excel and re-upload.` };
              if (lo.includes("roll no") && lo.includes("already assigned"))
                return { tag: "dup-roll",  label: "Roll No Already Taken",      color: "#ea580c", bg: "#fff7ed", existing,
                  fix: `Roll No "${row.student.rollNumber}" is already used in this class/year. Assign a different roll number.` };
              if (lo.includes("class") && lo.includes("not found"))
                return { tag: "no-class",  label: "Class Not Found",            color: "#b45309", bg: "#fffbeb", existing: null,
                  fix: `Class "${row.student.classSectionName}" doesn't exist. Check spelling in Settings → Classes.` };
              if (lo.includes("academic year") && lo.includes("not found"))
                return { tag: "no-year",   label: "Academic Year Not Found",    color: "#b45309", bg: "#fffbeb", existing: null,
                  fix: `Academic year "${row.student.academicYearName}" doesn't exist. Create it in Settings → Academic Years first.` };
              if (lo.includes("missing") || lo.includes("required"))
                return { tag: "missing",   label: "Missing Required Field",     color: "#b45309", bg: "#fffbeb", existing: null, fix: raw };
              return   { tag: "other",     label: "Server Error",               color: "#dc2626", bg: "#fef2f2", existing: null, fix: raw };
            };

            const enriched = rows.map((r) => ({ ...r, cat: categorise(r) }));

            // counts by category
            const dupEmailRows = enriched.filter((r) => r.cat.tag === "dup-email");
            const dupAdmRows   = enriched.filter((r) => r.cat.tag === "dup-adm");
            const dupRollRows  = enriched.filter((r) => r.cat.tag === "dup-roll");
            const noClassRows  = enriched.filter((r) => r.cat.tag === "no-class");
            const noYearRows   = enriched.filter((r) => r.cat.tag === "no-year");
            const missingRows  = enriched.filter((r) => r.cat.tag === "missing");
            const otherErrRows = enriched.filter((r) => r.cat.tag === "other");

            return (
              <div className="space-y-4">

                {/* ── Summary cards ───────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Total in File", value: rows.length, bg: COLORS.bgSoft, color: COLORS.primary, border: COLORS.border },
                    { label: "✅ Imported",   value: successCount, bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
                    { label: "❌ Failed",     value: failCount,    bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
                    { label: "⚠️ Skipped",   value: invalidCount, bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                      <p className="text-xl font-black" style={{ color: c.color }}>{c.value}</p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: c.color, opacity: 0.8 }}>{c.label}</p>
                    </div>
                  ))}
                </div>

                {/* ── Failure breakdown cards ─────────────────────────────── */}
                {(failCount > 0 || invalidCount > 0) && (
                  <div className="rounded-xl p-3 space-y-2" style={{ background: "#fef9f0", border: "1px solid #fde68a" }}>
                    <p className="text-xs font-bold mb-2" style={{ color: "#92400e" }}>⚠ Why some rows were not imported:</p>
                    {dupEmailRows.length > 0 && (
                      <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                        <span className="font-black shrink-0" style={{ color: "#dc2626" }}>×{dupEmailRows.length}</span>
                        <div style={{ color: "#991b1b" }}>
                          <strong>Email already registered</strong> — These students are already in the system (same email). They were skipped to avoid duplicates.
                          <br/><span style={{ opacity: 0.75 }}>Affected: {dupEmailRows.map(r => `${r.student.firstName} ${r.student.lastName} (Adm: ${r.student.admissionNumber || "—"})`).join(", ")}</span>
                        </div>
                      </div>
                    )}
                    {dupAdmRows.length > 0 && (
                      <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "#faf5ff", border: "1px solid #e9d5ff" }}>
                        <span className="font-black shrink-0" style={{ color: "#9333ea" }}>×{dupAdmRows.length}</span>
                        <div style={{ color: "#6b21a8" }}>
                          <strong>Admission No already taken</strong> — Another student already has this admission number in the same academic year.
                          <br/><span style={{ opacity: 0.75 }}>Affected Adm Nos: {dupAdmRows.map(r => r.student.admissionNumber).join(", ")}</span>
                        </div>
                      </div>
                    )}
                    {dupRollRows.length > 0 && (
                      <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                        <span className="font-black shrink-0" style={{ color: "#ea580c" }}>×{dupRollRows.length}</span>
                        <div style={{ color: "#9a3412" }}>
                          <strong>Roll No conflict</strong> — Roll number already assigned in this class for this year.
                          <br/><span style={{ opacity: 0.75 }}>Affected: {dupRollRows.map(r => `${r.student.firstName} (Roll: ${r.student.rollNumber})`).join(", ")}</span>
                        </div>
                      </div>
                    )}
                    {noClassRows.length > 0 && (
                      <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                        <span className="font-black shrink-0" style={{ color: "#b45309" }}>×{noClassRows.length}</span>
                        <div style={{ color: "#78350f" }}>
                          <strong>Class not found</strong> — The class name in your Excel doesn't match any class in the system. Check spelling in Settings → Classes.
                          <br/><span style={{ opacity: 0.75 }}>Affected class names: {[...new Set(noClassRows.map(r => r.student.classSectionName))].join(", ")}</span>
                        </div>
                      </div>
                    )}
                    {noYearRows.length > 0 && (
                      <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                        <span className="font-black shrink-0" style={{ color: "#b45309" }}>×{noYearRows.length}</span>
                        <div style={{ color: "#78350f" }}>
                          <strong>Academic year not found</strong> — Create the academic year in Settings first.
                          <br/><span style={{ opacity: 0.75 }}>Affected year: {[...new Set(noYearRows.map(r => r.student.academicYearName))].join(", ")}</span>
                        </div>
                      </div>
                    )}
                    {missingRows.length > 0 && (
                      <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                        <span className="font-black shrink-0" style={{ color: "#b45309" }}>×{missingRows.length}</span>
                        <div style={{ color: "#78350f" }}>
                          <strong>Missing required fields</strong> — These rows were skipped before sending to the server. Fill in the required columns and re-upload.
                        </div>
                      </div>
                    )}
                    {otherErrRows.length > 0 && (
                      <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                        <span className="font-black shrink-0" style={{ color: "#dc2626" }}>×{otherErrRows.length}</span>
                        <div style={{ color: "#991b1b" }}>
                          <strong>Other server error</strong> — See the Reason column in the table below for details.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Per-row detail table ─────────────────────────────────── */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                  <div className="px-3 py-2 flex items-center justify-between" style={{ background: COLORS.bgSoft, borderBottom: `1px solid ${COLORS.border}` }}>
                    <p className="text-xs font-bold" style={{ color: COLORS.primary }}>Full Row-by-Row Report</p>
                    <p className="text-xs" style={{ color: COLORS.secondary }}>{rows.length} rows total</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" style={{ minWidth: 860 }}>
                      <thead>
                        <tr style={{ background: COLORS.bgSoft, borderBottom: `1px solid ${COLORS.border}` }}>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: COLORS.secondary, width: 40 }}>#</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: COLORS.secondary }}>Adm No</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: COLORS.secondary }}>Student Name</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: COLORS.secondary }}>Email</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: COLORS.secondary }}>Class</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: COLORS.secondary, width: 130 }}>Status</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: "#9333ea" }}>Already Exists As</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: "#9333ea" }}>Existing Class</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: "#9333ea" }}>Existing Year</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: COLORS.secondary }}>What Happened</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enriched.map((row) => (
                          <tr
                            key={row._idx}
                            style={{
                              borderBottom: `1px solid ${COLORS.border}`,
                              background: row.cat.bg,
                            }}
                          >
                            <td className="px-3 py-2 font-mono" style={{ color: COLORS.secondary }}>#{row._idx}</td>
                            <td className="px-3 py-2 font-mono font-bold" style={{ color: COLORS.primary }}>
                              {row.student.admissionNumber || "—"}
                            </td>
                            <td className="px-3 py-2 font-semibold" style={{ color: COLORS.primary }}>
                              {row.student.firstName} {row.student.lastName}
                            </td>
                            <td className="px-3 py-2" style={{ color: COLORS.secondary, wordBreak: "break-all", maxWidth: 160 }}>
                              {row.student.email}
                            </td>
                            <td className="px-3 py-2" style={{ color: COLORS.secondary }}>
                              {row.student.classSectionName || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                                style={{ background: row.cat.bg, color: row.cat.color, border: `1px solid ${row.cat.color}33` }}>
                                {row.cat.tag === "success" ? "✅" : row.cat.tag.startsWith("dup") ? "🔁" : row.cat.tag === "missing" ? "⚠️" : "❌"}
                                {" "}{row.cat.label}
                              </span>
                            </td>
                            {/* ── Existing student columns ── */}
                            <td className="px-3 py-2" style={{ color: "#6b21a8", fontWeight: row.cat.existing ? 600 : 400 }}>
                              {row.cat.existing
                                ? row.cat.existing.name || row.cat.existing.email || "—"
                                : row.cat.tag === "success" ? "—" : "—"}
                            </td>
                            <td className="px-3 py-2" style={{ color: "#6b21a8" }}>
                              {row.cat.existing?.cls || "—"}
                            </td>
                            <td className="px-3 py-2" style={{ color: "#6b21a8" }}>
                              {row.cat.existing?.year || "—"}
                            </td>
                            <td className="px-3 py-2" style={{ color: row.cat.color, fontSize: "11px", maxWidth: 220 }}>
                              {row.cat.tag === "success"
                                ? "New student added successfully."
                                : row.cat.fix || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div
          className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4"
          style={{ background: COLORS.bgSoft, borderTop: `1px solid ${COLORS.border}` }}
        >
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.secondary }}
          >
            <X size={14} /> {step === "done" ? "Close" : "Cancel"}
          </button>

          <div className="flex items-center gap-3">
            {step === "preview" && (
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0 || atLimit}
                title={atLimit ? "Student limit reached — upgrade your plan to import more" : undefined}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                style={{ background: atLimit ? "#9ca3af" : COLORS.primary }}
              >
                {importing ? (
                  <><Loader2 size={15} className="animate-spin" /> Importing…</>
                ) : atLimit ? (
                  <><AlertCircle size={15} /> Limit Reached</>
                ) : (
                  <><Users size={15} /> Import {validCount} Student{validCount !== 1 ? "s" : ""}</>
                )}
              </button>
            )}
            {step === "done" && (
              <button
                onClick={downloadImportReport}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all w-full sm:w-auto"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}
              >
                <Download size={15} /> Download Report
              </button>
            )}
            {step === "done" && successCount > 0 && (
              <button
                onClick={onClose}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all w-full sm:w-auto"
                style={{ background: "#16a34a" }}
              >
                <CheckCircle size={15} /> Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}