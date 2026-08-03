// client/src/admin/pages/certificates/CertificateHistory.jsx
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Loader2, Eye, Printer, Download, Trash2, FileBadge2, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { getToken } from "../../../auth/storage";
import CertificateFilters from "./components/CertificateFilters";
import PdfViewer from "./components/PdfViewer";
import { C, API_URL, fmtDate } from "./components/theme";

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export default function CertificateHistory() {
  const [searchParams] = useSearchParams();

  const [types, setTypes] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [classSectionId, setClassSectionId] = useState(null);
  const [certificateType, setCertificateType] = useState(searchParams.get("type") || null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/certificates/types`, { headers: authHeaders() });
        const data = await res.json();
        setTypes(data.types || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        ...(studentName ? { studentName } : {}),
        ...(admissionNumber ? { admissionNumber } : {}),
        ...(classSectionId ? { classSectionId } : {}),
        ...(certificateType ? { certificateType } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      });
      const res = await fetch(`${API_URL}/api/certificates/history?${params}`, { headers: authHeaders() });
      const data = await res.json();
      setCertificates(data.certificates || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      toast.error("Could not load certificate history");
    } finally {
      setLoading(false);
    }
  }, [page, studentName, admissionNumber, classSectionId, certificateType, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(fetchHistory, 300);
    return () => clearTimeout(t);
  }, [fetchHistory]);

  useEffect(() => setPage(1), [studentName, admissionNumber, classSectionId, certificateType, dateFrom, dateTo]);

  const handleView = async (cert, action) => {
    try {
      const endpoint = action === "print" ? "print" : "download";
      const res = await fetch(`${API_URL}/api/certificates/${endpoint}/${cert.id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not fetch PDF");
      setPreviewUrl(data.url);
      setPreviewName(`${cert.certificateNumber}.pdf`);
      if (action === "print") {
        setTimeout(() => {
          const win = window.open(data.url, "_blank");
          win?.addEventListener("load", () => win.print());
        }, 200);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not open certificate");
    }
  };

  const handleRegenerate = async (cert) => {
    setRegeneratingId(cert.id);
    try {
      const res = await fetch(`${API_URL}/api/certificates/${cert.id}/regenerate`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to regenerate PDF");
      setPreviewUrl(data.pdfUrl);
      setPreviewName(`${cert.certificateNumber}.pdf`);
      toast.success("Certificate PDF regenerated with the latest layout");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to regenerate PDF");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDelete = async (cert) => {
    if (!window.confirm(`Revoke certificate ${cert.certificateNumber}? This cannot be undone.`)) return;
    setDeletingId(cert.id);
    try {
      const res = await fetch(`${API_URL}/api/certificates/${cert.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revoke certificate");
      toast.success("Certificate revoked");
      fetchHistory();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to revoke certificate");
    } finally {
      setDeletingId(null);
    }
  };

  const typeLabel = (key) => types.find((t) => t.key === key)?.label || key;

  return (
    <div className="p-4 md:p-6" style={{ background: C.bg, minHeight: "100%" }}>
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 40, height: 40, background: C.deep, color: "#fff" }}
        >
          <FileBadge2 size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: C.deep }}>Certificate History</h1>
          <p className="text-xs" style={{ color: C.textLight }}>{total} certificate{total === 1 ? "" : "s"} generated</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-4 mb-4 flex flex-wrap gap-3" style={{ background: C.white, border: `1px solid ${C.border}` }}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textLight }} />
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Student name"
            className="pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: `1px solid ${C.border}`, background: C.white, color: C.text }}
          />
        </div>
        <input
          value={admissionNumber}
          onChange={(e) => setAdmissionNumber(e.target.value)}
          placeholder="Admission number"
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ border: `1px solid ${C.border}`, background: C.white, color: C.text }}
        />
        <CertificateFilters
          classSectionId={classSectionId}
          onClassSectionChange={setClassSectionId}
          academicYearId={null}
          onAcademicYearChange={() => {}}
          certificateType={certificateType}
          onCertificateTypeChange={setCertificateType}
          certificateTypeOptions={types}
          showTypeFilter
          showDateRange
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
      </div>

      {previewUrl && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: C.white, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold" style={{ color: C.deep }}>{previewName}</p>
            <button onClick={() => setPreviewUrl(null)} className="text-xs font-bold" style={{ color: C.textLight }}>
              Close
            </button>
          </div>
          <PdfViewer url={previewUrl} fileName={previewName} />
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: C.white, border: `1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: C.bg, color: C.slate }}>
                <Th>Certificate No.</Th>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Type</Th>
                <Th>Generated Date</Th>
                <Th>Generated By</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <Loader2 className="animate-spin inline" style={{ color: C.slate }} />
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm" style={{ color: C.textLight }}>
                    No certificates found for the selected filters.
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => {
                  const enrollment = cert.student?.enrollments?.[0];
                  const className = enrollment?.classSection?.name ||
                    [enrollment?.classSection?.grade, enrollment?.classSection?.section].filter(Boolean).join(" - ");
                  return (
                    <tr key={cert.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                      <Td><span className="font-bold" style={{ color: C.deep }}>{cert.certificateNumber}</span></Td>
                      <Td>{cert.student?.name || "—"}</Td>
                      <Td>{className || "—"}</Td>
                      <Td>{typeLabel(cert.certificateType)}</Td>
                      <Td>{fmtDate(cert.generatedDate)}</Td>
                      <Td>{cert.generatedBy?.name || "—"}</Td>
                      <Td align="right">
                        <div className="flex gap-1.5 justify-end">
                          <IconBtn title="View" onClick={() => handleView(cert, "view")}><Eye size={15} /></IconBtn>
                          <IconBtn title="Print" onClick={() => handleView(cert, "print")}><Printer size={15} /></IconBtn>
                          <IconBtn title="Download" onClick={() => handleView(cert, "download")}><Download size={15} /></IconBtn>
                          <IconBtn
                            title="Regenerate PDF with latest layout"
                            disabled={regeneratingId === cert.id}
                            onClick={() => handleRegenerate(cert)}
                          >
                            {regeneratingId === cert.id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                          </IconBtn>
                          <IconBtn
                            title="Revoke"
                            danger
                            disabled={deletingId === cert.id}
                            onClick={() => handleDelete(cert)}
                          >
                            {deletingId === cert.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </IconBtn>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && certificates.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${C.borderLight}` }}>
            <span className="text-xs" style={{ color: C.textLight }}>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: C.border, color: C.deep }}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="p-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: C.border, color: C.deep }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}
function Td({ children, align = "left" }) {
  return (
    <td
      className={`px-3 py-2.5 text-xs ${align === "right" ? "text-right" : "text-left"}`}
      style={{ color: C.text }}
    >
      {children}
    </td>
  );
}
function IconBtn({ children, onClick, title, danger, disabled }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-lg border disabled:opacity-50"
      style={{ borderColor: C.border, color: danger ? C.danger : C.deep }}
    >
      {children}
    </button>
  );
}