// client/src/admin/pages/holidays/HolidayBulkImport.jsx
import React, { useState, useRef, useCallback } from "react";
import {
  CalendarDays, Download, Upload, X, CheckCircle,
  AlertCircle, Loader2, FileSpreadsheet,
  Building2, GraduationCap, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api`;

const C = {
  slate:       "#6A89A7",
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  bg:          "#EDF3FA",
  white:       "#FFFFFF",
  border:      "#C8DCF0",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

function excelSerialToDateStr(serial) {
  if (!serial) return "";
  if (typeof serial === "string" && /^\d{4}-\d{2}-\d{2}/.test(serial)) return serial.substring(0, 10);
  if (typeof serial === "string" && serial.includes("/")) {
    const d = new Date(serial);
    if (!isNaN(d)) return d.toISOString().substring(0, 10);
  }
  if (typeof serial === "number") {
    const utc_days = serial - 25569;
    const date = new Date(utc_days * 86400 * 1000);
    return date.toISOString().substring(0, 10);
  }
  const d = new Date(serial);
  if (!isNaN(d)) return d.toISOString().substring(0, 10);
  return String(serial).trim();
}

function normalizeHeader(h) {
  return (h || "").toString().trim().toLowerCase();
}

function resolveRows(sheet, XLSXLib) {
  const raw = XLSXLib.utils.sheet_to_json(sheet, { header: 1, defval: "", cellDates: false });
  if (raw.length < 2) return [];

  const [headerRow, ...dataRows] = raw;
  const hMap = {};
  headerRow.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (n.includes("type"))        hMap.type        = i;
    if (n.includes("title"))       hMap.title       = i;
    if (n.includes("description")) hMap.description = i;
    if (n.includes("month"))       hMap.month       = i;
    if (n === "day (1-31)" || (n.includes("day") && !n.includes("month") && !n.includes("academic") && !n.includes("start") && !n.includes("end")))
                                   hMap.day         = i;
    if (n.includes("start"))       hMap.startDate   = i;
    if (n.includes("end") && !n.includes("start")) hMap.endDate = i;
    if (n.includes("academic"))    hMap.academicYear = i;
  });

  const get = (row, field) => {
    const idx = hMap[field];
    if (idx === undefined || row[idx] === undefined) return "";
    return row[idx];
  };

  return dataRows
    .filter(r => r.some(c => c !== ""))
    .map((r, i) => {
      const rawType = String(get(r, "type") || "").trim().toUpperCase();
      const rawStartDate = excelSerialToDateStr(get(r, "startDate"));
      const rawEndDate   = excelSerialToDateStr(get(r, "endDate"));

      return {
        _idx: i + 2,
        raw: {
          type:         rawType,
          title:        String(get(r, "title") || "").trim(),
          description:  String(get(r, "description") || "").trim(),
          month:        String(get(r, "month") || "").trim(),
          day:          String(get(r, "day") || "").trim(),
          startDate:    rawStartDate,
          endDate:      rawEndDate,
          academicYear: String(get(r, "academicYear") || "").trim(),
        },
        status: "pending",
        serverError: null,
      };
    });
}

function validateRow(row, academicYears) {
  const errors = [];
  const { type, title, month, day, startDate, academicYear } = row.raw;
  if (!type || !["GOVERNMENT","SCHOOL"].includes(type))
    errors.push(`Type must be GOVERNMENT or SCHOOL (got "${type}")`);
  if (!title) errors.push("Title is required");
  if (type === "GOVERNMENT") {
    if (!month || isNaN(Number(month)) || Number(month) < 1 || Number(month) > 12)
      errors.push("Month must be 1–12");
    if (!day || isNaN(Number(day)) || Number(day) < 1 || Number(day) > 31)
      errors.push("Day must be 1–31");
  }
  if (type === "SCHOOL") {
    if (!startDate) errors.push("Start Date is required");
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.push(`Start Date format invalid: "${startDate}" (expected YYYY-MM-DD)`);
    if (!academicYear) errors.push("Academic Year is required");
    else {
      const match = academicYears.find(y => y.name.trim() === academicYear.trim());
      if (!match) errors.push(`Academic Year "${academicYear}" not found. Available: ${academicYears.map(y => y.name).join(", ")}`);
    }
  }
  return errors;
}

function RowBadge({ status, errors }) {
  if (status === "success")
    return <span style={{ color: "#15803d", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, fontFamily: "'Inter', sans-serif" }}><CheckCircle size={11} />Imported</span>;
  if (status === "error")
    return <span style={{ color: "#BE123C", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, fontFamily: "'Inter', sans-serif" }}><AlertCircle size={11} />Failed</span>;
  if (errors?.length)
    return <span style={{ color: "#d97706", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, fontFamily: "'Inter', sans-serif" }}><AlertCircle size={11} />{errors.length} issue{errors.length > 1 ? "s" : ""}</span>;
  return <span style={{ color: "#15803d", fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Ready</span>;
}

const TH = ({ children }) => (
  <th style={{
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    color: C.textLight,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    fontFamily: "'Inter', sans-serif",
    background: C.bg,
    borderBottom: `1.5px solid ${C.borderLight}`,
  }}>
    {children}
  </th>
);

function downloadTemplate(academicYears = []) {
  const generate = (XLSXLib) => {
    const wb = XLSXLib.utils.book_new();
    const yearList = academicYears.map(y => y.name).join(", ") || "2024-25";

    const headers = [
      "Type", "Title", "Description",
      "Month (1-12)\n[GOVERNMENT only]", "Day (1-31)\n[GOVERNMENT only]",
      "Start Date (YYYY-MM-DD)\n[SCHOOL only]", "End Date (YYYY-MM-DD)\n[SCHOOL only, optional]",
      `Academic Year\n[SCHOOL only] — must match exactly: ${yearList}`,
    ];

    const samples = [
      ["GOVERNMENT", "Independence Day",  "National holiday",   "8",  "15", "",           "",           ""],
      ["GOVERNMENT", "Republic Day",      "National holiday",   "1",  "26", "",           "",           ""],
      ["SCHOOL", "Summer Vacation",  "Annual summer break",    "", "", "2024-05-01", "2024-05-31", academicYears[0]?.name || "2024-25"],
    ];

    const ws = XLSXLib.utils.aoa_to_sheet([headers, ...samples]);

    if (!ws["!cols"]) ws["!cols"] = [];
    ws["!cols"] = [
      { wch: 14 }, { wch: 28 }, { wch: 32 }, { wch: 22 }, { wch: 18 },
      { wch: 26, z: "@" }, { wch: 28, z: "@" }, { wch: 36 },
    ];

    for (let row = 1; row <= 200; row++) {
      ["F", "G"].forEach(col => {
        const addr = `${col}${row}`;
        if (!ws[addr]) {
          ws[addr] = { t: "s", v: "", z: "@" };
        } else {
          ws[addr].t = "s";
          ws[addr].z = "@";
          ws[addr].v = String(ws[addr].v || "");
          delete ws[addr].w;
        }
      });
    }

    ws["!ref"] = `A1:H200`;
    ws["!rows"] = [{ hpt: 44 }];

    XLSXLib.utils.book_append_sheet(wb, ws, "Holidays");
    XLSXLib.writeFile(wb, "holiday_import_template.xlsx");
  };

  if (window.XLSX) { generate(window.XLSX); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  s.onload = () => generate(window.XLSX);
  s.onerror = () => alert("Failed to load Excel library.");
  document.head.appendChild(s);
}

export default function HolidayBulkImport({ academicYears = [], onClose, onImported }) {
  const [step, setStep]               = useState("upload");
  const [file, setFile]               = useState(null);
  const [rows, setRows]               = useState([]);
  const [dragOver, setDragOver]       = useState(false);
  const [importing, setImporting]     = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const fileRef                       = useRef();

  function ensureXLSX(cb) {
    if (window.XLSX) { cb(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = () => {
      if (window.XLSX) cb();
      else console.error("XLSX failed to load onto window");
    };
    s.onerror = () => alert("Failed to load Excel parser. Check your internet connection.");
    document.head.appendChild(s);
  }

  const parseFile = useCallback((f) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const XLSXLib = window.XLSX;
        if (!XLSXLib) { alert("Excel parser not ready — please try again."); return; }

        const wb = XLSXLib.read(e.target.result, { type: "array", cellDates: false });
        let allRows = [];
        wb.SheetNames.forEach(name => {
          const sheet = wb.Sheets[name];
          const sheetRows = resolveRows(sheet, XLSXLib);
          allRows = allRows.concat(sheetRows);
        });
        allRows = allRows.map((r, i) => ({ ...r, _idx: i + 1 }));
        const validated = allRows.map(r => ({
          ...r,
          errors: validateRow(r, academicYears),
        }));
        setRows(validated);
        setStep("preview");
      } catch (ex) {
        console.error("Parse error:", ex);
        alert("Failed to parse file: " + ex.message);
      }
    };
    reader.onerror = () => alert("Failed to read file.");
    reader.readAsArrayBuffer(f);
  }, [academicYears]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) ensureXLSX(() => parseFile(f));
  };
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) ensureXLSX(() => parseFile(f));
    e.target.value = "";
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r.errors.length === 0);
    if (!valid.length) return;
    setImporting(true);

    const updatedRows = rows.map(r => ({ ...r }));

    for (const row of valid) {
      const { type, title, description, month, day, startDate, endDate, academicYear } = row.raw;
      const idx = updatedRows.findIndex(r => r._idx === row._idx);
      const yearObj = academicYears.find(y => y.name.trim() === academicYear?.trim());

      const body = {
        title: title.trim(),
        description: description?.trim() || null,
        type,
        ...(type === "GOVERNMENT"
          ? { month: Number(month), day: Number(day) }
          : {
              startDate,
              endDate: endDate || null,
              academicYearId: yearObj?.id,
            }),
      };

      try {
        const r = await fetch(`${BASE}/admin/holidays`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`);
        updatedRows[idx] = { ...updatedRows[idx], status: "success" };
      } catch (err) {
        updatedRows[idx] = { ...updatedRows[idx], status: "error", serverError: err.message };
      }
    }

    setRows(updatedRows);
    setImporting(false);
    setStep("done");

    const successCount = updatedRows.filter(r => r.status === "success").length;
    if (successCount > 0) onImported?.();
  };

  const validCount   = rows.filter(r => r.errors.length === 0).length;
  const invalidCount = rows.filter(r => r.errors.length > 0).length;
  const successCount = rows.filter(r => r.status === "success").length;

  const stepLabels = [
    { id: "upload",  label: "1. Upload"  },
    { id: "preview", label: "2. Preview" },
    { id: "done",    label: "3. Results" },
  ];

  return (
    <div
      className="bulk-modal-overlay"
      style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, background: "rgba(36,51,64,0.50)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bulk-modal-card" style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 24px 64px rgba(56,73,89,0.18)", width: "100%", maxWidth: 780, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "14px 16px", background: `linear-gradient(90deg, ${C.bg}, ${C.white})`, borderBottom: `1.5px solid ${C.borderLight}`, borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileSpreadsheet size={16} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>Bulk Import Holidays</p>
              <p className="bulk-hide-mobile" style={{ margin: 0, fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>Upload an Excel file to add multiple holidays at once</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}>
            <X size={14} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 16px", borderBottom: `1.5px solid ${C.borderLight}`, background: C.bg, flexShrink: 0 }}>
          {stepLabels.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <div style={{ flex: 1, height: 1, background: C.borderLight }} />}
              <span style={{
                padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                background: step === s.id ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : "transparent",
                color: step === s.id ? "#fff" : C.textLight, transition: "all 0.2s", whiteSpace: "nowrap"
              }}>{s.label}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 16, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ═══ STEP 1: UPLOAD ═══ */}
          {step === "upload" && (
            <>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12, color: "#1D4ED8", fontFamily: "'Inter', sans-serif" }}>
                  <Info size={13} /> Formatting Guide
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#1E40AF", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                  <li><strong>Government:</strong> Provide numeric <em>Month (1–12)</em> and <em>Day (1–31)</em> values.</li>
                  <li><strong>School:</strong> Write dates explicitly using the <code>YYYY-MM-DD</code> format.</li>
                  <li><strong>Type column:</strong> Allowed values are only <code>GOVERNMENT</code> or <code>SCHOOL</code>.</li>
                </ul>
              </div>

              {academicYears.length > 0 && (
                <div style={{ background: `${C.mist}33`, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px", fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
                  <strong style={{ color: C.text, display: "block", marginBottom: 4 }}>Available Years:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {academicYears.map(y => (
                      <code key={y.id} style={{ background: `${C.sky}22`, padding: "1px 6px", borderRadius: 4, color: C.deep }}>{y.name}</code>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => downloadTemplate(academicYears)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, border: "1.5px solid #BBF7D0", background: "#F0FDF4", color: "#15803D", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", alignSelf: "flex-start" }}
              >
                <Download size={14} /> Template (.xlsx)
              </button>

              <label
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "32px 16px", borderRadius: 16, cursor: "pointer", transition: "all 0.2s", border: `2px dashed ${dragOver ? C.sky : C.border}`, background: dragOver ? `${C.sky}0D` : C.bg }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.deep}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Upload size={22} color={C.deep} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>Select or Drop File</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>Supports .xlsx, .xls, .csv</p>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFileChange} />
              </label>
            </>
          )}

          {/* ═══ STEP 2: PREVIEW ═══ */}
          {step === "preview" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: C.bg, border: `1.5px solid ${C.borderLight}` }}>
                <FileSpreadsheet size={13} color={C.textLight} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: "'Inter', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file?.name}</span>
              </div>

              <div style={{ borderRadius: 14, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 280, WebkitOverflowScrolling: "touch" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                      <tr>
                        <TH>#</TH>
                        <TH>Type</TH>
                        <TH>Title</TH>
                        <TH>Date</TH>
                        <TH>Academic Year</TH>
                        <TH>Status</TH>
                        <TH></TH>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <React.Fragment key={row._idx}>
                          <tr style={{ borderBottom: `1px solid ${C.borderLight}`, background: row.errors?.length ? "#FFFBEB" : i % 2 === 0 ? C.white : `${C.mist}08` }}>
                            <td style={{ padding: "10px 14px", fontSize: 11, color: C.textLight }}>{row._idx}</td>
                            <td style={{ padding: "10px 14px" }}>
                              {row.raw.type === "GOVERNMENT"
                                ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.deep, background: `${C.mist}55`, padding: "2px 6px", borderRadius: 6 }}><Building2 size={10} />Gov</span>
                                : row.raw.type === "SCHOOL"
                                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#15803d", background: "#DCFCE7", padding: "2px 6px", borderRadius: 6 }}><GraduationCap size={10} />School</span>
                                  : <span style={{ fontSize: 11, color: "#BE123C" }}>?</span>}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.text, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row.raw.title || "—"}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 11, color: C.textLight, whiteSpace: "nowrap" }}>
                              {row.raw.type === "GOVERNMENT"
                                ? (row.raw.month && row.raw.day ? `${row.raw.month}/${row.raw.day}` : "—")
                                : (row.raw.startDate || "—")}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 11, color: C.textLight }}>{row.raw.academicYear || "—"}</td>
                            <td style={{ padding: "10px 14px" }}><RowBadge status={row.status} errors={row.errors} /></td>
                            <td style={{ padding: "10px 14px" }}>
                              {row.errors?.length > 0 && (
                                <button
                                  onClick={() => setExpandedRow(expandedRow === row._idx ? null : row._idx)}
                                  style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 700, color: "#d97706", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                                >
                                  {expandedRow === row._idx ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedRow === row._idx && row.errors?.length > 0 && (
                            <tr>
                              <td colSpan={7} style={{ padding: "8px 14px", background: "#FFFBEB", borderBottom: `1px solid ${C.borderLight}` }}>
                                <ul style={{ margin: 0, paddingLeft: 14 }}>
                                  {row.errors.map((e, ei) => (
                                    <li key={ei} style={{ fontSize: 11, fontWeight: 600, color: "#92400E", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>{e}</li>
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

              <p style={{ margin: 0, fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
                {invalidCount > 0
                  ? <>Skipping rows with validation issues. <strong>{validCount}</strong> valid entries will import.</>
                  : <>{rows.length} records ready to process.</>
                }
              </p>
            </>
          )}

          {/* ═══ STEP 3: DONE ═══ */}
          {step === "done" && (
            <div style={{ borderRadius: 14, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 280, WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                    <tr><TH>#</TH><TH>Type</TH><TH>Title</TH><TH>Result</TH><TH>Details</TH></tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row._idx} style={{ borderBottom: `1px solid ${C.borderLight}`, background: row.status === "success" ? "#F0FDF4" : row.status === "error" ? "#FEF2F2" : i % 2 === 0 ? C.white : `${C.mist}08` }}>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: C.textLight }}>{row._idx}</td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: C.textLight }}>{row.raw.type}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.text }}>{row.raw.title || "—"}</td>
                        <td style={{ padding: "10px 14px" }}><RowBadge status={row.status} errors={row.errors} /></td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#BE123C", fontFamily: "'Inter', sans-serif" }}>
                          {row.serverError || (row.errors?.length ? row.errors[0] : "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, color: C.textLight, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {step === "done" ? "Close" : "Cancel"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step === "preview" && (
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: validCount === 0 ? "#9ca3af" : `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, cursor: importing || validCount === 0 ? "not-allowed" : "pointer" }}
              >
                {importing && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
                Import ({validCount})
              </button>
            )}
            {step === "done" && successCount > 0 && (
              <button
                onClick={onClose}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                <CheckCircle size={14} /> Finish
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 520px) {
          .bulk-hide-mobile { display: none !important; }
          .bulk-modal-card { max-height: 96vh !important; border-radius: 14px !important; }
        }
      `}</style>
    </div>
  );
}