// client/src/admin/pages/certificates/components/HallTicketStudentsTab.jsx
// Students tab shown after class-wide Hall Ticket generation: one row per
// student with their Hall Ticket Number, View and Download PDF actions, plus
// per-row checkboxes, a Select All checkbox and a bulk "Download" button.
// Bulk download works like Marks Card → Download All: each selected student's
// Hall Ticket is saved as its own PDF, one after another (no ZIP, no merging).
import { useMemo, useState } from "react";
import {
  Eye, Download, Loader2, Search, X, AlertTriangle, CheckCircle2, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { getToken } from "../../../../auth/storage";
import PdfViewer from "./PdfViewer";
import { C, API_URL } from "./theme";

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const safeName = (s) => String(s || "").replace(/[^A-Za-z0-9 _.-]/g, "").trim().replace(/\s+/g, "_");
const pdfFileName = (t) => `${safeName(t.hallTicketNumber)}_${safeName(t.studentName) || "student"}.pdf`;

async function getSignedUrl(certificateId) {
  const res = await fetch(`${API_URL}/api/certificates/download/${certificateId}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.message || "Could not get the PDF");
  return data.url;
}

function saveBlob(blob, fileName) {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}

// Saves one student's Hall Ticket as a normal PDF file. The bytes come
// through our own API (/api/certificates/file/:id) so the save works for
// every file in a bulk run — no pop-up tabs, no storage-CORS surprises.
async function downloadOne(ticket) {
  const res = await fetch(`${API_URL}/api/certificates/file/${ticket.certificateId}`, { headers: authHeaders() });
  if (!res.ok) {
    let message = "Could not download Hall Ticket";
    try { message = (await res.json()).message || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  saveBlob(await res.blob(), pdfFileName(ticket));
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export default function HallTicketStudentsTab({ batch, onGenerateAnother }) {
  const tickets = useMemo(() => batch?.tickets || [], [batch]);
  const failed = batch?.failed || [];

  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [busyRow, setBusyRow] = useState(null); // `${id}:view` | `${id}:download`
  const [bulkBusy, setBulkBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total, name }
  const [bulkResult, setBulkResult] = useState(null); // { total, failed: [names] }
  const [viewer, setViewer] = useState(null); // { url, ticket }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        (t.studentName || "").toLowerCase().includes(q) ||
        String(t.hallTicketNumber || "").includes(q) ||
        (t.admissionNumber || "").toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const allSelected = tickets.length > 0 && selected.size === tickets.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(tickets.map((t) => t.certificateId)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleView = async (t) => {
    setBusyRow(`${t.certificateId}:view`);
    try {
      const url = await getSignedUrl(t.certificateId);
      setViewer({ url, ticket: t });
    } catch (err) {
      toast.error(err.message || "Could not open Hall Ticket");
    } finally {
      setBusyRow(null);
    }
  };

  const handleDownload = async (t) => {
    setBusyRow(`${t.certificateId}:download`);
    try {
      await downloadOne(t);
    } catch (err) {
      toast.error(err.message || "Could not download Hall Ticket");
    } finally {
      setBusyRow(null);
    }
  };

  // Downloads the selected students' Hall Tickets one by one, each as its own
  // PDF — same approach as Marks Card → Download All. Nothing selected is
  // treated the same as Select All.
  const handleBulkDownload = async () => {
    const chosen = selected.size > 0 ? tickets.filter((t) => selected.has(t.certificateId)) : tickets;
    if (chosen.length === 0) return;

    setBulkBusy(true);
    setBulkResult(null);
    const failedNames = [];

    for (let i = 0; i < chosen.length; i++) {
      const t = chosen[i];
      setProgress({ current: i + 1, total: chosen.length, name: t.studentName });
      try {
        await downloadOne(t);
        // small pause so each browser "save" completes before the next starts
        await pause(500);
      } catch (err) {
        console.error("Hall Ticket download failed:", t.studentName, err);
        failedNames.push(t.studentName);
      }
    }

    setProgress(null);
    setBulkBusy(false);
    setBulkResult({ total: chosen.length, failed: failedNames });
  };

  const bulkLabel =
    selected.size === 0 || allSelected
      ? `Download All (${tickets.length})`
      : `Download Selected (${selected.size})`;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: C.deep }}>
            <CheckCircle2 size={16} style={{ color: C.success }} />
            {tickets.length} Hall Ticket{tickets.length === 1 ? "" : "s"} generated
            {batch?.className ? ` — ${batch.className}` : ""}
          </p>
          <p className="text-xs mt-0.5" style={{ color: C.textLight }}>
            {batch?.examName ? `${batch.examName} · ` : ""}
            {batch?.hallTicketFrom && batch?.hallTicketTo
              ? `Range ${batch.hallTicketFrom} – ${batch.hallTicketTo}`
              : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onGenerateAnother}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border"
            style={{ borderColor: C.border, color: C.deep }}
          >
            <RotateCcw size={14} /> Generate for another class
          </button>
          <button
            onClick={handleBulkDownload}
            disabled={bulkBusy || tickets.length === 0}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"
            style={{ background: C.deep, color: "#fff" }}
          >
            {bulkBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {bulkBusy ? "Downloading…" : bulkLabel}
          </button>
        </div>
      </div>

      {progress && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          style={{ background: C.bg, border: `1px solid ${C.border}` }}
        >
          <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: C.deep }} />
          <div className="min-w-0">
            <p className="text-xs font-bold" style={{ color: C.text }}>
              Downloading {progress.current} of {progress.total}
            </p>
            <p className="text-xs truncate" style={{ color: C.textLight }}>{progress.name}</p>
          </div>
        </div>
      )}

      {bulkResult && !progress && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold"
          style={{
            background: bulkResult.failed.length ? "#fef2f2" : "#ecfdf5",
            border: `1px solid ${bulkResult.failed.length ? "#fca5a5" : "#a7f3d0"}`,
            color: bulkResult.failed.length ? "#b91c1c" : "#065f46",
          }}
        >
          {bulkResult.failed.length
            ? <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            : <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />}
          <span className="flex-1">
            {bulkResult.failed.length
              ? `Downloaded ${bulkResult.total - bulkResult.failed.length} of ${bulkResult.total}. Failed: ${bulkResult.failed.join(", ")}.`
              : `All ${bulkResult.total} Hall Ticket${bulkResult.total !== 1 ? "s" : ""} downloaded successfully.`}
          </span>
          <button onClick={() => setBulkResult(null)} aria-label="Dismiss" className="flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {failed.length > 0 && (
        <div
          className="flex items-start gap-2 text-xs rounded-lg p-2.5"
          style={{ background: "#FFF7ED", color: "#9A5B13", border: "1px solid #FDE7C7" }}
        >
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{failed.length} Hall Ticket(s) could not be generated:</p>
            <ul className="mt-1 list-disc pl-4">
              {failed.map((f) => (
                <li key={f.studentId}>
                  {f.studentName} ({f.hallTicketNumber}) — {f.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ border: `1px solid ${C.border}`, background: C.white }}
      >
        <Search size={15} style={{ color: C.textLight }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, admission or hall ticket number..."
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: C.text }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.borderLight}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: C.bg, color: C.slate }}>
              <th className="px-3 py-2.5 text-left w-10">
                <input
                  type="checkbox"
                  aria-label="Select all students"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  className="cursor-pointer"
                  style={{ accentColor: C.deep, width: 16, height: 16 }}
                />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-bold">Student Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold">Roll No</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold">Hall Ticket Number</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-xs" style={{ color: C.textLight }}>
                  No students match your search.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const checked = selected.has(t.certificateId);
                return (
                  <tr
                    key={t.certificateId}
                    style={{ borderTop: `1px solid ${C.borderLight}`, background: checked ? `${C.sky}14` : undefined }}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.studentName}`}
                        checked={checked}
                        onChange={() => toggleOne(t.certificateId)}
                        className="cursor-pointer"
                        style={{ accentColor: C.deep, width: 16, height: 16 }}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-bold" style={{ color: C.deep }}>{t.studentName}</p>
                      {t.admissionNumber && (
                        <p className="text-xs" style={{ color: C.textLight }}>{t.admissionNumber}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: C.text }}>{t.rollNumber || "—"}</td>
                    <td className="px-3 py-2.5 font-mono font-bold" style={{ color: C.text }}>{t.hallTicketNumber}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleView(t)}
                          disabled={!!busyRow || bulkBusy}
                          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border disabled:opacity-50"
                          style={{ borderColor: C.border, color: C.deep }}
                        >
                          {busyRow === `${t.certificateId}:view`
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Eye size={13} />}
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(t)}
                          disabled={!!busyRow || bulkBusy}
                          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                          style={{ background: C.deep, color: "#fff" }}
                        >
                          {busyRow === `${t.certificateId}:download`
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Download size={13} />}
                          Download PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View modal */}
      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15, 23, 42, 0.55)" }}
          onClick={() => setViewer(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl p-4"
            style={{ background: C.white }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold" style={{ color: C.deep }}>{viewer.ticket.studentName}</p>
                <p className="text-xs font-mono" style={{ color: C.textLight }}>
                  Hall Ticket No: {viewer.ticket.hallTicketNumber}
                </p>
              </div>
              <button
                onClick={() => setViewer(null)}
                className="p-1.5 rounded-lg border"
                style={{ borderColor: C.border, color: C.deep }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <PdfViewer url={viewer.url} fileName={pdfFileName(viewer.ticket)} height={560} />
          </div>
        </div>
      )}
    </div>
  );
}