// src/finance/pages/Studentfinance/components/BulkFeeUpload.jsx
// Bulk Excel fee upload panel — rendered inside the "Add Student Fees" modal
// (Addstudent.jsx) when the "Bulk Upload (Excel)" tab is selected.
// Re-uses the modal's existing `as-*` styles so the look stays identical.
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown, GraduationCap, Download, Upload, FileSpreadsheet, X,
  AlertCircle, CheckCircle2, Copy, XCircle, MinusCircle, RefreshCw,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token; } catch { return null; }
};

const STATUS_META = {
  added:     { label: "Added",      color: "#059669", bg: "#ecfdf5", Icon: CheckCircle2 },
  ready:     { label: "Ready",      color: "#059669", bg: "#ecfdf5", Icon: CheckCircle2 },
  duplicate: { label: "Duplicate",  color: "#b45309", bg: "#fffbeb", Icon: Copy },
  invalid:   { label: "Invalid",    color: "#b91c1c", bg: "#fef2f2", Icon: XCircle },
  blank:     { label: "Not filled", color: "#64748b", bg: "#f1f5f9", Icon: MinusCircle },
};

// A 404 with no JSON message means the route itself isn't on the server.
const ROUTE_MISSING =
  "Bulk upload is not available on the server yet (HTTP 404). The backend needs the new bulk-fee route files, the updated finance.js, and a restart/redeploy.";

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const BulkFeeUpload = ({ classes, defaultFeeDate, onUploaded, onClose }) => {
  const [classId, setClassId] = useState("");
  const [file, setFile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState(""); // "" | "validate" | "save"
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("invalid");
  const fileRef = useRef(null);

  // Any change to the inputs invalidates a previous validation.
  useEffect(() => { setResult(null); setError(""); }, [classId, file, defaultFeeDate]);

  const selectedClass = classes.find((c) => c.id === classId);
  const classLabel = selectedClass ? (selectedClass.name || `${selectedClass.grade} - ${selectedClass.section}`) : "";

  // ── Step 1: download template ─────────────────────────────────────────────
  const downloadTemplate = async () => {
    if (!classId) return setError("Please select a class first.");
    setDownloading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/finance/bulkFee/template?classSectionId=${encodeURIComponent(classId)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || (res.status === 404 ? ROUTE_MISSING : `Download failed (HTTP ${res.status})`));
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const name = cd.match(/filename="?([^"]+)"?/)?.[1]
        || `Fee_Upload_${classLabel.replace(/[^A-Za-z0-9_-]+/g, "_")}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message || "Failed to download template.");
    } finally { setDownloading(false); }
  };

  // ── Step 2: choose file ───────────────────────────────────────────────────
  const pickFile = (f) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) return setError("Please choose an .xlsx Excel file (the downloaded template).");
    if (f.size > 5 * 1024 * 1024) return setError("File is too large. Maximum size is 5 MB.");
    setFile(f);
  };
  const clearFile = () => { setFile(null); if (fileRef.current) fileRef.current.value = ""; };

  // ── Step 3: validate (dry run) / save ─────────────────────────────────────
  const send = async (dryRun) => {
    if (!classId) return setError("Please select a class first.");
    if (!file) return setError("Please choose the filled Excel file.");
    setBusy(dryRun ? "validate" : "save"); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("classSectionId", classId);
      fd.append("defaultFeeDate", defaultFeeDate || "");
      fd.append("dryRun", dryRun ? "true" : "false");
      const res = await fetch(`${API_URL}/api/finance/bulkFee/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || (res.status === 404 ? ROUTE_MISSING : `Upload failed (HTTP ${res.status})`));
      setResult(data);
      setFilter(data.summary.invalid > 0 ? "invalid" : data.summary.duplicates > 0 ? "duplicate" : "ok");
      if (!dryRun && data.summary.added > 0) onUploaded?.(data);
    } catch (e) {
      setError(e.message || "Upload failed. No records were saved.");
    } finally { setBusy(""); }
  };

  const resetAll = () => { clearFile(); setResult(null); setError(""); };

  // ── Error report (CSV) ────────────────────────────────────────────────────
  const downloadReport = () => {
    if (!result) return;
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Excel Row", "Student", "Status", "Total Fee", "Amount Paid", "Invoice No", "Reason"].map(esc).join(",")];
    result.rows.filter((r) => r.status !== "blank").forEach((r) => {
      lines.push([r.row, r.name, STATUS_META[r.status]?.label, r.totalFee, r.amountPaid, r.invoiceNumber || "", r.reasons.join("; ")].map(esc).join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Fee_Upload_Report_${classLabel.replace(/[^A-Za-z0-9_-]+/g, "_")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const s = result?.summary;
  const saved = result && !result.dryRun;
  const okKey = saved ? "added" : "ready";
  const visibleRows = (result?.rows || []).filter((r) =>
    filter === "all" ? true : filter === "ok" ? r.status === okKey : r.status === filter,
  );

  return (
    <>
      <style>{`
        .bu-step{border:1.5px solid var(--bf);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
        .bu-step-hd{display:flex;align-items:center;gap:10px}
        .bu-num{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--br),var(--brd));
          color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;
          font-family:'JetBrains Mono',monospace}
        .bu-step-t{font-size:13px;font-weight:700;color:var(--brp)}
        .bu-step-s{font-size:11px;color:var(--brl);margin-top:1px}
        .bu-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 16px;border-radius:10px;
          font-size:13px;font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;transition:all .2s;
          border:1.5px solid var(--bf);background:var(--bm);color:var(--br)}
        .bu-btn:hover:not(:disabled){background:var(--bf);color:var(--brd)}
        .bu-btn:disabled{opacity:.55;cursor:not-allowed}
        .bu-btn.green{background:var(--grm);border-color:var(--grf);color:var(--gr)}
        .bu-btn.green:hover:not(:disabled){background:var(--grf)}
        .bu-drop{border:1.5px dashed var(--bf);border-radius:12px;padding:18px;background:var(--bm);
          display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;cursor:pointer;
          color:var(--brl);font-size:12.5px;transition:all .2s}
        .bu-drop:hover,.bu-drop.drag{border-color:var(--br);background:#fff}
        .bu-file{display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1.5px solid #bbf7d0;
          border-radius:12px;padding:10px 14px}
        .bu-file-n{font-size:13px;font-weight:600;color:#14532d;word-break:break-all}
        .bu-file-s{font-size:10.5px;color:#15803d}
        .bu-x{border:none;background:none;color:#94a3b8;cursor:pointer;margin-left:auto;display:flex}
        .bu-x:hover{color:#ef4444}
        .bu-sum{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
        .bu-card{border-radius:12px;padding:10px 8px;text-align:center;border:1.5px solid var(--bf);background:#fff;cursor:pointer}
        .bu-card.on{box-shadow:0 0 0 2px var(--br)}
        .bu-card-v{font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace}
        .bu-card-l{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--brl);margin-top:2px}
        .bu-banner{border-radius:12px;padding:12px 14px;font-size:12.5px;display:flex;gap:9px;align-items:flex-start;line-height:1.5}
        .bu-tbl{border:1.5px solid var(--bf);border-radius:12px;overflow:hidden;max-height:260px;overflow-y:auto}
        .bu-tr{display:grid;grid-template-columns:46px 1fr 92px;gap:8px;padding:9px 12px;border-bottom:1px solid var(--bf);font-size:12px;align-items:start}
        .bu-tr:last-child{border-bottom:none}
        .bu-tr.h{background:var(--bm);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--brl);position:sticky;top:0}
        .bu-rn{font-family:'JetBrains Mono',monospace;color:var(--brl);font-weight:600}
        .bu-nm{font-weight:600;color:var(--brp)}
        .bu-rs{font-size:11px;color:#64748b;margin-top:2px}
        .bu-pill{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap}
        @media (max-width:600px){.bu-sum{grid-template-columns:repeat(3,1fr)}}
      `}</style>

      {/* Step 1 — class + template */}
      <div className="bu-step">
        <div className="bu-step-hd">
          <div className="bu-num">1</div>
          <div>
            <div className="bu-step-t">Select class &amp; download template</div>
            <div className="bu-step-s">The Excel file lists every active student in the class with fee &amp; payment columns to fill.</div>
          </div>
        </div>
        <div className="as-f">
          <label className="as-lbl"><GraduationCap size={13} /> Select Class</label>
          <div className="as-sw">
            <select className="as-sel" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— Choose a class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name || `${c.grade} - ${c.section}`}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
        <button type="button" className="bu-btn" onClick={downloadTemplate} disabled={!classId || downloading}>
          {downloading ? <div className="as-spinner" /> : <Download size={15} />}
          {downloading ? "Preparing template…" : "Download Excel Template"}
        </button>
      </div>

      {/* Step 2 — upload */}
      <div className="bu-step" style={{ opacity: classId ? 1 : 0.55 }}>
        <div className="bu-step-hd">
          <div className="bu-num">2</div>
          <div>
            <div className="bu-step-t">Upload the completed file</div>
            <div className="bu-step-s">Rows with empty Fee Entry Date use the payment date above. Existing fee records are never overwritten.</div>
          </div>
        </div>

        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
        {file ? (
          <div className="bu-file">
            <FileSpreadsheet size={20} color="#15803d" />
            <div>
              <div className="bu-file-n">{file.name}</div>
              <div className="bu-file-s">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <button type="button" className="bu-x" onClick={clearFile} title="Remove file"><X size={15} /></button>
          </div>
        ) : (
          <div
            className="bu-drop"
            onClick={() => classId && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("drag")}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag"); if (classId) pickFile(e.dataTransfer.files?.[0]); }}
          >
            <Upload size={20} />
            <div><strong style={{ color: "var(--br)" }}>Click to choose</strong> or drag the filled .xlsx here</div>
            <div style={{ fontSize: 10.5 }}>Max 5 MB</div>
          </div>
        )}

        {!saved && (
          <button type="button" className="bu-btn" onClick={() => send(true)} disabled={!classId || !file || !!busy}>
            {busy === "validate" ? <div className="as-spinner" /> : <RefreshCw size={14} />}
            {busy === "validate" ? "Validating…" : result ? "Re-validate File" : "Validate File"}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="bu-step">
          <div className="bu-step-hd">
            <div className="bu-num">3</div>
            <div>
              <div className="bu-step-t">{saved ? "Upload result" : "Review before saving"} — {result.className}</div>
              <div className="bu-step-s">{saved ? "Saved records now appear in the Student Fees list." : "Nothing has been saved yet."}</div>
            </div>
          </div>

          {saved ? (
            <div className="bu-banner" style={s.added > 0
              ? { background: "#ecfdf5", border: "1.5px solid #a7f3d0", color: "#065f46" }
              : { background: "#fffbeb", border: "1.5px solid #fde68a", color: "#92400e" }}>
              {s.added > 0 ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
              <div>
                <strong>{result.message}</strong>
                {(s.invalid > 0 || s.duplicates > 0) && (
                  <> {s.invalid > 0 && `${s.invalid} invalid row(s) were not saved — fix them in the Excel file and upload again. `}
                    {s.duplicates > 0 && `${s.duplicates} duplicate(s) were skipped.`}</>
                )}
              </div>
            </div>
          ) : s.invalid > 0 ? (
            <div className="bu-banner" style={{ background: "#fef2f2", border: "1.5px solid #fecaca", color: "#991b1b" }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{s.invalid} row(s) have errors. You can fix them in Excel and re-validate, or save the {s.ready} valid row(s) now — invalid rows will be skipped.</div>
            </div>
          ) : null}

          <div className="bu-sum">
            {[
              { k: "all", v: s.totalRecords, l: "Total rows", c: "var(--brp)" },
              { k: "ok", v: saved ? s.added : s.ready, l: saved ? "Added" : "Ready", c: "#059669" },
              { k: "duplicate", v: s.duplicates, l: "Duplicates", c: "#b45309" },
              { k: "invalid", v: s.invalid, l: "Invalid", c: "#b91c1c" },
              { k: "blank", v: s.skippedBlank, l: "Not filled", c: "#64748b" },
            ].map((c, i) => (
              <div key={i} className={`bu-card${filter === c.k ? " on" : ""}`} onClick={() => setFilter(c.k)}>
                <div className="bu-card-v" style={{ color: c.c }}>{c.v}</div>
                <div className="bu-card-l">{c.l}</div>
              </div>
            ))}
          </div>

          {visibleRows.length > 0 ? (
            <div className="bu-tbl">
              <div className="bu-tr h"><div>Row</div><div>Student / Details</div><div>Status</div></div>
              {visibleRows.map((r) => {
                const m = STATUS_META[r.status] || STATUS_META.invalid;
                return (
                  <div key={r.row} className="bu-tr">
                    <div className="bu-rn">#{r.row}</div>
                    <div>
                      <div className="bu-nm">{r.name || "—"}</div>
                      {r.reasons.length > 0 ? (
                        <div className="bu-rs" style={{ color: m.color }}>{r.reasons.join(" • ")}</div>
                      ) : r.status !== "blank" ? (
                        <div className="bu-rs">
                          Fee {fmtINR(r.totalFee)}{r.amountPaid > 0 && ` • Paid ${fmtINR(r.amountPaid)} (${r.paymentMode})`}
                          {r.invoiceNumber && ` • ${r.invoiceNumber}`}
                        </div>
                      ) : (
                        <div className="bu-rs">No fee entered — skipped</div>
                      )}
                    </div>
                    <div><span className="bu-pill" style={{ color: m.color, background: m.bg }}><m.Icon size={11} />{m.label}</span></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="as-ph">No rows in this view.</div>
          )}

          <button type="button" className="bu-btn" onClick={downloadReport}>
            <Download size={14} /> Download Report (CSV)
          </button>
        </div>
      )}

      {error && (
        <div className="as-err"><AlertCircle size={14} style={{ flexShrink: 0 }} />{error}</div>
      )}

      {/* Actions */}
      <div className="as-act">
        {saved ? (
          <>
            <button className="as-bp" onClick={resetAll}>Upload Another File</button>
            <button className="as-bs" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <button
              className="as-bp"
              onClick={() => send(false)}
              disabled={!!busy || !result || result.summary.ready === 0}
              title={!result ? "Validate the file first" : ""}
            >
              {busy === "save" ? "Saving…"
                : !result ? "Validate file to continue"
                  : result.summary.ready === 0 ? "No valid records to save"
                    : `Save ${result.summary.ready} Fee Record${result.summary.ready > 1 ? "s" : ""}`}
            </button>
            <button className="as-bs" onClick={onClose}>Cancel</button>
          </>
        )}
      </div>
    </>
  );
};

export default BulkFeeUpload;