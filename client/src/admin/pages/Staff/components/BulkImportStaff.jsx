// admin/pages/Staff/components/BulkImportStaff.jsx
// Drop an Excel/CSV → preview → bulk register staff
import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
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
import { createStaff } from "../api/api";

/* ── Design tokens (Stormy Morning — matches StaffList / StaffAdd) ── */
const COLORS = {
  primary:    "#384959",
  secondary:  "#6A89A7",
  sky:        "#88BDF2",
  mist:       "#BDDDFC",
  bg:         "#EDF3FA",
  bgSoft:     "#F4F8FD",
  white:      "#FFFFFF",
  border:     "#C8DCF0",
  borderLight:"#DDE9F5",
  text:       "#243340",
};

// ── Column mapping: CSV/Excel header → internal field key ────────────────────
const COLUMN_MAP = {
  firstName:     ["first name", "firstname", "first_name", "fname"],
  lastName:      ["last name", "lastname", "last_name", "lname"],
  email:         ["email", "staff email", "staff_email"],
  phone:         ["phone", "mobile", "contact", "phone number"],
  role:          ["role", "designation", "position", "job title"],
  groupType:     ["group", "group type", "grouptype", "staff group", "category"],
  joiningDate:   ["joining date", "joiningdate", "join date", "date of joining", "doj"],
  basicSalary:   ["basic salary", "salary", "basic pay", "basicsalary", "ctc"],
  bankName:      ["bank name", "bank", "bankname"],
  bankAccountNo: ["account no", "bank account", "account number", "bankaccountno", "account"],
  ifscCode:      ["ifsc", "ifsc code", "ifsccode"],
  loginEmail:    ["login email", "loginemail", "username", "login", "login id"],
  password:      ["password", "pass", "login password"],
  status:        ["status", "staff status", "employment status"],
};

// ── Resolve a raw header string to an internal field key ────────────────────
function resolveHeader(raw) {
  const lower = raw.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.includes(lower)) return field;
  }
  return null;
}

// ── Normalise groupType value ────────────────────────────────────────────────
function normalizeGroup(v) {
  if (!v) return "Group B";
  const s = v.toString().trim();
  if (s === "B" || s.toLowerCase().includes("b")) return "Group B";
  if (s === "C" || s.toLowerCase().includes("c")) return "Group C";
  return "Group B";
}

// ── Normalise status ─────────────────────────────────────────────────────────
function normalizeStatus(v) {
  if (!v) return "ACTIVE";
  const up = v.toString().toUpperCase().trim();
  const valid = ["ACTIVE", "INACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED"];
  return valid.includes(up) ? up : "ACTIVE";
}

// ── Parse a single row ───────────────────────────────────────────────────────
function parseRow(rawRow, headerMap) {
  const get = (field) => {
    const idx = headerMap[field];
    if (idx === undefined) return "";
    const v = rawRow[idx];
    return v !== undefined && v !== null ? v.toString().trim() : "";
  };

  return {
    firstName:     get("firstName"),
    lastName:      get("lastName"),
    email:         get("email"),
    phone:         get("phone"),
    role:          get("role"),
    groupType:     normalizeGroup(get("groupType")),
    joiningDate:   get("joiningDate"),
    basicSalary:   get("basicSalary"),
    bankName:      get("bankName"),
    bankAccountNo: get("bankAccountNo"),
    ifscCode:      get("ifscCode"),
    loginEmail:    get("loginEmail") || get("email"),
    password:      get("password"),
    status:        normalizeStatus(get("status")),
  };
}

// ── Validate a parsed staff row ──────────────────────────────────────────────
function validateRow(s) {
  const errors = [];
  if (!s.firstName)   errors.push("First Name is required");
  if (!s.role)        errors.push("Role / Designation is required");
  if (!s.joiningDate) errors.push("Joining Date is required");
  if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))
    errors.push("Invalid email format");
  if (s.password && !s.loginEmail)
    errors.push("Login Email is required when a password is provided");
  return errors;
}

// ── Template download ────────────────────────────────────────────────────────
function downloadTemplate() {
  const headers = [
    "First Name", "Last Name", "Email", "Phone",
    "Role", "Group Type", "Joining Date",
    "Basic Salary", "Bank Name", "Account No", "IFSC Code",
    "Login Email", "Password", "Status",
  ];
  const sample = [
    "Priya", "Sharma", "priya@school.com", "9876543210",
    "Lab Assistant", "Group B", "01-06-2024",
    "18000", "SBI", "123456789012", "SBIN0001234",
    "priya@school.com", "Staff@123", "ACTIVE",
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));

  // Force text format on all cells
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C2 = range.s.c; C2 <= range.e.c; ++C2) {
      const ref = XLSX.utils.encode_cell({ c: C2, r: R });
      if (!ws[ref]) continue;
      ws[ref].t = "s";
      ws[ref].z = "@";
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Staff");
  XLSX.writeFile(wb, "staff_bulk_import_template.xlsx");
}

// ── Row status badge ─────────────────────────────────────────────────────────
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
  return <span className="text-xs font-semibold text-emerald-600">Ready</span>;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function BulkImportStaff({ onClose, onSuccess }) {
  const [file, setFile]               = useState(null);
  const [rows, setRows]               = useState([]);
  const [importing, setImporting]     = useState(false);
  const [progress, setProgress]       = useState(0); // rows saved so far
  const [dragOver, setDragOver]       = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [step, setStep]               = useState("upload"); // upload | preview | done
  const [unmappedCols, setUnmappedCols] = useState([]);

  const fileRef = useRef();

  const validCount   = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.filter((r) => r.errors.length > 0).length;
  const successCount = rows.filter((r) => r.status === "success").length;
  const failCount    = rows.filter((r) => r.status === "error").length;

  // ── Parse uploaded file ──────────────────────────────────────────────────
  const parseFile = useCallback((f) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb  = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (raw.length < 2) {
          alert("File must have a header row and at least one data row.");
          return;
        }

        const [headerRow, ...dataRows] = raw;
        const headerMap = {};
        const unmapped  = [];

        headerRow.forEach((h, i) => {
          const field = resolveHeader(String(h));
          if (field) headerMap[field] = i;
          else if (String(h).trim()) unmapped.push(String(h));
        });

        setUnmappedCols(unmapped);

        const parsed = dataRows
          .filter((r) => r.some((c) => c !== ""))
          .map((r, i) => {
            const staff  = parseRow(r, headerMap);
            const errors = validateRow(staff);
            return { _idx: i + 2, staff, errors, status: "pending" };
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

  // ── Send valid rows via existing createStaff API (one by one) ───────────
  const handleImport = async () => {
    const valid = rows.filter((r) => r.errors.length === 0);
    if (!valid.length) return;

    setImporting(true);
    setProgress(0);
    const updatedRows = [...rows];

    for (const row of valid) {
      const s   = row.staff;
      const idx = updatedRows.findIndex((x) => x._idx === row._idx);
      try {
        await createStaff({
          firstName:     s.firstName,
          lastName:      s.lastName      || "",
          email:         s.email         || undefined,
          phone:         s.phone         || undefined,
          role:          s.role,
          groupType:     s.groupType,
          joiningDate:   s.joiningDate,
          basicSalary:   s.basicSalary   || undefined,
          bankName:      s.bankName      || undefined,
          bankAccountNo: s.bankAccountNo || undefined,
          ifscCode:      s.ifscCode      || undefined,
          // Only include password when one was supplied (creates login access)
          ...(s.password ? { password: s.password } : {}),
        });
        if (idx !== -1)
          updatedRows[idx] = { ...updatedRows[idx], status: "success", serverError: null };
      } catch (err) {
        if (idx !== -1)
          updatedRows[idx] = {
            ...updatedRows[idx],
            status: "error",
            serverError: err.message || "Failed to save",
          };
      }
      setProgress((p) => p + 1);
    }

    setRows(updatedRows);
    setImporting(false);
    setStep("done");
  };

  // ── Step labels ──────────────────────────────────────────────────────────
  const STEPS = ["upload", "preview", "done"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(36,51,64,0.48)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1200, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLORS.white,
          borderRadius: 22,
          border: `1.5px solid ${COLORS.borderLight}`,
          boxShadow: "0 24px 64px rgba(56,73,89,0.22)",
          width: "100%", maxWidth: 640,
          maxHeight: "92vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "18px 22px 16px",
            borderBottom: `1.5px solid ${COLORS.borderLight}`,
            background: `linear-gradient(90deg, ${COLORS.bg}, ${COLORS.white})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: `${COLORS.sky}22`, border: `1.5px solid ${COLORS.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={16} color={COLORS.sky} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: COLORS.text, fontFamily: "'Inter',sans-serif" }}>
                  Bulk Import Staff
                </p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>
                  Upload an Excel or CSV file to add multiple staff at once
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${COLORS.border}`, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.secondary }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.sky)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
            >
              <X size={14} />
            </button>
          </div>

          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
            {["Upload", "Preview", "Done"].map((label, i) => {
              const done   = i < stepIdx;
              const active = i === stepIdx;
              return (
                <React.Fragment key={label}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      fontSize: 10, fontWeight: 700, fontFamily: "'Inter',sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? COLORS.sky : active ? COLORS.primary : COLORS.borderLight,
                      color: done || active ? "#fff" : COLORS.secondary,
                      transition: "all 0.2s",
                    }}>
                      {done ? <CheckCircle size={12} /> : i + 1}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? COLORS.primary : COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: i < stepIdx ? COLORS.sky : COLORS.borderLight, maxWidth: 40, transition: "background 0.3s" }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }} className="space-y-4">

          {/* ── STEP 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Drag-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? COLORS.sky : COLORS.border}`,
                  borderRadius: 16,
                  background: dragOver ? `${COLORS.sky}0D` : COLORS.bg,
                  padding: "40px 24px",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 10, cursor: "pointer", transition: "all 0.2s",
                  textAlign: "center",
                }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${COLORS.sky}18`, border: `1.5px solid ${COLORS.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Upload size={22} color={COLORS.sky} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: COLORS.text, fontFamily: "'Inter',sans-serif" }}>
                    Drop your file here, or <span style={{ color: COLORS.sky }}>click to browse</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>
                    Supports .xlsx, .xls, .csv
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files[0]) parseFile(e.target.files[0]); }}
                />
              </div>

              {/* Template download */}
              <div
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 14,
                  background: `${COLORS.sky}0D`, border: `1.5px solid ${COLORS.sky}33`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileSpreadsheet size={18} color={COLORS.sky} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: COLORS.text, fontFamily: "'Inter',sans-serif" }}>
                      Download Template
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>
                      Fill in the sample file and re-upload
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 11,
                    background: COLORS.primary, color: "#fff",
                    border: "none", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'Inter',sans-serif",
                  }}
                >
                  <Download size={13} /> Template
                </button>
              </div>

              {/* Required columns info */}
              <div
                style={{
                  padding: "12px 16px", borderRadius: 13,
                  background: COLORS.bg, border: `1px solid ${COLORS.borderLight}`,
                  display: "flex", alignItems: "flex-start", gap: 8,
                }}
              >
                <Info size={13} color={COLORS.secondary} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COLORS.text, fontFamily: "'Inter',sans-serif", marginBottom: 4 }}>
                    Required columns
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
                    {["First Name", "Role", "Joining Date"].map((c) => (
                      <span key={c} style={{ fontSize: 11, fontWeight: 600, color: COLORS.primary, background: `${COLORS.sky}18`, padding: "2px 8px", borderRadius: 6, fontFamily: "'Inter',sans-serif" }}>
                        {c}
                      </span>
                    ))}
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>
                    Optional: Email, Phone, Group Type, Salary, Bank details, Password (creates login access)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === "preview" && (
            <div className="space-y-3">
              {/* Summary bar */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "Total rows",  val: rows.length,    color: COLORS.primary },
                  { label: "Ready",       val: validCount,     color: "#16a34a" },
                  { label: "Issues",      val: invalidCount,   color: "#d97706" },
                ].map(({ label, val, color }) => (
                  <div
                    key={label}
                    style={{
                      flex: 1, minWidth: 90,
                      padding: "10px 14px", borderRadius: 12,
                      background: COLORS.bg, border: `1.5px solid ${COLORS.borderLight}`,
                      textAlign: "center",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color, fontFamily: "'Inter',sans-serif", lineHeight: 1 }}>{val}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 600, color: COLORS.secondary, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* File info */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 11, background: `${COLORS.sky}0D`, border: `1px solid ${COLORS.sky}22` }}>
                <FileSpreadsheet size={14} color={COLORS.sky} />
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>{file?.name}</span>
                <button onClick={() => { setStep("upload"); setRows([]); setFile(null); }}
                  style={{ marginLeft: "auto", fontSize: 11, color: COLORS.sky, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>
                  Change file
                </button>
              </div>

              {/* Unmapped column warning */}
              {unmappedCols.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 11, background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <AlertCircle size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 11, color: "#92400e", fontFamily: "'Inter',sans-serif" }}>
                    <strong>Unrecognised columns (will be ignored):</strong> {unmappedCols.join(", ")}
                  </p>
                </div>
              )}

              {/* Preview table */}
              <div style={{ borderRadius: 14, border: `1.5px solid ${COLORS.border}`, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                    <thead>
                      <tr style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
                        {["#", "Name", "Role", "Group", "Joining Date", "Status", "Details"].map((h) => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: COLORS.secondary, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <React.Fragment key={row._idx}>
                          <tr style={{ borderBottom: `1px solid ${COLORS.borderLight}`, background: row.errors.length ? "#fffbeb" : COLORS.white }}>
                            <td style={{ padding: "10px 12px", color: COLORS.secondary, fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>#{row._idx}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: COLORS.text, fontFamily: "'Inter',sans-serif" }}>
                              {row.staff.firstName} {row.staff.lastName}
                              <span style={{ display: "block", fontSize: 10, color: COLORS.secondary, fontWeight: 400 }}>{row.staff.email || "—"}</span>
                            </td>
                            <td style={{ padding: "10px 12px", color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>{row.staff.role || <span style={{ color: "#d97706", fontWeight: 700 }}>Missing</span>}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: row.staff.groupType === "Group B" ? `${COLORS.sky}18` : `${COLORS.mist}55`, color: COLORS.primary, fontFamily: "'Inter',sans-serif" }}>
                                {row.staff.groupType}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>{row.staff.joiningDate || <span style={{ color: "#d97706", fontWeight: 700 }}>Missing</span>}</td>
                            <td style={{ padding: "10px 12px" }}><RowStatus status={row.status} errors={row.errors} /></td>
                            <td style={{ padding: "10px 12px" }}>
                              {row.errors.length > 0 && (
                                <button
                                  onClick={() => setExpandedRow(expandedRow === row._idx ? null : row._idx)}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#b45309", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Inter',sans-serif" }}
                                >
                                  {expandedRow === row._idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  Details
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedRow === row._idx && row.errors.length > 0 && (
                            <tr>
                              <td colSpan={7} style={{ padding: "8px 16px", background: "#fffbeb", borderBottom: `1px solid ${COLORS.border}` }}>
                                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
                                  {row.errors.map((e, i) => (
                                    <li key={`${row._idx}-${i}`} style={{ fontSize: 11, fontWeight: 600, color: "#b45309", fontFamily: "'Inter',sans-serif" }}>· {e}</li>
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
                <p style={{ fontSize: 12, color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>
                  Rows with issues will be <strong>skipped</strong>. Only {validCount} valid row{validCount !== 1 ? "s" : ""} will be imported.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === "done" && (
            <div className="space-y-4">
              <div
                style={{
                  borderRadius: 16, padding: "24px 20px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center",
                  background: successCount > 0 ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${successCount > 0 ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                <CheckCircle size={34} style={{ color: successCount > 0 ? "#16a34a" : "#dc2626" }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: successCount > 0 ? "#15803d" : "#dc2626", fontFamily: "'Inter',sans-serif" }}>
                    {successCount > 0 ? `${successCount} staff member${successCount !== 1 ? "s" : ""} imported successfully!` : "Import failed"}
                  </p>
                  {failCount > 0 && (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#dc2626", fontFamily: "'Inter',sans-serif" }}>{failCount} row(s) failed — see details below</p>
                  )}
                  {invalidCount > 0 && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#d97706", fontFamily: "'Inter',sans-serif" }}>{invalidCount} row(s) skipped due to validation issues</p>
                  )}
                </div>
              </div>

              <div style={{ borderRadius: 14, border: `1.5px solid ${COLORS.border}`, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 380 }}>
                    <thead>
                      <tr style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
                        {["Row", "Name", "Role", "Result", "Message"].map((h) => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: COLORS.secondary, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Inter',sans-serif" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row._idx}
                          style={{
                            borderBottom: `1px solid ${COLORS.borderLight}`,
                            background:
                              row.status === "success" ? "#f0fdf4"
                              : row.status === "error" ? "#fef2f2"
                              : row.errors.length ? "#fffbeb"
                              : COLORS.white,
                          }}
                        >
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", color: COLORS.secondary }}>#{row._idx}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: COLORS.text, fontFamily: "'Inter',sans-serif" }}>
                            {row.staff.firstName} {row.staff.lastName}
                            {(row.serverError || row.errors[0]) && (
                              <span style={{ display: "block", fontSize: 10, color: "#dc2626", fontWeight: 400 }}>
                                {row.serverError || row.errors[0]}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", color: COLORS.secondary, fontFamily: "'Inter',sans-serif" }}>{row.staff.role}</td>
                          <td style={{ padding: "10px 12px" }}><RowStatus status={row.status} errors={row.errors} /></td>
                          <td style={{ padding: "10px 12px", color: "#dc2626", fontSize: 11, fontFamily: "'Inter',sans-serif" }}>
                            {row.serverError || (row.errors.length ? row.errors[0] : "")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
            padding: "14px 22px",
            borderTop: `1.5px solid ${COLORS.borderLight}`,
            background: COLORS.bg,
          }}
        >
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 12,
              border: `1.5px solid ${COLORS.border}`, background: COLORS.white,
              fontSize: 13, fontWeight: 600, color: COLORS.secondary,
              cursor: "pointer", fontFamily: "'Inter',sans-serif",
            }}
          >
            <X size={14} /> {step === "done" ? "Close" : "Cancel"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step === "preview" && (
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 22px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, #6A89A7, #384959)`,
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: importing || validCount === 0 ? "not-allowed" : "pointer",
                  opacity: importing || validCount === 0 ? 0.6 : 1,
                  fontFamily: "'Inter',sans-serif",
                  boxShadow: "0 4px 14px rgba(56,73,89,0.25)",
                }}
              >
                {importing ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving {progress}/{validCount}…</>
                ) : (
                  <><Users size={14} /> Import {validCount} Staff member{validCount !== 1 ? "s" : ""}</>
                )}
              </button>
            )}
            {step === "done" && successCount > 0 && (
              <button
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 22px", borderRadius: 12, border: "none",
                  background: "#16a34a", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                <CheckCircle size={14} /> Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}